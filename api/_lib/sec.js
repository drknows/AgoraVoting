/* SEC EDGAR access. The SEC requires a descriptive User-Agent with a contact email
   (https://www.sec.gov/os/accessing-edgar-data) and allows at most 10 requests per second. */
import { getJSON, get } from "./http.js";
import { cached } from "./store.js";

export const UA = process.env.SEC_USER_AGENT || "Agora Society Stands contact@agorasocietystands.com";
const H = { "user-agent": UA, accept: "application/json" };

export const secJSON = url => getJSON(url, { headers: H });
export const secText = async url => (await get(url, { headers: { "user-agent": UA } })).text();

/* ticker -> zero-padded 10-digit CIK, from the SEC's official ticker file (cached a day) */
export async function cik(ticker) {
  const map = await cached("sec:tickers", 86400, async () => {
    const j = await secJSON("https://www.sec.gov/files/company_tickers.json");
    const m = {}; Object.values(j).forEach(r => { m[String(r.ticker).toUpperCase()] = String(r.cik_str).padStart(10, "0"); }); return m;
  });
  const c = map[String(ticker).toUpperCase()]; if (!c) throw Object.assign(new Error("Unknown ticker"), { user: true }); return c;
}

export const submissions = c => cached("sec:sub:" + c, 3600, () => secJSON(`https://data.sec.gov/submissions/CIK${c}.json`));

/* Recent filings as a flat list of objects */
export function recent(sub) {
  const r = sub.filings?.recent || {}; const n = (r.accessionNumber || []).length, out = [];
  for (let i = 0; i < n; i++) out.push({ acc: r.accessionNumber[i], form: r.form[i], date: r.filingDate[i], report: r.reportDate?.[i], doc: r.primaryDocument?.[i], desc: r.primaryDocDescription?.[i], items: r.items?.[i] || "" });
  return out;
}
export const docUrl = (c, acc, doc) => `https://www.sec.gov/Archives/edgar/data/${+c}/${acc.replace(/-/g, "")}/${doc}`;

/* Tickers the site tracks (keep in sync with public/assets/companies.js) */
export const TRACKED = ["PFE", "MRK", "JNJ", "ABBV", "LLY", "BMY", "UNH", "ELV", "CVS", "CI", "HUM", "CNC", "MOH", "OSCR", "ALHC", "CLOV"];
export const PHARMA = ["PFE", "MRK", "JNJ", "ABBV", "LLY", "BMY"];
export const okTicker = t => TRACKED.includes(String(t || "").toUpperCase());
