/* Drug-level reference data that has no live API. Every entry carries its source. */
// CPI-U annual averages (BLS). 2026 = August 2026 index, the latest at build time.
const CPI_Y = {2013:232.957,2014:236.736,2015:237.017,2016:240.007,2017:245.120,2018:251.107,2019:255.657,2020:258.811,2021:270.970,2022:292.655,2023:304.702,2024:313.689,2025:322.35,2026:334.98};

// Estimated cost to manufacture, including a modest profit margin (published cost-of-production studies)
const MAKE_SRC = {
  barber24: ["Barber et al., JAMA Network Open 2024: Estimated sustainable cost-based prices for diabetes medicines", "https://msfaccess.org/jama-network-open-estimated-sustainable-cost-based-prices-diabetes-medicines"],
  yale24: ["Yale School of Medicine summary of Barber et al. 2024", "https://medicine.yale.edu/news-article/prices-of-expensive-diabetes-medicines-and-weight-loss-drugs-are-drastically-higher-than-production-costs"],
  hill17: ["Hill et al., BMJ Open 2017: Estimated generic prices of cancer medicines", "https://gabionline.net/generics/research/Generics-could-cut-costs-of-cancer-drugs-by-over-99"],
};
const MAKE = [
  {match: ["semaglutide", "liraglutide", "dulaglutide", "exenatide"], cls: "GLP-1 drugs (Ozempic, Wegovy, Victoza, Trulicity)", low: 0.75, high: 72.49, per: "month", note: "Range across GLP-1 drugs and doses, for a biosimilar version made at scale. U.S. list price cited in the study: $968.52 a month.", src: ["barber24", "yale24"]},
  {match: ["empagliflozin", "dapagliflozin", "ertugliflozin"], cls: "SGLT2 drugs (Jardiance, Farxiga)", low: 1.30, high: 3.45, per: "month", note: "Range across SGLT2 inhibitors other than canagliflozin.", src: ["barber24"]},
  {match: ["insulin"], cls: "Insulin", low: 50, high: 111, per: "year", note: "Per year with reusable pens: $50 (once-daily human insulin) to $111 (basal-bolus analogs).", src: ["barber24"]},
  {match: ["dasatinib"], cls: "Dasatinib (Sprycel)", low: 12, high: 12, per: "month", note: "Estimated £9.43 a month (about $12) to produce as a generic.", src: ["hill17"]},
  {match: ["gefitinib"], cls: "Gefitinib (Iressa)", low: 13, high: 13, per: "month", note: "Estimated £10.26 a month (about $13) to produce as a generic.", src: ["hill17"]},
];

// National TV advertising, 2025 (iSpot.TV estimates via Fierce Pharma)
const ADS_SRC = ["Fierce Pharma, using iSpot.TV estimates of 2025 national TV ad spend", "https://www.fiercepharma.com/marketing/abbvies-skyrizi-takes-full-year-tv-ad-spending-crown-yet-again-jjs-tremfya-hot-pursuit"];
const ADS = [["Skyrizi","AbbVie","risankizumab",439.6],["Tremfya","Johnson & Johnson","guselkumab",431.0],["Rinvoq","AbbVie","upadacitinib",376.4],["Wegovy","Novo Nordisk","semaglutide",298.1],["Dupixent","Sanofi & Regeneron","dupilumab",241.3],["Rexulti","Lundbeck & Otsuka","brexpiprazole",241.1],["Caplyta","Johnson & Johnson","lumateperone",185.7],["Jardiance","Boehringer Ingelheim & Eli Lilly","empagliflozin",171.5],["Zepbound","Eli Lilly","tirzepatide",160.1],["Vraylar","AbbVie","cariprazine",128.9]];

// Public and private funding behind specific drugs (beyond the live NIH search)
const FUNDING = [
  {drug: "Remdesivir (Veklury)", match: ["remdesivir"], co: "Gilead Sciences", kind: "Federal", amount: 70.5e6, what: "Department of Defense contracts ($34.5M) and NIH research and trials (about $36M), per Public Citizen, which calls it a floor.", src: ["Public Citizen: The Real Story of Remdesivir", "https://www.citizen.org/article/the-real-story-of-remdesivir/"]},
  {drug: "Xtandi (enzalutamide)", match: ["enzalutamide"], co: "Astellas / Pfizer", kind: "Federal", amount: null, what: "Discovered at UCLA with NIH and U.S. Army grants. U.S. price about $156,000 a year.", src: ["STAT: March-in rights and Xtandi", "https://www.statnews.com/2022/01/03/march-in-rights-protect-prostate-cancer-patients-from-excessive-drug-prices/"]},
  {drug: "Kalydeco (ivacaftor) and Vertex CF program", match: ["ivacaftor", "lumacaftor", "tezacaftor", "elexacaftor"], co: "Vertex Pharmaceuticals", kind: "Private", amount: 150e6, what: "The Cystic Fibrosis Foundation funded Vertex's cystic fibrosis drug program, then sold its royalty rights to Royalty Pharma for $3.3 billion in 2014.", src: ["Scientific American: Cystic fibrosis charity sells drug rights for $3.3 billion", "https://www.scientificamerican.com/article/cystic-fibrosis-charity-sells-drug-rights-to-pharma-for-3-3-billion/"]},
];
