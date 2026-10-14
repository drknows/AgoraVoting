/* Drug search: brand vs generic prices by year against inflation, cash and Medicare costs, world estimate,
   cost to make, marketing, and funding. Data from /api/drug (NADAC, Medicare Part D, FDA, Open Payments). */
(function () {
const A = Agora, {esc, money, pct, big} = A;
const S = {q: "", data: null, err: null, loading: false, pair: 0};
const RAND_BRAND = 4.22, RAND_GENERIC = 0.67;
const UNIT = {EA: "tablet or capsule", ML: "mL", GM: "gram"};
const fmtUnit = v => v == null ? "—" : v >= 100 ? money(v, 0) : v >= 1 ? money(v) : "$" + v.toFixed(v < 0.1 ? 4 : 3);
const cash = (perUnit, qty) => perUnit * qty * 1.15 + 5;   // published Cost Plus-style formula: cost + 15% + $5 fee
const yrs = Object.keys(CPI_Y).map(Number);
const infl = y => CPI_Y[y - 1] ? (CPI_Y[y] / CPI_Y[y - 1] - 1) * 100 : null;

/* Normalize "CALCIUM 40 MG TAB" and "40 MG TABLET" to the same key: strength + form */
const SALTS = /\b(CALCIUM|SODIUM|POTASSIUM|MAGNESIUM|HCL|HYDROCHLORIDE|HBR|MESYLATE|MALEATE|BESYLATE|TARTRATE|SUCCINATE|CITRATE|SULFATE|PHOSPHATE|ACETATE|FUMARATE|BROMIDE|DIHYDRATE|MONOHYDRATE|ER\b(?=.*ER))\b/g;
const FORMS = [[/\bTABS?\b|\bTABLETS?\b/, "TABLET"], [/\bCAPS?\b|\bCAPSULES?\b/, "CAPSULE"], [/\bSOLN?\b|\bSOLUTION\b/, "SOLUTION"], [/\bSUSP\b|\bSUSPENSION\b/, "SUSPENSION"], [/\bINJ\b|\bINJECTION\b/, "INJECTION"], [/\bCRM\b|\bCREAM\b/, "CREAM"], [/\bOINT\b|\bOINTMENT\b/, "OINTMENT"]];
function norm(t) {
  let x = " " + t.toUpperCase().replace(SALTS, " ") + " ";
  FORMS.forEach(([re, f]) => { x = x.replace(new RegExp(re.source, "g"), f); });
  return x.replace(/(\d)\s*(MG|MCG|ML|G|%)\b/g, "$1 $2").replace(/\s+/g, " ").trim();
}
/* Pair generic and brand descriptions that share a strength and form, e.g. "40 MG TABLET" */
function pairs(d) {
  const ing = d.ingredients.length === 1 ? d.ingredients[0].toUpperCase() : d.ingredient.split(" / ")[0].toUpperCase();
  const brands = d.brands.map(b => b.toUpperCase());
  const rows = Object.entries(d.prices).map(([desc, o]) => {
    const nm = [ing, ...brands].find(n => desc.startsWith(n + " ") || desc === n) || "";
    return {desc, name: nm, suffix: norm(desc.slice(nm.length)), type: o.cls === "B" || brands.includes(nm) ? "Brand" : "Generic", ...o};
  }).filter(r => Object.keys(r.prices).length);
  const keys = [...new Set(rows.map(r => r.suffix))];
  const out = keys.map(k => {
    const g = rows.filter(r => r.suffix === k && r.type === "Generic").sort((a, b) => Object.keys(b.prices).length - Object.keys(a.prices).length)[0];
    const b = rows.filter(r => r.suffix === k && r.type === "Brand").sort((a, b2) => Object.keys(b2.prices).length - Object.keys(a.prices).length)[0];
    return {suffix: k || "(single form)", g, b, years: new Set([...Object.keys(g?.prices || {}), ...Object.keys(b?.prices || {})]).size, both: !!(g && b)};
  });
  return out.sort((a, b) => (b.both - a.both) || (b.years - a.years)).slice(0, 12);
}
function chart(p) {
  const series = [], first = s => { const y = Object.keys(s.prices).map(Number).sort()[0]; return [y, s.prices[y]]; };
  const track = s => { const [y0, v0] = first(s); return yrs.filter(y => y >= y0).map(y => [y, v0 * CPI_Y[y] / CPI_Y[y0]]); };
  const pts = s => Object.entries(s.prices).map(([y, v]) => [+y, v]).sort((a, b) => a[0] - b[0]);
  if (p.b) { series.push({color: "var(--s-otc)", pts: pts(p.b)}); series.push({color: "var(--s-otc)", pts: track(p.b), dash: "5 4"}); }
  if (p.g) { series.push({color: "var(--s-gen)", pts: pts(p.g)}); series.push({color: "var(--s-gen)", pts: track(p.g), dash: "5 4"}); }
  if (!series.some(s => s.pts.length > 1)) return "";
  return A.legend([...(p.b ? [["var(--s-otc)", "Brand: actual"], ["var(--s-otc)", "Brand: if it tracked inflation (dashed)"]] : []), ...(p.g ? [["var(--s-gen)", "Generic: actual"], ["var(--s-gen)", "Generic: if it tracked inflation (dashed)"]] : [])]) +
    `<div class="chart-wrap">${A.yearChart(series, {label: "Price per unit by year vs inflation", fmt: v => v >= 10 ? "$" + v.toFixed(0) : "$" + v.toFixed(2), ymin: 0, xstep: 2, x0: 2013, x1: 2026})}</div>`;
}
function table(p) {
  const base = s => { if (!s) return null; const y = Object.keys(s.prices).map(Number).sort()[0]; return {y, v: s.prices[y]}; };
  const gb = base(p.g), bb = base(p.b);
  return `<div class="tbl"><table><thead><tr><th>Year</th><th class="r">Inflation</th>${p.b ? `<th class="r">Brand</th><th class="r">Brand at inflation</th>` : ""}${p.g ? `<th class="r">Generic</th><th class="r">Generic at inflation</th>` : ""}</tr></thead><tbody>
    ${yrs.filter(y => p.b?.prices[y] || p.g?.prices[y]).map(y => {
      const cell = (s, b0) => { const v = s?.prices[y]; if (!s) return ""; const exp = b0 && y >= b0.y ? b0.v * CPI_Y[y] / CPI_Y[b0.y] : null; const gap = v && exp ? (v / exp - 1) * 100 : null;
        return `<td class="r num">${fmtUnit(v)}</td><td class="r num">${exp ? fmtUnit(exp) : "—"}${gap != null && Math.abs(gap) >= 1 ? `<span class="tsub ${gap > 0 ? "down" : "up"}">${gap > 0 ? "+" : ""}${gap.toFixed(0)}% vs inflation</span>` : ""}</td>`; };
      const r = infl(y);
      return `<tr><td class="num strong">${y}${y === 2026 ? "*" : ""}</td><td class="r num">${r == null ? "—" : pct(r)}</td>${cell(p.b, bb)}${cell(p.g, gb)}</tr>`; }).join("")}
  </tbody></table></div>`;
}
function result() {
  const d = S.data, ing = d.ingredient, lower = ing.toLowerCase();
  const P = pairs(d), p = P[Math.min(S.pair, P.length - 1)];
  const unit = p ? UNIT[(p.g || p.b).unit] || (p.g || p.b).unit : "";
  const qty = p && (p.g || p.b).unit === "EA" ? 30 : 1;
  const lastOf = s => { if (!s) return null; const y = Object.keys(s.prices).map(Number).sort().pop(); return {y, v: s.prices[y]}; };
  const gl = lastOf(p?.g), bl = lastOf(p?.b);
  const otc = p && (p.g?.otc || p.b?.otc);
  const ap = d.approvals || {};
  const make = MAKE.find(m => m.match.some(x => lower.includes(x)));
  const ads = ADS.filter(a => d.brands.some(b => b.toLowerCase() === a[0].toLowerCase()) || lower.includes(a[2]));
  const fund = FUNDING.filter(f => f.match.some(x => lower.includes(x)));
  const med = (d.medicare || []).map(m => { const ys = Object.keys(m.years).sort(); const ly = ys[ys.length - 1]; return {...m, ly, last: m.years[ly], firstY: ys[0], first: m.years[ys[0]]}; }).filter(m => m.last).sort((a, b) => (b.last.spend || 0) - (a.last.spend || 0)).slice(0, 8);

  const bp = gl || bl; if (bp) AgoraBest.setBench({drug: ing.split(" / ")[0], label: `${gl ? "generic " : ""}${esc(p.suffix.toLowerCase())}, ${qty === 30 ? "30 " + unit + "s" : "1 " + unit}`, price: cash(bp.v, qty)});
  return `<div class="card"><div class="card-h"><div><h3 style="font-size:1.15rem">${esc(ing)}</h3><div class="sub">${d.brands.length ? "Brand names: " + d.brands.map(esc).join(", ") : "No current brand name in RxNorm"}${otc ? " · Sold over the counter" : ""}</div></div><div class="right"><span class="live">Live data</span></div></div>
    <div class="card-b"><div class="grid-tight">
      <div class="stat"><div class="l">First FDA approval</div><div class="v" style="font-size:1rem">${ap.brand ? A.fmtDate(ap.brand.date) : "Before FDA records"}</div><div class="s">${ap.brand ? esc(ap.brand.name || ap.brand.sponsor) : ""}</div></div>
      <div class="stat"><div class="l">First generic</div><div class="v" style="font-size:1rem">${ap.generic ? A.fmtDate(ap.generic.date) : "None approved"}</div><div class="s">${ap.generics ? ap.generics + " generic approvals" : ""}</div></div>
      ${gl ? `<div class="stat"><div class="l">Generic cash price, est.</div><div class="v up">${money(cash(gl.v, qty))}</div><div class="s">${qty === 30 ? "30 " + unit + "s" : "per " + unit}, ${gl.y}</div></div>` : ""}
      ${bl ? `<div class="stat"><div class="l">Brand cash price, est.</div><div class="v down">${money(cash(bl.v, qty))}</div><div class="s">${qty === 30 ? "30 " + unit + "s" : "per " + unit}, ${bl.y}</div></div>` : ""}
      ${gl && bl ? `<div class="stat"><div class="l">Brand ÷ generic</div><div class="v">${(bl.v / gl.v).toFixed(1)}×</div><div class="s">same strength</div></div>` : ""}
    </div>
    <div><a class="btn sm" href="#save" data-best="${esc(ing.split(" / ")[0])}">Find the best price near you →</a></div>
    <p class="src">Cash estimates use the pharmacy's acquisition cost (NADAC) plus 15% plus a $5 fee, the formula Mark Cuban Cost Plus Drugs publishes. Retail pharmacy cash prices are often higher; discount cards vary.</p></div></div>

  ${P.length ? `<div class="card"><div class="card-h"><div><h3>Price by year vs. inflation</h3><div class="sub">What pharmacies pay per ${esc(unit)} (NADAC), last weeks of each year, beside what the ${d.brands.length ? "brand and generic" : "drug"} would cost if prices had only risen with inflation since ${esc(String(Math.min(...[p.b, p.g].filter(Boolean).map(s => Math.min(...Object.keys(s.prices).map(Number))))))}</div></div>
      <div class="right"><select class="input" id="pairSel" aria-label="Strength and form" style="width:auto;max-width:100%">${P.map((x, i) => `<option value="${i}" ${i === S.pair ? "selected" : ""}>${esc(x.suffix)}${x.both ? "" : x.b ? " (brand only)" : " (generic only)"}</option>`).join("")}</select></div></div>
    <div class="card-b">${chart(p)}${table(p)}<p class="src">* 2026 compares with the August 2026 CPI. Drug-by-drug prices begin in 2013, when Medicaid started publishing NADAC; for 1950 onward, see the prescription drug price index below. Sources: <a href="https://data.medicaid.gov/dataset/fbb83258-11c7-47f5-8b18-5f8e79f7e704" target="_blank" rel="noopener">CMS NADAC</a>; BLS CPI-U.</p></div></div>` :
  `<div class="notice"><span class="bar"></span><div><b>No pharmacy price history found.</b> NADAC covers retail outpatient drugs. Drugs given in hospitals or clinics, and some specialty drugs, aren't included.</div></div>`}

  <div class="grid">
    <div class="card"><div class="card-h"><div><h3>What insurance pays: Medicare</h3><div class="sub">Average Medicare Part D cost per prescription, plan and patient combined</div></div></div>
      ${med.length ? `<div class="tbl"><table><thead><tr><th>Product</th><th class="r">Per prescription</th><th class="r">Change</th><th class="r">Medicare spending</th></tr></thead><tbody>${med.map(m => `<tr><td><span class="strong">${esc(m.brand)}</span><span class="tsub">${m.type} · ${m.last.benes ? m.last.benes.toLocaleString() + " patients" : ""}</span></td><td class="r num">${money(m.last.perClaim)}<span class="tsub">${m.ly}</span></td><td class="r num ${m.last.perClaim > m.first.perClaim ? "down" : "up"}">${m.firstY !== m.ly ? pct((m.last.perClaim / m.first.perClaim - 1) * 100) : "—"}<span class="tsub">since ${m.firstY}</span></td><td class="r num">${m.last.spend ? big(m.last.spend) : "—"}</td></tr>`).join("")}</tbody></table></div>` : `<div class="card-b"><p class="skel">Not in Medicare Part D data (it may be OTC, hospital-administered or newly approved).</p></div>`}
      <div class="card-f">Before rebates, which Medicare doesn't publish by drug. Private-insurance and out-of-pocket costs by drug come from the federal Medical Expenditure Panel Survey and will be added in a later release. Source: <a href="https://data.cms.gov/summary-statistics-on-use-and-payments/medicare-medicaid-spending-by-drug/medicare-part-d-spending-by-drug" target="_blank" rel="noopener">CMS Medicare Part D Spending by Drug</a>.</div></div>
    <div class="card"><div class="card-h"><div><h3>U.S. vs. other countries</h3><div class="sub">Estimated typical price in 33 wealthy countries for the same amount</div></div></div>
      <div class="card-b">${bl ? A.hbars([["U.S. brand", cash(bl.v, qty), "var(--s-otc)", money(cash(bl.v, qty))], ["Other countries, est.", cash(bl.v, qty) / RAND_BRAND, "var(--s-cpi)", money(cash(bl.v, qty) / RAND_BRAND)]], cash(bl.v, qty)) : ""}
        ${gl ? A.hbars([["U.S. generic", cash(gl.v, qty), "var(--s-gen)", money(cash(gl.v, qty))], ["Other countries, est.", cash(gl.v, qty) / RAND_GENERIC, "var(--s-cpi)", money(cash(gl.v, qty) / RAND_GENERIC)]], Math.max(cash(gl.v, qty) / RAND_GENERIC, cash(gl.v, qty))) : ""}
        ${!bl && !gl ? `<p class="skel">Needs a U.S. price to estimate.</p>` : ""}
        <p class="src">An estimate, not a quoted foreign price: it applies RAND's averages (U.S. brand-name prices are 4.22× other countries'; U.S. generics are 0.67×). See <a href="#world">U.S. vs. World</a>.</p></div></div>
  </div>

  <div class="grid">
    <div class="card"><div class="card-h"><div><h3>Cost to make</h3><div class="sub">Published estimates of production cost, including a modest profit</div></div></div>
      <div class="card-b">${make ? `<div class="grid-tight"><div class="stat"><div class="l">${esc(make.cls)}</div><div class="v up">${make.low === make.high ? money(make.low) : money(make.low) + "–" + money(make.high)}</div><div class="s">per ${make.per}</div></div></div><p class="src">${esc(make.note)} Sources: ${make.src.map(k => A.src(MAKE_SRC[k])).join("; ")}.</p>`
        : `<p class="skel">No published production-cost estimate for this drug yet.${gl ? ` For a generic with many makers, the pharmacy cost (${fmtUnit(gl.v)} per ${esc(unit)}) is close to the cost of making it plus a small margin.` : ""}</p>`}</div></div>
    <div class="card"><div class="card-h"><div><h3>Marketing</h3><div class="sub">Payments to doctors and national TV advertising</div></div></div>
      <div class="card-b">${(d.payments || []).length ? `<div class="grid-tight">${d.payments.map(x => `<div class="stat"><div class="l">${esc(x.brand)}: payments to doctors, ${x.year}</div><div class="v">${big(x.total)}</div><div class="s">${x.payments.toLocaleString()} payments: meals, speaking, consulting, travel</div></div>`).join("")}</div>` : `<p class="skel">No 2024 Open Payments records matched this drug's brand names.</p>`}
        ${ads.length ? `<div class="grid-tight">${ads.map(a => `<div class="stat"><div class="l">${esc(a[0])}: national TV ads, 2025</div><div class="v down">$${a[3]}M</div><div class="s">${esc(a[1])}</div></div>`).join("")}</div>` : ""}
        <p class="src">Sources: <a href="https://openpaymentsdata.cms.gov/" target="_blank" rel="noopener">CMS Open Payments</a>${ads.length ? "; " + A.src(ADS_SRC) : ""}. See the <a href="#marketing">Marketing</a> tab for the top advertisers.</p></div></div>
  </div>

  <div class="card"><div class="card-h"><div><h3>Who paid to develop it</h3><div class="sub">Government research grants and documented private funding</div></div><div class="right"><button class="btn sm" data-nih-drug="${esc(ing.split(" / ")[0])}">Search NIH grants</button></div></div>
    <div class="card-b"><div id="drugNih"></div>${fund.length ? fund.map(f => `<div class="stat"><div class="l">${f.kind} funding · ${esc(f.drug)}</div><div class="v">${f.amount ? big(f.amount) : "Documented"}</div><div class="s">${esc(f.what)} ${A.src(f.src)}</div></div>`).join("") : ""}</div></div>`;
}
window.AgoraDrug = {
  card() {
    return `<div class="card" id="drugSearch"><div class="card-h"><div><h3>Look up a drug</h3><div class="sub">Brand-name, generic and over-the-counter. Prices by year against inflation, cash and Medicare costs, cost to make, marketing and funding.</div></div></div>
      <div class="card-b"><form id="drugForm" class="calc"><div class="field" style="grid-column:span 2"><label for="drugQ">Drug name</label><input class="input" id="drugQ" placeholder="e.g. Lipitor, atorvastatin, Eliquis, ibuprofen" value="${esc(S.q)}" maxlength="60" autocomplete="off" required></div><div><button class="btn" type="submit">Look up</button></div></form>
      <p class="src">Try ${["Lipitor", "Eliquis", "metformin", "Ozempic", "Humira", "Claritin"].map(x => `<button class="link-btn" data-drug="${x}">${x}</button>`).join(" · ")}</p></div></div>
      <div id="drugOut">${S.loading ? `<p class="skel">Gathering pharmacy prices since 2013, Medicare costs and FDA records for “${esc(S.q)}”. The first lookup of a drug can take 20 to 30 seconds.</p>` : S.err ? `<div class="notice"><span class="bar"></span><div>${S.err}</div></div>` : S.data ? result() : ""}</div>`;
  },
  async run(q, rerender) {
    S.q = q; S.loading = true; S.err = null; S.data = null; S.pair = 0; rerender();
    try {
      const d = await A.api("drug?q=" + encodeURIComponent(q));
      if (d.notFound) S.err = `No drug found for “${esc(q)}”. Check the spelling or try the generic name.`; else S.data = d;
    } catch (e) {
      S.err = e.user ? esc(e.message) : "Drug lookup runs on the live site at AgoraSocietyStands.com. This preview can't reach the government data sources.";
    }
    S.loading = false; rerender();
  },
  setPair(i, rerender) { S.pair = i; rerender(); },
};
})();
