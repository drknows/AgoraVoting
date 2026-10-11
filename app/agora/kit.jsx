"use client";
/**
 * Shared building blocks for Agora's live (database-backed) screens.
 * Colors come from the civic theme variables, so everything follows the
 * visitor's light / dark / high-contrast choice.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { C, styles } from "../civic/ui";

export { C };

/* ── API ─────────────────────────────────────────────────────── */
export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method, cache: "no-store",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("json") ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) {
    const e = new Error((data && data.error) || `Request failed (${res.status})`);
    Object.assign(e, { status: res.status, ...(typeof data === "object" ? data : {}) });
    throw e;
  }
  return data;
}

export function useLoad(fn, deps = [], { interval } = {}) {
  const [state, set] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    set(s => ({ ...s, loading: !s.data }));
    fn().then(d => live && set({ data: d, error: null, loading: false }))
      .catch(e => live && set(s => ({ data: s.data, error: e, loading: false })));
    return () => { live = false; };
  }, [...deps, tick]);
  useEffect(() => {
    if (!interval) return;
    const t = setInterval(() => { if (!document.hidden) setTick(x => x + 1); }, interval);
    return () => clearInterval(t);
  }, [interval]);
  return { ...state, reload: () => setTick(x => x + 1) };
}

/* ── Signed-in member (shared across the whole page) ─────────── */
let memberState = { member: null, loaded: false, available: true, devMode: false };
const listeners = new Set();
const emit = () => listeners.forEach(l => l());
export async function refreshMember() {
  try {
    const d = await api("/api/auth");
    memberState = { member: d.member, loaded: true, available: d.available, devMode: d.devMode };
  } catch {
    memberState = { ...memberState, loaded: true };
  }
  emit();
  return memberState.member;
}
export function setMember(m) { memberState = { ...memberState, member: m, loaded: true }; emit(); }
export function useMember() {
  const s = useSyncExternalStore(cb => { listeners.add(cb); return () => listeners.delete(cb); }, () => memberState, () => memberState);
  useEffect(() => { if (!memberState.loaded) refreshMember(); }, []);
  return s;
}
export const LEVELS = ["Not signed in", "Email verified", "Email + phone verified", "Identity verified"];

/** Ask the host page to open the sign-in dialog or go to the Register tab. */
export const openSignIn = () => window.dispatchEvent(new CustomEvent("agora:signin"));
export const goVerify = () => window.dispatchEvent(new CustomEvent("agora:tab", { detail: "register" }));

/* ── UI primitives ───────────────────────────────────────────── */
export const card = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 12, color: C.text };
export const muted = { fontSize: 12, color: C.textDim };
export const row = { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" };
export const input = { padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 14, background: C.input, color: C.text, fontFamily: "inherit", boxSizing: "border-box" };

export function Btn({ children, kind = "primary", small, style, ...p }) {
  const k = {
    primary: { background: "#2756c8", color: "#fff", border: "1px solid #2756c8" },
    success: { background: "#1a7a4a", color: "#fff", border: "1px solid #1a7a4a" },
    danger: { background: "transparent", color: "#d0344a", border: "1px solid #d0344a88" },
    ghost: { background: C.surface2, color: C.text, border: `1px solid ${C.border}` },
  }[kind];
  return (
    <button {...p} style={{ ...k, padding: small ? "4px 10px" : "8px 14px", borderRadius: 7, fontSize: small ? 12 : 13, fontWeight: 600,
      cursor: p.disabled ? "not-allowed" : "pointer", opacity: p.disabled ? 0.55 : 1, fontFamily: "inherit", ...style }}>
      {children}
    </button>
  );
}

export function Field({ label, hint, children, style }) {
  return (
    <label style={{ display: "block", marginBottom: 10, ...style }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: C.text }}>{label}</div>
      {children}
      {hint && <div style={{ ...muted, marginTop: 3 }}>{hint}</div>}
    </label>
  );
}

export function Pill({ children, tone = "gray", title }) {
  const t = { green: ["#1a7a4a", "#edf7f1"], red: ["#c0392b", "#fdf0ee"], amber: ["#b45309", "#fef9ee"], blue: ["#2756c8", "#eef3ff"],
    purple: ["#7e22ce", "#f3e8ff"], gray: ["#666", "#f0f0f0"] }[tone] || ["#666", "#f0f0f0"];
  return <span title={title} style={styles.pill(t[0], t[1])}>{children}</span>;
}

export function Note({ tone = "info", children }) {
  const t = tone === "warn" ? { background: C.noteBg, border: `1px solid ${C.noteBd}` }
    : tone === "error" ? { background: "#fdf0ee", border: "1px solid #e8a3a3", color: "#8a1f1f" }
    : { background: C.infoBg, border: `1px solid ${C.infoBd}` };
  return <div style={{ ...t, borderRadius: 8, padding: "10px 14px", marginBottom: 12, fontSize: 13, lineHeight: 1.5, color: t.color || C.text }}>{children}</div>;
}

