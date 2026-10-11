"use client";
/**
 * Civic → Government Report Cards: ethics and economic grades for national,
 * state, county and city governments, with every input and source shown.
 */
import { useState } from "react";
import { api, useLoad, GradeBadge, Pill, Tabs, Note, ErrorNote, Btn, Sparkline, C, card, muted, row, input, fmtDate } from "./kit";
import { US_STATES } from "../civic/ui";

const GOV_LABEL = { CC: "Control of corruption", RL: "Rule of law", GE: "Government effectiveness", VA: "Voice & accountability", RQ: "Regulatory quality" };

function Detail({ k }) {
  const { data } = useLoad(() => api(`/api/reportcards?key=${encodeURIComponent(k)}`), [k]);
  if (!data) return <div style={muted}>Loading…</div>;
  const c = data.card, m = c.metrics || {}, M = data.methodology;
  const v = (x, unit = "") => (x == null ? "—" : typeof x === "object" ? `${x.value}${unit}${x.year ? ` (${x.year})` : ""}` : `${x}${unit}`);
  return (
    <div style={{ marginTop: 12, fontSize: 13 }}>
      {c.level === "national" && m.governance && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Ethics inputs — World Bank governance scores (0–100, {m.governanceYear || "latest"})</div>
          {M.national.ethics.map(e => <div key={e.key}>{e.label} <span style={muted}>(weight {e.weight}%)</span>: <strong>{m.governance[e.key] ?? "—"}</strong></div>)}
        </div>
      )}
      {c.level === "national" && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Economic inputs — IMF</div>
          <div>Inflation: <strong>{v(m.inflation, "%")}</strong> · Unemployment: <strong>{v(m.unemployment, "%")}</strong> · Growth volatility (5 yr): <strong>{m.growthVolatility ?? "—"}</strong></div>
          <div>Government debt: <strong>{v(m.debt, "% of GDP")}</strong>{m.debt?.fiveYearsBefore != null ? ` (was ${m.debt.fiveYearsBefore}% five years earlier)` : ""} · Current account: <strong>{v(m.currentAccount, "% of GDP")}</strong></div>
          <div>Average budget balance (3 yr): <strong>{m.budgetBalanceAvg3 ?? "—"}% of GDP</strong></div>
        </div>
      )}
      {m.fred && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Economic inputs — Federal Reserve (FRED)</div>
          <div>Unemployment: <strong>{m.fred.unemployment?.value ?? "—"}%</strong>{m.fred.unemployment?.change12m != null ? ` (${m.fred.unemployment.change12m > 0 ? "+" : ""}${m.fred.unemployment.change12m} pts in 12 months)` : ""} · Real GDP growth: <strong>{m.fred.realGdpGrowth?.value ?? "—"}%</strong>{m.fred.realGdpGrowth?.year ? ` (${m.fred.realGdpGrowth.year})` : ""}</div>
        </div>
      )}
      {c.rubric?.items && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Assessment checklist ({fmtDate(c.rubric.assessedAt)}) — each item 0 to 4</div>
          {[...M.rubric.ethics, ...M.rubric.stability, ...M.rubric.sustainability, ...M.rubric.responsibility].filter(it => c.rubric.items[it.key]).map(it => (
            <div key={it.key} style={{ padding: "2px 0" }}>{"●".repeat(c.rubric.items[it.key].score)}{"○".repeat(4 - c.rubric.items[it.key].score)} {it.label}
              {" "}<a href={c.rubric.items[it.key].source} target="_blank" rel="noreferrer" style={{ color: C.link }}>source</a>
              {c.rubric.items[it.key].note && <span style={muted}> — {c.rubric.items[it.key].note}</span>}</div>
          ))}
        </div>
      )}
      {c.history?.length > 1 && <div style={{ ...row, marginBottom: 6 }}><span style={muted}>Trend:</span> ethics <Sparkline points={c.history.map(h => h.ethics)} color="#7e22ce" /> economy <Sparkline points={c.history.map(h => h.economy)} /></div>}
      <div style={muted}>Updated {fmtDate(c.updatedAt)} · method: {c.method === "auto" ? "automatic from public data" : c.method === "rubric" ? "staff assessment against the published checklist" : "public data + staff assessment"}</div>
    </div>
  );
}

