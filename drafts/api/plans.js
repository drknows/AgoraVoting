/* GET /api/plans?zip=&age=&income= — every individual Marketplace plan in a ZIP code, grouped by insurer.
   Upstream: CMS Marketplace API (https://developer.cms.gov/marketplace-api/), needs CMS_MARKETPLACE_API_KEY. */
import { json, fail, query, getJSON, route } from "./_lib/http.js";
import { cached, allow } from "./_lib/store.js";

const BASE = "https://marketplace.api.healthcare.gov/api/v1";
const PAGE = 10, MAX_PLANS = 150; // the API pages 10 plans at a time; cap upstream calls per lookup

/* States that run their own exchange (their plans are not in HealthCare.gov's data). */
export const STATE_EXCHANGES = {
  CA: ["Covered California", "https://www.coveredca.com/"],
  CO: ["Connect for Health Colorado", "https://connectforhealthco.com/"],
  CT: ["Access Health CT", "https://www.accesshealthct.com/"],
  DC: ["DC Health Link", "https://dchealthlink.com/"],
  GA: ["Georgia Access", "https://georgiaaccess.gov/"],
  ID: ["Your Health Idaho", "https://www.yourhealthidaho.org/"],
  IL: ["Get Covered Illinois", "https://getcovered.illinois.gov/"],
  KY: ["kynect", "https://kynect.ky.gov/"],
  ME: ["CoverME.gov", "https://www.coverme.gov/"],
  MD: ["Maryland Health Connection", "https://www.marylandhealthconnection.gov/"],
  MA: ["Massachusetts Health Connector", "https://www.mahealthconnector.org/"],
  MN: ["MNsure", "https://www.mnsure.org/"],
  NV: ["Nevada Health Link", "https://www.nevadahealthlink.com/"],
  NJ: ["Get Covered New Jersey", "https://nj.gov/getcoverednj/"],
  NM: ["beWellnm", "https://www.bewellnm.com/"],
  NY: ["NY State of Health", "https://nystateofhealth.ny.gov/"],
  OR: ["Oregon Health Insurance Marketplace", "https://healthcare.oregon.gov/"],
  PA: ["Pennie", "https://pennie.com/"],
  RI: ["HealthSource RI", "https://healthsourceri.com/"],
  VT: ["Vermont Health Connect", "https://portal.healthconnect.vermont.gov/"],
  VA: ["Virginia's Insurance Marketplace", "https://marketplace.virginia.gov/"],
  WA: ["Washington Healthplanfinder", "https://www.wahealthplanfinder.org/"],
};

/* Open enrollment for next year starts November 1; before that, show this year's plans. */
export function planYear(now = new Date()) {
  const env = Number(process.env.CMS_PLAN_YEAR);
  if (Number.isInteger(env) && env > 2013) return env;
  return now.getUTCMonth() >= 10 ? now.getUTCFullYear() + 1 : now.getUTCFullYear();
}

const num = v => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

/* Pick the in-network, individual amount from a CMS deductibles/moops list (combined medical+drug first). */
export function pickCost(list) {
  if (!Array.isArray(list) || !list.length) return null;
  const inNet = list.filter(d => !d?.network_tier || /^in[- ]?network/i.test(d.network_tier));
  const indiv = inNet.filter(d => d?.individual === true || /individual/i.test(d?.family_cost || ""));
  const pool = indiv.length ? indiv : inNet.length ? inNet : list;
  const pref = pool.find(d => /combined|total/i.test(d?.type || "")) || pool.find(d => /medical/i.test(d?.type || "")) || pool[0];
  return num(pref?.amount);
}

const METAL_ORDER = ["Catastrophic", "Bronze", "Expanded Bronze", "Silver", "Gold", "Platinum"];
const metalRank = m => { const i = METAL_ORDER.indexOf(m); return i < 0 ? 99 : i; };
const range = vals => { const v = vals.filter(x => x !== null); return v.length ? [Math.min(...v), Math.max(...v)] : [null, null]; };

export function plan(p) {
  return {
    name: String(p?.name || "Unnamed plan").slice(0, 160),
    issuer: String(p?.issuer?.name || "Unknown insurer").slice(0, 120),
    issuerUrl: p?.issuer?.individual_url || p?.issuer?.individual_consumer_url || p?.issuer?.url || null,
    type: String(p?.type || "").slice(0, 20),
    metal: String(p?.metal_level || "").slice(0, 30),
    premium: num(p?.premium),
    withCredit: num(p?.premium_w_credit),
    deductible: pickCost(p?.deductibles),
    moop: pickCost(p?.moops),
  };
}