export function ErrorNote({ error }) {
  if (!error) return null;
  if (error.setup) return <Note tone="warn"><strong>Setup needed:</strong> {error.message} An administrator can see what's missing under Admin → Setup.</Note>;
  return <Note tone="error">⚠️ {error.message}</Note>;
}

export function Progress({ value, max, tone = "#2756c8", label }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div>
      <div style={{ height: 8, background: C.surface2, borderRadius: 99, overflow: "hidden", border: `1px solid ${C.rule}` }}>
        <div style={{ width: `${pct}%`, height: "100%", background: tone, transition: "width .4s" }} />
      </div>
      {label && <div style={{ ...muted, marginTop: 3 }}>{label}</div>}
    </div>
  );
}

/** Horizontal result bars. rows: [{ label, value, sub? }] */
export function Bars({ rows, highlight }) {
  const total = rows.reduce((a, r) => a + (r.value || 0), 0);
  const max = Math.max(1, ...rows.map(r => r.value || 0));
  return (
    <div>
      {rows.map((r, i) => (
        <div key={i} style={{ marginBottom: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 2 }}>
            <span style={{ fontWeight: highlight === i ? 700 : 500 }}>{r.label}{r.sub && <span style={muted}> · {r.sub}</span>}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>{(r.value || 0).toLocaleString()}{total ? <span style={muted}> ({Math.round(((r.value || 0) / total) * 100)}%)</span> : null}</span>
          </div>
          <div style={{ height: 7, background: C.surface2, borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: `${((r.value || 0) / max) * 100}%`, height: "100%", background: highlight === i ? "#1a7a4a" : "#4a7bff", transition: "width .4s" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Tiny trend line. points: numbers */
export function Sparkline({ points, width = 120, height = 28, color = "#4a7bff" }) {
  const p = (points || []).filter(v => v != null && !isNaN(v));
  if (p.length < 2) return <span style={muted}>—</span>;
  const min = Math.min(...p), max = Math.max(...p), span = max - min || 1;
  const d = p.map((v, i) => `${(i / (p.length - 1)) * width},${height - 2 - ((v - min) / span) * (height - 4)}`).join(" ");
  return <svg width={width} height={height} aria-hidden="true"><polyline points={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" /></svg>;
}

export function GradeBadge({ grade, score, label, size = "md" }) {
  const g = grade || "—";
  const color = g.startsWith("A") ? "#1a7a4a" : g.startsWith("B") ? "#2756c8" : g.startsWith("C") ? "#b45309" : g.startsWith("D") ? "#c2410c" : g === "F" ? "#b91c1c" : "#888";
  const big = size === "lg";
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", minWidth: big ? 74 : 54 }} title={score != null ? `${score} / 100` : "No data"}>
      <div style={{ width: big ? 58 : 40, height: big ? 58 : 40, borderRadius: 10, background: color + "18", border: `2px solid ${color}`,
        color, fontWeight: 800, fontSize: big ? 24 : 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{g}</div>
      {label && <div style={{ fontSize: 10, color: C.textDim, marginTop: 3, textAlign: "center", lineHeight: 1.2 }}>{label}</div>}
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div style={{ ...row, gap: 4, marginBottom: 14, borderBottom: `1px solid ${C.rule}`, paddingBottom: 8 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          style={{ padding: "6px 12px", borderRadius: 7, border: value === t.id ? `1px solid ${C.border}` : "1px solid transparent",
            background: value === t.id ? C.surface2 : "transparent", color: value === t.id ? C.text : C.textDim,
            fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
          {t.label}{t.count != null && <span style={{ ...muted, marginLeft: 5 }}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function SectionTitle({ children, sub, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
      <div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: C.text }}>{children}</div>
        {sub && <div style={{ fontSize: 13, color: C.textMid, marginTop: 3, maxWidth: 720 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

/** Explains what verification an action needs, with the right button. */
export function NeedLevel({ need, member, what = "this" }) {
  if (!member) return <Note>Sign in to take part in {what}. <Btn small onClick={openSignIn} style={{ marginLeft: 6 }}>Sign in</Btn></Note>;
  if (member.level >= need) return null;
  return <Note tone="warn">To take part in {what} you need: <strong>{LEVELS[need]}</strong>. You are at: {LEVELS[member.level]}.
    <Btn small onClick={goVerify} style={{ marginLeft: 6 }}>Continue verification</Btn></Note>;
}

export const fmtDate = d => d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";
export const fmtDateTime = d => d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";
export const fmtMoney = n => n == null ? "—" : n >= 1e6 ? `$${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${n}`;
export function ago(d) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${Math.max(1, s)}s ago`; if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`; return `${Math.round(s / 86400)}d ago`;
}
export function downloadText(filename, text, type = "text/csv") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
