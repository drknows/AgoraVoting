/**
 * Community polls, petitions, recalls and votes of no confidence.
 *
 * Lifecycle:  proposed ──(enough supporters, or admin approval)──▶ live ──▶ closed
 *                     └─(admin)──▶ rejected
 * Kinds:
 *   poll           single- or multiple-choice question; can be tied to a real
 *                  ballot measure or race (source = FEC / Google Civic / link)
 *   petition       members sign (sign-up list) and, optionally, vote support/oppose
 *   recall         signature drive to recall an official — signer identity required
 *   no_confidence  signature drive for a vote of no confidence — identity required
 */
import { query, one, tx, getSetting, putSetting, requireRate } from "./db";
import { encrypt, decrypt, randomId } from "./crypto";
import { audit } from "./audit";
import { HttpError, clean } from "./http";

export const KINDS = ["poll", "petition", "recall", "no_confidence"];
export const KIND_LABEL = { poll: "Poll", petition: "Petition", recall: "Recall", no_confidence: "Vote of no confidence" };

export const DEFAULT_SETTINGS = {
  proposalThreshold: 25,        // supporters needed for a proposal to go live automatically
  recallProposalThreshold: 100, // recalls / no-confidence need more support to launch
  proposalDays: 14,             // proposals expire if they don't reach the threshold in time
  voteLevel: 2,                 // verification level needed to vote in polls (2 = email + phone)
  proposeLevel: 2,
  supportLevel: 2,
  signLevel: 2,                 // petitions (recalls / no-confidence always require level 3)
};
export const getCommunitySettings = () => getSetting("community", DEFAULT_SETTINGS);
export async function saveCommunitySettings(s) {
  const cur = await getCommunitySettings();
  const n = (v, lo, hi, d) => Math.min(hi, Math.max(lo, Number.isFinite(+v) ? Math.round(+v) : d));
  const next = {
    proposalThreshold: n(s.proposalThreshold, 1, 1_000_000, cur.proposalThreshold),
    recallProposalThreshold: n(s.recallProposalThreshold, 1, 1_000_000, cur.recallProposalThreshold),
    proposalDays: n(s.proposalDays, 1, 365, cur.proposalDays),
    voteLevel: n(s.voteLevel, 1, 3, cur.voteLevel),
    proposeLevel: n(s.proposeLevel, 1, 3, cur.proposeLevel),
    supportLevel: n(s.supportLevel, 1, 3, cur.supportLevel),
    signLevel: n(s.signLevel, 1, 3, cur.signLevel),
  };
  await putSetting("community", next);
  return next;
}

const needsIdentity = item => item.kind === "recall" || item.kind === "no_confidence" || item.requires_identity;
const thresholdFor = (item, s) => (item.kind === "recall" || item.kind === "no_confidence") ? s.recallProposalThreshold : s.proposalThreshold;

/** Status after applying deadlines (proposal expiry, close date). */
function effectiveStatus(item, s) {
  const now = Date.now();
  if (item.status === "live" && item.closes_at && new Date(item.closes_at).getTime() <= now) return "closed";
  if (item.status === "proposed" && now - new Date(item.created_at).getTime() > s.proposalDays * 86400_000) return "expired";
  return item.status;
}

