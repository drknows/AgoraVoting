/**
 * Financial disclosures of public officials — stock trades, CDs, bonds, real
 * estate and other transactions — at the federal, state and local level.
 *
 * Sources:
 *  - U.S. House: the Clerk's yearly index of Periodic Transaction Reports
 *    (synced automatically; trades are read out of electronically filed PDFs
 *    and marked "auto-extracted" so readers check them against the PDF).
 *  - Everyone else (Senate, President/VP/cabinet via OGE, judges, generals and
 *    admirals, governors, legislators, mayors, councils...): the official
 *    records registry — entries added by Agora staff, or submitted by verified
 *    members and published after staff review. Every entry must cite the
 *    official source document.
 *
 * "Late" flag: federal officials must report a covered trade within 45 days
 * (STOCK Act; same 45-day rule for federal judges). The flag is only applied
 * to federal officials, where that rule exists.
 */
import { unzipSync, strFromU8 } from "fflate";
import { query, one, tx } from "./db";
import { randomId } from "./crypto";
import { audit } from "./audit";
import { HttpError, clean } from "./http";

export const CATEGORIES = {
  president: { label: "President", level: "federal" },
  vice_president: { label: "Vice President", level: "federal" },
  cabinet: { label: "Cabinet member", level: "federal" },
  white_house: { label: "Senior White House official", level: "federal" },
  agency_head: { label: "Agency head / senior executive", level: "federal" },
  supreme_court: { label: "Supreme Court justice", level: "federal" },
  federal_judge: { label: "Federal judge", level: "federal" },
  us_senator: { label: "U.S. Senator", level: "federal" },
  us_representative: { label: "U.S. Representative", level: "federal" },
  military_flag_officer: { label: "General / Admiral", level: "federal" },
  governor: { label: "Governor", level: "state" },
  state_executive: { label: "State executive official", level: "state" },
  state_legislator: { label: "State legislator", level: "state" },
  state_judge: { label: "State judge", level: "state" },
  county_official: { label: "County official", level: "county" },
  mayor: { label: "Mayor", level: "city" },
  city_council: { label: "City council member", level: "city" },
  city_official: { label: "City official", level: "city" },
  school_board: { label: "School board member", level: "district" },
  other: { label: "Other official", level: "other" },
};
export const ASSET_TYPES = ["stock", "option", "bond", "cd", "mutual_fund", "etf", "crypto", "real_estate", "private_business", "bank_account", "loan", "other"];
export const TXN_TYPES = ["purchase", "sale", "partial_sale", "exchange", "acquisition", "disposition", "gift", "other"];
const SOURCE_TYPES = ["house_ptr", "senate_ptr", "oge_278", "judiciary", "state_filing", "local_filing", "court_record", "other"];

export const DIRECTORY = [
  { who: "U.S. Representatives", where: "House Clerk — Financial Disclosure Reports", url: "https://disclosures-clerk.house.gov/FinancialDisclosure", note: "Synced into Agora automatically every day." },
  { who: "U.S. Senators", where: "Senate Electronic Financial Disclosures (eFD)", url: "https://efdsearch.senate.gov/search/", note: "The Senate blocks automated access, so Agora staff add Senate trades from these reports." },
  { who: "President, Vice President, Senate-confirmed appointees (incl. cabinet)", where: "U.S. Office of Government Ethics — Officials' Individual Disclosures", url: "https://extapps2.oge.gov/web/OGE.nsf/Officials%20Individual%20Disclosures%20Search%20Collection?OpenForm", note: "Annual 278e reports and 278-T periodic transaction reports." },
  { who: "Other executive-branch officials", where: "Request from the employing agency with OGE Form 201", url: "https://extapps2.oge.gov/web/oge.nsf/about_ethics-contact-list", note: "Each agency's ethics office releases reports on request." },
  { who: "Generals and admirals", where: "Their military department's ethics office (OGE Form 201 request)", url: "https://extapps2.oge.gov/web/oge.nsf/about_ethics-contact-list", note: "Senior officers file OGE 278 reports with their service." },
  { who: "Federal judges and justices", where: "Judiciary Financial Disclosure Reports", url: "https://www.uscourts.gov/administration-policies/judiciary-financial-disclosure-reports", note: "Includes periodic transaction reports required since 2022." },
  { who: "Governors, state officials and legislators", where: "Your state's ethics commission", url: "https://www.ncsl.org/ethics/ncsl-ethics-resources", note: "Filing rules and deadlines differ by state." },
  { who: "Mayors, council members, county and local officials", where: "City or county clerk / local ethics office", url: null, note: "e.g. California's Form 700 is filed with each agency; many cities post them online." },
];

