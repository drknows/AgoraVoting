/**
 * Official elections.
 *
 * Two modes per election:
 *   agora_ballots      Agora issues and counts ballots (for contracted jurisdictions)
 *   results_reporting  the jurisdiction's own system pushes official results to
 *                      Agora, which displays them live in the tracker
 *
 * Data exchange uses NIST SP 1500-100 v2 (Election Results Common Data Format),
 * the U.S. standard for election definitions and results, in JSON.
 *
 * Ballot secrecy:
 *   - election_participation records only a keyed fingerprint showing someone voted
 *   - election_ballots stores selections with a random id, no member, no timestamp
 *   - voters get a receipt code to confirm their ballot is in the count
 * Voter rolls are stored only as keyed fingerprints of (registration number,
 * last name, date of birth) — never as names or numbers.
 */
import { query, one, tx } from "./db";
import { fingerprint, randomId, randomToken, sha256 } from "./crypto";
import { audit } from "./audit";
import { HttpError, clean } from "./http";
import { VOTING_METHODS, tallyVotes } from "../../app/VotingMethods";

export const LEVELS = ["federal", "state", "county", "city", "district", "tribal", "other"];
const TYPES = ["general", "primary", "special", "runoff", "recall", "referendum", "other"];
const STATUSES = ["draft", "scheduled", "open", "closed", "certified"];