export function group(plans) {
  const by = new Map();
  for (const p of plans) {
    const g = by.get(p.issuer) || { issuer: p.issuer, url: null, list: [] };
    g.url ||= p.issuerUrl; g.list.push(p); by.set(p.issuer, g);
  }
  return [...by.values()].map(g => ({
    issuer: g.issuer,
    url: /^https?:\/\//i.test(g.url || "") ? g.url : null,
    plans: g.list.length,
    metals: [...new Set(g.list.map(p => p.metal).filter(Boolean))].sort((a, b) => metalRank(a) - metalRank(b)),
    premium: range(g.list.map(p => p.premium)),
    deductible: range(g.list.map(p => p.deductible)),
    moop: range(g.list.map(p => p.moop)),
  })).sort((a, b) => (a.premium[0] ?? Infinity) - (b.premium[0] ?? Infinity));
}

export const GET = route(async req => {
  const p = query(req);
  const zip = String(p.get("zip") || "").trim(), ageS = String(p.get("age") ?? "").trim(), incS = String(p.get("income") ?? "").trim();
  if (!/^\d{5}$/.test(zip)) return fail("Enter a 5-digit ZIP code.");
  const age = Number(ageS), income = incS === "" ? 0 : Number(incS);
  if (ageS === "" || !Number.isInteger(age) || age < 0 || age > 120) return fail("Enter an age between 0 and 120.");
  if (!Number.isFinite(income) || income < 0 || income > 1e8) return fail("Enter a household income of $0 or more.");

  const key = process.env.CMS_MARKETPLACE_API_KEY;
  if (!key) return fail("Live plan comparison hasn't been switched on yet.", 503);

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
  if (!(await allow("plans", ip, 30, 3600))) return fail("You've run a lot of plan searches. Please wait a few minutes and try again.", 429);

  const year = planYear(), inc = Math.round(income);
  const data = await cached(`plans:${year}:${zip}:${age}:${inc}`, 12 * 3600, async () => {
    const k = "apikey=" + encodeURIComponent(key);
    const c = await getJSON(`${BASE}/counties/by/zip/${zip}?${k}`, { headers: { accept: "application/json" } });
    const county = (Array.isArray(c?.counties) ? c.counties : [])[0];
    if (!county?.fips) return { notFound: true, zip };
    const state = String(county.state || "").toUpperCase(), sbm = STATE_EXCHANGES[state];
    const stateOnly = () => ({ stateExchange: true, state, county: county.name, zip, exchange: sbm ? { name: sbm[0], url: sbm[1] } : null });

    const body = offset => JSON.stringify({
      household: { income: inc, people: [{ age, aptc_eligible: true, gender: "Female", uses_tobacco: false }] },
      market: "Individual",
      place: { countyfips: county.fips, state, zipcode: zip },
      year, limit: PAGE, offset, order: "asc", sort: "premium",
    });
    const page = offset => getJSON(`${BASE}/plans/search?${k}`, { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: body(offset), timeout: 20000 });

    let first;
    try { first = await page(0); }
    catch (e) { if (sbm && e.status >= 400 && e.status < 500) return stateOnly(); throw e; }
    const total = Number(first?.total) || 0;
    let raw = Array.isArray(first?.plans) ? first.plans : [];
    if (!raw.length) return sbm ? stateOnly() : { zip, county: county.name, state, age, income: inc, year, total: 0, sampled: 0, issuers: [], cheapest: [] };

    const offsets = [];
    for (let o = PAGE; o < Math.min(total, MAX_PLANS); o += PAGE) offsets.push(o);
    for (let i = 0; i < offsets.length; i += 5) {
      const pages = await Promise.all(offsets.slice(i, i + 5).map(o => page(o).catch(() => null)));
      pages.forEach(pg => { if (Array.isArray(pg?.plans)) raw = raw.concat(pg.plans); });
    }
    const seen = new Set();
    const plans = raw.filter(x => { const id = x?.id || x?.name; if (seen.has(id)) return false; seen.add(id); return true; }).map(plan);
    const cheapest = plans.filter(x => x.premium !== null).sort((a, b) => a.premium - b.premium).slice(0, 15)
      .map(({ issuerUrl, ...rest }) => rest);
    return { zip, county: county.name, state, age, income: inc, year, total: Math.max(total, plans.length), sampled: plans.length, issuers: group(plans), cheapest };
  });
  return json(data, 200, 12 * 3600);
}, "Plan comparison");