const MONEY = s => Number(String(s).replace(/[^\d]/g, "")) || null;
function parseAmount(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  const m = t.match(/\$?([\d,]+)\s*(?:-|to)\s*\$?([\d,]+)/i);
  if (m) return { min: MONEY(m[1]), max: MONEY(m[2]), text: t };
  const over = t.match(/over\s*\$?([\d,]+)/i);
  if (over) return { min: MONEY(over[1]) + 1, max: null, text: t };
  const single = t.match(/\$\s*([\d,]+)/);
  if (single) return { min: MONEY(single[1]), max: MONEY(single[1]), text: t };
  return { min: null, max: null, text: t || null };
}
const isoDate = s => {
  if (!s) return null;
  const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
};
const nameKey = n => String(n || "").normalize("NFKD").toLowerCase().replace(/^(hon\.?|honorable|mr\.?|mrs\.?|ms\.?|dr\.?)\s+/, "").replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();

async function upsertOfficial(o, client = null) {
  const q = (t, p) => client ? client.query(t, p) : query(t, p);
  const category = CATEGORIES[o.category] ? o.category : "other";
  const name = clean(o.name, 120);
  if (!name) throw new HttpError(400, "Enter the official's name.");
  const key = nameKey(name);
  const jurisdiction = clean(o.jurisdiction, 160) || (CATEGORIES[category].level === "federal" ? "United States" : "");
  const existing = (await q("select id from disclosure_officials where name_key=$1 and category=$2 and coalesce(jurisdiction,'')=$3", [key, category, jurisdiction])).rows[0];
  if (existing) {
    if (o.office || o.district) await q("update disclosure_officials set office=coalesce($2, office), district=coalesce($3, district) where id=$1", [existing.id, clean(o.office, 160) || null, clean(o.district, 20) || null]);
    return existing.id;
  }
  const id = randomId();
  await q(
    `insert into disclosure_officials(id, name, name_key, category, office, level, jurisdiction, state, district)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict (name_key, category, jurisdiction) do nothing`,
    [id, name, key, category, clean(o.office, 160) || CATEGORIES[category].label, CATEGORIES[category].level, jurisdiction,
     clean(o.state, 2).toUpperCase() || null, clean(o.district, 20) || null]);
  return (await q("select id from disclosure_officials where name_key=$1 and category=$2 and coalesce(jurisdiction,'')=$3", [key, category, jurisdiction])).rows[0].id;
}

/* ── U.S. House sync ────────────────────────────────────────── */
const HOUSE = "https://disclosures-clerk.house.gov/public_disc";
const BROWSER_HEADERS = { "user-agent": "Mozilla/5.0 (compatible; AgoraCivic/2.5; +https://vercel.app)", accept: "*/*" };

