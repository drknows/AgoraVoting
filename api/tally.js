/* /api/tally — GET ?keys=k1,k2,...  -> {[key]: {counts: {choice: n}, sh: {choice: n}}}
   Unrecognized keys are skipped; at most 50 keys per request. */
import { json, fail, query, route } from "./_lib/http.js";
import { many } from "./_lib/store.js";
import { validKey } from "./vote.js";

const MAX = 50;
const counts = (a = []) => { const o = {}; for (let i = 0; i < a.length; i += 2) { const n = +a[i + 1] || 0; if (n > 0) o[a[i]] = n; } return o; };

export const GET = route(async req => {
  const keys = [...new Set((query(req).get("keys") || "").split(",").map(k => k.trim()).filter(Boolean))];
  if (keys.length > MAX) return fail(`Please ask for at most ${MAX} results at a time.`);
  const ok = keys.filter(validKey);
  if (!ok.length) return json({});
  const r = await many(ok.flatMap(k => [["HGETALL", "v:" + k], ["HGETALL", "vsh:" + k]]));
  const out = {};
  ok.forEach((k, i) => { out[k] = { counts: counts(r[2 * i]), sh: counts(r[2 * i + 1]) }; });
  return json(out);
}, "Vote counts");
