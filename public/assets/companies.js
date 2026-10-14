/* Launch companies: 6 largest U.S. drugmakers + 6 largest U.S. health insurers.
   Every figure carries its source. Update yearly after proxy season (March–May). */
window.AGORA_COMPANIES = [
  // sector, ticker, name, CEO, 2025 CEO total comp ($M), median employee pay ($), CEO pay ratio, pay source,
  // enforcement: total penalties since 2000, records, top offense groups [[group, $, records]]
  { s:"pharma", t:"PFE",  name:"Pfizer",                ceo:"Albert Bourla",     pay:27.6, med:null,  ratio:null, paySrc:["BioPharma Dive, 2025 pharma CEO pay","https://www.biopharmadive.com/news/pharma-ceo-pay-2025-lilly-pfizer-abbie-gsk-jnj/817774/"],
    pen:11290643733, rec:109, vt:"pfizer", off:[["Safety",5637014255,15],["Health care",3394425000,11],["Government contracting",1207937502,22],["Competition",1028819452,20]] },
  { s:"pharma", t:"MRK",  name:"Merck & Co.",           ceo:"Robert Davis",      pay:20.8, med:null,  ratio:null, paySrc:["MarketScreener / Dow Jones, Merck 2025 proxy","https://www.marketscreener.com/news/merck-ceo-pay-falls-10-in-2025-due-to-lower-stock-option-awards-ce7e50dbda8bf221"],
    pen:10710431781, rec:90, vt:"merck", off:[["Safety",5427616750,9],["Financial",2301000000,2],["Health care",1391000000,6]] },
  { s:"pharma", t:"JNJ",  name:"Johnson & Johnson",     ceo:"Joaquin Duato",     pay:32.8, med:91000, ratio:null, paySrc:["BioPharma Dive, 2025 pharma CEO pay","https://www.biopharmadive.com/news/pharma-ceo-pay-2025-lilly-pfizer-abbie-gsk-jnj/817774/"],
    pen:25182910922, rec:82, vt:"johnson-and-johnson", off:[["Safety",15127228479,25],["Health care",8466011000,16],["Consumer protection",717161000,6]] },
  { s:"pharma", t:"ABBV", name:"AbbVie",                ceo:"Robert Michael",    pay:32.5, med:null,  ratio:null, paySrc:["BioPharma Dive, 2025 pharma CEO pay","https://www.biopharmadive.com/news/pharma-ceo-pay-2025-lilly-pfizer-abbie-gsk-jnj/817774/"],
    pen:7565094644, rec:86, vt:"abbvie", off:[["Health care",5397449298,16],["Competition",1647685912,29],["Government contracting",448190629,24]] },
  { s:"pharma", t:"LLY",  name:"Eli Lilly",             ceo:"David Ricks",       pay:36.7, med:125000, ratio:null, paySrc:["BioPharma Dive, 2025 pharma CEO pay","https://www.biopharmadive.com/news/pharma-ceo-pay-2025-lilly-pfizer-abbie-gsk-jnj/817774/"],
    pen:3014987327, rec:27, vt:"eli-lilly", off:[["Health care",1608100000,9],["Safety",1190000000,2],["Government contracting",185337651,2]] },
  { s:"pharma", t:"BMY",  name:"Bristol Myers Squibb",  ceo:"Christopher Boerner", pay:21.8, med:null, ratio:null, paySrc:["Forbes España, citing Fierce Pharma","https://forbes.es/health/957995/los-10-ceo-de-las-grandes-farmaceuticas-mejor-pagados-en-2025/"],
    pen:2968426217, rec:53, vt:"bristol-myers-squibb", off:[["Competition",956331200,17],["Health care",884500000,4],["Government contracting",470338719,7]] },

  { s:"health", t:"UNH", name:"UnitedHealth Group",     ceo:"Stephen Hemsley",   pay:60.95, med:81474, ratio:748, payNote:"Includes a one-time stock option grant tied to his 2025 return as CEO.", paySrc:["Becker's Payer Issues, CEO-to-worker pay ratios","https://www.beckerspayer.com/leadership/payers-ranked-by-ceo-to-worker-pay-ratios-3/"],
    pen:2706380016, rec:470, vt:"unitedhealth-group", off:[["Government contracting",1426135414,13],["Consumer protection",1014634705,400],["Employment",129021101,35]], maDenial:12.8 },
  { s:"health", t:"ELV", name:"Elevance Health",        ceo:"Gail Boudreaux",    pay:22.59, med:79007, ratio:286, paySrc:["Becker's Payer Issues, CEO-to-worker pay ratios","https://www.beckerspayer.com/leadership/payers-ranked-by-ceo-to-worker-pay-ratios-3/"],
    pen:1079425936, rec:606, vt:"elevance-health", off:[["Consumer protection",731456144,583],["Government contracting",327590707,8],["Employment",19428448,7]], maDenial:4.2 },
  { s:"health", t:"CVS", name:"CVS Health (Aetna)",     ceo:"David Joyner",      pay:21.23, med:63262, ratio:336, paySrc:["Becker's Payer Issues, CEO-to-worker pay ratios","https://www.beckerspayer.com/leadership/payers-ranked-by-ceo-to-worker-pay-ratios-3/"],
    pen:7173798035, rec:564, vt:"cvs-health", off:[["Health care",5702839616,34],["Government contracting",865996936,39],["Consumer protection",373886833,294]], maDenial:null },
  { s:"health", t:"CI",  name:"The Cigna Group",        ceo:"David Cordani",     pay:22.87, med:73674, ratio:310, paySrc:["Becker's Payer Issues, CEO-to-worker pay ratios","https://www.beckerspayer.com/leadership/payers-ranked-by-ceo-to-worker-pay-ratios-3/"],
    pen:886011339, rec:246, vt:"cigna", off:[["Government contracting",400697750,9],["Consumer protection",324755257,200],["Employment",93052532,21]], maDenial:null },
  { s:"health", t:"HUM", name:"Humana",                 ceo:"Jim Rechtin",       pay:18.76, med:82935, ratio:226, paySrc:["Becker's Payer Issues, CEO-to-worker pay ratios","https://www.beckerspayer.com/leadership/payers-ranked-by-ceo-to-worker-pay-ratios-3/"],
    pen:332187993, rec:93, vt:"humana", off:[["Government contracting",118750000,4],["Competition",100000000,1],["Consumer protection",73821205,64]], maDenial:5.8 },
  { s:"health", t:"CNC", name:"Centene",                ceo:"Sarah London",      pay:19.52, med:94800, ratio:206, paySrc:["Becker's Payer Issues, CEO-to-worker pay ratios","https://www.beckerspayer.com/leadership/payers-ranked-by-ceo-to-worker-pay-ratios-3/"],
    pen:1963691795, rec:255, vt:"centene", off:[["Government contracting",1133924319,20],["Consumer protection",303963225,201],["Employment",228242430,8]], maDenial:12.3 },
  { s:"health", t:"MOH", name:"Molina Healthcare", ceo:"Joseph Zubretsky", pay:18.34, med:80329, ratio:228, paySrc:["Becker's Payer Issues, CEO-to-worker pay ratios","https://www.beckerspayer.com/leadership/payers-ranked-by-ceo-to-worker-pay-ratios-3/"], pen:null, rec:null, vt:"molina-healthcare", off:[] },
  { s:"health", t:"OSCR", name:"Oscar Health", ceo:"Mark Bertolini", pay:null, med:null, ratio:null, paySrc:null, pen:null, rec:null, vt:null, off:[] },
  { s:"health", t:"ALHC", name:"Alignment Healthcare", ceo:"John Kao", pay:null, med:null, ratio:null, paySrc:null, pen:null, rec:null, vt:null, off:[] },
  { s:"health", t:"CLOV", name:"Clover Health", ceo:"Andrew Toy", pay:null, med:null, ratio:null, paySrc:null, pen:null, rec:null, vt:null, off:[] },
];
window.AGORA_SOURCES_CO = {
  vt: ["Good Jobs First, Violation Tracker (penalties since 2000)", "https://violationtracker.goodjobsfirst.org/top-100-parents"],
  ma: ["KFF: Medicare Advantage prior authorization, 2024", "https://www.kff.org/medicare/medicare-advantage-insurers-made-nearly-53-million-prior-authorization-determinations-in-2024/"],
  sec: t => ["SEC EDGAR filings", "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=&CIK=" + t + "&type=&dateb=&owner=include&count=40"],
};
/* Advisory shareholder ballot. Non-binding; tallies split self-identified shareholders from the public. */
window.AGORA_BALLOT = co => {
  const common = [
    ["pay",   "Approve the CEO's 2025 pay package", `${co.ceo}: ${co.pay ? "$" + co.pay + "M" : "see the proxy statement"}${co.ratio ? `, ${co.ratio}× the median employee` : ""}`],
    ["chair", "Require an independent board chair", "Separate the roles of CEO and chair of the board"],
    ["ceo",   `Re-elect ${co.ceo} to the board`, "Annual director election"],
  ];
  const sector = co.s === "pharma"
    ? [["price", "Tie executive bonuses to drug affordability", "Count U.S. list-price increases above inflation against annual bonuses"],
       ["grants", "Disclose public funding behind each product", "Report NIH and other federal funding used in developing each marketed drug"]]
    : [["denials", "Exclude savings from denied claims in executive bonuses", "Remove cost savings from claim and prior-authorization denials from bonus formulas"],
       ["appeals", "Publish denial and appeal-overturn rates by product", "Report denial rates and how often denials are reversed on appeal, every year"]];
  return [...common, ...sector].map(([k, t, d]) => ({key: `ballot:${co.t}:${k}`, t, d}));
};
/* Company list shared by Pharma and Health. Live prices fill in after render. */
window.AGORA_CO_TABLE = sector => {
  const A = Agora, list = AGORA_COMPANIES.filter(c => c.s === sector), S = AGORA_SOURCES_CO;
  const maxPen = Math.max(...list.map(c => c.pen || 0));
  return `<div class="card"><div class="card-h"><div><h3>${sector === "pharma" ? "The six largest U.S. drugmakers" : "Publicly traded U.S. health insurers"}</h3><div class="sub">CEO pay from 2026 proxy statements (2025 pay). Penalties are federal and state enforcement actions since 2000.</div></div><div class="right"><span class="live offline" data-live-badge>Prices load when live</span></div></div>
  <div class="tbl"><table><thead><tr><th>Company</th><th class="r">Share price</th><th class="r">1-year</th><th class="r">CEO pay 2025</th><th class="r">Penalties since 2000</th><th></th></tr></thead><tbody>
  ${list.map(c => `<tr><td><span class="strong">${A.esc(c.name)}</span><span class="tsub"><span class="tick">${c.t}</span> · CEO ${A.esc(c.ceo)}</span></td>
    <td class="r num" data-q-last="${c.t}">—</td><td class="r num" data-q-1y="${c.t}">—</td>
    <td class="r num">${c.pay ? `$${c.pay.toFixed(1)}M` : "—"}${c.ratio ? `<span class="tsub">${c.ratio}× median worker</span>` : ""}</td>
    <td class="r num">${c.pen ? `${A.big(c.pen)}<span class="tsub">${c.rec} records</span>` : `<span class="tsub">Not yet compiled</span>`}</td>
    <td class="r"><a class="btn sm ghost" href="/company/#${c.t}">Open</a></td></tr>`).join("")}
  </tbody></table></div>
  <div class="card-b">${A.hbars(list.filter(c => c.pen).sort((a, b) => b.pen - a.pen).map(c => [c.name, c.pen, "var(--s-otc)", A.big(c.pen)]), maxPen)}</div>
  <div class="card-f">Sources: ${A.src(S.vt)}; CEO pay from each company's proxy statement as reported by trade press (see each company page). Penalty totals include subsidiaries and are adjusted by Violation Tracker to avoid double counting.</div></div>`;
};
window.AGORA_FILL_QUOTES = async () => {
  const A = Agora, tick = [...new Set([...document.querySelectorAll("[data-q-last]")].map(e => e.dataset.qLast))]; if (!tick.length) return;
  try {
    const q = await A.api("quotes?t=" + tick.join(","));
    tick.forEach(t => { const x = q[t]; if (!x) return;
      document.querySelectorAll(`[data-q-last="${t}"]`).forEach(e => e.innerHTML = `${A.money(x.last)}<span class="tsub ${x.chg >= 0 ? "up" : "down"}">${A.pct(x.chg)} day</span>`);
      document.querySelectorAll(`[data-q-1y="${t}"]`).forEach(e => { e.textContent = x.chg1y == null ? "—" : A.pct(x.chg1y); e.className = "r num " + (x.chg1y >= 0 ? "up" : "down"); }); });
    if (Object.keys(q).length) document.querySelectorAll("[data-live-badge]").forEach(b => { b.className = "live"; b.textContent = "Live · end-of-day prices"; });
  } catch (e) {}
};