export async function syncHouseIndex(year = new Date().getFullYear()) {
  const res = await fetch(`${HOUSE}/financial-pdfs/${year}FD.zip`, { headers: BROWSER_HEADERS, cache: "no-store" });
  if (!res.ok) throw new HttpError(502, `House Clerk index download failed (${res.status}).`);
  const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
  const xmlName = Object.keys(files).find(f => /\.xml$/i.test(f));
  if (!xmlName) throw new HttpError(502, "House Clerk index had no XML file.");
  const xml = strFromU8(files[xmlName]);
  const tag = (b, t) => (b.match(new RegExp(`<${t}>([\\s\\S]*?)</${t}>`)) || [])[1]?.trim() || "";
  const members = [...xml.matchAll(/<Member>([\s\S]*?)<\/Member>/g)].map(m => m[1])
    .map(b => ({ prefix: tag(b, "Prefix"), last: tag(b, "Last"), first: tag(b, "First"), suffix: tag(b, "Suffix"),
      type: tag(b, "FilingType"), stateDst: tag(b, "StateDst"), year: tag(b, "Year"), date: tag(b, "FilingDate"), docId: tag(b, "DocID") }))
    .filter(m => m.type === "P" && /^\d+$/.test(m.docId));
  let added = 0;
  for (const m of members) {
    const id = `house:${m.docId}`;
    if (await one("select 1 from disclosure_filings where id=$1", [id])) continue;
    const name = [m.first, m.last, m.suffix].filter(Boolean).join(" ");
    const officialId = await upsertOfficial({
      name, category: "us_representative", office: `U.S. Representative${m.stateDst ? `, ${m.stateDst}` : ""}`,
      jurisdiction: "United States", state: m.stateDst?.slice(0, 2), district: m.stateDst,
    });
    await query(
      `insert into disclosure_filings(id, source, official_id, year, filer_name, state_district, filing_type, filing_date, document_url, parse_status)
       values($1,'house_ptr',$2,$3,$4,$5,'Periodic Transaction Report',$6,$7,$8) on conflict do nothing`,
      [id, officialId, Number(m.year) || year, name, m.stateDst, isoDate(m.date),
       `${HOUSE}/ptr-pdfs/${m.year || year}/${m.docId}.pdf`, m.docId.length === 8 && m.docId.startsWith("2") ? "pending" : "scanned"]);
    added++;
  }
  return { year, filingsInIndex: members.length, added };
}

const ASSET_CODE = { ST: "stock", OP: "option", GS: "bond", CS: "bond", MF: "mutual_fund", EF: "etf", RP: "real_estate", CT: "crypto",
  BA: "bank_account", OL: "private_business", OI: "private_business", AB: "other", DO: "loan", OT: "other", HN: "other", PS: "other" };
const TYPE_CODE = { "P": "purchase", "S": "sale", "S (partial)": "partial_sale", "S (Partial)": "partial_sale", "E": "exchange" };

/** Reads the transaction table out of an electronically filed House PTR.
 *  PDF text often arrives as one long line with wrapped cells interleaved, so
 *  each row is anchored on "[asset code] type date date amount" and the asset
 *  name is the text between the previous row and this one. */
export function parsePtrText(raw) {
  const text = String(raw).replace(/\u0000/g, "").replace(/\s+/g, " ");
  const AMOUNT = "(\\$[\\d,]+\\s*-\\s*(?:(?:F S:|S O:|D:|C:)[^$]{0,120}?)?\\$[\\d,]+|Over \\$[\\d,]+|Spouse\\/DC Over \\$1,000,000)";
  const re = new RegExp("\\[([A-Z]{2})\\]\\s*(P|S \\([Pp]artial\\)|S|E)\\s+(\\d{2}\\/\\d{2}\\/\\d{4})\\s*(\\d{2}\\/\\d{2}\\/\\d{4})\\s*" + AMOUNT, "g");
  const headerEnd = (() => { const i = text.search(/Gains\s*>\s*\$200\??/i); return i >= 0 ? text.indexOf("?", i) + 1 || i : 0; })();
  const rows = [];
  let prevEnd = headerEnd, m;
  while ((m = re.exec(text))) {
    if (m.index < headerEnd) continue;
    let seg = text.slice(prevEnd, m.index).trim();
    prevEnd = m.index + m[0].length;
    seg = seg.replace(/^(\$[\d,]+\s*)+/, "")                     // tail of a wrapped amount
             .replace(/^(?:F S:\s*(?:New|Amended)\s*)/i, "")
             .replace(/^(?:S O:|D:|C:)[^]*?(?=\b(?:SP|JT|DC)\b\s)/, "")  // descriptor lines before an owner code
             .replace(/^(?:F S:\s*(?:New|Amended)\s*)/i, "").trim();
    let owner = "Self";
    const om = seg.match(/^(SP|JT|DC)\s+/);
    if (om) { owner = { SP: "Spouse", JT: "Joint", DC: "Dependent child" }[om[1]]; seg = seg.slice(om[0].length); }
    seg = seg.split(/\b(?:S O:|D:|C:)\s/).pop().trim();
    if (!seg || seg.length < 2) continue;
    const ticker = (seg.match(/\(([A-Z][A-Z.\-]{0,5})\)\s*$/) || [])[1] || null;
    const amountText = m[5].replace(/(?:F S:|S O:|D:|C:)[^$]*?(?=\$)/, "").replace(/\s+/g, " ").trim();
    const amt = parseAmount(amountText);
    rows.push({
      owner, asset_name: seg.slice(0, 300), ticker, asset_type: ASSET_CODE[m[1]] || "other", asset_code: m[1],
      transaction_type: TYPE_CODE[m[2]] || (m[2].startsWith("S") ? "partial_sale" : "other"),
      transaction_date: isoDate(m[3]), disclosed_date: isoDate(m[4]),
      amount_min: amt.min, amount_max: amt.max, amount_text: amt.text,
    });
  }
  return rows;
}

