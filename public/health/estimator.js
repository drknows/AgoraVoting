/* Agora Health · Reimbursement tracker (restored detailed version).
   Illustrative estimates, clearly labeled on the page. Loaded before health/app.js. */
(function () {
const Ag = window.Agora, {esc, pct, money, niceStep} = Ag, hero = Ag.hero, toast = Ag.toast;
const store = {costs: Ag.store.get("rateCosts", {})};
const save = () => Ag.store.set("rateCosts", store.costs);
const state = { rt:"cat1", rc:"99214", rpos:"11", rloc:"US", rprov:"md", ryear:2026, rreal:false, rbase:1980, rdx:"I50.9", rsec:"all", rq:"", co:null };
const PAGES = {};
const MEI_A = [[1970,0.24],[1975,0.31],[1980,0.40],[1985,0.50],[1990,0.58],[1995,0.66],[2000,0.73],[2005,0.80],[2010,0.86],[2015,0.90],[2020,0.93],[2022,0.955],[2024,0.98],[2026,1],[2027,1.024],[2028,1.048],[2029,1.072],[2030,1.097]];
const st = document.createElement("style");
st.textContent = `:root{--c1:var(--accent);--c2:var(--s-otc);--c3:var(--muted);--c4:var(--s-cpi)}
.code{font-family:var(--mono);font-weight:600;font-size:.82rem;color:var(--accent);white-space:nowrap}
.toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.p-gov{background:var(--brass-soft);color:var(--brass)}`;
document.head.appendChild(st);
/* ───────────────────────── SECTION 14 · REIMBURSEMENT TRACKER (illustrative values) ───────────────────────── */
const R_YEARS = Array.from({length:61},(_,i)=>1970+i);
const rStatus = y => y<=2026 ? "Final" : y===2027 ? "Proposed" : "Projected";
const CF = {1992:31.0010,1993:31.9620,1994:32.9050,1995:34.6160,1996:34.6340,1997:35.7671,1998:36.6873,1999:34.7315,2000:36.6137,2001:38.2581,2002:36.1992,2003:36.7856,2004:37.3374,2005:37.8975,2006:37.8975,2007:37.8975,2008:38.0870,2009:36.0666,2010:36.0846,2011:33.9764,2012:34.0376,2013:34.0230,2014:35.8228,2015:35.9335,2016:35.8043,2017:35.8887,2018:35.9996,2019:36.0391,2020:36.0896,2021:34.8931,2022:34.6062,2023:33.8872,2024:33.2875,2025:32.3465,2026:33.4009,2027:34.2025,2028:34.2880,2029:34.3737,2030:34.4596};
const CPI_A = [[1970,38.8],[1971,40.5],[1972,41.8],[1973,44.4],[1974,49.3],[1975,53.8],[1976,56.9],[1977,60.6],[1978,65.2],[1979,72.6],[1980,82.4],[1981,90.9],[1982,96.5],[1983,99.6],[1984,103.9],[1985,107.6],[1986,109.6],[1987,113.6],[1988,118.3],[1989,124.0],[1990,130.7],[1991,136.2],[1992,140.3],[1993,144.5],[1994,148.2],[1995,152.4],[1996,156.9],[1997,160.5],[1998,163.0],[1999,166.6],[2000,172.2],[2001,177.1],[2002,179.9],[2003,184.0],[2004,188.9],[2005,195.3],[2006,201.6],[2007,207.3],[2008,215.3],[2009,214.5],[2010,218.1],[2011,224.9],[2012,229.6],[2013,233.0],[2014,236.7],[2015,237.0],[2016,240.0],[2017,245.1],[2018,251.1],[2019,255.7],[2020,258.8],[2021,271.0],[2022,292.7],[2023,304.7],[2024,313.7],[2025,322.0],[2026,330.0],[2027,338.6],[2028,346.7],[2029,354.7],[2030,362.9]];
const FAC_A = [[1970,0.07],[1975,0.11],[1980,0.18],[1983,0.25],[1990,0.36],[2000,0.52],[2010,0.72],[2020,0.89],[2026,1],[2027,1.026],[2028,1.053],[2029,1.080],[2030,1.108]];
const COMM_A = { prof:[[1970,1.05],[1985,1.15],[1992,1.10],[2000,1.15],[2010,1.25],[2020,1.35],[2026,1.38],[2030,1.45]], fac:[[1970,1.05],[1983,1.10],[1990,1.20],[1996,1.30],[2005,1.60],[2015,2.20],[2022,2.45],[2026,2.50],[2030,2.62]] };
function interp(a, y, geo){ if (y<=a[0][0]) return a[0][1]; for (let i=1;i<a.length;i++){ if (y<=a[i][0]){ const [y0,v0]=a[i-1],[y1,v1]=a[i], f=(y-y0)/(y1-y0); return geo ? v0*Math.pow(v1/v0,f) : v0+(v1-v0)*f; } } return a[a.length-1][1]; }
const cpi = y => interp(CPI_A, y, true);
function pfsIdx(y){ if (y>=1992) return CF[y]/CF[2026]; let v=CF[1992]/CF[2026]; for (let yy=1991; yy>=y; yy--){ const g = yy>=1987?0.04 : yy>=1984?0 : yy>=1976?0.085 : 0.06; v /= (1+g); } return v; }

const R_TYPES = [["cat1","CPT Category I"],["cat2","CPT Category II"],["cat3","CPT Category III"],["hcpcs","HCPCS Level II"],["mods","Modifiers"],["rev","Revenue codes"],["pos","Place of service"],["icd","ICD-10-CM"]];
const EM_RVU = [[1992,0.52],[1998,0.64],[2007,0.80],[2020,0.88],[2021,1],[2026,1]];
// c, description (Agora wording), type, group, kind, nf (2026 national non-facility), f (facility), fac {pos:[2026 facility payment, since]}, since, pred, rvu anchors
const RCODES = [
  {c:"99202",d:"New patient office visit, straightforward",t:"cat1",g:"em",k:"pfs",nf:72,f:49,fac:{"22":[141,2000]},since:1992,pred:"90000-series brief office visit (pre-1992 CPT)",rvu:EM_RVU},
  {c:"99203",d:"New patient office visit, low complexity",t:"cat1",g:"em",k:"pfs",nf:111,f:82,fac:{"22":[141,2000]},since:1992,pred:"90010 limited office visit, new patient",rvu:EM_RVU},
  {c:"99204",d:"New patient office visit, moderate complexity",t:"cat1",g:"em",k:"pfs",nf:167,f:132,fac:{"22":[141,2000]},since:1992,pred:"90015 intermediate office visit, new patient",rvu:EM_RVU},
  {c:"99205",d:"New patient office visit, high complexity",t:"cat1",g:"em",k:"pfs",nf:220,f:181,fac:{"22":[141,2000]},since:1992,pred:"90017 comprehensive office visit, new patient",rvu:EM_RVU},
  {c:"99213",d:"Established patient office visit, low complexity",t:"cat1",g:"em",k:"pfs",nf:91,f:65,fac:{"22":[141,2000]},since:1992,pred:"90050 limited office visit, established patient",rvu:[[1992,0.55],[1998,0.66],[2007,0.82],[2020,0.88],[2021,1],[2026,1]]},
  {c:"99214",d:"Established patient office visit, moderate complexity",t:"cat1",g:"em",k:"pfs",nf:129,f:95,fac:{"22":[141,2000]},since:1992,pred:"90060 intermediate office visit, established patient",rvu:[[1992,0.50],[1998,0.62],[2007,0.78],[2020,0.86],[2021,1],[2026,1]]},
  {c:"99215",d:"Established patient office visit, high complexity",t:"cat1",g:"em",k:"pfs",nf:182,f:141,fac:{"22":[141,2000]},since:1992,pred:"90070 extended office visit, established patient",rvu:EM_RVU},
  {c:"27447",d:"Total knee replacement",t:"cat1",g:"surg",k:"pfs",nf:null,f:1302,fac:{"21":[13480,1970],"22":[12950,2018],"24":[9180,2020]},since:1970,pred:null,rvu:[[1970,1.55],[1992,1.65],[2005,1.25],[2020,1.05],[2026,1]]},
  {c:"66984",d:"Cataract removal with lens implant",t:"cat1",g:"surg",k:"pfs",nf:null,f:491,fac:{"22":[2340,1970],"24":[1180,1982]},since:1970,pred:null,rvu:[[1970,2.2],[1992,2.4],[2000,1.5],[2026,1]]},
  {c:"45378",d:"Diagnostic colonoscopy",t:"cat1",g:"proc",k:"pfs",nf:370,f:190,fac:{"22":[1130,1970],"24":[520,1982]},since:1970,pred:null,rvu:[[1970,1.5],[1992,1.6],[2026,1]]},
  {c:"70553",d:"MRI of brain, without then with contrast",t:"cat1",g:"rad",k:"pfs",nf:360,f:95,fac:{"22":[530,1985]},since:1985,pred:null,pc:95,rvu:[[1985,1.5],[2006,1.4],[2007,1.05],[2026,1]]},
  {c:"71046",d:"Chest X-ray, two views",t:"cat1",g:"rad",k:"pfs",nf:34,f:10,fac:{"22":[95,1970]},since:2018,pred:"71020 chest X-ray, two views",pc:10,rvu:[[1970,1.3],[2026,1]]},
  {c:"93000",d:"Electrocardiogram with interpretation",t:"cat1",g:"ecg",k:"pfs",nf:16,f:16,fac:{},since:1970,pred:null,rvu:[[1970,1.8],[1992,1.8],[2026,1]]},
  {c:"90837",d:"Psychotherapy, 60 minutes",t:"cat1",g:"psych",k:"pfs",nf:160,f:140,fac:{},since:2013,pred:"90808 individual psychotherapy, 75–80 minutes",rvu:[[1970,0.85],[2026,1]]},
  {c:"97110",d:"Therapeutic exercise, each 15 minutes",t:"cat1",g:"therapy",k:"pfs",nf:29,f:29,fac:{},since:1992,pred:"Physical therapy modality codes (pre-1992)",rvu:[[1970,0.95],[2026,1]]},
  {c:"97802",d:"Medical nutrition therapy, initial, each 15 minutes",t:"cat1",g:"mnt",k:"pfs",nf:37,f:33,fac:{},since:2002,pred:null,rvu:[[2002,0.95],[2026,1]]},
  {c:"3044F",d:"Most recent hemoglobin A1c below 7.0%",t:"cat2",g:"q",k:"zero",since:2005},
  {c:"3074F",d:"Most recent systolic blood pressure below 130",t:"cat2",g:"q",k:"zero",since:2005},
  {c:"1036F",d:"Current tobacco non-user",t:"cat2",g:"q",k:"zero",since:2005},
  {c:"0275T",d:"Percutaneous lumbar decompression (image-guided)",t:"cat3",g:"surg",k:"carrier",nf:null,f:690,fac:{"22":[4600,2011],"24":[3900,2011]},since:2011,pred:null,rvu:[[2011,1.1],[2026,1]]},
  {c:"G0438",d:"Annual wellness visit, initial",t:"hcpcs",g:"awv",k:"pfs",nf:170,f:129,fac:{},since:2011,pred:null,rvu:[[2011,1.0],[2026,1]]},
  {c:"G0439",d:"Annual wellness visit, subsequent",t:"hcpcs",g:"awv",k:"pfs",nf:133,f:105,fac:{},since:2011,pred:null,rvu:[[2011,0.95],[2026,1]]},
  {c:"G0556",d:"Advanced primary care management, level 1 (per month)",t:"hcpcs",g:"apcm",k:"pfs",nf:15,f:15,fac:{},since:2025,pred:null},
  {c:"G0557",d:"Advanced primary care management, level 2 (per month)",t:"hcpcs",g:"apcm",k:"pfs",nf:50,f:50,fac:{},since:2025,pred:null},
  {c:"G0558",d:"Advanced primary care management, level 3 (per month)",t:"hcpcs",g:"apcm",k:"pfs",nf:111,f:111,fac:{},since:2025,pred:null},
  {c:"G2211",d:"Visit complexity add-on for ongoing care",t:"hcpcs",g:"em",k:"pfs",nf:16,f:16,fac:{},since:2024,pred:null},
  {c:"J9271",d:"Pembrolizumab injection, 1 mg",t:"hcpcs",g:"drug",k:"asp",since:2016,asp:[[2016,47.2],[2020,50.1],[2023,52.4],[2026,51.8]],fac:{"22":[51.8,2016]}},
  {c:"J1745",d:"Infliximab injection, 10 mg",t:"hcpcs",g:"drug",k:"asp",since:2000,asp:[[2000,68],[2004,64],[2005,54],[2015,86],[2020,61],[2026,38]],fac:{"22":[38,2000]}},
  {c:"J0178",d:"Aflibercept injection, 1 mg",t:"hcpcs",g:"drug",k:"asp",since:2013,asp:[[2013,980],[2019,925],[2023,905],[2026,870]],fac:{"22":[870,2013]}},
  {c:"C1713",d:"Anchor or screw for bone-to-bone or soft tissue fixation (device)",t:"hcpcs",g:"device",k:"packaged",since:2001,carve:520,fac:{"22":[0,2001],"24":[0,2008]}},
  {c:"Q4101",d:"Skin substitute (bilayered cell product), per sq cm",t:"hcpcs",g:"drug",k:"asp",since:2010,asp:[[2010,32],[2015,34],[2020,36],[2025,38],[2026,127]],fac:{"22":[127,2010]}},
];
const RSET = [["11","Office (POS 11)"],["10","Telehealth, patient home (POS 10)"],["22","Hospital outpatient (POS 22)"],["24","Ambulatory surgery center (POS 24)"],["21","Inpatient hospital (POS 21)"]];
const RLOC = [["US","National average",1,1],["SF","San Francisco, CA",1.18,1.35],["NYC","Manhattan, NY",1.14,1.30],["HOU","Houston, TX",1.0,0.95],["MIA","Miami, FL",1.03,1.05],["MSP","Minneapolis, MN",1.0,1.12],["ALR","Rural Alabama",0.91,0.85],["AK","Alaska",1.25,1.55]];
const RPROV = [["md","Physician (MD/DO)",1,null],["np","Nurse practitioner or physician assistant",0.85,["em","proc","rad","ecg","psych","awv","apcm","mnt"]],["cnm","Certified nurse-midwife",1,["em","awv","proc"]],["psy","Clinical psychologist",1,["psych"]],["sw","Clinical social worker",0.75,["psych"]],["mft","Marriage & family therapist or mental health counselor",0.75,["psych"]],["pt","Physical or occupational therapist",1,["therapy"]],["pta","PT or OT assistant (modifier CQ/CO)",0.85,["therapy"]],["rd","Registered dietitian",0.85,["mnt"]]];
const RPAY = [["MCR","Medicare fee-for-service",1,1],["MA","Medicare Advantage plans (typical)",1.02,1.03],["AVG","Private plans, average",1.38,2.50]];
const MODS = [
  ["25","Significant, separate E/M service on the same day as a procedure","No rate change. Lets the visit be paid separately from the procedure.",null,"1992"],
  ["57","Decision for surgery","No rate change. Exempts the visit the day before or day of major surgery from the 90-day global package.",null,"1992"],
  ["59","Distinct procedural service (or XE, XP, XS, XU)","No rate change. Bypasses NCCI bundling edits when documentation supports a separate service.",null,"1996"],
  ["26","Professional component","Pays only the physician's interpretation.","pc","1992"],
  ["TC","Technical component","Pays only equipment, supplies, and staff.","tc","1992"],
  ["50","Bilateral procedure","150% of the single-procedure rate.",1.5,"1992"],
  ["51","Multiple procedures","Highest-valued procedure at 100%; each additional at 50%.",0.5,"1992"],
  ["62","Two surgeons","Each surgeon receives 62.5% of the rate.",0.625,"1992"],
  ["80","Assistant at surgery (physician)","16% of the surgical rate.",0.16,"1992"],
  ["AS","Assistant at surgery (NP, PA, or clinical nurse specialist)","85% of 16%, or 13.6% of the surgical rate.",0.136,"1998"],
  ["CQ/CO","Therapy by a PT or OT assistant","85% of the fee schedule rate.",0.85,"2022"],
  ["95","Synchronous telehealth","No rate change; paid at the place-of-service rate.",null,"2017"],
  ["GY","Service excluded by statute","Medicare pays nothing; the patient can be billed.",0,"2002"],
];
const REVC = [
  ["0120","Room & board, semi-private","Bundled into the MS-DRG payment",4850,null,3100,"per day"],
  ["0250","Pharmacy, general","Packaged into the DRG or APC payment",1200,null,640,"per stay (avg)"],
  ["0360","Operating room services","Packaged into the DRG or comprehensive APC",14200,null,7900,"per case"],
  ["0420","Physical therapy","Physician fee schedule rates for therapy codes",310,98,142,"per visit"],
  ["0450","Emergency room","Outpatient ED visit APC (levels 1–5); level 4 shown",3200,430,1180,"per visit"],
  ["0490","Ambulatory surgical care","ASC payment system",8600,1180,2300,"per case (cataract)"],
  ["0510","Clinic","Outpatient clinic visit (G0463)",380,141,360,"per visit"],
  ["0610","MRI, diagnostic","Outpatient imaging APC",3400,530,1450,"per scan"],
  ["0636","Drugs requiring detailed coding","Average sales price + 6% by J or Q code",4200,1040,1690,"per typical dose"],
  ["0730","EKG / ECG","Outpatient APC or packaged",260,36,95,"per test"],
];
const POSC = [
  ["02","Telehealth, not in patient's home","Facility rate","Originating-site fee (Q3014) to the host site"],
  ["10","Telehealth, in patient's home","Non-facility rate (since 2024)","None"],
  ["11","Office","Non-facility rate","None; practice expense is in the professional rate"],
  ["12","Patient's home","Non-facility rate","Home health PPS if under a plan of care"],
  ["19","Off-campus hospital outpatient department","Facility rate","OPPS, often at a site-neutral reduced rate"],
  ["21","Inpatient hospital","Facility rate","IPPS (MS-DRG)"],
  ["22","On-campus hospital outpatient department","Facility rate","OPPS (APC)"],
  ["23","Hospital emergency room","Facility rate","OPPS emergency department APC"],
  ["24","Ambulatory surgery center","Facility rate","ASC payment system"],
  ["31","Skilled nursing facility","Facility rate","SNF PPS (PDPM)"],
  ["32","Nursing facility","Non-facility rate","State Medicaid per diem"],
  ["81","Independent laboratory","Clinical Laboratory Fee Schedule","None"],
];
const IPPS_BASE = 7100, MA_YEAR = 13200;
// dx, description, DRG w/ MCC [drg, title, weight], DRG w/o CC/MCC [drg, title, weight], HCC [label, coefficient]
const RDX = [
  ["I50.9","Heart failure, unspecified",["291","Heart failure & shock with MCC",1.30],["293","Heart failure & shock without CC/MCC",0.66],["HCC 226 Heart failure",0.360]],
  ["A41.9","Sepsis, unspecified organism",["871","Septicemia without ventilation >96 hrs, with MCC",1.90],["872","Septicemia without ventilation >96 hrs, without MCC",1.03],["HCC 2 Septicemia & sepsis",0.455]],
  ["J44.1","COPD with acute exacerbation",["190","COPD with MCC",1.17],["192","COPD without CC/MCC",0.70],["HCC 280 Chronic obstructive pulmonary disease",0.319]],
  ["N18.6","End-stage renal disease",["682","Renal failure with MCC",1.50],["684","Renal failure without CC/MCC",0.62],["ESRD risk model (separate)",0]],
  ["E11.9","Type 2 diabetes without complications",["637","Diabetes with MCC",1.37],["639","Diabetes without CC/MCC",0.60],["HCC 38 Diabetes without complications",0.166]],
  ["M17.11","Primary osteoarthritis, right knee",["469","Major joint replacement with MCC",3.10],["470","Major joint replacement without MCC",1.90],["Not in risk model",0]],
  ["F03.90","Unspecified dementia",["056","Degenerative nervous system disorders with MCC",1.80],["057","Degenerative nervous system disorders without MCC",0.98],["HCC 127 Dementia, mild or unspecified",0.341]],
  ["C34.90","Lung cancer, unspecified side",["180","Respiratory neoplasms with MCC",1.70],["182","Respiratory neoplasms without CC/MCC",0.82],["HCC 20 Lung and other severe cancers",1.02]],
];
const MIPS = [["2017","2019","±4%"],["2018","2020","±5%"],["2019","2021","±7%"],["2020 onward","2022 onward","±9%"]];
/* ── Expanded code catalog (illustrative RVUs; Agora plain-language descriptions) ── */
const CF26 = 33.4009, ANES_CF = 20.32;
const SEC = {em:"Evaluation & management", anes:"Anesthesia", surg:"Surgery", rad:"Radiology", lab:"Pathology & laboratory", med:"Medicine", g:"HCPCS G codes", dme:"Drugs, supplies & equipment", q:"Quality measures", t:"Emerging technology"};
const SEC_RVU = { em:EM_RVU, anes:[[1970,1.1],[2026,1]], surg:[[1970,1.3],[1992,1.45],[2005,1.15],[2026,1]], rad:[[1970,1.2],[1992,1.35],[2007,1.05],[2026,1]], med:[[1970,0.9],[1992,0.95],[2026,1]] };
const r2 = v => Math.round(v*100)/100;
function X(c,d,sec,g,spec,[w,nf,f,mp],glob,[min,st,sup],o={}){
  RCODES.push({c,d,t:"cat1",g,k:"pfs",sec,spec,glob,rvus:[w,nf,f,mp],nf:nf==null?null:r2((w+nf+mp)*CF26),f:f==null?null:r2((w+f+mp)*CF26),fac:o.fac||{},since:o.since||(sec==="em"?1992:1970),pred:o.pred||(sec==="em"&&!o.since?"Pre-1992 office or hospital visit code (crosswalked)":null),rvu:o.rvu||SEC_RVU[sec]||SEC_RVU.med,cost:[min,st,sup],sys:o.sys});
}
function A(c,d,units,min){ RCODES.push({c,d,t:"cat1",g:"anes",k:"pfs",sec:"anes",spec:"anes",nf:null,f:r2(units*ANES_CF),fac:{},since:1970,pred:null,rvu:SEC_RVU.anes,cost:[min,0,0],units}); }
function LB(c,d,rate,since,st,sup){ RCODES.push({c,d,t:"cat1",g:"lab",k:"clfs",sec:"lab",spec:"lab",since,asp:[[since,rate*(since<2000?0.78:0.95)],[2016,rate*1.18],[2018,rate*1.05],[2026,rate]],fac:{},cost:[0,st,sup]}); }
// Evaluation & management
X("99211","Established patient office visit, minimal (clinical staff)","em","em","pc",[0.18,0.48,0.07,0.01],"XXX",[7,10,2]);
X("99212","Established patient office visit, straightforward","em","em","pc",[0.70,0.95,0.30,0.05],"XXX",[15,15,3]);
X("99221","Initial hospital inpatient care, low complexity","em","em","med",[1.63,null,0.66,0.15],"XXX",[40,0,0]);
X("99223","Initial hospital inpatient care, high complexity","em","em","med",[3.50,null,1.40,0.31],"XXX",[75,0,0]);
X("99232","Subsequent hospital care, moderate complexity","em","em","med",[1.59,null,0.64,0.11],"XXX",[35,0,0]);
X("99233","Subsequent hospital care, high complexity","em","em","med",[2.40,null,0.95,0.17],"XXX",[50,0,0]);
X("99238","Hospital discharge day, 30 minutes or less","em","em","med",[1.50,null,0.62,0.10],"XXX",[30,0,0]);
X("99283","Emergency department visit, low complexity","em","em","med",[1.60,null,0.36,0.16],"XXX",[25,0,0]);
X("99284","Emergency department visit, moderate complexity","em","em","med",[2.74,null,0.58,0.27],"XXX",[35,0,0]);
X("99285","Emergency department visit, high complexity","em","em","med",[4.00,null,0.83,0.40],"XXX",[45,0,0]);
X("99291","Critical care, first 30–74 minutes","em","em","med",[4.50,3.00,1.45,0.40],"XXX",[74,10,5]);
X("99304","Initial nursing facility care, low complexity","em","em","pc",[1.50,null,0.68,0.10],"XXX",[40,0,0]);
X("99341","Home visit, new patient, straightforward","em","em","pc",[1.00,1.10,null,0.07],"XXX",[30,0,3]);
X("99406","Tobacco cessation counseling, 3–10 minutes","em","em","pc",[0.24,0.15,0.10,0.02],"XXX",[10,5,0]);
X("99421","Online digital visit, 5–10 minutes","em","em","pc",[0.25,0.20,0.10,0.02],"XXX",[10,0,0],{since:2020});
X("99490","Chronic care management, first 20 minutes of staff time","em","apcm","pc",[0.61,0.75,0.27,0.04],"XXX",[15,20,0],{since:2015});
X("99495","Transitional care after discharge, moderate complexity","em","em","pc",[2.78,2.40,1.20,0.19],"XXX",[60,60,2],{since:2013});
X("99497","Advance care planning, first 30 minutes","em","em","pc",[1.50,0.80,0.65,0.10],"XXX",[30,0,0],{since:2016});
X("99453","Remote monitoring device setup and education","em","apcm","pc",[0,0.58,null,0],"XXX",[0,15,6],{since:2019});
X("99454","Remote monitoring device supply, 16+ days a month","em","apcm","pc",[0,1.30,null,0],"XXX",[0,5,25],{since:2019});
X("99457","Remote monitoring treatment management, first 20 minutes","em","apcm","pc",[0.61,0.80,0.26,0.04],"XXX",[10,20,0],{since:2019});
// Anesthesia (typical case: base units + time units)
A("00142","Anesthesia for lens surgery",6,50); A("00740","Anesthesia for upper GI endoscopy",7,45); A("00810","Anesthesia for lower GI endoscopy",7,50);
A("00790","Anesthesia for upper abdominal laparoscopic surgery",15,150); A("00840","Anesthesia for lower abdominal intraperitoneal surgery",14,140);
A("01402","Anesthesia for knee replacement",15,150); A("01967","Labor epidural analgesia",17,240); A("00560","Anesthesia for heart surgery with bypass pump",31,330);
// Surgery
X("11102","Skin biopsy by shave, first lesion","surg","proc","der",[0.66,2.30,0.40,0.06],"000",[20,20,12],{since:2019,pred:"11100 skin biopsy, single lesion",sys:"Integumentary"});
X("11042","Debridement, subcutaneous tissue, first 20 sq cm","surg","proc","der",[1.01,2.30,0.60,0.14],"000",[30,20,15],{sys:"Integumentary"});
X("12001","Simple wound repair, 2.5 cm or less","surg","proc","pc",[0.84,2.10,0.40,0.10],"000",[25,20,10],{sys:"Integumentary"});
X("17000","Destruction of first premalignant skin lesion","surg","proc","der",[0.61,1.40,0.70,0.06],"010",[20,15,6],{sys:"Integumentary"});
X("17311","Mohs surgery, head or neck, first stage","surg","surg","der",[6.20,10.50,3.60,0.80],"000",[90,90,60],{sys:"Integumentary"});
X("15271","Skin substitute graft, trunk or arm, first 25 sq cm","surg","proc","der",[1.50,3.00,0.90,0.20],"000",[30,25,10],{since:2012,sys:"Integumentary"});
X("20610","Joint aspiration or injection, major joint","surg","proc","surg",[0.79,1.10,0.45,0.08],"000",[20,15,12],{sys:"Musculoskeletal"});
X("20611","Joint aspiration or injection, major joint, with ultrasound","surg","proc","surg",[1.10,1.70,0.60,0.10],"000",[25,20,20],{since:2015,sys:"Musculoskeletal"});
X("25600","Closed treatment of distal radius fracture","surg","surg","surg",[2.78,5.00,3.50,0.40],"090",[150,40,30],{sys:"Musculoskeletal"});
X("27130","Total hip replacement","surg","surg","surg",[20.72,null,11.70,4.10],"090",[420,0,0],{fac:{"21":[13480,1970],"22":[12950,2020],"24":[9180,2021]},sys:"Musculoskeletal"});
X("29881","Knee arthroscopy with meniscectomy","surg","surg","surg",[7.03,null,6.10,1.40],"090",[200,0,0],{fac:{"22":[3200,1985],"24":[1750,1985]},sys:"Musculoskeletal"});
X("29827","Shoulder arthroscopy with rotator cuff repair","surg","surg","surg",[15.60,null,11.00,3.00],"090",[330,0,0],{fac:{"22":[6800,1995],"24":[3900,1995]},since:1995,sys:"Musculoskeletal"});
X("22551","Anterior cervical spine fusion, one level","surg","surg","surg",[25.00,null,13.50,5.50],"090",[420,0,0],{fac:{"21":[23400,1970],"22":[15000,2021]},since:2011,pred:"63075 + 22554 anterior discectomy and fusion",sys:"Musculoskeletal"});
X("63030","Lumbar laminotomy with disc removal, one level","surg","surg","surg",[13.18,null,11.00,2.80],"090",[330,0,0],{fac:{"22":[7900,2000],"24":[4100,2008]},sys:"Nervous system"});
X("31231","Diagnostic nasal endoscopy","surg","proc","surg",[1.10,3.00,0.70,0.12],"000",[25,20,20],{sys:"Respiratory"});
X("31575","Flexible laryngoscopy","surg","proc","surg",[1.10,2.00,0.70,0.10],"000",[20,15,15],{sys:"Respiratory"});
X("33533","Coronary artery bypass, single arterial graft","surg","surg","card",[33.75,null,16.00,7.60],"090",[700,0,0],{fac:{"21":[28400,1970]},sys:"Cardiovascular"});
X("33208","Dual-chamber pacemaker insertion","surg","surg","card",[8.13,null,6.50,1.60],"090",[240,0,0],{fac:{"22":[11000,2000],"21":[21000,1970]},sys:"Cardiovascular"});
X("92928","Coronary stent placement, one vessel","surg","surg","card",[10.96,null,4.10,2.00],"000",[150,0,0],{fac:{"22":[11800,2013],"24":[9400,2020],"21":[19500,2013]},since:2013,pred:"92980 coronary stent placement",sys:"Cardiovascular"});
X("93458","Left heart catheterization with coronary angiography","surg","proc","card",[5.10,null,2.30,0.90],"000",[90,0,0],{fac:{"22":[3300,2011],"24":[2500,2020]},since:2011,pred:"93510 + 93545 catheterization and injection",sys:"Cardiovascular"});
X("36556","Central venous catheter insertion, age 5 or older","surg","proc","med",[1.75,3.00,0.60,0.20],"000",[40,20,40],{since:2004,sys:"Cardiovascular"});
X("43239","Upper GI endoscopy with biopsy","surg","proc","med",[2.09,6.60,1.00,0.25],"000",[45,40,40],{fac:{"22":[1100,2000],"24":[520,1982]},sys:"Digestive"});
X("45380","Colonoscopy with biopsy","surg","proc","med",[3.56,7.70,1.50,0.45],"000",[60,40,45],{fac:{"22":[1200,2000],"24":[560,1982]},sys:"Digestive"});
X("45385","Colonoscopy with snare removal of polyp","surg","proc","med",[4.57,8.80,1.90,0.55],"000",[70,40,50],{fac:{"22":[1250,2000],"24":[580,1982]},sys:"Digestive"});
X("47562","Laparoscopic gallbladder removal","surg","surg","surg",[10.47,null,7.50,2.40],"090",[270,0,0],{fac:{"21":[11360,1990],"22":[6500,2000]},since:1990,sys:"Digestive"});
X("49505","Inguinal hernia repair, initial, age 5 or older","surg","surg","surg",[7.96,null,6.30,1.60],"090",[220,0,0],{fac:{"22":[3900,2000],"24":[2100,1982]},sys:"Digestive"});
X("44970","Laparoscopic appendectomy","surg","surg","surg",[9.45,null,6.70,2.10],"090",[240,0,0],{fac:{"21":[7800,1992],"22":[5600,2000]},since:1992,sys:"Digestive"});
X("52000","Cystoscopy","surg","proc","surg",[1.53,3.50,0.80,0.17],"000",[30,25,30],{sys:"Urinary"});
X("55700","Prostate biopsy","surg","proc","surg",[2.50,5.00,1.30,0.30],"000",[45,40,60],{sys:"Male genital"});
X("52601","Transurethral resection of prostate","surg","surg","surg",[13.16,null,8.40,1.90],"090",[300,0,0],{fac:{"22":[4200,2000],"24":[2900,2008]},sys:"Urinary"});
X("58558","Hysteroscopy with endometrial biopsy","surg","proc","ob",[4.17,6.50,2.80,0.70],"000",[75,45,60],{sys:"Female genital"});
X("58571","Laparoscopic hysterectomy with tube and ovary removal","surg","surg","ob",[15.10,null,9.10,3.30],"090",[360,0,0],{fac:{"21":[12000,2002],"22":[8200,2002]},since:2008,pred:"58550 laparoscopic vaginal hysterectomy",sys:"Female genital"});
X("59400","Routine obstetric care with vaginal delivery (global)","surg","surg","ob",[23.06,null,18.00,6.70],"MMM",[900,0,0],{sys:"Maternity"});
X("59510","Routine obstetric care with cesarean delivery (global)","surg","surg","ob",[26.22,null,19.50,7.40],"MMM",[1000,0,0],{sys:"Maternity"});
X("64483","Transforaminal epidural injection, lumbar, one level","surg","proc","surg",[1.90,5.90,1.00,0.17],"000",[40,40,60],{fac:{"22":[900,2000],"24":[450,2008]},since:2000,sys:"Nervous system"});
X("62323","Lumbar epidural injection with imaging guidance","surg","proc","surg",[1.80,5.20,0.90,0.15],"000",[40,40,55],{since:2017,pred:"62311 lumbar epidural injection",fac:{"22":[850,2017],"24":[430,2017]},sys:"Nervous system"});
X("64721","Carpal tunnel release","surg","surg","surg",[4.97,9.50,4.90,0.90],"090",[150,40,40],{fac:{"22":[2900,2000],"24":[1700,1982]},sys:"Nervous system"});
X("66821","Laser opening of lens capsule after cataract surgery","surg","proc","oph",[2.36,4.00,3.20,0.20],"090",[60,30,20],{sys:"Eye"});
X("67028","Injection of medication into the eye","surg","proc","oph",[1.44,1.40,0.80,0.08],"000",[20,20,10],{sys:"Eye"});
X("69210","Earwax removal requiring instruments","surg","proc","pc",[0.61,0.75,0.25,0.05],"000",[10,10,3],{sys:"Ear"});
// Radiology
X("70450","CT head without contrast","rad","rad","rad",[0.85,2.60,0.32,0.05],"XXX",[15,20,15],{fac:{"22":[210,2000]},since:1976});
X("71250","CT chest without contrast","rad","rad","rad",[1.16,3.20,0.45,0.07],"XXX",[18,20,15],{fac:{"22":[210,2000]},since:1976});
X("74177","CT abdomen and pelvis with contrast","rad","rad","rad",[1.82,7.50,0.70,0.10],"XXX",[25,30,60],{fac:{"22":[510,2011]},since:2011,pred:"74160 + 72193 CT abdomen and pelvis"});
X("72148","MRI lumbar spine without contrast","rad","rad","rad",[1.48,5.60,0.60,0.08],"XXX",[22,40,20],{fac:{"22":[290,2000]},since:1985});
X("73721","MRI knee without contrast","rad","rad","rad",[1.35,5.30,0.55,0.07],"XXX",[20,40,20],{fac:{"22":[290,2000]},since:1985});
X("76700","Abdominal ultrasound, complete","rad","rad","rad",[0.81,2.40,0.30,0.05],"XXX",[15,30,8],{fac:{"22":[200,2000]}});
X("76805","Obstetric ultrasound after first trimester","rad","rad","rad",[0.99,2.80,0.40,0.05],"XXX",[18,35,8]);
X("77067","Screening mammogram, both breasts","rad","rad","rad",[0.76,3.30,0.30,0.05],"XXX",[10,25,10],{since:2017,pred:"G0202 screening mammography"});
X("77080","Bone density scan (DXA), spine and hip","rad","rad","rad",[0.20,1.00,0.10,0.01],"XXX",[5,15,3],{since:1992});
X("78452","Nuclear stress test, multiple studies","rad","rad","rad",[1.62,10.60,0.70,0.08],"XXX",[30,90,120],{fac:{"22":[1200,2000]},since:2010,pred:"78465 myocardial perfusion imaging"});
X("77301","Radiation therapy planning, intensity-modulated","rad","rad","rad",[7.99,49.00,3.50,0.50],"XXX",[120,200,80],{since:2002});
X("93306","Echocardiogram, complete with Doppler","rad","proc","card",[1.46,4.60,0.55,0.08],"XXX",[35,60,20],{fac:{"22":[600,2000]},since:2009,pred:"93307 + 93320 + 93325 echo with Doppler"});
X("88305","Surgical pathology, gross and microscopic, level IV","lab","proc","path",[0.75,1.10,0.35,0.02],"XXX",[10,15,12]);
// Laboratory (Clinical Laboratory Fee Schedule)
LB("80053","Comprehensive metabolic panel",10.56,1993,4,3); LB("80061","Lipid panel",13.39,1993,4,3); LB("83036","Hemoglobin A1c",9.71,1993,3,3);
LB("84443","Thyroid stimulating hormone (TSH)",16.80,1984,3,4); LB("85025","Complete blood count with differential",7.77,1993,3,2); LB("81001","Urinalysis, automated with microscopy",3.17,1984,3,1);
LB("87086","Urine culture, colony count",8.68,1984,6,3); LB("87635","SARS-CoV-2 molecular test",51.31,2020,8,22); LB("81528","Stool DNA colorectal cancer screening",508.87,2016,25,140);
LB("36415","Routine venipuncture",3.00,1993,5,1);
// Medicine
X("90471","Vaccine administration, first injection","med","proc","pc",[0.17,0.60,null,0.01],"XXX",[3,8,2],{since:1999});
X("90791","Psychiatric diagnostic evaluation","med","psych","beh",[3.00,2.00,1.00,0.10],"XXX",[60,0,0],{since:2013,pred:"90801 psychiatric diagnostic interview"});
X("90832","Psychotherapy, 30 minutes","med","psych","beh",[1.70,0.45,0.40,0.07],"XXX",[33,0,0],{since:2013,pred:"90804 psychotherapy, 20–30 minutes"});
X("90834","Psychotherapy, 45 minutes","med","psych","beh",[2.25,0.60,0.50,0.09],"XXX",[48,0,0],{since:2013,pred:"90806 psychotherapy, 45–50 minutes"});
X("90853","Group psychotherapy","med","psych","beh",[0.59,0.20,0.15,0.02],"XXX",[15,0,0]);
X("96127","Brief emotional or behavioral assessment","med","psych","pc",[0,0.15,null,0],"XXX",[0,5,1],{since:2015});
X("96372","Therapeutic injection, under skin or into muscle","med","proc","pc",[0.17,0.25,null,0.01],"XXX",[3,8,3],{since:2009,pred:"90772 therapeutic injection"});
X("96365","IV infusion, therapeutic, first hour","med","proc","med",[0.21,1.80,null,0.02],"XXX",[5,60,20],{since:2006,pred:"90780 IV infusion"});
X("96413","Chemotherapy infusion, first hour","med","proc","med",[0.28,3.30,null,0.03],"XXX",[8,75,30],{since:2006,pred:"96410 chemotherapy infusion"});
X("97112","Neuromuscular re-education, each 15 minutes","med","therapy","ther",[0.50,0.58,0.25,0.02],"XXX",[18,0,2],{since:1992});
X("97140","Manual therapy, each 15 minutes","med","therapy","ther",[0.43,0.45,0.20,0.02],"XXX",[18,0,1],{since:1995});
X("97161","Physical therapy evaluation, low complexity","med","therapy","ther",[1.54,1.30,0.60,0.06],"XXX",[45,0,3],{since:2017,pred:"97001 physical therapy evaluation"});
X("97530","Therapeutic activities, each 15 minutes","med","therapy","ther",[0.44,0.64,0.25,0.02],"XXX",[18,0,2],{since:1995});
X("97116","Gait training, each 15 minutes","med","therapy","ther",[0.45,0.40,0.20,0.02],"XXX",[18,0,1],{since:1992});
X("92507","Speech-language treatment","med","therapy","ther",[1.30,1.00,0.50,0.05],"XXX",[40,0,3],{since:1992});
X("97803","Medical nutrition therapy, follow-up, each 15 minutes","med","mnt","mnt",[0.45,0.55,0.45,0.02],"XXX",[18,0,1],{since:2002});
X("92557","Comprehensive hearing test","med","aud","aud",[0.60,0.85,null,0.03],"XXX",[30,0,3],{since:1992});
X("92014","Comprehensive eye exam, established patient","med","proc","oph",[1.42,1.70,0.80,0.07],"XXX",[30,30,5]);
X("92134","Retinal imaging by optical coherence tomography","med","proc","oph",[0.32,0.68,null,0.02],"XXX",[5,15,3],{since:2011});
X("92229","Retinal imaging with autonomous AI analysis","med","proc","oph",[0,1.35,null,0],"XXX",[0,10,25],{since:2021});
X("94010","Spirometry","med","proc","pc",[0.17,0.80,null,0.01],"XXX",[5,20,5]);
X("95004","Allergy skin tests, per test","med","proc","pc",[0,0.16,null,0],"XXX",[0,2,1]);
X("95810","In-lab sleep study (polysomnography)","med","proc","med",[2.50,15.40,null,0.15],"XXX",[45,480,40],{since:1992});
X("95819","Electroencephalogram (EEG), awake and asleep","med","proc","med",[1.08,9.00,null,0.07],"XXX",[25,90,15]);
X("95886","Needle electromyography, one extremity","med","proc","med",[0.86,1.70,0.40,0.05],"XXX",[25,20,8],{since:2012});
X("93880","Carotid artery duplex ultrasound, both sides","med","proc","card",[0.80,5.00,null,0.05],"XXX",[15,45,10]);
X("93224","Holter monitor, 48 hours, complete","med","proc","card",[0.39,2.00,null,0.03],"XXX",[15,30,20],{since:2011});
X("98977","Remote therapeutic monitoring device, musculoskeletal","med","therapy","ther",[0,1.30,null,0],"XXX",[0,5,25],{since:2022});
// HCPCS additions
RCODES.push({c:"G0402",d:"Welcome to Medicare preventive visit",t:"hcpcs",g:"awv",k:"pfs",nf:175,f:131,fac:{},since:2005,pred:null,rvu:[[2005,0.95],[2026,1]],sec:"g",spec:"pc",cost:[45,30,3]});
RCODES.push({c:"G0444",d:"Annual depression screening, 5–15 minutes",t:"hcpcs",g:"em",k:"pfs",nf:19,f:14,fac:{},since:2012,pred:null,rvu:[[2012,1],[2026,1]],sec:"g",spec:"pc",cost:[10,0,0]});
RCODES.push({c:"G2212",d:"Prolonged office visit, each additional 15 minutes",t:"hcpcs",g:"em",k:"pfs",nf:31,f:23,fac:{},since:2021,pred:null,sec:"g",spec:"pc",cost:[15,0,0]});
RCODES.push({c:"E0601",d:"CPAP device, monthly rental",t:"hcpcs",g:"dme",k:"asp",since:1990,asp:[[1990,92],[2011,78],[2016,62],[2026,68]],fac:{},sec:"dme"});
RCODES.push({c:"A4253",d:"Blood glucose test strips, box of 50",t:"hcpcs",g:"dme",k:"asp",since:1990,asp:[[1990,38],[2010,33],[2013,10.4],[2026,9.2]],fac:{},sec:"dme"});
RCODES.push({c:"J0897",d:"Denosumab injection, 1 mg",t:"hcpcs",g:"drug",k:"asp",since:2012,asp:[[2012,14.1],[2020,18.6],[2026,21.4]],fac:{"22":[21.4,2012]},sec:"dme"});
RCODES.push({c:"90686",d:"Influenza vaccine, quadrivalent, preservative-free (product)",t:"cat1",g:"drug",k:"asp",since:2013,asp:[[2013,16.4],[2020,19.0],[2026,21.9]],fac:{},sec:"med"});
[["4004F","Screened for tobacco use and given cessation counseling"],["3078F","Most recent diastolic blood pressure below 80"],["1160F","Medication list reviewed by prescribing clinician"]].forEach(([c,d])=>RCODES.push({c,d,t:"cat2",g:"q",k:"zero",since:2005}));
// patch section / specialty / cost inputs onto the original codes
const PATCH = {"99202":["em","pc",20,15,3],"99203":["em","pc",30,20,3],"99204":["em","pc",45,25,4],"99205":["em","pc",60,30,4],"99213":["em","pc",30,20,3],"99214":["em","pc",40,30,4],"99215":["em","pc",55,35,4],
  "27447":["surg","surg",420,0,0],"66984":["surg","oph",150,0,0],"45378":["surg","med",60,30,25],"70553":["rad","rad",30,40,60],"71046":["rad","rad",10,10,5],"93000":["med","card",10,10,3],"90837":["med","beh",65,0,0],"97110":["med","ther",18,0,2],"97802":["med","mnt",20,0,1],
  "G0438":["g","pc",60,30,3],"G0439":["g","pc",45,25,3],"G0556":["g","pc",10,20,0],"G0557":["g","pc",20,40,0],"G0558":["g","pc",40,70,0],"G2211":["g","pc",5,0,0],"0275T":["t","surg",120,0,0],
  "J9271":["dme"],"J1745":["dme"],"J0178":["dme"],"C1713":["dme"],"Q4101":["dme"],"3044F":["q"],"3074F":["q"],"1036F":["q"]};
RCODES.forEach(c=>{ const p = PATCH[c.c]; if (p){ c.sec = p[0]; if (p[1]){ c.spec = p[1]; c.cost = [p[2],p[3],p[4]]; } } if (c.c==="27447"||c.c==="66984") c.sys = c.c==="27447"?"Musculoskeletal":"Eye"; });
RPROV.push(["aud","Audiologist",1,["aud"]],["crna","Certified registered nurse anesthetist",1,["anes"]]);

/* ── Cost-of-care model ── */
const SPEC = { pc:["Primary care",300000,12000,126000], med:["Internal medicine specialty",380000,18000,126000], card:["Cardiology",520000,25000,130000], surg:["Surgery",560000,48000,150000], oph:["Ophthalmology",460000,12000,140000], ob:["Obstetrics & gynecology",400000,85000,140000], rad:["Radiology",500000,20000,130000], beh:["Psychiatry",290000,8000,120000], ther:["Physical & occupational therapy",100000,2000,110000], mnt:["Dietetics",75000,1500,110000], anes:["Anesthesiology",450000,25000,150000], der:["Dermatology",450000,10000,130000], path:["Pathology",400000,10000,130000], lab:["Laboratory",0,0,1], aud:["Audiology",95000,2000,110000] };
const PROVCOMP = { np:135000, cnm:130000, psy:115000, sw:80000, mft:75000, pt:100000, pta:70000, rd:75000, aud:95000, crna:210000 };
// local cost indexes: wages, rent, malpractice
const LOCCOST = { US:[1,1,1], SF:[1.35,2.1,0.9], NYC:[1.30,2.4,2.2], HOU:[0.98,0.9,0.8], MIA:[1.0,1.4,2.0], MSP:[1.05,1.0,0.6], ALR:[0.80,0.55,0.7], AK:[1.30,1.2,1.0] };
const CDEF = { ben:22, staffWage:25, rentSqft:28, sqft:1400, admin:70000, util:24000, other:18000, bill:6 };
const CLAB = { ben:"Benefits & payroll tax (% of pay)", staffWage:"Clinical staff wage ($/hour)", rentSqft:"Office rent ($ per sq ft per year)", sqft:"Office space per clinician (sq ft)", admin:"Front desk, billing & admin staff per clinician ($/yr)", util:"Utilities, IT, EHR & phones per clinician ($/yr)", other:"Other overhead per clinician: insurance, legal, accounting ($/yr)", bill:"Billing & collections (% of payment)" };
const FCOV = { "22":0.83, "21":0.87, "24":1.10 };
const cv = k => store.costs?.[k] ?? CDEF[k];
function careCost(c, pos, medPay, facPay){
  if (c.k==="asp") return {parts:[["Drug or supply acquisition",medPay/1.06],["Handling, storage & billing",medPay*0.04]], prof:medPay*1.1/1.06, fac:0, total:medPay*1.1/1.06, note:"acquisition"};
  if (!c.cost) return null;
  const [W,R,Mi] = LOCCOST[state.rloc] || LOCCOST.US, sp = SPEC[c.spec||"pc"], P = rprov(), elig = !P[3] || P[3].includes(c.g);
  const comp = (store.costs?.["comp_"+c.spec] ?? (P[0]!=="md" && elig && PROVCOMP[P[0]] ? PROVCOMP[P[0]] : sp[1]));
  const malP = (store.costs?.["mal_"+c.spec] ?? sp[2]) * (P[0]!=="md" && elig ? 0.3 : 1), mins = sp[3];
  const fac = !isNF(pos) && pos!=="10", [min, st, sup] = c.cost, ben = cv("ben")/100;
  const parts = [];
  if (c.spec==="lab"){ parts.push(["Lab staff time", st/60*cv("staffWage")*(1+ben)*W], ["Reagents & supplies", sup*(0.9+0.1*W)], ["Equipment, space & overhead", 3.2*(0.5+0.5*R)]); }
  else {
    parts.push(["Clinician time", min*comp*(1+ben)*W/mins]);
    parts.push(["Clinical staff", fac?0:st/60*cv("staffWage")*(1+ben)*W]);
    parts.push(["Supplies & equipment", fac?0:sup*(0.9+0.1*W)]);
    parts.push(["Rent, admin staff, utilities & IT", min/mins*(cv("rentSqft")*cv("sqft")*R*(fac?0.35:1) + cv("admin")*W*(fac?0.5:1) + cv("util")*(fac?0.5:1) + cv("other"))]);
    parts.push(["Malpractice insurance", min*malP*Mi/mins]);
  }
  parts.push(["Billing & collections", medPay*cv("bill")/100]);
  const prof = parts.reduce((a,p)=>a+p[1],0), fc = facPay>0 && FCOV[pos] ? facPay/FCOV[pos] : 0;
  return {parts, prof, fac:fc, total:prof+fc, comp, malP, mins};
}
const COSTCOL = ["var(--c1)","var(--c2)","var(--c4)","var(--c3)","var(--bad)","var(--warn)","var(--accent)"];

/* ── Full CMS fee schedule loader (runs in the viewer's browser) ── */
function guessSec(code){ if (/^\d{4}F$/.test(code)) return ["cat2","q","q"]; if (/^\d{4}T$/.test(code)) return ["cat3","t","surg"]; if (/^[A-Z]\d{4}$/.test(code)) return ["hcpcs", code[0]==="G"?"g":"dme", "pc"];
  const n = +code; if (n>=99000) return ["cat1","em","pc"]; if (n<2000) return ["cat1","anes","anes"]; if (n<70000) return ["cat1","surg", n<20000?"der":n>=65000&&n<69000?"oph":"surg"]; if (n<80000) return ["cat1","rad","rad"]; if (n<90000) return ["cat1","lab","path"];
  return ["cat1","med", n>=90785&&n<=90899?"beh": n>=97000&&n<98000?"ther": n>=92002&&n<92500?"oph":"med"]; }
function parseRVU(text){
  const lines = text.split(/\r?\n/), split = l => { const out=[]; let cur="", q=false; for (const ch of l){ if (ch==='"') q=!q; else if (ch===',' && !q){ out.push(cur); cur=""; } else cur+=ch; } out.push(cur); return out.map(s=>s.trim()); };
  let hi = lines.findIndex(l=>/HCPCS/i.test(l) && /(WORK|RVU|DESCRIPTION)/i.test(l)); if (hi<0) throw new Error("No header row with HCPCS was found.");
  let head = split(lines[hi]); const nxt = split(lines[hi+1]||""); if (!/^[A-Z0-9]{5}$/.test(nxt[0]||"")) { head = head.map((h,i)=>(h+" "+(nxt[i]||"")).trim()); hi++; }
  const col = re => head.findIndex(h=>re.test(h.toUpperCase()));
  const iC = col(/^HCPCS/), iM = col(/^MOD/), iD = col(/DESCRIPTION/), iS = col(/STATUS/), iW = col(/WORK/), iNP = col(/NON-?\s?FAC(ILITY)?\s*PE/), iFP = head.findIndex((h,i)=>/FACILITY\s*PE/i.test(h) && i!==iNP), iMP = col(/(^MP|MALPRACTICE|\bMP RVU)/), iNA = col(/NON-?\s?FAC(ILITY)?\s*NA/), iFNA = head.findIndex((h,i)=>/FACILITY\s*NA/i.test(h) && i!==iNA), iG = col(/GLOB/);
  if ([iC,iW,iNP,iFP,iMP].some(i=>i<0)) throw new Error("Couldn't find the HCPCS, WORK RVU, NON-FAC PE RVU, FACILITY PE RVU and MP RVU columns.");
  const rows = [];
  for (let i=hi+1;i<lines.length;i++){ const r = split(lines[i]); const code=(r[iC]||"").toUpperCase(); if (!/^[A-Z0-9]{5}$/.test(code)) continue; if (iM>=0 && r[iM]) continue;
    const st = iS>=0 ? r[iS] : "A"; if (!/^[ARTC]$/i.test(st)) continue;
    const w=+r[iW]||0, np=+r[iNP]||0, fp=+r[iFP]||0, mp=+r[iMP]||0; if (w+np+fp+mp<=0) continue;
    rows.push([code, (iD>=0?r[iD]:"").slice(0,60), w, (iNA>=0 && /NA/i.test(r[iNA]))?null:np, (iFNA>=0 && /NA/i.test(r[iFNA]))?null:fp, mp, iG>=0?r[iG]:""]); }
  return rows;
}
function addRVURows(rows){
  const have = new Set(RCODES.map(c=>c.c)); let n=0;
  rows.forEach(([code,d,w,np,fp,mp,glob])=>{ if (have.has(code)) return; const [t,sec,spec] = guessSec(code); if (t==="cat2") return;
    const min = Math.round(w*22 + (glob==="090"?60:glob==="010"?20:0)), st = np!=null ? Math.round(np*8) : 0, sup = np!=null ? r2(np*CF26*0.15) : 0;
    RCODES.push({c:code, d:d?d.charAt(0)+d.slice(1).toLowerCase():"(description from CMS file)", t, g:sec==="em"?"em":sec==="surg"?"surg":sec==="rad"?"rad":"proc", k:"pfs", sec, spec, glob, rvus:[w,np,fp,mp], nf:np==null?null:r2((w+np+mp)*CF26), f:fp==null?null:r2((w+fp+mp)*CF26), fac:{}, since:1992, pred:null, rvu:SEC_RVU[sec]||SEC_RVU.med, cost:[min,st,sup], est:true, loaded:true}); n++; });
  return n;
}
let RVU_LOADED = 0;
try { const saved = JSON.parse(localStorage.getItem("agora-health-rvu")||"null"); if (saved && saved.rows) RVU_LOADED = addRVURows(saved.rows); } catch(e){}


const rcode = () => RCODES.find(x=>x.c===state.rc && x.t===state.rt) || RCODES.find(x=>x.t===state.rt) || RCODES[0];
const rloc = () => RLOC.find(l=>l[0]===state.rloc) || RLOC[0];
const rprov = () => RPROV.find(p=>p[0]===state.rprov) || RPROV[0];
function rSettings(c){ const s=[]; if (c.k==="clfs") return ["11"]; if (c.k==="asp"||c.k==="packaged") return Object.keys(c.fac).concat(c.k==="asp"?["11"]:[]).sort().reverse();
  if (c.nf!=null) s.push("11"); if (c.nf!=null && ["em","psych","awv","apcm","mnt","therapy"].includes(c.g)) s.push("10");
  ["22","24","21"].forEach(p=>{ if (c.fac[p] || (c.f!=null && p==="22" && !c.fac[p] && ["psych","therapy","mnt","ecg","awv","apcm","em"].includes(c.g))) s.push(p); });
  if (!s.length && c.f!=null) s.push("22","21"); if (!s.length && c.nf!=null) s.push("11"); return s; }
const isNF = p => p==="11"||p==="10";
function rCalc(c, y, pos, payer){
  const L = rloc(), P = rprov(), pm = (P[3] && !P[3].includes(c.g)) ? 1 : P[2];
  let prof = null, fac = 0, start = c.pred ? 1970 : c.since;
  if (c.k==="zero") return {prof:0, fac:0, tot:0, comm:0};
  if (c.k==="asp"||c.k==="clfs"){ if (y < c.since) return null; prof = interp(c.asp, y, false); }
  else if (c.k==="packaged"){ if (y < c.since || !c.fac[pos]) return null; prof = 0; }
  else { if (y < start) return null; const base = isNF(pos) ? c.nf : c.f; if (base==null) return null; prof = base * L[2] * pm * pfsIdx(y) * (c.rvu ? interp(c.rvu, y, false) : 1); }
  const fe = c.fac[pos];
  if (fe && c.k!=="asp" && c.k!=="packaged"){ if (y >= fe[1] && !(pos==="24" && y<1982)) fac = fe[0] * L[2] * interp(FAC_A, y, true); else if (pos!=="11") fac = null; }
  if (fac===null) return null;
  const pay = RPAY.find(p=>p[0]===(payer||"AVG")), avg = RPAY.find(p=>p[0]==="AVG");
  const relP = pay[2]/avg[2], relF = pay[3]/avg[3], lc = L[3]/L[2];
  let comm;
  if (payer==="MCR") comm = prof + fac;
  else if (c.k==="clfs") comm = prof * (1 + (pay[2]-1)*0.5);
  else if (c.k==="asp") comm = prof * (pos==="22" ? 1 + (pay[3]-1)*0.4 : 1 + (pay[2]-1)*0.6);
  else if (c.k==="packaged") comm = c.carve * interp(FAC_A, y, true) * L[3] * relF;
  else { const fr0 = interp(COMM_A.fac, y, false), fr = pos==="21" ? 1+(fr0-1)*0.7 : pos==="24" ? 1+(fr0-1)*0.6 : fr0; comm = prof * interp(COMM_A.prof, y, false) * relP * lc + fac * fr * relF * lc; }
  return {prof, fac, tot:prof+fac, comm};
}
function rBasis(c, y){
  if (y===2027) return ["CY2027 proposed rule (final due Nov 2026)","Agora projection"];
  if (y>2027) return ["Agora projection: statutory update + budget neutrality","Agora projection"];
  const m = c.k==="clfs" ? "Clinical Laboratory Fee Schedule" : c.k==="asp" ? (y<2005?"Average wholesale price basis":"ASP pricing file") : c.k==="packaged" ? "Packaged into facility payment" : c.k==="carrier" ? "Contractor-priced (MAC average)" : y<1992 ? "Estimated: crosswalked prevailing charges" : "Published fee schedule";
  const p = y<2022 ? "Estimated from research studies" : "Transparency in Coverage files";
  return [m, p];
}
const rFmt = v => v==null ? "—" : v===0 ? "$0" : v<100 ? money(v,2) : money(v,0);
const toReal = (v, y) => v==null ? null : v * cpi(2026)/cpi(y);
function histChart(series, events){
  const W=760, H=300, L=62, R=14, T=34, B=30, n=R_YEARS.length;
  const all = series.flatMap(s=>s.vals).filter(v=>v!=null); if (!all.length) return `<p style="font-size:.85rem;color:var(--muted)">No payment history for this selection.</p>`;
  const mx0 = Math.max(...all)*1.06, step = niceStep(mx0/4), mx = Math.ceil(mx0/step)*step;
  const X = i => L + i/(n-1)*(W-L-R), Y = v => T + (mx-v)/mx*(H-T-B);
  let g = "";
  for (let v=0; v<=mx+1e-9; v+=step){ g += `<line x1="${L}" x2="${W-R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--line)" stroke-width="1"/><text x="${L-8}" y="${(Y(v)+4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${v>=1000?"$"+(v/1000).toFixed(v>=10000?0:1)+"K":"$"+(v<10?v.toFixed(1):v.toFixed(0))}</text>`; }
  R_YEARS.forEach((y,i)=>{ if (y%10===0) g += `<text x="${X(i).toFixed(1)}" y="${H-10}" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${y}</text>`; });
  let ev = ""; events.sort((a,b)=>a[0]-b[0]).forEach((e,j)=>{ const x=X(e[0]-1970), ly = 12 + (j%2)*13; ev += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${T-4}" y2="${H-B}" stroke="var(--brass)" stroke-width="1" stroke-dasharray="2 3" opacity=".7"/><text x="${x.toFixed(1)}" y="${ly}" text-anchor="${e[0]>2016?"end":"middle"}" font-size="10" fill="var(--brass)">${e[1]}</text>`; });
  let lines = ""; series.forEach(s=>{ let d="", pen=false; s.vals.forEach((v,i)=>{ if (v==null){ pen=false; return; } d += `${pen?"L":"M"}${X(i).toFixed(1)},${Y(v).toFixed(1)} `; pen=true; });
    lines += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" ${s.dash?'stroke-dasharray="5 4"':""} stroke-linejoin="round"/>`;
    const li = s.vals.length-1; if (s.vals[li]!=null) lines += `<circle cx="${X(li).toFixed(1)}" cy="${Y(s.vals[li]).toFixed(1)}" r="3.5" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`; });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Payment history 1970 to 2026">${g}${ev}${lines}</svg>`;
}

PAGES.rates = () => {
  const t = state.rt, L = rloc(), P = rprov(), Y = state.ryear;
  const tabs = `<div class="toolbar"><span class="sec-h" style="margin:0">Code system</span><div class="seg" role="group" aria-label="Code system">${R_TYPES.map(([k,l])=>`<button data-rt="${k}" aria-pressed="${t===k}">${l}</button>`).join("")}</div></div>`;
  const locSel = `<div class="field"><label for="rLoc">Location</label><select id="rLoc" class="input">${RLOC.map(l=>`<option value="${l[0]}" ${l[0]===L[0]?"selected":""}>${l[1]}</option>`).join("")}</select></div>`;
  const yrSel = `<div class="field"><label for="rYear">Year</label><select id="rYear" class="input">${R_YEARS.slice().reverse().map(y=>`<option value="${y}" ${y===Y?"selected":""}>${y}${y>2026?" ("+rStatus(y).toLowerCase()+")":""}</option>`).join("")}</select></div>`;
  const provSel = `<div class="field"><label for="rProv">Billing professional</label><select id="rProv" class="input">${RPROV.map(p=>`<option value="${p[0]}" ${p[0]===P[0]?"selected":""}>${p[1]} · ${Math.round(p[2]*100)}%</option>`).join("")}</select></div>`;
  let body = "";

  if (["cat1","cat3","hcpcs"].includes(t)) {
    const c = rcode(), sets = rSettings(c); if (!sets.includes(state.rpos)) state.rpos = sets[0];
    const tcodes = RCODES.filter(x=>x.t===t), secs = [...new Set(tcodes.map(x=>x.sec).filter(Boolean))], clist = tcodes.filter(x=>state.rsec==="all"||x.sec===state.rsec);
    const pos = state.rpos, cur = rCalc(c, Y, pos, "MCR"), avg = rCalc(c, Y, pos, "AVG");
    const elig = !P[3] || P[3].includes(c.g) || c.k==="asp" || c.k==="packaged";
    const adj = (v,y) => v==null ? null : state.rreal ? toReal(v,y) : v;
    const medAll = R_YEARS.map(y=>{ const r=rCalc(c,y,pos,"MCR"); return r ? r.tot : null; });
    const comAll = R_YEARS.map(y=>{ const r=rCalc(c,y,pos,"AVG"); return r ? r.comm : null; });
    const med = medAll.map((v,i)=>R_YEARS[i]<=2026?adj(v,R_YEARS[i]):null), medF = medAll.map((v,i)=>R_YEARS[i]>=2026?adj(v,R_YEARS[i]):null);
    const com = comAll.map((v,i)=>R_YEARS[i]<=2026?adj(v,R_YEARS[i]):null), comF = comAll.map((v,i)=>R_YEARS[i]>=2026?adj(v,R_YEARS[i]):null);
    const firstY = R_YEARS.find((y,i)=>medAll[i]!=null);
    const bY = Math.max(state.rbase, firstY ?? state.rbase), bV = medAll[bY-1970];
    const infl = R_YEARS.map(y=> (y<bY || bV==null) ? null : adj(bV*cpi(y)/cpi(bY), y));
    const ev = [[1992,"Fee schedule"],[2015,"MACRA"],[2022,"Price data public"],[2027,"Proposed"]];
    const r26c = rCalc(c,2026,pos,"MCR"), cc26 = r26c ? careCost(c,pos,r26c.prof,r26c.fac) : null;
    const costS = cc26 ? R_YEARS.map(y=> y<(firstY??2026) ? null : adj(cc26.total*cpi(y)/cpi(2026), y)) : R_YEARS.map(()=>null);
    if (c.g==="em") ev.push([2021,"E/M revaluation"]); if (pos==="21") ev.push([1983,"DRGs"]); if (pos==="22") ev.push([2000,"OPPS"]); if (pos==="24") ev.push([1982,"ASC benefit"]); if (c.k==="asp") ev.push([2005,"ASP + 6%"]);
    const ms = [1970,1975,1980,1985,1990,1992,1995,2000,2005,2010,2015,2020,2022,2024,2026].filter(y=>rCalc(c,y,pos,"MCR"));
    const r1992 = firstY<=1992 ? rCalc(c,1992,pos,"MCR") : rCalc(c,firstY,pos,"MCR"), r26 = rCalc(c,2026,pos,"MCR"), baseY = firstY<=1992?1992:firstY;
    const realChg = r1992 && r26 && r1992.tot>0 ? (r26.tot/toReal(r1992.tot,baseY)-1)*100 : null;
    const [bm, bp] = rBasis(c, Y);
    const cs = cpi(Y)/cpi(2026), cc0 = cur ? careCost(c, pos, cur.prof, cur.fac) : null;
    const cc = cc0 ? {...cc0, parts:cc0.parts.map(([l,v])=>[l,v*cs]), total:cc0.total*cs, fac:cc0.fac*cs} : null;
    const mcaid = cur ? cur.prof*(c.k==="asp"?1:0.72) + cur.fac*0.88 : null;
    body = `<div class="form-row">
        <div class="field"><label for="rSec">Section</label><select id="rSec" class="input"><option value="all">All sections</option>${secs.map(sc=>`<option value="${sc}" ${state.rsec===sc?"selected":""}>${SEC[sc]||sc}</option>`).join("")}</select></div>
        <div class="field"><label for="rCode">Code</label><select id="rCode" class="input">${clist.concat(clist.includes(c)?[]:[c]).map(x=>`<option value="${x.c}" ${x.c===c.c?"selected":""}>${x.c} · ${esc(x.d)}</option>`).join("")}</select></div>
        <div class="field"><label for="rFind">Find any code</label><input id="rFind" class="input" list="rFindList" placeholder="Type a code or word" autocomplete="off"><datalist id="rFindList">${RCODES.filter(x=>x.t!=="cat2").slice(0,6000).map(x=>`<option value="${x.c} · ${esc(x.d)}"></option>`).join("")}</datalist></div>
        <div class="field"><label for="rPos">Setting</label><select id="rPos" class="input">${sets.map(s=>`<option value="${s}" ${s===pos?"selected":""}>${RSET.find(r=>r[0]===s)[1]}</option>`).join("")}</select></div>
        ${provSel}${locSel}${yrSel}</div>
      ${!elig?`<div class="notice warn"><span class="bar"></span><div><b>${esc(P[1])}s don't usually bill ${c.c} under Medicare.</b> Showing the physician rate.</div></div>`:""}
      ${c.k==="carrier"?`<div class="notice"><span class="bar"></span><div><b>Category III codes have no national Medicare rate.</b> Each Medicare Administrative Contractor sets its own price; the figure shown is the average across contractors.</div></div>`:""}
      ${c.k==="packaged"?`<div class="notice"><span class="bar"></span><div><b>Medicare doesn't pay separately for ${c.c}.</b> The device cost is packaged into the facility's APC or ASC payment. Many private contracts carve implants out and pay invoice cost plus a markup, shown as the private-plan rate.</div></div>`:""}
      <div class="grid-tight">
        <div class="stat"><div class="l">Medicare professional</div><div class="v">${cur?rFmt(cur.prof):"—"}</div><div class="s">${c.k==="asp"?"ASP + 6%, national":isNF(pos)?"Non-facility rate":"Facility rate"} · ${Y}</div></div>
        <div class="stat"><div class="l">Medicare facility</div><div class="v">${cur?rFmt(cur.fac):"—"}</div><div class="s">${pos==="21"?"MS-DRG payment":pos==="22"?"OPPS (APC)":pos==="24"?"ASC payment":"None in this setting"}</div></div>
        <div class="stat"><div class="l">Medicare total</div><div class="v">${cur?rFmt(cur.tot):"—"}</div><div class="s">${pos==="21"?"Part A deductible applies":"Patient pays 20% after deductible"}</div></div>
        <div class="stat"><div class="l">Private plans, average</div><div class="v">${avg?rFmt(avg.comm):"—"}</div><div class="s">${cur&&cur.tot>0&&avg?(avg.comm/cur.tot*100).toFixed(0)+"% of Medicare":"Medicare pays $0 separately"}</div></div>
        <div class="stat"><div class="l">Medicare real change</div><div class="v ${realChg==null?"":realChg<0?"down":"up"}">${realChg==null?"—":pct(realChg)}</div><div class="s">${baseY} to 2026, after inflation</div></div>
        <div class="stat"><div class="l">Est. cost to provide</div><div class="v">${cc?rFmt(cc.total):"—"}</div><div class="s">${cc&&cur.tot>0?`Medicare covers <b class="num ${cur.tot<cc.total?"down":"up"}">${(cur.tot/cc.total*100).toFixed(0)}%</b>`:"Not modeled for this code"}</div></div>
      </div>
      <section class="card"><div class="card-h"><div><h3>${c.c} · ${esc(c.d)}</h3><div class="sub">${RSET.find(r=>r[0]===pos)[1]} · ${L[1]} · ${Y}${c.pred?` · Before ${c.since}, tracked through predecessor ${esc(c.pred)}`:c.since>1970?` · Code created ${c.since}`:""}</div></div></div>
        <div class="tbl"><table><thead><tr><th>Payer</th><th class="r">Professional</th><th class="r">Facility</th><th class="r">Total</th><th class="r">% of Medicare</th><th class="r">Typical range</th></tr></thead><tbody>
        ${RPAY.map(p=>{ const r = rCalc(c, Y, pos, p[0]); if (!r) return ""; const tot = p[0]==="MCR" ? r.tot : r.comm, share = r.tot>0 ? tot/r.tot : 0;
          const pr = p[0]==="MCR" ? r.prof : c.k==="packaged" ? 0 : r.prof*(r.tot?share:1), fa = p[0]==="MCR" ? r.fac : tot-pr;
          return `<tr${p[0]===state.co?' style="background:var(--accent-soft)"':""}><td><span class="strong">${p[1]}</span>${p[0]==="MCR"?`<span class="tsub">${bm}</span>`:`<span class="tsub">${bp}</span>`}</td><td class="r num">${rFmt(c.k==="packaged"&&p[0]!=="MCR"?0:pr)}</td><td class="r num">${rFmt(fa)}</td><td class="r num strong">${rFmt(tot)}</td><td class="r num">${p[0]==="MCR"?"100%":r.tot>0?(share*100).toFixed(0)+"%":"—"}</td><td class="r num" style="font-size:.78rem;color:var(--muted);white-space:nowrap">${p[0]==="MCR"?"Fixed rate":rFmt(tot*0.82)+"–"+rFmt(tot*1.22)}</td></tr>`;}).join("")}
        </tbody></table></div>
        <div class="card-f">Private-plan rates use plan-level negotiated rates (median, with 25th to 75th percentile range) from 2022 onward; earlier years are estimated from published studies of commercial prices relative to Medicare. Code descriptions are Agora's plain-language summaries.</div></section>
      ${cc?`<section class="card"><div class="card-h"><div><h3>Cost to provide ${c.c} vs. what it pays</h3><div class="sub">${esc(P[1])} · ${RSET.find(r=>r[0]===pos)[1]} · ${L[1]} · ${Y}${c.est?" · inputs estimated from RVUs":""}</div></div></div>
        <div class="card-b">
          ${(()=>{ const parts = cc.parts.filter(x=>x[1]>0.005).concat(cc.fac>0?[["Facility cost (hospital or surgery center)",cc.fac]]:[]); return `<div class="stack" style="height:18px" role="img" aria-label="Cost breakdown">${parts.map((x,j)=>`<span style="width:${x[1]/cc.total*100}%;background:${COSTCOL[j%COSTCOL.length]}" title="${esc(x[0])}"></span>`).join("")}</div>
          <div class="legend">${parts.map((x,j)=>`<span><i style="background:${COSTCOL[j%COSTCOL.length]}"></i>${esc(x[0])} <b class="num">${rFmt(x[1])}</b></span>`).join("")}</div>`; })()}
          <div class="tbl"><table><thead><tr><th>Payer</th><th class="r">Pays</th><th class="r">Est. cost</th><th class="r">Margin per service</th><th class="r">Covers cost</th></tr></thead><tbody>
          ${[["Medicare",cur.tot],["Private plans, average",avg?avg.comm:null],["Medicaid (national average estimate)",mcaid]].map(([l,v])=>v==null?"":`<tr><td class="strong" style="font-weight:500">${l}</td><td class="r num">${rFmt(v)}</td><td class="r num">${rFmt(cc.total)}</td><td class="r num ${v<cc.total?"down":"up"}">${v-cc.total<0?"−"+rFmt(cc.total-v):"+"+rFmt(v-cc.total)}</td><td class="r num strong ${v<cc.total?"down":"up"}">${(v/cc.total*100).toFixed(0)}%</td></tr>`).join("")}
          <tr><td colspan="5" style="font-size:.8rem;color:var(--ink-2)">Break-even payment for this service: <b class="num">${rFmt(cc.total)}</b>${cc.fac>0?`, of which <b class="num">${rFmt(cc.total-cc.fac)}</b> is the professional side`:""}.</td></tr>
          </tbody></table></div>
          ${c.k!=="asp"?`<details><summary style="cursor:pointer;font-size:.84rem;font-weight:600;color:var(--accent)">Cost assumptions${Object.keys(store.costs||{}).length?" (customized)":""}: enter your practice's numbers</summary>
            <div class="form-row" style="margin-top:10px">
              ${c.spec!=="lab"?`<div class="field"><label for="cst_comp_${c.spec}">${SPEC[c.spec][0]} clinician pay ($/yr, national)</label><input id="cst_comp_${c.spec}" class="input num" type="number" step="1000" data-cost="comp_${c.spec}" value="${store.costs?.["comp_"+c.spec] ?? SPEC[c.spec][1]}"></div>
              <div class="field"><label for="cst_mal_${c.spec}">Malpractice premium ($/yr, national)</label><input id="cst_mal_${c.spec}" class="input num" type="number" step="500" data-cost="mal_${c.spec}" value="${store.costs?.["mal_"+c.spec] ?? SPEC[c.spec][2]}"></div>`:""}
              ${Object.keys(CDEF).map(k=>`<div class="field"><label for="cst_${k}">${CLAB[k]}</label><input id="cst_${k}" class="input num" type="number" data-cost="${k}" value="${cv(k)}"></div>`).join("")}
            </div>
            <div class="toolbar" style="margin-top:10px"><span style="font-size:.78rem;color:var(--muted)">Enter national-average values; ${L[1]} adjusts wages ×${(LOCCOST[state.rloc]||LOCCOST.US)[0]}, rent ×${(LOCCOST[state.rloc]||LOCCOST.US)[1]}, malpractice ×${(LOCCOST[state.rloc]||LOCCOST.US)[2]}.</span>${Object.keys(store.costs||{}).length?`<button class="btn ghost sm" data-costreset="1">Reset to Agora defaults</button>`:""}</div>
          </details>`:""}
        </div>
        <div class="card-f">${c.k==="asp"?"Drug and supply cost is the purchase price (Medicare pays average sales price plus 6%) plus handling.":`Clinician time uses each code's total time, including visits in the global surgery period. Time is priced at ${SPEC[c.spec].length?SPEC[c.spec][0].toLowerCase():""} pay plus benefits over ${Math.round((SPEC[c.spec][3]||1)/60).toLocaleString()} patient-care hours a year. Overhead is spread across those same hours. In a facility, the hospital or surgery center bears staff, supplies, and most space costs; facility cost is estimated from Medicare cost reports.`}</div></section>`:""}
      <section class="card"><div class="card-h"><div><h3>Payment history, 1970 to 2026</h3><div class="sub">${state.rreal?"In 2026 dollars, adjusted with CPI-U":"Nominal dollars"} · ${RSET.find(r=>r[0]===pos)[1]} · ${L[1]}</div></div>
        <div class="right"><div class="seg" role="group" aria-label="Dollars">${[[false,"Nominal"],[true,"Inflation-adjusted"]].map(([v,l])=>`<button data-rreal="${v}" aria-pressed="${state.rreal===v}">${l}</button>`).join("")}</div></div></div>
        <div class="card-b"><div class="legend"><span><i style="background:var(--c1)"></i>Medicare total</span><span><i style="background:var(--c2)"></i>Private plans, average</span><span><i style="background:var(--c4)"></i>Medicare if it had kept pace with inflation since ${bY}</span>${cc26?`<span><i style="background:var(--bad)"></i>Estimated cost to provide (2026 cost, indexed to inflation)</span>`:""}<span><i style="background:var(--muted)"></i>Dashed after 2026: proposed &amp; projected</span></div>
        <div class="chart-wrap">${histChart([{vals:infl,color:"var(--c4)"},{vals:costS,color:"var(--bad)"},{vals:com,color:"var(--c2)"},{vals:comF,color:"var(--c2)",dash:true},{vals:med,color:"var(--c1)"},{vals:medF,color:"var(--c1)",dash:true}], ev)}</div></div>
        <div class="card-f">Before 1992 Medicare paid physicians "customary, prevailing and reasonable" charges with no national fee schedule; those years are estimates crosswalked from predecessor codes. The physician fee schedule (RBRVS) began in 1992. Hospital inpatient DRGs began in 1983, outpatient APCs in 2000, and ASP-based drug payment in 2005.</div></section>
      ${(()=>{ const rows = R_YEARS.filter(y=>y>=Math.max(1980,firstY??1980) && medAll[y-1970]!=null); if (!rows.length || c.k==="packaged") return "";
        const b26 = bV!=null ? bV*cpi(2026)/cpi(bY) : null, a26 = medAll[2026-1970], gap26 = b26 && a26 ? (a26/b26-1)*100 : null;
        const cell = (act, exp) => exp==null ? `<td class="r num" style="color:var(--muted)">—</td><td class="r num" style="color:var(--muted)">—</td>` : `<td class="r num">${rFmt(exp)}</td><td class="r num ${act<exp?"down":"up"}">${pct((act/exp-1)*100)}</td>`;
        return `<section class="card"><div class="card-h"><div><h3>Reasonable-rate benchmark: actual vs. inflation</h3><div class="sub">Nominal dollars · ${RSET.find(r=>r[0]===pos)[1]} · ${L[1]} · CPI-U${rows.some(y=>y>2026)?", projected after 2026":""}</div></div>
          <div class="right"><label for="rBase" style="font-size:.78rem;font-weight:600;color:var(--ink-2)">Base year</label><select id="rBase" class="input" style="width:auto">${R_YEARS.filter(y=>y>=1980&&y<=2025).map(y=>`<option ${y===state.rbase?"selected":""}>${y}</option>`).join("")}</select></div></div>
          <div class="card-b">${gap26!=null?`<p style="font-size:.9rem">If ${c.c} had risen with inflation from its ${bY} rate of <b class="num">${rFmt(bV)}</b>, Medicare would pay <b class="num">${rFmt(b26)}</b> in 2026. It pays <b class="num">${rFmt(a26)}</b>, which is <b class="num ${gap26<0?"down":"up"}">${pct(gap26)}</b> ${gap26<0?"below":"above"} that benchmark.</p>`:""}
          <ul class="decisions" style="font-size:.8rem"><li><b>Expected from prior year</b>: last year's actual rate plus that year's inflation. Shows whether each single year's update kept up.</li><li><b>Expected from base year</b>: the ${bY} rate compounded by every year's inflation from ${bY} through the year shown. Shows the cumulative gap.</li><li><b>Practice costs (MEI)</b>: the same calculation using the Medicare Economic Index, which tracks what it costs to run a medical practice. ${bV!=null?`On this measure ${c.c} would pay <b class="num">${rFmt(bV*mei(2026)/mei(bY))}</b> in 2026.`:""}</li></ul></div>
          <div class="tbl" style="max-height:520px;overflow:auto"><table><thead style="position:sticky;top:0"><tr><th>Year</th><th>Status</th><th class="r">Actual Medicare</th><th class="r">Inflation</th><th class="r">Expected from prior year</th><th class="r">Gap</th><th class="r">Expected from ${bY}</th><th class="r">Gap</th><th class="r">Expected from ${bY}: practice costs (MEI)</th><th class="r">Gap</th><th class="r">Private avg</th></tr></thead><tbody>
          ${rows.slice().reverse().map(y=>{ const act = medAll[y-1970], prev = medAll[y-1971], inf = (cpi(y)/cpi(y-1)-1)*100;
            const e1 = prev!=null && y>firstY ? prev*cpi(y)/cpi(y-1) : null, e2 = y>=bY && bV!=null ? bV*cpi(y)/cpi(bY) : null;
            return `<tr${y===Y?' style="background:var(--accent-soft)"':""}><td class="num strong">${y}</td><td><span class="pill ${y<=2026?"p-neu":y===2027?"p-warn":"p-gov"}">${rStatus(y)}</span>${y<1992&&c.k!=="asp"?`<span class="tsub">Estimated</span>`:""}</td><td class="r num strong">${rFmt(act)}</td><td class="r num" style="color:var(--muted)">${inf.toFixed(1)}%</td>${cell(act,e1)}${cell(act,e2)}${cell(act, y>=bY && bV!=null ? bV*mei(y)/mei(bY) : null)}<td class="r num">${rFmt(comAll[y-1970])}</td></tr>`;}).join("")}
          </tbody></table></div>
          <div class="card-f">CPI-U annual averages; 2027 to 2030 use projected inflation of 2.3% to 2.6%. MEI values are approximate and indexed to 2026.</div></section>`; })()}
      ${(()=>{ const q=(state.rq||"").toLowerCase(), list = clist.filter(x=>!q || x.c.toLowerCase().includes(q) || (x.d||"").toLowerCase().includes(q)), shown = list.slice(0,400);
        return `<section class="card"><div class="card-h"><div><h3>All ${R_TYPES.find(r=>r[0]===t)[1]} codes${state.rsec!=="all"?" · "+(SEC[state.rsec]||""):""}: payment vs. cost</h3><div class="sub">${list.length.toLocaleString()} codes · each in its main setting · ${L[1]} · ${esc(P[1])}</div></div>
          <div class="right"><input id="rQ" class="input" style="width:200px" placeholder="Filter by code or word" value="${esc(state.rq||"")}" aria-label="Filter codes"></div></div>
          <div class="tbl" style="max-height:560px;overflow:auto"><table><thead style="position:sticky;top:0;z-index:1"><tr><th>Code</th><th class="r">2026 Medicare</th><th class="r">2027 proposed</th><th class="r">Change</th><th class="r">2030 projected</th><th class="r">Private avg</th><th class="r">Est. cost</th><th class="r">Medicare covers</th><th class="r">Private covers</th></tr></thead><tbody>
          ${shown.map(x=>{ const p = rSettings(x)[0]; if (!p) return ""; const a=rCalc(x,2026,p,"MCR"), b=rCalc(x,2027,p,"MCR"), e=rCalc(x,2030,p,"MCR"), pv=rCalc(x,2026,p,"AVG"); if (!a) return ""; const k = careCost(x,p,a.prof,a.fac), ok = k && k.total>0;
            return `<tr style="cursor:pointer${x.c===c.c?";background:var(--accent-soft)":""}" data-rcode="${x.c}"><td style="min-width:200px"><span class="code">${x.c}</span><span class="tsub">${esc(x.d)} · ${RSET.find(r=>r[0]===p)[1].replace(/ \(POS.*\)/,"")}${x.est?" · est. costs":""}</span></td><td class="r num">${rFmt(a.tot)}</td><td class="r num strong">${b?rFmt(b.tot):"—"}</td><td class="r num ${b&&b.tot>=a.tot?"up":"down"}">${b&&a.tot?pct((b.tot/a.tot-1)*100):"—"}</td><td class="r num" style="color:var(--muted)">${e?rFmt(e.tot):"—"}</td><td class="r num">${pv?rFmt(pv.comm):"—"}</td><td class="r num">${ok?rFmt(k.total):"—"}</td><td class="r num ${ok&&a.tot<k.total?"down":"up"}">${ok&&a.tot>0?(a.tot/k.total*100).toFixed(0)+"%":"—"}</td><td class="r num ${ok&&pv&&pv.comm<k.total?"down":"up"}">${ok&&pv?(pv.comm/k.total*100).toFixed(0)+"%":"—"}</td></tr>`;}).join("")}
          </tbody></table></div>
          <div class="card-f">2027 physician rates apply the proposed conversion-factor update (+2.4%) and facility rates the proposed market-basket update (+2.6%); 2030 assumes the 0.25% statutory physician update. ${shown.length<list.length?`Showing ${shown.length} of ${list.length.toLocaleString()}; filter to narrow.`:"Select a code to chart it."}</div></section>`; })()}
      <section class="card"><div class="card-h"><div><h3>Load the complete CMS fee schedule</h3><div class="sub">${RVU_LOADED?`${RVU_LOADED.toLocaleString()} codes loaded from your file`:`${RCODES.filter(x=>x.t!=="cat2").length} codes built in · load the CMS file to add every payable code`}</div></div></div>
        <div class="card-b"><p style="font-size:.86rem;color:var(--ink-2);max-width:72ch">Download the current Physician Fee Schedule relative value file (the PPRRVU file, CSV format) from <a href="https://www.cms.gov/medicare/payment/fee-schedules/physician/pfs-relative-value-files" target="_blank" rel="noopener">CMS</a>, unzip it, and choose the CSV below. The file is read in your browser and nothing is uploaded. Code descriptions come from the CMS file and remain under the AMA's CPT license terms.</p>
          <div class="toolbar"><input id="rvuFile" type="file" accept=".csv,.txt" class="input" style="width:auto">${RVU_LOADED?`<button class="btn ghost sm" data-rvuclear="1">Remove loaded codes</button>`:""}</div></div>
        <div class="card-f">For loaded codes, clinician time is estimated from work RVUs, and staff time and supplies from practice-expense RVUs; those rows are marked "est. costs." Laboratory and anesthesia rates use separate fee schedules not included in this file.</div></section>`;
  }

  if (t==="cat2") {
    body = `<div class="notice"><span class="bar"></span><div><b>Category II codes carry no payment.</b> They report quality measures. Medicare pays $0 per code, but the measures feed the Merit-based Incentive Payment System (MIPS), which raises or lowers a clinician's Medicare payments two years later. Many private plans use the same codes for pay-for-performance bonuses.</div></div>
      <section class="card"><div class="card-h"><div><h3>Tracked Category II codes</h3></div></div><div class="tbl"><table><thead><tr><th>Code</th><th>What it reports</th><th class="r">Medicare</th><th class="r">Private plans</th><th>In use since</th></tr></thead><tbody>
      ${RCODES.filter(x=>x.t==="cat2").map(x=>`<tr><td><span class="code">${x.c}</span></td><td>${esc(x.d)}</td><td class="r num">$0.00</td><td class="r num">$0.00<span class="tsub">P4P bonus possible</span></td><td class="num">${x.since}</td></tr>`).join("")}
      </tbody></table></div><div class="card-f">Category II codes were introduced in 2004–2005 for performance measurement.</div></section>
      <section class="card"><div class="card-h"><div><h3>MIPS payment adjustment by year</h3><div class="sub">Maximum adjustment to all Part B payments, up or down</div></div></div><div class="tbl"><table><thead><tr><th>Performance year</th><th>Payment year</th><th class="r">Maximum adjustment</th></tr></thead><tbody>
      ${MIPS.map(m=>`<tr><td class="num">${m[0]}</td><td class="num">${m[1]}</td><td class="r num strong">${m[2]}</td></tr>`).join("")}</tbody></table></div>
      <div class="card-f">Upward adjustments are scaled for budget neutrality, so top performers usually receive far less than the maximum.</div></section>`;
  }

  if (t==="mods") {
    const ex = {surg:RCODES.find(x=>x.c==="27447"), rad:RCODES.find(x=>x.c==="70553"), th:RCODES.find(x=>x.c==="97110")};
    const exFor = m => ["26","TC"].includes(m[0]) ? ex.rad : m[0]==="CQ/CO" ? ex.th : ex.surg;
    body = `<div class="form-row">${locSel}${yrSel}</div>
      <section class="card"><div class="card-h"><div><h3>Modifiers and how they change payment</h3><div class="sub">Examples use the Medicare professional rate for ${L[1]}, ${Y}</div></div></div>
      <div class="tbl"><table><thead><tr><th>Modifier</th><th>Meaning</th><th>Payment effect</th><th>Example</th><th class="r">Paid</th><th>Since</th></tr></thead><tbody>
      ${MODS.map(m=>{ const c=exFor(m), pos = c.nf!=null?"11":"22", r = rCalc(c, Y, pos, "MCR"); let paid = "Same as base";
        if (r){ const prof = c.nf!=null ? c.nf*L[2]*pfsIdx(Y)*interp(c.rvu,Y,false) : r.prof;
          if (m[3]==="pc") paid = rFmt(c.pc*L[2]*pfsIdx(Y)*interp(c.rvu,Y,false)); else if (m[3]==="tc") paid = rFmt((c.nf-c.pc)*L[2]*pfsIdx(Y)*interp(c.rvu,Y,false)); else if (typeof m[3]==="number") paid = rFmt(prof*m[3]); }
        else paid = "—";
        return `<tr><td><span class="code">${m[0]}</span></td><td style="min-width:180px">${esc(m[1])}</td><td style="font-size:.82rem;min-width:200px">${esc(m[2])}</td><td class="num" style="font-size:.8rem">${m[3]==null?"—":c.c}</td><td class="r num strong">${m[3]==null?"No change":paid}</td><td class="num">${m[4]}</td></tr>`;}).join("")}
      </tbody></table></div><div class="card-f">Surgical examples use 27447 (total knee replacement, facility rate); 26 and TC use 70553 (brain MRI); CQ/CO uses 97110 (therapeutic exercise). Private plans generally follow the same modifier rules, with plan-specific percentages for assistants at surgery and multiple procedures.</div></section>`;
  }

  if (t==="rev") {
    body = `<div class="form-row">${locSel}</div>
      <div class="notice"><span class="bar"></span><div><b>Revenue codes identify the hospital department, not the price.</b> Hospitals list a chargemaster price for each line, but Medicare pays a bundled DRG or APC amount and private plans pay their negotiated rate. The gap between charges and payments is shown below.</div></div>
      <section class="card"><div class="card-h"><div><h3>Institutional revenue codes</h3><div class="sub">Typical 2026 amounts, ${L[1]}</div></div></div>
      <div class="tbl"><table><thead><tr><th>Code</th><th>Department</th><th>How Medicare pays</th><th class="r">Hospital charge</th><th class="r">Medicare pays</th><th class="r">Private median</th><th class="r">Charge ÷ Medicare</th></tr></thead><tbody>
      ${REVC.map(r=>`<tr><td><span class="code">${r[0]}</span></td><td><span class="strong" style="font-weight:500">${r[1]}</span><span class="tsub">${r[6]}</span></td><td style="font-size:.8rem;min-width:180px">${r[2]}</td><td class="r num">${rFmt(r[3]*L[3])}</td><td class="r num">${r[4]==null?`<span style="color:var(--muted)">Bundled</span>`:rFmt(r[4]*L[2])}</td><td class="r num">${rFmt(r[5]*L[3])}</td><td class="r num">${r[4]==null?"—":(r[3]*L[3]/(r[4]*L[2])).toFixed(1)+"×"}</td></tr>`).join("")}
      </tbody></table></div><div class="card-f">Sources in production: hospital price-transparency machine-readable files (charges and negotiated rates), CMS OPPS and IPPS rate files.</div></section>`;
  }

  if (t==="pos") {
    const c = RCODES.find(x=>x.c==="99214");
    body = `<div class="form-row">${provSel}${locSel}${yrSel}</div>
      <div class="notice"><span class="bar"></span><div><b>Where care happens changes what is paid.</b> In a facility the hospital or ASC is paid separately, so the professional rate is lower. The example is 99214, an established-patient office visit.</div></div>
      <section class="card"><div class="card-h"><div><h3>Place-of-service codes</h3><div class="sub">99214 professional rate, ${rprov()[1]}, ${L[1]}, ${Y}</div></div></div>
      <div class="tbl"><table><thead><tr><th>POS</th><th>Setting</th><th>Professional rate</th><th>Separate facility payment</th><th class="r">99214 professional</th></tr></thead><tbody>
      ${POSC.map(p=>{ const nf = /Non-facility/.test(p[2]), v = /Laboratory/.test(p[2]) ? null : c[nf?"nf":"f"]*L[2]*rprov()[2]*pfsIdx(Y)*interp(c.rvu,Y,false);
        return `<tr><td><span class="code">${p[0]}</span></td><td class="strong" style="font-weight:500">${p[1]}</td><td><span class="pill ${nf?"p-acc":/Facility/.test(p[2])?"p-neu":"p-warn"}">${p[2]}</span></td><td style="font-size:.8rem">${p[3]}</td><td class="r num">${v==null?"n/a":rFmt(v)}</td></tr>`;}).join("")}
      </tbody></table></div><div class="card-f">Medicare broadly covered telehealth from patients' homes only after 2020; before that, rates for POS 02 and 10 did not apply to most services.</div></section>`;
  }

  if (t==="icd") {
    const sel = RDX.find(d=>d[0]===state.rdx) || RDX[0], basePay = w => w*IPPS_BASE*L[2];
    const hist = R_YEARS.map(y=>{ const v = basePay(sel[2][2])*interp(FAC_A,y,true)/interp(FAC_A,2026,true); return state.rreal?toReal(v,y):v; });
    const histC = R_YEARS.map((y,i)=>{ const v = basePay(sel[2][2])*interp(FAC_A,y,true)*(1+(interp(COMM_A.fac,y,false)-1)*0.7)*L[3]/L[2]; return state.rreal?toReal(v,y):v; });
    body = `<div class="form-row">${locSel}${yrSel}</div>
      <div class="notice"><span class="bar"></span><div><b>Diagnosis codes don't have a price.</b> They decide which MS-DRG pays a hospital stay and, in Medicare Advantage, how much the plan receives through its risk score. Higher-severity coding moves payment, which is why diagnosis coding is central to upcoding cases.</div></div>
      <section class="card"><div class="card-h"><div><h3>What each diagnosis is worth</h3><div class="sub">As principal diagnosis for an inpatient stay, ${L[1]}, 2026 · select a row for its history</div></div></div>
      <div class="tbl"><table><thead><tr><th>ICD-10-CM</th><th>DRG without complications</th><th>DRG with major complication</th><th class="r">Private plans (MCC)</th><th>Advantage risk score value</th></tr></thead><tbody>
      ${RDX.map(d=>`<tr style="cursor:pointer${d===sel?";background:var(--accent-soft)":""}" data-rdx="${d[0]}"><td><span class="code">${d[0]}</span><span class="tsub">${esc(d[1])}</span></td><td style="font-size:.8rem;min-width:170px"><span class="num strong">${rFmt(basePay(d[3][2]))}</span><span class="tsub">DRG ${d[3][0]} · weight ${d[3][2].toFixed(2)}</span></td><td style="font-size:.8rem;min-width:170px"><span class="num strong">${rFmt(basePay(d[2][2]))}</span><span class="tsub">DRG ${d[2][0]} · weight ${d[2][2].toFixed(2)}</span></td><td class="r num">${rFmt(basePay(d[2][2])*(1+1.5*0.7)*L[3]/L[2])}</td><td style="font-size:.8rem;min-width:170px">${d[4][1]?`<span class="num strong">${rFmt(d[4][1]*MA_YEAR)}/yr</span>`:`<span style="color:var(--muted)">—</span>`}<span class="tsub">${esc(d[4][0])}${d[4][1]?" · coefficient "+d[4][1].toFixed(3):""}</span></td></tr>`).join("")}
      </tbody></table></div><div class="card-f">The MCC column shows how much a single secondary diagnosis can add to one hospital stay. Risk-score values assume an Advantage benchmark of about $${MA_YEAR.toLocaleString()} per member per year.</div></section>
      <section class="card"><div class="card-h"><div><h3>${sel[0]}: hospital payment history for DRG ${sel[2][0]}</h3><div class="sub">${state.rreal?"2026 dollars":"Nominal dollars"} · ${esc(sel[2][1])}</div></div>
        <div class="right"><div class="seg" role="group" aria-label="Dollars">${[[false,"Nominal"],[true,"Inflation-adjusted"]].map(([v,l])=>`<button data-rreal="${v}" aria-pressed="${state.rreal===v}">${l}</button>`).join("")}</div></div></div>
        <div class="card-b"><div class="legend"><span><i style="background:var(--c1)"></i>Medicare</span><span><i style="background:var(--c2)"></i>Private plans, average (dashed)</span></div>
        <div class="chart-wrap">${histChart([{vals:hist,color:"var(--c1)"},{vals:histC,color:"var(--c2)",dash:true}], [[1983,"DRGs begin"],[2008,"MS-DRGs"],[2015,"ICD-10 replaces ICD-9"],[2022,"Price data public"]])}</div></div>
        <div class="card-f">Before October 1983 hospitals were paid their reported costs, so earlier values are cost-based estimates. Diagnoses were coded in ICD-9-CM until September 30, 2015.</div></section>`;
  }

  return hero("Agora Health · Reimbursement tracker", "What Medicare and private plans pay for care, 1970 to today", "Payment rates for physicians, nurse practitioners and physician assistants, therapists, dietitians, behavioral-health clinicians, surgery centers, and hospitals. Compare Medicare, Medicare Advantage, and private plans by code, setting, and location, and trace each rate back to 1970 in nominal and inflation-adjusted dollars.",
    [`${RCODES.filter(x=>x.t!=="cat2").length.toLocaleString()} codes${RVU_LOADED?"":" built in"}`, "Payment vs. cost of care", "1970–2030", "Illustrative values"]) +
  `<div class="content"><div class="notice brass"><span class="bar"></span><div><b>Sample data.</b> Rates are illustrative approximations. In production they come from the Medicare Physician Fee Schedule, OPPS, ASC, and IPPS rate files, ASP drug pricing files, Transparency in Coverage files, and hospital price-transparency files, with pre-1992 history from Medicare prevailing-charge records.</div></div>${tabs}${body}</div>`;
};

const mei = y => interp(MEI_A, y, true);

const onPage = () => location.hash === "#estimator";
function render(){ if (!onPage()) return; const y = window.scrollY, m = Ag.$("#main"); m.innerHTML = window.AgoraRates.wrap(PAGES.rates()); window.scrollTo(0, y); }
document.addEventListener("click", e => {
  if (!onPage()) return; const t = e.target;
  if (t.closest("[data-costreset]")){ store.costs = {}; save(); render(); toast("Cost assumptions reset"); return; }
  if (t.closest("[data-rvuclear]")){ for (let i=RCODES.length-1;i>=0;i--) if (RCODES[i].loaded) RCODES.splice(i,1); RVU_LOADED = 0; try { localStorage.removeItem("agora-health-rvu"); } catch(err){} render(); toast("Loaded codes removed"); return; }
  const rtb = t.closest("[data-rt]"); if (rtb){ state.rt = rtb.dataset.rt; render(); return; }
  const rre = t.closest("[data-rreal]"); if (rre){ state.rreal = rre.dataset.rreal==="true"; render(); return; }
  const rdx = t.closest("[data-rdx]"); if (rdx){ state.rdx = rdx.dataset.rdx; render(); return; }
  const rcd = t.closest("[data-rcode]"); if (rcd){ state.rc = rcd.dataset.rcode; render(); return; }
});
document.addEventListener("change", e => {
  if (!onPage()) return; const t = e.target;
  if (t.id==="rFind"){ const code = (t.value||"").split(/[\s·]/)[0].trim().toUpperCase(), x = RCODES.find(k=>k.c===code); if (x){ state.rt = x.t; state.rc = x.c; state.rsec = "all"; render(); } else toast("No code "+code+" in the tracker yet"); return; }
  if (t.id==="rQ"){ state.rq = t.value.trim(); render(); return; }
  if (t.id==="rSec"){ state.rsec = t.value; const first = RCODES.find(x=>x.t===state.rt && (state.rsec==="all"||x.sec===state.rsec)); if (first) state.rc = first.c; render(); return; }
  const cst = t.closest("[data-cost]"); if (cst){ const v = +cst.value; if (cst.value==="" || isNaN(v)) delete store.costs[cst.dataset.cost]; else store.costs[cst.dataset.cost] = v; save(); render(); toast("Costs recalculated"); return; }
  if (t.id==="rvuFile" && t.files[0]){ const f = t.files[0], fr = new FileReader(); fr.onload = () => { try { const rows = parseRVU(String(fr.result)); const n = addRVURows(rows); RVU_LOADED += n; try { localStorage.setItem("agora-health-rvu", JSON.stringify({rows})); } catch(err){} toast(n.toLocaleString()+" codes added from "+f.name); render(); } catch(err){ toast("Couldn't read that file: "+err.message); } }; fr.readAsText(f); return; }
  const RS = {rCode:"rc", rPos:"rpos", rLoc:"rloc", rProv:"rprov", rYear:"ryear", rBase:"rbase"}, k = RS[t.id];
  if (k){ state[k] = /ryear|rbase/.test(k) ? +t.value : t.value; render(); }
});
window.AgoraRates = { page: () => PAGES.rates() };
})();
