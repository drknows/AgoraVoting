"use client";
/**
 * Sign-in (email code) dialog, the header account chip, and the
 * Register tab's step-by-step verification: email → phone → ID + selfie + SSN.
 */
import { useEffect, useState } from "react";
import { api, useMember, setMember, refreshMember, Btn, Field, Note, Pill, C, card, muted, row, input, LEVELS, openSignIn } from "./kit";
import { CivicTheme } from "../civic/ui";

/* ── Email code form (used in the dialog and in step 1) ───────── */
export function EmailCodeForm({ onDone, compact }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState("email");
  const [devCode, setDevCode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function send(e) {
    e?.preventDefault(); setBusy(true); setErr(null);
    try {
      const r = await api("/api/auth", { method: "POST", body: { action: "email_start", email } });
      setDevCode(r.devCode || null); setStage("code");
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  async function confirm(e) {
    e?.preventDefault(); setBusy(true); setErr(null);
    try {
      const r = await api("/api/auth", { method: "POST", body: { action: "email_confirm", email, code, name } });
      setMember(r.member); onDone?.(r.member);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }

  return stage === "email" ? (
    <form onSubmit={send}>
      <Field label="Email address"><input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} style={{ ...input, width: "100%" }} autoComplete="email" /></Field>
      {!compact && <Field label="Display name (optional)" hint="Shown on proposals you create."><input value={name} maxLength={60} onChange={e => setName(e.target.value)} style={{ ...input, width: "100%" }} /></Field>}
      <Btn type="submit" disabled={busy || !email}>{busy ? "Sending…" : "Email me a code"}</Btn>
      {err && <div style={{ color: "#d0344a", fontSize: 13, marginTop: 8 }}>⚠ {err}</div>}
    </form>
  ) : (
    <form onSubmit={confirm}>
      <div style={{ fontSize: 13, marginBottom: 10 }}>We sent a 6-digit code to <strong>{email}</strong>. It expires in 10 minutes.</div>
      {devCode && <Note tone="warn">Test mode — code: <strong>{devCode}</strong></Note>}
      <Field label="Code"><input inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={6} value={code}
        onChange={e => setCode(e.target.value.replace(/\D/g, ""))} style={{ ...input, width: 140, fontSize: 20, letterSpacing: 4 }} /></Field>
      <div style={row}>
        <Btn type="submit" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Verify & sign in"}</Btn>
        <Btn type="button" kind="ghost" onClick={() => { setStage("email"); setCode(""); }}>Use a different email</Btn>
      </div>
      {err && <div style={{ color: "#d0344a", fontSize: 13, marginTop: 8 }}>⚠ {err}</div>}
    </form>
  );
}

export function SignInDialog({ open, onClose, G }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "10vh 16px" }}>
      <CivicTheme G={G}>
        <div onClick={e => e.stopPropagation()} style={{ ...card, width: "min(420px, 100%)", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Sign in to Agora</div>
            <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: C.textDim, fontSize: 20, cursor: "pointer" }}>×</button>
          </div>
          <div style={{ ...muted, marginBottom: 14 }}>No password needed — we email you a one-time code. New here? This creates your account.</div>
          <EmailCodeForm compact onDone={onClose} />
        </div>
      </CivicTheme>
    </div>
  );
}