export async function parseFiling(filingId) {
  const f = await one("select * from disclosure_filings where id=$1", [filingId]);
  if (!f) throw new HttpError(404, "Filing not found");
  try {
    const res = await fetch(f.document_url, { headers: BROWSER_HEADERS, cache: "no-store" });
    if (!res.ok) throw new Error(`PDF download failed (${res.status})`);
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(await res.arrayBuffer()));
    const { text } = await extractText(pdf, { mergePages: true });
    const rows = parsePtrText(text);
    await tx(async c => {
      await c.query("delete from disclosure_transactions where filing_id=$1 and auto_extracted", [filingId]);
      for (const [i, r] of rows.entries()) {
        await c.query(
          `insert into disclosure_transactions(id, official_id, filing_id, line_no, owner, asset_name, ticker, asset_type, transaction_type,
             transaction_date, disclosed_date, amount_min, amount_max, amount_text, source_type, source_url, status, auto_extracted)
           values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'house_ptr',$15,'published',true)
           on conflict (filing_id, line_no) do nothing`,
          [randomId(), f.official_id, filingId, i, r.owner, r.asset_name, r.ticker, r.asset_type, r.transaction_type,
           r.transaction_date, r.disclosed_date, r.amount_min, r.amount_max, r.amount_text, f.document_url]);
      }
      await c.query("update disclosure_filings set parse_status=$2, parse_error=null, parsed_at=now(), txn_count=$3 where id=$1",
        [filingId, rows.length ? "parsed" : "no_rows", rows.length]);
    });
    return { filingId, transactions: rows.length };
  } catch (e) {
    await query("update disclosure_filings set parse_status='failed', parse_error=$2, parsed_at=now() where id=$1", [filingId, String(e.message).slice(0, 300)]);
    return { filingId, error: e.message };
  }
}

/** Daily job (and admin "Sync now"): refresh the index, then read new PDFs within a time budget. */
export async function syncHouse({ budgetMs = 45_000, maxPdfs = 40 } = {}) {
  const started = Date.now();
  const year = new Date().getFullYear();
  const index = await syncHouseIndex(year);
  if (new Date().getMonth() < 1) await syncHouseIndex(year - 1).catch(() => null); // catch late filings from last year in January
  const pending = (await query("select id from disclosure_filings where parse_status='pending' order by filing_date desc limit $1", [maxPdfs])).rows;
  const parsed = [];
  for (let i = 0; i < pending.length && Date.now() - started < budgetMs; i += 4) {
    parsed.push(...await Promise.all(pending.slice(i, i + 4).map(p => parseFiling(p.id))));
  }
  const remaining = (await one("select count(*)::int as n from disclosure_filings where parse_status='pending'")).n;
  await audit("global", "system", "DISCLOSURES_SYNCED", { source: "house", added: index.added, parsed: parsed.length, remaining });
  return { ...index, parsed: parsed.length, transactionsAdded: parsed.reduce((a, p) => a + (p.transactions || 0), 0), remaining };
}

