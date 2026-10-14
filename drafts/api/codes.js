/* GET /api/codes?type=proc|icd&q=... — search procedure (HCPCS) or diagnosis (ICD-10-CM) codes.
   Upstream: NLM Clinical Table Search Service (https://clinicaltables.nlm.nih.gov/), free, no key.
   Response format: [total, [codes], extraFields | null, [[display fields]...]]. */
import { json, fail, query, getJSON, route, clean } from "./_lib/http.js";
import { cached } from "./_lib/store.js";

const BASE = "https://clinicaltables.nlm.nih.gov/api";

/* Turn a Clinical Tables response into [{code, desc}], skipping obsolete codes when flagged. */
export function parse(j) {
  if (!Array.isArray(j)) return { total: 0, items: [] };
  const [total, codes, extra, display] = j;
  const codeList = Array.isArray(codes) ? codes : [], rows = Array.isArray(display) ? display : [];
  const obsolete = extra && typeof extra === "object" && Array.isArray(extra.obsolete) ? extra.obsolete : null;
  const items = [];
  const n = Math.max(codeList.length, rows.length);
  for (let i = 0; i < n; i++) {
    if (obsolete && (obsolete[i] === true || obsolete[i] === "true")) continue;
    const row = Array.isArray(rows[i]) ? rows[i] : [];
    const code = clean(codeList[i] ?? row[0], 20);
    const desc = clean(row.length > 1 ? row.slice(1).join(" ") : row[0] === code ? "" : row[0], 300);
    if (code) items.push({ code, desc });
  }
  return { total: Number.isFinite(Number(total)) ? Number(total) : items.length, items };
}

export const GET = route(async req => {
  const p = query(req), type = p.get("type"), q = clean(p.get("q"), 100);
  if (type !== "proc" && type !== "icd") return fail("Choose a procedure or diagnosis search.");
  if (q.length < 2 || q.length > 80) return fail("Enter a description or code between 2 and 80 characters.");
  const url = type === "proc"
    ? `${BASE}/hcpcs/v3/search?terms=${encodeURIComponent(q)}&df=code,display&ef=obsolete&maxList=25`
    : `${BASE}/icd10cm/v3/search?sf=code,name&df=code,name&terms=${encodeURIComponent(q)}&maxList=25`;
  const data = await cached(`codes:${type}:${q.toLowerCase()}`, 7 * 86400, async () => parse(await getJSON(url, { timeout: 12000 })));
  // proc -> {items:[{code, desc}]} (rendered by lookOut); icd -> {items:[{code, desc}], total} (rendered in #icdOut)
  return json(type === "proc" ? { items: data.items } : data, 200, 7 * 86400);
}, "Code search");
