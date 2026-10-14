/* End-of-day share prices. Alpha Vantage when ALPHA_VANTAGE_KEY is set, otherwise Stooq's free daily CSV
   (with STOOQ_API_KEY appended on retry if Stooq asks for one). Results are cached an hour per ticker. */
import { get } from "./http.js";
import { cached } from "./store.js";

const DAY = 864e5;
const ymd = d => new Date(d).toISOString().slice(0, 10);
const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const r2 = n => (n == null || !Number.isFinite(n) ? null : Math.round(n * 100) / 100);

/* Parse Stooq's CSV (Date,Open,High,Low,Close,Volume). Returns null when the body isn't that CSV. */
export function parseStooq(text) {
  const lines = String(text || "").trim().split(/\r?\n/);
  if (!lines.length || !/^date\s*,/i.test(lines[0])) return null;
  const head = lines[0].split(",").map(h => h.trim().toLowerCase());
  const di = head.indexOf("date"), ci = head.indexOf("close");
  if (di < 0 || ci < 0) return null;
  const out = [];
  for (const line of lines.slice(1)) {
    const c = line.split(","), d = (c[di] || "").trim(), v = num(c[ci]);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && v != null && v > 0) out.push([d, v]);
  }
  out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return out.length ? out : null;
}

/* Parse Alpha Vantage TIME_SERIES_DAILY JSON. Returns null on rate-limit notes or errors. */
export function parseAlpha(j) {
  const ts = j && j["Time Series (Daily)"]; if (!ts || typeof ts !== "object") return null;
  const out = [];
  for (const [d, row] of Object.entries(ts)) { const v = num(row?.["4. close"]); if (/^\d{4}-\d{2}-\d{2}$/.test(d) && v != null && v > 0) out.push([d, v]); }
  out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  return out.length ? out : null;
}

async function stooq(t) {
  const base = `https://stooq.com/q/d/l/?s=${t.toLowerCase()}.us&i=d&d1=${ymd(Date.now() - 400 * DAY).replace(/-/g, "")}&d2=${ymd(Date.now()).replace(/-/g, "")}`;
  const tryUrl = async url => { try { return parseStooq(await (await get(url, { timeout: 10000 })).text()); } catch { return null; } };
  let s = await tryUrl(base);
  if (!s && process.env.STOOQ_API_KEY) s = await tryUrl(base + "&apikey=" + encodeURIComponent(process.env.STOOQ_API_KEY));
  return s;
}

async function alpha(t, size) {
  const key = process.env.ALPHA_VANTAGE_KEY; if (!key) return null;
  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${encodeURIComponent(t)}&outputsize=${size}&apikey=${encodeURIComponent(key)}`;
    return parseAlpha(await (await get(url, { timeout: 10000 })).json());
  } catch { return null; }
}

/* Build {last, chg, chg1y, series, source} from an ascending [[date, close]] list. */
export function summarize(rows, source) {
  const n = rows.length, last = rows[n - 1][1], prev = n > 1 ? rows[n - 2][1] : null;
  return {
    last: r2(last),
    chg: prev ? r2((last / prev - 1) * 100) : 0,
    chg1y: n > 252 ? r2((last / rows[n - 1 - 252][1] - 1) * 100) : null,
    asOf: rows[n - 1][0],
    series: rows.slice(-252),
    source,
  };
}

async function load(t) {
  let s;
  if ((s = await alpha(t, "full"))) return summarize(s, "end of day, Alpha Vantage");
  if ((s = await stooq(t))) return summarize(s, "end of day, Stooq");
  if ((s = await alpha(t, "compact"))) return summarize(s, "end of day, Alpha Vantage");
  return null;
}

/* Quote for one (already validated) ticker, or null when every provider fails. Failures are not cached. */
export async function quote(ticker) {
  const t = String(ticker).toUpperCase();
  try { return await cached("px:" + t, 3600, async () => { const q = await load(t); if (!q) throw new Error("no prices"); return q; }); }
  catch { return null; }
}

/* Run fn over items with limited concurrency, preserving order. */
export async function pool(items, size, fn) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); } }));
  return out;
}
