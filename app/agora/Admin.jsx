"use client";
/** Admin console for Agora's live systems (shown only to signed-in staff). */
import { useState } from "react";
import { api, useLoad, Btn, Field, Note, Pill, Tabs, ErrorNote, C, card, muted, row, input, fmtDate, fmtDateTime, downloadText } from "./kit";
import { US_STATES, tableStyle, headRow, bodyRow, Th, Td } from "../civic/ui";
import { VOTING_METHODS } from "../VotingMethods";

/* ── Setup & members ─────────────────────────────────────────── */
function Setup() {
  const { data, error, reload } = useLoad(() => api("/api/admin/manage?view=setup"), []);
  return (
    <div>
      <Note>Each service is switched on by adding its settings in Vercel → your project → <strong>Settings → Environment Variables</strong>, then <strong>Redeploy</strong>. Green items are ready.</Note>
      <ErrorNote error={error} />
      {data && <>
        {data.databaseError && <Note tone="error">Database connection failed: {data.databaseError}</Note>}
        {data.checks.map(c => (
          <div key={c.id} style={{ ...card, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ fontSize: 20 }}>{c.ok ? "✅" : "⬜"}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{c.label}</div>
              <div style={{ fontSize: 12, fontFamily: "monospace", margin: "2px 0" }}>{c.vars.join(", ")}</div>
              <div style={muted}>{c.help}</div>
            </div>
          </div>
        ))}
        <Btn kind="ghost" onClick={reload}>Re-check</Btn>
      </>}
    </div>
  );
}

function Members() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { data, error, reload } = useLoad(() => api(`/api/admin/manage?view=members${search ? `&q=${encodeURIComponent(search)}` : ""}`), [search]);
  async function act(action, id) { await api("/api/admin/manage", { method: "POST", body: { action, id } }); reload(); }
  return (
    <div>
      <ErrorNote error={error} />
      {data && <div style={{ ...row, marginBottom: 12 }}>
        {[["Members", data.stats.total], ["Email verified", data.stats.email], ["Phone verified", data.stats.phone], ["ID verified", data.stats.identity], ["Duplicates blocked", data.stats.duplicates], ["Disabled", data.stats.disabled]].map(([l, v]) => (
          <div key={l} style={{ ...card, marginBottom: 0, padding: "8px 14px" }}><div style={{ fontSize: 20, fontWeight: 800 }}>{v}</div><div style={muted}>{l}</div></div>))}
      </div>}
      <div style={{ ...row, marginBottom: 10 }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find by exact email address" style={{ ...input, minWidth: 260 }} />
        <Btn small onClick={() => setSearch(q.trim())}>Search</Btn>{search && <Btn small kind="ghost" onClick={() => { setQ(""); setSearch(""); }}>Clear</Btn>}
      </div>
      <div style={muted}>Emails are stored encrypted and shown masked. SSNs, ID images and selfies are never stored by Agora.</div>
      {data && <div style={{ overflowX: "auto", marginTop: 8 }}><table style={tableStyle}>
        <thead><tr style={headRow}><Th>Member</Th><Th>Phone</Th><Th>Level</Th><Th>Identity</Th><Th>Joined</Th><Th></Th></tr></thead>
        <tbody>{data.members.map(m => (
          <tr key={m.id} style={bodyRow}>
            <Td><strong>{m.displayName || "—"}</strong><div style={muted}>{m.email}</div></Td>
            <Td style={{ fontSize: 12 }}>{m.phoneLast4 ? `••• ${m.phoneLast4}` : "—"}</Td>
            <Td><Pill tone={m.level >= 3 ? "green" : m.level === 2 ? "blue" : "gray"}>{m.levelName}</Pill></Td>
            <Td style={{ fontSize: 12 }}>{m.identityStatus}{m.identityError && <div style={muted}>{m.identityError}</div>}</Td>
            <Td style={{ fontSize: 12 }}>{fmtDate(m.createdAt)}</Td>
            <Td style={{ whiteSpace: "nowrap" }}>
              {m.disabled ? <Btn small kind="ghost" onClick={() => act("member_enable", m.id)}>Enable</Btn> : <Btn small kind="danger" onClick={() => confirm("Disable this account? They'll be signed out.") && act("member_disable", m.id)}>Disable</Btn>}
              {" "}{["needs_retry", "duplicate", "verified"].includes(m.identityStatus) && <Btn small kind="ghost" onClick={() => confirm("Clear this member's identity verification so they must verify again?") && act("member_reset_identity", m.id)}>Reset ID</Btn>}
            </Td>
          </tr>))}</tbody></table></div>}
    </div>
  );
}

