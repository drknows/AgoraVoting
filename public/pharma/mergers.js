/* Pharmaceutical mergers: deal history, regulators' actions, and evidence on prices and access. Each entry is sourced. */
const M_SRC = {
  wiki: ["Wikipedia: List of largest pharmaceutical mergers and acquisitions", "https://en.wikipedia.org/wiki/List_of_largest_pharmaceutical_mergers_and_acquisitions"],
  ps25: ["PharmaShots: Top 20 M&A of 2025 by deal value", "https://pharmashots.com/31228/top-20-ma-of-2025-by-total-deal-value/"],
  bpd26: ["BioPharma Dive: Lilly, Gilead lead pharma's 2026 deal boom", "https://www.biopharmadive.com/news/lilly-gilead-lead-pharmas-deal-merger-drug-acquisition/819676/"],
  seagen: ["BioProcess International: Pfizer completes $43B Seagen deal", "https://bioprocessintl.com/deal-making/done-and-dusted-pfizer-completes-43bn-seagen-deal"],
  amgen: ["PharmExec: FTC and Amgen settle over Horizon acquisition", "https://www.pharmexec.com/view/ftc-amgen-reach-settlement-on-dispute-over-horizon-therapeutics-acquisition"],
  teva: ["FTC: Teva must divest 79 generic drugs (2016)", "https://search.ftc.gov/news-events/news/press-releases/2016/07/ftc-requires-teva-divest-over-75-generic-drugs-settle-competition-concerns-related-its-acquisition"],
  catalent: ["Pharma Manufacturing: Novo Holdings' $16.5B Catalent acquisition clears regulators", "https://www.pharmamanufacturing.com/industry-news/news/55249750/novo-holdings-165b-catalent-acquisition-fulfills-all-regulatory-closing-conditions"],
  killer: ["London Business School on Cunningham, Ederer & Ma, \"Killer Acquisitions\" (Journal of Political Economy, 2021)", "https://london.edu/think/iie-killing-innovation-in-the-pharmaceutical-industry"],
  generic: ["University of Florida on Dave et al., Annals of Internal Medicine (2017)", "https://ufhealth.org/news/2017/competition-goes-down-generic-drug-prices-rise-study-finds"],
  pfd: ["FTC: Pay-for-delay costs consumers $3.5 billion a year", "https://www.ftc.gov/node/47214"],
};
// era: "history" | "recent"; value in $ billions; drug = a product to look up in the drug search
const MERGERS = [
  {y: 2026, a: "Sun Pharma", t: "Organon", v: 11.75, area: "Women's health, biosimilars, established brands", note: "Largest purchase of a drugmaker by an India-based company.", src: "bpd26"},
  {y: 2025, a: "Johnson & Johnson", t: "Intra-Cellular Therapies", v: 14.6, area: "Psychiatry", drug: "Caplyta", note: "Caplyta was also one of 2025's top 10 most-advertised drugs on TV.", src: "ps25"},
  {y: 2025, a: "Novartis", t: "Avidity Biosciences", v: 12, area: "RNA medicines for neuromuscular disease", src: "ps25"},
  {y: 2025, a: "Merck & Co.", t: "Verona Pharma", v: 10, area: "COPD", drug: "Ohtuvayre", src: "ps25"},
  {y: 2025, a: "Pfizer", t: "Metsera", v: 10, area: "Obesity", src: "ps25"},
  {y: 2025, a: "Sanofi", t: "Blueprint Medicines", v: 9.5, area: "Rare immune disease", drug: "Ayvakit", src: "ps25"},
  {y: 2025, a: "Merck & Co.", t: "Cidara Therapeutics", v: 9.2, area: "Flu prevention", src: "ps25"},
  {y: 2025, a: "Mallinckrodt", t: "Endo", v: 6.7, area: "Generics and specialty drugs", drug: "Acthar", note: "Combines two generic-drug makers that both went through bankruptcy.", src: "ps25"},
  {y: 2025, a: "Novo Nordisk", t: "Akero Therapeutics", v: 5.2, area: "Fatty liver disease (MASH)", src: "ps25"},
  {y: 2024, a: "Novo Holdings", t: "Catalent", v: 16.5, area: "Contract drug manufacturing", drug: "Wegovy", note: "Novo Nordisk paid $11B for three Catalent fill-finish plants to make Ozempic and Wegovy. Eli Lilly, which relied on a Catalent site, and Sen. Elizabeth Warren raised competition concerns; the FTC cleared it after an extended review.", reg: "Cleared after FTC second request", src: "catalent"},
  {y: 2023, a: "Pfizer", t: "Seagen", v: 43, area: "Cancer (antibody-drug conjugates)", note: "FTC condition: Pfizer donates future U.S. royalties on Bavencio to cancer research.", reg: "Cleared with FTC condition", src: "seagen"},
  {y: 2023, a: "Amgen", t: "Horizon Therapeutics", v: 27.8, area: "Rare disease", drug: "Tepezza", note: "The FTC sued to block it, warning of rebate bundling. The settlement bars Amgen from bundling Tepezza or Krystexxa with its other drugs.", reg: "FTC lawsuit, then settlement", src: "amgen"},
  {y: 2020, a: "AbbVie", t: "Allergan", v: 63, area: "Aesthetics (Botox), neuroscience", drug: "Botox", src: "wiki"},
  {y: 2019, a: "Bristol Myers Squibb", t: "Celgene", v: 74, area: "Cancer, immunology", drug: "Revlimid", src: "wiki"},
  {y: 2018, a: "Takeda", t: "Shire", v: 62, area: "Rare disease, plasma therapies", src: "wiki"},
  {y: 2016, a: "Teva", t: "Allergan generics (Actavis)", v: 40.5, area: "Generics", note: "The FTC required Teva to sell 79 generic drugs to rival firms to keep competition in overlapping markets.", reg: "Cleared with 79 divestitures", src: "teva"},
  {y: 2009, a: "Pfizer", t: "Wyeth", v: 68, area: "Vaccines, biologics", drug: "Prevnar", src: "wiki"},
  {y: 2009, a: "Merck & Co.", t: "Schering-Plough", v: 47.1, area: "Broad portfolio", src: "wiki"},
  {y: 2009, a: "Roche", t: "Genentech", v: 44, area: "Cancer biologics", src: "wiki"},
  {y: 2004, a: "Sanofi", t: "Aventis", v: 73.5, area: "Broad portfolio", src: "wiki"},
  {y: 2002, a: "Pfizer", t: "Pharmacia", v: 64.3, area: "Broad portfolio", drug: "Celebrex", src: "wiki"},
  {y: 2000, a: "Glaxo Wellcome", t: "SmithKline Beecham (GSK)", v: 76, area: "Broad portfolio", src: "wiki"},
  {y: 2000, a: "Pfizer", t: "Warner-Lambert", v: 111.8, area: "Broad portfolio", drug: "Lipitor", note: "Pfizer gained full control of Lipitor, which became one of the best-selling drugs in history.", src: "wiki"},
];
const M_EFFECTS = [
  {h: "Fewer competitors, higher generic prices", stat: "+47% vs. −32%", sub: "least vs. most competitive generic markets", txt: "When mergers cut the number of companies making a generic drug, prices tend to rise. A study of 1,120 generics found prices in the least competitive markets were expected to rise 47%, while the most competitive fell 32%. Nearly half of generics had only about two makers.", src: "generic"},
  {h: "\"Killer acquisitions\"", stat: "5.3%–7.4%", sub: "of drug-company acquisitions", txt: "Some companies buy rivals' experimental drugs to shut them down rather than compete. Researchers estimate 5.3% to 7.4% of acquisitions fit that pattern. Deals just under the size that triggers antitrust review launched products 1.8% of the time, versus 9.1% just above it.", src: "killer"},
  {h: "Paying generics to wait", stat: "$3.5B a year", sub: "FTC estimate of consumer cost", txt: "Brand companies sometimes pay generic makers to delay cheaper versions (\"pay-for-delay\"). The FTC found these deals delayed generics by about 17 months on average.", src: "pfd"},
  {h: "Portfolio power and bundled rebates", stat: "FTC v. Amgen", sub: "2023", txt: "A larger portfolio lets a company offer insurers and pharmacy benefit managers rebates across many drugs at once, which can lock out rivals. The FTC's settlement barred Amgen from bundling two drugs it acquired.", src: "amgen"},
  {h: "Control of manufacturing", stat: "$16.5B", sub: "Catalent deal", txt: "When a drugmaker's affiliate buys a contract manufacturer, rivals that use the same plants can lose capacity, which can affect supply and shortages.", src: "catalent"},
  {h: "The industry's case", stat: "Scale", sub: "", txt: "Drugmakers argue that acquisitions fund late-stage trials small biotechs can't afford, speed approvals, and get new drugs to more patients through larger sales and manufacturing networks. Many recent deals buy one promising drug rather than combining two big companies.", src: null},
];
window.AgoraMergers = {
  page(A, badge) {
    const {esc} = A, S = k => A.src(M_SRC[k]);
    const recent = MERGERS.filter(m => m.y >= 2023).sort((a, b) => b.y - a.y || b.v - a.v);
    const big = MERGERS.slice().sort((a, b) => b.v - a.v).slice(0, 12);
    const row = m => `<tr><td class="num">${m.y}</td><td><span class="strong">${esc(m.a)}</span> buys <span class="strong">${esc(m.t)}</span><span class="tsub">${esc(m.area)}${m.note ? " · " + esc(m.note) : ""}</span></td><td class="r num">$${m.v}B</td><td>${m.reg ? `<span class="pill p-warn">${esc(m.reg)}</span>` : ""}${m.drug ? `<button class="link-btn" data-drugnav="${esc(m.drug)}" style="display:block;margin-top:4px">Price history: ${esc(m.drug)} →</button>` : ""}<span class="tsub">${S(m.src)}</span></td></tr>`;
    return A.hero("Agora Pharma · Mergers", "When drug companies combine", "Track major drugmaker mergers and acquisitions, what regulators required, and what the evidence says about effects on prices, new drugs and access to care.", ["Deals since 2000", "FTC actions", "Live SEC deal filings"]) +
    `<div class="content">
      <div class="card"><div class="card-h"><div><h3>How mergers can affect prices and access</h3><div class="sub">What research and regulators have found</div></div><div class="right">${badge}</div></div>
        <div class="card-b"><div class="grid">${M_EFFECTS.map(e => `<div class="stat"><div class="l">${esc(e.h)}</div><div class="v ${e.src ? "down" : ""}" style="font-size:1.15rem">${esc(e.stat)}</div><div class="s">${esc(e.sub)}</div><p style="font-size:.84rem;color:var(--ink-2);margin-top:6px">${esc(e.txt)}</p>${e.src ? `<p class="src">${S(e.src)}</p>` : ""}</div>`).join("")}</div></div></div>

      <div class="card"><div class="card-h"><div><h3>Recent deals, 2023 to today</h3><div class="sub">Announced value, including milestone payments where reported</div></div><div class="right">${badge}</div></div>
        <div class="tbl"><table><thead><tr><th>Year</th><th>Deal</th><th class="r">Value</th><th>Regulators · drug · source</th></tr></thead><tbody>${recent.map(row).join("")}</tbody></table></div></div>

      <div class="card"><div class="card-h"><div><h3>The largest drug-industry deals ever</h3><div class="sub">$ billions, announced value</div></div><div class="right">${badge}</div></div>
        <div class="card-b">${A.hbars(big.map(m => [`${esc(m.a)} + ${esc(m.t)} <span class="tsub">${m.y}</span>`, m.v, "var(--s-rx)", "$" + m.v + "B"]), big[0].v)}</div>
        <div class="tbl"><table><thead><tr><th>Year</th><th>Deal</th><th class="r">Value</th><th>Regulators · drug · source</th></tr></thead><tbody>${MERGERS.filter(m => m.y < 2023).sort((a, b) => b.y - a.y).map(row).join("")}</tbody></table></div></div>

      <div class="card"><div class="card-h"><div><h3>Latest merger filings by the drugmakers we track</h3><div class="sub">Completed acquisitions, tender offers and merger documents filed with the SEC</div></div><div class="right"><span class="live offline" id="dealLive">Live on the deployed site</span></div></div>
        <div id="dealOut"><div class="card-b"><p class="skel">Merger filings load from SEC EDGAR on the live site.</p></div></div>
        <div class="card-f">Filing types: 8-K item 2.01 (deal completed), SC TO-T (tender offer to buy another company's shares), S-4 and DEFM14A (merger documents for shareholders), 425 (merger communications). Want to weigh in on a pending deal? The FTC accepts public comments on proposed settlements at <a href="https://www.ftc.gov/legal-library/browse/cases-proceedings" target="_blank" rel="noopener">ftc.gov</a>.</div></div>
    </div>`;
  },
  async live(A) {
    const out = A.$("#dealOut"); if (!out) return;
    try {
      const d = await A.api("deals");
      A.$("#dealLive").className = "live"; A.$("#dealLive").textContent = "Live from SEC EDGAR";
      out.innerHTML = d.filings.length ? `<div class="tbl"><table><thead><tr><th>Filed</th><th>Company</th><th>What it is</th></tr></thead><tbody>${d.filings.map(f => `<tr><td class="num">${A.fmtDate(f.date)}</td><td><span class="tick">${f.t}</span></td><td><a href="${f.url}" target="_blank" rel="noopener">${A.esc(f.label)}</a></td></tr>`).join("")}</tbody></table></div>` : `<div class="card-b"><p class="skel">No merger filings in the last two years.</p></div>`;
    } catch (e) {}
  },
};
