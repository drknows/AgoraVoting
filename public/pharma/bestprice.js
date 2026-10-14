/* Best Price: fair-price benchmark, one-tap price checks, savings programs, and prices reported by people nearby. */
(function () {
const A = Agora, {esc, money} = A;
const S = {drug: "", zip: A.store.get("zip", ""), reports: null, err: null, bench: null};
const slug = s => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const enc = encodeURIComponent;
const CHECKERS = d => [
  ["GoodRx", "Coupons at nearby pharmacies", `https://www.goodrx.com/${slug(d)}`],
  ["SingleCare", "Discount card prices by pharmacy", `https://www.singlecare.com/prescription/${slug(d)}`],
  ["Mark Cuban Cost Plus Drugs", "Mail order, cost + 15% + fees", `https://costplusdrugs.com/medications/`],
  ["Amazon Pharmacy", "Mail order; RxPass for Prime members", `https://pharmacy.amazon.com/`],
  ["Walmart $4 generics", "Fixed-price generic list", `https://www.walmart.com/cp/4-prescriptions/1078664`],
  ["Costco Pharmacy", "Membership not required for pharmacy", `https://www.costco.com/pharmacy`],
  ["Blink Health", "Prepaid prices for pickup", `https://www.blinkhealth.com/`],
];
const HELP = [
  ["Manufacturer coupons & savings cards", "NeedyMeds lists copay cards and free-drug programs by drug", "https://www.needymeds.org/"],
  ["Patient assistance programs", "Medicine Assistance Tool, run by the drug industry group PhRMA", "https://medicineassistancetool.org/"],
  ["Medicare Extra Help", "Lowers Part D costs for people with limited income", "https://www.ssa.gov/medicare/part-d-extra-help"],
  ["State pharmacy assistance", "State programs that help pay for prescriptions", "https://www.medicare.gov/basics/costs/help/drug-costs"],
];
async function loadReports() {
  if (!S.drug) return;
  try { S.reports = await A.api(`reports?drug=${enc(S.drug.toLowerCase())}&zip=${enc(S.zip)}`); S.err = null; }
  catch (e) { S.reports = null; S.err = e.user ? e.message : "preview"; }
}
const repRows = rows => `<div class="tbl"><table><thead><tr><th>Pharmacy</th><th>Paid with</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Area</th><th>Reported</th></tr></thead><tbody>
  ${rows.map(r => `<tr><td class="strong">${esc(r.pharmacy)}<span class="tsub">${esc(r.strength || "")}</span></td><td>${esc(r.method)}${r.coupon ? `<span class="tsub">${esc(r.coupon)}</span>` : ""}</td><td class="r num">${r.qty}</td><td class="r num">${money(r.price)}</td><td class="r num">${esc(r.zip3)}xx</td><td class="num">${A.fmtDate(r.created)}</td></tr>`).join("")}</tbody></table></div>`;
window.AgoraBest = {
  setBench(b) { S.bench = b; },
  card() {
    const d = S.drug, b = S.bench && S.bench.drug.toLowerCase() === d.toLowerCase() ? S.bench : null;
    return `<div class="card" id="best"><div class="card-h"><div><h3>Find the best price near you</h3><div class="sub">Compare coupons, discount cards, mail-order pharmacies and savings programs</div></div></div>
    <div class="card-b"><form id="bestForm" class="calc">
      <div class="field" style="grid-column:span 2"><label for="bestDrug">Drug name</label><input class="input" id="bestDrug" value="${esc(d)}" placeholder="e.g. atorvastatin, Eliquis, Flonase" maxlength="60" required></div>
      <div class="field"><label for="bestZip">ZIP code</label><input class="input num" id="bestZip" value="${esc(S.zip)}" inputmode="numeric" pattern="[0-9]{5}" maxlength="5" placeholder="94110"></div>
      <div><button class="btn" type="submit">Find prices</button></div></form></div>
    ${d ? `<div class="card-b" style="border-top:1px solid var(--line)">
      ${b ? `<div class="notice brass"><span class="bar"></span><div><b>Fair-price benchmark for ${esc(b.label)}:</b> about <b class="num">${money(b.price)}</b>. That's what pharmacies pay plus 15% and a $5 fee. If a coupon or quote is far above this, keep looking.</div></div>` : `<p class="src">Look the drug up above to see a fair-price benchmark from what pharmacies actually pay.</p>`}
      <div class="sec-h">Check prices</div>
      <div class="co-row">${CHECKERS(d).map(([n, s, u]) => `<a class="card co-link" href="${u}" target="_blank" rel="noopener"><span class="n">${n} ↗</span><span class="s">${s}</span></a>`).join("")}
        ${/^\d{5}$/.test(S.zip) ? `<a class="card co-link" href="https://www.google.com/maps/search/pharmacy+near+${S.zip}" target="_blank" rel="noopener"><span class="n">Pharmacies near ${S.zip} ↗</span><span class="s">Call to ask the cash price</span></a>` : ""}</div>
      <div class="sec-h">Coupons, assistance and insurance rules</div>
      <div class="co-row">${HELP.map(([n, s, u]) => `<a class="card co-link" href="${u}" target="_blank" rel="noopener"><span class="n">${n} ↗</span><span class="s">${s}</span></a>`).join("")}</div>
      <div class="notice"><span class="bar"></span><div><b>Know the rules.</b> On Medicare Part D in 2026, yearly out-of-pocket drug costs are capped at $2,100 and insulin at $35 a month. Manufacturer copay coupons usually can't be used with Medicare or Medicaid. Discount cards replace insurance for that fill, so the amount won't count toward your deductible unless your plan says so. Ask the pharmacist to compare your copay with the cash and coupon price.</div></div>
      <div class="sec-h">Prices people paid${S.reports?.zip3 ? ` near ${esc(S.reports.zip3)}xx` : ""}</div>
      ${S.err === "preview" ? `<p class="skel">Community prices appear on the live site.</p>` : !S.reports ? `<p class="skel">Loading…</p>` :
        S.reports.near.length ? repRows(S.reports.near) : S.reports.nationalLow.length ? `<p class="skel">No reports in your area yet. Lowest prices reported nationwide:</p>${repRows(S.reports.nationalLow)}` : `<p class="skel">No one has reported a price for ${esc(d)} yet. Be the first.</p>`}
      <details style="margin-top:6px"><summary class="strong" style="cursor:pointer">Report what you paid</summary>
        <form id="repForm" class="card-b" style="padding:12px 0 0"><div class="form-row">
          <div class="field"><label for="rStrength">Strength &amp; form</label><input class="input" id="rStrength" placeholder="40 mg tablet" maxlength="40"></div>
          <div class="field"><label for="rQty">Quantity</label><input class="input num" id="rQty" type="number" min="1" max="1000" value="30" required></div>
          <div class="field"><label for="rPrice">You paid ($)</label><input class="input num" id="rPrice" type="number" min="0" step="0.01" required></div>
          <div class="field"><label for="rPharm">Pharmacy</label><input class="input" id="rPharm" placeholder="e.g. Costco, CVS, Cost Plus" maxlength="60" required></div>
          <div class="field"><label for="rMethod">Paid with</label><select class="input" id="rMethod"><option value="cash">Cash, no discount</option><option value="coupon">Coupon or discount card</option><option value="insurance">Private insurance copay</option><option value="medicare">Medicare copay</option><option value="medicaid">Medicaid copay</option><option value="mail-order">Mail order</option></select></div>
          <div class="field"><label for="rCoupon">Coupon used (optional)</label><input class="input" id="rCoupon" placeholder="e.g. GoodRx" maxlength="40"></div>
        </div><p class="src">We store only the first 3 digits of your ZIP code. Don't include your name or medical details.</p><div><button class="btn" type="submit">Share my price</button></div></form></details>
    </div>` : ""}</div>`;
  },
  async find(drug, zip, rerender) {
    S.drug = drug; if (/^\d{5}$/.test(zip)) { S.zip = zip; A.store.set("zip", zip); }
    S.reports = null; rerender(); await loadReports(); rerender();
  },
  async report(f, rerender) {
    const v = id => f.querySelector("#" + id).value.trim();
    if (!/^\d{5}$/.test(S.zip)) return A.toast("Enter your ZIP code above first");
    try {
      await A.api("reports", {drug: S.drug, strength: v("rStrength"), qty: +v("rQty"), price: +v("rPrice"), pharmacy: v("rPharm"), method: v("rMethod"), coupon: v("rCoupon"), zip: S.zip});
      A.toast("Thanks. Your price helps your neighbors."); await loadReports(); rerender();
    } catch (e) { A.toast(e.user ? e.message : "Price reports work on the live site"); }
  },
};
})();
