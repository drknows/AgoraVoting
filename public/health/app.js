/* Agora Health: what Americans pay for health coverage, and who profits. */
(function () {
const A = Agora, {esc, pct, src, money, big, publicBadge: badge} = A, S = k => src(H_SRC[k]);
const TABS = [["spending","Health Spending"],["medtax","Medicare Taxes"],["plans","Premiums & Plans"],["types","Plan Types"],["denials","Denials & Appeals"],["ma","Medicare Advantage"],["rates","Reimbursement Rates"],["estimator","Rate Estimator"],["insurers","Insurers"],["polls","Polls"]];
A.chrome({product: "Health", tabs: TABS, active: "spending"});
const P = {};

P.spending = () => A.hero("Agora Health · Where the money goes", "$5.3 trillion a year, and who pays it", "Americans spend nearly twice as much per person on health care as people in other wealthy countries. Here is where the money comes from and where it goes.",
  [`${H_NHE24.gdp}% of GDP`, `$${H_WORLD.us.toLocaleString()} per person`, `Peers: $${H_WORLD.peers.toLocaleString()}`]) +
  `<div class="content">${A.installCard()}
  <div class="grid">
    <div class="card"><div class="card-h"><div><h3>Per person, 2024</h3><div class="sub">Health consumption spending</div></div><div class="right">${badge}</div></div>
      <div class="card-b">${A.hbars([["United States", H_WORLD.us, "var(--s-otc)", "$" + H_WORLD.us.toLocaleString()], ["Comparable countries", H_WORLD.peers, "var(--s-gen)", "$" + H_WORLD.peers.toLocaleString()]], H_WORLD.us)}
      <div class="grid-tight"><div class="stat"><div class="l">U.S. share of GDP</div><div class="v">${H_WORLD.usGdp}%</div></div><div class="stat"><div class="l">Peers' share of GDP</div><div class="v">${H_WORLD.peersGdp}%</div></div><div class="stat"><div class="l">U.S. ÷ peers</div><div class="v down">${(H_WORLD.us / H_WORLD.peers).toFixed(2)}×</div></div></div>
      <p class="src">Comparable countries are wealthy OECD nations. Source: ${S("world")}</p></div></div>
    <div class="card"><div class="card-h"><div><h3>Who pays, 2024</h3><div class="sub">$ billions, national health expenditures</div></div><div class="right">${badge}</div></div>
      <div class="card-b">${A.hbars([["Private insurance", H_NHE24.private, "var(--s-gen)", "$1,600"], ["Medicare", H_NHE24.medicare, "var(--s-rx)", "$1,100"], ["Medicaid", H_NHE24.medicaid, "var(--s-cpi)", "$931.7"], ["Out of pocket", H_NHE24.oop, "var(--s-otc)", "$556.6"]], 1600)}
      <p class="src">Total $5.3 trillion, up 7.2%. Source: ${S("nhe24")}</p></div></div>
  </div>
  <div class="card"><div class="card-h"><div><h3>What it buys, 2024</h3><div class="sub">$ billions</div></div><div class="right">${badge}</div></div>
    <div class="card-b">${A.hbars([["Hospital care", 1600, "var(--s-rx)", "$1,600"], ["Physician & clinical services", 1100, "var(--s-cpi)", "$1,100"], ["Retail prescription drugs", 467, "var(--s-otc)", "$467"]], 1600)}
    <p class="src">Drug spending is covered in depth on <a href="/pharma/#share">Agora Pharma</a>. Source: ${S("nhe24")}</p></div></div>
  <div class="sec-h">Also driving the bill</div>
  <div class="grid">
    <div class="card"><div class="card-h"><div><h3>Hospital prices</h3><div class="sub">What employer plans pay vs. Medicare, 2022</div></div><div class="right">${badge}</div></div>
      <div class="card-b"><div class="grid-tight"><div class="stat"><div class="l">Private plans pay</div><div class="v down">${H_MORE.hospital}%</div><div class="s">of Medicare's price for the same hospital care</div></div></div><p class="src">Hospitals say Medicare pays less than their costs. Source: ${S("rand")}</p></div></div>
    <div class="card"><div class="card-h"><div><h3>Medical debt</h3><div class="sub">Adults owing more than $250</div></div><div class="right">${badge}</div></div>
      <div class="card-b"><div class="grid-tight"><div class="stat"><div class="l">People</div><div class="v">${H_MORE.debtPeople}M</div><div class="s">about 1 in 12 adults</div></div><div class="stat"><div class="l">Owed</div><div class="v down">$${H_MORE.debtTotal}B+</div></div><div class="stat"><div class="l">Owe over $10,000</div><div class="v">${H_MORE.debtOver10k}M</div></div></div><p class="src">Balances as of December 2021, the latest Census data. Source: ${S("debt")}</p></div></div>
    <div class="card"><div class="card-h"><div><h3>ACA premiums, 2026</h3><div class="sub">Individual Marketplace plans</div></div><div class="right">${badge}</div></div>
      <div class="card-b"><div class="grid-tight"><div class="stat"><div class="l">Insurers' price increase</div><div class="v down">+${H_MORE.acaPremRise}%</div></div><div class="stat"><div class="l">What subsidized enrollees pay</div><div class="v down">+${H_MORE.acaPayRise}%</div><div class="s">KFF estimate after enhanced tax credits expired</div></div></div><p class="src">Source: ${S("aca26")}. Compare plans in your ZIP on <a href="#plans">Premiums &amp; Plans</a>.</p></div></div>
  </div></div>`;

const tx = {wages: 60000, status: "single", self: false, fit: 4500};
function medTax() {
  const w = +tx.wages || 0, th = H_TAX.thresh[tx.status], base = tx.self ? w * 0.9235 : w;
  const you = (tx.self ? base * H_TAX.rate * 2 : w * H_TAX.rate) + Math.max(0, base - th) * H_TAX.addl;
  const employer = tx.self ? 0 : w * H_TAX.rate;
  const genShare = (H_MCR.bGeneral + H_MCR.dGeneral) / H_MCR.outlays, general = (+tx.fit || 0) * genShare;
  return {you, employer, general, genShare, total: you + employer + general};
}
P.medtax = () => {
  const r = medTax(), genB = H_MCR.bGeneral + H_MCR.dGeneral;
  const partBPrem = H_MCR.bSpend - H_MCR.bGeneral;
  const srcs = [["Payroll taxes (Part A)", H_MCR.hiPayroll, "var(--s-rx)"], ["Federal general revenue (Parts B & D)", genB, "var(--s-cpi)"], ["Beneficiary premiums (B & D), approx.", partBPrem + H_MCR.dPremiums, "var(--s-gen)"], ["Interest, benefit taxes & other (Part A)", H_MCR.hiOther, "var(--muted)"], ["State payments (Part D)", H_MCR.dStates, "var(--s-otc)"]];
  const examples = [30000, 60000, 100000, 250000, 1000000].map(w => [w, w * H_TAX.rate + Math.max(0, w - 200000) * H_TAX.addl, w * H_TAX.rate]);
  return A.hero("Agora Health · Medicare taxes", "What you pay into Medicare", "Medicare is funded by a payroll tax on every paycheck, by federal general revenue (mostly income taxes, plus borrowing), and by premiums from people on Medicare. See your own share and the national totals.",
    [`2025 Medicare income: $${H_MCR.income.toLocaleString()}B`, `≈ ${money(H_MCR.income * 1e9 / 341e6, 0)} per U.S. resident`, `Part A trust fund runs short in ${H_MCR.hiDepletion}`]) +
  `<div class="content">
  <div class="card"><div class="card-h"><div><h3>Your Medicare taxes</h3><div class="sub">Estimate for one year</div></div></div>
    <div class="card-b"><div class="calc">
      <div class="field"><label for="txW">Wages or self-employment earnings ($)</label><input class="input num" id="txW" type="number" min="0" step="1000" value="${tx.wages}"></div>
      <div class="field"><label for="txF">Federal income tax you paid ($)</label><input class="input num" id="txF" type="number" min="0" step="100" value="${tx.fit}"></div>
      <div class="field"><label for="txS">Filing status</label><select class="input" id="txS"><option value="single" ${tx.status === "single" ? "selected" : ""}>Single or head of household</option><option value="joint" ${tx.status === "joint" ? "selected" : ""}>Married filing jointly</option></select></div>
      <label class="chk" for="txSE"><input type="checkbox" id="txSE" ${tx.self ? "checked" : ""}> Self-employed</label></div>
    <div class="calc-out">
      <div class="stat"><div class="l">Medicare payroll tax you pay</div><div class="v">${money(r.you)}</div><div class="s">${tx.self ? "2.9% on 92.35% of earnings" : "1.45% of wages"}${(tx.self ? (+tx.wages * 0.9235) : +tx.wages) > H_TAX.thresh[tx.status] ? " + 0.9% above " + money(H_TAX.thresh[tx.status], 0) : ""}</div></div>
      ${tx.self ? "" : `<div class="stat"><div class="l">Your employer pays</div><div class="v">${money(r.employer)}</div><div class="s">1.45% of your wages</div></div>`}
      <div class="stat"><div class="l">Share of your income tax, est.</div><div class="v">${money(r.general)}</div><div class="s">${(r.genShare * 100).toFixed(1)}¢ of each federal dollar spent</div></div>
      <div class="stat"><div class="l">Total toward Medicare</div><div class="v down">${money(r.total)}</div><div class="s">per year</div></div>
    </div>
    <p class="src">The income-tax share is an estimate: Medicare's general revenue ($${genB.toFixed(0)}B in 2025) divided by total federal spending (about $7 trillion in fiscal 2025, of which $1.8 trillion was borrowed), applied to the income tax you entered. The 0.9% Additional Medicare Tax applies to wages above $200,000 (single) or $250,000 (married filing jointly). Sources: ${S("mcrFin")}; ${S("cbo")}.</p></div></div>

  <div class="card"><div class="card-h"><div><h3>Payroll tax at different incomes</h3><div class="sub">Single filer, wages only. There is no cap: every dollar of wages is taxed.</div></div><div class="right">${badge}</div></div>
    <div class="tbl"><table><thead><tr><th class="r">Wages</th><th class="r">You pay</th><th class="r">Employer pays</th><th class="r">Combined</th><th class="r">Per month</th></tr></thead><tbody>
    ${examples.map(([w, y, e]) => `<tr><td class="r num">${money(w, 0)}</td><td class="r num">${money(y, 0)}</td><td class="r num">${money(e, 0)}</td><td class="r num strong">${money(y + e, 0)}</td><td class="r num">${money((y + e) / 12, 0)}</td></tr>`).join("")}
    </tbody></table></div></div>

  <div class="card"><div class="card-h"><div><h3>Where Medicare's money comes from, 2025</h3><div class="sub">$ billions; total income $${H_MCR.income.toLocaleString()}B, spending $${H_MCR.spend.toLocaleString()}B</div></div><div class="right">${badge}</div></div>
    <div class="card-b">${A.hbars(srcs.map(([l, v, c]) => [l, v, c, "$" + v.toFixed(1) + "B"]), 600)}
    <div class="grid-tight"><div class="stat"><div class="l">Part B premium, 2026</div><div class="v">$${H_MCR.partB26.toFixed(2)}</div><div class="s">per month, standard</div></div><div class="stat"><div class="l">Part A trust fund</div><div class="v down">${H_MCR.hiDepletion}</div><div class="s">projected to run short</div></div></div>
    <p class="src">Part B premiums are estimated as Part B spending minus general revenue. Sources: ${S("mcrFin")}; ${S("trustees")}.</p></div></div>
  </div>`;
};

const pl = {zip: A.store.get("zip", ""), age: 40, income: 52000, data: null, err: null, loading: false};
P.plans = () => A.hero("Agora Health · Premiums & plans", "What coverage costs: premiums, deductibles and out-of-pocket limits", "Compare what employers, Marketplace insurers and Medicare plans charge, then look up every HealthCare.gov plan in your ZIP code, grouped by insurance company.",
    [`Employer family premium: $${H_EMP.family.toLocaleString()}/yr`, `2026 ACA out-of-pocket cap: $${H_LIMITS.acaSelf.toLocaleString()}`, `Part B: $${H_MCR.partB26}/mo`]) +
  `<div class="content">
  <div class="card"><div class="card-h"><div><h3>Compare insurers in your area</h3><div class="sub">Every individual Marketplace plan sold through HealthCare.gov, grouped by insurance company</div></div></div>
    <div class="card-b"><form id="plForm" class="calc">
      <div class="field"><label for="plZip">ZIP code</label><input class="input num" id="plZip" value="${esc(pl.zip)}" inputmode="numeric" maxlength="5" pattern="[0-9]{5}" required></div>
      <div class="field"><label for="plAge">Age</label><input class="input num" id="plAge" type="number" min="0" max="64" value="${pl.age}"></div>
      <div class="field"><label for="plInc">Household income ($)</label><input class="input num" id="plInc" type="number" min="0" step="1000" value="${pl.income}"></div>
      <div><button class="btn" type="submit">Compare plans</button></div></form>
    <div id="plOut">${planOut()}</div></div>
    <div class="card-f">Monthly premiums before and after the federal tax credit for one person. Deductibles and out-of-pocket maximums are in-network, individual. States that run their own marketplace (such as California and New York) aren't in this data; use your state's site. Source: ${S("marketplace")}.</div></div>

  <div class="grid">
    <div class="card"><div class="card-h"><div><h3>Job-based coverage, 2025</h3><div class="sub">Average across employers</div></div><div class="right">${badge}</div></div>
      <div class="card-b"><div class="grid-tight">
        <div class="stat"><div class="l">Family premium</div><div class="v">$${H_EMP.family.toLocaleString()}</div><div class="s">worker pays $${H_EMP.familyWorker.toLocaleString()} (${Math.round(H_EMP.familyWorker / H_EMP.family * 100)}%)</div></div>
        <div class="stat"><div class="l">Single premium</div><div class="v">$${H_EMP.single.toLocaleString()}</div><div class="s">worker pays $${H_EMP.singleWorker.toLocaleString()}</div></div>
        <div class="stat"><div class="l">Single deductible</div><div class="v">$${H_EMP.deductible.toLocaleString()}</div><div class="s">average, workers with a deductible</div></div>
        <div class="stat"><div class="l">Per month, family</div><div class="v">${money(H_EMP.family / 12, 0)}</div><div class="s">employer + worker</div></div></div>
      <p class="src">Over five years, family premiums rose ${H_EMP.growth5Premium}% while wages rose ${H_EMP.growth5Wages}% and inflation ${H_EMP.growth5Infl}%. Employer premiums by insurance company aren't published. Source: ${S("ehbs")}</p></div></div>
    <div class="card"><div class="card-h"><div><h3>Out-of-pocket limits, 2026</h3><div class="sub">The most you can be charged for covered in-network care</div></div><div class="right">${badge}</div></div>
      <div class="card-b">${A.hbars([["ACA plans, family", H_LIMITS.acaFamily, "var(--s-otc)", money(H_LIMITS.acaFamily, 0)], ["ACA plans, individual", H_LIMITS.acaSelf, "var(--s-otc)", money(H_LIMITS.acaSelf, 0)], ["Medicare Advantage, max in-network", H_LIMITS.maInNet, "var(--s-rx)", money(H_LIMITS.maInNet, 0)], ["Medicare Advantage, average", H_LIMITS.maAvg, "var(--s-rx)", money(H_LIMITS.maAvg, 0)], ["Medicare Part D drugs", H_LIMITS.partD, "var(--s-gen)", money(H_LIMITS.partD, 0)]], H_LIMITS.acaFamily)}
      <p class="src">ACA limits rose about 15% from 2025 ($${H_LIMITS.aca25Self.toLocaleString()} / $${H_LIMITS.aca25Family.toLocaleString()}). They apply to job-based and Marketplace plans. Traditional Medicare has no out-of-pocket limit without a supplemental policy. Sources: ${S("moop")}; ${S("ma26")}; ${S("partd26")}</p></div></div>
  </div>
  <div class="card"><div class="card-h"><div><h3>Medicare Advantage, 2026</h3><div class="sub">Private Medicare plans</div></div><div class="right">${badge}</div></div>
    <div class="card-b"><div class="grid-tight"><div class="stat"><div class="l">Pay no extra premium</div><div class="v">${H_LIMITS.maZeroShare}%</div><div class="s">beyond the $${H_MCR.partB26} Part B premium</div></div><div class="stat"><div class="l">Average premium, if any</div><div class="v">$${H_LIMITS.maPremPayers}</div><div class="s">per month</div></div><div class="stat"><div class="l">Average out-of-pocket limit</div><div class="v">${money(H_LIMITS.maAvg, 0)}</div><div class="s">HMO ${money(H_LIMITS.maAvgHmo, 0)} · PPO ${money(H_LIMITS.maAvgPpo, 0)}</div></div></div>
    <p class="src">Compare Medicare plans by insurer at <a href="https://www.medicare.gov/plan-compare/" target="_blank" rel="noopener">Medicare Plan Finder</a>. Source: ${S("ma26")}</p></div></div>
  </div>`;
function planOut() {
  if (pl.loading) return `<p class="skel">Loading every plan in ${esc(pl.zip)}…</p>`;
  if (pl.err) return `<p class="skel">${pl.err}</p>`;
  const d = pl.data; if (!d) return "";
  if (d.notFound) return `<p class="skel">No county found for that ZIP code.</p>`;
  if (d.stateExchange) return `<p class="skel">${esc(d.state)} runs its own marketplace, so its plans aren't in HealthCare.gov's data. Visit your state's marketplace to compare plans.</p>`;
  const r = ([lo, hi]) => lo === Infinity ? "—" : lo === hi ? money(lo, 0) : `${money(lo, 0)}–${money(hi, 0)}`;
  return `<p class="src">${d.total} plans in ${esc(d.county)}, ${esc(d.state)} for a ${d.age}-year-old${d.income ? ` with $${d.income.toLocaleString()} income` : ""}.</p>
    <div class="tbl"><table><thead><tr><th>Insurance company</th><th class="r">Plans</th><th class="r">Monthly premium</th><th class="r">Deductible</th><th class="r">Out-of-pocket max</th></tr></thead><tbody>
    ${d.issuers.map(i => `<tr><td><span class="strong">${i.url ? `<a href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.issuer)}</a>` : esc(i.issuer)}</span><span class="tsub">${i.metals.join(", ")}</span></td><td class="r num">${i.plans}</td><td class="r num">${r(i.premium)}</td><td class="r num">${r(i.deductible)}</td><td class="r num">${r(i.moop)}</td></tr>`).join("")}</tbody></table></div>
    <div class="sec-h">Lowest-premium plans</div>
    <div class="tbl"><table><thead><tr><th>Plan</th><th>Level</th><th class="r">Premium</th><th class="r">After tax credit</th><th class="r">Deductible</th><th class="r">Out-of-pocket max</th></tr></thead><tbody>
    ${d.cheapest.slice(0, 15).map(p => `<tr><td><span class="strong">${esc(p.name)}</span><span class="tsub">${esc(p.issuer)} · ${esc(p.type)}</span></td><td>${esc(p.metal)}</td><td class="r num">${money(p.premium)}</td><td class="r num">${p.withCredit != null ? money(p.withCredit) : "—"}</td><td class="r num">${p.deductible != null ? money(p.deductible, 0) : "—"}</td><td class="r num">${p.moop != null ? money(p.moop, 0) : "—"}</td></tr>`).join("")}</tbody></table></div>`;
}

const LOGK = "calllog";
function callLog() {
  const L = A.store.get(LOGK, []);
  if (!L.length) return `<div class="card-b"><p class="skel">No calls saved yet.</p></div>`;
  return `<div class="tbl"><table><thead><tr><th>When</th><th>Who</th><th>Reference</th><th>What they said · next steps</th><th></th></tr></thead><tbody>${L.map((c, i) => `<tr><td class="num" style="white-space:nowrap">${esc(c.when.replace("T", " "))}<span class="tsub">${esc(c.ins)}</span></td><td><span class="strong">${esc(c.rep)}</span><span class="tsub">ID ${esc(c.id || "—")} · ${esc(c.phone || "")} ${esc(c.email || "")}</span></td><td>${esc(c.ref || "—")}${c.written ? `<span class="tsub">Written summary promised</span>` : ""}</td><td style="font-size:.84rem">${esc(c.said)}${c.next ? `<span class="tsub">Next: ${esc(c.next)}</span>` : ""}</td><td><button class="link-btn" data-logdel="${i}">Delete</button></td></tr>`).join("")}</tbody></table></div>`;
}
const logText = () => A.store.get(LOGK, []).map(c => `${c.when.replace("T", " ")} | ${c.ins} | Rep: ${c.rep} (ID ${c.id || "n/a"}) | ${c.phone || ""} ${c.email || ""} | Ref: ${c.ref || "n/a"}${c.written ? " | Written summary promised" : ""}\nSaid: ${c.said}\nNext steps: ${c.next}`).join("\n\n");
document.addEventListener("submit", e => {
  if (e.target.id !== "logForm") return; e.preventDefault();
  const v = id => A.$("#" + id).value.trim();
  const L = A.store.get(LOGK, []); L.unshift({when: v("lgWhen"), ins: v("lgIns"), rep: v("lgRep"), id: v("lgId"), phone: v("lgPhone"), email: v("lgEmail"), ref: v("lgRef"), said: v("lgSaid"), next: v("lgNext"), written: A.$("#lgWritten").checked});
  A.store.set(LOGK, L); e.target.reset(); A.$("#logList").innerHTML = callLog(); A.toast("Call saved in this browser");
});
document.addEventListener("click", async e => {
  const d = e.target.closest("[data-logdel]"); if (d) { const L = A.store.get(LOGK, []); L.splice(+d.dataset.logdel, 1); A.store.set(LOGK, L); A.$("#logList").innerHTML = callLog(); return; }
  if (e.target.id === "logCopy") { const t = logText(); if (!t) return A.toast("No calls saved yet"); try { await navigator.clipboard.writeText(t); A.toast("Copied. Paste it into your appeal letter."); } catch (x) { A.toast("Copy isn't available here; select the table text instead"); } }
});

P.types = () => {
  const groups = [...new Set(H_TYPES.map(t => t.g))];
  return A.hero("Agora Health · Plan types", "Every kind of health coverage, explained", "HMO, PPO, EPO, high-deductible plans with an HSA, Marketplace metal levels, Medicaid, Medicare, COBRA, and the plans that look like insurance but aren't. What each one is, what it's good at, and what can go wrong.", ["Benefits and risks of each", "2026 HSA limits", "What isn't real insurance"]) +
  `<div class="content">
  <div class="notice brass"><span class="bar"></span><div><b>Before you choose, read the plan documents.</b> Check that every doctor, hospital and prescription you use is covered, and compare the <b>total yearly cost</b>: premiums plus the deductible and out-of-pocket maximum, not the premium alone. Compare plans in your area on <a href="#plans">Premiums &amp; Plans</a>.</div></div>
  <div class="card"><div class="card-h"><div><h3>Network plans at a glance</h3></div></div>
    <div class="tbl"><table><thead><tr>${H_NETWORK[0].map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${H_NETWORK.slice(1).map(r => `<tr>${r.map((c, i) => i ? `<td>${c}</td>` : `<td class="strong">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
    <div class="card-f">Any of these can be paired with a high deductible. Plans with the same label can differ a lot; the plan document decides.</div></div>
  ${groups.map(g => `<div class="sec-h">${g}</div><div class="grid">${H_TYPES.filter(t => t.g === g).map(t => `<div class="card"><div class="card-h"><div><h3>${esc(t.n)}</h3><div class="sub">${esc(t.what)}</div></div></div>
    <div class="card-b"><div><div class="l" style="font-size:.7rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--good)">Benefits</div><ul class="decisions">${t.pro.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
    <div><div class="l" style="font-size:.7rem;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--bad)">Risks</div><ul class="decisions">${t.con.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>
    <p class="src"><b>Best for:</b> ${esc(t.best)}${t.link ? ` <a href="${t.link}">Compare →</a>` : ""}</p></div></div>`).join("")}</div>`).join("")}
  <p class="src">2026 HSA and high-deductible limits: IRS Rev. Proc. 2025-19. Marketplace rules: <a href="https://www.healthcare.gov/choose-a-plan/plan-types/" target="_blank" rel="noopener">HealthCare.gov plan types</a>. General information, not insurance or tax advice.</p>
  </div>`;
};

P.denials = () => {
  const steps = (title, items, srcKey) => `<div><div class="sec-h" style="margin-bottom:8px">${title}</div><ol class="steps">${items.map(([b, t]) => `<li><span><b>${b}</b> ${t}</span></li>`).join("")}</ol><p class="src">${S(srcKey)}</p></div>`;
  const cell = v => v == null ? `<span class="tsub">Not published</span>` : v;
  return A.hero("Agora Health · Denials & appeals", "Insurers say no often. Few people appeal.", "How often each type of coverage and each major insurer denies care, why, how often patients appeal, and how often they win. Then, step by step, how to appeal under every kind of plan.",
    [`ACA plans: ${H_ACA.denied}% of claims denied`, `Fewer than 1% appealed`, `Medicare Advantage: ${H_MA.overturned}% of appeals won`]) +
  `<div class="content">
  <div class="notice brass"><span class="bar"></span><div><b>Read your insurance plan cover to cover.</b> Your plan document is the rulebook every denial and appeal is judged by: what's covered, what needs prior authorization, which drugs are on the formulary, your deductible and out-of-pocket limit, and your appeal deadlines. Ask your plan for the full document, not just the summary: the <b>Evidence of Coverage</b> (Medicare plans), the <b>Summary Plan Description</b> and plan document (job-based plans), the <b>policy or certificate of coverage</b> (Marketplace plans), or the <b>member handbook</b> (Medicaid). Read it before you need care, and again when you get a denial.</div></div>

  <div class="card"><div class="card-h"><div><h3>By type of coverage</h3><div class="sub">Latest year each source has published</div></div><div class="right">${badge}</div></div>
    <div class="tbl"><table><thead><tr><th>Coverage</th><th>Denied</th><th>Appealed</th><th>Won on appeal</th></tr></thead><tbody>
    ${H_COVER.map(c => `<tr><td><span class="strong">${esc(c.k)}</span><span class="tsub">${esc(c.note)}${c.src ? " " + S(c.src) : ""}</span></td><td>${esc(c.denied)}${c.year ? `<span class="tsub">${c.year}</span>` : ""}</td><td>${esc(c.appealed)}</td><td>${esc(c.won)}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="card-f">These measure different things: claims after care, prior-authorization requests before care, and pharmacy fills. Compare within a row, not across rows.</div></div>

  <div class="card"><div class="card-h"><div><h3>By insurance company</h3><div class="sub">Medicare Advantage prior authorization and ACA Marketplace claims</div></div><div class="right">${badge}</div></div>
    <div class="tbl"><table><thead><tr><th>Insurer</th><th class="r">Medicare Advantage denied (2024)</th><th class="r">Overturned on appeal</th><th class="r">Marketplace denied</th></tr></thead><tbody>
    ${H_INS.map(i => `<tr><td><span class="strong">${i.t ? `<a href="/company/#${i.t}" style="color:inherit">${esc(i.n)}</a>` : esc(i.n)}</span>${i.note ? `<span class="tsub">${esc(i.note)}</span>` : ""}</td>
      <td class="r num">${i.maDen != null ? `<span class="${i.maDen > H_MA.deniedPct ? "down" : "up"}">${i.maDen}%</span>` : cell(null)}</td>
      <td class="r num">${i.maWon ? `${i.maWon[0]}%<span class="tsub">${i.maWon[1]}</span>` : cell(null)}</td>
      <td class="r num">${i.aca ? `${i.aca[0]}%<span class="tsub">${i.aca[1]}</span>` : cell(null)}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="card-b">${A.hbars(H_INS.filter(i => i.maDen).sort((a, b) => b.maDen - a.maDen).map(i => [esc(i.n.split(" (")[0]), i.maDen, "var(--s-rx)", i.maDen + "%"]), 14, H_MA.deniedPct)}
    <p class="src">Medicare Advantage denial rates, 2024 (tick marks the ${H_MA.deniedPct}% average). Sources: ${S("maIns")}; ${S("ma")}; ${S("maWon22")}; ${S("aca")}; ${S("acaIns")}.</p></div>
    <div class="card-f">Insurer-level data is published only for Medicare Advantage and the ACA Marketplace. Medicaid, Part D and job-based plans don't report denials by company. The full Marketplace table for every insurer comes from CMS's Transparency in Coverage files and will be added next.</div></div>

  <div class="grid">
    <div class="card"><div class="card-h"><div><h3>Why claims are denied</h3><div class="sub">ACA Marketplace, in-network, 2024</div></div><div class="right">${badge}</div></div>
      <div class="card-b">${A.hbars(H_ACA.reasons.map(([l, v]) => [l, v, "var(--s-otc)", v + "%"]), 40)}<p class="src">"Other" means the insurer didn't give a specific reason. Source: ${S("aca")}</p></div></div>
    <div class="card"><div class="card-h"><div><h3>Appeals pay off</h3><div class="sub">Share of appealed denials reversed</div></div><div class="right">${badge}</div></div>
      <div class="card-b">${A.hbars([["Medicare Advantage", 80.7, "var(--s-gen)", "80.7%"], ["Medicare Part D", 73, "var(--s-gen)", "73%"], ["Traditional Medicare, judge hearing", 54, "var(--s-gen)", "54%"], ["Traditional Medicare, first level", 36, "var(--s-gen)", "36%"], ["ACA Marketplace, internal appeal", 34, "var(--s-gen)", "34%"]], 100)}
      <p class="src">Years differ by program; see the table above.</p></div></div>
  </div>

  <div class="card" id="priorauth"><div class="card-h"><div><h3>Prior authorization and appeals, explained</h3><div class="sub">You can start both yourself. You don't have to wait for your doctor's office.</div></div></div>
    <div class="card-b"><div class="grid">
      <div class="prose" style="font-size:.88rem"><h2 style="font-size:1.05rem;margin:0">What prior authorization is</h2>
        <p>Prior authorization is your plan's approval <b>before</b> you get a service, procedure, test or drug. Without it, the plan can refuse to pay. Medicare calls it an <b>organization determination</b> (Medicare Advantage) or a <b>coverage determination</b> (Part D drugs).</p>
        <h2 style="font-size:1.05rem;margin:0">What an appeal is</h2>
        <p>An appeal asks the plan, and then an independent reviewer, to reverse a denial: of prior authorization, of a claim after you got care, or of a drug at the pharmacy. You, your doctor, or someone you name in writing can file it.</p></div>
      <div><div class="sec-h" style="margin-bottom:8px">How to request prior authorization yourself</div><ol class="steps">
        <li><span><b>Ask your doctor's office first</b> whether the service or drug needs prior authorization, and who will submit it. Offices usually do, but you can start it.</span></li>
        <li><span><b>Call the member services number on your insurance card.</b> Say: "I'm requesting prior authorization" (Medicare Advantage: "an organization determination"; Part D: "a coverage determination"). Ask for the plan's form and its written coverage criteria.</span></li>
        <li><span><b>Send what the criteria ask for:</b> your doctor's order, progress notes, test results and a letter of medical necessity. For drugs, include other drugs you've tried.</span></li>
        <li><span><b>Ask for a fast (expedited) decision</b> if waiting could seriously harm your health. Your doctor's statement makes it mandatory for Medicare plans.</span></li>
        <li><span><b>Get the decision in writing</b>, with the reference number. If it's denied, the letter starts your appeal clock.</span></li>
      </ol></div>
    </div>
    <div class="sec-h">How long plans can take</div>
    <div class="tbl"><table><thead><tr><th>Coverage</th><th>Standard request</th><th>Urgent request</th></tr></thead><tbody>
      <tr><td class="strong">Medicare Advantage, Medicaid and CHIP managed care, HealthCare.gov plans (2026 federal rule)</td><td>7 calendar days</td><td>72 hours</td></tr>
      <tr><td class="strong">Medicare Part D drugs</td><td>72 hours</td><td>24 hours</td></tr>
      <tr><td class="strong">Job-based plans (federal ERISA rules)</td><td>15 days</td><td>72 hours</td></tr>
    </tbody></table></div>
    <p class="src">Sources: <a href="https://www.cms.gov/priorities/key-initiatives/burden-reduction/interoperability/policies-regulations/cms-interoperability-prior-authorization-final-rule-cms-0057-f" target="_blank" rel="noopener">CMS Interoperability and Prior Authorization Final Rule</a>; ${S("partDAppeal")}; ${S("appealsAca")}. State laws can set shorter deadlines.</p></div></div>

  <div class="card"><div class="card-h"><div><h3>Before you appeal: protect yourself</h3><div class="sub">Habits that win appeals</div></div></div>
    <div class="card-b"><ol class="steps">
      <li><span><b>Read your plan cover to cover.</b> Find the section the denial cites and quote your plan's own words back to it in your appeal.</span></li>
      <li><span><b>Read the denial notice carefully.</b> Find the exact reason, the claim or reference number, and the appeal deadline.</span></li>
      <li><span><b>Respond in a timely fashion.</b> Mark the deadline on your calendar and file well before it. Late appeals can be refused.</span></li>
      <li><span><b>Send your medical records, from every doctor involved.</b> Denials are often issued without anyone at the insurance company reviewing your doctor's orders or progress notes. You have a legal right to copies of your records. Request them from your primary doctor, specialists, therapists and hospitals: the more independent records supporting the same need, the stronger your request or appeal.</span></li>
      <li><span><b>Demand a timely answer.</b> Plans must decide within legal deadlines (see the table above). Tell them the deadline in writing, and ask the date their decision is due. If a Marketplace or job-based plan misses its deadline, you may be able to go straight to external review.</span></li>
      <li><span><b>Ask for help from your side.</b> If your coverage is through work, contact your employer's human resources or benefits department, or the company's insurance broker. They work with the insurer every day and can push a stuck request.</span></li>
      <li><span><b>Keep notes every time you contact your insurer.</b> Record the representative's name and ID number, phone number and extension, email, and the date and time of the call.</span></li>
      <li><span><b>Ask for it in writing.</b> Ask the representative for a written summary of the call (a call reference or transaction number) and a list of next steps.</span></li>
      <li><span><b>Keep copies of everything</b> you send and receive, and send appeals in a way you can track.</span></li>
    </ol></div></div>

  <div class="card" id="calllog"><div class="card-h"><div><h3>Insurance call log</h3><div class="sub">Fill this in during every call. It stays in this browser only; nothing is sent to Agora.</div></div><div class="right"><button class="btn sm ghost" id="logCopy" type="button">Copy all</button></div></div>
    <form class="card-b" id="logForm"><div class="form-row">
      <div class="field"><label for="lgWhen">Date and time</label><input class="input" id="lgWhen" type="datetime-local" required></div>
      <div class="field"><label for="lgIns">Insurance company</label><input class="input" id="lgIns" maxlength="60"></div>
      <div class="field"><label for="lgRep">Representative name</label><input class="input" id="lgRep" maxlength="60" required></div>
      <div class="field"><label for="lgId">Representative ID</label><input class="input" id="lgId" maxlength="40"></div>
      <div class="field"><label for="lgPhone">Phone and extension</label><input class="input" id="lgPhone" maxlength="40"></div>
      <div class="field"><label for="lgEmail">Email</label><input class="input" id="lgEmail" maxlength="80"></div>
      <div class="field"><label for="lgRef">Call reference or claim number</label><input class="input" id="lgRef" maxlength="60"></div>
    </div>
    <div class="field"><label for="lgSaid">What they told you</label><textarea class="input" id="lgSaid" maxlength="1500"></textarea></div>
    <div class="field"><label for="lgNext">Next steps they gave you</label><textarea class="input" id="lgNext" maxlength="1000"></textarea></div>
    <label class="chk" for="lgWritten"><input type="checkbox" id="lgWritten"> They agreed to send a written summary</label>
    <div><button class="btn" type="submit">Save call</button></div></form>
    <div id="logList">${callLog()}</div></div>

  <div class="notice brass"><span class="bar"></span><span><b>Was your care denied without anyone reviewing your records, or were you steered away from what your doctor ordered?</b> See <a href="/stand/#override">When insurers override your doctor</a>: the rules that apply, questions to ask your insurer, where to report it, and how to protest and boycott together.</span></div>
  <div class="card" id="complain"><div class="card-h"><div><h3>If your plan still says no: file a complaint</h3><div class="sub">Insurers answer to government regulators. A complaint puts your case in front of one.</div></div></div>
    <div class="card-b">
      <div class="prose" style="font-size:.9rem"><p><b>Why file.</b> A regulator can review whether your plan followed the law and its own contract, order an independent medical review, and require the plan to cover the care. Complaints are free, and each one becomes part of the record regulators use to investigate and fine insurers, so yours can help the next patient too.</p></div>
      <div class="sec-h">Who regulates your plan</div>
      <div class="tbl"><table><thead><tr><th>Your coverage</th><th>File with</th><th>Contact</th></tr></thead><tbody>
        <tr><td class="strong">Marketplace or individual plan; job-based plan the insurer pays claims for (fully insured)</td><td>Your state's department of insurance</td><td><a href="https://content.naic.org/state-insurance-departments" target="_blank" rel="noopener">Find your state</a></td></tr>
        <tr><td class="strong">California HMOs and most California health plans</td><td>California Department of Managed Health Care (DMHC) Help Center</td><td><a href="https://www.dmhc.ca.gov/FileaComplaint.aspx" target="_blank" rel="noopener">dmhc.ca.gov</a> · 1-888-466-2219</td></tr>
        <tr><td class="strong">Other California insurance policies</td><td>California Department of Insurance</td><td><a href="https://www.insurance.ca.gov/" target="_blank" rel="noopener">insurance.ca.gov</a></td></tr>
        <tr><td class="strong">Job-based plan your employer pays claims for (self-funded)</td><td>U.S. Department of Labor, Employee Benefits Security Administration. States can't regulate these plans.</td><td><a href="https://www.askebsa.dol.gov/" target="_blank" rel="noopener">askebsa.dol.gov</a> · 1-866-444-3272</td></tr>
        <tr><td class="strong">Medicare, Medicare Advantage, Part D</td><td>Medicare (complaint and Medicare Ombudsman); free counseling from your State Health Insurance Assistance Program</td><td><a href="https://www.medicare.gov/providers-services/claims-appeals-complaints/complaints" target="_blank" rel="noopener">medicare.gov</a> · 1-800-MEDICARE</td></tr>
        <tr><td class="strong">Medicaid</td><td>Your state Medicaid agency or Medicaid ombudsman, plus a state fair hearing</td><td>Number on your Medicaid notice</td></tr>
      </tbody></table></div>
      <p class="src">Not sure whether your job-based plan is fully insured or self-funded? Ask HR, or check the Summary Plan Description: self-funded plans usually say the employer is the "plan sponsor" and the insurer is the "claims administrator."</p>
      <div class="sec-h">How it works</div>
      <ol class="steps">
        <li><span><b>Finish the plan's internal appeal first</b>, in most cases. California's DMHC, for example, generally asks you to give the plan 30 days. If your health is at urgent risk, you can usually file right away.</span></li>
        <li><span><b>File online or by phone</b> with the regulator. Include the denial letter, your appeal, the plan's response, your medical records and your call log.</span></li>
        <li><span><b>The regulator contacts your plan</b> and requires a response, then reviews the plan's decision against state law and your contract.</span></li>
        <li><span><b>For medical-necessity denials</b>, the regulator can send your case to an independent medical review by doctors outside the plan. In many states, the plan must follow that decision.</span></li>
        <li><span><b>You get a written decision.</b> The regulator can order coverage or payment, and it can penalize plans that break the rules.</span></li>
      </ol>
      <div class="grid" style="margin-top:6px">
        <div><div class="sec-h" style="margin-bottom:6px">Advantages</div><ul class="decisions">
          <li>Free, and you don't need a lawyer</li><li>An independent agency reviews your case instead of the company that denied it</li><li>Independent medical review decisions are binding on the plan in many states</li><li>Faster handling for urgent cases</li><li>Creates an official record; repeated complaints lead to investigations and fines</li></ul></div>
        <div><div class="sec-h" style="margin-bottom:6px">Disadvantages</div><ul class="decisions">
          <li>States can't regulate self-funded job-based plans, which cover most workers at large employers; those go to the U.S. Department of Labor, which has fewer powers to order coverage</li><li>You usually must finish the plan's appeal first</li><li>Non-urgent cases can take weeks</li><li>Regulators can order coverage but generally can't award damages for harm</li><li>Rules and strength of protections vary by state</li></ul></div>
      </div>
    </div>
    <div class="card-f">General information, not legal advice. A health-care attorney or legal aid office can advise on lawsuits, which are a separate path.</div></div>

  <div class="card" id="appeal"><div class="card-h"><div><h3>How to appeal a denial</h3><div class="sub">Deadlines run from the date on your denial notice</div></div></div>
    <div class="card-b"><div class="grid">
      ${steps("Job-based or Marketplace plan", [["Read the denial notice.", "It must say why and how to appeal."], ["Ask for your claim file", "and the plan rules used, free of charge."], ["Get your doctor's letter", "explaining medical necessity; ask for a peer-to-peer review."], ["File an internal appeal within 180 days.", "Decisions: 30 days before care, 60 days after, 72 hours if urgent."], ["Ask for external review within 4 months.", "An independent reviewer decides, and the plan must follow it."]], "appealsAca")}
      ${steps("Original Medicare (Parts A & B)", [["Check your Medicare Summary Notice", "for the denied item and reason."], ["Request a redetermination within 120 days", "from the Medicare contractor listed on the notice. Decision within 60 days."], ["Ask for reconsideration within 180 days", "by an independent contractor if denied again."], ["Request a hearing", "before an administrative law judge within 60 days."], ["Continue if needed", "to the Medicare Appeals Council and federal court."]], "origAppeal")}
      ${steps("Medicare Advantage (Part C)", [["Read the denial notice", "and note the reason."], ["Request reconsideration within 65 days.", "Decisions: 30 days for a service, 60 for payment, 72 hours if fast."], ["Include your doctor's statement.", "If delay could harm your health, the plan must use the fast timeline."], ["Independent review is automatic", "if the plan says no again."], ["Further levels:", "judge hearing, Appeals Council, federal court."]], "appealsMa")}
      ${steps("Medicare Part D (drugs)", [["Ask the pharmacist why", "the fill was rejected, and ask the plan for a coverage determination or exception."], ["Have your prescriber send a supporting statement.", "Plans decide in 72 hours, or 24 hours if expedited."], ["Request a redetermination within 65 days", "if denied. Decision in 7 days, or 72 hours if expedited."], ["Independent review", "by an outside entity if the plan says no again."], ["Further levels:", "judge hearing, Appeals Council, federal court."]], "partDAppeal")}
      ${steps("Medicaid", [["Read the notice", "from your Medicaid plan or state."], ["Appeal to your plan within 60 days.", "Plans must decide within 30 days, or 72 hours if urgent."], ["Keep your benefits during the appeal", "by filing within 10 days of the notice, for services already approved."], ["Request a state fair hearing within 120 days", "of the plan's decision."], ["Ask about external review.", "Some states offer it; most don't."]], "medicaidAppeal")}
    </div></div>
    <div class="card-f">General information, not legal advice. Free help: your State Health Insurance Assistance Program (SHIP) for Medicare, or your state's consumer assistance program or legal aid for other plans.</div></div>
  </div>`;
};

P.ma = () => A.hero("Agora Health · Medicare Advantage", "Private plans, public money", `More than half of Medicare enrollees now get benefits through private Medicare Advantage plans. Medicare's own advisers estimate those plans are paid about ${H_MEDPAC.extraPct}% more than it would cost to cover the same people in traditional Medicare.`,
  [`${H_MEDPAC.enrollM}M enrollees (2025)`, `${H_MEDPAC.share}% of eligible beneficiaries`, `$${H_MEDPAC.extraB}B extra in 2026`]) +
  `<div class="content">
  <div class="card" id="compare"><div class="card-h"><div><h3>Traditional Medicare vs. Medicare Advantage</h3><div class="sub">Both cover the same basic benefits. They differ in who runs your coverage, which doctors you can see, and how costs and approvals work.</div></div></div>
    <div class="tbl"><table><thead><tr><th style="width:22%"></th><th>Traditional Medicare (Parts A & B)</th><th>Medicare Advantage (Part C)</th></tr></thead><tbody>
      <tr><td class="strong">Who runs it</td><td>The federal government pays doctors and hospitals directly.</td><td>A private insurer (UnitedHealthcare, Humana, Aetna and others) is paid a monthly amount per enrollee by Medicare and manages your care.</td></tr>
      <tr><td class="strong">Doctors and hospitals</td><td>Any provider nationwide that accepts Medicare, which is nearly all.</td><td>Usually a local network. HMOs generally cover only in-network care except emergencies; PPOs cost more out of network.</td></tr>
      <tr><td class="strong">Referrals and prior authorization</td><td>No referrals. Prior authorization is rare.</td><td>Most plans require prior authorization for many services; HMOs often require referrals. ${H_MA.deniedPct}% of 2024 requests were denied.</td></tr>
      <tr><td class="strong">Premiums (2026)</td><td>Part B: $${H_MCR.partB26}/month. Part A free for most people.</td><td>Part B premium still applies. ${H_LIMITS.maZeroShare}% of enrollees pay no extra plan premium.</td></tr>
      <tr><td class="strong">Deductibles and cost sharing (2026)</td><td>Part A: $1,736 per hospital benefit period. Part B: $283 a year, then usually 20% of the bill.</td><td>Set by each plan: copays and coinsurance vary widely. Read the plan's Evidence of Coverage.</td></tr>
      <tr><td class="strong">Yearly out-of-pocket limit</td><td><b>None</b>, unless you buy a Medigap supplement or have other coverage.</td><td>Required: up to $${H_LIMITS.maInNet.toLocaleString()} in network in 2026; average ${money(H_LIMITS.maAvg, 0)}.</td></tr>
      <tr><td class="strong">Prescription drugs</td><td>Add a separate Part D plan.</td><td>Usually included.</td></tr>
      <tr><td class="strong">Extra benefits</td><td>Generally not covered (routine dental, vision, hearing aids).</td><td>Many plans add limited dental, vision, hearing and fitness benefits.</td></tr>
      <tr><td class="strong">Supplemental coverage</td><td>Medigap policies can cover most cost sharing. You have a guaranteed right to buy one in your first 6 months on Part B; after that, insurers in most states can deny you or charge more based on health.</td><td>Medigap can't be used with Medicare Advantage.</td></tr>
      <tr><td class="strong">Travel</td><td>Covered anywhere in the U.S.</td><td>Often limited to the plan's service area except emergencies.</td></tr>
      <tr><td class="strong">Switching</td><td colspan="2">Change plans each fall during Open Enrollment (Oct. 15 – Dec. 7). Medicare Advantage enrollees can also switch plans or return to traditional Medicare Jan. 1 – Mar. 31. Returning later in life may mean you can't get a Medigap policy at a standard price.</td></tr>
      <tr><td class="strong">Cost to taxpayers</td><td>The baseline.</td><td>About ${H_MEDPAC.extraPct}% more per enrollee than traditional Medicare would spend, per MedPAC ($${H_MEDPAC.extraB}B in 2026).</td></tr>
    </tbody></table></div>
    <div class="card-f">Sources: <a href="https://www.cms.gov/newsroom/fact-sheets/2026-medicare-parts-b-premiums-deductibles" target="_blank" rel="noopener">CMS 2026 Medicare premiums and deductibles</a>; ${S("ma26")}; ${S("ma")}; ${S("medpac")}. Free, unbiased help choosing: your State Health Insurance Assistance Program (SHIP) and <a href="https://www.medicare.gov/plan-compare/" target="_blank" rel="noopener">Medicare Plan Finder</a>.</div></div>

  <div class="card"><div class="card-h"><div><h3>MedPAC's estimate of Medicare Advantage payments vs. traditional Medicare</h3><div class="sub">2026 projection</div></div><div class="right">${badge}</div></div>
    <div class="card-b"><div class="grid-tight">
      <div class="stat"><div class="l">Paid above traditional Medicare</div><div class="v down">${H_MEDPAC.extraPct}%</div></div>
      <div class="stat"><div class="l">Dollar difference</div><div class="v down">$${H_MEDPAC.extraB}B</div><div class="s">in 2026</div></div>
      <div class="stat"><div class="l">From favorable selection</div><div class="v">~${H_MEDPAC.selection}%</div><div class="s">healthier enrollees than average</div></div>
      <div class="stat"><div class="l">From coding intensity</div><div class="v">~${H_MEDPAC.coding}%</div><div class="s">higher recorded risk scores</div></div>
    </div>
    <p style="font-size:.88rem;color:var(--ink-2)">Medicare pays plans more for sicker patients. MedPAC finds plans attract people who are healthier than their payments assume, and record more diagnoses than doctors in traditional Medicare do for similar patients. Both raise payments without more care.</p>
    <p class="src">Source: ${S("medpac")}. Medicare Advantage insurers dispute parts of this analysis and point to extra benefits and lower out-of-pocket costs for enrollees.</p></div></div>
  <div class="card"><div class="card-h"><div><h3>Prior-authorization denials by insurer, 2024</h3><div class="sub">Share of Medicare Advantage requests fully or partly denied</div></div><div class="right">${badge}</div></div>
    <div class="card-b">${A.hbars(H_MA.byInsurer.map(([l, v, t]) => [`<a href="/company/#${t}" style="color:inherit">${l}</a>`, v, "var(--s-rx)", v + "%"]), 14, H_MA.deniedPct)}<p class="src">Average ${H_MA.deniedPct}% (tick). Source: ${S("ma")}</p></div></div>
  </div>`;

const rs = {set: null, setData: null, setErr: null, type: "phys", q: "", look: null, lookErr: null, icdQ: "", icd: null, busy: false, found: null};
const RT = {phys: "Doctor, surgery & allied health (CPT/HCPCS)", drg: "Hospital stay (DRG)", apc: "Outpatient hospital (APC)"};
const idxSeries = k => {
  const s = R_CPI[k], i70 = 0;
  return R_YRS.map((y, i) => {
    const v = s.v[i]; if (v == null) return null;
    if (k === "hosp") return [y, (R_CPI_1977 / R_CPI.all.v[0] * 100) * v / s.base];
    if (k === "other") { const i90 = R_YRS.indexOf(1990); return [y, (R_CPI.all.v[i90] / R_CPI.all.v[0] * 100) * v / s.v[i90]]; }
    return [y, v / s.v[i70] * 100];
  }).filter(Boolean);
};
const COLORS = {all: "var(--ink-2)", med: "var(--s-rx)", phys: "var(--s-cpi)", dent: "var(--s-gen)", hosp: "var(--s-otc)", other: "var(--accent)"};
function csv(rows) { return rows.map(r => r.map(c => { const t = c == null ? "" : String(c); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; }).join(",")).join("\n"); }
function download(name, rows) {
  try { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv(rows)], {type: "text/csv"})); a.download = name; document.body.appendChild(a); a.click(); a.remove(); }
  catch (e) { A.toast("Downloads work on the live site"); }
}
function lookTable(r, type) {
  const ys = Object.keys(r.years).sort(), first = r.years[ys[0]];
  const cpiY = y => CPI_Y_H[y] || null;
  return `<div class="tbl"><table><thead><tr><th>Year</th><th class="r">Medicare allowed</th><th class="r">If it tracked inflation</th><th class="r">Medicare paid</th><th class="r">Billed charge</th>${type === "phys" ? `<th class="r">In office</th><th class="r">In facility</th>` : ""}<th class="r">${type === "drg" ? "Stays" : "Services"}</th></tr></thead><tbody>
  ${ys.map(y => { const x = r.years[y], exp = cpiY(y) && cpiY(ys[0]) ? first.allowed * cpiY(y) / cpiY(ys[0]) : null, gap = exp ? (x.allowed / exp - 1) * 100 : null;
    return `<tr><td class="num strong">${y}</td><td class="r num">${money(x.allowed)}</td><td class="r num">${exp ? money(exp) : "—"}${gap != null && Math.abs(gap) >= 1 ? `<span class="tsub ${gap < 0 ? "down" : "up"}">${gap > 0 ? "+" : ""}${gap.toFixed(0)}% vs inflation</span>` : ""}</td><td class="r num">${money(x.paid)}</td><td class="r num">${money(x.charge)}</td>${type === "phys" ? `<td class="r num">${x.office != null ? money(x.office) : "—"}</td><td class="r num">${x.facility != null ? money(x.facility) : "—"}</td>` : ""}<td class="r num">${x.volume ? Math.round(x.volume).toLocaleString() : "—"}</td></tr>`; }).join("")}
  </tbody></table></div>`;
}
const CPI_Y_H = {2013:232.957,2014:236.736,2015:237.017,2016:240.007,2017:245.120,2018:251.107,2019:255.657,2020:258.811,2021:270.970,2022:292.655,2023:304.702,2024:313.689,2025:322.35};
function lookChart(r) {
  const ys = Object.keys(r.years).map(Number).sort((a, b) => a - b); if (ys.length < 2) return "";
  const al = ys.map(y => [y, r.years[y].allowed]), ch = ys.map(y => [y, r.years[y].charge]), inf = ys.map(y => [y, r.years[ys[0]].allowed * CPI_Y_H[y] / CPI_Y_H[ys[0]]]);
  return A.legend([["var(--s-otc)", "Billed charge"], ["var(--s-rx)", "Medicare allowed"], ["var(--s-cpi)", "Allowed, if it tracked inflation (dashed)"]]) +
    `<div class="chart-wrap">${A.yearChart([{color: "var(--s-otc)", pts: ch}, {color: "var(--s-rx)", pts: al}, {color: "var(--s-cpi)", pts: inf, dash: "5 4"}], {label: "Payment by year", fmt: v => v >= 1000 ? "$" + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "K" : "$" + v.toFixed(0), ymin: 0, xstep: 2})}</div>`;
}
function lookOut() {
  if (rs.busy) return `<p class="skel">Gathering Medicare data for every year… the first lookup of a code takes up to 30 seconds.</p>`;
  if (rs.lookErr) return `<p class="skel">${rs.lookErr}</p>`;
  if (rs.found) return `<div class="tbl"><table><thead><tr><th>Code</th><th>Description (CMS)</th><th class="r">Medicare services, 2023</th><th></th></tr></thead><tbody>${rs.found.map(f => `<tr><td class="num strong">${esc(f.code)}</td><td>${esc(f.desc)}</td><td class="r num">${f.volume ? Math.round(f.volume).toLocaleString() : ""}</td><td><button class="btn sm ghost" data-rcode="${esc(f.code)}">Rates by year</button></td></tr>`).join("")}</tbody></table></div>`;
  const r = rs.look; if (!r) return "";
  if (r.notFound) return `<p class="skel">No national Medicare data for code ${esc(r.code)}. It may be paid under a different system or rarely billed to Medicare.</p>`;
  const ys = Object.keys(r.years).sort(), a = r.years[ys[0]], b = r.years[ys[ys.length - 1]];
  return `<div class="grid-tight"><div class="stat"><div class="l">${esc(r.code)}</div><div class="v" style="font-size:1rem">${esc(r.desc)}</div></div>
    <div class="stat"><div class="l">Medicare allowed, ${ys[ys.length - 1]}</div><div class="v">${money(b.allowed)}</div><div class="s">${pct((b.allowed / a.allowed - 1) * 100)} since ${ys[0]}</div></div>
    <div class="stat"><div class="l">Inflation, ${ys[0]}–${ys[ys.length - 1]}</div><div class="v">${pct((CPI_Y_H[ys[ys.length - 1]] / CPI_Y_H[ys[0]] - 1) * 100)}</div></div>
    <div class="stat"><div class="l">Billed ÷ allowed</div><div class="v down">${(b.charge / b.allowed).toFixed(1)}×</div><div class="s">list charge vs. what Medicare allows</div></div></div>
    ${lookChart(r)}${lookTable(r, rs.type)}
    <div><button class="btn sm ghost" data-rdl="look">Download spreadsheet (CSV)</button></div>`;
}
function setOut() {
  if (!rs.set) return "";
  const S0 = R_SETS.find(x => x.id === rs.set);
  if (rs.setErr) return `<p class="skel">${rs.setErr}</p>`;
  if (!rs.setData) return `<p class="skel">Loading ${esc(S0.name.toLowerCase())}: every code, every year. The first load can take up to a minute; after that it's instant.</p>`;
  const res = rs.setData, ys = [...new Set(res.flatMap(r => Object.keys(r.years || {})))].sort();
  const label = c => (S0.codes.find(x => x[0] === c) || [, ""])[1];
  return `<div class="tbl"><table><thead><tr><th>Code</th>${ys.map(y => `<th class="r">${y}</th>`).join("")}<th class="r">Change</th><th class="r">Inflation</th></tr></thead><tbody>
    ${res.map(r => { if (r.notFound) return `<tr><td class="num strong">${esc(r.code)}<span class="tsub">${esc(label(r.code))}</span></td><td colspan="${ys.length + 2}" class="tsub">No national Medicare data</td></tr>`;
      const ry = Object.keys(r.years).sort(), f = r.years[ry[0]].allowed, l = r.years[ry[ry.length - 1]].allowed, ch = (l / f - 1) * 100, inf = (CPI_Y_H[ry[ry.length - 1]] / CPI_Y_H[ry[0]] - 1) * 100;
      return `<tr><td><button class="link-btn strong" data-rcode="${esc(r.code)}" data-rtype="${S0.type}" style="color:var(--accent)">${esc(r.code)}</button><span class="tsub">${esc(label(r.code))}</span></td>${ys.map(y => `<td class="r num">${r.years[y] ? money(r.years[y].allowed, r.years[y].allowed >= 1000 ? 0 : 2) : "—"}</td>`).join("")}<td class="r num ${ch < inf ? "down" : "up"}">${pct(ch)}</td><td class="r num">${pct(inf)}</td></tr>`; }).join("")}
  </tbody></table></div>
  <div class="card-f" style="border-radius:0"><span>Average Medicare allowed amount per service (plan payment plus patient cost sharing), national. Red change means the payment fell behind inflation.</span><button class="btn sm ghost" data-rdl="set">Download spreadsheet (CSV)</button></div>`;
}
P.rates = () => {
  const keys = Object.keys(R_CPI), last = R_YRS.length - 1;
  const cfYs = Object.keys(H_CPI).map(Number), real = cfYs.map(y => [y, H_CF[y] * H_CPI[2025] / H_CPI[y]]), nom = cfYs.map(y => [y, H_CF[y]]);
  return A.hero("Agora Health · Reimbursement rates", "What doctors, hospitals and therapists are paid, and how it has changed", "Prices for medical services since 1970, Medicare's payment for every billing code by year, and code lookups for procedures (CPT/HCPCS), diagnoses (ICD-10) and hospital stays (DRG).",
    ["Price indexes 1970–2026", "Every Medicare-billed code, 2013–2023", "Hospital stays 2013–2024"]) +
  `<div class="content">
  <div class="card"><div class="card-h"><div><h3>Medical service prices since 1970</h3><div class="sub">Consumer Price Index, 1970 = 100. Series that begin later start at the all-items level for their first year.</div></div><div class="right">${badge}</div></div>
    <div class="card-b">${A.legend(keys.map(k => [COLORS[k], R_CPI[k].name]))}<div class="chart-wrap">${A.yearChart(keys.map(k => ({color: COLORS[k], pts: idxSeries(k), dash: k === "all" ? "6 4" : null})), {label: "Medical service price indexes since 1970", fmt: v => Math.round(v).toLocaleString(), ymin: 0, xstep: 10, h: 340})}</div>
    <div class="tbl"><table><thead><tr><th>Year</th>${keys.map(k => `<th class="r">${R_CPI[k].name.split(" (")[0]}</th>`).join("")}</tr></thead><tbody>
      ${R_YRS.map((y, i) => `<tr><td class="num strong">${y}${y === 2026 ? "*" : ""}</td>${keys.map(k => { const p = idxSeries(k).find(x => x[0] === y); return `<td class="r num">${p ? Math.round(p[1]).toLocaleString() : "—"}</td>`; }).join("")}</tr>`).join("")}
    </tbody></table></div>
    <div><button class="btn sm ghost" data-rdl="cpi">Download spreadsheet (CSV)</button></div>
    <p class="src">* 2026 is preliminary. Before 1992, Medicare paid each doctor's "customary charge," so code-by-code payment history starts with the national fee schedule. Sources: ${S("cpiMed")}; ${S("cpiPhys")}; ${S("cpiDent")}; ${S("cpiHosp")}; ${S("cpiOther")}; ${S("cpi")}.</p></div></div>

  <div class="card" id="lookup"><div class="card-h"><div><h3>Look up a code</h3><div class="sub">Medicare's average payment by year, nationally</div></div></div>
    <div class="card-b"><form id="rForm" class="calc">
      <div class="field"><label for="rType">Type</label><select class="input" id="rType">${Object.entries(RT).map(([k, v]) => `<option value="${k}" ${rs.type === k ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      <div class="field" style="grid-column:span 2"><label for="rQ">${rs.type === "phys" ? "Code or description" : "Code"}</label><input class="input" id="rQ" value="${esc(rs.q)}" placeholder="${rs.type === "phys" ? "e.g. 99214, knee replacement, physical therapy" : rs.type === "drg" ? "e.g. 470" : "e.g. 5072"}" maxlength="60" required></div>
      <div><button class="btn" type="submit">Look up</button></div></form>
      ${rs.type === "apc" ? `<p class="src"><button class="link-btn" data-rtop="1">Show the most common outpatient APC codes</button></p>` : ""}
      <div id="rOut">${lookOut()}</div></div>
    <div class="card-f">Allowed = what Medicare approves (its payment plus the patient's share). Billed charge = the provider's list price. CPT codes and descriptions are maintained by the American Medical Association; descriptions shown are CMS's. Sources: ${S("pufPhys")}; ${S("pufInp")}; ${S("pufOut")}.</div></div>

  <div class="card"><div class="card-h"><div><h3>Rate spreadsheets by category</h3><div class="sub">Medicare allowed amount per service, every year, for common codes</div></div></div>
    <div class="card-b"><div class="picker">${R_SETS.map(x => `<button data-rset="${x.id}" aria-pressed="${rs.set === x.id}">${esc(x.name)}</button>`).join("")}</div></div>
    <div id="setOut">${setOut()}</div></div>

  <div class="card"><div class="card-h"><div><h3>Medicare's doctor-pay conversion factor, 1998–2026</h3><div class="sub">The dollar multiplier behind every physician fee</div></div><div class="right">${badge}</div></div>
    <div class="card-b">${A.legend([["var(--s-cpi)", "In 2025 dollars"], ["var(--s-rx)", "As paid"]])}<div class="chart-wrap">${A.yearChart([{color: "var(--s-cpi)", pts: real, dash: "6 4"}, {color: "var(--s-rx)", pts: nom}], {label: "Medicare conversion factor", fmt: v => "$" + v.toFixed(0), ymin: 0, xstep: 5, h: 240})}</div>
    <p class="src">2025: $${H_CF[2025].toFixed(4)}, lower than 1998's $${H_CF[1998].toFixed(4)} before inflation. 2026: $${H_CF[2026].toFixed(4)}. Sources: ${S("cf")}; ${S("cpi")}.</p></div></div>

  <div class="card"><div class="card-h"><div><h3>Diagnosis codes (ICD-10-CM)</h3><div class="sub">Search all ~74,000 diagnosis codes</div></div></div>
    <div class="card-b"><form id="icdForm" class="calc"><div class="field" style="grid-column:span 2"><label for="icdQ">Diagnosis or code</label><input class="input" id="icdQ" value="${esc(rs.icdQ)}" placeholder="e.g. type 2 diabetes, E11.9, heart failure" maxlength="60" required></div><div><button class="btn" type="submit">Search</button></div></form>
    <div id="icdOut">${rs.icd ? (rs.icd.items.length ? `<div class="tbl"><table><thead><tr><th>Code</th><th>Diagnosis</th></tr></thead><tbody>${rs.icd.items.map(d => `<tr><td class="num strong">${esc(d.code)}</td><td>${esc(d.desc)}</td></tr>`).join("")}</tbody></table></div><p class="src">${rs.icd.total.toLocaleString()} matches.</p>` : `<p class="skel">No matches.</p>`) : ""}</div>
    <p class="src">Diagnoses don't have prices on their own. Doctors are paid by procedure code; hospitals are paid per stay by DRG, which is set from the patient's diagnosis codes and procedures. Source: ${S("icd")}.</p></div></div>
  </div>`;
};

window.AgoraRates && (window.AgoraRates.wrap = html => `<div class="content" style="padding-bottom:0"><div class="notice warn"><span class="bar"></span><div><b>Estimates, not actual payments.</b> This estimator models what a code might have paid from 1970 to 2030 using relative values, conversion factors and published averages, including projected years. For Medicare's actual average payments by code and year, use <a href="#rates">Reimbursement Rates</a>.</div></div></div>` + html);
P.estimator = () => window.AgoraRates ? window.AgoraRates.wrap(window.AgoraRates.page()) : `<div class="content"><p class="skel">The estimator didn't load.</p></div>`;

P.insurers = () => {
  const IS = AGORA_INS_SRC;
  return A.hero("Agora Health · Insurers", "Who runs America's health coverage, and what else they own", "The largest U.S. health insurers: leadership, headquarters, revenue and profit by quarter and year, the businesses they own, the government programs they run, and documented conflicts of interest.", ["Live SEC financials", "Subsidiaries explained", "Medicare, Medicaid, TRICARE & VA roles"]) +
  `<div class="content">
  <div class="card"><div class="card-h"><div><h3>Insurer directory</h3><div class="sub">Revenue and net income for public companies load live from SEC filings</div></div><div class="right"><span class="live offline" id="dirLive">Live on the deployed site</span></div></div>
    <div class="tbl"><table><thead><tr><th>Company</th><th>Type</th><th>CEO</th><th>Headquarters</th><th class="r">Revenue (latest year)</th><th class="r">Net income</th></tr></thead><tbody>
    ${AGORA_INSURERS.map(i => `<tr><td><span class="strong">${i.t ? `<a href="/company/#${i.t}">${esc(i.name)}</a>` : i.site ? `<a href="${i.site}" target="_blank" rel="noopener">${esc(i.name)}</a>` : esc(i.name)}</span>${i.t ? `<span class="tsub"><span class="tick">${i.t}</span></span>` : ""}<span class="tsub">${esc(i.gov.map(g => g[0]).join(" · "))}</span></td><td>${esc(i.kind)}</td><td>${esc(i.ceo || "—")}</td><td data-hq="${i.t || ""}">${esc(i.hq || "—")}</td><td class="r num" data-rev="${i.t || ""}">${i.t ? "—" : `<span class="tsub">Annual report</span>`}</td><td class="r num" data-net="${i.t || ""}">—</td></tr>`).join("")}
    </tbody></table></div>
    <div class="card-f">${esc(AGORA_BLUES_NOTE)} ${A.src(IS.bcbsa)}. Nonprofit insurers don't file with the SEC; their finances are in annual reports and state filings. CEO contact: use each company's investor relations or media office; personal contact details aren't published here.</div></div>

  <div class="card"><div class="card-h"><div><h3>Conflicts of interest: the big picture</h3><div class="sub">When one company is the insurer, the pharmacy manager, the pharmacy and the doctor</div></div></div>
    <div class="card-b"><div class="prose" style="font-size:.9rem">
      <p><b>Insurers own pharmacy benefit managers.</b> The three largest pharmacy benefit managers (CVS Caremark, Express Scripts and Optum Rx) process about 80% of U.S. prescriptions, and each belongs to a major insurer (CVS Health, Cigna and UnitedHealth). The FTC found they steer patients toward their own pharmacies, especially for expensive specialty drugs. ${A.src(IS.ftcSum)}</p>
      <p><b>Insurers own doctors and clinics.</b> UnitedHealth (Optum Health), CVS (Oak Street Health), Humana (CenterWell) and Elevance (Carelon) own care providers. When a plan pays its own affiliate, money stays inside the company and is harder for regulators to evaluate.</p>
      <p><b>Medicare Advantage billing.</b> Plans are paid more for sicker patients. HHS's inspector general found in-home health assessments drove an estimated $7.5 billion in questionable 2023 payments; UnitedHealth disclosed DOJ criminal and civil investigations of its Medicare billing in 2025. ${A.src(IS.hra)}; ${A.src(IS.doj)}</p>
      <p><b>Military and veterans' coverage is run by the same industry.</b> Humana Military runs TRICARE East, TriWest runs TRICARE West, Express Scripts (Cigna) runs the TRICARE pharmacy program, and Optum (UnitedHealth) and TriWest administer the VA's community care network. ${A.src(IS.t5)}; ${A.src(IS.tpharm)}; ${A.src(IS.ccn)}</p>
    </div></div></div>

  ${AGORA_CO_TABLE("health")}

  <div class="card"><div class="card-h"><div><h3>TRICARE and VA: who runs them</h3><div class="sub">Coverage for service members, military families, retirees and veterans</div></div></div>
    <div class="tbl"><table><thead><tr><th>Program</th><th>Run by</th><th>Contractor</th></tr></thead><tbody>
      <tr><td class="strong">TRICARE East Region</td><td>Defense Health Agency</td><td>Humana Military (continuing under the contracts that began Jan. 1, 2025)</td></tr>
      <tr><td class="strong">TRICARE West Region</td><td>Defense Health Agency</td><td>TriWest Healthcare Alliance (from Jan. 1, 2025; previously Health Net Federal Services, a Centene company)</td></tr>
      <tr><td class="strong">TRICARE Pharmacy</td><td>Defense Health Agency</td><td>Express Scripts (Cigna), since Jan. 1, 2023</td></tr>
      <tr><td class="strong">VA Community Care Network</td><td>Department of Veterans Affairs</td><td>Optum Serve (UnitedHealth): 36 states, D.C. and two territories. TriWest: 14 states and three territories. The VA is consolidating to two regions under new contracts.</td></tr>
    </tbody></table></div>
    <div class="card-f">Sources: ${A.src(IS.t5)}; ${A.src(IS.tpharm)}; ${A.src(IS.ccn)}. See <a href="#types">Plan Types</a> for how TRICARE and VA coverage work.</div></div>
  </div>`;
};
async function fillDirectory() {
  const ts = AGORA_INSURERS.filter(i => i.t).map(i => i.t);
  await Promise.all(ts.map(async t => {
    try {
      const p = await A.api("profile?t=" + t), a = p.annual[p.annual.length - 1];
      A.$("#dirLive") && (A.$("#dirLive").className = "live", A.$("#dirLive").textContent = "Live from SEC EDGAR");
      const hq = document.querySelector(`[data-hq="${t}"]`); if (hq) hq.textContent = `${titleCase(p.city)}, ${p.state}`;
      const r = document.querySelector(`[data-rev="${t}"]`); if (r && a) r.innerHTML = `${big(a.revenue)}<span class="tsub">${a.year}</span>`;
      const n = document.querySelector(`[data-net="${t}"]`); if (n && a) { n.textContent = a.net != null ? big(a.net) : "—"; if (a.net < 0) n.classList.add("down"); }
    } catch (e) {}
  }));
}
const titleCase = s => String(s || "").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

P.polls = () => A.hero("Agora Health · Polls", "What patients and the public think", "Vote on coverage questions or start your own poll. One vote per device; results update live.", []) + `<div class="content" id="pollsMount"></div>`;

function render() {
  let id = location.hash.slice(1); if (["appeal", "priorauth", "calllog", "complain"].includes(id)) id = "denials"; if (id === "doctors") id = "rates"; if (!P[id]) id = "spending";
  A.setTab(id); A.$("#main").innerHTML = P[id]();
  if (id === "insurers") { AGORA_FILL_QUOTES(); fillDirectory(); }
  if (id === "polls") AgoraPolls.mount(A.$("#pollsMount"), "health");
  if (["#appeal", "#priorauth", "#calllog", "#complain"].includes(location.hash)) A.$(location.hash)?.scrollIntoView();
}
window.addEventListener("hashchange", () => { render(); if (!["#appeal", "#priorauth", "#calllog", "#complain"].includes(location.hash)) window.scrollTo({top: 0}); });
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "txS") { tx.status = t.value; render(); }
  if (t.id === "txSE") { tx.self = t.checked; render(); }
});
document.addEventListener("input", e => {
  const t = e.target; if (t.id !== "txW" && t.id !== "txF") return;
  if (t.id === "txW") tx.wages = t.value; else tx.fit = t.value;
  clearTimeout(render.h); render.h = setTimeout(() => { render(); const el = A.$("#" + t.id); if (el) { el.focus(); } }, 450);
});
document.addEventListener("change", e => { if (location.hash === "#rates" && e.target.id === "rType") { rs.type = e.target.value; rs.look = null; rs.found = null; rs.lookErr = null; render(); } });
async function rLookup(code, type) {
  rs.busy = true; rs.found = null; rs.lookErr = null; rs.look = null; if (type) rs.type = type; A.$("#rOut") && (A.$("#rOut").innerHTML = lookOut());
  try { const d = await A.api(`rates?type=${rs.type}&codes=${encodeURIComponent(code)}`); rs.look = d.results[0]; }
  catch (err) { rs.lookErr = err.user ? esc(err.message) : "Rate lookups run on the live site. Preview can't reach CMS."; }
  rs.busy = false; if (type) { render(); A.$("#lookup")?.scrollIntoView(); } else A.$("#rOut").innerHTML = lookOut();
}
document.addEventListener("submit", async e => {
  const id = e.target.id;
  if (id === "rForm") { e.preventDefault(); rs.q = A.$("#rQ").value.trim(); rs.type = A.$("#rType").value;
    const isCode = rs.type !== "phys" ? /^\d{1,4}$/.test(rs.q) : /^[A-Za-z0-9]{5}$/.test(rs.q);
    if (rs.type !== "phys" && !isCode) { rs.lookErr = "Enter the numeric code."; A.$("#rOut").innerHTML = lookOut(); return; }
    if (isCode) return rLookup(rs.type === "drg" ? rs.q.padStart(3, "0") : rs.q.toUpperCase());
    rs.busy = true; A.$("#rOut").innerHTML = `<p class="skel">Searching Medicare codes…</p>`;
    try { const d = await A.api("codes?type=proc&q=" + encodeURIComponent(rs.q)); rs.found = d.items; if (!d.items.length) rs.lookErr = "No Medicare-billed codes match that description."; }
    catch (err) { rs.lookErr = err.user ? esc(err.message) : "Code search runs on the live site."; }
    rs.busy = false; rs.look = null; A.$("#rOut").innerHTML = lookOut(); return; }
  if (id === "icdForm") { e.preventDefault(); rs.icdQ = A.$("#icdQ").value.trim(); A.$("#icdOut").innerHTML = `<p class="skel">Searching…</p>`;
    try { rs.icd = await A.api("codes?type=icd&q=" + encodeURIComponent(rs.icdQ)); render(); }
    catch (err) { A.$("#icdOut").innerHTML = `<p class="skel">${err.user ? esc(err.message) : "Diagnosis search runs on the live site."} You can also search at <a href="https://www.cms.gov/medicare/coding-billing/icd-10-codes" target="_blank" rel="noopener">CMS ICD-10</a>.</p>`; }
    return; }
});
document.addEventListener("click", async e => {
  if (location.hash !== "#rates") return;
  const b = e.target.closest("[data-rset],[data-rcode],[data-rdl],[data-rtop]"); if (!b) return;
  if (b.dataset.rcode) return rLookup(b.dataset.rcode, b.dataset.rtype || rs.type);
  if (b.dataset.rtop) { rs.busy = true; A.$("#rOut").innerHTML = `<p class="skel">Loading…</p>`;
    try { const d = await A.api("rates?type=apc&top=1"); rs.found = d.top.map(x => ({code: x.code, desc: x.desc, volume: x.volume})); } catch (err) { rs.lookErr = err.user ? esc(err.message) : "Runs on the live site."; }
    rs.busy = false; A.$("#rOut").innerHTML = lookOut(); return; }
  if (b.dataset.rset) {
    rs.set = b.dataset.rset; rs.setData = null; rs.setErr = null; render();
    const S0 = R_SETS.find(x => x.id === rs.set);
    try { const d = await A.api(`rates?type=${S0.type}&codes=${S0.codes.map(c => c[0]).join(",")}`); if (rs.set === S0.id) rs.setData = d.results; }
    catch (err) { rs.setErr = err.user ? esc(err.message) : "Rate spreadsheets load on the live site at AgoraSocietyStands.com."; }
    if (A.$("#setOut")) A.$("#setOut").innerHTML = setOut(); return;
  }
  if (b.dataset.rdl === "cpi") { const keys = Object.keys(R_CPI); download("agora-medical-price-indexes-1970-2026.csv", [["Year", ...keys.map(k => R_CPI[k].name + " (1970=100)")], ...R_YRS.map(y => [y, ...keys.map(k => { const p = idxSeries(k).find(x => x[0] === y); return p ? p[1].toFixed(1) : ""; })])]); }
  if (b.dataset.rdl === "look" && rs.look) { const r = rs.look; download(`agora-medicare-${rs.type}-${r.code}.csv`, [["Code", "Description", "Year", "Services", "Avg billed charge", "Avg Medicare allowed", "Avg Medicare paid", "Allowed in office", "Allowed in facility"], ...Object.keys(r.years).sort().map(y => { const x = r.years[y]; return [r.code, r.desc, y, x.volume, x.charge?.toFixed(2), x.allowed?.toFixed(2), x.paid?.toFixed(2), x.office?.toFixed?.(2) ?? "", x.facility?.toFixed?.(2) ?? ""]; })]); }
  if (b.dataset.rdl === "set" && rs.setData) { const ys = [...new Set(rs.setData.flatMap(r => Object.keys(r.years || {})))].sort(); download(`agora-medicare-rates-${rs.set}.csv`, [["Code", "Description", ...ys.map(y => "Allowed " + y)], ...rs.setData.map(r => [r.code, r.desc || "", ...ys.map(y => r.years?.[y]?.allowed?.toFixed(2) ?? "")])]); }
});
document.addEventListener("submit", async e => {
  if (e.target.id !== "plForm") return; e.preventDefault();
  pl.zip = A.$("#plZip").value.trim(); pl.age = +A.$("#plAge").value; pl.income = +A.$("#plInc").value; A.store.set("zip", pl.zip);
  pl.loading = true; pl.err = null; A.$("#plOut").innerHTML = planOut();
  try { pl.data = await A.api(`plans?zip=${pl.zip}&age=${pl.age}&income=${pl.income}`); }
  catch (err) { pl.data = null; pl.err = err.user ? esc(err.message) + (/switched on/.test(err.message) ? " Meanwhile, compare plans at <a href='https://www.healthcare.gov/see-plans/' target='_blank' rel='noopener'>HealthCare.gov</a>." : "") : "Plan comparison runs on the live site. Meanwhile, compare plans at <a href='https://www.healthcare.gov/see-plans/' target='_blank' rel='noopener'>HealthCare.gov</a>."; }
  pl.loading = false; A.$("#plOut").innerHTML = planOut();
});
render();
})();