const normName = s => String(s || "").normalize("NFKD").replace(/[^\p{L}]/gu, "").toUpperCase();
const normReg = s => String(s || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
function normDob(s) {
  const t = String(s || "").trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  return null;
}

/** Status after applying the voting window. */
export function effectiveStatus(e) {
  const now = Date.now();
  if (e.status === "scheduled" && e.opens_at && new Date(e.opens_at).getTime() <= now) {
    return e.closes_at && new Date(e.closes_at).getTime() <= now ? "closed" : "open";
  }
  if (e.status === "open" && e.closes_at && new Date(e.closes_at).getTime() <= now) return "closed";
  return e.status;
}
const resultsVisible = e => {
  const st = effectiveStatus(e);
  return e.mode === "results_reporting" || e.results_policy === "live" || st === "closed" || st === "certified";
};
const ballotUi = method => (method === "approval" ? "approval" : VOTING_METHODS[method]?.ui || "radio");

/* ── creating & importing ───────────────────────────────────── */
function parseContest(c, i) {
  const method = VOTING_METHODS[c.method] ? c.method : (c.kind === "measure" ? "plurality_single" : "plurality_single");
  const options = (c.options || []).map((o, j) => typeof o === "string"
    ? { id: `o${j + 1}`, name: clean(o, 160) }
    : { id: clean(o.id, 80) || `o${j + 1}`, name: clean(o.name, 160), party: clean(o.party, 80) || undefined })
    .filter(o => o.name);
  if (options.length < (c.kind === "measure" ? 2 : 1)) throw new HttpError(400, `Contest "${c.title}" needs answer options.`);
  if (new Set(options.map(o => o.id)).size !== options.length) throw new HttpError(400, `Contest "${c.title}" has duplicate option ids.`);
  return {
    id: clean(c.id, 80) || `c${i + 1}`, seq: i, kind: c.kind === "measure" ? "measure" : "candidate",
    title: clean(c.title, 200) || `Contest ${i + 1}`, subtitle: clean(c.subtitle, 300) || null, body: clean(c.body, 20000) || null,
    method, seats: Math.max(1, Math.min(50, Math.round(+c.seats || 1))), options,
  };
}

function parseElection(b) {
  const j = b.jurisdiction || {};
  const e = {
    name: clean(b.name, 200),
    jurisdiction: { level: LEVELS.includes(j.level) ? j.level : "other", name: clean(j.name, 160), ocdId: clean(j.ocdId, 200) || null },
    type: TYPES.includes(b.type) ? b.type : "general",
    mode: b.mode === "results_reporting" ? "results_reporting" : "agora_ballots",
    results_policy: b.resultsPolicy === "live" ? "live" : "sealed_until_close",
    is_test: !!b.isTest,
    opens_at: b.opensAt ? new Date(b.opensAt) : null,
    closes_at: b.closesAt ? new Date(b.closesAt) : null,
  };
  if (!e.name || !e.jurisdiction.name) throw new HttpError(400, "Name the election and its jurisdiction.");
  if ((e.opens_at && isNaN(e.opens_at)) || (e.closes_at && isNaN(e.closes_at))) throw new HttpError(400, "Invalid voting dates.");
  if (e.opens_at && e.closes_at && e.closes_at <= e.opens_at) throw new HttpError(400, "Voting must close after it opens.");
  const contests = (b.contests || []).map(parseContest);
  if (!contests.length) throw new HttpError(400, "Add at least one contest.");
  if (new Set(contests.map(c => c.id)).size !== contests.length) throw new HttpError(400, "Contest ids must be unique.");
  return { e, contests };
}

async function writeContests(c, electionId, contests) {
  await c.query("delete from election_contests where election_id=$1", [electionId]);
  for (const k of contests) {
    await c.query(
      `insert into election_contests(election_id, id, seq, kind, title, subtitle, body, method, seats, options)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [electionId, k.id, k.seq, k.kind, k.title, k.subtitle, k.body, k.method, k.seats, JSON.stringify(k.options)]);
  }
}

export async function createElection(body, actor) {
  const { e, contests } = parseElection(body);
  const id = randomId();
  await tx(async c => {
    await c.query(
      `insert into elections(id, name, jurisdiction, type, mode, status, results_policy, is_test, opens_at, closes_at, source)
       values($1,$2,$3,$4,$5,'draft',$6,$7,$8,$9,$10)`,
      [id, e.name, JSON.stringify(e.jurisdiction), e.type, e.mode, e.results_policy, e.is_test, e.opens_at, e.closes_at,
       JSON.stringify({ type: "manual" })]);
    await writeContests(c, id, contests);
    await audit(`election:${id}`, actor, "ELECTION_CREATED", { name: e.name, contests: contests.length, mode: e.mode, test: e.is_test }, c);
  });
  return id;
}

export async function updateElection(id, body, actor) {
  const cur = await one("select * from elections where id=$1", [id]);
  if (!cur) throw new HttpError(404, "Election not found");
  if (effectiveStatus(cur) !== "draft" && effectiveStatus(cur) !== "scheduled")
    throw new HttpError(409, "Ballot contents can't change once voting has opened.");
  const { e, contests } = parseElection(body);
  await tx(async c => {
    await c.query(
      `update elections set name=$2, jurisdiction=$3, type=$4, mode=$5, results_policy=$6, is_test=$7, opens_at=$8, closes_at=$9, updated_at=now() where id=$1`,
      [id, e.name, JSON.stringify(e.jurisdiction), e.type, e.mode, e.results_policy, e.is_test, e.opens_at, e.closes_at]);
    await writeContests(c, id, contests);
    await audit(`election:${id}`, actor, "ELECTION_UPDATED", { contests: contests.length }, c);
  });
}

/* NIST SP 1500-100 v2 import */
const text = v => typeof v === "string" ? v : (v?.Text?.find(t => /^en/i.test(t.Language || ""))?.Content || v?.Text?.[0]?.Content || "");
const CDF_STATUS = ["pre-election", "unofficial-partial", "unofficial-complete", "certified", "recount", "correction"];
const GP_LEVEL = { country: "federal", state: "state", county: "county", city: "city", municipality: "city", town: "city",
  township: "city", village: "city", borough: "city", "school": "district", "special": "district", district: "district" };

export async function importCdf(report, actor, { mode } = {}) {
  if (!report || !/ElectionReport$/.test(report["@type"] || "")) throw new HttpError(400, "Expected a NIST 1500-100 ElectionReport (JSON).");
  const el = (report.Election || [])[0];
  if (!el) throw new HttpError(400, "The report contains no Election.");
  const gp = Object.fromEntries((report.GpUnit || []).map(g => [g["@id"], g]));
  const parties = Object.fromEntries((report.Party || []).map(p => [p["@id"], text(p.Abbreviation) || text(p.Name)]));
  const candidates = Object.fromEntries((el.Candidate || []).map(c => [c["@id"], { name: text(c.BallotName), party: parties[c.PartyId] }]));
  const scope = gp[el.ElectionScopeId] || {};

  const contests = [];
  const counts = {};
  const subunits = {};
  for (const [i, k] of (el.Contest || []).entries()) {
    const t = k["@type"] || "";
    const isCand = /CandidateContest$/.test(t), isMeasure = /BallotMeasureContest$/.test(t) || /RetentionContest$/.test(t);
    if (!isCand && !isMeasure) continue;
    const options = [];
    const cc = {};
    for (const s of k.ContestSelection || []) {
      const st = s["@type"] || "";
      let name;
      if (/CandidateSelection$/.test(st)) {
        const cs = (s.CandidateIds || []).map(id => candidates[id]).filter(Boolean);
        if (s.IsWriteIn && !cs.length) name = "Write-in";
        else name = cs.map(c => c.name).join(" / ");
        options.push({ id: s["@id"], name: name || s["@id"], party: cs[0]?.party });
      } else if (/BallotMeasureSelection$/.test(st)) {
        options.push({ id: s["@id"], name: text(s.Selection) || s["@id"] });
      } else continue;
      // Prefer a count reported for the whole contest/election area; otherwise sum totals.
      const vc = (s.VoteCounts || []).filter(v => !v.Type || v.Type === "total");
      const whole = vc.filter(v => v.GpUnitId === k.ElectionDistrictId || v.GpUnitId === el.ElectionScopeId);
      const use = whole.length ? whole : vc;
      if (use.length) cc[s["@id"]] = use.reduce((a, v) => a + (Number(v.Count) || 0), 0);
    }
    if (!options.length) continue;
    const id = k["@id"] || `c${i + 1}`;
    contests.push({
      id, kind: isMeasure ? "measure" : "candidate", title: k.Name || text(k.BallotTitle), subtitle: text(k.BallotSubTitle) || null,
      body: text(k.FullText) || text(k.SummaryText) || null,
      method: isCand && (k.VotesAllowed || 1) > 1 ? "plurality_multi" : (k.VoteVariation === "rcv" ? "rcv" : "plurality_single"),
      seats: k.NumberElected || 1, options,
    });
    if (Object.keys(cc).length) counts[id] = cc;
    if (k.TotalSubUnits) subunits[id] = { reported: k.SubUnitsReported || 0, total: k.TotalSubUnits };
  }
  if (!contests.length) throw new HttpError(400, "No candidate or ballot-measure contests found in the report.");

  const sourceKey = sha256([report.IssuerAbbreviation || report.Issuer, el.ElectionScopeId, el.StartDate, text(el.Name)].join("|"));
  const reported = {
    status: CDF_STATUS.includes(report.Status) ? report.Status : "unofficial-partial",
    generatedDate: report.GeneratedDate || new Date().toISOString(), issuer: report.Issuer || null,
    counts, subunits, receivedAt: new Date().toISOString(),
  };
  const hasCounts = Object.keys(counts).length > 0;
  const body = {
    name: text(el.Name), type: TYPES.includes(el.Type) ? el.Type : "other",
    jurisdiction: { level: GP_LEVEL[String(scope.Type || "").toLowerCase()] || "other", name: text(scope.Name) || report.Issuer || "Jurisdiction" },
    contests,
  };

  const existing = await one("select * from elections where source_key=$1", [sourceKey]);
  if (existing) {
    // A repeat feed for an election we already have: refresh reported results only.
    await tx(async c => {
      if (hasCounts) {
        await c.query("update elections set reported=$2, updated_at=now() where id=$1", [existing.id, JSON.stringify(reported)]);
        await c.query("insert into election_reports(election_id, status, counts, subunits) values($1,$2,$3,$4)",
          [existing.id, reported.status, JSON.stringify(counts), JSON.stringify(subunits)]);
      }
      if (reported.status === "certified" && existing.status !== "certified")
        await c.query("update elections set status='certified', certified_at=now() where id=$1", [existing.id]);
      await audit(`election:${existing.id}`, actor, "RESULTS_FEED_RECEIVED",
        { status: reported.status, contests: Object.keys(counts).length, digest: sha256(JSON.stringify(counts)).slice(0, 16) }, c);
    });
    return { id: existing.id, updated: true };
  }

  const e = parseElection({
    ...body, mode: mode || (hasCounts ? "results_reporting" : "agora_ballots"),
    opensAt: el.StartDate ? `${el.StartDate}T07:00:00` : null, closesAt: el.EndDate ? `${el.EndDate}T20:00:00` : null,
  });
  const id = randomId();
  await tx(async c => {
    await c.query(
      `insert into elections(id, name, jurisdiction, type, mode, status, results_policy, is_test, opens_at, closes_at, source, source_key, reported)
       values($1,$2,$3,$4,$5,'draft',$6,$7,$8,$9,$10,$11,$12)`,
      [id, e.e.name, JSON.stringify({ ...e.e.jurisdiction, ocdId: scope.ExternalIdentifier?.find?.(x => x.Type === "ocd-id")?.Value || null }),
       e.e.type, e.e.mode, e.e.results_policy, !!report.IsTest, e.e.opens_at, e.e.closes_at,
       JSON.stringify({ type: "nist_cdf", issuer: report.Issuer, vendor: report.VendorApplicationId }), sourceKey,
       hasCounts ? JSON.stringify(reported) : null]);
    await writeContests(c, id, e.contests);
    if (hasCounts) await c.query("insert into election_reports(election_id, status, counts, subunits) values($1,$2,$3,$4)",
      [id, reported.status, JSON.stringify(counts), JSON.stringify(subunits)]);
    await audit(`election:${id}`, actor, "ELECTION_IMPORTED", { format: "NIST 1500-100", contests: e.contests.length, issuer: report.Issuer || null }, c);
  });
  return { id, created: true };
}

/* ── lifecycle ──────────────────────────────────────────────── */
const ALLOWED = { draft: ["scheduled", "open"], scheduled: ["draft", "open"], open: ["closed"], closed: ["certified", "open"], certified: [] };

export async function setStatus(id, status, actor) {
  const e = await one("select * from elections where id=$1", [id]);
  if (!e) throw new HttpError(404, "Election not found");
  const cur = effectiveStatus(e);
  if (!STATUSES.includes(status) || !ALLOWED[cur]?.includes(status)) throw new HttpError(409, `Can't change from ${cur} to ${status}.`);
  if (status === "open" && e.mode === "agora_ballots" && !e.is_test) {
    const roll = await one("select count(*)::int as n from election_roll where election_id=$1", [id]);
    if (!roll.n) throw new HttpError(409, "Load the voter roll before opening an official election (or mark it as a test).");
  }
  await query(
    `update elections set status=$2, updated_at=now(),
       opens_at = case when $2='open' and (opens_at is null or opens_at > now()) then now() else opens_at end,
       closes_at = case when $2='closed' and (closes_at is null or closes_at > now()) then now()
                        when $2='open' and closes_at <= now() then null else closes_at end,
       certified_at = case when $2='certified' then now() else certified_at end
     where id=$1`, [id, status]);
  await audit(`election:${id}`, actor, "STATUS_CHANGED", { from: cur, to: status });
}

export async function setPolicy(id, policy, actor) {
  if (!["live", "sealed_until_close"].includes(policy)) throw new HttpError(400, "Unknown policy");
  const e = await one("select * from elections where id=$1", [id]);
  if (!e) throw new HttpError(404, "Election not found");
  if (effectiveStatus(e) === "open" && e.results_policy === "sealed_until_close" && policy === "live")
    throw new HttpError(409, "Sealed results can't be unsealed while voting is open.");
  await query("update elections set results_policy=$2, updated_at=now() where id=$1", [id, policy]);
  await audit(`election:${id}`, actor, "RESULTS_POLICY", { policy });
}

export async function deleteElection(id, actor) {
  const e = await one("select * from elections where id=$1", [id]);
  if (!e) throw new HttpError(404, "Election not found");
  const n = await one("select count(*)::int as n from election_ballots where election_id=$1", [id]);
  if (n.n > 0) throw new HttpError(409, "An election with cast ballots can't be deleted.");
  await query("delete from elections where id=$1", [id]);
  await audit("global", actor, "ELECTION_DELETED", { id, name: e.name });
}

/** Voter roll: [{ voterId, lastName, dob }] — stored only as fingerprints. */
export async function loadRoll(id, records, { replace }, actor) {
  const e = await one("select * from elections where id=$1", [id]);
  if (!e) throw new HttpError(404, "Election not found");
  if (!Array.isArray(records) || records.length > 20000) throw new HttpError(400, "Send up to 20,000 records per request.");
  const fps = [];
  let skipped = 0;
  for (const r of records) {
    const reg = normReg(r.voterId), last = normName(r.lastName), dob = normDob(r.dob);
    if (!reg || !last || !dob) { skipped++; continue; }
    const personKey = fingerprint("person", `${last}|${dob}`);
    fps.push(fingerprint("roll", `${id}|${reg}|${personKey}`));
  }
  await tx(async c => {
    if (replace) await c.query("delete from election_roll where election_id=$1", [id]);
    for (let i = 0; i < fps.length; i += 1000)
      await c.query("insert into election_roll(election_id, roll_fp) select $1, unnest($2::text[]) on conflict do nothing", [id, fps.slice(i, i + 1000)]);
    const total = (await c.query("select count(*)::int as n from election_roll where election_id=$1", [id])).rows[0].n;
    await audit(`election:${id}`, actor, "VOTER_ROLL_LOADED", { received: records.length, accepted: fps.length, skipped, replace: !!replace, total }, c);
  });
  const total = await one("select count(*)::int as n from election_roll where election_id=$1", [id]);
  return { accepted: fps.length, skipped, total: total.n };
}

/* ── voting ─────────────────────────────────────────────────── */
function validateSelections(contests, selections) {
  const out = {};
  for (const k of contests) {
    const s = selections?.[k.id];
    if (s == null) continue; // skipping a contest (undervote) is allowed
    const ids = new Set(k.options.map(o => o.id));
    const ui = ballotUi(k.method);
    if (ui === "radio") {
      if (!ids.has(s.choice)) throw new HttpError(400, `Invalid choice in "${k.title}".`);
      out[k.id] = { choice: s.choice };
    } else if (ui === "checkbox" || ui === "approval") {
      const arr = [...new Set(Array.isArray(s.choices) ? s.choices : [])];
      if (!arr.length || arr.some(x => !ids.has(x))) throw new HttpError(400, `Invalid choices in "${k.title}".`);
      if (ui === "checkbox" && arr.length > k.seats) throw new HttpError(400, `Choose at most ${k.seats} in "${k.title}".`);
      out[k.id] = ui === "approval" ? { approvals: arr } : { choices: arr };
    } else {
      const arr = Array.isArray(s.rankings) ? s.rankings : [];
      if (!arr.length || new Set(arr).size !== arr.length || arr.some(x => !ids.has(x))) throw new HttpError(400, `Invalid rankings in "${k.title}".`);
      out[k.id] = { rankings: arr.map((id, i) => ({ id, rank: i + 1 })) };
    }
  }
  if (!Object.keys(out).length) throw new HttpError(400, "Your ballot is empty.");
  return out;
}

export async function castBallot(id, member, { registration, selections }) {
  const e = await one("select * from elections where id=$1", [id]);
  if (!e) throw new HttpError(404, "Election not found");
  if (e.mode !== "agora_ballots") throw new HttpError(400, "Agora is reporting results for this election; ballots are cast with the election office.");
  if (effectiveStatus(e) !== "open") throw new HttpError(409, "Voting is not open for this election.");
  if (!e.is_test && member.level < 3) throw new HttpError(403, "Official elections require full identity verification.", { needLevel: 3 });
  if (e.is_test && member.level < 2) throw new HttpError(403, "Test elections require email and phone verification.", { needLevel: 2 });

  const roll = await one("select count(*)::int as n from election_roll where election_id=$1", [id]);
  const fps = [fingerprint("voter", `${id}|member|${member.id}`)];
  if (roll.n > 0) {
    const reg = normReg(registration);
    if (!reg) throw new HttpError(400, "Enter your voter registration number.");
    if (!member.person_key) throw new HttpError(403, "Complete identity verification to match the voter roll.", { needLevel: 3 });
    const ok = await one("select 1 from election_roll where election_id=$1 and roll_fp=$2", [id, fingerprint("roll", `${id}|${reg}|${member.person_key}`)]);
    if (!ok) throw new HttpError(403, "We couldn't match you to this election's voter roll. Check your registration number, or contact your election office.");
    fps.push(fingerprint("voter", `${id}|reg|${reg}`));
  } else if (!e.is_test) {
    throw new HttpError(409, "This election's voter roll hasn't been loaded.");
  }

  const contests = (await query("select * from election_contests where election_id=$1 order by seq", [id])).rows;
  const clean_ = validateSelections(contests, selections);
  const receipt = randomToken(9).replace(/[-_]/g, "x").slice(0, 12).toUpperCase();

  const turnout = await tx(async c => {
    for (const fp of fps) {
      const r = await c.query("insert into election_participation(election_id, voter_fp) values($1,$2) on conflict do nothing", [id, fp]);
      if (r.rowCount === 0) throw new HttpError(409, "A ballot has already been cast for this voter in this election.");
    }
    await c.query("insert into election_ballots(id, election_id, receipt_hash, selections) values($1,$2,$3,$4)",
      [randomId(), id, sha256(`${id}|${receipt}`), JSON.stringify(clean_)]);
    const n = (await c.query("select count(*)::int as n from election_ballots where election_id=$1", [id])).rows[0].n;
    await audit(`election:${id}`, "voter", "BALLOT_CAST", { turnout: n }, c);
    return n;
  });
  return { receipt, turnout };
}

export async function checkReceipt(id, receipt) {
  const r = await one("select 1 from election_ballots where election_id=$1 and receipt_hash=$2",
    [id, sha256(`${id}|${String(receipt || "").trim().toUpperCase()}`)]);
  return { included: !!r };
}

/* ── results ────────────────────────────────────────────────── */
async function tallyElection(e, contests) {
  const ballots = (await query("select selections from election_ballots where election_id=$1", [e.id])).rows.map(r => r.selections);
  const out = {};
  for (const k of contests) {
    const bs = ballots.map(b => b[k.id]).filter(Boolean);
    const res = tallyVotes(k.method, bs, k.options, k.seats);
    const rounds = res.rounds || [];
    const final = rounds[rounds.length - 1]?.counts || {};
    const first = rounds[0]?.counts || {};
    // Instant-runoff style methods report counts per round: show the final round, plus first choices.
    const rows = res.results
      ? res.results.map(r => ({ id: r.id, name: r.name, party: r.party, votes: r.votes ?? r.score ?? r.count ?? 0 }))
      : k.options.map(o => ({ id: o.id, name: o.name, party: o.party, votes: final[o.id] ?? 0, firstChoice: first[o.id] ?? 0 }))
          .sort((a, b) => b.votes - a.votes || b.firstChoice - a.firstChoice);
    out[k.id] = {
      method: res.method + (rounds.length > 1 && !res.results ? ` · final of ${rounds.length} rounds` : ""),
      ballots: bs.length, winners: res.winners || [], results: rows, rounds: rounds.length || undefined,
    };
  }
  return out;
}

function shapeElection(e, contests, extra = {}) {
  return {
    id: e.id, name: e.name, jurisdiction: e.jurisdiction, type: e.type, mode: e.mode,
    status: effectiveStatus(e), resultsPolicy: e.results_policy, isTest: e.is_test,
    opensAt: e.opens_at, closesAt: e.closes_at, certifiedAt: e.certified_at, updatedAt: e.updated_at, source: e.source,
    contests: contests?.map(k => ({ id: k.id, kind: k.kind, title: k.title, subtitle: k.subtitle, body: k.body,
      method: k.method, methodLabel: VOTING_METHODS[k.method]?.label || k.method, ui: ballotUi(k.method), seats: k.seats, options: k.options })),
    ...extra,
  };
}

export async function listElections({ admin = false } = {}) {
  const rows = (await query(
    `select e.*, (select count(*)::int from election_ballots b where b.election_id=e.id) as turnout,
       (select count(*)::int from election_roll r where r.election_id=e.id) as roll_size
     from elections e ${admin ? "" : "where e.status <> 'draft'"} order by coalesce(e.opens_at, e.created_at) desc limit 200`)).rows;
  return rows.map(e => shapeElection(e, null, {
    turnout: e.mode === "agora_ballots" ? e.turnout : null,
    rollSize: admin ? e.roll_size : undefined,
    reportedStatus: e.reported?.status || null,
    contestCount: undefined,
  }));
}

export async function getElection(id, { admin = false, withResults = true } = {}) {
  const e = await one("select * from elections where id=$1", [id]);
  if (!e || (!admin && e.status === "draft")) throw new HttpError(404, "Election not found");
  const contests = (await query("select * from election_contests where election_id=$1 order by seq", [id])).rows;
  const turnout = (await one("select count(*)::int as n from election_ballots where election_id=$1", [id])).n;
  const rollSize = (await one("select count(*)::int as n from election_roll where election_id=$1", [id])).n;
  const visible = resultsVisible(e);
  let results = null;
  if (withResults && visible) {
    if (e.mode === "results_reporting" && e.reported) {
      results = {};
      for (const k of contests) {
        const cc = e.reported.counts?.[k.id] || {};
        const rows = k.options.map(o => ({ id: o.id, name: o.name, party: o.party, votes: cc[o.id] ?? 0 })).sort((a, b) => b.votes - a.votes);
        results[k.id] = { method: "Reported totals", ballots: rows.reduce((a, r) => a + r.votes, 0), winners: [], results: rows,
          subunits: e.reported.subunits?.[k.id] || null };
      }
    } else if (e.mode === "agora_ballots") {
      results = await tallyElection(e, contests);
    }
  }
  const history = e.mode === "results_reporting"
    ? (await query("select ts, status, counts from election_reports where election_id=$1 order by ts asc limit 300", [id])).rows
    : [];
  return shapeElection(e, contests, {
    turnout: e.mode === "agora_ballots" ? turnout : null, rollSize: admin ? rollSize : rollSize > 0,
    resultsVisible: visible, results, reported: e.reported ? { status: e.reported.status, generatedDate: e.reported.generatedDate, issuer: e.reported.issuer } : null,
    history,
  });
}

/** NIST 1500-100 v2 export of Agora's own results. */
export async function exportCdf(id) {
  const el = await getElection(id, { admin: false });
  if (!el.resultsVisible) throw new HttpError(409, "Results are sealed until voting closes.");
  const T = s => ({ "@type": "ElectionResults.InternationalizedText", Text: [{ "@type": "ElectionResults.LanguageString", Content: String(s), Language: "en" }] });
  const scope = "gp-scope";
  const cand = [];
  const contests = el.contests.map((k, i) => {
    const r = el.results?.[k.id];
    const vc = id => {
      const row = r?.results?.find(x => x.id === id);
      return row?.votes == null ? [] : [{ "@type": "ElectionResults.VoteCounts", Count: row.votes, GpUnitId: scope, Type: "total" }];
    };
    if (k.kind === "measure") return {
      "@id": k.id, "@type": "ElectionResults.BallotMeasureContest", ElectionDistrictId: scope, Name: k.title, SequenceOrder: i + 1,
      ContestSelection: k.options.map(o => ({ "@id": `${k.id}-${o.id}`, "@type": "ElectionResults.BallotMeasureSelection", Selection: T(o.name), VoteCounts: vc(o.id) })),
    };
    return {
      "@id": k.id, "@type": "ElectionResults.CandidateContest", ElectionDistrictId: scope, Name: k.title, SequenceOrder: i + 1,
      VotesAllowed: k.ui === "checkbox" ? k.seats : 1, NumberElected: k.seats,
      ContestSelection: k.options.map(o => {
        cand.push({ "@id": `cand-${k.id}-${o.id}`, "@type": "ElectionResults.Candidate", BallotName: T(o.name) });
        return { "@id": `${k.id}-${o.id}`, "@type": "ElectionResults.CandidateSelection", CandidateIds: [`cand-${k.id}-${o.id}`], VoteCounts: vc(o.id) };
      }),
    };
  });
  const status = el.status === "certified" ? "certified" : el.status === "closed" ? "unofficial-complete" : "unofficial-partial";
  return {
    "@type": "ElectionResults.ElectionReport", Format: "summary-contest", GeneratedDate: new Date().toISOString(),
    Issuer: "Agora", IssuerAbbreviation: "AGORA", SequenceStart: 1, SequenceEnd: 1, Status: status,
    VendorApplicationId: "Agora Secure Democratic Voting", IsTest: el.isTest,
    GpUnit: [{ "@id": scope, "@type": "ElectionResults.ReportingUnit", Type: "other", Name: T(el.jurisdiction.name) }],
    Election: [{
      "@type": "ElectionResults.Election", Name: T(el.name), ElectionScopeId: scope, Type: TYPES.includes(el.type) && el.type !== "referendum" ? el.type : "other",
      StartDate: (el.opensAt ? new Date(el.opensAt) : new Date()).toISOString().slice(0, 10),
      EndDate: (el.closesAt ? new Date(el.closesAt) : new Date()).toISOString().slice(0, 10),
      Candidate: cand, Contest: contests,
    }],
  };
}

/* ── jurisdiction API keys ──────────────────────────────────── */
export async function createJurisdictionKey(name) {
  const n = clean(name, 120);
  if (!n) throw new HttpError(400, "Name the jurisdiction (e.g. Fresno County Elections).");
  const key = `agk_${randomToken(30)}`;
  const id = randomId();
  await query("insert into jurisdiction_keys(id, name, key_hash) values($1,$2,$3)", [id, n, sha256(key)]);
  await audit("global", "admin", "JURISDICTION_KEY_CREATED", { id, name: n });
  return { id, name: n, key };
}
export async function listJurisdictionKeys() {
  return (await query("select id, name, created_at, last_used_at, revoked_at from jurisdiction_keys order by created_at desc")).rows;
}
export async function revokeJurisdictionKey(id) {
  await query("update jurisdiction_keys set revoked_at=now() where id=$1 and revoked_at is null", [id]);
  await audit("global", "admin", "JURISDICTION_KEY_REVOKED", { id });
}
