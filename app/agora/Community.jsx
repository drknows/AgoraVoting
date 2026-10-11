"use client";
/**
 * Community Polls tab — live polls, polls on real ballot measures and races,
 * petitions, recall & no-confidence signature drives, and community proposals
 * that go live automatically once enough members support them.
 */
import { useState } from "react";
import {
  api, useLoad, useMember, Btn, Field, Note, Pill, Bars, Progress, Tabs, SectionTitle, NeedLevel, ErrorNote,
  C, card, muted, row, input, fmtDate, LEVELS, openSignIn, goVerify,
} from "./kit";
import { US_STATES } from "../civic/ui";

const KIND_TONE = { poll: "blue", petition: "green", recall: "red", no_confidence: "amber" };

function ItemCard({ item, member, settings, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [signing, setSigning] = useState(false);
  const [pick, setPick] = useState(item.multi ? (Array.isArray(item.mine?.vote) ? item.mine.vote : []) : item.mine?.vote);
  const [sig, setSig] = useState({ city: "", county: "", state: member?.identity?.state || "", zip: "", attest: false, showPublicly: false, displayName: "", stance: "support" });
  const drive = item.kind === "recall" || item.kind === "no_confidence";

  async function act(body) {
    setBusy(true); setErr(null);
    try { await api("/api/community", { method: "POST", body: { id: item.id, ...body } }); onChange?.(); return true; }
    catch (x) { setErr(x); return false; } finally { setBusy(false); }
  }
  const needVote = settings?.voteLevel ?? 2, needSign = item.requiresIdentity ? 3 : (settings?.signLevel ?? 2), needSupport = settings?.supportLevel ?? 2;

  return (
    <div style={card}>
      <div style={{ ...row, marginBottom: 6 }}>
        <Pill tone={KIND_TONE[item.kind]}>{item.kindLabel}</Pill>
        {item.source && <Pill tone="purple">On the ballot{item.source.electionDate ? ` · ${item.source.electionDate}` : ""}</Pill>}
        {item.status === "proposed" && <Pill tone="amber">Proposed</Pill>}
        {item.status === "closed" && <Pill>Closed</Pill>}
        {item.requiresIdentity && <Pill tone="gray" title="Signers must complete full identity verification">ID-verified signers</Pill>}
      </div>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{item.title}</div>
      {item.target && <div style={{ fontSize: 13, marginBottom: 4 }}>Official: <strong>{item.target.name}</strong> — {item.target.office}, {item.target.jurisdiction}</div>}
      <div style={{ fontSize: 13, color: C.textMid, whiteSpace: "pre-wrap", marginBottom: 8 }}>{item.description}</div>
      <div style={{ ...muted, marginBottom: 10 }}>
        By {item.createdBy} · {fmtDate(item.liveAt || item.createdAt)}
        {item.closesAt && ` · closes ${fmtDate(item.closesAt)}`}
        {item.source?.url && <> · <a href={item.source.url} target="_blank" rel="noreferrer" style={{ color: C.link }}>{item.source.label || "Official source"} →</a></>}
      </div>

      {/* Proposal stage */}
      {item.status === "proposed" && (
        <div>
          <Progress value={item.supporters} max={item.threshold} tone="#b45309"
            label={`${item.supporters} of ${item.threshold} supporters needed to go live · expires ${fmtDate(item.proposalExpiresAt)}`} />
          <div style={{ ...row, marginTop: 10 }}>
            {member?.level >= needSupport
              ? <Btn kind={item.mine?.supported ? "ghost" : "primary"} disabled={busy} onClick={() => act({ action: item.mine?.supported ? "unsupport" : "support" })}>
                  {item.mine?.supported ? "✓ Supported — withdraw" : "Support this proposal"}</Btn>
              : <Btn kind="ghost" onClick={member ? goVerify : openSignIn}>{member ? `Verify (${LEVELS[needSupport]}) to support` : "Sign in to support"}</Btn>}
          </div>
        </div>
      )}

      {/* Poll voting & results (results are always public) */}
      {item.kind === "poll" && item.status !== "proposed" && (
        <div>
          {item.status === "live" && member?.level >= needVote && (
            <div style={{ marginBottom: 10 }}>
              {item.options.map((o, i) => (
                <label key={i} style={{ display: "flex", gap: 8, alignItems: "center", padding: "5px 0", fontSize: 14, cursor: "pointer" }}>
                  <input type={item.multi ? "checkbox" : "radio"} name={`p-${item.id}`}
                    checked={item.multi ? (pick || []).includes(i) : pick === i}
                    onChange={() => setPick(item.multi ? ((pick || []).includes(i) ? pick.filter(x => x !== i) : [...(pick || []), i]) : i)} />
                  {o}
                </label>
              ))}
              <div style={row}>
                <Btn disabled={busy || pick == null || (item.multi && !pick.length)} onClick={() => act({ action: "vote", choice: pick })}>
                  {item.mine?.vote != null ? "Change my vote" : "Vote"}</Btn>
                {item.mine?.vote != null && <span style={muted}>✓ Your vote is counted. You can change it while the poll is open.</span>}
              </div>
            </div>
          )}
          {item.status === "live" && !(member?.level >= needVote) && (
            <div style={{ marginBottom: 10 }}><Btn kind="ghost" onClick={member ? goVerify : openSignIn}>{member ? `Verify (${LEVELS[needVote]}) to vote` : "Sign in to vote"}</Btn></div>
          )}
          <Bars rows={item.options.map((o, i) => ({ label: o, value: item.tally[i] }))} />
          <div style={muted}>{item.voters.toLocaleString()} verified {item.voters === 1 ? "voter" : "voters"} · live results{item.source ? " · Agora community poll, not an official count" : ""}</div>
        </div>
      )}

      {/* Petitions & signature drives */}
      {item.kind !== "poll" && item.status !== "proposed" && (
        <div>
          <Progress value={item.signatures} max={item.goal || Math.max(100, item.signatures * 1.5)} tone={drive ? "#c0392b" : "#1a7a4a"}
            label={`${item.signatures.toLocaleString()} ${item.signatures === 1 ? "signature" : "signatures"}${item.goal ? ` of ${item.goal.toLocaleString()} goal` : ""}`} />
          {item.allowVote && item.tally && <div style={{ marginTop: 8 }}><Bars rows={[{ label: "Support", value: item.tally.support }, { label: "Oppose", value: item.tally.oppose }]} /></div>}
          {drive && <div style={{ ...muted, marginTop: 6 }}>Agora's electronic signatures show verified public support. Most states require recall petitions on official forms, so check with your state or county election office about filing an official recall.</div>}
          {item.status === "live" && (
            <div style={{ marginTop: 10 }}>
              {item.mine?.signed
                ? <div style={row}><Pill tone="green">✓ You signed</Pill><Btn small kind="ghost" disabled={busy} onClick={() => act({ action: "unsign" })}>Withdraw signature</Btn></div>
                : !(member?.level >= needSign)
                  ? <Btn kind="ghost" onClick={member ? goVerify : openSignIn}>{member ? `Verify (${LEVELS[needSign]}) to sign` : "Sign in to sign"}</Btn>
                  : !signing ? <Btn onClick={() => setSigning(true)}>{drive ? "Sign (verified identity)" : "Sign this petition"}</Btn>
                  : (
                    <div style={{ ...card, background: C.surface2, marginTop: 6 }}>
                      {drive && <div style={{ fontSize: 13, marginBottom: 8 }}>You'll sign as <strong>{member.identity.legalName}</strong> (from your verified ID).</div>}
                      <div style={row}>
                        <Field label="City"><input value={sig.city} onChange={e => setSig({ ...sig, city: e.target.value })} style={{ ...input, width: 150 }} /></Field>
                        {drive && <Field label="County"><input value={sig.county} onChange={e => setSig({ ...sig, county: e.target.value })} style={{ ...input, width: 140 }} /></Field>}
                        <Field label="State"><select value={sig.state} onChange={e => setSig({ ...sig, state: e.target.value })} style={{ ...input, width: 110 }}>
                          <option value="">—</option>{US_STATES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}</select></Field>
                        <Field label="ZIP"><input value={sig.zip} inputMode="numeric" onChange={e => setSig({ ...sig, zip: e.target.value })} style={{ ...input, width: 100 }} /></Field>
                      </div>
                      {item.allowVote && (
                        <div style={{ ...row, marginBottom: 8 }}>
                          {["support", "oppose"].map(s => <label key={s} style={{ fontSize: 13 }}><input type="radio" checked={sig.stance === s} onChange={() => setSig({ ...sig, stance: s })} /> {s === "support" ? "I support" : "I oppose"}</label>)}
                        </div>
                      )}
                      {!drive && (
                        <label style={{ fontSize: 13, display: "block", marginBottom: 8 }}><input type="checkbox" checked={sig.showPublicly} onChange={e => setSig({ ...sig, showPublicly: e.target.checked })} /> Show my name and city on the public signer list
                          {sig.showPublicly && <input placeholder="Name to show" value={sig.displayName} onChange={e => setSig({ ...sig, displayName: e.target.value })} style={{ ...input, marginLeft: 8, width: 160 }} />}</label>
                      )}
                      {drive && <label style={{ fontSize: 13, display: "block", marginBottom: 8 }}><input type="checkbox" checked={sig.attest} onChange={e => setSig({ ...sig, attest: e.target.checked })} /> I affirm I am a registered voter in {item.target?.jurisdiction}, and this is my own signature.</label>}
                      <div style={row}>
                        <Btn disabled={busy} onClick={async () => { if (await act({ action: "sign", ...sig })) setSigning(false); }}>Sign</Btn>
                        <Btn kind="ghost" onClick={() => setSigning(false)}>Cancel</Btn>
                      </div>
                    </div>
                  )}
            </div>
          )}
        </div>
      )}
      {err && <div style={{ marginTop: 8 }}>{err.needLevel ? <NeedLevel need={err.needLevel} member={member} what="this" /> : <ErrorNote error={err} />}</div>}
    </div>
  );
}

function ProposeForm({ settings, member, onDone }) {
  const [f, setF] = useState({ kind: "poll", title: "", description: "", options: ["", ""], multi: false, goal: "", allowVote: false,
    target: { name: "", office: "", jurisdiction: "" }, sourceUrl: "", closesAt: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = p => setF({ ...f, ...p });
  const drive = f.kind === "recall" || f.kind === "no_confidence";
  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr(null);
    try {
      await api("/api/community", { method: "POST", body: {
        action: "propose", kind: f.kind, title: f.title, description: f.description,
        options: f.options.filter(Boolean), multi: f.multi, goal: f.goal, allowVote: f.allowVote,
        target: drive ? f.target : undefined, closesAt: f.closesAt || undefined,
        source: f.sourceUrl ? { type: "link", url: f.sourceUrl, label: "Official ballot information" } : undefined,
      } });
      onDone();
    } catch (x) { setErr(x); } finally { setBusy(false); }
  }
  const threshold = drive ? settings?.recallProposalThreshold : settings?.proposalThreshold;
  return (
    <form onSubmit={submit} style={card}>
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Propose something for the community</div>
      <div style={{ ...muted, marginBottom: 12 }}>Your proposal goes live automatically once {threshold ?? "enough"} verified members support it within {settings?.proposalDays ?? 14} days.</div>
      <Field label="Type">
        <select value={f.kind} onChange={e => set({ kind: e.target.value })} style={input}>
          <option value="poll">Poll — ask a question (including about a ballot measure or race)</option>
          <option value="petition">Petition — collect signatures / a sign-up list</option>
          <option value="recall">Recall — signature drive to recall an official</option>
          <option value="no_confidence">Vote of no confidence — signature drive</option>
        </select>
      </Field>
      <Field label="Title"><input required maxLength={160} value={f.title} onChange={e => set({ title: e.target.value })} style={{ ...input, width: "100%" }} /></Field>
      <Field label="Description" hint="What is it about, and why does it matter?"><textarea required rows={4} maxLength={5000} value={f.description} onChange={e => set({ description: e.target.value })} style={{ ...input, width: "100%" }} /></Field>
      {f.kind === "poll" && (
        <>
          <Field label="Answer options">
            {f.options.map((o, i) => (
              <div key={i} style={{ ...row, marginBottom: 5 }}>
                <input value={o} maxLength={120} onChange={e => set({ options: f.options.map((x, j) => j === i ? e.target.value : x) })} style={{ ...input, flex: 1, minWidth: 200 }} placeholder={`Option ${i + 1}`} />
                {f.options.length > 2 && <Btn type="button" small kind="ghost" onClick={() => set({ options: f.options.filter((_, j) => j !== i) })}>Remove</Btn>}
              </div>
            ))}
            {f.options.length < 30 && <Btn type="button" small kind="ghost" onClick={() => set({ options: [...f.options, ""] })}>+ Add option</Btn>}
          </Field>
          <label style={{ fontSize: 13, display: "block", marginBottom: 10 }}><input type="checkbox" checked={f.multi} onChange={e => set({ multi: e.target.checked })} /> Allow choosing more than one option</label>
          <Field label="Link to official ballot information (optional)" hint="For polls about a real ballot measure or race."><input type="url" value={f.sourceUrl} onChange={e => set({ sourceUrl: e.target.value })} style={{ ...input, width: "100%" }} placeholder="https://" /></Field>
        </>
      )}
      {drive && (
        <div style={row}>
          <Field label="Official's name"><input required value={f.target.name} onChange={e => set({ target: { ...f.target, name: e.target.value } })} style={input} /></Field>
          <Field label="Office"><input required value={f.target.office} onChange={e => set({ target: { ...f.target, office: e.target.value } })} style={input} placeholder="e.g. City Council, District 3" /></Field>
          <Field label="Jurisdiction"><input required value={f.target.jurisdiction} onChange={e => set({ target: { ...f.target, jurisdiction: e.target.value } })} style={input} placeholder="e.g. City of Fresno" /></Field>
        </div>
      )}
      {f.kind !== "poll" && <Field label="Signature goal (optional)"><input type="number" min={1} value={f.goal} onChange={e => set({ goal: e.target.value })} style={{ ...input, width: 160 }} /></Field>}
      {f.kind === "petition" && <label style={{ fontSize: 13, display: "block", marginBottom: 10 }}><input type="checkbox" checked={f.allowVote} onChange={e => set({ allowVote: e.target.checked })} /> Also let members vote support / oppose</label>}
      <Field label="Closing date (optional)"><input type="date" value={f.closesAt} onChange={e => set({ closesAt: e.target.value })} style={input} /></Field>
      <div style={row}><Btn type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit proposal"}</Btn><Btn type="button" kind="ghost" onClick={onDone}>Cancel</Btn></div>
      {err && <div style={{ marginTop: 8 }}>{err.needLevel ? <NeedLevel need={err.needLevel} member={member} what="proposing" /> : <ErrorNote error={err} />}</div>}
    </form>
  );
}

const VIEWS = [
  { id: "polls", label: "🗳 Live polls", q: "status=live&kind=poll&source=community" },
  { id: "ballot", label: "🏛 Ballot & race polls", q: "status=live&kind=poll&source=ballot" },
  { id: "petitions", label: "✍️ Petitions", q: "status=live&kind=petition" },
  { id: "drives", label: "⚖️ Recalls & no-confidence", q: "status=live&kind=drives" },
  { id: "proposed", label: "💡 Proposed", q: "status=proposed" },
  { id: "closed", label: "📁 Closed", q: "status=closed" },
];

export function CommunityHub() {
  const { member } = useMember();
  const [view, setView] = useState("polls");
  const [proposing, setProposing] = useState(false);
  const q = VIEWS.find(v => v.id === view).q;
  const { data, error, loading, reload } = useLoad(() => api(`/api/community?${q}`), [q, member?.id], { interval: 15000 });
  const settings = data?.settings;
  return (
    <div>
      <SectionTitle sub="Polls, petitions and signature drives run by verified members. One person, one vote — results update live."
        right={<Btn onClick={() => (member ? setProposing(p => !p) : openSignIn())}>{proposing ? "Close" : "+ Propose a poll or petition"}</Btn>}>
        Community Polls
      </SectionTitle>
      {proposing && <ProposeForm settings={settings} member={member} onDone={() => { setProposing(false); setView("proposed"); reload(); }} />}
      <Tabs tabs={VIEWS} value={view} onChange={setView} />
      {view === "proposed" && <Note>Proposals become live polls or petitions automatically when they reach their support threshold. Support the ones you'd like to see.</Note>}
      {view === "ballot" && <Note>Polls on real ballot measures and candidates, so Agora can track public opinion. These are community polls, not official results.</Note>}
      <ErrorNote error={error} />
      {loading && !data && <div style={muted}>Loading…</div>}
      {data?.items?.length === 0 && <div style={{ ...card, textAlign: "center", color: C.textDim }}>Nothing here yet.{view !== "closed" && " Be the first to propose one."}</div>}
      {data?.items?.map(it => <ItemCard key={it.id} item={it} member={member} settings={settings} onChange={reload} />)}
    </div>
  );
}