/* ── validation ──────────────────────────────────────────────── */
function parseItemInput(body, { admin }) {
  const kind = KINDS.includes(body.kind) ? body.kind : null;
  if (!kind) throw new HttpError(400, "Choose a type: poll, petition, recall or vote of no confidence.");
  const title = clean(body.title, 160);
  const description = clean(body.description, 5000);
  if (title.length < 8) throw new HttpError(400, "The title needs at least 8 characters.");
  if (description.length < 20) throw new HttpError(400, "Please describe it in at least 20 characters.");
  const item = { kind, title, description, category: clean(body.category, 60) || null };

  if (kind === "poll") {
    const options = (Array.isArray(body.options) ? body.options : []).map(o => clean(o, 120)).filter(Boolean);
    if (options.length < 2 || options.length > 30) throw new HttpError(400, "Polls need between 2 and 30 answer options.");
    if (new Set(options.map(o => o.toLowerCase())).size !== options.length) throw new HttpError(400, "Answer options must be different.");
    item.options = options;
    item.multi = !!body.multi;
  }
  if (kind === "petition") item.allow_vote = !!body.allowVote;
  if (kind !== "poll") {
    const goal = Math.round(+body.goal);
    item.goal = Number.isFinite(goal) && goal > 0 ? Math.min(goal, 50_000_000) : null;
  }
  if (kind === "recall" || kind === "no_confidence") {
    const t = body.target || {};
    item.target = { name: clean(t.name, 120), office: clean(t.office, 160), jurisdiction: clean(t.jurisdiction, 160) };
    if (!item.target.name || !item.target.office || !item.target.jurisdiction)
      throw new HttpError(400, "Name the official, their office, and the jurisdiction (e.g. City of Fresno).");
  }
  item.requires_identity = kind === "recall" || kind === "no_confidence" || (admin && !!body.requiresIdentity);
  if (body.source && typeof body.source === "object") {
    const src = body.source;
    item.source = {
      type: ["fec", "civic", "link"].includes(src.type) ? src.type : "link",
      label: clean(src.label, 200), url: /^https:\/\//.test(src.url || "") ? clean(src.url, 500) : null,
      electionDate: clean(src.electionDate, 20) || null, jurisdiction: clean(src.jurisdiction, 160) || null,
      contestType: clean(src.contestType, 40) || null,
    };
  }
  if (body.closesAt) {
    const d = new Date(body.closesAt);
    if (isNaN(d) || d.getTime() < Date.now()) throw new HttpError(400, "The closing date must be in the future.");
    item.closes_at = d.toISOString();
  }
  return item;
}

async function insertItem(item, { status, memberId, memberName, admin }) {
  const id = randomId();
  const row = await one(
    `insert into community_items(id, kind, status, title, description, category, options, multi, source, goal, allow_vote,
       target, requires_identity, closes_at, created_by, created_by_name, created_by_admin, live_at)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, case when $3='live' then now() end) returning *`,
    [id, item.kind, status, item.title, item.description, item.category, item.options ? JSON.stringify(item.options) : null,
     !!item.multi, item.source ? JSON.stringify(item.source) : null, item.goal ?? null, !!item.allow_vote,
     item.target ? JSON.stringify(item.target) : null, !!item.requires_identity, item.closes_at || null,
     memberId || null, memberName || null, !!admin]
  );
  await audit("global", admin ? "admin" : memberId, status === "live" ? "COMMUNITY_CREATED_LIVE" : "COMMUNITY_PROPOSED",
    { id, kind: item.kind, title: item.title });
  return row;
}

/* ── member actions ──────────────────────────────────────────── */
export async function propose(member, body) {
  const s = await getCommunitySettings();
  if (member.level < s.proposeLevel) throw new HttpError(403, "Proposing requires more verification. See the Register tab.", { needLevel: s.proposeLevel });
  await requireRate(`propose:${member.id}`, 5, 86400, "You can propose up to 5 items per day.");
  const item = parseItemInput(body, { admin: false });
  const row = await insertItem(item, { status: "proposed", memberId: member.id, memberName: member.display_name || "Member" });
  await query("insert into community_supporters(item_id, member_id) values($1,$2) on conflict do nothing", [row.id, member.id]);
  return row;
}

export async function support(member, id, on = true) {
  const s = await getCommunitySettings();
  if (member.level < s.supportLevel) throw new HttpError(403, "Supporting proposals requires more verification.", { needLevel: s.supportLevel });
  return tx(async c => {
    const item = (await c.query("select * from community_items where id=$1 for update", [id])).rows[0];
    if (!item) throw new HttpError(404, "Not found");
    if (effectiveStatus(item, s) !== "proposed") throw new HttpError(400, "This proposal is no longer collecting support.");
    if (on) await c.query("insert into community_supporters(item_id, member_id) values($1,$2) on conflict do nothing", [id, member.id]);
    else await c.query("delete from community_supporters where item_id=$1 and member_id=$2", [id, member.id]);
    const count = Number((await c.query("select count(*) from community_supporters where item_id=$1", [id])).rows[0].count);
    let wentLive = false;
    if (count >= thresholdFor(item, s)) {
      await c.query("update community_items set status='live', live_at=now(), updated_at=now() where id=$1", [id]);
      await audit("global", "system", "COMMUNITY_AUTO_LIVE", { id, supporters: count, threshold: thresholdFor(item, s) }, c);
      wentLive = true;
    }
    return { supporters: count, wentLive };
  });
}

