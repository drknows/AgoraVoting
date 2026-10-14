/* GET /api/quotes?t=PFE,MRK -> {PFE:{last, chg, chg1y}, ...}. Tickers that fail are left out. */
import { json, fail, query, route } from "./_lib/http.js";
import { okTicker } from "./_lib/sec.js";
import { quote, pool } from "./_lib/prices.js";

export const GET = route(async req => {
  const ts = [...new Set((query(req).get("t") || "").split(",").map(s => s.trim().toUpperCase()).filter(okTicker))].slice(0, 20);
  if (!ts.length) return fail("Choose one or more of the companies Agora tracks.", 400);
  const qs = await pool(ts, 4, quote), out = {};
  ts.forEach((t, i) => { const q = qs[i]; if (q) out[t] = { last: q.last, chg: q.chg, chg1y: q.chg1y }; });
  if (!Object.keys(out).length) return fail("Share prices are temporarily unavailable.", 503);
  return json(out, 200, 3600);
}, "Share prices");