/* ── registry: staff entries and member submissions ─────────── */
function parseTxnInput(b) {
  const sourceUrl = clean(b.sourceUrl, 600);
  if (!/^https:\/\/\S+$/.test(sourceUrl)) throw new HttpError(400, "Every entry must link to the official source document (https://…).");
  const asset = clean(b.assetName, 300);
  if (!asset) throw new HttpError(400, "Describe the asset (e.g. Apple Inc. stock, 12-month CD at Chase, 123 Main St).");
  const amt = b.amountMin || b.amountMax
    ? { min: Number(b.amountMin) || null, max: Number(b.amountMax) || null, text: clean(b.amountText, 80) || null }
    : parseAmount(b.amountText);
  return {
    owner: clean(b.owner, 40) || "Self", asset_name: asset, ticker: clean(b.ticker, 10).toUpperCase() || null,
    asset_type: ASSET_TYPES.includes(b.assetType) ? b.assetType : "other",
    transaction_type: TXN_TYPES.includes(b.transactionType) ? b.transactionType : "other",
    transaction_date: isoDate(b.transactionDate), disclosed_date: isoDate(b.disclosedDate),
    amount_min: amt.min, amount_max: amt.max, amount_text: amt.text,
    source_type: SOURCE_TYPES.includes(b.sourceType) ? b.sourceType : "other", source_url: sourceUrl,
    notes: clean(b.notes, 1000) || null,
  };
}

