/* GET /api/deals -> {filings:[{date, t, label, form, url}]}
   Merger-related SEC filings by the drugmakers we track over the last two years. */
import { json, route } from "./_lib/http.js";
import { cached } from "./_lib/store.js";
import { cik, submissions, recent, docUrl, secJSON, PHARMA } from "./_lib/sec.js";

const LABEL = {
  "SC TO-T": "Tender offer to buy another company's shares (SC TO-T)",
  "SC TO-T/A": "Update to a tender offer (SC TO-T/A)",
  "S-4": "Merger document for shareholders (S-4)",
  "S-4/A": "Updated merger document for shareholders (S-4/A)",
  "DEFM14A": "Merger proxy statement for a shareholder vote (DEFM14A)",
  "425": "Public statement about a pending merger (425)",
};
const MAX = 40;

export function label(f) {
  if (f.form === "8-K" || f.form === "8-K/A") return /(^|,)\s*2\.01\b/.test(f.items || "") ? `Completed an acquisition (${f.form}, item 2.01)` : null;
  return LABEL[f.form] || null;
}

/* Older pages of the filing index, for companies whose "recent" list doesn't reach back far enough. */
async function older(sub, since) {
  const r = recent(sub), oldest = r.length ? r[r.length - 1].date : "";
  if (!oldest || oldest <= since) return [];
  const files = (sub.filings?.files || []).filter(f => f?.name && (!f.filingTo || f.filingTo >= since)).slice(0, 2);
  const out = [];
  for (const f of files) {
    try {
      const page = await cached("sec:subfile:" + f.name, 86400, () => secJSON("https://data.sec.gov/submissions/" + f.name));
      out.push(...recent({ filings: { recent: page } }));
    } catch {}
  }
  return out;
}

export async function collect(tickers = PHARMA, now = Date.now()) {
  const since = new Date(now - 730 * 864e5).toISOString().slice(0, 10);
  const per = await Promise.all(tickers.map(async t => {
    try {
      const c = await cik(t), sub = await submissions(c);
      const list = [...recent(sub), ...(await older(sub, since))], seen = new Set(), rows = [];
      for (const f of list) {
        if (!f.date || f.date < since || !f.acc || !f.doc) continue;
        const lab = label(f); if (!lab) continue;
        const key = f.form === "425" ? "425|" + f.date : f.acc; // one 425 row per company per day is plenty
        if (seen.has(key)) continue; seen.add(key);
        rows.push({ date: f.date, t, label: lab, form: f.form, url: docUrl(c, f.acc, f.doc) });
      }
      return rows;
    } catch (e) { console.error("deals", t, e.message); return null; }
  }));
  if (per.every(p => p === null)) throw new Error("No SEC data for any company");
  return per.filter(Boolean).flat().sort((a, b) => b.date.localeCompare(a.date) || a.t.localeCompare(b.t)).slice(0, MAX);
}

export const GET = route(async () => {
  const data = await cached("sec:deals", 21600, async () => ({ filings: await collect() }));
  return json(data, 200, 21600);
}, "Merger filings");