function validateChoice(item, choice) {
  const n = (item.options || []).length;
  if (item.kind === "poll") {
    if (item.multi) {
      const arr = [...new Set((Array.isArray(choice) ? choice : []).map(Number))];
      if (!arr.length || arr.some(i => !Number.isInteger(i) || i < 0 || i >= n)) throw new HttpError(400, "Pick at least one valid option.");
      return arr.sort((a, b) => a - b);
    }
    const i = Number(choice);
    if (!Number.isInteger(i) || i < 0 || i >= n) throw new HttpError(400, "Pick one option.");
    return i;
  }
  if (item.kind === "petition" && item.allow_vote) {
    if (!["support", "oppose"].includes(choice)) throw new HttpError(400, "Choose support or oppose.");
    return choice;
  }
  throw new HttpError(400, "This item doesn't take votes.");
}

export async function vote(member, id, choice) {
  const s = await getCommunitySettings();
  if (member.level < s.voteLevel) throw new HttpError(403, "Voting requires more verification. See the Register tab.", { needLevel: s.voteLevel });
  const item = await one("select * from community_items where id=$1", [id]);
  if (!item) throw new HttpError(404, "Not found");
  if (effectiveStatus(item, s) !== "live") throw new HttpError(400, "Voting is not open for this item.");
  const value = validateChoice(item, choice);
  await query(
    `insert into community_votes(item_id, member_id, choice) values($1,$2,$3)
     on conflict (item_id, member_id) do update set choice=excluded.choice, updated_at=now()`,
    [id, member.id, JSON.stringify(value)]
  );
  await maybeSnapshot(id);
  return value;
}

export async function sign(member, id, body) {
  const s = await getCommunitySettings();
  const item = await one("select * from community_items where id=$1", [id]);
  if (!item) throw new HttpError(404, "Not found");
  if (item.kind === "poll") throw new HttpError(400, "Polls take votes, not signatures.");
  if (effectiveStatus(item, s) !== "live") throw new HttpError(400, "This is not collecting signatures right now.");
  const need = needsIdentity(item) ? 3 : s.signLevel;
  if (member.level < need)
    throw new HttpError(403, need === 3
      ? "Signing requires full identity verification (photo ID, selfie, SSN). See the Register tab."
      : "Signing requires more verification. See the Register tab.", { needLevel: need });
  const city = clean(body.city, 80), county = clean(body.county, 80), state = clean(body.state, 2).toUpperCase(), zip = clean(body.zip, 10);
  if (needsIdentity(item)) {
    if (!city || !state || !/^\d{5}(-\d{4})?$/.test(zip)) throw new HttpError(400, "Enter the city, state and ZIP code where you are registered to vote.");
    if (!body.attest) throw new HttpError(400, `Please confirm you are a registered voter in ${item.target?.jurisdiction || "this jurisdiction"}.`);
  }
  const legalName = needsIdentity(item) ? decrypt(member.legal_name_enc) : null;
  await query(
    `insert into community_signatures(item_id, member_id, legal_name_enc, display_name, city, county, state, zip, show_publicly, identity_verified)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     on conflict (item_id, member_id) do update set city=excluded.city, county=excluded.county, state=excluded.state,
       zip=excluded.zip, show_publicly=excluded.show_publicly`,
    [id, member.id, legalName ? encrypt(legalName) : null, clean(body.displayName, 60) || member.display_name || null,
     city || null, county || null, state || null, zip || null, !!body.showPublicly, member.level >= 3]
  );
  if (item.allow_vote && body.stance) await vote(member, id, body.stance);
  await maybeSnapshot(id);
  if (needsIdentity(item)) await audit("global", member.id, "SIGNATURE_ADDED", { item: id, kind: item.kind });
}

export async function unsign(member, id) {
  const s = await getCommunitySettings();
  const item = await one("select * from community_items where id=$1", [id]);
  if (!item || effectiveStatus(item, s) !== "live") throw new HttpError(400, "Signatures can only be withdrawn while the item is open.");
  await query("delete from community_signatures where item_id=$1 and member_id=$2", [id, member.id]);
  await maybeSnapshot(id);
  if (needsIdentity(item)) await audit("global", member.id, "SIGNATURE_WITHDRAWN", { item: id });
}

