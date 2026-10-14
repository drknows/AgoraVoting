/* Agora Health: real public data. Each block names its source. */
// CMS National Health Expenditures 2024, $ billions
const H_NHE24 = {total: 5300, medicare: 1100, medicaid: 931.7, private: 1600, oop: 556.6, hospital: 1600, physician: 1100, rx: 467.0, gdp: 18.0};
// Peterson-KFF Health System Tracker, 2024
const H_WORLD = {us: 14775, peers: 7860, usGdp: 17.2, peersGdp: 11.2};
// KFF, ACA Marketplace claims, 2024
const H_ACA = {denied: 19, lo: 3, hi: 36, appealed: "<1", upheld: 66, reasons: [["Other / unspecified", 36], ["Administrative", 25], ["Excluded service", 13], ["No prior authorization or referral", 9], ["Member not covered", 7], ["Medical necessity", 5]]};
// KFF, Medicare Advantage prior authorization, 2024
const H_MA = {requests: 52.8, deniedM: 4.1, deniedPct: 7.7, appealed: 11.5, overturned: 80.7, byInsurer: [["UnitedHealthcare", 12.8, "UNH"], ["Centene", 12.3, "CNC"], ["Humana", 5.8, "HUM"], ["Elevance Health", 4.2, "ELV"]]};
// MedPAC March 2026 report
const H_MEDPAC = {extraPct: 14, extraB: 76, selection: 11, coding: 4, enrollM: 34.9, share: 55};
// Medicare physician fee schedule conversion factor (single CF era, 1998+) and CPI-U annual average
const H_CF = {1998:36.6873,1999:34.7315,2000:36.6137,2001:38.2581,2002:36.1992,2003:36.7856,2004:37.3374,2005:37.8975,2006:37.8975,2007:37.8975,2008:38.0870,2009:36.0666,2010:36.0846,2011:33.9764,2012:34.0376,2013:34.0230,2014:35.8228,2015:35.9335,2016:35.8043,2017:35.8887,2018:35.9996,2019:36.0391,2020:36.0896,2021:34.8931,2022:34.6062,2023:33.8872,2024:33.2875,2025:32.3465,2026:33.4009};
const H_CPI = {1998:163.0,1999:166.6,2000:172.2,2001:177.1,2002:179.9,2003:184.0,2004:188.9,2005:195.3,2006:201.6,2007:207.3,2008:215.3,2009:214.5,2010:218.1,2011:224.9,2012:229.6,2013:233.0,2014:236.7,2015:237.0,2016:240.0,2017:245.1,2018:251.1,2019:255.7,2020:258.8,2021:271.0,2022:292.7,2023:304.7,2024:313.7,2025:322.35};
const H_SRC = {
  nhe24: ["CMS National Health Expenditures 2024 highlights", "https://www.cms.gov/files/document/highlights.pdf"],
  world: ["Peterson-KFF Health System Tracker: U.S. vs. other countries", "https://www.healthsystemtracker.org/chart-collection/health-spending-u-s-compare-countries/"],
  aca: ["KFF: Claims denials and appeals in ACA Marketplace plans, 2024", "https://www.kff.org/affordable-care-act/claims-denials-and-appeals-in-aca-marketplace-plans-in-2024/"],
  ma: ["KFF: Medicare Advantage prior authorization, 2024", "https://www.kff.org/medicare/medicare-advantage-insurers-made-nearly-53-million-prior-authorization-determinations-in-2024/"],
  medpac: ["MedPAC March 2026 Report to Congress (press release)", "https://www.medpac.gov/wp-content/uploads/2026/03/March_2026_MedPAC_Report_Press_Release_SEC.pdf"],
  medicare: ["KFF: 2026 Medicare Trustees Report key facts", "https://www.kff.org/medicare/key-facts-about-medicare-spending-trends-and-projections-from-the-2026-medicare-trustees-report/"],
  cf: ["CMS Physician Fee Schedule final rules (conversion factor)", "https://www.cms.gov/medicare/payment/fee-schedules/physician"],
  cpi: ["BLS CPI-U annual averages", "https://vtlmi.labor.vermont.gov/cpi.htm"],
  appealsAca: ["HealthCare.gov: Appealing a health plan decision", "https://www.healthcare.gov/appeal-insurance-company-decision/"],
  appealsMa: ["Medicare.gov: Appeals in Medicare health plans", "https://www.medicare.gov/providers-services/claims-appeals-complaints/appeals/medicare-health-plans"],
};

