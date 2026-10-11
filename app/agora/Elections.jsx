"use client";
/**
 * Official Elections tab — elections administered on Agora or reported to it.
 * Eligible voters (identity verified + on the jurisdiction's voter roll) cast a
 * secret ballot and get a receipt code to confirm it was counted.
 */
import { useState } from "react";
import { api, useLoad, useMember, Btn, Field, Note, Pill, SectionTitle, ErrorNote, NeedLevel, C, card, muted, row, input, fmtDateTime, openSignIn } from "./kit";

function ContestInput({ k, value, onChange }) {
  if (k.ui === "radio") return k.options.map(o => (
    <label key={o.id} style={{ display: "flex", gap: 8, padding: "6px 0", fontSize: 14, cursor: "pointer" }}>
      <input type="radio" name={k.id} checked={value?.choice === o.id} onChange={() => onChange({ choice: o.id })} />
      <span>{o.name}{o.party && <span style={muted}> · {o.party}</span>}</span>
    </label>
  ));
  if (k.ui === "checkbox" || k.ui === "approval") {
    const sel = value?.choices || [];
    return <>
      <div style={muted}>{k.ui === "approval" ? "Choose every candidate you approve of." : `Choose up to ${k.seats}.`}</div>
      {k.options.map(o => (
        <label key={o.id} style={{ display: "flex", gap: 8, padding: "6px 0", fontSize: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={sel.includes(o.id)} disabled={k.ui === "checkbox" && !sel.includes(o.id) && sel.length >= k.seats}
            onChange={() => onChange({ choices: sel.includes(o.id) ? sel.filter(x => x !== o.id) : [...sel, o.id] })} />
          <span>{o.name}{o.party && <span style={muted}> · {o.party}</span>}</span>
        </label>
      ))}
    </>;
  }
  const ranks = value?.rankings || [];
  return <>
    <div style={muted}>Rank candidates in order of preference — click to add, ranked from first choice down. You don't have to rank everyone.</div>
    <div style={{ ...row, margin: "8px 0" }}>
      {k.options.filter(o => !ranks.includes(o.id)).map(o => <Btn key={o.id} small kind="ghost" onClick={() => onChange({ rankings: [...ranks, o.id] })}>+ {o.name}</Btn>)}
    </div>
    <ol style={{ margin: 0, paddingLeft: 20 }}>
      {ranks.map((id, i) => (
        <li key={id} style={{ fontSize: 14, padding: "3px 0" }}>{k.options.find(o => o.id === id)?.name}
          <Btn small kind="ghost" style={{ marginLeft: 8 }} onClick={() => onChange({ rankings: ranks.filter(x => x !== id) })}>Remove</Btn>
          {i > 0 && <Btn small kind="ghost" style={{ marginLeft: 4 }} onClick={() => { const r = [...ranks]; [r[i - 1], r[i]] = [r[i], r[i - 1]]; onChange({ rankings: r }); }}>↑</Btn>}
        </li>
      ))}
    </ol>
  </>;
}

function Ballot({ election, member, onCast }) {
  const [sel, setSel] = useState({});
  const [reg, setReg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const need = election.isTest ? 2 : 3;
  if (receipt) return (
    <Note>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>✓ Your ballot has been cast.</div>
      Your receipt code: <strong style={{ fontFamily: "monospace", fontSize: 16 }}>{receipt}</strong><br />
      Save it. You can use it below at any time to confirm your ballot is included in the count. It does not reveal how you voted.
    </Note>
  );
  if (!member || member.level < need) return <NeedLevel need={need} member={member} what="this election" />;
  async function cast() {
    if (!window.confirm("Cast your ballot? Ballots can't be changed after they're cast.")) return;
    setBusy(true); setErr(null);
    try { const r = await api(`/api/elections/${election.id}`, { method: "POST", body: { action: "cast", registration: reg, selections: sel } }); setReceipt(r.receipt); onCast?.(); }
    catch (x) { setErr(x); } finally { setBusy(false); }
  }
  return (
    <div>
      {election.rollSize && (
        <Field label="Voter registration number" hint="Printed on your voter registration card or sample ballot. Matched privately against the official voter roll.">
          <input value={reg} onChange={e => setReg(e.target.value)} style={{ ...input, width: 240 }} />
        </Field>
      )}
      {election.contests.map(k => (
        <div key={k.id} style={{ ...card, background: C.surface2 }}>
          <div style={{ fontWeight: 700 }}>{k.title}</div>
          {k.subtitle && <div style={muted}>{k.subtitle}</div>}
          <div style={{ ...muted, marginBottom: 6 }}>{k.methodLabel}{k.seats > 1 ? ` · ${k.seats} seats` : ""}</div>
          {k.body && <details style={{ fontSize: 13, marginBottom: 6 }}><summary style={{ cursor: "pointer" }}>Full text</summary><div style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>{k.body}</div></details>}
          <ContestInput k={k} value={sel[k.id]} onChange={v => setSel({ ...sel, [k.id]: v })} />
        </div>
      ))}
      <Btn kind="success" disabled={busy || !Object.keys(sel).length} onClick={cast}>{busy ? "Casting…" : "Review & cast my ballot"}</Btn>
      <ErrorNote error={err} />
    </div>
  );
}

function ReceiptCheck({ id }) {
  const [code, setCode] = useState("");
  const [res, setRes] = useState(null);
  return (
    <div style={{ ...row, marginTop: 8 }}>
      <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Receipt code" style={{ ...input, width: 170, fontFamily: "monospace" }} />
      <Btn small kind="ghost" disabled={!code} onClick={async () => setRes(await api(`/api/elections/${id}?receipt=${encodeURIComponent(code)}`).catch(() => ({ error: true })))}>Check my ballot</Btn>
      {res && (res.included ? <Pill tone="green">✓ Included in the count</Pill> : <Pill tone="red">Not found — check the code</Pill>)}
    </div>
  );
}

function ElectionCard({ e, member }) {
  const [open, setOpen] = useState(false);
  const { data, reload } = useLoad(() => open ? api(`/api/elections/${e.id}`) : Promise.resolve(null), [open]);
  const el = data?.election;
  return (
    <div style={card}>
      <div style={{ ...row, justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{e.name}</div>
          <div style={muted}>{e.jurisdiction?.name} · {e.type} election · {e.opensAt ? `${fmtDateTime(e.opensAt)} – ${fmtDateTime(e.closesAt)}` : "dates to be announced"}</div>
        </div>
        <div style={row}>
          {e.isTest && <Pill tone="amber">Test</Pill>}
          <Pill tone={e.status === "open" ? "green" : "gray"}>{e.status === "open" ? "● Voting open" : e.status}</Pill>
          <Btn small kind={open ? "ghost" : "primary"} onClick={() => setOpen(!open)}>{open ? "Close" : e.status === "open" && e.mode === "agora_ballots" ? "Vote" : "Details"}</Btn>
        </div>
      </div>
      {open && el && (
        <div style={{ marginTop: 12 }}>
          {el.mode === "results_reporting" && <Note>Agora shows the official results reported by {el.jurisdiction.name}. Ballots for this election are cast with the election office, not on Agora.</Note>}
          {el.mode === "agora_ballots" && el.status === "open" && <Ballot election={el} member={member} onCast={reload} />}
          {el.mode === "agora_ballots" && el.status !== "open" && (
            <div>{el.contests.map(k => <div key={k.id} style={{ fontSize: 14, padding: "4px 0" }}>• <strong>{k.title}</strong> <span style={muted}>({k.methodLabel}) — {k.options.map(o => o.name).join(", ")}</span></div>)}</div>
          )}
          {el.mode === "agora_ballots" && el.turnout > 0 && <ReceiptCheck id={el.id} />}
          <div style={{ ...muted, marginTop: 8 }}>Live turnout and results are on the Live Results tab.</div>
        </div>
      )}
    </div>
  );
}

export function OfficialElections() {
  const { member } = useMember();
  const { data, error, loading } = useLoad(() => api("/api/elections"), [], { interval: 30000 });
  const list = data?.elections || [];
  return (
    <div>
      <SectionTitle sub="Official elections Agora administers for, or reports results from, government election offices. Voting requires full identity verification and a match to the official voter roll; ballots are secret."
        right={!member && <Btn onClick={openSignIn}>Sign in</Btn>}>
        Official Elections
      </SectionTitle>
      <ErrorNote error={error} />
      {loading && !data && <div style={muted}>Loading…</div>}
      {data && list.length === 0 && (
        <div style={{ ...card, textAlign: "center", padding: 30 }}>
          <div style={{ fontSize: 34 }}>🗳</div>
          <div style={{ fontWeight: 700, margin: "6px 0" }}>No official elections are scheduled on Agora right now.</div>
          <div style={{ ...muted, maxWidth: 520, margin: "0 auto" }}>When an election office partners with Agora, its elections appear here. Meanwhile you can verify your identity on the Register tab so you're ready, and take part in Community Polls.</div>
        </div>
      )}
      {list.map(e => <ElectionCard key={e.id} e={e} member={member} />)}
    </div>
  );
}
