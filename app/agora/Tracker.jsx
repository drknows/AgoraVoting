"use client";
/**
 * Live Results & Audit — refreshes every 10 seconds.
 * Official elections (turnout always; results when not sealed), live community
 * polls with trend lines, signature drives, proposals about to go live, and
 * each election's tamper-evident audit log.
 */
import { useState } from "react";
import { api, useLoad, Bars, Progress, Pill, Sparkline, SectionTitle, ErrorNote, Note, Btn, C, card, muted, row, fmtDateTime, ago } from "./kit";

function ElectionResult({ e }) {
  const [audit, setAudit] = useState(null);
  async function loadAudit() {
    setAudit(audit ? null : await api(`/api/audit?scope=election:${e.id}`).catch(x => ({ error: x.message })));
  }
  const reporting = e.mode === "results_reporting";
  return (
    <div style={card}>
      <div style={{ ...row, justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{e.name}</div>
          <div style={muted}>{e.jurisdiction?.name} · {reporting ? `Official results reported by the jurisdiction${e.reported?.status ? ` (${e.reported.status.replace(/-/g, " ")})` : ""}` : "Ballots cast on Agora"}</div>
        </div>
        <div style={row}>
          {e.isTest && <Pill tone="amber">Test election</Pill>}
          <Pill tone={e.status === "open" ? "green" : e.status === "certified" ? "purple" : "gray"}>{e.status === "open" ? "● Voting open" : e.status}</Pill>
        </div>
      </div>
      {e.turnout != null && <div style={{ fontSize: 22, fontWeight: 800, margin: "8px 0 2px" }}>{e.turnout.toLocaleString()} <span style={{ fontSize: 13, fontWeight: 500, color: C.textDim }}>ballots cast</span></div>}
      {!e.resultsVisible && <Note>🔒 Results are sealed until voting closes{e.closesAt ? ` (${fmtDateTime(e.closesAt)})` : ""}. Turnout is shown live.</Note>}
      {e.resultsVisible && e.contests.map(k => k.results && (
        <div key={k.id} style={{ marginTop: 12 }}>
          <div style={{ ...row, justifyContent: "space-between", marginBottom: 4 }}>
            <div style={{ fontWeight: 600 }}>{k.title}</div>
            <div style={muted}>{k.results.method}{k.results.subunits ? ` · ${k.results.subunits.reported} of ${k.results.subunits.total} precincts reporting` : ""}</div>
          </div>
          {k.results.subunits && <Progress value={k.results.subunits.reported} max={k.results.subunits.total} tone="#7e22ce" />}
          <div style={{ marginTop: 6 }}>
            <Bars rows={k.results.results.map(r => ({ label: r.name, sub: r.party, value: r.votes ?? 0 }))}
              highlight={k.results.ballots > 0 && k.results.winners?.length && ["closed", "certified"].includes(e.status) ? k.results.results.findIndex(r => k.results.winners.includes(r.id)) : undefined} />
          </div>
        </div>
      ))}
      <div style={{ ...row, marginTop: 10 }}>
        <span style={muted}>Updated {ago(e.updatedAt)}</span>
        <Btn small kind="ghost" onClick={loadAudit}>{audit ? "Hide audit log" : "🔗 Audit log"}</Btn>
        {e.resultsVisible && !reporting && <a href={`/api/elections/${e.id}?format=cdf`} style={{ fontSize: 12, color: C.link }}>Download results (NIST 1500-100) →</a>}
      </div>
      {audit && (
        <div style={{ marginTop: 10, fontSize: 12 }}>
          {audit.error ? <span style={{ color: "#d0344a" }}>{audit.error}</span> : (
            <>
              <div style={{ marginBottom: 6 }}>{audit.valid ? <Pill tone="green">✓ Chain intact — {audit.count} entries verified</Pill> : <Pill tone="red">✗ Chain broken at entry {audit.brokenAt}</Pill>}</div>
              <div style={{ maxHeight: 220, overflowY: "auto", fontFamily: "ui-monospace,monospace" }}>
                {audit.entries.map(x => (
                  <div key={x.id} style={{ padding: "3px 0", borderBottom: `1px solid ${C.rule}` }}>
                    <span style={{ color: C.textDim }}>{x.ts.replace("T", " ").slice(0, 19)}</span> <strong>{x.event}</strong> {JSON.stringify(x.detail)} <span style={{ color: C.textDim }}>#{x.hash.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function LiveTracker() {
  const { data, error } = useLoad(() => api("/api/tracker"), [], { interval: 10000 });
  return (
    <div>
      <SectionTitle sub="Everything updates automatically every 10 seconds. Official results come from Agora's sealed ballot count or directly from the election office's feed; every change is recorded in a public, tamper-evident audit log."
        right={data && <Pill tone="green">● Live · {new Date(data.generatedAt).toLocaleTimeString()}</Pill>}>
        Live Results &amp; Audit
      </SectionTitle>
      <ErrorNote error={error} />
      {!data && !error && <div style={muted}>Loading live data…</div>}
      {data && (
        <>
          <h3 style={{ fontSize: 15, margin: "6px 0 10px", color: C.text }}>🏛 Official elections</h3>
          {data.elections.length === 0 && <div style={{ ...card, color: C.textDim }}>No official elections are open or reporting results right now.{data.upcoming.length ? "" : ""}</div>}
          {data.elections.map(e => <ElectionResult key={e.id} e={e} />)}
          {data.upcoming.length > 0 && <div style={{ ...muted, marginBottom: 14 }}>Coming up: {data.upcoming.map(u => `${u.name} (${fmtDateTime(u.opensAt)})`).join(" · ")}</div>}

          <h3 style={{ fontSize: 15, margin: "18px 0 10px", color: C.text }}>🗳 Community polls</h3>
          {data.polls.length === 0 && <div style={{ ...card, color: C.textDim }}>No live polls yet.</div>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
            {data.polls.map(p => (
              <div key={p.id} style={{ ...card, marginBottom: 0 }}>
                <div style={{ ...row, justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, flex: 1, minWidth: 0 }}>{p.title}</div>
                  {p.source && <Pill tone="purple">Ballot</Pill>}
                </div>
                <Bars rows={p.options.map((o, i) => ({ label: o, value: p.tally[i] }))} />
                <div style={{ ...row, justifyContent: "space-between" }}>
                  <span style={muted}>{p.voters.toLocaleString()} voters</span>
                  <span title="Participation over time"><Sparkline points={p.history.map(h => h.voters)} /></span>
                </div>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 15, margin: "18px 0 10px", color: C.text }}>✍️ Petitions, recalls &amp; no-confidence drives</h3>
          {data.drives.length === 0 && <div style={{ ...card, color: C.textDim }}>No active signature drives.</div>}
          {data.drives.map(d => (
            <div key={d.id} style={{ ...card, padding: "10px 14px" }}>
              <div style={{ ...row, justifyContent: "space-between" }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{d.title}</div>
                <Pill tone={d.kind === "petition" ? "green" : d.kind === "recall" ? "red" : "amber"}>{d.kindLabel}</Pill>
              </div>
              <Progress value={d.signatures} max={d.goal || Math.max(100, d.signatures)} tone={d.kind === "petition" ? "#1a7a4a" : "#c0392b"}
                label={`${d.signatures.toLocaleString()} signatures${d.goal ? ` of ${d.goal.toLocaleString()}` : ""}`} />
            </div>
          ))}

          {data.proposals.length > 0 && <>
            <h3 style={{ fontSize: 15, margin: "18px 0 10px", color: C.text }}>💡 Proposals close to going live</h3>
            {data.proposals.map(p => (
              <div key={p.id} style={{ ...card, padding: "10px 14px" }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{p.title} <span style={muted}>· {p.kindLabel}</span></div>
                <Progress value={p.supporters} max={p.threshold} tone="#b45309" label={`${p.supporters} of ${p.threshold} supporters`} />
              </div>
            ))}
          </>}
        </>
      )}
    </div>
  );
}
