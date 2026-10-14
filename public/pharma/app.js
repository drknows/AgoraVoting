/* Agora Pharma: what Americans pay for medicine, and who profits. */
(function () {
const A = Agora, {esc, money, pct, src, publicBadge: badge} = A, S = k => src(SOURCES[k]);
const TABS = [["prices","Drug Prices"],["save","Best Price"],["world","U.S. vs. World"],["grants","Who Paid for It"],["make","Cost to Make"],["marketing","Marketing"],["mergers","Mergers"],["share","Share of Health $"],["drugmakers","Drugmakers"],["polls","Polls"]];
A.chrome({product: "Pharma", tabs: TABS, active: "prices"});

/* derived */
const last = YRS.length - 1, iy = y => YRS.indexOf(y);
const RX_IDX = RX_CPI.map(v => v / RX_CPI[0] * 100), CPI_IDX = ALL_CPI.map(v => v / ALL_CPI[0] * 100);
const REAL_IDX = RX_IDX.map((v, i) => v / CPI_IDX[i] * 100);
const OTC_IDX = OTC_10.map(v => v * 10), CPI09_IDX = CPI_0925.map(v => v / CPI_0925[0] * 100);
const nheShare = NHE.map(([y, rx, t]) => [y, rx / t * 100]);
const cagr = (a, b, arr) => (Math.pow(arr[iy(b)] / arr[iy(a)], 1 / (b - a)) - 1) * 100;
const st = {view: "nominal", year: 1980, amt: 10, fed: null};

const P = {};
P.prices = () => {
  const nominal = st.view === "nominal";
  const chart = nominal
    ? A.yearChart([{color: "var(--s-cpi)", pts: YRS.map((y, i) => [y, CPI_IDX[i]]), dash: "6 4"}, {color: "var(--s-rx)", pts: YRS.map((y, i) => [y, RX_IDX[i]])}], {label: "Prescription drug prices vs all consumer prices, 1950 = 100", fmt: v => Math.round(v).toLocaleString(), marks: [[1980, "1980 turning point"], [2006, "Part D"]]})
    : A.yearChart([{color: "var(--s-rx)", pts: YRS.map((y, i) => [y, REAL_IDX[i]]), fill: true}], {label: "Inflation-adjusted prescription drug prices, 1950 = 100", fmt: v => Math.round(v), ref: 100, ymin: 0, marks: [[1980, "1980 low"]]});
  const ci = iy(+st.year), amt = +st.amt || 0, byCPI = amt * ALL_CPI[last] / ALL_CPI[ci], byRx = amt * RX_CPI[last] / RX_CPI[ci];
  const decades = [[1950,1960],[1960,1970],[1970,1980],[1980,1990],[1990,2000],[2000,2010],[2010,2020],[2020,2025]];
  const ctx = {1950:"Antibiotic era; prices fall as production scales",1960:"1962 Kefauver-Harris efficacy rules",1970:"Inflation surges; drug prices lag",1980:"1984 Hatch-Waxman creates modern generics; brand prices climb",1990:"Blockbuster era; TV drug ads allowed 1997",2000:"Medicare Part D launches 2006",2010:"Specialty drugs and biologics dominate spending",2020:"Inflation Reduction Act; first Medicare negotiated prices 2026"};
  return A.hero("Agora Pharma · Drug prices 1950 to present", "What a prescription costs, measured against everything else", "The Bureau of Labor Statistics has priced the same basket of prescriptions every year since 1947. Beside general inflation it tells two stories: medicines got cheaper in real terms for thirty years, then reversed course.",
    [`Since 1980: Rx ${pct((RX_CPI[last] / RX_CPI[iy(1980)] - 1) * 100)}`, `All prices ${pct((ALL_CPI[last] / ALL_CPI[iy(1980)] - 1) * 100)}`, `OTC since 2009: ${pct(OTC_IDX[OTC_IDX.length - 1] - 100)}`]) +
  `<div class="content">${A.installCard()}
    ${AgoraDrug.card()}
    <div class="sec-h">All prescription and over-the-counter drugs, 1950 to today</div>
    <div class="card"><div class="card-h"><div><h3>Prescription drug prices vs. general inflation</h3><div class="sub">${nominal ? "Both indexes set to 100 in 1950. Annual averages, every five years, then yearly from 2020." : "Rx price index divided by the all-items CPI. Above 100 means prescriptions cost more in real terms than in 1950."}</div></div>
      <div class="right">${badge}<div class="seg" role="group" aria-label="Chart view"><button data-view="nominal" aria-pressed="${nominal}">Nominal</button><button data-view="real" aria-pressed="${!nominal}">Inflation-adjusted</button></div></div></div>
      <div class="card-b">${nominal ? A.legend([["var(--s-rx)", "Prescription drugs (BLS CPI)"], ["var(--s-cpi)", "All consumer prices (CPI-U)"]]) : A.legend([["var(--s-rx)", "Real prescription drug price"], ["var(--ink-2)", "1950 level"]])}<div class="chart-wrap">${chart}</div>
      <div class="grid-tight">
        <div class="stat"><div class="l">1950 → 1980, real</div><div class="v up">${pct(REAL_IDX[iy(1980)] - 100)}</div><div class="s">Rx prices lagged inflation</div></div>
        <div class="stat"><div class="l">1980 → 2025, real</div><div class="v down">${pct((REAL_IDX[last] / REAL_IDX[iy(1980)] - 1) * 100)}</div><div class="s">Rx prices outran inflation</div></div>
        <div class="stat"><div class="l">1950 → 2025, nominal</div><div class="v">${(RX_CPI[last] / RX_CPI[0]).toFixed(1)}×</div><div class="s">All items: ${(ALL_CPI[last] / ALL_CPI[0]).toFixed(1)}×</div></div>
      </div></div>
      <div class="card-f"><span>Sources: ${S("rxcpi")}; ${S("cpi")}; ${S("cpi25")}. The 2025 all-items average is estimated from the 2.76% annual rate.</span></div></div>

    <div class="card"><div class="card-h"><div><h3>Decade by decade</h3><div class="sub">Average yearly price change</div></div><div class="right">${badge}</div></div>
      <div class="tbl"><table><thead><tr><th>Period</th><th class="r">Prescription drugs</th><th class="r">All prices</th><th class="r">Gap</th><th>What changed</th></tr></thead><tbody>
      ${decades.map(([a, b]) => { const r = cagr(a, b, RX_CPI), c = cagr(a, b, ALL_CPI), gap = r - c; return `<tr><td class="num">${a}–${b}</td><td class="r num">${pct(r)}</td><td class="r num">${pct(c)}</td><td class="r"><span class="pill ${gap > 0.3 ? "p-bad" : gap < -0.3 ? "p-good" : "p-neu"} num">${gap > 0 ? "+" : ""}${gap.toFixed(1)} pts</span></td><td class="tsub" style="font-size:.78rem">${ctx[a]}</td></tr>`; }).join("")}
      </tbody></table></div>
      <div class="card-f"><span>The BLS index follows the same products over time using retail prices. It does not fully capture launch prices of new drugs or confidential rebates, so it understates what new specialty drugs cost.</span></div></div>

    <div class="card"><div class="card-h"><div><h3>Year by year since 2020</h3><div class="sub">Annual change in prescription drug prices and in all prices</div></div><div class="right">${badge}</div></div>
      <div class="tbl"><table><thead><tr><th>Year</th><th class="r">Prescription drugs</th><th class="r">Inflation (all prices)</th><th class="r">Gap</th></tr></thead><tbody>
      ${YRS.map((y, i) => i && YRS[i - 1] === y - 1 ? [y, (RX_CPI[i] / RX_CPI[i - 1] - 1) * 100, (ALL_CPI[i] / ALL_CPI[i - 1] - 1) * 100] : null).filter(Boolean).map(([y, r, c]) => `<tr><td class="num">${y}</td><td class="r num">${pct(r)}</td><td class="r num">${pct(c)}</td><td class="r"><span class="pill ${r - c > 0.3 ? "p-bad" : r - c < -0.3 ? "p-good" : "p-neu"} num">${r - c > 0 ? "+" : ""}${(r - c).toFixed(1)} pts</span></td></tr>`).join("")}
      </tbody></table></div><div class="card-f">For earlier years, see the decade table above. Drug-by-drug yearly prices and inflation are in the lookup at the top of this page.</div></div>

    <div class="card"><div class="card-h"><div><h3>Price-of-a-prescription calculator</h3><div class="sub">What would a prescription bought in an earlier year cost in 2025?</div></div><div class="right">${badge}</div></div>
      <div class="card-b"><div class="calc">
        <div class="field"><label for="calcAmt">Price paid ($)</label><input class="input num" id="calcAmt" type="number" min="0" step="0.01" value="${esc(st.amt)}"></div>
        <div class="field"><label for="calcYear">Year</label><select class="input" id="calcYear">${YRS.slice(0, -1).map(y => `<option ${y == st.year ? "selected" : ""}>${y}</option>`).join("")}</select></div></div>
      <div class="calc-out">
        <div class="stat"><div class="l">If it rose with general inflation</div><div class="v">${money(byCPI)}</div><div class="s">All-items CPI</div></div>
        <div class="stat"><div class="l">What the Rx index says it costs</div><div class="v">${money(byRx)}</div><div class="s">Prescription drug CPI</div></div>
        <div class="stat"><div class="l">Difference</div><div class="v ${byRx > byCPI ? "down" : "up"}">${byRx > byCPI ? "+" : "−"}${money(Math.abs(byRx - byCPI))}</div><div class="s">${byRx > byCPI ? "Drugs outpaced inflation" : "Drugs lagged inflation"}</div></div>
      </div></div></div>

    <div class="grid">
      <div class="card"><div class="card-h"><div><h3>Over-the-counter medicines</h3><div class="sub">BLS nonprescription drug index, 2009 = 100</div></div><div class="right">${badge}</div></div>
        <div class="card-b">${A.legend([["var(--s-otc)", "OTC drugs"], ["var(--s-cpi)", "All prices"]])}<div class="chart-wrap">${A.yearChart([{color: "var(--s-cpi)", pts: OTC_YRS.map((y, i) => [y, CPI09_IDX[i]]), dash: "6 4"}, {color: "var(--s-otc)", pts: OTC_YRS.map((y, i) => [y, OTC_IDX[i]])}], {h: 240, x0: 2009, x1: 2025, xstep: 4, ymin: 80, fmt: v => Math.round(v), label: "OTC drug prices vs all prices since 2009"})}</div>
        <p class="src">OTC prices were flat or falling for a decade, then jumped about 16% from 2021 to 2024. Before 2009, BLS combined OTC drugs with medical supplies. ${S("otccpi")}</p></div></div>
      <div class="card"><div class="card-h"><div><h3>Brand-name vs. generic</h3><div class="sub">Average yearly retail cost of one chronic-use drug, 2017</div></div><div class="right">${badge}</div></div>
        <div class="card-b">${A.hbars([["Specialty drug", 78871, "var(--s-otc)", "$78,871"], ["Brand-name drug", 6798, "var(--s-rx)", "$6,798"], ["Generic drug", 365, "var(--s-gen)", "$365"]], 78871)}
        <div class="grid-tight"><div class="stat"><div class="l">2017 price change</div><div class="v down">+8.4%</div><div class="s">Brand-name</div></div><div class="stat"><div class="l">2017 price change</div><div class="v up">−9.3%</div><div class="s">Generic</div></div><div class="stat"><div class="l">Generic share</div><div class="v">90%</div><div class="s">of prescriptions; 12% of spending (2024)</div></div></div>
        <p class="src">General inflation in 2017 was 2.1%. ${S("aarp17")}; ${S("aam")}</p></div></div>
    </div>

    <div class="card"><div class="card-h"><div><h3>Medicare's first negotiated prices</h3><div class="sub">30-day supply: 2023 list price vs. 2026 Medicare price</div></div><div class="right">${badge}</div></div>
      <div class="tbl"><table><thead><tr><th>Drug</th><th>Maker</th><th class="r">2023 list</th><th class="r">2026 Medicare</th><th class="r">Cut</th></tr></thead><tbody>
      ${NEGOTIATED.map(([d, m, l, n]) => `<tr><td class="strong">${d}</td><td>${m}</td><td class="r num">$${l.toLocaleString()}</td><td class="r num">$${n.toLocaleString()}</td><td class="r"><span class="pill p-good num">−${Math.round((1 - n / l) * 100)}%</span></td></tr>`).join("")}
      </tbody></table></div><div class="card-f">Source: ${S("negotiated")}. Prices took effect January 1, 2026.</div></div>
  </div>`;
};

P.world = () => A.hero("Agora Pharma · U.S. vs. the world", "Same medicine, different price", "How U.S. prices for brand-name and generic drugs compare with 33 other wealthy countries. 100 means the same price; 400 means Americans pay four times as much.",
    ["RAND 2024, using 2022 data", "33 OECD countries", "U.S.: 62% of sales, 24% of volume"]) +
  `<div class="content">
    <div class="card"><div class="card-h"><div><h3>U.S. price as a percentage of other countries' prices</h3><div class="sub">Manufacturer gross prices. The dark tick marks price parity (100).</div></div><div class="right">${badge}</div></div>
      <div class="card-b">${A.hbars(RAND.map(([l, v, k, d]) => [l, v, k === "generic" ? "var(--s-gen)" : k === "brand" ? "var(--s-otc)" : k === "country" ? "var(--s-cpi)" : "var(--s-rx)", d || v]), 1100, 100)}
      <div class="grid-tight"><div class="stat"><div class="l">Brand-name drugs</div><div class="v down">4.22×</div><div class="s">U.S. vs. other countries</div></div><div class="stat"><div class="l">Generics</div><div class="v up">0.67×</div><div class="s">Americans pay less</div></div><div class="stat"><div class="l">After rebates</div><div class="v down">3×+</div><div class="s">brand-name, still</div></div></div>
      <p class="src">France and Japan generally have the lowest prices among comparison countries; Canada, Germany and the United Kingdom tend to be higher. Sources: ${S("rand")}; ${S("rand2")}.</p></div></div>
    <div class="notice"><span class="bar"></span><div><b>Why the gap?</b> Most wealthy countries negotiate a single national price for each drug. Until 2026, Medicare was barred from negotiating; private insurers and pharmacy benefit managers negotiate separately and confidentially. Generics are cheaper in the U.S. because many manufacturers compete on price once a patent expires.</div></div>
  </div>`;

P.grants = () => A.hero("Agora Pharma · Who paid for it", "What the public paid before the price tag", "Federal research money helps discover almost every new drug, and foundations fund more. Look up any drug to see the National Institutes of Health grants behind it, see documented private funding, and list federal grants and contracts paid to each company.",
    ["NIH: $187B behind 2010–2019 approvals", "354 of 356 approvals had NIH-linked funding", "Live NIH RePORTER search"]) +
  `<div class="content">
    <div class="card"><div class="card-h"><div><h3>Look up NIH funding for a drug</h3><div class="sub">Searches NIH RePORTER, the government's database of every NIH grant since 1985</div></div><div class="right"><span class="live offline" id="nihLive">Live on the deployed site</span></div></div>
      <div class="card-b"><form id="nihForm" class="calc"><div class="field" style="grid-column:span 2"><label for="nihQ">Drug, ingredient or target</label><input class="input" id="nihQ" placeholder="e.g. enzalutamide, semaglutide, PD-1" required maxlength="80"></div><div><button class="btn" type="submit">Search grants</button></div></form>
      <div id="nihOut"><p class="src">Try <button class="link-btn" data-nih="enzalutamide">enzalutamide</button> · <button class="link-btn" data-nih="remdesivir">remdesivir</button> · <button class="link-btn" data-nih="semaglutide">semaglutide</button> · <button class="link-btn" data-nih="CAR-T">CAR-T</button></p></div></div>
      <div class="card-f">Results count projects whose title, abstract or terms mention your search. Basic research on a drug's target is often funded under other names, so totals are a floor, not a full accounting. Source: <a href="https://reporter.nih.gov/" target="_blank" rel="noopener">NIH RePORTER</a>.</div></div>

    <div class="card"><div class="card-h"><div><h3>Documented funding behind specific drugs</h3><div class="sub">Federal and private (foundation and nonprofit) money</div></div><div class="right">${badge}</div></div>
      <div class="tbl"><table><thead><tr><th>Drug</th><th>Company</th><th>Type</th><th class="r">Amount</th></tr></thead><tbody>
      ${FUNDING.map(f => `<tr><td><span class="strong">${esc(f.drug)}</span><span class="tsub">${esc(f.what)} ${A.src(f.src)}</span></td><td>${esc(f.co)}</td><td><span class="pill ${f.kind === "Private" ? "p-warn" : "p-acc"}">${f.kind}</span></td><td class="r num">${f.amount ? A.big(f.amount) : "—"}</td></tr>`).join("")}
      </tbody></table></div><div class="card-f">No public database tracks private grants to drug development. This list grows as funding is documented; send sources to corrections@agorasocietystands.com.</div></div>

    <div class="card"><div class="card-h"><div><h3>Federal money paid to each company</h3><div class="sub">Largest grants and contracts since fiscal 2009, from USAspending.gov</div></div><div class="right"><span class="live offline" id="fedLive">Live on the deployed site</span></div></div>
      <div class="card-b"><div class="picker" role="group" aria-label="Choose company">${AGORA_COMPANIES.map(c => `<button data-fed="${c.t}" aria-pressed="${st.fed === c.t}">${c.t}</button>`).join("")}</div><div id="fedOut"><p class="skel">Choose a company.</p></div></div>
      <div class="card-f">Contracts include vaccine and drug purchases as well as research. Insurers' totals exclude Medicare and Medicaid premium payments, which are not federal awards. Source: <a href="https://www.usaspending.gov/search" target="_blank" rel="noopener">USAspending.gov</a>.</div></div>

    <div class="card"><div class="card-h"><div><h3>Public money behind a decade of new drugs</h3><div class="sub">FDA approvals 2010–2019</div></div><div class="right">${badge}</div></div>
      <div class="card-b"><div class="grid-tight">
        <div class="stat"><div class="l">NIH investment</div><div class="v">$187B</div><div class="s">83% basic research on drug targets</div></div>
        <div class="stat"><div class="l">Drugs with NIH funding</div><div class="v">354 / 356</div><div class="s">About 99%</div></div>
        <div class="stat"><div class="l">Per first-in-class drug</div><div class="v">$1.4B</div><div class="s">$1.7B at a 3% discount rate</div></div>
        <div class="stat"><div class="l">Industry spend per drug</div><div class="v">$1.5B</div><div class="s">Tufts CSDD estimate</div></div>
      </div><p class="src">Source: ${S("nih")}.</p></div></div>
    <div class="grid">
      <div class="card"><div class="card-h"><div><h3>Remdesivir</h3><div class="sub">COVID-19 antiviral · Gilead Sciences</div></div><div class="right">${badge}</div></div>
        <div class="card-b"><div class="grid-tight"><div class="stat"><div class="l">Federal funding</div><div class="v">≥ $70.5M</div><div class="s">DoD $34.5M, NIH about $36M</div></div><div class="stat"><div class="l">2020 U.S. price</div><div class="v">$3,120</div><div class="s">per course, private insurance</div></div></div><p class="src">Public Citizen's estimate, which it calls a floor. ${S("remdesivir")}</p></div></div>
      <div class="card"><div class="card-h"><div><h3>Xtandi (enzalutamide)</h3><div class="sub">Prostate cancer · Astellas Pharma</div></div><div class="right">${badge}</div></div>
        <div class="card-b"><div class="grid-tight"><div class="stat"><div class="l">Discovered with</div><div class="v" style="font-size:1rem">NIH + U.S. Army grants</div><div class="s">at UCLA</div></div><div class="stat"><div class="l">U.S. price</div><div class="v">$156K/yr</div><div class="s">about 5× the Japanese price</div></div></div><p class="src">Petitions asking the government to use its patent rights were declined or stalled. ${S("xtandi")}</p></div></div>
    </div>
  </div>`;

P.share = () => {
  const rx23 = 449.7, med23 = 1029.8, priv23 = 1464.6;
  return A.hero("Agora Pharma · Share of the health-care dollar", "How much of America's health spending goes to drugs", "Retail prescription spending as a share of all national health spending, and who pays: Medicare, private insurers, or patients at the pharmacy counter.",
    ["2024 retail Rx: $467.0B", "Total health spending: $5.3T", "Medicare benefits 2025: $1.2T"]) +
  `<div class="content">
    <div class="card"><div class="card-h"><div><h3>Retail prescriptions as a share of national health spending</h3><div class="sub">Percent of total national health expenditures</div></div><div class="right">${badge}</div></div>
      <div class="card-b"><div class="chart-wrap">${A.yearChart([{color: "var(--s-rx)", pts: nheShare, fill: true}], {label: "Retail prescription share of national health expenditures, 1960 to 2024", fmt: v => v.toFixed(0) + "%", ymin: 0, marks: [[1984, "Hatch-Waxman"], [2006, "Part D"]]})}</div>
      <div class="tbl"><table><thead><tr><th>Year</th>${NHE.map(n => `<th class="r">${n[0]}</th>`).join("")}</tr></thead><tbody>
        <tr><td class="strong">Retail Rx ($B)</td>${NHE.map(n => `<td class="r num">${n[1].toLocaleString()}</td>`).join("")}</tr>
        <tr><td class="strong">All health ($B)</td>${NHE.map(n => `<td class="r num">${Math.round(n[2]).toLocaleString()}</td>`).join("")}</tr>
        <tr><td class="strong">Rx share</td>${nheShare.map(n => `<td class="r num">${n[1].toFixed(1)}%</td>`).join("")}</tr></tbody></table></div></div>
      <div class="card-f"><span>Sources: ${S("nhe")}; ${S("nhe24")}; CMS NHE highlights for 2022–2023. Retail only: drugs given in hospitals and doctors' offices are counted under those services, so the full drug share is higher.</span></div></div>
    <div class="card"><div class="card-h"><div><h3>Who pays at the pharmacy</h3><div class="sub">Share of U.S. retail prescription spending by payer</div></div><div class="right">${badge}</div></div>
      <div class="card-b">${PAYER_HIST.map(([who, pts]) => `<div><div class="strong" style="font-size:.86rem;margin-bottom:6px">${who}</div>${A.hbars(pts.map(([y, v]) => [y, v, who.startsWith("Medicare") ? "var(--s-rx)" : who.startsWith("Private") ? "var(--s-gen)" : "var(--s-otc)", v + "%"]), 100)}</div>`).join("")}</div>
      <div class="card-f">Source: ${S("payer")} (CMS NHE). In 1973 patients paid 79% of drug costs directly; Medicare became a major payer when Part D began in 2006.</div></div>
    <div class="grid">
      <div class="card"><div class="card-h"><div><h3>Inside the Medicare budget</h3><div class="sub">2025 benefit spending, $1.2 trillion</div></div><div class="right">${badge}</div></div>
        <div class="card-b"><div class="stack" role="img" aria-label="Part B 48%, Part A 37%, Part D 15%"><span style="width:48%;background:var(--s-cpi)">Part B 48%</span><span style="width:37%;background:var(--muted)">Part A 37%</span><span style="width:15%;background:var(--s-rx)">Part D 15%</span></div>
        <p style="font-size:.86rem;color:var(--ink-2)">Part D, the outpatient drug benefit, took 15% of Medicare benefits in 2025, up from 12–13% for most of the last decade. Drugs given in doctors' offices add another 8% of traditional Medicare Part A and B spending.</p><p class="src">Source: ${S("medicare")}</p></div></div>
      <div class="card"><div class="card-h"><div><h3>Drugs' share of each payer's budget, 2023</h3><div class="sub">Agora estimate: payer's share of retail Rx ÷ payer's total spending</div></div><div class="right">${badge}</div></div>
        <div class="card-b">${A.hbars([["Medicare", rx23 * 0.32 / med23 * 100, "var(--s-rx)", (rx23 * 0.32 / med23 * 100).toFixed(1) + "%"], ["Private insurance", rx23 * 0.39 / priv23 * 100, "var(--s-gen)", (rx23 * 0.39 / priv23 * 100).toFixed(1) + "%"], ["All health spending", rx23 / 4866.5 * 100, "var(--s-cpi)", (rx23 / 4866.5 * 100).toFixed(1) + "%"]], 20)}
        <p class="src">Uses 2023 retail Rx of $449.7B, Medicare $1,029.8B and private insurance $1,464.6B (CMS NHE), with payer shares of 32% and 39% from ${S("payer")}.</p></div></div>
    </div></div>`;
};

P.save = () => A.hero("Agora Pharma · Best price", "Pay less for the same medicine", "The same prescription can cost five or ten times more at one pharmacy than another. Check coupons, discount cards and mail-order pharmacies, see what neighbors paid, and share your own price.",
    ["Brand-name & generic", "Prescription & over-the-counter", "Prices by ZIP code"]) + `<div class="content">${AgoraBest.card()}</div>`;

P.make = () => A.hero("Agora Pharma · Cost to make", "What medicines cost to manufacture", "Researchers estimate production costs from the price of raw ingredients plus manufacturing, packaging and a profit margin. The gap between that cost and U.S. prices is mostly patents, market power and what buyers will pay.",
    ["Published, peer-reviewed estimates", "Includes a profit margin"]) +
  `<div class="content"><div class="card"><div class="tbl"><table><thead><tr><th>Drug or class</th><th class="r">Estimated cost to make</th><th>Notes</th></tr></thead><tbody>
    ${MAKE.map(m => `<tr><td class="strong">${esc(m.cls)}</td><td class="r num">${m.low === m.high ? money(m.low) : money(m.low) + "–" + money(m.high)}<span class="tsub">per ${m.per}</span></td><td style="font-size:.84rem">${esc(m.note)}<span class="tsub">${m.src.map(k => A.src(MAKE_SRC[k])).join("; ")}</span></td></tr>`).join("")}
  </tbody></table></div><div class="card-f">For generics sold by many competing manufacturers, the pharmacy acquisition cost shown in the drug lookup is close to the cost of making the drug plus a small margin. Estimates for more drugs are added as studies are published.</div></div>
  <div class="notice"><span class="bar"></span><div><b>What production cost leaves out.</b> Drugmakers point to research spending, failed trials and the cost of capital, often estimated at $1–2 billion per approved drug. See <a href="#grants">Who Paid for It</a> for how much of that research the public funded.</div></div></div>`;

P.marketing = () => {
  const max = ADS[0][3];
  return A.hero("Agora Pharma · Marketing", "What drugmakers spend to sell medicine", "Two public windows into drug marketing: national TV advertising aimed at patients, and payments to doctors for meals, speaking, consulting and travel, which drugmakers must report to Medicare's Open Payments program.",
    ["Top 10 TV advertisers: $2.67B in 2025", "Open Payments: every payment to doctors"]) +
  `<div class="content"><div class="card"><div class="card-h"><div><h3>Top drugs by national TV ad spending, 2025</h3><div class="sub">$ millions, estimated</div></div><div class="right">${badge}</div></div>
    <div class="card-b">${A.hbars(ADS.map(([d, c, g, v]) => [`${d} <span class="tsub">${esc(c)}</span>`, v, "var(--s-otc)", "$" + v.toFixed(1) + "M"]), max)}<p class="src">Source: ${A.src(ADS_SRC)}.</p></div></div>
  <div class="card"><div class="card-h"><div><h3>Payments to doctors, by drug</h3><div class="sub">Look up any drug above; its Open Payments total appears under Marketing in the result</div></div></div>
    <div class="card-b"><p style="font-size:.88rem;color:var(--ink-2)">Since 2013, drug and device makers must report almost every payment to doctors and teaching hospitals, with the product it relates to. Search any doctor, company or drug at the source.</p>
    <div class="co-row"><a class="card co-link" href="https://openpaymentsdata.cms.gov/" target="_blank" rel="noopener"><span class="n">CMS Open Payments ↗</span><span class="s">Official search by doctor, company or drug</span></a><a class="card co-link" href="https://projects.propublica.org/docdollars/" target="_blank" rel="noopener"><span class="n">ProPublica Dollars for Docs ↗</span><span class="s">Totals by drug and doctor</span></a><a class="card co-link" href="#prices" data-focus-search="1"><span class="n">Look up a drug</span><span class="s">Payments, ads, prices and funding together</span></a></div></div></div></div>`;
};

P.mergers = () => AgoraMergers.page(A, badge);

P.drugmakers = () => A.hero("Agora Pharma · Drugmakers", "Who profits", "Share prices, CEO pay and enforcement records for the six largest U.S. drugmakers. Open a company for insider trades from SEC filings and the shareholder ballot.", ["Live SEC insider filings", "Advisory shareholder votes", "Penalties since 2000"]) +
  `<div class="content">${AGORA_CO_TABLE("pharma")}</div>`;

P.polls = () => A.hero("Agora Pharma · Polls", "What patients and the public think", "Vote on drug-pricing questions or start your own poll. One vote per device; results update live.", []) + `<div class="content" id="pollsMount"></div>`;

/* render + routing */
function render() {
  let id = location.hash.slice(1); if (!P[id]) id = "prices";
  A.setTab(id);
  A.$("#main").innerHTML = P[id]();
  if (id === "drugmakers") AGORA_FILL_QUOTES();
  if (id === "polls") AgoraPolls.mount(A.$("#pollsMount"), "pharma");
  if (id === "grants" && st.fed) fed(st.fed);
  if (id === "mergers") AgoraMergers.live(A);
}
async function fed(t) {
  st.fed = t; document.querySelectorAll("[data-fed]").forEach(b => b.setAttribute("aria-pressed", b.dataset.fed === t));
  const out = A.$("#fedOut"); out.innerHTML = `<p class="skel">Loading federal awards for ${t}…</p>`;
  try {
    const r = await A.api("federal?t=" + t); A.$("#fedLive").className = "live"; A.$("#fedLive").textContent = "Live";
    const rows = (list, kind) => list.length ? `<div class="tbl"><table><thead><tr><th>${kind}</th><th>Agency</th><th class="r">Start</th><th class="r">Amount</th></tr></thead><tbody>${list.map(a => `<tr><td>${a.url ? `<a href="${a.url}" target="_blank" rel="noopener">${esc((a.desc || a.id || "").slice(0, 110))}</a>` : esc(a.desc || a.id)}<span class="tsub">${esc(a.recipient)}</span></td><td class="tsub" style="font-size:.8rem">${esc(a.agency || "")}</td><td class="r num">${a.start ? a.start.slice(0, 4) : ""}</td><td class="r num">${A.big(a.amount)}</td></tr>`).join("")}</tbody></table></div>` : `<p class="skel">No ${kind.toLowerCase()}s found.</p>`;
    out.innerHTML = `<div class="grid-tight"><div class="stat"><div class="l">Grants (largest ${r.grantN})</div><div class="v">${A.big(r.grantTotal)}</div></div><div class="stat"><div class="l">Contracts (largest ${r.contractN})</div><div class="v">${A.big(r.contractTotal)}</div></div></div>${rows(r.grants, "Grant")}${rows(r.contracts, "Contract")}`;
  } catch (e) { out.innerHTML = `<p class="skel">${e.user ? esc(e.message) : "Federal award lists load on the live site."} <a href="https://www.usaspending.gov/search" target="_blank" rel="noopener">Search USAspending.gov</a></p>`; }
}
window.addEventListener("hashchange", () => { render(); window.scrollTo({top: 0}); });
document.addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.dataset.view) { st.view = b.dataset.view; render(); }
  if (b.dataset.nih) { A.$("#nihQ").value = b.dataset.nih; nih(b.dataset.nih); }
  if (b.dataset.fed) fed(b.dataset.fed);
  if (b.dataset.drug) AgoraDrug.run(b.dataset.drug, render);
  if (b.dataset.nihDrug) nih(b.dataset.nihDrug, "#drugNih");
});
document.addEventListener("change", e => { if (e.target.id === "calcYear") { st.year = +e.target.value; render(); } if (e.target.id === "pairSel") AgoraDrug.setPair(+e.target.value, render); });
document.addEventListener("click", e => {
  const a = e.target.closest("[data-best]"); if (a) { e.preventDefault(); location.hash = "save"; AgoraBest.find(a.dataset.best, A.store.get("zip", ""), render); }
  const dn = e.target.closest("[data-drugnav]"); if (dn) { e.preventDefault(); location.hash = "prices"; setTimeout(() => { AgoraDrug.run(dn.dataset.drugnav, render); A.$("#drugSearch")?.scrollIntoView(); }, 30); return; }
  const f = e.target.closest("[data-focus-search]"); if (f) setTimeout(() => A.$("#drugQ")?.focus(), 50);
});
document.addEventListener("input", e => { if (e.target.id === "calcAmt") { st.amt = e.target.value; clearTimeout(render.h); render.h = setTimeout(() => { render(); const el = A.$("#calcAmt"); if (el) { el.focus(); const n = el.value.length; try { el.setSelectionRange(n, n); } catch (x) {} } }, 400); } });
document.addEventListener("submit", e => {
  const id = e.target.id; if (!["nihForm", "drugForm", "bestForm", "repForm"].includes(id)) return; e.preventDefault();
  if (id === "nihForm") nih(A.$("#nihQ").value.trim());
  if (id === "drugForm") AgoraDrug.run(A.$("#drugQ").value.trim(), render);
  if (id === "bestForm") AgoraBest.find(A.$("#bestDrug").value.trim(), A.$("#bestZip").value.trim(), render);
  if (id === "repForm") AgoraBest.report(e.target, render);
});
async function nih(q, target) {
  if (!q) return; const out = A.$(target || "#nihOut"); if (!out) return; out.innerHTML = `<p class="skel">Searching NIH RePORTER for “${esc(q)}”…</p>`;
  try {
    const r = await A.api("nih?q=" + encodeURIComponent(q));
    if (A.$("#nihLive")) { A.$("#nihLive").className = "live"; A.$("#nihLive").textContent = "Live"; }
    out.innerHTML = `<div class="grid-tight">
      <div class="stat"><div class="l">NIH projects</div><div class="v">${r.projects.toLocaleString()}</div><div class="s">mentioning “${esc(q)}”</div></div>
      <div class="stat"><div class="l">Total awarded</div><div class="v">${A.big(r.total)}</div><div class="s">${r.sampled < r.projects ? `across the ${r.sampled.toLocaleString()} largest awards` : "all matching awards"}</div></div>
      <div class="stat"><div class="l">Years</div><div class="v">${r.from ?? "—"}–${r.to ?? "—"}</div><div class="s">fiscal years</div></div>
      <div class="stat"><div class="l">Per U.S. resident</div><div class="v">${money(r.total / 341e6)}</div><div class="s">÷ 341M people</div></div></div>
      ${r.top?.length ? `<div class="tbl"><table><thead><tr><th>Largest awards</th><th>Organization</th><th class="r">FY</th><th class="r">Amount</th></tr></thead><tbody>${r.top.map(p => `<tr><td>${esc(p.title)}</td><td class="tsub" style="font-size:.8rem">${esc(p.org)}</td><td class="r num">${p.fy}</td><td class="r num">${A.big(p.amount)}</td></tr>`).join("")}</tbody></table></div>` : ""}
      <p class="src"><a href="${r.url}" target="_blank" rel="noopener">See every project on NIH RePORTER</a></p>`;
  } catch (err) {
    out.innerHTML = `<p class="skel">${err.user ? esc(err.message) : "Grant search runs on the live site at AgoraSocietyStands.com. In this preview you can still search directly on"} <a href="https://reporter.nih.gov/search" target="_blank" rel="noopener">NIH RePORTER</a>.</p>`;
  }
}
render();
})();