/* ── reading ─────────────────────────────────────────────────── */
async function tallies(ids) {
  if (!ids.length) return {};
  const rows = (await query(
    `select item_id, opt, count(*)::int as n from (
       select item_id, jsonb_array_elements_text(case when jsonb_typeof(choice)='array' then choice else jsonb_build_array(choice) end) as opt
       from community_votes where item_id = any($1)
     ) t group by item_id, opt`, [ids])).rows;
  const out = {};
  for (const r of rows) (out[r.item_id] ||= {})[r.opt] = r.n;
  return out;
}

function shape(row, extra, s, mine = {}) {
  const status = effectiveStatus(row, s);
  const t = extra.tally[row.id] || {};
  const base = {
    id: row.id, kind: row.kind, kindLabel: KIND_LABEL[row.kind], status, title: row.title, description: row.description,
    category: row.category, source: row.source, target: row.target, goal: row.goal, allowVote: row.allow_vote,
    requiresIdentity: needsIdentity(row), closesAt: row.closes_at, createdAt: row.created_at, liveAt: row.live_at,
    createdBy: row.created_by_admin ? "Agora staff" : (row.created_by_name || "Member"),
    voters: row.voters ?? 0, supporters: row.supporters ?? 0, signatures: row.signatures ?? 0,
    threshold: thresholdFor(row, s),
    proposalExpiresAt: row.status === "proposed" ? new Date(new Date(row.created_at).getTime() + s.proposalDays * 86400_000).toISOString() : null,
    mine,
  };
  if (row.kind === "poll") {
    base.options = row.options || [];
    base.multi = row.multi;
    base.tally = base.options.map((_, i) => t[String(i)] || 0);
  }
  if (row.kind === "petition" && row.allow_vote) base.tally = { support: t.support || 0, oppose: t.oppose || 0 };
  return base;
}

const COUNTS_SQL = `
  (select count(*)::int from community_votes v where v.item_id=i.id) as voters,
  (select count(*)::int from community_supporters p where p.item_id=i.id) as supporters,
  (select count(*)::int from community_signatures g where g.item_id=i.id) as signatures`;

export async function listItems({ status = "live", kind, source, memberId, admin = false, limit = 60 }) {
  const s = await getCommunitySettings();
  const params = [];
  const where = [];
  if (status === "all") { if (!admin) where.push("i.status in ('live','closed')"); }
  else if (status === "closed") where.push("(i.status='closed' or (i.status='live' and i.closes_at <= now()))");
  else if (status === "live") where.push("i.status='live' and (i.closes_at is null or i.closes_at > now())");
  else if (status === "proposed") where.push(`i.status='proposed' and i.created_at > now() - ($${params.push(String(s.proposalDays))} || ' days')::interval`);
  else if (admin && ["rejected"].includes(status)) where.push(`i.status=$${params.push(status)}`);
  else where.push("false");
  if (kind && KINDS.includes(kind)) where.push(`i.kind=$${params.push(kind)}`);
  if (kind === "drives") where.push("i.kind in ('recall','no_confidence')");
  if (source === "ballot") where.push("i.source is not null");
  if (source === "community") where.push("i.source is null");
  const rows = (await query(
    `select i.*, ${COUNTS_SQL} from community_items i where ${where.join(" and ")}
     order by ${status === "proposed" ? "supporters desc," : ""} i.created_at desc limit ${Math.min(+limit || 60, 200)}`, params)).rows;
  const ids = rows.map(r => r.id);
  const tally = await tallies(ids);
  let mine = {};
  if (memberId && ids.length) {
    const [v, p, g] = await Promise.all([
      query("select item_id, choice from community_votes where member_id=$1 and item_id=any($2)", [memberId, ids]),
      query("select item_id from community_supporters where member_id=$1 and item_id=any($2)", [memberId, ids]),
      query("select item_id from community_signatures where member_id=$1 and item_id=any($2)", [memberId, ids]),
    ]);
    for (const r of v.rows) (mine[r.item_id] ||= {}).vote = r.choice;
    for (const r of p.rows) (mine[r.item_id] ||= {}).supported = true;
    for (const r of g.rows) (mine[r.item_id] ||= {}).signed = true;
  }
  return { items: rows.map(r => shape(r, { tally }, s, mine[r.id] || {})), settings: publicSettings(s) };
}