/* ── Community ───────────────────────────────────────────────── */
function CreateItem({ onDone, preset }) {
  const [f, setF] = useState(preset || { kind: "poll", title: "", description: "", options: "Yes\nNo\nUndecided", multi: false, goal: "", allowVote: false, requiresIdentity: false,
    target: { name: "", office: "", jurisdiction: "" }, closesAt: "", status: "live", source: null });
  const [err, setErr] = useState(null);
  const set = p => setF({ ...f, ...p });
  const drive = f.kind === "recall" || f.kind === "no_confidence";
  async function save(e) {
    e.preventDefault(); setErr(null);
    try {
      await api("/api/community", { method: "POST", body: { action: "admin_create", ...f, options: String(f.options).split("\n").map(s => s.trim()).filter(Boolean), closesAt: f.closesAt || undefined } });
      onDone();
    } catch (x) { setErr(x); }
  }
  return (
    <form onSubmit={save} style={card}>
      <div style={row}>
        <Field label="Type"><select value={f.kind} onChange={e => set({ kind: e.target.value })} style={input}>
          <option value="poll">Poll</option><option value="petition">Petition / sign-up list</option><option value="recall">Recall drive</option><option value="no_confidence">Vote of no confidence</option></select></Field>
        <Field label="Publish as"><select value={f.status} onChange={e => set({ status: e.target.value })} style={input}><option value="live">Live now</option><option value="proposed">Proposal (needs community support)</option></select></Field>
        <Field label="Closes (optional)"><input type="date" value={f.closesAt} onChange={e => set({ closesAt: e.target.value })} style={input} /></Field>
      </div>
      <Field label="Title"><input required value={f.title} onChange={e => set({ title: e.target.value })} style={{ ...input, width: "100%" }} /></Field>
      <Field label="Description"><textarea required rows={3} value={f.description} onChange={e => set({ description: e.target.value })} style={{ ...input, width: "100%" }} /></Field>
      {f.kind === "poll" && <>
        <Field label="Options (one per line)"><textarea rows={4} value={f.options} onChange={e => set({ options: e.target.value })} style={{ ...input, width: "100%" }} /></Field>
        <label style={{ fontSize: 13 }}><input type="checkbox" checked={f.multi} onChange={e => set({ multi: e.target.checked })} /> Multiple choice</label>
      </>}
      {drive && <div style={row}>
        {["name", "office", "jurisdiction"].map(k => <Field key={k} label={`Official's ${k}`}><input required value={f.target[k]} onChange={e => set({ target: { ...f.target, [k]: e.target.value } })} style={input} /></Field>)}
      </div>}
      {f.kind !== "poll" && <Field label="Signature goal"><input type="number" value={f.goal} onChange={e => set({ goal: e.target.value })} style={{ ...input, width: 140 }} /></Field>}
      {f.kind === "petition" && <div style={{ fontSize: 13, marginBottom: 8 }}>
        <label><input type="checkbox" checked={f.allowVote} onChange={e => set({ allowVote: e.target.checked })} /> Allow support / oppose votes</label>{"  "}
        <label><input type="checkbox" checked={f.requiresIdentity} onChange={e => set({ requiresIdentity: e.target.checked })} /> Require full identity verification to sign</label></div>}
      {f.source && <Note>Linked to: {f.source.label}</Note>}
      <div style={row}><Btn type="submit">Create</Btn><Btn type="button" kind="ghost" onClick={onDone}>Cancel</Btn></div>
      <ErrorNote error={err} />
    </form>
  );
}

