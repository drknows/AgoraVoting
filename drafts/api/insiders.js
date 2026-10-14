/* GET /api/insiders?t=PFE -> {trades:[{owner, title, code, ad, shares, price, date, filed, plan, url}]}
   Form 4 filings from the last 90 days, parsed from each filing's raw XML. */
import { json, fail, query, route } from "./_lib/http.js";
import { cached } from "./_lib/store.js";
import { cik, submissions, recent, docUrl, secText, okTicker } from "./_lib/sec.js";
import { pool } from "./_lib/prices.js";

const MAX_FILINGS = 25, MAX_ROWS = 60;

const unxml = s => String(s ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
/* Inner text of the first <name>...</name> (namespace prefixes tolerated); null if absent or self-closing. */
const tag = (xml, name) => { const m = new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${name}>`).exec(xml || ""); return m ? m[1] : null; };
const all = (xml, name) => [...String(xml || "").matchAll(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${name}>`, "g"))].map(m => m[1]);
/* Form 4 wraps most fields as <field><value>x</value><footnoteId .../></field> */
const val = (xml, name) => { const b = tag(xml, name); if (b == null) return null; const v = tag(b, "value"); return v != null ? unxml(v) || null : (/</.test(b) ? null : unxml(b) || null); };
const yes = v => /^(1|true|y|yes)$/i.test(String(v ?? "").trim());
const num = v => { const n = parseFloat(String(v ?? "").replace(/,/g, "")); return Number.isFinite(n) ? n : null; };
const footIds = xml => [...String(xml || "").matchAll(/<footnoteId[^>]*\bid="([^"]+)"/g)].map(m => m[1]);

/* "SMITH JOHN A" -> "Smith John A"; leaves mixed-case names alone. */
const nameCase = s => (s && s === s.toUpperCase() ? s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()) : s);

export function parseForm4(xml) {
  xml = String(xml || "");
  const owners = all(xml, "reportingOwner").map(o => {
    const rel = tag(o, "reportingOwnerRelationship") || "";
    const roles = [];
    const officer = unxml(tag(rel, "officerTitle"));
    if (officer) roles.push(officer);
    if (yes(tag(rel, "isDirector"))) roles.push("Director");
    if (yes(tag(rel, "isTenPercentOwner"))) roles.push("10% owner");
    const other = unxml(tag(rel, "otherText")); if (other && !officer) roles.push(other);
    if (!roles.length && yes(tag(rel, "isOfficer"))) roles.push("Officer");
    return { owner: nameCase(unxml(tag(o, "rptOwnerName"))) || null, title: roles.join(", ") || null };
  });
  const who = owners[0] || { owner: null, title: null };
  if (owners.length > 1) who.owner = owners.map(o => o.owner).filter(Boolean).join("; ");

  const notes = {}; for (const m of xml.matchAll(/<footnote\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/footnote>/g)) notes[m[1]] = unxml(m[2]);
  const PLAN = /10b5-?1/i;
  const boxed = yes(tag(xml, "aff10b5One"));
  const remarks = PLAN.test(unxml(tag(xml, "remarks")));

  return all(xml, "nonDerivativeTransaction").map(tx => {
    const code = unxml(tag(tag(tx, "transactionCoding") || "", "transactionCode")) || null;
    const byNote = footIds(tx).some(id => PLAN.test(notes[id] || ""));
    const openMarket = code === "S" || code === "P";
    const date = val(tx, "transactionDate");
    return {
      ...who,
      code,
      ad: val(tx, "transactionAcquiredDisposedCode"),
      shares: num(val(tx, "transactionShares")),
      price: num(val(tx, "transactionPricePerShare")),
      date: date ? date.slice(0, 10) : null,
      plan: byNote || ((boxed || remarks) && openMarket),
    };
  });
}

/* The primary document is usually the XSL-rendered view, e.g. "xslF345X05/form4.xml"; the raw XML drops the directory. */
export const rawDoc = doc => String(doc || "").replace(/^xsl[^/]*\//i, "");

export const GET = route(async req => {
  const t = (query(req).get("t") || "").toUpperCase();
  if (!okTicker(t)) return fail("Choose one of the companies Agora tracks.", 400);
  const data = await cached("sec:ins:" + t, 3600, async () => {
    const c = await cik(t), sub = await submissions(c);
    const since = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
    const list = recent(sub).filter(f => (f.form === "4" || f.form === "4/A") && f.date >= since && f.doc).slice(0, MAX_FILINGS);
    const per = await pool(list, 4, async f => {
      try {
        const xml = await secText(docUrl(c, f.acc, rawDoc(f.doc)));
        return parseForm4(xml).map(r => ({ ...r, filed: f.date, url: docUrl(c, f.acc, f.doc) }));
      } catch { return []; }
    });
    const trades = per.flat().sort((a, b) => (b.date || b.filed).localeCompare(a.date || a.filed) || b.filed.localeCompare(a.filed)).slice(0, MAX_ROWS);
    return { trades };
  });
  return json(data, 200, 3600);
}, "Insider trades");
