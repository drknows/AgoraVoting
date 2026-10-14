/* ───────────────────────── REAL PUBLIC DATA (sourced) ───────────────────────── */
// BLS CPI-U, Prescription drugs (annual avg, 1982-84=100) derived from in2013dollars buying-power table ($10 in 1949 = index 42.175)
// BLS CPI-U, All items (annual avg, 1982-84=100); 2025 = 2024 × 1.0276 (officialdata.org 2025 inflation rate)
const YRS   = [1950,1955,1960,1965,1970,1975,1980,1985,1990,1995,2000,2005,2010,2015,2020,2021,2022,2023,2024,2025];
const RX_10 = [10.23,11.25,12.82,11.35,11.23,12.13,17.18,28.48,43.08,55.73,67.68,82.75,96.70,113.65,126.16,123.86,126.60,130.28,132.05,134.70];
const RX_CPI = RX_10.map(v => +(v*4.2175).toFixed(2));
const ALL_CPI = [24.1,26.8,29.6,31.5,38.8,53.8,82.4,107.6,130.7,152.4,172.2,195.3,218.056,237.017,258.811,270.970,292.655,304.702,313.689,322.35];
// BLS CPI-U, Nonprescription drugs (series begins 2009; 2009 = 100 via $10 buying-power table)
const OTC_YRS = [2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025];
const OTC_10  = [10.00,10.00,9.86,9.93,9.94,9.85,9.78,9.66,9.74,9.69,9.73,9.64,9.59,10.01,10.66,11.10,10.97];
const CPI_0925 = [214.537,218.056,224.939,229.594,232.957,236.736,237.017,240.007,245.120,251.107,255.657,258.811,270.970,292.655,304.702,313.689,322.35];

// CMS National Health Expenditures: retail prescription drugs vs total NHE, $ billions
const NHE = [
  [1960, 2.7, 27.2],[1970, 5.5, 74.6],[1980, 12.0, 255.3],[1990, 40.3, 721.4],[2000, 121.0, 1369.1],
  [2009, 252.7, 2495.4],[2015, 324.5, 3200.8],[2016, 328.6, 3337.2],[2022, 405.9, 4464.4],
  [2023, 449.7, 4866.5],[2024, 467.0, 5300.0]
];
// Who pays for retail prescriptions (share of retail Rx spending) — CMS NHE via Drug Channels
const PAYER_HIST = [
  ["Consumers out of pocket", [["1973",79],["2023",13],["2033 proj.",11]]],
  ["Medicare", [["2005",2],["2006 (Part D starts)",18],["2023",32],["2033 proj.",33]]],
  ["Private insurance", [["2001 (peak)",50],["2023",39],["2033 proj.",41]]],
];
// 2024 NHE by payer, $ billions (CMS 2024 highlights)
const NHE24 = { total:5300, rx:467.0, medicare:1100, medicaid:931.7, private:1600, oop:556.6, hospital:1600, physician:1100 };

// RAND 2024 (2022 data): U.S. price as % of comparison-country price
const RAND = [
  ["All drugs, 33 OECD countries", 278, "all"],
  ["Brand-name originator drugs", 422, "brand"],
  ["Brand-name, after estimated U.S. rebates", 300, "brand", "more than 3×"],
  ["Unbranded generics", 67, "generic"],
  ["vs. Canada (all drugs)", 229, "country"],
  ["vs. Mexico (all drugs, lowest gap)", 172, "country"],
  ["vs. Turkey (all drugs, highest gap)", 1028, "country"],
];

// CMS Medicare Drug Price Negotiation, first 10 drugs (effective Jan 1, 2026), 30-day supply
const NEGOTIATED = [
  ["Januvia","Merck",527,113],["Fiasp / NovoLog","Novo Nordisk",495,119],["Farxiga","AstraZeneca",556,178],
  ["Enbrel","Immunex (Amgen)",7106,2355],["Jardiance","Boehringer Ingelheim",573,197],["Stelara","Janssen",13836,4695],
  ["Xarelto","Janssen",517,197],["Eliquis","Bristol Myers Squibb",521,231],["Entresto","Novartis",628,295],["Imbruvica","AbbVie & Janssen",14934,9319],
];

const SOURCES = {
  rxcpi: ["BLS CPI, Prescription drugs (via in2013dollars)", "https://www.in2013dollars.com/Prescription-drugs/price-inflation/1949"],
  otccpi: ["BLS CPI, Nonprescription drugs (via officialdata.org)", "https://www.officialdata.org/Nonprescription-drugs/price-inflation"],
  cpi: ["BLS CPI-U annual averages (Vermont LMI table)", "https://vtlmi.labor.vermont.gov/cpi.htm"],
  cpi25: ["U.S. inflation rate in 2025 (officialdata.org)", "https://www.officialdata.org/inflation-rate-in-2025"],
  nhe: ["CDC Health, United States 2017, Table 94 (CMS NHE)", "https://www.cdc.gov/nchs/data/hus/2017/094.pdf"],
  nhe24: ["CMS National Health Expenditures 2024 highlights", "https://www.cms.gov/files/document/highlights.pdf"],
  payer: ["Drug Channels: Who will pay for prescription drugs", "https://www.drugchannels.net/2025/12/who-will-pay-for-prescription-drugs-in.html"],
  medicare: ["KFF: 2026 Medicare Trustees Report key facts", "https://www.kff.org/medicare/key-facts-about-medicare-spending-trends-and-projections-from-the-2026-medicare-trustees-report/"],
  rand: ["RAND Health Quarterly: International Prescription Drug Price Comparisons (2022 data)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC11147645/"],
  rand2: ["RAND report RRA788-3", "https://www.rand.org/pubs/research_reports/RRA788-3.html"],
  nih: ["Bentley University: NIH investment in 2010–2019 drug approvals", "https://www.bentley.edu/news/new-study-shows-nih-investment-new-drug-approvals-comparable-investment-pharmaceutical"],
  remdesivir: ["Public Citizen: The Real Story of Remdesivir", "https://www.citizen.org/article/the-real-story-of-remdesivir/"],
  xtandi: ["STAT: March-in rights and Xtandi", "https://www.statnews.com/2022/01/03/march-in-rights-protect-prostate-cancer-patients-from-excessive-drug-prices/"],
  aam: ["Association for Accessible Medicines: 2024 savings", "https://accessiblemeds.org/resources/press-releases/generic-and-biosimilar-medicines-save-467-billion-in-2024/"],
  aarp17: ["AARP Rx Price Watch (2017 data)", "https://www.aarp.org/press/releases/2019-9-19-rx-price-watch-retail-drug-prices-increased-faster-than-inflation-12-years.html"],
  aarp20: ["AARP Rx Price Watch 2024 (2006–2020 data)", "https://www.aarp.org/advocacy/rx-drug-price-watch-2024/"],
  negotiated: ["Becker's: CMS negotiated drug prices", "https://www.beckershospitalreview.com/pharmacy/cms-negotiated-drug-prices-12-notes/"],
};

