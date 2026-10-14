/* GET /api/quote?t=PFE -> {last, chg, chg1y, series:[[date, close]...], source} */
import { json, fail, query, route } from "./_lib/http.js";
import { okTicker } from "./_lib/sec.js";
import { quote } from "./_lib/prices.js";

export const GET = route(async req => {
  const t = (query(req).get("t") || "").toUpperCase();
  if (!okTicker(t)) return fail("Choose one of the companies Agora tracks.", 400);
  const q = await quote(t);
  if (!q) return fail("Share prices are temporarily unavailable.", 503);
  return json(q, 200, 3600);
}, "Share prices");
