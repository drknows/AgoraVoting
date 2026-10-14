/* /api/reports — prices readers paid, for the Best Price card (public/pharma/bestprice.js).
   GET  ?drug=&zip=  -> {drug, zip3, count, near: [row], nationalLow: [row]}
        row = {pharmacy, strength, method, coupon, qty, price, unit, zip3, created}
        near: same 3-digit ZIP prefix, lowest price per unit first. nationalLow: lowest per unit anywhere.
   POST {drug, strength, qty, price, pharmacy, method, coupon, zip, device} -> {ok: true}
   Only the first 3 digits of the ZIP are stored. Storage: list "rep:<drug slug>" (newest first, capped). */
import { json, fail, query, body, route, clean, DEVICE_RE } from "./_lib/http.js";
import { cmd, many, allow } from "./_lib/store.js";
import { rude, hid, ipOf } from "./polls.js";

export const MAX_REPORTS = 500;   // newest reports kept per drug
const NEAR = 25, NATIONAL = 10;
export const METHODS = { cash: "Cash", coupon: "Coupon or discount card", insurance: "Private insurance", medicare: "Medicare", medicaid: "Medicaid", "mail-order": "Mail order" };

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function drugKey(raw) {
  const d = clean(raw, 100).toLowerCase();
  if (d.length < 2 || d.length > 60 || !/^[a-z0-9][a-z0-9 .,'()/+&-]*$/.test(d)) return null;
  const s = slug(d); return s.length >= 2 ? { name: d, key: "rep:" + s } : null;
}
const row = r => ({ pharmacy: r.pharmacy, strength: r.strength, method: METHODS[r.method] || r.method, coupon: r.coupon, qty: r.qty, price: r.price, unit: +(r.price / r.qty).toFixed(4), zip3: r.zip3, created: r.created });
const byUnit = (a, b) => a.price / a.qty - b.price / b.qty || (b.created > a.created ? 1 : -1);

export const GET = route(async req => {
  const p = query(req), d = drugKey(p.get("drug"));
  if (!d) return fail("Please enter a drug name (2 to 60 letters or numbers).");
  const zip = String(p.get("zip") || "").trim(), zip3 = /^\d{5}$/.test(zip) ? zip.slice(0, 3) : null;
  const all = (await cmd(["LRANGE", d.key, 0, MAX_REPORTS - 1]) || []).map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(r => r && r.qty > 0);
  all.sort(byUnit);
  return json({
    drug: d.name, zip3, count: all.length,
    near: zip3 ? all.filter(r => r.zip3 === zip3).slice(0, NEAR).map(row) : [],
    nationalLow: all.slice(0, NATIONAL).map(row),
  });
}, "Price reports");

export const POST = route(async req => {
  const b = await body(req);
  const device = String(b.device || "");
  if (!DEVICE_RE.test(device)) return fail("Please reload the page and try again.");
  const d = drugKey(b.drug);
  if (!d) return fail("Please look up a drug name first.");
  const zip = String(b.zip ?? "").trim();
  if (!/^\d{5}$/.test(zip)) return fail("Enter your 5-digit ZIP code above first.");
  const qty = Number(b.qty), price = Number(b.price);
  if (!Number.isInteger(qty) || qty < 1 || qty > 1000) return fail("Quantity should be a whole number from 1 to 1,000.");
  if (!Number.isFinite(price) || price < 0 || price > 25000) return fail("Please enter the price you paid, from $0 to $25,000.");
  const pharmacy = clean(b.pharmacy, 60), strength = clean(b.strength, 40), coupon = clean(b.coupon, 40);
  if (pharmacy.length < 2) return fail("Please enter the pharmacy name.");
  const method = String(b.method || "");
  if (!METHODS[method]) return fail("Please choose how you paid.");
  if (rude(pharmacy, strength, coupon)) return fail("Please remove profanity and try again.");

  if (!await allow("price", hid(device), 10, 3600) || !await allow("price-day", hid(device), 30, 86400))
    return fail("Thanks for all your reports! Please try again later.", 429);
  const ip = ipOf(req);
  if (ip && !await allow("price-ip", ip, 100, 86400)) return fail("Too many price reports from your network today. Please try again tomorrow.", 429);

  const rec = { pharmacy, strength, method, coupon, qty, price: Math.round(price * 100) / 100, zip3: zip.slice(0, 3), created: new Date().toISOString(), by: hid(device) };
  await many([["LPUSH", d.key, JSON.stringify(rec)], ["LTRIM", d.key, 0, MAX_REPORTS - 1]]);
  return json({ ok: true });
}, "Price reports");
