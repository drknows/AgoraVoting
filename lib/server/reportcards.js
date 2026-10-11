/**
 * Government Report Cards — two grades for every government:
 *   Ethics   — integrity, accountability and control of corruption
 *   Economy  — the average of three parts:
 *                Stability       (inflation, unemployment, steady growth)
 *                Sustainability  (public debt, its direction, external balance)
 *                Responsibility  (budget balance — living within its means)
 *
 * National governments (~190 countries): graded automatically from
 *   - World Bank Worldwide Governance Indicators (0–100 scores)
 *   - IMF World Economic Outlook data (DataMapper API)
 * U.S. states: economic stability graded automatically from FRED (unemployment,
 *   real GDP growth) when FRED_API_KEY is set; other parts use the rubric.
 * States, counties and cities: graded by Agora staff against a published rubric,
 *   with a cited source required for every score.
 *
 * Every grade shows its inputs, sources and data year. Grades describe public
 * data; they are not findings of wrongdoing.
 */
import { query, one, tx } from "./db";
import { config, features } from "./config";
import { audit } from "./audit";
import { HttpError, clean } from "./http";
import { US_STATE_NAMES } from "./usstates";

const clamp = v => Math.max(0, Math.min(100, v));
const round = v => (v == null || isNaN(v) ? null : Math.round(v * 10) / 10);
const avg = arr => { const a = arr.filter(v => v != null && !isNaN(v)); return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; };
const wavg = pairs => { const p = pairs.filter(([v]) => v != null && !isNaN(v)); const w = p.reduce((a, [, w]) => a + w, 0); return w ? p.reduce((a, [v, w]) => a + v * w, 0) / w : null; };

export function letter(score) {
  if (score == null) return "—";
  const cut = [[95, "A+"], [88, "A"], [83, "A-"], [78, "B+"], [72, "B"], [67, "B-"], [62, "C+"], [56, "C"], [51, "C-"], [46, "D+"], [40, "D"], [35, "D-"]];
  return (cut.find(([c]) => score >= c) || [0, "F"])[1];
}

export const METHODOLOGY = {
  national: {
    ethics: [
      { key: "CC", label: "Control of corruption", weight: 35 },
      { key: "RL", label: "Rule of law", weight: 25 },
      { key: "GE", label: "Government effectiveness", weight: 15 },
      { key: "VA", label: "Voice & accountability (free press, fair elections)", weight: 15 },
      { key: "RQ", label: "Regulatory quality", weight: 10 },
    ],
    stability: ["Inflation near 2% — half the stability grade (100 at 2%, 0 at 14.5 points away; above 25% inflation, stability is capped at 30)", "Unemployment — a quarter (100 at ≤3%, 0 at 15.5%+)", "Steady growth — a quarter: volatility of real GDP growth over 5 years"],
    sustainability: ["Government debt (100 at ≤30% of GDP, 0 at 155%+)", "Debt direction over 5 years", "Current-account balance (deficits lower the score)"],
    responsibility: ["Average budget balance over 3 years (100 at a deficit of 1% of GDP or better, 0 at a 9.3%+ deficit)"],
    sources: [
      { name: "World Bank — Worldwide Governance Indicators", url: "https://www.worldbank.org/en/publication/worldwide-governance-indicators" },
      { name: "IMF — World Economic Outlook (DataMapper)", url: "https://www.imf.org/external/datamapper/" },
    ],
  },
  rubric: {
    ethics: [
      { key: "disclosure", label: "Financial disclosure & conflict-of-interest rules are strong and enforced" },
      { key: "transparency", label: "Open meetings, public records and budgets published promptly" },
      { key: "oversight", label: "Independent ethics commission / inspector general with real powers" },
      { key: "corruption", label: "Record of officials charged or convicted for corruption (last 5 years) — fewer is better" },
      { key: "campaign", label: "Campaign-finance limits and timely public disclosure" },
      { key: "audits", label: "Clean independent audit opinions; findings fixed" },
    ],
    stability: [
      { key: "growth", label: "Local economy: jobs and growth compared with the nation" },
      { key: "reserves", label: "Rainy-day / reserve fund adequate (e.g. 2+ months of spending)" },
    ],
    sustainability: [
      { key: "debt", label: "Debt and unfunded pension/retiree liabilities are manageable" },
      { key: "rating", label: "Credit rating (AAA/AA = 4 … below investment grade = 0)" },
    ],
    responsibility: [
      { key: "balanced", label: "Structurally balanced budget (recurring revenue covers recurring spending)" },
      { key: "reporting", label: "Annual financial report (ACFR) filed on time" },
    ],
    scale: "Each item is scored 0 (very poor) to 4 (excellent) and must cite a source.",
  },
};