export function ReportCards() {
  const [level, setLevel] = useState("national");
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [sort, setSort] = useState("ethics");
  const [open, setOpen] = useState(null);
  const [showMethod, setShowMethod] = useState(false);
  const qs = new URLSearchParams({ level, sort, ...(q ? { q } : {}), ...(state ? { state } : {}) }).toString();
  const { data, error, loading } = useLoad(() => api(`/api/reportcards?${qs}`), [qs]);
  const M = data?.methodology;
  return (
    <div>
      <Note>Each government gets two grades. <strong>Ethics</strong> covers integrity, accountability and control of corruption.
        <strong> Economy</strong> averages three parts: <em>stability</em> (inflation, jobs, steady growth), <em>sustainability</em> (debt and its direction), and <em>responsibility</em> (living within its means).
        Grades update automatically as new data is published. They summarize public data and aren't findings of wrongdoing. <Btn small kind="ghost" onClick={() => setShowMethod(!showMethod)}>{showMethod ? "Hide" : "How grades work"}</Btn></Note>
      {showMethod && M && (
        <div style={{ ...card, fontSize: 13 }}>
          <div style={{ fontWeight: 700 }}>National governments — automatic</div>
          <div>Ethics: weighted average of {M.national.ethics.map(e => `${e.label} (${e.weight}%)`).join(", ")}.</div>
          <div>Stability: {M.national.stability.join("; ")}.</div>
          <div>Sustainability: {M.national.sustainability.join("; ")}.</div>
          <div>Responsibility: {M.national.responsibility.join("; ")}.</div>
          <div style={{ margin: "4px 0 10px" }}>Sources: {M.national.sources.map(s => <a key={s.url} href={s.url} target="_blank" rel="noreferrer" style={{ color: C.link, marginRight: 10 }}>{s.name}</a>)}</div>
          <div style={{ fontWeight: 700 }}>States, counties and cities — checklist with cited evidence</div>
          <div>{M.rubric.scale} Ethics: {M.rubric.ethics.map(i => i.label).join("; ")}. Economy: {[...M.rubric.stability, ...M.rubric.sustainability, ...M.rubric.responsibility].map(i => i.label).join("; ")}.
            U.S. states also get automatic stability inputs from Federal Reserve data (unemployment and its trend, real GDP growth).</div>
          <div style={{ marginTop: 8 }}>Grade scale: A+ 95+, A 88+, A− 83+, B+ 78+, B 72+, B− 67+, C+ 62+, C 56+, C− 51+, D+ 46+, D 40+, D− 35+, F below 35.</div>
        </div>
      )}
      <Tabs value={level} onChange={l => { setLevel(l); setOpen(null); }} tabs={[{ id: "national", label: "🌍 National governments" }, { id: "state", label: "🏢 U.S. states" }, { id: "county", label: "🏛 Counties" }, { id: "city", label: "🏙 Cities" }]} />
      <div style={{ ...row, marginBottom: 12 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name…" style={{ ...input, minWidth: 200 }} />
        {level !== "national" && level !== "state" && <select value={state} onChange={e => setState(e.target.value)} style={input}><option value="">All states</option>{US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select>}
        <select value={sort} onChange={e => setSort(e.target.value)} style={input}>
          <option value="ethics">Best ethics first</option><option value="ethics_low">Worst ethics first</option>
          <option value="economy">Best economy first</option><option value="economy_low">Worst economy first</option><option value="name">A–Z</option>
        </select>
        {data?.lastSync && <span style={muted}>Data refreshed {fmtDate(data.lastSync)}</span>}
      </div>
      <ErrorNote error={error} />
      {loading && !data && <div style={muted}>Loading…</div>}
      {data && data.cards.length === 0 && <div style={{ ...card, color: C.textDim }}>
        {level === "national" ? "Report cards haven't been generated yet — they appear after the first daily data refresh (or an admin can run it now)."
          : level === "state" ? "State report cards appear once Federal Reserve data is connected (FRED_API_KEY) or staff complete assessments."
          : `No ${level} report cards yet. Agora staff add these as assessments are completed.`}</div>}
      {data?.cards.map(c => (
        <div key={c.key} style={{ ...card, padding: "10px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
              <div style={muted}>{c.method === "auto" ? "Automatic" : c.method === "rubric" ? "Staff assessment" : "Data + assessment"}{c.dataYear ? ` · data ${c.dataYear}` : ""}</div>
            </div>
            <GradeBadge grade={c.ethics.grade} score={c.ethics.score} label="Ethics" />
            <GradeBadge grade={c.economy.grade} score={c.economy.score} label="Economy" />
            <div className="hide-mobile" style={{ display: "flex", gap: 6 }}>
              <GradeBadge grade={c.economy.stability.grade} score={c.economy.stability.score} label="Stability" />
              <GradeBadge grade={c.economy.sustainability.grade} score={c.economy.sustainability.score} label="Sustain." />
              <GradeBadge grade={c.economy.responsibility.grade} score={c.economy.responsibility.score} label="Respons." />
            </div>
            <Btn small kind="ghost" onClick={() => setOpen(open === c.key ? null : c.key)}>{open === c.key ? "Hide" : "Details"}</Btn>
          </div>
          {open === c.key && <Detail k={c.key} />}
        </div>
      ))}
    </div>
  );
}