// Medicare financing, 2025 (Medicare Trustees via Congressional Research Service and NCPSSM)
const H_MCR = {income: 1226.2, spend: 1210.1, hiPayroll: 403.2, hiOther: 59.2, bGeneral: 422.9, bSpend: 584.3, dGeneral: 148.8, dPremiums: 14.9, dStates: 19.1, dSpend: 181.5, hiDepletion: "2033", outlays: 7000, partB26: 202.90};
// Payroll tax rules (no wage cap); 0.9% Additional Medicare Tax above these wages
const H_TAX = {rate: 0.0145, addl: 0.009, thresh: {single: 200000, joint: 250000}};
// KFF Employer Health Benefits Survey 2025
const H_EMP = {family: 26993, familyWorker: 6850, single: 9325, singleWorker: 1440, deductible: 1886, growth5Premium: 24, growth5Wages: 26, growth5Infl: 28.6};
// 2026 limits
const H_LIMITS = {acaSelf: 10600, acaFamily: 21200, aca25Self: 9200, aca25Family: 18400, maInNet: 9250, maCombined: 13900, maAvg: 5421, maAvgHmo: 4636, maAvgPpo: 6592, maPremAvg: 15, maPremPayers: 59, maZeroShare: 75, partD: 2100};
const H_MORE = {hospital: 254, debtPeople: 20, debtTotal: 220, debtOver10k: 3, acaPremRise: 26, acaPayRise: 114};
Object.assign(H_SRC, {
  mcrFin: ["Congressional Research Service: Medicare financing (July 2026)", "https://www.everycrsreport.com/files/2026-07-27_R43122_8dd6f85a239b62fe1b5c4bc6beeabd061d455f39.pdf"],
  trustees: ["NCPSSM: Highlights of the 2026 Medicare Trustees Report", "https://www.ncpssm.org/?p=55470"],
  cbo: ["CRFB summary of CBO: fiscal 2025 federal budget", "https://www.crfb.org/blogs/cbo-estimates-2025-deficit-totaled-18-trillion"],
  ehbs: ["KFF 2025 Employer Health Benefits Survey", "https://www.kff.org/health-costs/report/2025-employer-health-benefits-survey/"],
  moop: ["2026 ACA out-of-pocket limits (revised final, HHS)", "https://blog.nisbenefits.com/cost-sharing-limits-revised-2026-plan-years"],
  ma26: ["KFF: Medicare Advantage in 2026", "https://www.kff.org/medicare/issue-brief/medicare-advantage-premiums-out-of-pocket-limits-supplemental-benefits-and-prior-authorization/"],
  partd26: ["WTOP: Medicare Part D costs in 2026", "https://wtop.com/news/2026/07/how-much-does-medicare-part-d-cost/"],
  rand: ["RAND: Prices paid to hospitals by private health plans (2022 data)", "https://www.rand.org/pubs/research_reports/RRA1144-2-v2.html"],
  debt: ["Peterson-KFF: The burden of medical debt", "https://www.healthsystemtracker.org/brief/the-burden-of-medical-debt-in-the-united-states/"],
  aca26: ["KFF: ACA insurers raising 2026 premiums", "https://www.kff.org/quick-insights/aca-insurers-are-raising-premiums-by-an-estimated-26-but-most-enrollees-could-see-sharper-increases-in-what-they-pay/"],
  marketplace: ["CMS Marketplace API (HealthCare.gov plans)", "https://developer.cms.gov/marketplace-api/"],
});