export function AccountChip({ G, t }) {
  const { member } = useMember();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener("agora:signin", h);
    return () => window.removeEventListener("agora:signin", h);
  }, []);
  async function signOut() { await api("/api/auth", { method: "DELETE" }).catch(() => {}); setMember(null); }
  return (
    <>
      {member ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span title={LEVELS[member.level]} style={{ fontSize: 12, color: G.textMid, display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: member.level >= 3 ? G.green : member.level === 2 ? G.blue : G.gold }} />
            {member.displayName} <span className="hide-mobile">· {["", "Email", "Phone", "ID verified"][member.level]}</span>
          </span>
          <button onClick={signOut} style={{ background: G.surface, border: `1px solid ${G.border2}`, color: G.text, borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{t?.signOut || "Sign out"}</button>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} style={{ background: G.surface, border: `1px solid ${G.border2}`, color: G.text, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
          {t?.signIn || "Sign In"}
        </button>
      )}
      <SignInDialog open={open} onClose={() => setOpen(false)} G={G} />
    </>
  );
}

/* ── Register tab: Agora verification ────────────────────────── */
function Step({ n, title, done, active, children, sub }) {
  return (
    <div style={{ ...card, borderColor: active ? "#4a7bff" : C.border, opacity: !done && !active ? 0.65 : 1 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 30, height: 30, borderRadius: 99, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800,
          background: done ? "#1a7a4a" : active ? "#2756c8" : C.surface2, color: done || active ? "#fff" : C.textDim }}>{done ? "✓" : n}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
          {sub && <div style={{ ...muted, marginTop: 2 }}>{sub}</div>}
          {(active || done) && <div style={{ marginTop: 10 }}>{children}</div>}
        </div>
      </div>
    </div>
  );
}

function PhoneStep({ member }) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  async function send(e) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { setSent(await api("/api/verify", { method: "POST", body: { action: "phone_start", phone } })); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  async function confirm(e) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { const r = await api("/api/verify", { method: "POST", body: { action: "phone_confirm", phone, code } }); setMember(r.member); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  if (member.level >= 2) return <div style={{ fontSize: 13 }}>Mobile number ending in <strong>{member.phoneLast4}</strong> verified.</div>;
  return !sent ? (
    <form onSubmit={send}>
      <Field label="Mobile phone number" hint="U.S. numbers can be typed normally; others start with + and the country code. One account per phone number.">
        <input type="tel" autoComplete="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567" style={{ ...input, width: 220 }} />
      </Field>
      <Btn type="submit" disabled={busy || phone.replace(/\D/g, "").length < 10}>{busy ? "Sending…" : "Text me a code"}</Btn>
      {err && <div style={{ color: "#d0344a", fontSize: 13, marginTop: 8 }}>⚠ {err}</div>}
    </form>
  ) : (
    <form onSubmit={confirm}>
      <div style={{ fontSize: 13, marginBottom: 8 }}>Code sent to the number ending in <strong>{sent.last4}</strong>.</div>
      {sent.devCode && <Note tone="warn">Test mode — code: <strong>{sent.devCode}</strong></Note>}
      <div style={row}>
        <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
          style={{ ...input, width: 140, fontSize: 20, letterSpacing: 4 }} aria-label="Code" />
        <Btn type="submit" disabled={busy || code.length !== 6}>{busy ? "Checking…" : "Verify phone"}</Btn>
        <Btn type="button" kind="ghost" onClick={() => { setSent(null); setCode(""); }}>Change number</Btn>
      </div>
      {err && <div style={{ color: "#d0344a", fontSize: 13, marginTop: 8 }}>⚠ {err}</div>}
    </form>
  );
}

function IdentityStep({ member, devMode }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [dev, setDev] = useState(null);
  const id = member.identity;

  useEffect(() => {
    const returned = new URLSearchParams(window.location.search).get("identity") === "return";
    if (returned || ["pending", "processing"].includes(id.status)) {
      api("/api/verify").then(r => setMember(r.member)).catch(() => {});
      if (returned) window.history.replaceState(null, "", "/?tab=register");
    }
  }, []);
  useEffect(() => {
    if (id.status !== "processing") return;
    const t = setInterval(() => api("/api/verify").then(r => setMember(r.member)).catch(() => {}), 5000);
    return () => clearInterval(t);
  }, [id.status]);

  async function start() {
    setBusy(true); setErr(null);
    try {
      const r = await api("/api/verify", { method: "POST", body: { action: "identity_start" } });
      if (r.url) window.location.href = r.url;
      else if (r.devSimulate) setDev({ firstName: "", lastName: "", dob: "", ssn: "", state: "" });
      else await refreshMember();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }
  async function simulate(e) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { const r = await api("/api/verify", { method: "POST", body: { action: "identity_dev_simulate", ...dev } }); setMember(r.member); setDev(null); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  }

  if (id.status === "verified") return (
    <div style={{ fontSize: 13 }}>Identity verified as <strong>{id.legalName}</strong>{id.state ? ` (${id.state})` : ""} on {new Date(id.verifiedAt).toLocaleDateString()}.
      <div style={{ ...muted, marginTop: 4 }}>You can now sign recall and no-confidence petitions and vote in official elections you are registered for.</div></div>
  );
  return (
    <div>
      <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>
        You'll be taken to a secure screen run by <strong>Stripe Identity</strong>, Agora's identity-checking partner, to:
        <ol style={{ margin: "6px 0 6px 18px", padding: 0 }}>
          <li>photograph your driver's license, state ID or passport,</li>
          <li>take a live selfie, which is matched to the ID photo, and</li>
          <li>enter your Social Security number, which is checked against your name and date of birth.</li>
        </ol>
        <span style={muted}>Agora never stores your SSN, ID images or selfie. We keep only the result, your verified legal name, and an irreversible
        fingerprint that stops one person from opening several accounts. Takes about 3 minutes.</span>
      </div>
      {id.status === "processing" && <Note>⏳ Your documents are being checked — usually under a minute. This page updates automatically.</Note>}
      {id.status === "needs_retry" && <Note tone="warn">Verification didn't go through: {id.error || "please try again."}</Note>}
      {id.status === "duplicate" && <Note tone="error">{id.error} If you believe this is a mistake, contact Agora support.</Note>}
      {id.status !== "duplicate" && id.status !== "processing" && !dev &&
        <Btn onClick={start} disabled={busy}>{busy ? "Starting…" : id.status === "needs_retry" || id.status === "pending" ? "Continue identity check" : "Start identity check"}</Btn>}
      {dev && (
        <form onSubmit={simulate} style={{ ...card, background: C.surface2 }}>
          <Note tone="warn"><strong>Local test mode.</strong> The real Stripe check isn't connected, so enter sample details to simulate a pass. This form never appears on the live site.</Note>
          <div style={row}>
            {[["firstName", "First name"], ["lastName", "Last name"], ["dob", "Birth date (YYYY-MM-DD)"], ["ssn", "Test SSN"], ["state", "State (e.g. CA)"]].map(([k, l]) => (
              <Field key={k} label={l}><input required value={dev[k]} onChange={e => setDev({ ...dev, [k]: e.target.value })} style={{ ...input, width: 170 }} /></Field>
            ))}
          </div>
          <Btn type="submit" disabled={busy}>Simulate verified ID</Btn>
        </form>
      )}
      {err && <div style={{ color: "#d0344a", fontSize: 13, marginTop: 8 }}>⚠ {err}</div>}
    </div>
  );
}

export function VerificationWizard() {
  const { member, loaded, available, devMode } = useMember();
  if (!loaded) return <div style={muted}>Loading…</div>;
  const level = member?.level || 0;
  return (
    <div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: C.text, marginBottom: 4 }}>Register &amp; verify</div>
      <div style={{ fontSize: 13, color: C.textMid, marginBottom: 18, maxWidth: 720 }}>
        Agora verifies every voter so each person gets exactly one voice. Each step unlocks more:
        email lets you follow and comment; email + phone lets you vote in community polls, support proposals and sign petitions;
        full identity verification is required for recall and no-confidence petitions and official elections.
      </div>
      {!available && <Note tone="warn">Accounts aren't switched on yet — an administrator needs to connect the database (Admin → Setup).</Note>}
      <div style={{ ...row, marginBottom: 14 }}>
        {LEVELS.slice(1).map((l, i) => <Pill key={l} tone={level > i ? "green" : "gray"}>{level > i ? "✓ " : ""}{l}</Pill>)}
      </div>
      <Step n={1} title="Verify your email" sub="Creates your account and signs you in." done={level >= 1} active={level === 0}>
        {level >= 1 ? <div style={{ fontSize: 13 }}>Signed in as <strong>{member.email}</strong>.</div> : <EmailCodeForm />}
      </Step>
      <Step n={2} title="Verify your mobile phone" sub="A text-message code. One account per phone number." done={level >= 2} active={level === 1}>
        {member && <PhoneStep member={member} />}
      </Step>
      <Step n={3} title="Verify your identity" sub="Government photo ID + live selfie + Social Security number." done={level >= 3} active={level === 2}>
        {member && <IdentityStep member={member} devMode={devMode} />}
      </Step>
    </div>
  );
}