/* ── National: World Bank + IMF ─────────────────────────────── */
const WGI = { CC: "GOV_WGI_CC_SC", RL: "GOV_WGI_RL_SC", GE: "GOV_WGI_GE_SC", VA: "GOV_WGI_VA_SC", RQ: "GOV_WGI_RQ_SC" };
const IMF = { debt: "GGXWDG_NGDP", balance: "GGXCNL_NGDP", inflation: "PCPIPCH", growth: "NGDP_RPCH", unemployment: "LUR", current: "BCA_NGDPD" };

async function getJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json", "user-agent": "AgoraCivic/2.5" }, cache: "no-store" });
  if (!res.ok) throw new Error(`${new URL(url).host} ${res.status}`);
  return res.json();
}

async function worldBank(indicator) {
  for (const extra of ["", "&source=3"]) {
    try {
      const d = await getJson(`https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&mrnev=1&per_page=500${extra}`);
      if (Array.isArray(d) && Array.isArray(d[1])) return d[1];
    } catch { /* try next */ }
  }
  throw new Error(`World Bank indicator ${indicator} unavailable`);
}

export async function syncNational() {
  const year = new Date().getFullYear();
  const periods = Array.from({ length: 8 }, (_, i) => year - 7 + i).join(",");
  const [wgiLists, imfData, countries] = await Promise.all([
    Promise.all(Object.entries(WGI).map(async ([k, code]) => [k, await worldBank(code)])),
    Promise.all(Object.entries(IMF).map(async ([k, code]) => [k, (await getJson(`https://www.imf.org/external/datamapper/api/v1/${code}?periods=${periods}`)).values?.[code] || {}])),
    getJson("https://www.imf.org/external/datamapper/api/v1/countries").then(d => d.countries || {}),
  ]);
  const wgi = {};
  let wgiYear = null;
  for (const [k, rows] of wgiLists) for (const r of rows) {
    const iso = r.countryiso3code;
    if (!iso || r.value == null) continue;
    (wgi[iso] ||= { name: r.country?.value })[k] = r.value;
    wgiYear = Math.max(wgiYear || 0, Number(r.date) || 0);
  }
  const imf = Object.fromEntries(imfData);
  const lastActual = year - 1;
  const series = (k, iso) => imf[k]?.[iso] || {};
  const at = (k, iso, y) => { const v = series(k, iso)[String(y)]; return v == null ? null : Number(v); };
  const latest = (k, iso, upTo = lastActual) => { for (let y = upTo; y >= upTo - 3; y--) { const v = at(k, iso, y); if (v != null) return { v, y }; } return null; };

  const isos = new Set([...Object.keys(wgi), ...Object.keys(imf.debt || {})].filter(i => /^[A-Z]{3}$/.test(i) && countries[i]));
  let n = 0;
  for (const iso of isos) {
    const w = wgi[iso] || {};
    const ethics = wavg(METHODOLOGY.national.ethics.map(e => [w[e.key], e.weight]));

    const infl = latest("inflation", iso), unemp = latest("unemployment", iso), debt = latest("debt", iso), cur = latest("current", iso);
    const growths = []; for (let y = lastActual - 4; y <= lastActual; y++) { const g = at("growth", iso, y); if (g != null) growths.push(g); }
    const sd = growths.length >= 3 ? Math.sqrt(growths.reduce((a, g) => a + (g - avg(growths)) ** 2, 0) / growths.length) : null;
    let stability = wavg([
      [infl ? clamp(100 - Math.abs(infl.v - 2) * 8) : null, 50],
      [unemp ? clamp(100 - Math.max(0, unemp.v - 3) * 8) : null, 25],
      [sd != null ? clamp(100 - sd * 15) : null, 25],
    ]);
    if (stability != null && infl && infl.v > 25) stability = Math.min(stability, 30); // very high inflation caps stability
    const debt5 = debt ? at("debt", iso, debt.y - 5) : null;
    const sustainability = avg([
      debt ? clamp(100 - Math.max(0, debt.v - 30) * 0.8) : null,
      debt && debt5 != null ? clamp(100 - Math.max(0, debt.v - debt5) * 2) : null,
      cur ? clamp(100 + Math.min(cur.v, 0) * 8) : null,
    ]);
    const bals = []; for (let y = lastActual - 2; y <= lastActual; y++) { const b = at("balance", iso, y); if (b != null) bals.push(b); }
    const balAvg = avg(bals);
    const responsibility = balAvg != null ? clamp(100 + (balAvg + 1) * 12) : null;
    const economy = avg([stability, sustainability, responsibility]);
    if (ethics == null && economy == null) continue;

    const metrics = {
      governance: Object.fromEntries(Object.keys(WGI).map(k => [k, round(w[k])])), governanceYear: wgiYear,
      inflation: infl && { value: round(infl.v), year: infl.y }, unemployment: unemp && { value: round(unemp.v), year: unemp.y },
      growthVolatility: round(sd), growth: growths.map(round),
      debt: debt && { value: round(debt.v), year: debt.y, fiveYearsBefore: round(debt5) },
      currentAccount: cur && { value: round(cur.v), year: cur.y },
      budgetBalanceAvg3: round(balAvg),
    };
    await saveCard({
      key: `country:${iso}`, level: "national", name: countries[iso]?.label || w.name || iso, parent: null, method: "auto",
      ethics, stability, sustainability, responsibility, economy, metrics, rubric: null, data_year: lastActual,
    });
    n++;
  }
  await audit("global", "system", "REPORT_CARDS_SYNCED", { level: "national", count: n });
  return { national: n };
}

