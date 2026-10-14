/* GET /api/federal?t=TICKER — largest federal grants and contracts paid to a tracked company.
   Upstream: USAspending.gov API v2 (https://api.usaspending.gov/), free, no key. */
import { json, fail, query, getJSON, route, clean } from "./_lib/http.js";
import { cached } from "./_lib/store.js";

const API = "https://api.usaspending.gov/api/v2/search/spending_by_award/";

/* Recipient names as they appear in federal award data (subsidiaries and former names included). */
export const RECIPIENTS = {
  PFE: ["PFIZER"],
  MRK: ["MERCK SHARP", "MERCK & CO"],
  JNJ: ["JOHNSON & JOHNSON", "JANSSEN"],
  ABBV: ["ABBVIE"],
  LLY: ["ELI LILLY"],
  BMY: ["BRISTOL-MYERS SQUIBB", "BRISTOL MYERS SQUIBB"],
  // Insurers (the shared company picker on the Pharma page lists them too)
  UNH: ["UNITEDHEALTH", "UNITED HEALTHCARE", "OPTUM"],
  ELV: ["ELEVANCE HEALTH", "ANTHEM"],
  CVS: ["CVS HEALTH", "CVS PHARMACY", "AETNA"],
  CI: ["CIGNA", "EXPRESS SCRIPTS"],
  HUM: ["HUMANA"],
  CNC: ["CENTENE", "HEALTH NET"],
  MOH: ["MOLINA HEALTHCARE"],
  OSCR: ["OSCAR HEALTH"],
  ALHC: ["ALIGNMENT HEALTH"],
  CLOV: ["CLOVER HEALTH"],
};

const GRANTS = ["02", "03", "04", "05"], CONTRACTS = ["A", "B", "C", "D"];
const FIELDS = ["Award ID", "Recipient Name", "Award Amount", "Awarding Agency", "Start Date", "Description", "generated_internal_id"];

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

export function award(r) {
  const gid = r?.generated_internal_id;
  return {
    id: clean(r?.["Award ID"], 80),
    desc: clean(r?.Description, 300),
    recipient: clean(r?.["Recipient Name"], 120),
    agency: clean(r?.["Awarding Agency"], 120),
    start: typeof r?.["Start Date"] === "string" ? r["Start Date"].slice(0, 10) : null,
    amount: num(r?.["Award Amount"]),
    url: gid ? "https://www.usaspending.gov/award/" + encodeURIComponent(String(gid)) : null,
  };
}

async function search(names, codes) {
  const j = await getJSON(API, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      filters: {
        award_type_codes: codes,
        recipient_search_text: names,
        time_period: [{ start_date: "2008-10-01", end_date: new Date().toISOString().slice(0, 10) }],
      },
      fields: FIELDS, sort: "Award Amount", order: "desc", limit: 10, page: 1, subawards: false,
    }),
    timeout: 25000,
  });
  return (Array.isArray(j?.results) ? j.results : []).map(award).sort((a, b) => b.amount - a.amount);
}

export const GET = route(async req => {
  const t = String(query(req).get("t") || "").trim().toUpperCase();
  const names = RECIPIENTS[t];
  if (!names) return fail("Choose one of the companies listed to see its federal awards.");
  const data = await cached("federal:" + t, 86400, async () => {
    const [grants, contracts] = await Promise.all([search(names, GRANTS), search(names, CONTRACTS)]);
    const sum = l => l.reduce((s, a) => s + a.amount, 0);
    return { grants, contracts, grantTotal: sum(grants), grantN: grants.length, contractTotal: sum(contracts), contractN: contracts.length };
  });
  return json(data, 200, 86400);
}, "Federal award search");