export async function getItem(id, memberId) {
  const s = await getCommunitySettings();
  const row = await one(`select i.*, ${COUNTS_SQL} from community_items i where i.id=$1`, [id]);
  if (!row || row.status === "rejected") throw new HttpError(404, "Not found");
  const tally = await tallies([id]);
  const history = (await query("select ts, counts from community_snapshots where item_id=$1 order by ts asc limit 500", [id])).rows;
  const publicSigners = (await query(
    "select display_name, city, state, created_at from community_signatures where item_id=$1 and show_publicly order by created_at desc limit 200", [id])).rows;
  let mine = {};
  if (memberId) {
    const v = await one("select choice from community_votes where item_id=$1 and member_id=$2", [id, memberId]);
    const p = await one("select 1 from community_supporters where item_id=$1 and member_id=$2", [id, memberId]);
    const g = await one("select 1 from community_signatures where item_id=$1 and member_id=$2", [id, memberId]);
    mine = { vote: v?.choice, supported: !!p, signed: !!g };
  }
  return { item: { ...shape(row, { tally }, s, mine), history, publicSigners } };
}

const publicSettings = s => ({
  proposalThreshold: s.proposalThreshold, recallProposalThreshold: s.recallProposalThreshold, proposalDays: s.proposalDays,
  voteLevel: s.voteLevel, proposeLevel: s.proposeLevel, supportLevel: s.supportLevel, signLevel: s.signLevel,
});

/** Records a point on the item's trend line at most every 5 minutes. */
async function maybeSnapshot(id) {
  const last = await one("select ts from community_snapshots where item_id=$1 order by ts desc limit 1", [id]);
  if (last && Date.now() - new Date(last.ts).getTime() < 5 * 60_000) return;
  const counts = await one(`select ${COUNTS_SQL} from community_items i where i.id=$1`, [id]);
  const t = (await tallies([id]))[id] || {};
  await query("insert into community_snapshots(item_id, counts) values($1,$2)", [id, JSON.stringify({ ...counts, tally: t })]);
}

/* ── admin actions ──────────────────────────────────────────── */
export async function adminCreate(body) {
  const item = parseItemInput(body, { admin: true });
  const status = body.status === "proposed" ? "proposed" : "live";
  return insertItem(item, { status, admin: true, memberName: "Agora staff" });
}

export async function adminSetStatus(id, status) {
  if (!["live", "closed", "rejected", "proposed"].includes(status)) throw new HttpError(400, "Unknown status");
  const row = await one(
    `update community_items set status=$2, updated_at=now(),
       live_at = case when $2='live' then coalesce(live_at, now()) else live_at end,
       closed_at = case when $2='closed' then now() else closed_at end,
       closes_at = case when $2='live' and closes_at <= now() then null else closes_at end
     where id=$1 returning *`, [id, status]);
  if (!row) throw new HttpError(404, "Not found");
  await audit("global", "admin", "COMMUNITY_STATUS", { id, status });
  return row;
}

export async function adminDelete(id) {
  const row = await one("delete from community_items where id=$1 returning id, title, kind", [id]);
  if (!row) throw new HttpError(404, "Not found");
  await audit("global", "admin", "COMMUNITY_DELETED", { id, title: row.title, kind: row.kind });
}

/** Signature list for submission to an election office (CSV). */
export async function exportSignatures(id) {
  const item = await one("select * from community_items where id=$1", [id]);
  if (!item) throw new HttpError(404, "Not found");
  const rows = (await query(
    `select g.*, m.phone_last4 from community_signatures g join members m on m.id=g.member_id
     where g.item_id=$1 order by g.created_at asc`, [id])).rows;
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["#", "Legal name (from verified ID)", "Display name", "City", "County", "State", "ZIP", "Identity verified", "Signed at (UTC)", "Signature ID"];
  const lines = rows.map((r, i) => [i + 1, decrypt(r.legal_name_enc) || "", r.display_name, r.city, r.county, r.state, r.zip,
    r.identity_verified ? "yes" : "no", new Date(r.created_at).toISOString(), `${id.slice(0, 8)}-${r.member_id.slice(0, 8)}`].map(esc).join(","));
  await audit("global", "admin", "SIGNATURES_EXPORTED", { id, count: rows.length });
  return { filename: `agora-${item.kind}-${id.slice(0, 8)}-signatures.csv`, csv: [header.map(esc).join(","), ...lines].join("\n") };
}