// Denials and appeals by type of coverage (latest year each source publishes)
const H_COVER = [
  {k: "Traditional Medicare (Parts A & B)", denied: "10.5% of claims", year: "FY2014", appealed: "4.2M first-level appeals", won: "36% fully reversed at level 1; 54% at judge hearing", note: "Rarely requires prior authorization. Hospitals and doctors file most appeals.", src: "gao"},
  {k: "Medicare Advantage (Part C)", denied: "7.7% of prior-auth requests", year: "2024", appealed: "11.5% of denials", won: "80.7% overturned", note: "52.8 million prior-authorization decisions.", src: "ma"},
  {k: "Medicare Part D (drugs)", denied: "Up to 3.5% of pharmacy fills rejected", year: "2017", appealed: "Few", won: "73% overturned", note: "About 84 million rejections at the pharmacy counter.", src: "oigD"},
  {k: "Medicaid managed care", denied: "12.5% of prior-auth requests", year: "2019", appealed: "A small share", won: "Not reported", note: "12 plans denied more than 25%. Most states offer no independent external review.", src: "oigMcd"},
  {k: "ACA Marketplace plans", denied: "19% of in-network claims", year: "2024", appealed: "Fewer than 1%", won: "34% (66% upheld)", note: "Ranges from 3% to 36% by insurer.", src: "aca"},
  {k: "Job-based plans", denied: "Not published", year: "", appealed: "Not published", won: "Not published", note: "Most large employers self-insure under federal ERISA rules, which require no public denial reporting.", src: null},
];
// Insurer-level figures. MA = Medicare Advantage prior authorization; ACA = Marketplace in-network claims.
const H_INS = [
  {n: "UnitedHealthcare", t: "UNH", maDen: 12.8, maWon: [86.1, 2022], aca: null},
  {n: "Aetna (CVS Health)", t: "CVS", maDen: 11.9, maWon: [90.8, 2022], maAppealed: 19.9, aca: null, note: "Highest share of Medicare Advantage denials appealed (19.9%)."},
  {n: "Centene (Wellcare, Ambetter)", t: "CNC", maDen: 12.3, maWon: [95.5, 2024], aca: [14, 2023], note: "Highest Medicare Advantage overturn rate on appeal."},
  {n: "Kaiser Permanente", maDen: 10.9, maWon: [51.0, 2024], maAppealed: 1.6, aca: null, note: "Lowest share appealed (1.6%) and lowest overturn rate."},
  {n: "Humana", t: "HUM", maDen: 5.8, maWon: [68.4, 2022], aca: null},
  {n: "Elevance Health (Anthem Blue Cross Blue Shield)", t: "ELV", maDen: 4.2, maWon: [89.2, 2022], aca: [8, 2024], note: "Lowest denial rates among large insurers in both programs."},
  {n: "Cigna", t: "CI", maDen: null, maWon: [85.3, 2022], aca: ["20+", 2024]},
  {n: "Other Blue Cross Blue Shield plans", maDen: null, maWon: [80.3, 2022], aca: null, note: "Marketplace: BCBS of Alabama 35% (2023), Florida Blue and BCBS of Tennessee at least 20% (2024). BCBS of Arizona: 97% of denials cited missing prior authorization or referral."},
  {n: "Oscar Health", maDen: null, maWon: null, aca: [25, 2024], note: "Highest Marketplace denial rate among large insurers."},
  {n: "Molina Healthcare", maDen: null, maWon: null, aca: [22, 2024], note: "Molina of Mississippi: 38% of denials cited medical necessity."},
];
Object.assign(H_SRC, {
  gao: ["GAO-16-366: Medicare fee-for-service appeals", "https://www.gao.gov/assets/d16366.pdf"],
  oigD: ["PBS NewsHour on HHS OIG report OEI-09-16-00411 (Part D)", "https://www.pbs.org/newshour/economy/making-sense/private-insurers-are-improperly-rejecting-medicare-drug-claims-watchdog-finds"],
  oigMcd: ["HHS OIG: Prior authorization denials in Medicaid managed care", "https://oig.hhs.gov/reports/all/2023/high-rates-of-prior-authorization-denials-by-some-plans-and-limited-state-oversight-raise-concerns-about-access-to-care-in-medicaid-managed-care"],
  maIns: ["Fierce Healthcare on KFF Medicare Advantage prior authorization, 2024", "https://www.fiercehealthcare.com/payers/kff-nearly-53m-prior-auth-requests-submitted-medicare-advantage-2024"],
  maWon22: ["Becker's: MA insurers ranked by prior-auth overturn rates (2022)", "https://www.beckerspayer.com/?p=12320"],
  acaIns: ["Word & Brown on KFF Marketplace denials, 2024", "https://jrreport.wordandbrown.com/2026/03/31/aca-plans-denied-19-of-in-network-claims-in-2024-report/"],
  medicaidAppeal: ["Medicaid.gov: Managed care appeals and grievances", "https://www.medicaid.gov/medicaid/managed-care/index.html"],
  origAppeal: ["Medicare.gov: Appeals in Original Medicare", "https://www.medicare.gov/providers-services/claims-appeals-complaints/appeals/original-medicare"],
  partDAppeal: ["Medicare.gov: Appeals in Part D drug plans", "https://www.medicare.gov/providers-services/claims-appeals-complaints/appeals/medicare-prescription-drug-coverage"],
});

