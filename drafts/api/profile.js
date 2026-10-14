/* GET /api/profile?t=PFE -> {name, address, city, state, zip, phone, revenueConcept, annual:[{year, revenue, net}], quarterly:[{q, revenue, net, derived?}]}
   Address and phone from the SEC submissions file; results from XBRL company facts (10-K / 10-Q data). */
import { json, fail, query, route } from "./_lib/http.js";
import { cached } from "./_lib/store.js";
import { cik, submissions, secJSON, okTicker } from "./_lib/sec.js";

const REVENUE = ["Revenues", "RevenueFromContractWithCustomerExcludingAssessedTax", "RevenueFromContractWithCustomerIncludingAssessedTax", "SalesRevenueNet", "HealthCareOrganizationRevenue", "PremiumsEarnedNet"];
const NET = ["NetIncomeLoss", "ProfitLoss"];
const DAY = 864e5;

const days = (a, b) => (Date.parse(b) - Date.parse(a)) / DAY;
/* Period end -> fiscal month. 52/53-week years can end a few days into the next month (e.g. 2022-01-02 = Dec 2021). */
function monthOf(end) {
  const d = new Date(end + "T12:00:00Z"); if (isNaN(d)) return null;
  let y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
  if (d.getUTCDate() <= 10) { m--; if (!m) { m = 12; y--; } }
  return { y, m };
}

/* Facts for one concept, split into annual (~365-day, from annual reports) and quarterly (~91-day) durations, deduped by period keeping the latest filed. */
export function periods(facts, concept) {
  const rows = facts?.facts?.["us-gaap"]?.[concept]?.units?.USD;
  const annual = new Map(), quarter = new Map();
  if (!Array.isArray(rows)) return { annual, quarter };
  for (const f of rows) {
    if (!f || typeof f.val !== "number" || !f.start || !f.end) continue;
    const len = days(f.start, f.end), mo = monthOf(f.end); if (!mo || !Number.isFinite(len)) continue;
    const key = mo.y * 100 + mo.m, rec = { end: f.end, val: f.val, filed: f.filed || "" };
    let map = null;
    if (len >= 350 && len <= 380 && /^(10-K|20-F|40-F)/.test(f.form || "")) map = annual;
    else if (len >= 80 && len <= 100) map = quarter;
    if (!map) continue;
    const old = map.get(key); if (!old || rec.filed >= old.filed) map.set(key, rec);
  }
  return { annual, quarter };
}

const latest = m => Math.max(0, ...m.keys());
/* Pick the first concept (in priority order) whose annual data is the most recent. Older periods the chosen concept lacks are filled from the others. */
function choose(facts, list) {
  const all = list.map(c => ({ c, ...periods(facts, c) })).filter(x => x.annual.size || x.quarter.size);
  if (!all.length) return { concept: null, annual: new Map(), quarter: new Map() };
  const best = all.reduce((a, b) => (latest(b.annual) > latest(a.annual) ? b : a));
  const annual = new Map(best.annual), quarter = new Map(best.quarter);
  const minA = Math.min(...(annual.size ? annual.keys() : [Infinity])), minQ = Math.min(...(quarter.size ? quarter.keys() : [Infinity]));
  for (const o of all) {
    if (o === best) continue;
    for (const [k, v] of o.annual) if (k < minA && !annual.has(k)) annual.set(k, v);
    for (const [k, v] of o.quarter) if (k < minQ && !quarter.has(k)) quarter.set(k, v);
  }
  return { concept: best.c, annual, quarter };
}

/* Label quarters by fiscal year; derive Q4 = full year minus Q1-Q3 where no Q4 was reported. */
function fiscal(series, fyEnd) {
  const annual = new Map(), quarter = new Map(), derived = new Set();
  for (const [k, v] of series.annual) annual.set(Math.floor(k / 100), v.val);
  for (const [k] of series.quarter) {
    const y = Math.floor(k / 100), m = k % 100, diff = (m - fyEnd + 12) % 12, n = Math.round(diff / 3) || 4;
    if (n > 4) continue;
    const fy = n === 4 ? y : y + (m > fyEnd ? 1 : 0);
    quarter.set(`${fy} Q${n}`, series.quarter.get(k).val);
  }
  for (const [fy, total] of annual) {
    const k4 = `${fy} Q4`, parts = [1, 2, 3].map(n => quarter.get(`${fy} Q${n}`));
    if (!quarter.has(k4) && parts.every(p => typeof p === "number")) { quarter.set(k4, total - parts[0] - parts[1] - parts[2]); derived.add(k4); }
  }
  return { annual, quarter, derived };
}

const qSort = (a, b) => { const [ya, qa] = a.split(" Q").map(Number), [yb, qb] = b.split(" Q").map(Number); return ya - yb || qa - qb; };

export function financials(facts) {
  const rev = choose(facts, REVENUE), net = choose(facts, NET);
  const lastAnnual = latest(rev.annual) || latest(net.annual);
  const fyEnd = lastAnnual ? lastAnnual % 100 : 12;
  const R = fiscal(rev, fyEnd), N = fiscal(net, fyEnd);
  const years = [...new Set([...R.annual.keys(), ...N.annual.keys()])].sort((a, b) => a - b).slice(-6);
  const qs = [...new Set([...R.quarter.keys(), ...N.quarter.keys()])].sort(qSort).slice(-12);
  return {
    revenueConcept: rev.concept,
    annual: years.map(year => ({ year, revenue: R.annual.get(year) ?? null, net: N.annual.get(year) ?? null })),
    quarterly: qs.map(q => {
      const o = { q, revenue: R.quarter.get(q) ?? null, net: N.quarter.get(q) ?? null };
      if (R.derived.has(q) || N.derived.has(q)) o.derived = true;
      return o;
    }),
  };
}

const KEEP = new Set(["PO", "NE", "NW", "SE", "SW", "US", "USA"]);
const title = s => String(s || "").trim().toLowerCase().replace(/\b[a-z0-9]+\b/g, w => (KEEP.has(w.toUpperCase()) ? w.toUpperCase() : /^\d/.test(w) ? w : w[0].toUpperCase() + w.slice(1)));
const phone = p => { const d = String(p || "").replace(/\D/g, ""); return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d.length === 11 && d[0] === "1" ? `${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7)}` : (p ? String(p).trim() : null); };

export function contact(sub) {
  const a = sub?.addresses?.business || sub?.addresses?.mailing || {};
  return {
    name: sub?.name || null,
    address: [a.street1, a.street2].filter(Boolean).map(title).join(", ") || null,
    city: a.city ? title(a.city) : null,
    state: a.stateOrCountry || null,
    zip: a.zipCode || null,
    phone: phone(sub?.phone),
  };
}

export const GET = route(async req => {
  const t = (query(req).get("t") || "").toUpperCase();
  if (!okTicker(t)) return fail("Choose one of the companies Agora tracks.", 400);
  const data = await cached("sec:profile:" + t, 21600, async () => {
    const c = await cik(t);
    const [sub, facts] = await Promise.all([submissions(c), secJSON(`https://data.sec.gov/api/xbrl/companyfacts/CIK${c}.json`)]);
    return { ...contact(sub), ...financials(facts) };
  });
  return json(data, 200, 21600);
}, "Company financials");