function BallotImport({ onPick }) {
  const [src, setSrc] = useState("fec");
  const [p, setP] = useState({ year: new Date().getFullYear(), office: "S", state: "CA", district: "", electionId: "", address: "" });
  const [res, setRes] = useState(null);
  const [err, setErr] = useState(null);
  const elections = useLoad(() => src === "civic" ? api("/api/community/import?source=civic_elections") : Promise.resolve(null), [src]);
  async function lookup() {
    setErr(null); setRes(null);
    try {
      setRes(src === "fec"
        ? await api(`/api/community/import?source=fec&year=${p.year}&office=${p.office}&state=${p.state}&district=${p.district}`)
        : await api(`/api/community/import?source=civic_contests&electionId=${p.electionId}&address=${encodeURIComponent(p.address)}`));
    } catch (x) { setErr(x); }
  }
  return (
    <div style={card}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Create polls from real ballots</div>
      <div style={row}>
        <Btn small kind={src === "fec" ? "primary" : "ghost"} onClick={() => setSrc("fec")}>Federal races (FEC)</Btn>
        <Btn small kind={src === "civic" ? "primary" : "ghost"} onClick={() => setSrc("civic")}>State & local contests and measures (Google Civic)</Btn>
      </div>
      <div style={{ ...row, marginTop: 10 }}>
        {src === "fec" ? <>
          <Field label="Year"><input type="number" value={p.year} onChange={e => setP({ ...p, year: e.target.value })} style={{ ...input, width: 90 }} /></Field>
          <Field label="Office"><select value={p.office} onChange={e => setP({ ...p, office: e.target.value })} style={input}><option value="S">U.S. Senate</option><option value="H">U.S. House</option><option value="P">President</option></select></Field>
          {p.office !== "P" && <Field label="State"><select value={p.state} onChange={e => setP({ ...p, state: e.target.value })} style={input}>{US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select></Field>}
          {p.office === "H" && <Field label="District"><input value={p.district} onChange={e => setP({ ...p, district: e.target.value })} style={{ ...input, width: 70 }} /></Field>}
        </> : <>
          <Field label="Election"><select value={p.electionId} onChange={e => setP({ ...p, electionId: e.target.value })} style={{ ...input, minWidth: 240 }}>
            <option value="">Next election at this address</option>{elections.data?.elections?.map(e => <option key={e.id} value={e.id}>{e.name} ({e.date})</option>)}</select></Field>
          <Field label="Street address in the area"><input value={p.address} onChange={e => setP({ ...p, address: e.target.value })} style={{ ...input, minWidth: 260 }} placeholder="2600 Fresno St, Fresno, CA" /></Field>
        </>}
        <Btn onClick={lookup}>Look up</Btn>
      </div>
      <ErrorNote error={err || elections.error} />
      {res && src === "fec" && (
        <div>
          <div style={{ fontSize: 13, margin: "6px 0" }}>{res.candidates.length} registered candidates.</div>
          <Btn small disabled={!res.candidates.length} onClick={() => onPick({ kind: "poll", status: "live", title: res.title,
            description: `Community poll on the ${res.title.split(":")[0]} race. Candidates as registered with the FEC. Agora polls are not official results.`,
            options: [...res.candidates.map(c => `${c.name}${c.party ? ` (${c.party.split(" ")[0]})` : ""}`), "Undecided"].join("\n"),
            multi: false, goal: "", allowVote: false, requiresIdentity: false, target: { name: "", office: "", jurisdiction: "" }, closesAt: "", source: res.source })}>Create poll from these candidates</Btn>
        </div>
      )}
      {res && src === "civic" && (
        res.contests.length === 0 ? <Note>No contests published for that address yet — states usually publish them a few weeks before an election.</Note> :
        res.contests.map(c => (
          <div key={c.key} style={{ ...row, justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.rule}` }}>
            <div><strong>{c.title}</strong> <span style={muted}>{c.kind === "measure" ? "Ballot measure" : "Contest"} · {c.district || ""} · {c.options.length} options</span></div>
            <Btn small onClick={() => onPick({ kind: "poll", status: "live", title: `${c.title}${c.kind === "measure" ? " — how will you vote?" : ": who do you plan to vote for?"}`,
              description: (c.description || c.subtitle || `Community poll on ${c.title}${res.election ? ` (${res.election.name})` : ""}.`).slice(0, 4900),
              options: [...c.options, "Undecided"].join("\n"), multi: false, goal: "", allowVote: false, requiresIdentity: false, target: { name: "", office: "", jurisdiction: "" }, closesAt: "",
              source: { type: "civic", label: res.election?.name || "Official ballot", url: c.url, electionDate: res.election?.date, jurisdiction: c.district, contestType: c.kind } })}>Create poll</Btn>
          </div>
        ))
      )}
    </div>
  );
}

function CommunityAdmin() {
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(null);
  const { data, error, reload } = useLoad(() => api(`/api/community?status=${status}&limit=200`), [status]);
  const settings = useLoad(() => api("/api/community", { method: "POST", body: { action: "admin_settings" } }), []);
  const [s, setS] = useState(null);
  const cur = s || settings.data?.settings;
  async function setItem(id, st) { await api("/api/community", { method: "POST", body: { action: "admin_status", id, status: st } }); reload(); }
  async function del(id) { if (confirm("Delete permanently, including all votes and signatures?")) { await api("/api/community", { method: "POST", body: { action: "admin_delete", id } }); reload(); } }
  async function exportSigs(id) { downloadText(`signatures-${id.slice(0, 8)}.csv`, await api(`/api/community?export=${id}`)); }
  async function saveSettings() { const r = await api("/api/community", { method: "POST", body: { action: "admin_settings", settings: cur } }); setS(r.settings); alert("Saved"); }
  return (
    <div>
      {cur && (
        <div style={card}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Rules</div>
          <div style={row}>
            <Field label="Supporters to go live"><input type="number" value={cur.proposalThreshold} onChange={e => setS({ ...cur, proposalThreshold: e.target.value })} style={{ ...input, width: 100 }} /></Field>
            <Field label="…for recall / no-confidence"><input type="number" value={cur.recallProposalThreshold} onChange={e => setS({ ...cur, recallProposalThreshold: e.target.value })} style={{ ...input, width: 100 }} /></Field>
            <Field label="Proposal window (days)"><input type="number" value={cur.proposalDays} onChange={e => setS({ ...cur, proposalDays: e.target.value })} style={{ ...input, width: 100 }} /></Field>
            {[["voteLevel", "To vote"], ["proposeLevel", "To propose"], ["supportLevel", "To support"], ["signLevel", "To sign petitions"]].map(([k, l]) => (
              <Field key={k} label={l}><select value={cur[k]} onChange={e => setS({ ...cur, [k]: e.target.value })} style={input}>
                <option value={1}>Email</option><option value={2}>Email + phone</option><option value={3}>Full identity</option></select></Field>))}
          </div>
          <div style={muted}>Recall and no-confidence signatures always require full identity verification.</div>
          <Btn small onClick={saveSettings} style={{ marginTop: 6 }}>Save rules</Btn>
        </div>
      )}
      <div style={{ ...row, marginBottom: 10 }}>
        <Btn onClick={() => setCreating({})}>+ Create poll / petition / drive</Btn>
        <select value={status} onChange={e => setStatus(e.target.value)} style={input}>
          <option value="all">All</option><option value="live">Live</option><option value="proposed">Proposed</option><option value="closed">Closed</option><option value="rejected">Rejected</option></select>
      </div>
      {creating && <CreateItem preset={creating.kind ? creating : undefined} onDone={() => { setCreating(null); reload(); }} />}
      <BallotImport onPick={p => setCreating(p)} />
      <ErrorNote error={error} />
      {data?.items?.map(i => (
        <div key={i.id} style={{ ...card, padding: "10px 14px" }}>
          <div style={{ ...row, justifyContent: "space-between" }}>
            <div style={{ flex: 1, minWidth: 220 }}><strong>{i.title}</strong><div style={muted}>{i.kindLabel} · {i.status} · {i.voters} votes · {i.signatures} signatures · {i.supporters} supporters · by {i.createdBy}</div></div>
            <div style={row}>
              {i.status !== "live" && <Btn small onClick={() => setItem(i.id, "live")}>Make live</Btn>}
              {i.status === "live" && <Btn small kind="ghost" onClick={() => setItem(i.id, "closed")}>Close</Btn>}
              {i.status === "proposed" && <Btn small kind="ghost" onClick={() => setItem(i.id, "rejected")}>Reject</Btn>}
              {i.kind !== "poll" && <Btn small kind="ghost" onClick={() => exportSigs(i.id)}>Export signatures</Btn>}
              <Btn small kind="danger" onClick={() => del(i.id)}>Delete</Btn>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Official elections ─────────────────────────────────────── */
const blankContest = () => ({ id: "", title: "", kind: "candidate", method: "plurality_single", seats: 1, options: "" });

function ElectionForm({ onDone }) {
  const [e, setE] = useState({ name: "", jurisdiction: { level: "city", name: "" }, type: "general", mode: "agora_ballots", resultsPolicy: "sealed_until_close", isTest: true, opensAt: "", closesAt: "", contests: [blankContest()] });
  const [err, setErr] = useState(null);
  const setC = (i, p) => setE({ ...e, contests: e.contests.map((c, j) => j === i ? { ...c, ...p } : c) });
  async function save(ev) {
    ev.preventDefault(); setErr(null);
    try {
      await api("/api/elections", { method: "POST", body: { action: "create", election: { ...e,
        opensAt: e.opensAt || null, closesAt: e.closesAt || null,
        contests: e.contests.map((c, i) => ({ ...c, id: c.id || `c${i + 1}`, options: c.options.split("\n").map(s => s.trim()).filter(Boolean) })) } } });
      onDone();
    } catch (x) { setErr(x); }
  }
  return (
    <form onSubmit={save} style={card}>
      <div style={row}>
        <Field label="Election name"><input required value={e.name} onChange={x => setE({ ...e, name: x.target.value })} style={{ ...input, minWidth: 260 }} /></Field>
        <Field label="Jurisdiction"><input required value={e.jurisdiction.name} onChange={x => setE({ ...e, jurisdiction: { ...e.jurisdiction, name: x.target.value } })} style={input} /></Field>
        <Field label="Level"><select value={e.jurisdiction.level} onChange={x => setE({ ...e, jurisdiction: { ...e.jurisdiction, level: x.target.value } })} style={input}>
          {["federal", "state", "county", "city", "district", "tribal", "other"].map(l => <option key={l}>{l}</option>)}</select></Field>
        <Field label="Type"><select value={e.type} onChange={x => setE({ ...e, type: x.target.value })} style={input}>{["general", "primary", "special", "runoff", "recall", "referendum", "other"].map(l => <option key={l}>{l}</option>)}</select></Field>
      </div>
      <div style={row}>
        <Field label="Mode"><select value={e.mode} onChange={x => setE({ ...e, mode: x.target.value })} style={input}><option value="agora_ballots">Agora runs the voting</option><option value="results_reporting">Jurisdiction reports results to Agora</option></select></Field>
        <Field label="Results while voting is open"><select value={e.resultsPolicy} onChange={x => setE({ ...e, resultsPolicy: x.target.value })} style={input}><option value="sealed_until_close">Sealed until close (recommended)</option><option value="live">Live</option></select></Field>
        <Field label="Voting opens"><input type="datetime-local" value={e.opensAt} onChange={x => setE({ ...e, opensAt: x.target.value })} style={input} /></Field>
        <Field label="Voting closes"><input type="datetime-local" value={e.closesAt} onChange={x => setE({ ...e, closesAt: x.target.value })} style={input} /></Field>
      </div>
      <label style={{ fontSize: 13, display: "block", marginBottom: 10 }}><input type="checkbox" checked={e.isTest} onChange={x => setE({ ...e, isTest: x.target.checked })} /> Test election (no voter roll needed; email + phone verified members may vote; clearly labeled "Test")</label>
      {e.contests.map((c, i) => (
        <div key={i} style={{ ...card, background: C.surface2 }}>
          <div style={row}>
            <Field label={`Contest ${i + 1}`}><input required value={c.title} onChange={x => setC(i, { title: x.target.value })} style={{ ...input, minWidth: 240 }} placeholder="e.g. Mayor / Measure J" /></Field>
            <Field label="Kind"><select value={c.kind} onChange={x => setC(i, { kind: x.target.value })} style={input}><option value="candidate">Candidates</option><option value="measure">Ballot measure</option></select></Field>
            <Field label="Voting method"><select value={c.method} onChange={x => setC(i, { method: x.target.value })} style={{ ...input, maxWidth: 260 }}>
              {Object.values(VOTING_METHODS).map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></Field>
            <Field label="Seats"><input type="number" min={1} value={c.seats} onChange={x => setC(i, { seats: x.target.value })} style={{ ...input, width: 70 }} /></Field>
          </div>
          <Field label="Choices (one per line)"><textarea required rows={3} value={c.options} onChange={x => setC(i, { options: x.target.value })} style={{ ...input, width: "100%" }} placeholder={c.kind === "measure" ? "Yes\nNo" : "Candidate A\nCandidate B"} /></Field>
          {e.contests.length > 1 && <Btn small kind="danger" type="button" onClick={() => setE({ ...e, contests: e.contests.filter((_, j) => j !== i) })}>Remove contest</Btn>}
        </div>
      ))}
      <div style={row}><Btn type="button" kind="ghost" onClick={() => setE({ ...e, contests: [...e.contests, blankContest()] })}>+ Add contest</Btn><Btn type="submit">Create election (draft)</Btn><Btn type="button" kind="ghost" onClick={onDone}>Cancel</Btn></div>
      <ErrorNote error={err} />
    </form>
  );
}

function RollUpload({ id, onDone }) {
  const [msg, setMsg] = useState(null);
  async function upload(file, replace) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const head = lines[0].toLowerCase().split(",").map(s => s.trim().replace(/"/g, ""));
    const idx = n => head.findIndex(h => h.replace(/[^a-z]/g, "").includes(n));
    const [iId, iLast, iDob] = [idx("voterid") >= 0 ? idx("voterid") : idx("registration"), idx("lastname"), idx("dob") >= 0 ? idx("dob") : idx("birth")];
    if (iId < 0 || iLast < 0 || iDob < 0) { setMsg("The CSV needs columns: voter_id, last_name, dob"); return; }
    const records = lines.slice(1).map(l => l.split(",").map(s => s.trim().replace(/^"|"$/g, ""))).map(c => ({ voterId: c[iId], lastName: c[iLast], dob: c[iDob] }));
    let total = 0, skipped = 0;
    for (let i = 0; i < records.length; i += 5000) {
      setMsg(`Uploading ${Math.min(i + 5000, records.length).toLocaleString()} of ${records.length.toLocaleString()}…`);
      const r = await api(`/api/elections/${id}`, { method: "POST", body: { action: "roll", records: records.slice(i, i + 5000), replace: replace && i === 0 } });
      total = r.total; skipped += r.skipped;
    }
    setMsg(`Voter roll loaded: ${total.toLocaleString()} voters (${skipped} rows skipped). Stored only as fingerprints.`); onDone();
  }
  return (
    <div style={{ marginTop: 8 }}>
      <div style={muted}>Voter roll CSV with columns voter_id, last_name, dob. Names and numbers are converted to irreversible fingerprints as they arrive; the roll itself is never stored.</div>
      <input type="file" accept=".csv,text/csv" onChange={e => e.target.files[0] && upload(e.target.files[0], confirm("Replace the existing roll? (Cancel = add to it)"))} style={{ marginTop: 6 }} />
      {msg && <div style={{ fontSize: 13, marginTop: 6 }}>{msg}</div>}
    </div>
  );
}

function ElectionsAdmin() {
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(null);
  const [importMsg, setImportMsg] = useState(null);
  const { data, error, reload } = useLoad(() => api("/api/elections"), []);
  const keys = useLoad(() => api("/api/admin/manage?view=keys"), []);
  const [newKey, setNewKey] = useState(null);
  async function act(id, body) { try { await api(`/api/elections/${id}`, { method: "POST", body }); reload(); } catch (x) { alert(x.message); } }
  async function importFile(file) {
    setImportMsg("Importing…");
    try { const r = await api("/api/elections", { method: "POST", body: { action: "import_cdf", report: JSON.parse(await file.text()) } }); setImportMsg(r.created ? "Election imported as a draft." : "Results updated for the existing election."); reload(); }
    catch (x) { setImportMsg(`Import failed: ${x.message}`); }
  }
  return (
    <div>
      <Note>Official elections follow the U.S. standard data format, <strong>NIST SP 1500-100</strong>. Election offices can send election definitions and live results automatically using a jurisdiction API key below, or you can upload their files here.</Note>
      <div style={{ ...row, marginBottom: 12 }}>
        <Btn onClick={() => setCreating(!creating)}>{creating ? "Close" : "+ Create election"}</Btn>
        <label style={{ fontSize: 13 }}>Import NIST 1500-100 JSON: <input type="file" accept=".json,application/json" onChange={e => e.target.files[0] && importFile(e.target.files[0])} /></label>
        {importMsg && <span style={{ fontSize: 13 }}>{importMsg}</span>}
      </div>
      {creating && <ElectionForm onDone={() => { setCreating(false); reload(); }} />}
      <ErrorNote error={error} />
      {data?.elections?.map(e => (
        <div key={e.id} style={card}>
          <div style={{ ...row, justifyContent: "space-between" }}>
            <div><strong>{e.name}</strong> {e.isTest && <Pill tone="amber">Test</Pill>} <Pill>{e.status}</Pill>
              <div style={muted}>{e.jurisdiction?.name} · {e.mode === "agora_ballots" ? `Agora voting · turnout ${e.turnout ?? 0} · roll ${e.rollSize ?? 0}` : `Results reporting${e.reportedStatus ? ` · ${e.reportedStatus}` : ""}`} · {e.resultsPolicy === "live" ? "live results" : "sealed until close"}</div></div>
            <div style={row}>
              {e.status === "draft" && <><Btn small onClick={() => act(e.id, { action: "status", status: "scheduled" })}>Schedule</Btn><Btn small onClick={() => act(e.id, { action: "status", status: "open" })}>Open now</Btn></>}
              {e.status === "scheduled" && <Btn small onClick={() => act(e.id, { action: "status", status: "open" })}>Open now</Btn>}
              {e.status === "open" && <Btn small kind="danger" onClick={() => confirm("Close voting now?") && act(e.id, { action: "status", status: "closed" })}>Close voting</Btn>}
              {e.status === "closed" && <Btn small kind="success" onClick={() => confirm("Certify results? This is final.") && act(e.id, { action: "status", status: "certified" })}>Certify</Btn>}
              <Btn small kind="ghost" onClick={() => setOpen(open === e.id ? null : e.id)}>{open === e.id ? "Less" : "More"}</Btn>
            </div>
          </div>
          {open === e.id && (
            <div style={{ marginTop: 8 }}>
              {e.mode === "agora_ballots" && ["draft", "scheduled", "open"].includes(e.status) && <RollUpload id={e.id} onDone={reload} />}
              <div style={{ ...row, marginTop: 8 }}>
                <Btn small kind="ghost" onClick={() => act(e.id, { action: "policy", policy: e.resultsPolicy === "live" ? "sealed_until_close" : "live" })}>{e.resultsPolicy === "live" ? "Seal results until close" : "Show results live"}</Btn>
                {["closed", "certified"].includes(e.status) && <a href={`/api/elections/${e.id}?format=cdf`} style={{ color: C.link, fontSize: 13 }}>Export results (NIST 1500-100)</a>}
                {e.status === "draft" && <Btn small kind="danger" onClick={() => confirm("Delete this draft election?") && act(e.id, { action: "delete" })}>Delete draft</Btn>}
              </div>
              <div style={{ ...muted, marginTop: 6 }}>Election ID for API feeds: <code>{e.id}</code></div>
            </div>
          )}
        </div>
      ))}
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Jurisdiction API keys</div>
        <div style={{ ...muted, marginBottom: 8 }}>Give one key to each election office. Their systems POST NIST 1500-100 JSON to <code>/api/elections</code> with the header <code>Authorization: Bearer &lt;key&gt;</code>. Sending a report again with new counts updates results live.</div>
        <div style={row}><Btn small onClick={async () => { const name = prompt("Election office name (e.g. Fresno County Elections)"); if (name) { setNewKey(await api("/api/admin/manage", { method: "POST", body: { action: "key_create", name } })); keys.reload(); } }}>+ Create key</Btn></div>
        {newKey && <Note tone="warn">Key for <strong>{newKey.name}</strong> (shown only once — copy it now): <code style={{ wordBreak: "break-all" }}>{newKey.key}</code></Note>}
        {keys.data?.keys?.map(k => (
          <div key={k.id} style={{ ...row, justifyContent: "space-between", padding: "5px 0", borderTop: `1px solid ${C.rule}` }}>
            <span style={{ fontSize: 13 }}>{k.name} <span style={muted}>· created {fmtDate(k.created_at)} · last used {k.last_used_at ? fmtDateTime(k.last_used_at) : "never"}</span></span>
            {k.revoked_at ? <Pill>Revoked</Pill> : <Btn small kind="danger" onClick={async () => { if (confirm("Revoke this key?")) { await api("/api/admin/manage", { method: "POST", body: { action: "key_revoke", id: k.id } }); keys.reload(); } }}>Revoke</Btn>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Disclosures ─────────────────────────────────────────────── */
function DisclosuresAdmin() {
  const pending = useLoad(() => api("/api/disclosures?view=pending"), []);
  const meta = useLoad(() => api("/api/disclosures?view=meta"), []).data;
  const [msg, setMsg] = useState(null);
  async function sync() { setMsg("Syncing House reports… (up to a minute)"); try { const r = await api("/api/disclosures/sync", { method: "POST" }); setMsg(`House index: ${r.filingsInIndex} reports, ${r.added} new, ${r.parsed} read (${r.transactionsAdded} transactions), ${r.remaining} still queued.`); } catch (x) { setMsg(`Sync failed: ${x.message}`); } }
  async function review(id, status) { await api("/api/disclosures", { method: "POST", body: { action: "review", id, status } }); pending.reload(); }
  async function csv(file) { setMsg("Importing…"); try { const r = await api("/api/disclosures", { method: "POST", body: { action: "import_csv", csv: await file.text() } }); setMsg(`Imported ${r.added} transactions.${r.errors.length ? ` Problems: ${r.errors.slice(0, 5).join("; ")}` : ""}`); } catch (x) { setMsg(x.message); } }
  return (
    <div>
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Sources</div>
        <div style={row}><Btn onClick={sync}>Sync U.S. House reports now</Btn><span style={muted}>Also runs automatically every day.</span></div>
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 13 }}>Bulk import (Senate, OGE, judiciary, state and local filings) — CSV columns:</div>
          <code style={{ fontSize: 11, display: "block", margin: "4px 0", wordBreak: "break-all" }}>official_name, category, office, jurisdiction, state, asset, ticker, asset_type, transaction_type, transaction_date, disclosed_date, amount, owner, source_type, source_url, notes</code>
          <div style={muted}>category: {meta?.categories?.map(c => c.id).join(", ")}</div>
          <input type="file" accept=".csv,text/csv" onChange={e => e.target.files[0] && csv(e.target.files[0])} style={{ marginTop: 6 }} />
        </div>
        {msg && <Note>{msg}</Note>}
      </div>
      <div style={{ fontWeight: 700, margin: "6px 0" }}>Member submissions awaiting review</div>
      <ErrorNote error={pending.error} />
      {pending.data?.transactions?.length === 0 && <div style={{ ...card, color: C.textDim }}>Nothing waiting.</div>}
      {pending.data?.transactions?.map(t => (
        <div key={t.id} style={{ ...card, padding: "10px 14px" }}>
          <div><strong>{t.official.name}</strong> ({t.official.office || t.official.categoryLabel}) — {t.transactionType} {t.asset} · {t.amount.text || "amount n/a"} · {fmtDate(t.transactionDate)}</div>
          <div style={{ ...row, marginTop: 6 }}><a href={t.sourceUrl} target="_blank" rel="noreferrer" style={{ color: C.link, fontSize: 13 }}>Check the source document →</a>
            <Btn small kind="success" onClick={() => review(t.id, "published")}>Publish</Btn><Btn small kind="danger" onClick={() => review(t.id, "rejected")}>Reject</Btn></div>
        </div>
      ))}
    </div>
  );
}

/* ── Report cards ────────────────────────────────────────────── */
function ReportCardsAdmin() {
  const meta = useLoad(() => api("/api/reportcards?level=city"), []).data?.methodology;
  const [b, setB] = useState({ level: "city", name: "", state: "CA", iso: "", items: {} });
  const [msg, setMsg] = useState(null);
  async function sync() { setMsg("Refreshing from World Bank, IMF and FRED…"); try { const r = await api("/api/reportcards/sync", { method: "POST" }); setMsg(`Updated ${r.national ?? 0} national and ${r.states ?? 0} state report cards.${r.nationalError ? ` National error: ${r.nationalError}` : ""}${r.skipped ? ` (${r.skipped})` : ""}`); } catch (x) { setMsg(x.message); } }
  async function save(e) {
    e.preventDefault(); setMsg(null);
    try { await api("/api/reportcards", { method: "POST", body: { action: "assess", ...b, name: b.level === "state" ? b.state : b.name } }); setMsg("Assessment saved and grades updated."); }
    catch (x) { setMsg(x.message); }
  }
  const setItem = (k, p) => setB({ ...b, items: { ...b.items, [k]: { ...(b.items[k] || {}), ...p } } });
  const groups = meta ? [["Ethics", meta.rubric.ethics], ["Economic stability", meta.rubric.stability], ["Sustainability", meta.rubric.sustainability], ["Responsibility", meta.rubric.responsibility]] : [];
  return (
    <div>
      <div style={card}><div style={row}><Btn onClick={sync}>Refresh automatic grades now</Btn><span style={muted}>Runs automatically every day.</span></div>{msg && <Note>{msg}</Note>}</div>
      <form onSubmit={save} style={card}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Assess a government against the checklist</div>
        <div style={{ ...muted, marginBottom: 10 }}>Score each item 0 (very poor) to 4 (excellent) and cite a source for every score. Leave items blank if you don't have evidence. For countries and states, this is combined with the automatic data.</div>
        <div style={row}>
          <Field label="Level"><select value={b.level} onChange={e => setB({ ...b, level: e.target.value })} style={input}><option value="city">City</option><option value="county">County</option><option value="state">U.S. state</option><option value="national">Country</option></select></Field>
          {b.level !== "state" && b.level !== "national" && <Field label="Name"><input required value={b.name} onChange={e => setB({ ...b, name: e.target.value })} style={input} placeholder={b.level === "city" ? "Fresno" : "Fresno County"} /></Field>}
          {b.level === "national" && <><Field label="Country name"><input required value={b.name} onChange={e => setB({ ...b, name: e.target.value })} style={input} /></Field><Field label="ISO code"><input required value={b.iso} maxLength={3} onChange={e => setB({ ...b, iso: e.target.value.toUpperCase() })} style={{ ...input, width: 80 }} placeholder="USA" /></Field></>}
          {b.level !== "national" && <Field label="State"><select value={b.state} onChange={e => setB({ ...b, state: e.target.value, name: b.level === "state" ? e.target.value : b.name })} style={input}>{US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}</select></Field>}
        </div>
        {groups.map(([g, items]) => (
          <div key={g} style={{ marginTop: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{g}</div>
            {items.map(it => (
              <div key={it.key} style={{ ...row, padding: "4px 0", borderBottom: `1px solid ${C.rule}` }}>
                <div style={{ flex: 1, minWidth: 220, fontSize: 13 }}>{it.label}</div>
                <select value={b.items[it.key]?.score ?? ""} onChange={e => setItem(it.key, { score: e.target.value })} style={{ ...input, width: 70 }}><option value="">—</option>{[0, 1, 2, 3, 4].map(n => <option key={n}>{n}</option>)}</select>
                <input type="url" placeholder="Source link (https://…)" value={b.items[it.key]?.source || ""} onChange={e => setItem(it.key, { source: e.target.value })} style={{ ...input, width: 220 }} />
                <input placeholder="Note (optional)" value={b.items[it.key]?.note || ""} onChange={e => setItem(it.key, { note: e.target.value })} style={{ ...input, width: 160 }} />
              </div>
            ))}
          </div>
        ))}
        <Btn type="submit" style={{ marginTop: 10 }}>Save assessment</Btn>
      </form>
    </div>
  );
}

export function AdminConsole() {
  const [tab, setTab] = useState("setup");
  return (
    <div>
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: "setup", label: "⚙️ Setup" }, { id: "members", label: "👤 Members" }, { id: "community", label: "🗳 Community" },
        { id: "elections", label: "🏛 Official elections" }, { id: "disclosures", label: "💼 Disclosures" }, { id: "grades", label: "📊 Report cards" },
      ]} />
      {tab === "setup" && <Setup />}
      {tab === "members" && <Members />}
      {tab === "community" && <CommunityAdmin />}
      {tab === "elections" && <ElectionsAdmin />}
      {tab === "disclosures" && <DisclosuresAdmin />}
      {tab === "grades" && <ReportCardsAdmin />}
    </div>
  );
}