// Types of health coverage: plain-language guide. 2026 HSA/HDHP figures: IRS Rev. Proc. 2025-19.
const H_TYPES = [
  {g: "Network plans", n: "HMO (Health Maintenance Organization)", what: "You pick a primary care doctor who coordinates your care and refers you to specialists in the plan's network.", pro: ["Usually the lowest premiums and copays", "Simple, predictable costs", "Care is coordinated by one doctor"], con: ["No coverage out of network except emergencies", "Referrals needed for specialists", "Smaller choice of doctors and hospitals"], best: "People who are happy with the network's doctors and want low costs."},
  {g: "Network plans", n: "PPO (Preferred Provider Organization)", what: "You can see any doctor without a referral. In-network care costs less; out-of-network care is partly covered.", pro: ["Most freedom to choose doctors and specialists", "No referrals", "Some coverage out of network and when traveling"], con: ["Higher premiums", "Out-of-network care can bring large bills and a separate, higher deductible", "Out-of-network providers may bill you the difference"], best: "People with established specialists, or who travel or live in two places."},
  {g: "Network plans", n: "EPO (Exclusive Provider Organization)", what: "A middle ground: no referrals needed, but only in-network care is covered (except emergencies).", pro: ["Lower premiums than a PPO", "See in-network specialists without referrals"], con: ["No out-of-network coverage", "Networks can be narrow; check every doctor and hospital you use"], best: "People whose doctors are all in the network who want to skip referrals."},
  {g: "Network plans", n: "POS (Point of Service)", what: "An HMO-PPO blend: a primary care doctor and referrals, with some out-of-network coverage at higher cost.", pro: ["Coordinated care with an out-of-network option"], con: ["Referral rules plus higher out-of-network costs", "More paperwork"], best: "People who want HMO-style costs with an escape hatch."},
  {g: "Cost structure & accounts", n: "High-deductible plan with an HSA", what: "A plan with a deductible of at least $1,700 (individual) or $3,400 (family) in 2026, paired with a Health Savings Account you own.", pro: ["Lower premiums", "HSA money goes in tax-free, grows tax-free, and comes out tax-free for medical costs: up to $4,400 (individual) or $8,750 (family) in 2026, plus $1,000 at 55+", "The account is yours to keep if you change jobs"], con: ["You pay full price for most care until the deductible is met", "Out-of-pocket can reach $8,500 individual / $17,000 family in 2026", "People sometimes skip needed care to avoid the cost"], best: "Healthy people who can afford the deductible and want to save for future medical costs."},
  {g: "Cost structure & accounts", n: "FSA and HRA (accounts, not plans)", what: "A Flexible Spending Account lets you set aside pre-tax pay for medical costs. A Health Reimbursement Arrangement is money your employer puts aside to reimburse you.", pro: ["Pays deductibles, copays and many purchases pre-tax", "HRAs are funded by the employer"], con: ["FSA money is largely use-it-or-lose-it each year", "Both stay with the employer when you leave"], best: "People with predictable yearly medical costs."},
  {g: "Marketplace (ACA) plans", n: "Metal levels: Bronze, Silver, Gold, Platinum", what: "Marketplace plans are grouped by how costs are split. Bronze plans pay about 60% of average costs, Silver 70%, Gold 80%, Platinum 90%. All cover the same essential health benefits and pre-existing conditions.", pro: ["Must cover pre-existing conditions and essential benefits", "Tax credits lower premiums for many people", "Silver plans get extra cost-sharing help at lower incomes"], con: ["Bronze: low premiums but high deductibles", "Gold and Platinum: high premiums", "Networks are often narrow"], best: "People without job-based coverage. Compare total yearly cost, not just the premium."},
  {g: "Marketplace (ACA) plans", n: "Catastrophic plans", what: "Very low premiums and a deductible equal to the out-of-pocket maximum. For people under 30 or with a hardship exemption.", pro: ["Lowest premiums", "Covers 3 primary care visits and preventive care before the deductible"], con: ["You pay almost everything until the yearly maximum", "Not eligible for premium tax credits"], best: "Young, healthy people who mainly want protection from a disaster."},
  {g: "Public coverage", n: "Medicaid and CHIP", what: "Free or low-cost coverage run by states for people with low incomes, children (CHIP), pregnant people and people with disabilities.", pro: ["Little or no premium or cost sharing", "Covers long-term care and services other insurance doesn't"], con: ["Eligibility rules vary by state and must be renewed", "Fewer doctors accept it in some areas"], best: "Anyone who qualifies. Check eligibility at your state Medicaid agency or HealthCare.gov."},
  {g: "Public coverage", n: "Medicare, Medicare Advantage, Medigap, Part D", what: "Coverage for people 65+ and some younger people with disabilities. See the Medicare Advantage tab for a side-by-side comparison.", pro: ["Traditional Medicare: any provider that takes Medicare", "Medicare Advantage: an out-of-pocket limit and extra benefits"], con: ["Traditional Medicare has no out-of-pocket limit without Medigap", "Medicare Advantage uses networks and prior authorization"], best: "Compare carefully at 65: switching back to traditional Medicare later can make Medigap hard to buy.", link: "#ma"},
  {g: "Military & veterans", n: "TRICARE", what: "Health coverage for active-duty and retired service members, the National Guard and Reserve, and their families, run by the Defense Health Agency. Main options: TRICARE Prime (HMO-style), TRICARE Select (PPO-style), TRICARE Reserve Select, TRICARE Young Adult, and TRICARE For Life, which pays after Medicare for retirees 65 and older.", pro: ["Low or no premiums for active-duty families; low cost sharing", "Prime offers coordinated care with a primary care manager", "TRICARE For Life covers most of what Medicare doesn't, with no premium beyond Medicare Part B"], con: ["Prime requires referrals and network use", "TRICARE For Life requires enrolling in Medicare Part A and Part B", "Run by private contractors (Humana Military in the East, TriWest in the West; Express Scripts for pharmacy). The pharmacy network dropped about 15,000 independent pharmacies in 2022"], best: "Eligible service members, retirees and families. Compare Prime and Select each year during open season.", link: "#insurers"},
  {g: "Military & veterans", n: "VA health care", what: "Care for enrolled veterans through VA hospitals and clinics, or outside doctors through the VA Community Care Network when the VA can't provide timely or nearby care. Eligibility and costs depend on service history, disability rating and income. CHAMPVA covers some spouses and children of veterans with permanent, total service-connected disabilities.", pro: ["No premiums; many veterans pay no copays", "Counts as qualifying health coverage under the ACA", "Can be combined with Medicare, TRICARE or private insurance"], con: ["Community care usually needs VA approval first", "The VA generally can't bill Medicare, so plan which coverage you use for each service", "Wait times and access vary by location"], best: "All eligible veterans should enroll; keep Medicare Part B if you may use non-VA doctors.", link: "#insurers"},
  {g: "Bridging gaps", n: "COBRA", what: "Lets you keep your job-based plan after leaving a job, usually for up to 18 months.", pro: ["Same doctors, network and benefits", "Deductible progress carries over"], con: ["You pay the full premium plus up to 2%, often over $2,000 a month for a family"], best: "Short gaps, or mid-treatment. Compare with Marketplace plans: losing job coverage lets you enroll there within 60 days."},
  {g: "Use caution: not full insurance", n: "Short-term health plans", what: "Temporary policies that don't have to follow ACA rules.", pro: ["Low premiums", "Quick to buy"], con: ["Can refuse you or exclude pre-existing conditions", "Can leave out major benefits such as maternity, mental health or drugs", "Coverage caps and no out-of-pocket limit protections"], best: "Rarely the best choice. Check Marketplace options and tax credits first."},
  {g: "Use caution: not full insurance", n: "Health care sharing ministries", what: "Members of a faith-based group share medical bills. They are not insurance.", pro: ["Lower monthly costs"], con: ["No legal obligation to pay your bills", "Can exclude pre-existing conditions and some care", "Not regulated as insurance, so state insurance protections and complaint rights usually don't apply"], best: "Understand that payment isn't guaranteed before relying on one."},
  {g: "Use caution: not full insurance", n: "Fixed indemnity and discount plans", what: "Pay a set dollar amount per day or service, or give discounts at certain providers.", pro: ["Cheap supplement to real coverage"], con: ["Payments are often far below actual bills", "Not a substitute for comprehensive insurance"], best: "Only as an add-on to comprehensive coverage."},
  {g: "Other models", n: "Direct primary care", what: "A monthly membership with a primary care practice for unlimited visits and basic services.", pro: ["Easy access to your doctor", "Predictable monthly fee"], con: ["Doesn't cover specialists, hospitals or emergencies", "You still need insurance for major costs"], best: "Paired with a high-deductible plan."},
];
const H_NETWORK = [["", "HMO", "EPO", "POS", "PPO"], ["Primary doctor required", "Yes", "No", "Yes", "No"], ["Referrals for specialists", "Yes", "No", "Yes", "No"], ["Out-of-network coverage", "Emergencies only", "Emergencies only", "Partial", "Partial"], ["Typical premium", "Lowest", "Low–medium", "Medium", "Highest"]];

