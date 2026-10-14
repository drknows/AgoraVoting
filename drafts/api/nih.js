/* GET /api/nih?q=term — NIH RePORTER grants mentioning a drug, ingredient or target.
   Upstream: NIH RePORTER API v2 (https://api.reporter.nih.gov/), free, no key. */
import { json, fail, query, getJSON, route, clean } from "./_lib/http.js";
import { cached } from "./_lib/store.js";

const API = "https://api.reporter.nih.gov/v2/projects/search";
const LIMIT = 500; // RePORTER's per-request maximum

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

export function summarize(j, q) {
  const results = Array.isArray(j?.results) ? j.results : [];
  const years = results.map(p => Number(p?.fiscal_year)).filter(y => Number.isInteger(y) && y > 1900);
  const sorted = [...results].sort((a, b) => num(b?.award_amount) - num(a?.award_amount));
  return {
    projects: Number.isFinite(Number(j?.meta?.total)) ? Number(j.meta.total) : results.length,
    sampled: results.length,
    total: results.reduce((s, p) => s + num(p?.award_amount), 0),
    from: years.length ? Math.min(...years) : null,
    to: years.length ? Math.max(...years) : null,
    top: sorted.slice(0, 8).map(p => ({
      title: clean(p?.project_title, 200) || "Untitled project",
      org: clean(p?.organization?.org_name ?? p?.organization?.org_name_full ?? "", 120),
      fy: Number(p?.fiscal_year) || null,
      amount: num(p?.award_amount),
    })),
    url: "https://reporter.nih.gov/?term=" + encodeURIComponent(q),
  };
}

export const GET = route(async req => {
  const q = clean(query(req).get("q"), 100);
  if (q.length < 2 || q.length > 80) return fail("Enter a drug, ingredient or target between 2 and 80 characters.");
  const data = await cached("nih:" + q.toLowerCase(), 86400, async () => {
    const j = await getJSON(API, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        criteria: { advanced_text_search: { operator: "and", search_field: "projecttitle,terms,abstracttext", search_text: q } },
        include_fields: ["ProjectTitle", "Organization", "FiscalYear", "AwardAmount", "ApplId", "ProjectNum"],
        offset: 0, limit: LIMIT, sort_field: "award_amount", sort_order: "desc",
      }),
      timeout: 25000,
    });
    return summarize(j, q);
  });
  return json(data, 200, 86400);
}, "Grant search");