/* ── U.S. states: FRED economic data ────────────────────────── */
async function fred(series) {
  const d = await getJson(`https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${config.fredKey}&file_type=json&sort_order=desc&limit=40`);
  return (d.observations || []).filter(o => o.value !== ".").map(o => ({ date: o.date, value: Number(o.value) }));
}

export async function syncStates() {
  if (!features.fred()) return { states: 0, skipped: "FRED_API_KEY not set" };
  const codes = Object.keys(US_STATE_NAMES);
  let n = 0;
  for (let i = 0; i < codes.length; i += 8) {
    await Promise.all(codes.slice(i, i + 8).map(async st => {
      try {
        const [ur, gdp] = await Promise.all([fred(`${st}UR`), fred(`${st}RGSP`).catch(() => [])]);
        const u = ur[0]?.value ?? null, u12 = ur[12]?.value ?? null;
        const g = gdp.length >= 2 ? (gdp[0].value / gdp[1].value - 1) * 100 : null;
        const auto = {
          unemployment: u != null ? { value: u, date: ur[0].date, change12m: u12 != null ? round(u - u12) : null } : null,
          realGdpGrowth: g != null ? { value: round(g), year: gdp[0].date.slice(0, 4) } : null,
        };
        const autoStability = avg([
          u != null ? clamp(100 - Math.max(0, u - 3) * 8) : null,
          u != null && u12 != null ? clamp(100 - Math.max(0, u - u12) * 25) : null,
          g != null ? clamp(50 + g * 12) : null,
        ]);
        const key = `state:${st}`;
        const existing = await one("select * from report_cards where key=$1", [key]);
        const card = rubricScores(existing?.rubric);
        const stability = avg([autoStability, card.stability]);
        await saveCard({
          key, level: "state", name: US_STATE_NAMES[st], parent: "country:USA",
          method: existing?.rubric ? "auto+rubric" : "auto",
          ethics: card.ethics, stability, sustainability: card.sustainability, responsibility: card.responsibility,
          economy: avg([stability, card.sustainability, card.responsibility]),
          metrics: { ...(existing?.metrics || {}), fred: auto, autoStability: round(autoStability) },
          rubric: existing?.rubric || null, data_year: Number(String(ur[0]?.date || "").slice(0, 4)) || null,
        });
        n++;
      } catch (e) { console.error("FRED", st, e.message); }
    }));
  }
  await audit("global", "system", "REPORT_CARDS_SYNCED", { level: "state", count: n });
  return { states: n };
}