// BLS CPI price indexes for medical services, 1970–2026 (via in2013dollars / officialdata buying-power tables).
// Stored as each series' published buying-power values; the page converts them to indexes (1970 = 100).
const R_YRS = [1970,1975,1980,1985,1990,1995,2000,2005,2010,2015,2020,2021,2022,2023,2024,2025,2026];
const R_CPI = {
  all:   {name: "All consumer prices", v: [38.8,53.8,82.4,107.6,130.7,152.4,172.2,195.3,218.056,237.017,258.811,270.970,292.655,304.702,313.689,322.35,334.98]},
  med:   {name: "Medical care services", v: [20,28.83,46.25,70.02,100.65,138.71,164.59,208.31,254.42,294.61,348.12,354.58,369.81,368.53,378.91,391.84,402.68]},
  phys:  {name: "Physicians' services", v: [47.20,65.92,104.78,155.18,220.33,286.06,335.14,393.78,453.88,501.48,534.11,556.89,564.28,565.18,572.51,587.25,599.66]},
  dent:  {name: "Dental services", v: [134.51,182.46,270.82,392.27,534.88,710.19,887.64,1112.45,1369.12,1552.56,1754.78,1793.99,1866.87,1971.90,2056.48,2113.94,2232.52]},
  hosp:  {name: "Hospital & related services", start: 1977, base: 20, v: [null,null,26.81,44.89,68.76,99.79,122.70,170.14,235.06,294.69,356.28,367.47,381.22,397.65,421.41,441.73,464.38]},
  other: {name: "Other medical professionals (therapists, chiropractors, etc.)", start: 1990, v: [null,null,null,null,24.04,28.78,32.38,37.36,42.87,45.65,48.42,49.59,51.62,51.74,52.32,53.37,55.71]},
};
const R_CPI_1977 = 60.6;
Object.assign(H_SRC, {
  cpiPhys: ["BLS CPI: Physicians' services (in2013dollars)", "https://www.in2013dollars.com/Physicians'-services/price-inflation/1947"],
  cpiMed: ["BLS CPI: Medical care services (in2013dollars)", "https://www.in2013dollars.com/Medical-care-services/price-inflation/1970"],
  cpiDent: ["BLS CPI: Dental services (officialdata.org)", "https://www.officialdata.org/Dental-services/price-inflation/1964"],
  cpiHosp: ["BLS CPI: Hospital and related services (officialdata.org)", "https://officialdata.org/Hospital-and-related-services/price-inflation"],
  cpiOther: ["BLS CPI: Services by other medical professionals (officialdata.org)", "https://officialdata.org/Services-by-other-medical-professionals/price-inflation"],
  pufPhys: ["CMS Medicare Physician & Other Practitioners by Geography and Service", "https://data.cms.gov/provider-summary-by-type-of-service/medicare-physician-other-practitioners/medicare-physician-other-practitioners-by-geography-and-service"],
  pufInp: ["CMS Medicare Inpatient Hospitals by Geography and Service", "https://data.cms.gov/provider-summary-by-type-of-service/medicare-inpatient-hospitals/medicare-inpatient-hospitals-by-geography-and-service"],
  pufOut: ["CMS Medicare Outpatient Hospitals by Geography and Service", "https://data.cms.gov/provider-summary-by-type-of-service/medicare-outpatient-hospitals/medicare-outpatient-hospitals-by-geography-and-service"],
  icd: ["National Library of Medicine Clinical Tables: ICD-10-CM", "https://clinicaltables.nlm.nih.gov/apidoc/icd10cm/v3/doc.html"],
});
// Code sets for the rate spreadsheets. Descriptions are Agora's plain-language summaries.
const R_SETS = [
  {id: "visits", type: "phys", name: "Office, hospital & ER visits", codes: [["99202","New patient office visit, straightforward"],["99203","New patient office visit, low complexity"],["99204","New patient office visit, moderate complexity"],["99213","Established patient office visit, low complexity"],["99214","Established patient office visit, moderate complexity"],["99215","Established patient office visit, high complexity"],["99223","Hospital admission, high complexity"],["99232","Hospital follow-up visit, moderate"],["99284","Emergency department visit, high severity"],["99285","Emergency department visit, highest severity"]]},
  {id: "surgery", type: "phys", name: "Surgery (surgeon's fee)", codes: [["27447","Total knee replacement"],["27130","Total hip replacement"],["66984","Cataract removal with lens implant"],["47562","Laparoscopic gallbladder removal"],["29881","Knee arthroscopy with meniscus repair or removal"],["33533","Coronary artery bypass, one arterial graft"],["45378","Diagnostic colonoscopy"],["45385","Colonoscopy with polyp removal"],["63030","Lower back disc surgery (laminotomy)"],["19301","Partial mastectomy"]]},
  {id: "imaging", type: "phys", name: "Imaging & heart tests", codes: [["71046","Chest X-ray, 2 views"],["70450","CT scan of head, no contrast"],["74177","CT abdomen and pelvis with contrast"],["72148","MRI lower spine, no contrast"],["77067","Screening mammogram, both breasts"],["93306","Echocardiogram, complete"],["93000","Electrocardiogram (EKG)"]]},
  {id: "lab", type: "phys", name: "Lab tests", codes: [["80053","Comprehensive metabolic panel"],["85025","Complete blood count"],["80061","Cholesterol (lipid) panel"],["83036","Hemoglobin A1c (diabetes)"],["84443","Thyroid stimulating hormone (TSH)"],["36415","Routine blood draw"]]},
  {id: "allied", type: "phys", name: "Allied health: therapy, chiropractic, mental health, eye", codes: [["97161","Physical therapy evaluation, low complexity"],["97110","Therapeutic exercise, 15 minutes"],["97140","Manual therapy, 15 minutes"],["97530","Therapeutic activities, 15 minutes"],["92507","Speech therapy treatment"],["98941","Chiropractic spinal manipulation, 3–4 regions"],["90834","Psychotherapy, 45 minutes"],["90837","Psychotherapy, 60 minutes"],["90791","Psychiatric diagnostic evaluation"],["92014","Eye exam, established patient"],["97802","Medical nutrition therapy, 15 minutes"]]},
  {id: "drg", type: "drg", name: "Hospital stays (inpatient, by DRG)", codes: [["470","Hip or knee replacement, without major complications"],["871","Sepsis with major complications"],["291","Heart failure with major complications"],["193","Pneumonia with major complications"],["392","Digestive disorders, without major complications"],["690","Kidney and urinary tract infections"],["247","Coronary stent, without major complications"],["460","Spinal fusion (non-cervical), without major complications"],["65","Stroke with complications"],["190","COPD with major complications"]]},
];