export async function addTransaction(b, { status, actor, memberId }) {
  const t = parseTxnInput(b);
  const officialId = await upsertOfficial(b.official || {});
  const id = randomId();
  await query(
    `insert into disclosure_transactions(id, official_id, owner, asset_name, ticker, asset_type, transaction_type, transaction_date,
       disclosed_date, amount_min, amount_max, amount_text, source_type, source_url, notes, status, submitted_by)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
    [id, officialId, t.owner, t.asset_name, t.ticker, t.asset_type, t.transaction_type, t.transaction_date, t.disclosed_date,
     t.amount_min, t.amount_max, t.amount_text, t.source_type, t.source_url, t.notes, status, memberId || null]);
  await audit("global", actor, status === "pending" ? "DISCLOSURE_SUBMITTED" : "DISCLOSURE_ADDED", { id, official: officialId });
  return id;
}

/** CSV columns: official_name, category, office, jurisdiction, state, asset, ticker, asset_type, transaction_type,
 *  transaction_date, disclosed_date, amount, owner, source_type, source_url, notes */
export async function importCsv(csv) {
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new HttpError(400, "The CSV needs a header row and at least one data row.");
  const head = rows[0].map(h => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const col = name => head.indexOf(name);
  const results = { added: 0, errors: [] };
  for (const [i, r] of rows.slice(1).entries()) {
    const g = n => (col(n) >= 0 ? r[col(n)] : "") || "";
    if (!r.some(Boolean)) continue;
    try {
      await addTransaction({
        official: { name: g("official_name"), category: g("category"), office: g("office"), jurisdiction: g("jurisdiction"), state: g("state") },
        assetName: g("asset"), ticker: g("ticker"), assetType: g("asset_type"), transactionType: g("transaction_type"),
        transactionDate: g("transaction_date"), disclosedDate: g("disclosed_date"), amountText: g("amount"), owner: g("owner"),
        sourceType: g("source_type"), sourceUrl: g("source_url"), notes: g("notes"),
      }, { status: "published", actor: "admin" });
      results.added++;
    } catch (e) { results.errors.push(`Row ${i + 2}: ${e.message}`); }
    if (results.errors.length > 50) break;
  }
  return results;
}
function parseCsv(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

export async function reviewTransaction(id, status) {
  if (!["published", "rejected"].includes(status)) throw new HttpError(400, "Unknown status");
  const r = await one("update disclosure_transactions set status=$2 where id=$1 returning id", [id, status]);
  if (!r) throw new HttpError(404, "Not found");
  await audit("global", "admin", "DISCLOSURE_REVIEWED", { id, status });
}
export async function deleteTransaction(id) {
  await query("delete from disclosure_transactions where id=$1", [id]);
  await audit("global", "admin", "DISCLOSURE_DELETED", { id });
}

/* ── reading ────────────────────────────────────────────────── */
const LATE_SQL = `(o.level='federal' and t.transaction_date is not null and t.disclosed_date is not null
                   and t.disclosed_date - t.transaction_date > 45)`;

export async function listTransactions(f = {}, { admin = false } = {}) {
  const where = [admin && f.status ? "t.status=$1" : "t.status='published'"];
  const params = admin && f.status ? [f.status] : [];
  const add = (sql, v) => { params.push(v); where.push(sql.replace("?", `$${params.length}`)); };
  if (f.q) add("(o.name ilike ? or t.asset_name ilike $X or t.ticker ilike $X)".replace(/\$X/g, `$${params.length + 1}`), `%${clean(f.q, 80)}%`);
  if (f.category && CATEGORIES[f.category]) add("o.category=?", f.category);
  if (f.level) add("o.level=?", clean(f.level, 20));
  if (f.assetType && ASSET_TYPES.includes(f.assetType)) add("t.asset_type=?", f.assetType);
  if (f.official) add("o.id=?", clean(f.official, 40));
  if (f.from) add("t.transaction_date >= ?", isoDate(f.from));
  if (f.to) add("t.transaction_date <= ?", isoDate(f.to));
  if (f.late === "1") where.push(LATE_SQL);
  if (f.minAmount) add("coalesce(t.amount_max, t.amount_min) >= ?", Number(f.minAmount) || 0);
  const limit = Math.min(Number(f.limit) || 100, 500);
  const rows = (await query(
    `select t.*, o.name as official_name, o.category, o.office, o.level, o.jurisdiction, o.district,
       ${LATE_SQL} as late, (t.disclosed_date - t.transaction_date) as days_to_disclose
     from disclosure_transactions t join disclosure_officials o on o.id=t.official_id
     where ${where.join(" and ")}
     order by t.transaction_date desc nulls last, t.created_at desc limit ${limit}`, params)).rows;
  return rows.map(r => ({
    id: r.id, official: { id: r.official_id, name: r.official_name, category: r.category, categoryLabel: CATEGORIES[r.category]?.label,
      office: r.office, level: r.level, jurisdiction: r.jurisdiction, district: r.district },
    owner: r.owner, asset: r.asset_name, ticker: r.ticker, assetType: r.asset_type, transactionType: r.transaction_type,
    transactionDate: r.transaction_date, disclosedDate: r.disclosed_date, daysToDisclose: r.days_to_disclose,
    amount: { min: r.amount_min ? Number(r.amount_min) : null, max: r.amount_max ? Number(r.amount_max) : null, text: r.amount_text },
    late: r.late, sourceType: r.source_type, sourceUrl: r.source_url, notes: r.notes, autoExtracted: r.auto_extracted,
    status: r.status,
  }));
}

export async function summary() {
  const s = await one(
    `select count(*) filter (where t.status='published')::int as transactions,
       count(distinct t.official_id) filter (where t.status='published')::int as officials,
       count(*) filter (where t.status='published' and ${LATE_SQL})::int as late,
       count(*) filter (where t.status='pending')::int as pending,
       max(t.transaction_date) filter (where t.status='published') as latest
     from disclosure_transactions t join disclosure_officials o on o.id=t.official_id`);
  const top = (await query(
    `select o.id, o.name, o.category, o.office, count(*)::int as trades, sum(coalesce(t.amount_max, t.amount_min, 0))::bigint as max_value
     from disclosure_transactions t join disclosure_officials o on o.id=t.official_id
     where t.status='published' and t.transaction_date > now() - interval '90 days'
     group by o.id order by trades desc limit 10`)).rows.map(r => ({ ...r, categoryLabel: CATEGORIES[r.category]?.label, max_value: Number(r.max_value) }));
  const filings = await one(
    `select count(*)::int as total, count(*) filter (where parse_status='pending')::int as pending,
       count(*) filter (where parse_status='scanned')::int as scanned, max(filing_date) as latest from disclosure_filings`);
  const lastSync = await one("select ts from audit_log where scope='global' and event='DISCLOSURES_SYNCED' order by id desc limit 1");
  return { ...s, topTraders: top, filings, lastSync: lastSync?.ts || null };
}

export async function listFilings({ q, limit = 100 } = {}) {
  const params = [];
  let where = "";
  if (q) { params.push(`%${clean(q, 80)}%`); where = "where f.filer_name ilike $1 or f.state_district ilike $1"; }
  return (await query(
    `select f.id, f.source, f.filer_name, f.state_district, f.filing_type, f.filing_date, f.document_url, f.parse_status, f.txn_count, f.official_id
     from disclosure_filings f ${where} order by f.filing_date desc nulls last limit ${Math.min(+limit || 100, 300)}`, params)).rows;
}