/* ── Rubric (states, counties, cities — and any government) ─── */
function rubricScores(rubric) {
  if (!rubric?.items) return { ethics: null, stability: null, sustainability: null, responsibility: null };
  const part = list => avg(list.map(i => rubric.items[i.key]?.score).filter(v => v != null).map(v => v * 25));
  const R = METHODOLOGY.rubric;
  return { ethics: part(R.ethics), stability: part(R.stability), sustainability: part(R.sustainability), responsibility: part(R.responsibility) };
}

export async function saveRubric(b) {
  const level = ["national", "state", "county", "city"].includes(b.level) ? b.level : null;
  if (!level) throw new HttpError(400, "Choose a level.");
  const name = clean(b.name, 120);
  const state = clean(b.state, 2).toUpperCase();
  if (!name) throw new HttpError(400, "Name the government.");
  if (level !== "national" && !US_STATE_NAMES[state]) throw new HttpError(400, "Choose the U.S. state.");
  const key = b.key || (level === "national" ? `country:${clean(b.iso, 3).toUpperCase()}`
    : level === "state" ? `state:${state}` : `${level}:${state}:${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
  const R = METHODOLOGY.rubric;
  const items = {};
  for (const it of [...R.ethics, ...R.stability, ...R.sustainability, ...R.responsibility]) {
    const v = b.items?.[it.key];
    if (!v || v.score === "" || v.score == null) continue;
    const score = Math.round(Number(v.score));
    if (!(score >= 0 && score <= 4)) throw new HttpError(400, `${it.label}: score must be 0–4.`);
    const source = clean(v.source, 600);
    if (!/^https:\/\/\S+$/.test(source)) throw new HttpError(400, `${it.label}: cite a source link (https://…).`);
    items[it.key] = { score, source, note: clean(v.note, 500) || null };
  }
  if (!Object.keys(items).length) throw new HttpError(400, "Score at least one item.");
  const rubric = { items, assessedAt: new Date().toISOString(), assessor: "Agora staff" };
  const sc = rubricScores(rubric);
  const existing = await one("select * from report_cards where key=$1", [key]);
  const auto = existing?.method?.startsWith("auto") ? existing : null;
  const merged = {
    ethics: auto?.level === "national" ? avg([Number(auto.ethics), sc.ethics]) : sc.ethics,
    stability: avg([auto?.metrics?.autoStability ?? (auto?.level === "national" ? Number(auto.stability) : null), sc.stability]),
    sustainability: auto?.level === "national" ? avg([Number(auto.sustainability), sc.sustainability]) : sc.sustainability,
    responsibility: auto?.level === "national" ? avg([Number(auto.responsibility), sc.responsibility]) : sc.responsibility,
  };
  await saveCard({
    key, level, name: level === "state" ? US_STATE_NAMES[state] : name,
    parent: level === "state" ? "country:USA" : level === "national" ? null : `state:${state}`,
    method: auto ? "auto+rubric" : "rubric",
    ...merged, economy: avg([merged.stability, merged.sustainability, merged.responsibility]),
    metrics: existing?.metrics || {}, rubric, data_year: new Date().getFullYear(),
  });
  await audit("global", "admin", "REPORT_CARD_ASSESSED", { key, items: Object.keys(items).length });
  return key;
}

async function saveCard(c) {
  await tx(async q => {
    const prev = (await q.query("select ethics, economy, updated_at from report_cards where key=$1", [c.key])).rows[0];
    await q.query(
      `insert into report_cards(key, level, name, parent, method, ethics, stability, sustainability, responsibility, economy, metrics, rubric, data_year, updated_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
       on conflict (key) do update set level=$2, name=$3, parent=$4, method=$5, ethics=$6, stability=$7, sustainability=$8,
         responsibility=$9, economy=$10, metrics=$11, rubric=$12, data_year=$13, updated_at=now()`,
      [c.key, c.level, c.name, c.parent, c.method, round(c.ethics), round(c.stability), round(c.sustainability),
       round(c.responsibility), round(c.economy), JSON.stringify(c.metrics || {}), c.rubric ? JSON.stringify(c.rubric) : null, c.data_year]);
    const changed = !prev || round(Number(prev.ethics)) !== round(c.ethics) || round(Number(prev.economy)) !== round(c.economy);
    if (changed) await q.query("insert into report_card_history(key, ethics, economy) values($1,$2,$3)", [c.key, round(c.ethics), round(c.economy)]);
  });
}

/* ── reading ────────────────────────────────────────────────── */
const shape = r => {
  const n = v => (v == null ? null : Number(v));
  return {
    key: r.key, level: r.level, name: r.name, parent: r.parent, method: r.method, dataYear: r.data_year, updatedAt: r.updated_at,
    ethics: { score: n(r.ethics), grade: letter(n(r.ethics)) },
    economy: { score: n(r.economy), grade: letter(n(r.economy)),
      stability: { score: n(r.stability), grade: letter(n(r.stability)) },
      sustainability: { score: n(r.sustainability), grade: letter(n(r.sustainability)) },
      responsibility: { score: n(r.responsibility), grade: letter(n(r.responsibility)) } },
    metrics: r.metrics, rubric: r.rubric,
  };
};

export async function listCards({ level = "national", q, state, sort = "name" }) {
  const params = [level];
  let where = "level=$1";
  if (q) where += ` and name ilike $${params.push(`%${clean(q, 80)}%`)}`;
  if (state && level !== "national") where += ` and (key like $${params.push(`%:${clean(state, 2).toUpperCase()}%`)})`;
  const order = { ethics: "ethics desc nulls last", economy: "economy desc nulls last", ethics_low: "ethics asc nulls last", economy_low: "economy asc nulls last" }[sort] || "name asc";
  const rows = (await query(`select * from report_cards where ${where} order by ${order} limit 400`, params)).rows;
  const last = await one("select ts from audit_log where scope='global' and event='REPORT_CARDS_SYNCED' order by id desc limit 1");
  return { cards: rows.map(shape), lastSync: last?.ts || null, methodology: METHODOLOGY };
}

export async function getCard(key) {
  const r = await one("select * from report_cards where key=$1", [key]);
  if (!r) throw new HttpError(404, "Not found");
  const history = (await query("select ts, ethics, economy from report_card_history where key=$1 order by ts asc limit 200", [key])).rows;
  return { card: { ...shape(r), history: history.map(h => ({ ts: h.ts, ethics: Number(h.ethics), economy: Number(h.economy) })) }, methodology: METHODOLOGY };
}

export async function syncAll() {
  const out = {};
  try { Object.assign(out, await syncNational()); } catch (e) { out.nationalError = e.message; }
  try { Object.assign(out, await syncStates()); } catch (e) { out.statesError = e.message; }
  return out;
}
