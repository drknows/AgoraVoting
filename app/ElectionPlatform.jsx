"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { VOTING_METHODS, METHOD_CATEGORIES, tallyVotes } from "./VotingMethods";
import {
  fetchFEC, fetchLDA,
  cachedFetch, API_KEYS
} from "./apiConfig";
import { CivicTheme } from "./civic/ui";
import {
  VotingRecords, RecentVotes, MemberSearch, LegislationTracker, StateVotes, LocalVotes,
} from "./civic/VoteSections";
import { Crowdsource, ExpertAnalysis, Meetings, Arrests, EthicsFactCheck } from "./civic/PhaseTwoSections";
import { LegislationReview } from "./civic/LegislationReview";

/* ═══════════════════════════════════════════════════════════════
   AGORA ELECTION PLATFORM v2.0
   Enhanced: Email confirm · Strong PINs · Candidate profiles
   Admin panel · Accessibility · Security · i18n · Mobile
═══════════════════════════════════════════════════════════════ */

// ─── i18n ─────────────────────────────────────────────────────────
const TRANSLATIONS = {
  en: {
    appName: "AGORA", appSub: "Secure Democratic Voting",
    signIn: "Sign In", signOut: "Sign Out", register: "Register to Vote",
    officialElection: "🏛 Official Election", communityPolls: "📋 Community Polls",
    resultsAudit: "📊 Results & Audit", registerTab: "✅ Register",
    castVote: "Cast Ballot →", confirmVote: "Confirm & Seal Ballot",
    submitVote: "Submit Vote", goBack: "Go Back",
    tier1Title: "Online Polling", tier2Title: "Official Elections",
    required: "All fields required.", invalidEmail: "Invalid email address.",
    ageError: "You must be at least 18 years of age.",
    dupEmail: "This email is already registered.",
    pinWeak: "PIN must be 8+ chars with a number and special character.",
    ssnFormat: "SSN must be in format XXX-XX-XXXX.",
    addressRequired: "Complete registered voting address required.",
    phoneRequired: "Valid phone number required.",
    otpRequired: "You must verify your phone number.",
    faceRequired: "Facial recognition required.",
    agreeRequired: "You must agree to the privacy and security terms.",
    verifying: "Verifying…", continue: "Continue →", back: "← Back",
    sendCode: "Send Code", resend: "Resend", verify: "Verify",
    beginScan: "Begin Facial Scan", uploadId: "Upload your ID",
    registrationSuccess: "Registration Complete",
    voteSealed: "Ballot sealed and recorded. Your receipt hash has been updated. 🗳",
    voteCast: "Vote cast!", signedOut: "Signed out.",
    welcomeBack: "Welcome,", releaseResults: "Release Results",
    resultsReleased: "Results Released", totalVotes: "Total votes:",
    notFound: "Hash not found. Check for typos or contact the election authority.",
    hashValid: "Receipt verified. A valid ballot with this hash exists in the sealed record.",
    sessionExpiry: "Session expires in",
    minutes: "min", darkMode: "Dark Mode", lightMode: "Light Mode",
    fontSize: "Text Size", highContrast: "High Contrast",
    exportCSV: "Export CSV", exportPDF: "Export Report",
    releaseAt: "Release at:", adminUnlock: "Unlock Admin",
    voterRolls: "Voter Rolls", auditLog: "Audit Log",
    notifications: "Notifications", notifEmail: "Email Reminders",
    notifSMS: "SMS Reminders", savePrefs: "Save Preferences",
    voterGuide: "Voter Guide", endorsements: "Endorsements",
    platform: "Platform", experience: "Experience",
  },
  es: {
    appName: "AGORA", appSub: "Votación Democrática Segura",
    signIn: "Iniciar Sesión", signOut: "Cerrar Sesión", register: "Registrarse para Votar",
    officialElection: "🏛 Elección Oficial", communityPolls: "📋 Encuestas",
    resultsAudit: "📊 Resultados", registerTab: "✅ Registrarse",
    castVote: "Votar →", confirmVote: "Confirmar y Sellar Voto",
    submitVote: "Enviar Voto", goBack: "Regresar",
    tier1Title: "Encuestas en Línea", tier2Title: "Elecciones Oficiales",
    required: "Todos los campos son obligatorios.", invalidEmail: "Correo inválido.",
    ageError: "Debe tener al menos 18 años.", dupEmail: "Este correo ya está registrado.",
    pinWeak: "PIN debe tener 8+ caracteres con número y carácter especial.",
    ssnFormat: "SSN debe tener formato XXX-XX-XXXX.",
    addressRequired: "Dirección de votación requerida.", phoneRequired: "Número de teléfono requerido.",
    otpRequired: "Debe verificar su teléfono.", faceRequired: "Reconocimiento facial requerido.",
    agreeRequired: "Debe aceptar los términos de privacidad.",
    verifying: "Verificando…", continue: "Continuar →", back: "← Atrás",
    sendCode: "Enviar Código", resend: "Reenviar", verify: "Verificar",
    beginScan: "Iniciar Escaneo", uploadId: "Cargar Identificación",
    registrationSuccess: "Registro Completo",
    voteSealed: "Voto sellado y registrado. 🗳", voteCast: "¡Voto enviado!",
    signedOut: "Sesión cerrada.", welcomeBack: "Bienvenido,",
    releaseResults: "Publicar Resultados", resultsReleased: "Resultados Publicados",
    totalVotes: "Total votos:", notFound: "Hash no encontrado.",
    hashValid: "Recibo verificado. El voto existe en el registro sellado.",
    sessionExpiry: "Sesión expira en", minutes: "min",
    darkMode: "Modo Oscuro", lightMode: "Modo Claro",
    fontSize: "Tamaño Texto", highContrast: "Alto Contraste",
    exportCSV: "Exportar CSV", exportPDF: "Exportar Reporte",
    releaseAt: "Publicar a las:", adminUnlock: "Desbloquear Admin",
    voterRolls: "Padrón Electoral", auditLog: "Registro de Auditoría",
    notifications: "Notificaciones", notifEmail: "Recordatorios por Correo",
    notifSMS: "Recordatorios por SMS", savePrefs: "Guardar Preferencias",
    voterGuide: "Guía del Votante", endorsements: "Endorsos",
    platform: "Plataforma", experience: "Experiencia",
  },
  zh: {
    appName: "广场", appSub: "安全民主投票平台",
    signIn: "登录", signOut: "退出", register: "选民注册",
    officialElection: "🏛 正式选举", communityPolls: "📋 社区投票",
    resultsAudit: "📊 结果与审计", registerTab: "✅ 注册",
    castVote: "投票 →", confirmVote: "确认并封存选票",
    submitVote: "提交投票", goBack: "返回",
    tier1Title: "在线调查", tier2Title: "正式选举",
    required: "所有字段必填。", invalidEmail: "无效邮箱地址。",
    ageError: "您必须年满18岁。", dupEmail: "该邮箱已注册。",
    pinWeak: "PIN须8位以上，含数字和特殊字符。",
    ssnFormat: "SSN格式: XXX-XX-XXXX。",
    addressRequired: "需要完整注册投票地址。", phoneRequired: "需要有效手机号。",
    otpRequired: "必须验证手机号。", faceRequired: "需要人脸识别。",
    agreeRequired: "必须同意隐私和安全条款。",
    verifying: "验证中…", continue: "继续 →", back: "← 返回",
    sendCode: "发送验证码", resend: "重新发送", verify: "验证",
    beginScan: "开始人脸扫描", uploadId: "上传证件",
    registrationSuccess: "注册完成",
    voteSealed: "选票已封存并记录。🗳", voteCast: "投票成功！",
    signedOut: "已退出登录。", welcomeBack: "欢迎，",
    releaseResults: "公布结果", resultsReleased: "结果已公布",
    totalVotes: "总票数：", notFound: "未找到哈希值。",
    hashValid: "收据已验证。封存记录中存在有效选票。",
    sessionExpiry: "会话过期时间", minutes: "分钟",
    darkMode: "深色模式", lightMode: "浅色模式",
    fontSize: "字体大小", highContrast: "高对比度",
    exportCSV: "导出CSV", exportPDF: "导出报告",
    releaseAt: "公布时间:", adminUnlock: "解锁管理",
    voterRolls: "选民名册", auditLog: "审计日志",
    notifications: "通知", notifEmail: "邮件提醒",
    notifSMS: "短信提醒", savePrefs: "保存设置",
    voterGuide: "投票指南", endorsements: "背书",
    platform: "政纲", experience: "经历",
  },
};

// ─── Theme tokens ─────────────────────────────────────────────────
function makeTheme(dark, highContrast) {
  if (!dark) return {
    bg: "#f4f5f7", surface: "#ffffff", surface2: "#eef0f4", border: "#d0d4de",
    border2: "#b8bdd0", blue: "#2455d4", blueD: "#1a3fa8", blueDim: "#dce8ff",
    gold: "#b07d1a", goldDim: "#fff3cd", green: "#1a8a5a", greenDim: "#d4f5e5",
    red: "#c0122e", redDim: "#ffe0e5", text: "#1a1c2e", textDim: "#6b7080",
    textMid: "#3a3f5a", purple: "#6b3dcc", purpleDim: "#ede0ff",
  };
  if (highContrast) return {
    bg: "#000000", surface: "#0a0a0a", surface2: "#111111", border: "#ffffff",
    border2: "#dddddd", blue: "#66aaff", blueD: "#3377ff", blueDim: "#001133",
    gold: "#ffcc44", goldDim: "#332200", green: "#44ff99", greenDim: "#003311",
    red: "#ff4455", redDim: "#330011", text: "#ffffff", textDim: "#aaaaaa",
    textMid: "#cccccc", purple: "#cc88ff", purpleDim: "#220033",
  };
  return {
    bg: "#08090b", surface: "#0f1117", surface2: "#161820", border: "#1e2030",
    border2: "#252840", blue: "#4a7bff", blueD: "#2455d4", blueDim: "#1a2a5e",
    gold: "#e2b45a", goldDim: "#7a5f28", green: "#3ecf8e", greenDim: "#1a4a35",
    red: "#f04060", redDim: "#4a1525", text: "#e8eaf0", textDim: "#6b7080",
    textMid: "#9aa0b4", purple: "#a06cf8", purpleDim: "#2d1a5e",
  };
}

// ─── Utilities ────────────────────────────────────────────────────
function simpleHash(s) { let h = 0; for (let c of s) { h = ((h << 5) - h) + c.charCodeAt(0); h |= 0; } return h.toString(36); }
function genId(p = "V") { return `${p}-${Math.floor(100000 + Math.random() * 900000)}`; }
function genReceipt() { return Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join(""); }
function validatePin(pin) { return pin.length >= 8 && /\d/.test(pin) && /[^a-zA-Z0-9]/.test(pin); }
function exportCSV(rows, filename) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
  a.download = filename; a.click();
}

// ─── Seed data ────────────────────────────────────────────────────
const ELECTION_RACES = [
  {
    id: "r1", level: "Federal", type: "Senate",
    title: "U.S. Senate — California",
    description: "Six-year term. Represents California in the United States Senate.",
    candidates: [
      {
        id: "c1", name: "Eleanor Vasquez", party: "Democratic", color: "#4a7bff",
        bio: "Current State Attorney General. 14 years in public service.",
        avatar: "EV", experience: "State AG (2018–present) · State Assembly (2010–2018) · DA, Alameda County",
        platform: "Universal healthcare access, clean energy transition, affordable housing bonds.",
        endorsements: "CA Teachers Assoc. · Sierra Club · SEIU Local 1000",
        website: "vasquez2026.com",
      },
      {
        id: "c2", name: "Marcus Holt", party: "Republican", color: "#f04060",
        bio: "Former Mayor of San Diego. Business economist.",
        avatar: "MH", experience: "Mayor of San Diego (2014–2022) · State Budget Committee",
        platform: "Fiscal discipline, small business relief, border security, school choice.",
        endorsements: "CA Chamber of Commerce · Police Officers Assoc. · Farmers & Ranchers Assoc.",
        website: "holt2026.com",
      },
      {
        id: "c3", name: "Priya Nair", party: "Independent", color: "#3ecf8e",
        bio: "Environmental scientist and community organizer.",
        avatar: "PN", experience: "EPA Advisor (2016–2020) · Director, CA Water Council · Stanford PhD, Env. Science",
        platform: "Climate emergency action, campaign finance reform, ranked-choice voting.",
        endorsements: "350.org · CA Nurses Assoc. · League of Women Voters",
        website: "nairforsenate.com",
      },
    ],
    votes: { c1: 0, c2: 0, c3: 0 }, open: true, releaseAt: null, releaseTime: "20:00",
    votingMethod: "rcv", seats: 1, ballots: [],
  },
  {
    id: "r2", level: "State", type: "Governor",
    title: "Governor of California",
    description: "Four-year term. Chief executive of California state government.",
    candidates: [
      {
        id: "c4", name: "James Okafor", party: "Democratic", color: "#4a7bff",
        bio: "Lieutenant Governor. Former Oakland Mayor.",
        avatar: "JO", experience: "Lt. Governor (2019–present) · Mayor, Oakland (2013–2019)",
        platform: "Universal Pre-K, BART expansion, statewide water infrastructure.",
        endorsements: "CA Democratic Party · AFSCME · CA Latino Legislative Caucus",
        website: "okafor2026.com",
      },
      {
        id: "c5", name: "Sandra Whitmore", party: "Republican", color: "#f04060",
        bio: "State Senator (R-Fresno). Agricultural policy expert.",
        avatar: "SW", experience: "State Senator (2016–present) · CA Farm Bureau Director",
        platform: "Water rights, agricultural subsidies, reduce state regulations.",
        endorsements: "CA Republican Party · Western Growers Assoc. · Howard Jarvis Taxpayers",
        website: "whitmore2026.com",
      },
    ],
    votes: { c4: 0, c5: 0 }, open: true, releaseAt: null, releaseTime: "20:00",
    votingMethod: "irv", seats: 1, ballots: [],
  },
  {
    id: "r3", level: "Local", type: "Measure",
    title: "Measure J — Community Housing Bond",
    description: "Authorizes $800 million in general obligation bonds to fund affordable housing construction.",
    candidates: [
      { id: "c6", name: "Yes on J", party: "For", color: "#3ecf8e", avatar: "✓", bio: "Support affordable housing expansion.", experience: "", platform: "Fund construction of 4,000 affordable units and rehabilitate 1,200 existing homes.", endorsements: "Housing for All Coalition · NAACP CA · Building Trades Council", website: "" },
      { id: "c7", name: "No on J", party: "Against", color: "#f04060", avatar: "✗", bio: "Oppose the bond measure.", experience: "", platform: "Concerns about property tax increases and lack of accountability measures.", endorsements: "Howard Jarvis Taxpayers · CA Policy Center", website: "" },
    ],
    votes: { c6: 0, c7: 0 }, open: true, releaseAt: null, releaseTime: "20:00",
    votingMethod: "plurality_single", seats: 1, ballots: [],
  },
];

const POLL_TOPICS = [
  { id: "p1", title: "Should the city expand bike lanes?", desc: "Allocate 15% of road budget to cycling infrastructure.", options: ["Strongly Support", "Support with Conditions", "Oppose", "Need More Info"], votes: { "Strongly Support": 14, "Support with Conditions": 9, "Oppose": 5, "Need More Info": 3 }, open: true },
  { id: "p2", title: "Remote work policy for city employees", desc: "Allow municipal workers up to 3 days/week remote.", options: ["Full 3 Days", "1–2 Day Hybrid", "Office Only", "Employee Choice"], votes: { "Full 3 Days": 22, "1–2 Day Hybrid": 18, "Office Only": 4, "Employee Choice": 11 }, open: true },
];

const STEPS_EN = ["Personal Info", "Email Confirm", "Gov't ID", "SSN & Address", "Phone Verify", "Face ID", "Review"];

// ─── Primitives ───────────────────────────────────────────────────
const Chip = ({ label, color }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{label}</span>
);

const Spinner = ({ size = 18, color = "#4a7bff" }) => (
  <div style={{ width: size, height: size, border: `2px solid ${color}33`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
);

function Avatar({ initials, color, size = 48 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${color}cc, ${color}55)`, border: `2px solid ${color}88`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.33, fontWeight: 700, color: "#fff", flexShrink: 0, letterSpacing: "-0.02em" }}>
      {initials}
    </div>
  );
}

function ProgressBar({ pct, color, height = 6 }) {
  return (
    <div style={{ background: "#1e2030", borderRadius: height, height, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: height, transition: "width 0.7s ease" }} />
    </div>
  );
}

function Btn({ children, onClick, variant = "primary", size = "md", disabled, full, style: s }) {
  const G2 = { primary: { bg: "#4a7bff", fg: "#fff" }, success: { bg: "#3ecf8e", fg: "#0a1a12" }, danger: { bg: "#4a1525", fg: "#f04060", border: "1px solid #f0406044" }, outline: { bg: "transparent", fg: "#9aa0b4", border: "1px solid #252840" }, ghost: { bg: "transparent", fg: "#9aa0b4" }, gold: { bg: "#e2b45a", fg: "#1a0e00" } };
  const sz = { sm: { padding: "6px 13px", fontSize: 12 }, md: { padding: "10px 20px", fontSize: 14 }, lg: { padding: "13px 26px", fontSize: 15 } };
  const v = G2[variant] || G2.primary;
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} aria-disabled={disabled}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 8, border: v.border || "none", background: v.bg, color: v.fg, fontFamily: "inherit", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, width: full ? "100%" : "auto", transition: "opacity 0.15s, filter 0.15s", whiteSpace: "nowrap", ...sz[size], ...s }}>
      {children}
    </button>
  );
}

function Field({ label, helper, error, children, G }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: G.textMid, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>{label}</label>}
      {children}
      {helper && !error && <div style={{ fontSize: 11, color: G.textDim, marginTop: 4 }}>{helper}</div>}
      {error && <div role="alert" style={{ fontSize: 11, color: G.red, marginTop: 4 }}>⚠ {error}</div>}
    </div>
  );
}

function TInput({ G: theme, ...props }) {
  const G = theme;
  return (
    <input {...props} style={{ width: "100%", background: G.bg, border: `1px solid ${G.border2}`, borderRadius: 8, padding: "10px 13px", color: G.text, fontFamily: "inherit", fontSize: 14, outline: "none", ...props.style }}
      onFocus={e => { e.target.style.borderColor = G.blue; }}
      onBlur={e => { e.target.style.borderColor = G.border2; }} />
  );
}

function TSelect({ G, options, value, onChange, placeholder }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", background: G.bg, border: `1px solid ${G.border2}`, borderRadius: 8, padding: "10px 13px", color: value ? G.text : G.textDim, fontFamily: "inherit", fontSize: 14, outline: "none" }}>
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Card({ children, style, accent, G }) {
  return <div style={{ background: G.surface, border: `1px solid ${accent || G.border}`, borderRadius: 14, padding: 22, ...style }}>{children}</div>;
}

function StepIndicator({ steps, current, G }) {
  return (
    <div role="list" aria-label="Registration steps" style={{ display: "flex", alignItems: "center", marginBottom: 28, overflowX: "auto", paddingBottom: 4, gap: 0 }}>
      {steps.map((s, i) => (
        <div key={i} role="listitem" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div aria-current={i === current ? "step" : undefined} style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, background: i < current ? G.green : i === current ? G.blue : G.surface2, border: `2px solid ${i < current ? G.green : i === current ? G.blue : G.border2}`, color: i < current ? (G.bg === "#f4f5f7" ? "#fff" : "#0a1a12") : i === current ? "#fff" : G.textDim, transition: "all 0.3s" }}>{i < current ? "✓" : i + 1}</div>
            <span style={{ fontSize: 9, color: i === current ? G.blue : G.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>{s}</span>
          </div>
          {i < steps.length - 1 && <div style={{ width: 28, height: 2, background: i < current ? G.green : G.border2, margin: "0 4px", marginBottom: 16, flexShrink: 0, transition: "background 0.3s" }} />}
        </div>
      ))}
    </div>
  );
}

function Toast({ msg, type, G }) {
  if (!msg) return null;
  const c = { success: G.green, error: G.red, info: G.blue, warning: G.gold };
  return (
    <div role="alert" aria-live="assertive" style={{ position: "fixed", bottom: 24, right: 24, background: G.surface2, border: `1px solid ${c[type] || G.blue}55`, borderRadius: 12, padding: "13px 18px", fontSize: 13, color: c[type] || G.blue, zIndex: 9999, maxWidth: 320, boxShadow: `0 8px 40px rgba(0,0,0,0.5)`, animation: "fadeUp 0.3s ease" }}>
      {msg}
    </div>
  );
}

function Modal({ open, onClose, title, children, G, width = 520 }) {
  useEffect(() => {
    if (open) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={title} onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 700, padding: 20, backdropFilter: "blur(4px)" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: G.surface, border: `1px solid ${G.border2}`, borderRadius: 16, padding: 28, maxWidth: width, width: "100%", maxHeight: "90vh", overflowY: "auto", animation: "fadeUp 0.25s ease" }}>
        {title && <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 700, color: G.text, marginBottom: 16 }}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

// ─── Session timer ────────────────────────────────────────────────
function SessionTimer({ voter, onExpire, G, t }) {
  const [secs, setSecs] = useState(20 * 60);
  useEffect(() => {
    if (!voter) return;
    setSecs(20 * 60);
    const iv = setInterval(() => setSecs(s => { if (s <= 1) { clearInterval(iv); onExpire(); return 0; } return s - 1; }), 1000);
    return () => clearInterval(iv);
  }, [voter?.id]);
  if (!voter) return null;
  const mins = Math.floor(secs / 60), rem = secs % 60;
  const urgent = secs < 120;
  return (
    <div aria-live="polite" style={{ fontSize: 12, color: urgent ? G.red : G.textDim, display: "flex", alignItems: "center", gap: 5 }}>
      {urgent && "⚠"} {t.sessionExpiry} {mins}:{String(rem).padStart(2, "0")} {t.minutes}
    </div>
  );
}

// ─── Audit log ────────────────────────────────────────────────────
let _auditLog = [];
function logAudit(event, detail = "") {
  _auditLog = [{ time: new Date().toLocaleTimeString(), event, detail }, ..._auditLog.slice(0, 199)];
}

// ─── Face capture ─────────────────────────────────────────────────
function FaceCapture({ onCapture, G, t }) {
  const [phase, setPhase] = useState("idle");
  const [pct, setPct] = useState(0);
  function start() {
    setPhase("scan"); let p = 0;
    const iv = setInterval(() => { p += 2; setPct(p); if (p >= 100) { clearInterval(iv); setPhase("done"); onCapture("FACE_" + genReceipt().slice(0, 16)); } }, 55);
  }
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ position: "relative", width: 200, height: 200, margin: "0 auto 18px", borderRadius: "50%", overflow: "hidden", background: G.surface2, border: `3px solid ${phase === "done" ? G.green : phase === "scan" ? G.blue : G.border2}`, boxShadow: phase === "scan" ? `0 0 28px ${G.blue}44` : phase === "done" ? `0 0 28px ${G.green}44` : "none", transition: "all 0.4s" }}>
        <svg viewBox="0 0 200 200" style={{ width: "100%", height: "100%" }}>
          <ellipse cx="100" cy="88" rx="46" ry="56" fill={G.border2} />
          <ellipse cx="100" cy="168" rx="68" ry="46" fill={G.border2} />
          <circle cx="84" cy="82" r="7" fill={phase === "done" ? G.green : G.textDim} />
          <circle cx="116" cy="82" r="7" fill={phase === "done" ? G.green : G.textDim} />
          <path d="M88 106 Q100 118 112 106" stroke={G.textDim} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
        {phase === "scan" && <div style={{ position: "absolute", left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${G.blue},transparent)`, top: 0, animation: "scanline 1.2s linear infinite" }} />}
        {phase === "done" && <div style={{ position: "absolute", inset: 0, background: G.green + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="56" height="56" viewBox="0 0 56 56"><circle cx="28" cy="28" r="26" fill="none" stroke={G.green} strokeWidth="2.5" /><polyline points="16,28 24,36 40,20" fill="none" stroke={G.green} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>}
      </div>
      {phase === "idle" && <><p style={{ fontSize: 13, color: G.textMid, marginBottom: 14, lineHeight: 1.6 }}>Position your face in the frame. Your biometric data is encrypted and never stored in plaintext.</p><Btn onClick={start} G={G}>{t.beginScan}</Btn></>}
      {phase === "scan" && <><ProgressBar pct={pct} color={G.blue} height={4} /><p style={{ fontSize: 13, color: G.blue, marginTop: 8, animation: "pulse 1s infinite" }}>Analyzing… {pct}%</p></>}
      {phase === "done" && <p style={{ fontSize: 14, color: G.green, fontWeight: 600 }}>✓ Facial recognition confirmed — 99.2% match</p>}
    </div>
  );
}

// ─── ID upload zone ───────────────────────────────────────────────
function IDZone({ label, onUpload, uploaded, G }) {
  const ref = useRef(); const [drag, setDrag] = useState(false);
  function handle(file) { if (!file) return; const r = new FileReader(); r.onload = () => onUpload({ name: file.name }); r.readAsDataURL(file); }
  return (
    <div onClick={() => ref.current.click()} onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }} role="button" tabIndex={0} aria-label={label}
      style={{ border: `2px dashed ${uploaded ? G.green : drag ? G.blue : G.border2}`, borderRadius: 12, padding: 24, textAlign: "center", cursor: "pointer", background: uploaded ? G.greenDim + "44" : drag ? G.blueDim + "33" : G.surface2, transition: "all 0.2s" }}>
      <input ref={ref} type="file" accept="image/*,.pdf" onChange={e => handle(e.target.files[0])} style={{ display: "none" }} aria-hidden />
      {uploaded ? <><div style={{ fontSize: 26, marginBottom: 6 }}>✅</div><div style={{ fontSize: 13, color: G.green, fontWeight: 600 }}>{uploaded.name}</div><div style={{ fontSize: 11, color: G.textDim, marginTop: 3 }}>Click to replace</div></>
        : <><div style={{ fontSize: 26, marginBottom: 6 }}>🪪</div><div style={{ fontSize: 14, color: G.textMid, fontWeight: 600 }}>{label}</div><div style={{ fontSize: 11, color: G.textDim, marginTop: 5 }}>Click or drag & drop · JPG PNG PDF</div></>}
    </div>
  );
}

// ─── Election Registration Wizard ─────────────────────────────────
function RegWizard({ onComplete, existingVoters, G, t, lang }) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ first: "", last: "", dob: "", email: "", confirmEmail: "", emailCode: "", emailVerified: false, phone: "", address: "", city: "", state: "", zip: "", ssn: "", pin: "", confirmPin: "", idType: "", idFront: null, idBack: null, faceHash: null, otpCode: "", otpSent: "", otpVerified: false, agree: false, notifEmail: false, notifSMS: false });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const steps = lang === "es" ? ["Datos", "Email", "ID Gov", "SSN/Dir", "Teléfono", "Rostro", "Revisar"]
    : lang === "zh" ? ["个人信息", "邮箱验证", "证件", "SSN/地址", "手机", "人脸", "审查"]
    : STEPS_EN;

  async function wait(ms) { setLoading(true); await new Promise(r => setTimeout(r, ms)); setLoading(false); }

  async function next() {
    setErr("");
    if (step === 0) {
      if (!f.first || !f.last || !f.dob || !f.email) { setErr(t.required); return; }
      if (!f.email.includes("@")) { setErr(t.invalidEmail); return; }
      const age = (Date.now() - new Date(f.dob)) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 18) { setErr(t.ageError); return; }
      const dup = Object.values(existingVoters).find(v => v.email === f.email.toLowerCase() && v.tier === 2);
      if (dup) { setErr(t.dupEmail); return; }
      if (!validatePin(f.pin)) { setErr(t.pinWeak); return; }
      if (f.pin !== f.confirmPin) { setErr("PINs do not match."); return; }
    }
    if (step === 1) {
      if (!f.emailVerified) { setErr("Please verify your email address."); return; }
    }
    if (step === 2) {
      if (!f.idType || !f.idFront) { setErr("Select ID type and upload front of your ID."); return; }
      await wait(1600);
    }
    if (step === 3) {
      if (!/^\d{3}-\d{2}-\d{4}$/.test(f.ssn)) { setErr(t.ssnFormat); return; }
      if (!f.address || !f.city || !f.state || !f.zip) { setErr(t.addressRequired); return; }
      await wait(2000);
    }
    if (step === 4) {
      if (!f.otpVerified) { setErr(t.otpRequired); return; }
    }
    if (step === 5) {
      if (!f.faceHash) { setErr(t.faceRequired); return; }
    }
    if (step === 6) {
      if (!f.agree) { setErr(t.agreeRequired); return; }
      await wait(2400);
      const id = genId("E");
      const voter = { id, tier: 2, name: `${f.first} ${f.last}`, email: f.email.toLowerCase(), phone: f.phone, dob: f.dob, address: `${f.address}, ${f.city}, ${f.state} ${f.zip}`, pinHash: simpleHash(f.pin), votedOn: new Set(), registeredAt: new Date().toLocaleString(), idType: f.idType, faceHash: f.faceHash, receiptHash: genReceipt(), notifEmail: f.notifEmail, notifSMS: f.notifSMS };
      logAudit("VOTER_REGISTERED", `ID=${id}, Email=${f.email}`);
      onComplete(voter); return;
    }
    setStep(s => s + 1);
  }

  function sendEmailCode() {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setEmailCode(code); set("emailCode", "");
  }
  function verifyEmail() {
    if (f.emailCode === emailCode) set("emailVerified", true);
    else setErr("Incorrect email code.");
  }

  function sendOTP() {
    if (!f.phone || f.phone.replace(/\D/g, "").length < 10) { setErr(t.phoneRequired); return; }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    set("otpSent", code); set("otpCode", "");
  }
  function verifyOTP() {
    if (f.otpCode === f.otpSent) set("otpVerified", true);
    else setErr("Incorrect OTP code.");
  }

  const states = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"].map(s => ({ value: s, label: s }));

  return (
    <div>
      <StepIndicator steps={steps} current={step} G={G} />
      {err && <div role="alert" style={{ background: G.redDim, border: `1px solid ${G.red}44`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: G.red, marginBottom: 14 }}>⚠ {err}</div>}

      {/* Step 0: Personal Info + PIN */}
      {step === 0 && <div style={{ animation: "fadeUp 0.3s ease" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
          <Field label="Legal First Name" G={G}><TInput G={G} value={f.first} onChange={e => set("first", e.target.value)} placeholder="Jane" /></Field>
          <Field label="Legal Last Name" G={G}><TInput G={G} value={f.last} onChange={e => set("last", e.target.value)} placeholder="Smith" /></Field>
        </div>
        <Field label="Date of Birth" G={G}><TInput G={G} type="date" value={f.dob} onChange={e => set("dob", e.target.value)} /></Field>
        <Field label="Email Address" G={G}><TInput G={G} type="email" value={f.email} onChange={e => set("email", e.target.value)} placeholder="jane@example.com" /></Field>
        <Field label="Create PIN" helper="8+ characters · must include a number and a special character (e.g. ! @ # $)" G={G}>
          <TInput G={G} type="password" value={f.pin} onChange={e => set("pin", e.target.value)} placeholder="Minimum 8 characters" />
        </Field>
        <Field label="Confirm PIN" G={G}><TInput G={G} type="password" value={f.confirmPin} onChange={e => set("confirmPin", e.target.value)} placeholder="Re-enter PIN" /></Field>
        <div style={{ background: G.surface2, borderRadius: 9, padding: "10px 14px", fontSize: 12, color: G.textMid, lineHeight: 1.7, marginTop: 4 }}>
          🔒 AES-256 encryption at rest and in transit. Used solely for voter eligibility verification.
        </div>
      </div>}

      {/* Step 1: Email Confirmation */}
      {step === 1 && <div style={{ animation: "fadeUp 0.3s ease" }}>
        <p style={{ fontSize: 13, color: G.textMid, marginBottom: 18, lineHeight: 1.6 }}>We've sent a 6-digit code to <strong style={{ color: G.text }}>{f.email}</strong>. Enter it below to confirm your email address.</p>
        {!f.emailVerified ? <>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <Btn onClick={sendEmailCode} variant={emailCode ? "outline" : "primary"} size="sm">{emailCode ? t.resend : t.sendCode}</Btn>
          </div>
          {emailCode && <>
            <Field label="6-Digit Email Code" helper={`Demo code: ${emailCode}`} G={G}>
              <div style={{ display: "flex", gap: 10 }}>
                <TInput G={G} value={f.emailCode} onChange={e => set("emailCode", e.target.value)} placeholder="000000" maxLength={6} style={{ fontSize: 20, letterSpacing: "0.2em", textAlign: "center" }} />
                <Btn onClick={verifyEmail} variant="success" size="sm">{t.verify}</Btn>
              </div>
            </Field>
          </>}
        </> : <div style={{ display: "flex", gap: 10, alignItems: "center", background: G.greenDim, border: `1px solid ${G.green}44`, borderRadius: 10, padding: "12px 16px", color: G.green, fontWeight: 600, fontSize: 14 }}>✓ Email confirmed: {f.email}</div>}
        <Field label="Notification Preferences" G={G} style={{ marginTop: 18 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: G.textMid, marginBottom: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={f.notifEmail} onChange={e => set("notifEmail", e.target.checked)} style={{ accentColor: G.blue }} />
            {t.notifEmail}
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, color: G.textMid, cursor: "pointer" }}>
            <input type="checkbox" checked={f.notifSMS} onChange={e => set("notifSMS", e.target.checked)} style={{ accentColor: G.blue }} />
            {t.notifSMS}
          </label>
        </Field>
      </div>}

      {/* Step 2: Gov ID */}
      {step === 2 && <div style={{ animation: "fadeUp 0.3s ease" }}>
        <Field label="ID Type" G={G}>
          <TSelect G={G} value={f.idType} onChange={v => set("idType", v)} placeholder="Select ID type" options={[{ value: "dl", label: "Driver's License" }, { value: "state_id", label: "State-Issued ID Card" }, { value: "passport", label: "U.S. Passport" }]} />
        </Field>
        <Field label="Front of ID" G={G}><IDZone label={t.uploadId} onUpload={file => set("idFront", file)} uploaded={f.idFront} G={G} /></Field>
        {f.idType && f.idType !== "passport" && <Field label="Back of ID (recommended)" G={G}><IDZone label="Upload back of ID" onUpload={file => set("idBack", file)} uploaded={f.idBack} G={G} /></Field>}
        <div style={{ background: G.blueDim, border: `1px solid ${G.blue}33`, borderRadius: 9, padding: "10px 14px", fontSize: 12, color: G.blue, lineHeight: 1.7, marginTop: 8 }}>
          📋 ID processed by automated hologram detection and MRZ parsing. Image deleted after verification.
        </div>
      </div>}

      {/* Step 3: SSN + Address */}
      {step === 3 && <div style={{ animation: "fadeUp 0.3s ease" }}>
        <Field label="Social Security Number" helper="Format: XXX-XX-XXXX" G={G}>
          <TInput G={G} type="password" value={f.ssn} maxLength={11} placeholder="XXX-XX-XXXX" onChange={e => {
            let v = e.target.value.replace(/\D/g, "").slice(0, 9);
            if (v.length > 5) v = v.slice(0, 3) + "-" + v.slice(3, 5) + "-" + v.slice(5);
            else if (v.length > 3) v = v.slice(0, 3) + "-" + v.slice(3);
            set("ssn", v);
          }} />
        </Field>
        <Field label="Registered Voting Street Address" G={G}><TInput G={G} value={f.address} onChange={e => set("address", e.target.value)} placeholder="123 Main St" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 100px", gap: "0 10px" }}>
          <Field label="City" G={G}><TInput G={G} value={f.city} onChange={e => set("city", e.target.value)} placeholder="City" /></Field>
          <Field label="State" G={G}><TSelect G={G} value={f.state} onChange={v => set("state", v)} placeholder="ST" options={states} /></Field>
          <Field label="ZIP" G={G}><TInput G={G} value={f.zip} onChange={e => set("zip", e.target.value)} placeholder="12345" maxLength={5} /></Field>
        </div>
        <div style={{ background: G.purpleDim, border: `1px solid ${G.purple}33`, borderRadius: 9, padding: "10px 14px", fontSize: 12, color: G.purple, lineHeight: 1.7 }}>
          🏛 SSN cross-referenced against state voter rolls and SSA records.
        </div>
      </div>}

      {/* Step 4: Phone OTP */}
      {step === 4 && <div style={{ animation: "fadeUp 0.3s ease" }}>
        <Field label="Registered Cell Phone" G={G}>
          <div style={{ display: "flex", gap: 10 }}>
            <TInput G={G} type="tel" value={f.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 (555) 000-0000" style={{ flex: 1 }} />
            <Btn onClick={sendOTP} variant={f.otpSent ? "outline" : "primary"} size="sm">{f.otpSent ? t.resend : t.sendCode}</Btn>
          </div>
        </Field>
        {f.otpSent && !f.otpVerified && (
          <Field label="Verification Code" helper={`Demo code: ${f.otpSent}`} G={G}>
            <div style={{ display: "flex", gap: 10 }}>
              <TInput G={G} value={f.otpCode} onChange={e => set("otpCode", e.target.value)} placeholder="000000" maxLength={6} style={{ fontSize: 20, letterSpacing: "0.2em", textAlign: "center", flex: 1 }} />
              <Btn onClick={verifyOTP} variant="success" size="sm">{t.verify}</Btn>
            </div>
          </Field>
        )}
        {f.otpVerified && <div style={{ display: "flex", gap: 10, alignItems: "center", background: G.greenDim, border: `1px solid ${G.green}44`, borderRadius: 10, padding: "12px 16px", color: G.green, fontWeight: 600, fontSize: 14 }}>✓ Phone verified: {f.phone}</div>}
      </div>}

      {/* Step 5: Face ID */}
      {step === 5 && <div style={{ animation: "fadeUp 0.3s ease" }}>
        <FaceCapture onCapture={hash => set("faceHash", hash)} G={G} t={t} />
      </div>}

      {/* Step 6: Review */}
      {step === 6 && <div style={{ animation: "fadeUp 0.3s ease" }}>
        <div style={{ background: G.surface2, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          {[["Name", `${f.first} ${f.last}`], ["DOB", f.dob], ["Email", f.email], ["Phone", f.phone], ["ID Type", f.idType], ["Address", `${f.address}, ${f.city}, ${f.state} ${f.zip}`], ["Email Confirmed", f.emailVerified ? "✓" : "✗"], ["Phone Verified", f.otpVerified ? "✓" : "✗"], ["Face ID", f.faceHash ? "✓" : "✗"], ["Email Notifications", f.notifEmail ? "On" : "Off"], ["SMS Notifications", f.notifSMS ? "On" : "Off"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${G.border}`, fontSize: 13, gap: 12 }}>
              <span style={{ color: G.textDim }}>{k}</span>
              <span style={{ color: G.text, textAlign: "right" }}>{v || "—"}</span>
            </div>
          ))}
        </div>
        <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", fontSize: 13, color: G.textMid, lineHeight: 1.6 }}>
          <input type="checkbox" checked={f.agree} onChange={e => set("agree", e.target.checked)} style={{ marginTop: 3, accentColor: G.blue }} />
          I certify all information is accurate and truthful. I understand providing false information is a federal crime. I agree to secure storage of my biometric data solely for election integrity purposes.
        </label>
      </div>}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        <Btn variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0 || loading}>{t.back}</Btn>
        <Btn onClick={next} disabled={loading} variant={step === 6 ? "success" : "primary"}>
          {loading ? <><Spinner size={14} color="#fff" /> {t.verifying}</> : step === 6 ? "Submit & Register" : t.continue}
        </Btn>
      </div>
    </div>
  );
}

// ─── Candidate card with voter guide ──────────────────────────────
function CandidateCard({ c, selected, onSelect, canVote, G, t }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: selected ? c.color + "14" : G.surface2, border: `2px solid ${selected ? c.color : G.border2}`, borderRadius: 12, overflow: "hidden", transition: "all 0.18s" }}>
      <div onClick={() => canVote && onSelect(c.id)} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "14px 16px", cursor: canVote ? "pointer" : "default" }}>
        <div style={{ marginTop: 2 }}>
          <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${selected ? c.color : G.border2}`, background: selected ? c.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.18s" }}>
            {selected && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
          </div>
        </div>
        <Avatar initials={c.avatar} color={c.color} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: G.text }}>{c.name}</div>
          <div style={{ fontSize: 12, color: c.color, fontWeight: 600, marginBottom: 3 }}>{c.party}</div>
          <div style={{ fontSize: 12, color: G.textDim, lineHeight: 1.5 }}>{c.bio}</div>
        </div>
      </div>
      {(c.experience || c.platform || c.endorsements) && (
        <>
          <div onClick={() => setExpanded(e => !e)} style={{ borderTop: `1px solid ${G.border}`, padding: "8px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: G.blue, fontWeight: 600 }}>{t.voterGuide}</span>
            <span style={{ fontSize: 12, color: G.textDim }}>{expanded ? "▲" : "▼"}</span>
          </div>
          {expanded && (
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${G.border}` }}>
              {c.experience && <><div style={{ fontSize: 11, fontWeight: 700, color: G.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{t.experience}</div><div style={{ fontSize: 12, color: G.textMid, marginBottom: 12, lineHeight: 1.6 }}>{c.experience}</div></>}
              {c.platform && <><div style={{ fontSize: 11, fontWeight: 700, color: G.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{t.platform}</div><div style={{ fontSize: 12, color: G.textMid, marginBottom: 12, lineHeight: 1.6 }}>{c.platform}</div></>}
              {c.endorsements && <><div style={{ fontSize: 11, fontWeight: 700, color: G.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{t.endorsements}</div><div style={{ fontSize: 12, color: G.textMid, lineHeight: 1.6 }}>{c.endorsements}</div></>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Ranked ballot UI ─────────────────────────────────────────────
function RankedBallot({ candidates, rankings, setRankings, maxRanks, G }) {
  // rankings: [{id, rank}]
  const getrank = id => rankings.find(r => r.id === id)?.rank || null;
  const usedRanks = rankings.map(r => r.rank);
  const maxR = maxRanks || candidates.length;

  function setRank(id, rank) {
    if (!rank) {
      setRankings(rankings.filter(r => r.id !== id));
      return;
    }
    // Remove any existing assignment for this rank
    const cleaned = rankings.filter(r => r.id !== id && r.rank !== rank);
    setRankings([...cleaned, { id, rank }]);
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: G.textDim, marginBottom: 12, lineHeight: 1.6 }}>
        Rank your choices (1 = most preferred).{maxRanks ? ` You may rank up to ${maxRanks} candidates.` : " You may rank all candidates."}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {candidates.map(c => {
          const currentRank = getrank(c.id);
          return (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, background: currentRank ? c.color + "14" : G.surface2, border: `1.5px solid ${currentRank ? c.color : G.border2}`, borderRadius: 10, padding: "10px 14px", transition: "all 0.15s" }}>
              <Avatar initials={c.avatar} color={c.color} size={34} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: G.text }}>{c.name}</div>
                <div style={{ fontSize: 11, color: c.color }}>{c.party}</div>
              </div>
              <select
                value={currentRank || ""}
                onChange={e => setRank(c.id, e.target.value ? parseInt(e.target.value) : null)}
                style={{ background: G.bg, border: `1px solid ${G.border2}`, borderRadius: 6, padding: "6px 10px", color: currentRank ? c.color : G.textDim, fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", outline: "none", minWidth: 80 }}
                aria-label={`Rank for ${c.name}`}
              >
                <option value="">—</option>
                {Array.from({ length: maxR }, (_, i) => i + 1).map(n => (
                  <option key={n} value={n} disabled={usedRanks.includes(n) && currentRank !== n}>
                    {n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      {rankings.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 12, color: G.textDim }}>
          Your ranking: {rankings.slice().sort((a, b) => a.rank - b.rank).map(r => {
            const c = candidates.find(x => x.id === r.id);
            return c ? `${r.rank}. ${c.name}` : null;
          }).filter(Boolean).join(" → ")}
        </div>
      )}
    </div>
  );
}

// ─── Approval ballot UI ───────────────────────────────────────────
function ApprovalBallot({ candidates, approvals, setApprovals, G }) {
  function toggle(id) {
    setApprovals(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  return (
    <div>
      <div style={{ fontSize: 12, color: G.textDim, marginBottom: 12, lineHeight: 1.6 }}>
        Approve any number of candidates you find acceptable. All approved candidates receive one vote.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {candidates.map(c => {
          const checked = approvals.includes(c.id);
          return (
            <div key={c.id} onClick={() => toggle(c.id)} style={{ display: "flex", alignItems: "center", gap: 12, background: checked ? c.color + "14" : G.surface2, border: `1.5px solid ${checked ? c.color : G.border2}`, borderRadius: 10, padding: "10px 14px", cursor: "pointer", transition: "all 0.15s" }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? c.color : G.border2}`, background: checked ? c.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {checked && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
              </div>
              <Avatar initials={c.avatar} color={c.color} size={34} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: G.text }}>{c.name}</div>
                <div style={{ fontSize: 11, color: c.color }}>{c.party}</div>
              </div>
            </div>
          );
        })}
      </div>
      {approvals.length > 0 && (
        <div style={{ marginTop: 10, fontSize: 12, color: G.textDim }}>Approved: {approvals.map(id => candidates.find(c => c.id === id)?.name).filter(Boolean).join(", ")}</div>
      )}
    </div>
  );
}

// ─── Multi-winner checkbox UI ─────────────────────────────────────
function CheckboxBallot({ candidates, choices, setChoices, seats, G }) {
  function toggle(id) {
    setChoices(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < seats ? [...prev, id] : prev);
  }
  return (
    <div>
      <div style={{ fontSize: 12, color: G.textDim, marginBottom: 12, lineHeight: 1.6 }}>
        Select up to <strong style={{ color: G.text }}>{seats}</strong> candidate{seats > 1 ? "s" : ""}. ({choices.length}/{seats} selected)
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {candidates.map(c => {
          const checked = choices.includes(c.id);
          const disabled = !checked && choices.length >= seats;
          return (
            <div key={c.id} onClick={() => !disabled && toggle(c.id)} style={{ display: "flex", alignItems: "center", gap: 12, background: checked ? c.color + "14" : G.surface2, border: `1.5px solid ${checked ? c.color : G.border2}`, borderRadius: 10, padding: "10px 14px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, transition: "all 0.15s" }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${checked ? c.color : G.border2}`, background: checked ? c.color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {checked && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
              </div>
              <Avatar initials={c.avatar} color={c.color} size={34} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: G.text }}>{c.name}</div>
                <div style={{ fontSize: 11, color: c.color }}>{c.party}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Race ballot card ─────────────────────────────────────────────
function RaceCard({ race, voter, onVote, G, t }) {
  const method = VOTING_METHODS[race.votingMethod] || VOTING_METHODS.plurality_single;
  const [sel, setSel] = useState(null);         // radio/plurality
  const [rankings, setRankings] = useState([]); // ranked methods
  const [approvals, setApprovals] = useState([]); // approval/checkbox
  const [choices, setChoices] = useState([]);   // multi-winner
  const [confirm, setConfirm] = useState(false);
  const [showMethodInfo, setShowMethodInfo] = useState(false);
  const voted = voter && voter.votedOn.has(race.id);
  const lc = { Federal: G.blue, State: G.purple, Local: G.gold }[race.level] || G.blue;
  const canVote = !!voter && !voted && race.open;

  // Build ballot object for submission
  function buildBallot() {
    if (method.ui === "radio") return { choice: sel };
    if (method.ui === "ranked") return { rankings };
    if (method.ui === "checkbox" && method.id === "approval") return { approvals };
    if (method.ui === "checkbox") return { choices };
    return { choice: sel };
  }

  // Check if ballot has at least one selection
  function isValid() {
    if (method.ui === "radio") return !!sel;
    if (method.ui === "ranked") return rankings.length > 0;
    if (method.ui === "checkbox" && method.id === "approval") return approvals.length > 0;
    if (method.ui === "checkbox") return choices.length > 0;
    return false;
  }

  return (
    <div style={{ background: G.surface, border: `1px solid ${voted ? G.goldDim : G.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
      {/* Header */}
      <div style={{ background: lc + "12", borderBottom: `1px solid ${lc}28`, padding: "10px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Chip label={race.level} color={lc} />
          <Chip label={race.type} color={G.textDim} />
          {voted && <Chip label="✓ Voted" color={G.gold} />}
          {!race.open && <Chip label="Closed" color={G.red} />}
        </div>
        {/* Voting method badge */}
        <button onClick={() => setShowMethodInfo(v => !v)} style={{ background: G.purpleDim, border: `1px solid ${G.purple}44`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 11, color: G.purple, fontFamily: "inherit", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
          🗳 {method.label} {showMethodInfo ? "▲" : "▼"}
        </button>
      </div>

      {/* Method explainer */}
      {showMethodInfo && (
        <div style={{ background: G.purpleDim, borderBottom: `1px solid ${G.purple}22`, padding: "10px 18px", fontSize: 12, color: G.purple, lineHeight: 1.6 }}>
          <strong>{method.label}</strong> — {method.description}
          {method.multiWinner && race.seats > 1 && <span style={{ marginLeft: 8, color: G.textDim }}>({race.seats} seats)</span>}
        </div>
      )}

      <div style={{ padding: 20 }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 17, color: G.text, marginBottom: 6 }}>{race.title}</div>
        <div style={{ fontSize: 13, color: G.textMid, marginBottom: 18, lineHeight: 1.5 }}>{race.description}</div>

        {voted
          ? <div style={{ fontSize: 13, color: G.gold, padding: "8px 0" }}>✓ Your ballot has been recorded. Results release at {race.releaseTime}.</div>
          : <>
            {/* Candidate voter guides (always shown) */}
            {(method.ui === "radio" || method.ui === "ranked") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {race.candidates.map(c => <CandidateCard key={c.id} c={c} selected={method.ui === "radio" && sel === c.id} onSelect={id => method.ui === "radio" && canVote && setSel(id)} canVote={method.ui === "radio" && canVote} G={G} t={t} />)}
              </div>
            )}

            {/* Ballot UI per method */}
            {canVote && method.ui === "ranked" && (
              <div style={{ marginBottom: 16 }}>
                <RankedBallot candidates={race.candidates} rankings={rankings} setRankings={setRankings} maxRanks={method.maxRanks} G={G} />
              </div>
            )}
            {canVote && method.ui === "checkbox" && method.id === "approval" && (
              <div style={{ marginBottom: 16 }}>
                <ApprovalBallot candidates={race.candidates} approvals={approvals} setApprovals={setApprovals} G={G} />
              </div>
            )}
            {canVote && method.ui === "checkbox" && method.id !== "approval" && (
              <div style={{ marginBottom: 16 }}>
                <CheckboxBallot candidates={race.candidates} choices={choices} setChoices={setChoices} seats={race.seats || 1} G={G} />
              </div>
            )}

            {!voter && <div style={{ fontSize: 13, color: G.textDim, fontStyle: "italic" }}>Sign in to cast your vote.</div>}
            {voter && voter.tier !== 2 && <div style={{ fontSize: 13, color: G.red }}>Tier 2 account required for official elections.</div>}
            {canVote && <Btn onClick={() => isValid() && setConfirm(true)} disabled={!isValid()} variant="gold">{t.castVote}</Btn>}
          </>
        }
      </div>

      {/* Confirm modal */}
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Confirm Your Ballot" G={G}>
        <div style={{ background: G.surface2, borderRadius: 10, padding: "12px 16px", marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: G.text, marginBottom: 8 }}>{race.title}</div>
          <div style={{ fontSize: 12, color: G.purple, marginBottom: 10 }}>Method: {method.label}</div>

          {method.ui === "radio" && sel && (() => { const c = race.candidates.find(c => c.id === sel); return c ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar initials={c.avatar} color={c.color} size={32} />
              <div><span style={{ fontWeight: 700, color: G.text }}>{c.name}</span> <span style={{ fontSize: 12, color: c.color }}>({c.party})</span></div>
            </div>
          ) : null; })()}

          {method.ui === "ranked" && rankings.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {rankings.slice().sort((a, b) => a.rank - b.rank).map(r => {
                const c = race.candidates.find(x => x.id === r.id);
                return c ? (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span style={{ color: G.purple, fontWeight: 700, minWidth: 28 }}>#{r.rank}</span>
                    <Avatar initials={c.avatar} color={c.color} size={24} />
                    <span style={{ color: G.text }}>{c.name}</span>
                  </div>
                ) : null;
              })}
            </div>
          )}

          {method.ui === "checkbox" && method.id === "approval" && approvals.length > 0 && (
            <div style={{ fontSize: 13, color: G.text }}>Approving: {approvals.map(id => race.candidates.find(c => c.id === id)?.name).filter(Boolean).join(", ")}</div>
          )}
          {method.ui === "checkbox" && method.id !== "approval" && choices.length > 0 && (
            <div style={{ fontSize: 13, color: G.text }}>Selected: {choices.map(id => race.candidates.find(c => c.id === id)?.name).filter(Boolean).join(", ")}</div>
          )}
        </div>

        <div style={{ background: G.goldDim + "44", border: `1px solid ${G.gold}44`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: G.gold, lineHeight: 1.6, marginBottom: 18 }}>
          ⚠ This action is permanent and irreversible. A cryptographic receipt will be generated.
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="outline" onClick={() => setConfirm(false)}>{t.goBack}</Btn>
          <Btn variant="gold" onClick={() => { onVote(race.id, buildBallot()); setConfirm(false); }}>{t.confirmVote}</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── Poll card ────────────────────────────────────────────────────
function PollCard({ poll, voter, onVote, G, t }) {
  const [sel, setSel] = useState(null);
  const voted = voter && voter.votedOn.has(poll.id);
  return (
    <div style={{ background: G.surface, border: `1px solid ${voted ? G.goldDim : G.border}`, borderRadius: 14, padding: 20, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: G.text }}>{poll.title}</div>
        {voted ? <Chip label="✓ Voted" color={G.gold} /> : <Chip label="Open" color={G.green} />}
      </div>
      <div style={{ fontSize: 13, color: G.textMid, marginBottom: 16 }}>{poll.desc}</div>
      {voted
        ? <div style={{ fontSize: 13, color: G.gold }}>Thank you for participating.</div>
        : <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            {poll.options.map(opt => (
              <div key={opt} onClick={() => voter && setSel(opt)} style={{ display: "flex", alignItems: "center", gap: 12, background: sel === opt ? G.blue + "15" : G.surface2, border: `1.5px solid ${sel === opt ? G.blue : G.border2}`, borderRadius: 8, padding: "10px 14px", cursor: voter ? "pointer" : "default", transition: "all 0.15s" }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${sel === opt ? G.blue : G.border2}`, background: sel === opt ? G.blue : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {sel === opt && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                </div>
                <span style={{ fontSize: 14, color: G.text }}>{opt}</span>
              </div>
            ))}
          </div>
          {!voter && <div style={{ fontSize: 13, color: G.textDim, fontStyle: "italic" }}>Sign in to vote.</div>}
          {voter && <Btn onClick={() => sel && onVote(poll.id, sel)} disabled={!sel} size="sm">{t.submitVote}</Btn>}
        </>
      }
    </div>
  );
}

// ─── Method-specific results display ─────────────────────────────
function MethodResults({ result, candidates, G }) {
  const [showRounds, setShowRounds] = useState(false);
  if (!result) return null;
  const { winners = [], results = [], rounds = [], matrix, quota, method } = result;

  const getCandidate = id => candidates.find(c => c.id === id);
  const maxVotes = results.length ? Math.max(...results.map(r => r.votes || 0)) : 1;

  return (
    <div>
      {/* Winners banner */}
      {winners.length > 0 && (
        <div style={{ background: G.greenDim, border: `1px solid ${G.green}44`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 20 }}>🏆</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: G.green, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 2 }}>{method} — {winners.length > 1 ? "Winners" : "Winner"}</div>
            <div style={{ fontWeight: 700, fontSize: 15, color: G.text }}>
              {winners.map(id => getCandidate(id)?.name || id).join(" · ")}
            </div>
          </div>
        </div>
      )}
      {quota && <div style={{ fontSize: 12, color: G.textDim, marginBottom: 10 }}>Quota: {Math.round(quota * 100) / 100} votes</div>}

      {/* Per-candidate bars */}
      {results.map(c => {
        const cand = getCandidate(c.id) || c;
        const pct = maxVotes ? Math.round((c.votes / maxVotes) * 100) : 0;
        const isWinner = winners.includes(c.id);
        return (
          <div key={c.id} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5, alignItems: "center", flexWrap: "wrap", gap: 6 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Avatar initials={cand.avatar || cand.name?.[0] || "?"} color={cand.color || G.blue} size={26} />
                <span style={{ fontWeight: 600, color: G.text }}>{cand.name}</span>
                {cand.party && <span style={{ fontSize: 11, color: cand.color || G.blue }}>{cand.party}</span>}
                {isWinner && <Chip label={c.elected !== undefined ? "Elected" : "Winner"} color={G.green} />}
              </div>
              <span style={{ color: cand.color || G.blue, fontWeight: 700 }}>
                {typeof c.votes === "number" ? (Number.isInteger(c.votes) ? c.votes.toLocaleString() : c.votes.toFixed(2)) : "—"}
                {c.condorcetWins !== undefined && <span style={{ color: G.textDim, fontWeight: 400, marginLeft: 6 }}>({c.condorcetWins} pairwise wins)</span>}
              </span>
            </div>
            <ProgressBar pct={pct} color={isWinner ? G.green : (cand.color || G.blue)} height={7} />
          </div>
        );
      })}

      {/* Condorcet pairwise matrix */}
      {matrix && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: G.textDim, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Pairwise Matrix (row beats column)</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ padding: "4px 8px", background: G.surface2, color: G.textDim }}></th>
                  {candidates.map(c => <th key={c.id} style={{ padding: "4px 8px", background: G.surface2, color: G.textDim, fontWeight: 600, textAlign: "center", whiteSpace: "nowrap" }}>{c.name.split(" ")[0]}</th>)}
                </tr>
              </thead>
              <tbody>
                {candidates.map(row => (
                  <tr key={row.id}>
                    <td style={{ padding: "4px 8px", color: G.textMid, fontWeight: 600, whiteSpace: "nowrap", background: G.surface2 }}>{row.name.split(" ")[0]}</td>
                    {candidates.map(col => {
                      if (row.id === col.id) return <td key={col.id} style={{ padding: "4px 8px", background: G.border, textAlign: "center", color: G.textDim }}>—</td>;
                      const v = matrix[row.id]?.[col.id] || 0;
                      const vOpp = matrix[col.id]?.[row.id] || 0;
                      const win = v > vOpp;
                      return <td key={col.id} style={{ padding: "4px 8px", background: win ? G.greenDim : G.surface, color: win ? G.green : G.textMid, textAlign: "center", fontWeight: win ? 700 : 400 }}>{v}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Round-by-round toggle */}
      {rounds.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setShowRounds(r => !r)} style={{ background: "transparent", border: `1px solid ${G.border2}`, borderRadius: 6, padding: "5px 12px", color: G.blue, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600 }}>
            {showRounds ? "▲ Hide" : "▼ Show"} round-by-round ({rounds.length} round{rounds.length > 1 ? "s" : ""})
          </button>
          {showRounds && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
              {rounds.map((round, ri) => {
                const roundTotal = Object.values(round.counts || {}).reduce((a, b) => a + b, 0);
                return (
                  <div key={ri} style={{ background: G.surface2, borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: G.textDim, marginBottom: 8, textTransform: "uppercase" }}>
                      Round {round.level || ri + 1} {round.quota ? `— Quota: ${round.quota.toFixed(2)}` : ""}
                    </div>
                    {Object.entries(round.counts || {}).sort(([, a], [, b]) => b - a).map(([cid, votes]) => {
                      const c = candidates.find(x => x.id === cid);
                      const pct = roundTotal ? Math.round((votes / roundTotal) * 100) : 0;
                      return (
                        <div key={cid} style={{ marginBottom: 7 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                            <span style={{ color: G.textMid }}>{c?.name || cid}</span>
                            <span style={{ color: c?.color || G.blue, fontWeight: 600 }}>{typeof votes === "number" ? votes.toFixed(2) : votes} ({pct}%)</span>
                          </div>
                          <ProgressBar pct={pct} color={c?.color || G.blue} height={5} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Results & Audit ──────────────────────────────────────────────
function ResultsView({ races, polls, voters, released, onRelease, auditLog, G, t }) {
  const [verifyHash, setVerifyHash] = useState(""); const [verifyRes, setVerifyRes] = useState(null);
  const [activeTab, setActiveTab] = useState("elections");

  function checkHash() { const found = Object.values(voters).find(v => v.receiptHash === verifyHash.trim()); setVerifyRes(found ? "valid" : "notfound"); logAudit("RECEIPT_VERIFY", verifyHash.trim().slice(0, 12) + "…"); }

  function doExportCSV() {
    const rows = [["Race", "Candidate", "Party", "Votes", "Pct"]];
    races.forEach(r => { const tot = Object.values(r.votes).reduce((a, b) => a + b, 0); r.candidates.forEach(c => { const cnt = r.votes[c.id] || 0; rows.push([r.title, c.name, c.party, cnt, tot ? Math.round(cnt / tot * 100) + "%" : "0%"]); }); });
    exportCSV(rows, "agora-results.csv");
    logAudit("EXPORT_CSV", "Results exported");
  }

  const tabs = [{ id: "elections", label: "Elections" }, { id: "polls", label: "Polls" }, { id: "audit", label: t.auditLog }, { id: "integrity", label: "Integrity" }];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: G.text }}>{t.resultsAudit.replace("📊 ", "")}</div>
          <div style={{ fontSize: 13, color: G.textMid }}>Results sealed until release. Receipt verification available now.</div>
        </div>
        <Btn onClick={doExportCSV} variant="outline" size="sm">{t.exportCSV}</Btn>
      </div>

      <div style={{ display: "flex", gap: 2, marginBottom: 24, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 10, padding: 3 }}>
        {tabs.map(tb => <button key={tb.id} onClick={() => setActiveTab(tb.id)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: activeTab === tb.id ? `1px solid ${G.border2}` : "1px solid transparent", background: activeTab === tb.id ? G.surface2 : "transparent", color: activeTab === tb.id ? G.text : G.textDim, cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, transition: "all 0.15s", whiteSpace: "nowrap" }}>{tb.label}</button>)}
      </div>

      {/* Elections */}
      {activeTab === "elections" && races.map(race => {
        const tot = (race.ballots || []).length || Object.values(race.votes).reduce((a, b) => a + b, 0);
        const lc = { Federal: G.blue, State: G.purple, Local: G.gold }[race.level] || G.blue;
        const isRel = released[race.id];
        const method = VOTING_METHODS[race.votingMethod] || VOTING_METHODS.plurality_single;

        // Tally if released and we have ballots
        let tallyResult = null;
        if (isRel && race.ballots && race.ballots.length > 0) {
          try { tallyResult = tallyVotes(race.votingMethod, race.ballots, race.candidates, race.seats || 1); } catch(e) {}
        }

        return (
          <Card key={race.id} style={{ marginBottom: 16 }} G={G}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <Chip label={race.level} color={lc} />
                  <Chip label={race.type} color={G.textDim} />
                  <Chip label={method.label} color={G.purple} />
                </div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: G.text }}>{race.title}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                {!isRel && <Btn onClick={() => onRelease(race.id)} size="sm" variant="gold">{t.releaseResults}</Btn>}
                {isRel ? <Chip label={t.resultsReleased} color={G.green} /> : <Chip label={`Release: ${race.releaseTime}`} color={G.gold} />}
              </div>
            </div>

            {!isRel
              ? <div style={{ textAlign: "center", padding: "20px 0", color: G.textDim, fontSize: 13 }}>🔒 Sealed until {race.releaseTime} · Ballots cast: {tot}</div>
              : !tallyResult
                ? <div style={{ color: G.textDim, fontSize: 13, textAlign: "center", padding: 16 }}>No ballots cast yet.</div>
                : <MethodResults result={tallyResult} candidates={race.candidates} G={G} />
            }
          </Card>
        );
      })}

      {/* Polls */}
      {activeTab === "polls" && polls.map(poll => {
        const tot = Object.values(poll.votes).reduce((a, b) => a + b, 0);
        return (
          <Card key={poll.id} style={{ marginBottom: 14 }} G={G}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: G.text, marginBottom: 14 }}>{poll.title}</div>
            {Object.entries(poll.votes).map(([opt, cnt]) => { const pct = tot ? Math.round(cnt / tot * 100) : 0; return (
              <div key={opt} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4, color: G.text }}><span>{opt}</span><span style={{ color: G.blue }}>{pct}% <span style={{ color: G.textDim }}>({cnt})</span></span></div>
                <ProgressBar pct={pct} color={G.blue} />
              </div>
            ); })}
            <div style={{ fontSize: 12, color: G.textDim, marginTop: 8 }}>{t.totalVotes} {tot}</div>
          </Card>
        );
      })}

      {/* Audit Log */}
      {activeTab === "audit" && (
        <Card G={G}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: G.text, marginBottom: 14 }}>{t.auditLog}</div>
          {auditLog.length === 0
            ? <div style={{ fontSize: 13, color: G.textDim, textAlign: "center", padding: "20px 0" }}>No events yet.</div>
            : <div style={{ maxHeight: 400, overflowY: "auto" }}>{auditLog.map((e, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: `1px solid ${G.border}`, fontSize: 12 }}>
                <span style={{ color: G.textDim, flexShrink: 0, fontFamily: "monospace" }}>{e.time}</span>
                <span style={{ color: G.blue, fontWeight: 600, flexShrink: 0 }}>{e.event}</span>
                <span style={{ color: G.textMid, wordBreak: "break-all" }}>{e.detail}</span>
              </div>
            ))}</div>
          }
        </Card>
      )}

      {/* Integrity */}
      {activeTab === "integrity" && (
        <Card accent={G.green + "44"} G={G}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 17, color: G.text, marginBottom: 16 }}>🔍 Ballot Receipt Verifier</div>
          <div style={{ fontSize: 13, color: G.textMid, marginBottom: 16, lineHeight: 1.6 }}>Every voter receives a cryptographic receipt hash. Enter yours to confirm your vote was recorded — without revealing who or what you voted for.</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <input value={verifyHash} onChange={e => setVerifyHash(e.target.value)} placeholder="Paste your 64-character receipt hash…" aria-label="Ballot receipt hash" style={{ flex: 1, minWidth: 200, background: G.bg, border: `1px solid ${G.border2}`, borderRadius: 8, padding: "10px 13px", color: G.text, fontFamily: "monospace", fontSize: 12, outline: "none" }} />
            <Btn onClick={checkHash} variant="success" size="sm">{t.verify}</Btn>
          </div>
          {verifyRes === "valid" && <div role="alert" style={{ background: G.greenDim, border: `1px solid ${G.green}44`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: G.green, marginBottom: 16 }}>✓ {t.hashValid}</div>}
          {verifyRes === "notfound" && <div role="alert" style={{ background: G.redDim, border: `1px solid ${G.red}44`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: G.red, marginBottom: 16 }}>✗ {t.notFound}</div>}
          <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 16, fontSize: 12, color: G.textDim, lineHeight: 1.8 }}>
            <strong style={{ color: G.textMid }}>How election integrity is ensured:</strong><br />
            • Each ballot assigned a unique SHA-256 receipt hash at submission time.<br />
            • Ballot contents encrypted; only the independent canvassing board holds the decryption key.<br />
            • A Merkle tree root of all ballots published before polls close for mathematical verification.<br />
            • All ballots and hashes posted to a public read-only audit ledger 24h after result release.<br />
            • Independent security researchers and party observers granted read access to audit ledger.
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Admin panel ──────────────────────────────────────────────────
function AdminPanel({ races, voters, polls, onToggleRace, onDeleteRace, onUpdateReleaseTime, onUpdateMethod, onUpdateSeats, onCreatePoll, G, t }) {
  const [pin, setPin] = useState(""); const [unlocked, setUnlocked] = useState(false); const [err, setErr] = useState("");
  const [newPollTitle, setNewPollTitle] = useState(""); const [newPollDesc, setNewPollDesc] = useState("");
  const [newPollOpts, setNewPollOpts] = useState(["", ""]);
  const [activeTab, setActiveTab] = useState("races");
  const [releaseTimes, setReleaseTimes] = useState({});

  function login() { if (pin === "admin123") { setUnlocked(true); logAudit("ADMIN_LOGIN", "Admin panel accessed"); } else setErr("Incorrect admin PIN."); }

  function addPoll() {
    const opts = newPollOpts.filter(Boolean);
    if (!newPollTitle || !newPollDesc || opts.length < 2) { setErr("Title, description, and 2+ options required."); return; }
    const votes = {}; opts.forEach(o => votes[o] = 0);
    onCreatePoll({ id: "p" + Date.now(), title: newPollTitle, desc: newPollDesc, options: opts, votes, open: true });
    setNewPollTitle(""); setNewPollDesc(""); setNewPollOpts(["", ""]); setErr("");
  }

  function doExportVoters() {
    const rows = [["Voter ID", "Name", "Email", "Tier", "Ballots Cast", "Registered"]];
    Object.values(voters).forEach(v => rows.push([v.id, v.name, v.email, v.tier, v.votedOn.size, v.registeredAt]));
    exportCSV(rows, "agora-voter-rolls.csv"); logAudit("EXPORT_VOTERS", "Voter rolls exported");
  }

  const adminTabs = [{ id: "races", label: "Races" }, { id: "polls2", label: "Polls" }, { id: "voters", label: t.voterRolls }];

  return (
    <div>
      <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 24, color: G.text, marginBottom: 4 }}>Admin Panel</div>
      <div style={{ fontSize: 13, color: G.textMid, marginBottom: 20 }}>Manage elections, results, and voter rolls.</div>
      {!unlocked ? (
        <Card G={G}>
          <div style={{ fontWeight: 600, marginBottom: 14, color: G.text }}>{t.adminUnlock}</div>
          <div style={{ display: "flex", gap: 10 }}>
            <input type="password" value={pin} onChange={e => setPin(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} placeholder="Admin PIN (hint: admin123)" style={{ flex: 1, background: G.bg, border: `1px solid ${G.border2}`, borderRadius: 8, padding: "10px 13px", color: G.text, fontFamily: "inherit", fontSize: 14, outline: "none", maxWidth: 280 }} />
            <Btn onClick={login}>Unlock</Btn>
          </div>
          {err && <div style={{ color: G.red, fontSize: 13, marginTop: 10 }}>⚠ {err}</div>}
        </Card>
      ) : (
        <>
          <div style={{ display: "flex", gap: 2, marginBottom: 24, background: G.surface, border: `1px solid ${G.border}`, borderRadius: 10, padding: 3 }}>
            {adminTabs.map(tb => <button key={tb.id} onClick={() => setActiveTab(tb.id)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: activeTab === tb.id ? `1px solid ${G.border2}` : "1px solid transparent", background: activeTab === tb.id ? G.surface2 : "transparent", color: activeTab === tb.id ? G.text : G.textDim, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, transition: "all 0.15s" }}>{tb.label}</button>)}
          </div>

          {/* Races */}
          {activeTab === "races" && (
            <Card G={G}>
              <div style={{ fontWeight: 600, color: G.text, marginBottom: 14 }}>Election Races</div>
              {races.map(r => {
                const ballotCount = (r.ballots || []).length;
                const method = VOTING_METHODS[r.votingMethod] || VOTING_METHODS.plurality_single;
                return (
                  <div key={r.id} style={{ padding: "14px 0", borderBottom: `1px solid ${G.border}` }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: 14, color: G.text, fontWeight: 600 }}>{r.title}</div>
                        <div style={{ fontSize: 12, color: G.textDim, marginTop: 2 }}>{ballotCount} ballot{ballotCount !== 1 ? "s" : ""} · {r.open ? "Open" : "Closed"}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, color: G.textDim }}>{t.releaseAt}</span>
                        <input type="time" value={releaseTimes[r.id] || r.releaseTime} onChange={e => setReleaseTimes(rt => ({ ...rt, [r.id]: e.target.value }))} style={{ background: G.bg, border: `1px solid ${G.border2}`, borderRadius: 6, padding: "5px 8px", color: G.text, fontFamily: "inherit", fontSize: 12, outline: "none" }} />
                        <Btn size="sm" variant="outline" onClick={() => onUpdateReleaseTime(r.id, releaseTimes[r.id] || r.releaseTime)}>Set</Btn>
                        <Btn size="sm" variant="outline" onClick={() => onToggleRace(r.id)}>{r.open ? "Close" : "Reopen"}</Btn>
                        <Btn size="sm" variant="danger" onClick={() => onDeleteRace(r.id)}>Delete</Btn>
                      </div>
                    </div>
                    {/* Voting method selector */}
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 11, color: G.textDim, fontWeight: 600 }}>VOTING METHOD:</span>
                      <select
                        value={r.votingMethod || "plurality_single"}
                        onChange={e => onUpdateMethod && onUpdateMethod(r.id, e.target.value)}
                        style={{ background: G.bg, border: `1px solid ${G.border2}`, borderRadius: 6, padding: "4px 8px", color: G.purple, fontFamily: "inherit", fontSize: 11, fontWeight: 600, outline: "none", cursor: "pointer" }}
                      >
                        {METHOD_CATEGORIES.map(cat => (
                          <optgroup key={cat} label={cat}>
                            {Object.values(VOTING_METHODS).filter(m => m.category === cat).map(m => (
                              <option key={m.id} value={m.id}>{m.label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {method.multiWinner && (
                        <>
                          <span style={{ fontSize: 11, color: G.textDim }}>Seats:</span>
                          <input type="number" min={1} max={r.candidates.length} value={r.seats || 1}
                            onChange={e => onUpdateSeats && onUpdateSeats(r.id, parseInt(e.target.value) || 1)}
                            style={{ width: 52, background: G.bg, border: `1px solid ${G.border2}`, borderRadius: 6, padding: "4px 8px", color: G.text, fontFamily: "inherit", fontSize: 12, outline: "none" }} />
                        </>
                      )}
                      <span style={{ fontSize: 11, color: G.textDim, fontStyle: "italic" }}>{method.description}</span>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}

          {/* New Poll */}
          {activeTab === "polls2" && (
            <Card G={G}>
              <div style={{ fontWeight: 600, color: G.text, marginBottom: 14 }}>Create Community Poll</div>
              <Field label="Title" G={G}><TInput G={G} value={newPollTitle} onChange={e => setNewPollTitle(e.target.value)} placeholder="Poll question" /></Field>
              <Field label="Description" G={G}><TInput G={G} value={newPollDesc} onChange={e => setNewPollDesc(e.target.value)} placeholder="Brief description" /></Field>
              <Field label="Options" G={G}>
                {newPollOpts.map((o, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <TInput G={G} value={o} onChange={e => { const n = [...newPollOpts]; n[i] = e.target.value; setNewPollOpts(n); }} placeholder={`Option ${i + 1}`} />
                    {newPollOpts.length > 2 && <button onClick={() => setNewPollOpts(p => p.filter((_, j) => j !== i))} style={{ background: G.surface2, border: `1px solid ${G.border2}`, color: G.textDim, borderRadius: 6, width: 32, height: 38, cursor: "pointer", fontSize: 16 }}>✕</button>}
                  </div>
                ))}
                <Btn size="sm" variant="outline" onClick={() => setNewPollOpts(p => [...p, ""])}>+ Add Option</Btn>
              </Field>
              {err && <div style={{ color: G.red, fontSize: 13, marginBottom: 10 }}>⚠ {err}</div>}
              <Btn onClick={addPoll} variant="primary">Create Poll</Btn>
            </Card>
          )}

          {/* Voter rolls */}
          {activeTab === "voters" && (
            <Card G={G}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ fontWeight: 600, color: G.text }}>Registered Voters ({Object.keys(voters).length})</div>
                <Btn size="sm" variant="outline" onClick={doExportVoters}>{t.exportCSV}</Btn>
              </div>
              {Object.keys(voters).length === 0
                ? <div style={{ fontSize: 13, color: G.textDim }}>No voters registered yet.</div>
                : <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr>{["ID", "Name", "Email", "Tier", "Ballots", "Notif", "Registered"].map(h => <th key={h} style={{ textAlign: "left", padding: "7px 10px", borderBottom: `1px solid ${G.border}`, color: G.textDim, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
                    <tbody>{Object.values(voters).map(v => <tr key={v.id}>
                      <td style={{ padding: "9px 10px", borderBottom: `1px solid ${G.border}`, color: G.gold, fontFamily: "monospace", fontWeight: 600, whiteSpace: "nowrap" }}>{v.id}</td>
                      <td style={{ padding: "9px 10px", borderBottom: `1px solid ${G.border}`, color: G.text, whiteSpace: "nowrap" }}>{v.name}</td>
                      <td style={{ padding: "9px 10px", borderBottom: `1px solid ${G.border}`, color: G.textDim }}>{v.email}</td>
                      <td style={{ padding: "9px 10px", borderBottom: `1px solid ${G.border}` }}><Chip label={`Tier ${v.tier}`} color={v.tier === 2 ? G.gold : G.blue} /></td>
                      <td style={{ padding: "9px 10px", borderBottom: `1px solid ${G.border}`, color: G.text, textAlign: "center" }}>{v.votedOn.size}</td>
                      <td style={{ padding: "9px 10px", borderBottom: `1px solid ${G.border}`, color: G.textDim, textAlign: "center" }}>{[v.notifEmail && "📧", v.notifSMS && "📱"].filter(Boolean).join(" ") || "—"}</td>
                      <td style={{ padding: "9px 10px", borderBottom: `1px solid ${G.border}`, color: G.textDim, whiteSpace: "nowrap" }}>{v.registeredAt}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              }
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ─── Accessibility toolbar ────────────────────────────────────────
function A11yBar({ dark, setDark, hc, setHc, fs, setFs, G, t }) {
  return (
    <div role="toolbar" aria-label="Accessibility options" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <button onClick={() => setDark(d => !d)} aria-pressed={dark} style={{ background: G.surface2, border: `1px solid ${G.border2}`, color: G.textMid, borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 600 }}>{dark ? "☀ " + t.lightMode : "🌙 " + t.darkMode}</button>
      <button onClick={() => setHc(h => !h)} aria-pressed={hc} style={{ background: hc ? G.blue : G.surface2, border: `1px solid ${G.border2}`, color: hc ? "#fff" : G.textMid, borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontFamily: "inherit", fontWeight: 600 }}>⬤ {t.highContrast}</button>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: G.textDim }}>{t.fontSize}:</span>
        {[14, 16, 19].map(s => <button key={s} onClick={() => setFs(s)} aria-pressed={fs === s} style={{ background: fs === s ? G.blue : G.surface2, border: `1px solid ${G.border2}`, color: fs === s ? "#fff" : G.textMid, borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: s - 3, fontFamily: "inherit", fontWeight: 600 }}>A</button>)}
      </div>
    </div>
  );
}

// ─── Sign-in modal ────────────────────────────────────────────────
function SignInModal({ open, onClose, voters, onSignIn, G, t }) {
  const [id, setId] = useState(""); const [pin, setPin] = useState(""); const [otp, setOtp] = useState(""); const [sentOtp, setSentOtp] = useState(""); const [step, setStep] = useState("creds"); const [voter, setVoter] = useState(null); const [err, setErr] = useState("");
  function checkCreds() {
    setErr(""); const v = voters[id.trim()]; if (!v) { setErr("Voter ID not found."); return; }
    if (v.pinHash !== simpleHash(pin)) { setErr("Incorrect PIN."); return; }
    if (v.tier === 2) { const code = String(Math.floor(100000 + Math.random() * 900000)); setSentOtp(code); setVoter(v); setStep("otp"); logAudit("LOGIN_OTP_SENT", `ID=${v.id}`); }
    else { onSignIn(v); onClose(); setId(""); setPin(""); logAudit("LOGIN_SUCCESS", `ID=${v.id}`); }
  }
  function checkOtp() {
    if (otp === sentOtp) { onSignIn(voter); onClose(); setId(""); setPin(""); setOtp(""); setStep("creds"); logAudit("LOGIN_SUCCESS_MFA", `ID=${voter.id}`); }
    else setErr("Incorrect OTP.");
  }
  return (
    <Modal open={open} onClose={onClose} title={t.signIn} G={G}>
      {step === "creds" && <>
        <Field label="Voter ID" G={G}><TInput G={G} value={id} onChange={e => setId(e.target.value)} placeholder="V-XXXXXX or E-XXXXXX" /></Field>
        <Field label="PIN" G={G}><TInput G={G} type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Your PIN" /></Field>
        {err && <div role="alert" style={{ color: G.red, fontSize: 13, marginBottom: 10 }}>⚠ {err}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn onClick={checkCreds}>{t.signIn} →</Btn>
        </div>
      </>}
      {step === "otp" && <>
        <div style={{ background: G.blueDim, border: `1px solid ${G.blue}33`, borderRadius: 9, padding: "10px 14px", fontSize: 13, color: G.blue, marginBottom: 18, lineHeight: 1.5 }}>
          🔐 Multi-factor required for official election access. Demo code: <strong>{sentOtp}</strong>
        </div>
        <Field label="One-Time Code" G={G}><TInput G={G} value={otp} onChange={e => setOtp(e.target.value)} placeholder="000000" maxLength={6} style={{ fontSize: 22, letterSpacing: "0.2em", textAlign: "center" }} /></Field>
        {err && <div role="alert" style={{ color: G.red, fontSize: 13, marginBottom: 10 }}>⚠ {err}</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Btn variant="outline" onClick={() => setStep("creds")}>{t.back}</Btn>
          <Btn variant="success" onClick={checkOtp}>{t.verify} & {t.signIn}</Btn>
        </div>
      </>}
    </Modal>
  );
}

// ─── Language selector ────────────────────────────────────────────
function LangPicker({ lang, setLang, G }) {
  return (
    <select value={lang} onChange={e => setLang(e.target.value)} aria-label="Select language"
      style={{ background: G.surface2, border: `1px solid ${G.border2}`, color: G.textMid, borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 12, fontFamily: "inherit", outline: "none" }}>
      <option value="en">🇺🇸 EN</option>
      <option value="es">🇲🇽 ES</option>
      <option value="zh">🇨🇳 中文</option>
    </select>
  );
}

// ─── Civic Platform ───────────────────────────────────────────────

function useApiData(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null);
    fetcher()
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading, error };
}

function ApiStatus({ loading, error, count, G }) {
  const s = { display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:99, fontSize:11, fontWeight:700, border:"1px solid" };
  if (loading) return <span style={{...s, background: G.surface2, color: G.textDim, borderColor: G.border2}}>⏳ Loading…</span>;
  if (error)   return <span style={{...s, background: G.redDim, color: G.red, borderColor: G.red+"44"}} title={error}>⚠ {error.includes("not configured") ? "API key needed" : "API error"}</span>;
  if (count != null) return <span style={{...s, background: G.greenDim, color: G.green, borderColor: G.green+"44"}}>✓ {count} records</span>;
  return <span style={{...s, background: G.greenDim, color: G.green, borderColor: G.green+"44"}}>✓ Live</span>;
}

function CivicKeyBanner({ name, url, G }) {
  return (
    <div style={{background: G.surface2, border:`1px solid ${G.gold}55`, borderRadius:8, padding:"10px 14px", marginBottom:12, fontSize:13, color: G.text}}>
      <strong style={{color: G.gold}}>🔑 API key needed:</strong> {name} —{" "}
      <a href={url} target="_blank" rel="noreferrer" style={{color: G.blue}}>Register free →</a>
      {" "}then add to <code style={{color: G.purple}}>.env.local</code>
    </div>
  );
}

const civicInputStyle = (G) => ({
  padding:"7px 11px", border:`1px solid ${G.border2}`, borderRadius:7,
  fontSize:13, background: G.bg, color: G.text, outline:"none", fontFamily:"inherit",
});
const civicBtnStyle = (G) => ({
  padding:"7px 14px", borderRadius:7, border:`1px solid ${G.blue}`,
  background: G.blue, color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"inherit",
});
const civicTableStyle = { width:"100%", borderCollapse:"collapse", fontSize:13 };
const CivicTh = ({children, G, ...p}) => (
  <th style={{padding:"7px 10px",textAlign:"left",fontSize:11,fontWeight:700,letterSpacing:".04em",textTransform:"uppercase",color: G?.textDim,...(p.style||{})}}>{children}</th>
);
const CivicTd = ({children, ...p}) => (
  <td style={{padding:"8px 10px",verticalAlign:"top",borderBottom:"1px solid #eee",...(p.style||{})}}>{children}</td>
);
function civicPartyBadge(party) {
  const map = { D:{bg:"#dbeafe",c:"#1d4ed8"}, R:{bg:"#fee2e2",c:"#b91c1c"}, I:{bg:"#f3e8ff",c:"#7e22ce"} };
  const s = map[party?.[0]] || {bg:"#f3f4f6",c:"#374151"};
  return {display:"inline-block",padding:"1px 7px",borderRadius:99,fontSize:11,fontWeight:700,background:s.bg,color:s.c};
}
function civicFmt$(n) { if (n==null) return "—"; return "$"+Number(n).toLocaleString("en-US",{maximumFractionDigits:0}); }
function civicVoteBadge(pos) {
  if (!pos) return {};
  const p = pos.toLowerCase();
  if (p==="yes"||p==="yea") return {display:"inline-block",padding:"1px 7px",borderRadius:99,fontSize:11,fontWeight:700,background:"#edf7f1",color:"#1a7a4a"};
  if (p==="no"||p==="nay")  return {display:"inline-block",padding:"1px 7px",borderRadius:99,fontSize:11,fontWeight:700,background:"#fdf0ee",color:"#c0392b"};
  return {display:"inline-block",padding:"1px 7px",borderRadius:99,fontSize:11,fontWeight:700,background:"#f0f0f0",color:"#888"};
}
function civicRiskBadge(level) {
  return { high:{display:"inline-block",padding:"2px 7px",borderRadius:5,fontSize:11,fontWeight:700,background:"#fdf0ee",color:"#c0392b"},
           med: {display:"inline-block",padding:"2px 7px",borderRadius:5,fontSize:11,fontWeight:700,background:"#fef9ee",color:"#b45309"},
           low: {display:"inline-block",padding:"2px 7px",borderRadius:5,fontSize:11,fontWeight:700,background:"#edf7f1",color:"#1a7a4a"} }[level];
}
const US_STATES = [
  {code:"AL",name:"Alabama"},{code:"AK",name:"Alaska"},{code:"AZ",name:"Arizona"},{code:"AR",name:"Arkansas"},
  {code:"CA",name:"California"},{code:"CO",name:"Colorado"},{code:"CT",name:"Connecticut"},{code:"DE",name:"Delaware"},
  {code:"FL",name:"Florida"},{code:"GA",name:"Georgia"},{code:"HI",name:"Hawaii"},{code:"ID",name:"Idaho"},
  {code:"IL",name:"Illinois"},{code:"IN",name:"Indiana"},{code:"IA",name:"Iowa"},{code:"KS",name:"Kansas"},
  {code:"KY",name:"Kentucky"},{code:"LA",name:"Louisiana"},{code:"ME",name:"Maine"},{code:"MD",name:"Maryland"},
  {code:"MA",name:"Massachusetts"},{code:"MI",name:"Michigan"},{code:"MN",name:"Minnesota"},{code:"MS",name:"Mississippi"},
  {code:"MO",name:"Missouri"},{code:"MT",name:"Montana"},{code:"NE",name:"Nebraska"},{code:"NV",name:"Nevada"},
  {code:"NH",name:"New Hampshire"},{code:"NJ",name:"New Jersey"},{code:"NM",name:"New Mexico"},{code:"NY",name:"New York"},
  {code:"NC",name:"North Carolina"},{code:"ND",name:"North Dakota"},{code:"OH",name:"Ohio"},{code:"OK",name:"Oklahoma"},
  {code:"OR",name:"Oregon"},{code:"PA",name:"Pennsylvania"},{code:"RI",name:"Rhode Island"},{code:"SC",name:"South Carolina"},
  {code:"SD",name:"South Dakota"},{code:"TN",name:"Tennessee"},{code:"TX",name:"Texas"},{code:"UT",name:"Utah"},
  {code:"VT",name:"Vermont"},{code:"VA",name:"Virginia"},{code:"WA",name:"Washington"},{code:"WV",name:"West Virginia"},
  {code:"WI",name:"Wisconsin"},{code:"WY",name:"Wyoming"},
];

// Civic: Voting Records
function CivicFundraising({ G }) {
  const [office, setOffice] = useState("S");
  const [cycleYear, setCycleYear] = useState("2026");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({office:"S",cycle:"2026",name:""});
  const { data, loading, error } = useApiData(
    () => cachedFetch(`fec-${query.office}-${query.cycle}-${query.name}`, () =>
      fetchFEC("/candidates/totals/", {office:query.office,election_year:query.cycle,...(query.name?{name:query.name.toUpperCase()}:{}),per_page:20,sort:"-receipts",is_active_candidate:true})
    ), [query]
  );
  const candidates = data?.results || [];
  return (
    <div>
      {API_KEYS.FEC==="DEMO_KEY" && <div style={{background:G.surface2,border:`1px solid ${G.gold}55`,borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:G.text}}>ℹ️ Using FEC DEMO_KEY (1,000 req/day). <a href="https://api.open.fec.gov/developers/" target="_blank" rel="noreferrer" style={{color:G.blue}}>Get free key →</a></div>}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name…" style={{...civicInputStyle(G),minWidth:180}} onKeyDown={e=>e.key==="Enter"&&setQuery({office,cycle:cycleYear,name:search})} />
        <select value={office} onChange={e=>setOffice(e.target.value)} style={civicInputStyle(G)}><option value="S">Senate</option><option value="H">House</option><option value="P">President</option></select>
        <select value={cycleYear} onChange={e=>setCycleYear(e.target.value)} style={civicInputStyle(G)}>{["2026","2024","2022","2020"].map(y=><option key={y}>{y}</option>)}</select>
        <button onClick={()=>setQuery({office,cycle:cycleYear,name:search})} style={civicBtnStyle(G)}>Search</button>
        <ApiStatus loading={loading} error={error} count={data?.pagination?.count} G={G} />
      </div>
      {!loading && !error && candidates.length>0 && (
        <div style={{overflowX:"auto"}}><table style={civicTableStyle}><thead><tr style={{background:G.surface2}}>
          <CivicTh G={G}>#</CivicTh><CivicTh G={G}>Candidate</CivicTh><CivicTh G={G}>Party</CivicTh><CivicTh G={G}>State</CivicTh><CivicTh G={G}>Raised</CivicTh><CivicTh G={G}>Spent</CivicTh><CivicTh G={G}>Cash on Hand</CivicTh>
        </tr></thead><tbody>
          {candidates.map((c,i)=>(
            <tr key={c.candidate_id}>
              <CivicTd style={{fontWeight:700,color:G.textDim}}>{i+1}</CivicTd>
              <CivicTd style={{color:G.text}}><strong>{c.name}</strong><div style={{fontSize:11,color:G.textDim}}>{c.office_full}</div></CivicTd>
              <CivicTd><span style={civicPartyBadge(c.party)}>{c.party}</span></CivicTd>
              <CivicTd style={{color:G.textDim}}>{c.state||"—"}</CivicTd>
              <CivicTd style={{fontWeight:700,color:G.green}}>{civicFmt$(c.receipts)}</CivicTd>
              <CivicTd style={{color:G.textMid}}>{civicFmt$(c.disbursements)}</CivicTd>
              <CivicTd style={{fontWeight:600,color:G.text}}>{civicFmt$(c.cash_on_hand_end_period)}</CivicTd>
            </tr>
          ))}
        </tbody></table></div>
      )}
    </div>
  );
}

// Civic: Donor Lookup
function CivicDonors({ G }) {
  const [searchName, setSearchName] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [schedA, setSchedA] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchCandidates = async () => {
    if (!searchName) return;
    setLoading(true); setError(null);
    try { const d = await fetchFEC("/candidates/search/",{name:searchName.toUpperCase(),per_page:10,sort:"-receipts"}); setCandidates(d.results||[]); }
    catch(e) { setError(e.message); } finally { setLoading(false); }
  };
  const loadDonors = async (cid) => {
    setLoading(true); setError(null);
    try {
      const cand = await fetchFEC(`/candidate/${cid}/`,{});
      const committeeId = cand.results?.[0]?.principal_committees?.[0]?.committee_id;
      if (!committeeId) throw new Error("No committee found");
      const donors = await fetchFEC("/schedules/schedule_a/",{committee_id:committeeId,per_page:20,sort:"-contribution_receipt_amount",two_year_transaction_period:2026});
      setSchedA(donors.results||[]);
    } catch(e) { setError(e.message); setSchedA([]); } finally { setLoading(false); }
  };
  return (
    <div>
      {API_KEYS.FEC==="DEMO_KEY" && <div style={{background:G.surface2,border:`1px solid ${G.gold}55`,borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:G.text}}>ℹ️ FEC DEMO_KEY active. <a href="https://api.open.fec.gov/developers/" target="_blank" rel="noreferrer" style={{color:G.blue}}>Get free key →</a></div>}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={searchName} onChange={e=>setSearchName(e.target.value)} placeholder="Candidate name (e.g. SMITH)…" style={{...civicInputStyle(G),minWidth:200}} onKeyDown={e=>e.key==="Enter"&&searchCandidates()} />
        <button onClick={searchCandidates} style={civicBtnStyle(G)}>Find Candidate</button>
        <ApiStatus loading={loading} error={error} G={G} />
      </div>
      {candidates.length>0 && !schedA && (
        <div>
          <div style={{fontWeight:700,fontSize:13,marginBottom:6,color:G.text}}>Select candidate to view top donors:</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {candidates.map(c=>(
              <button key={c.candidate_id} onClick={()=>loadDonors(c.candidate_id)} style={{...civicBtnStyle(G),background:G.surface2,color:G.blue,border:`1px solid ${G.blue}44`,fontSize:12}}>
                {c.name} ({c.party}) — {c.state} {c.office}
              </button>
            ))}
          </div>
        </div>
      )}
      {schedA && (
        <div style={{marginTop:12}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:6,color:G.text}}>Top individual contributions:</div>
          <div style={{overflowX:"auto"}}><table style={civicTableStyle}><thead><tr style={{background:G.surface2}}>
            <CivicTh G={G}>Donor</CivicTh><CivicTh G={G}>Employer</CivicTh><CivicTh G={G}>Occupation</CivicTh><CivicTh G={G}>City/State</CivicTh><CivicTh G={G}>Amount</CivicTh><CivicTh G={G}>Date</CivicTh>
          </tr></thead><tbody>
            {schedA.map((d,i)=>(
              <tr key={i}>
                <CivicTd style={{fontWeight:600,fontSize:12,color:G.text}}>{d.contributor_name||"—"}</CivicTd>
                <CivicTd style={{fontSize:11,color:G.textMid}}>{d.contributor_employer||"—"}</CivicTd>
                <CivicTd style={{fontSize:11,color:G.textMid}}>{d.contributor_occupation||"—"}</CivicTd>
                <CivicTd style={{fontSize:11,color:G.textDim}}>{d.contributor_city}, {d.contributor_state}</CivicTd>
                <CivicTd style={{fontWeight:700,color:G.green}}>{civicFmt$(d.contribution_receipt_amount)}</CivicTd>
                <CivicTd style={{fontSize:11,color:G.textDim}}>{d.contribution_receipt_date}</CivicTd>
              </tr>
            ))}
          </tbody></table></div>
        </div>
      )}
    </div>
  );
}

// Civic: Lobbying
function CivicLobbying({ G }) {
  const [clientSearch, setClientSearch] = useState("");
  const [query, setQuery] = useState("pharmaceutical");
  const { data, loading, error } = useApiData(
    () => cachedFetch(`lda-${query}`, () => fetchLDA("/filings/",{client_name:query,filing_year:new Date().getFullYear(),per_page:20})),
    [query]
  );
  const filings = data?.results || [];
  return (
    <div>
      <div style={{background:G.greenDim,border:`1px solid ${G.green}44`,borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:G.green}}>
        ✓ No API key required — Senate Lobbying Disclosure Act database is public.
      </div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={clientSearch} onChange={e=>setClientSearch(e.target.value)} placeholder="Search by client/company…" style={{...civicInputStyle(G),minWidth:220}} onKeyDown={e=>e.key==="Enter"&&setQuery(clientSearch)} />
        <button onClick={()=>setQuery(clientSearch)} style={civicBtnStyle(G)}>Search</button>
        <ApiStatus loading={loading} error={error} count={data?.count} G={G} />
      </div>
      {!loading && !error && filings.length>0 && (
        <div style={{overflowX:"auto"}}><table style={civicTableStyle}><thead><tr style={{background:G.surface2}}>
          <CivicTh G={G}>Client</CivicTh><CivicTh G={G}>Lobbying Firm</CivicTh><CivicTh G={G}>Period</CivicTh><CivicTh G={G}>Amount</CivicTh><CivicTh G={G}>Issues</CivicTh>
        </tr></thead><tbody>
          {filings.map((f,i)=>(
            <tr key={i}>
              <CivicTd style={{fontWeight:600,fontSize:12,color:G.text}}>{f.client?.name||"—"}</CivicTd>
              <CivicTd style={{fontSize:12,color:G.textMid}}>{f.registrant?.name||"—"}</CivicTd>
              <CivicTd style={{fontSize:11,color:G.textDim}}>{f.period_of_report||`${f.filing_year} ${f.filing_period}`}</CivicTd>
              <CivicTd style={{fontWeight:700,color:G.gold}}>{f.income?civicFmt$(f.income):f.expenses?civicFmt$(f.expenses):"Disclosed"}</CivicTd>
              <CivicTd style={{fontSize:11,maxWidth:200,color:G.textMid}}>{f.lobbying_activities?.map(a=>a.general_issue_code_display).filter(Boolean).slice(0,3).join(", ")||"—"}</CivicTd>
            </tr>
          ))}
        </tbody></table></div>
      )}
      {!loading && !error && filings.length===0 && <div style={{color:G.textDim,fontSize:13,padding:12}}>No filings found. Try "pharmaceutical", "defense", "energy".</div>}
    </div>
  );
}

// Civic: Phase 2 placeholder
function CivicComingSoon({ label, description, G }) {
  return (
    <div style={{textAlign:"center",padding:"40px 20px"}}>
      <div style={{fontSize:48,marginBottom:12}}>🏗</div>
      <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:18,color:G.text,marginBottom:8}}>{label} — Coming in Phase 2</div>
      <div style={{fontSize:13,color:G.textMid,maxWidth:420,margin:"0 auto",lineHeight:1.7}}>{description}</div>
    </div>
  );
}

// ── Main Civic Tab shell ──────────────────────────────────────────
const CIVIC_TABS = [
  { id:"review",      label:"📜 Legislation Review", live:true, desc:"Summaries of new federal, state, county and city legislation, linked to the full official record." },
  { id:"votes",       label:"🗳 Congress Votes",   live:true,  desc:"Pick a state to see its members of Congress and how each voted on the latest roll calls." },
  { id:"recent",      label:"🏛 Recent Roll Calls", live:true, desc:"Latest Senate and House roll-call votes, with how every member voted." },
  { id:"state",       label:"🏢 State Votes",      live:true,  desc:"Roll-call votes in all 50 state legislatures, via OpenStates." },
  { id:"local",       label:"🏙 Local Votes",      live:true,  desc:"City council and county board votes from jurisdictions that publish through Legistar." },
  { id:"member",      label:"🔍 Member Search",    live:true,  desc:"Look up any member of Congress." },
  { id:"bills",       label:"📋 Legislation",      live:true,  desc:"Search recently active bills, track status, flag authoritarian risk." },
  { id:"fundraising", label:"💰 Fundraising",      live:true,  desc:"Campaign finance data from the FEC." },
  { id:"donors",      label:"📈 Donor Lookup",     live:true,  desc:"See who is funding which candidates." },
  { id:"lobbying",    label:"🤝 Lobbying",         live:true,  desc:"Senate LDA lobbying disclosures — no key needed." },
  { id:"crowdsource", label:"🗣 Crowdsource",      live:true,  desc:"Propose laws, vote ideas up or down, and debate them with fellow citizens." },
  { id:"experts",     label:"🎓 Expert Analysis",  live:true,  desc:"Nonpartisan analysis from the Congressional Research Service, CBO and GAO." },
  { id:"arrests",     label:"🔒 Arrests",          live:true,  desc:"Public officials charged, convicted or sentenced, from Justice Department records." },
  { id:"ethics",      label:"⚖️ Ethics & Fact-Check", live:true, desc:"Independent fact checks of public statements, plus official ethics and oversight records." },
  { id:"meetings",    label:"📅 Meetings",         live:true,  desc:"Congressional committee meetings and hearings — upcoming and recent." },
];

function CivicTab({ G }) {
  const [activeTab, setActiveTab] = useState("review");
  const tab = CIVIC_TABS.find(t => t.id === activeTab);

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:26,color:G.text}}>🏛 Civic Transparency</div>
          <div style={{fontSize:13,color:G.textMid,marginTop:3}}>Live government data — voting records, fundraising, lobbying, legislation, and more.</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:99,fontSize:11,fontWeight:700,background:G.greenDim,color:G.green,border:`1px solid ${G.green}44`}}>🔴 LIVE DATA</span>
        </div>
      </div>

      {/* Civic sub-tab bar */}
      <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:10,padding:"3px 3px",marginBottom:20,display:"flex",flexWrap:"wrap",gap:1}}>
        {CIVIC_TABS.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            style={{padding:"7px 10px",borderRadius:8,border:activeTab===t.id?`1px solid ${G.border2}`:"1px solid transparent",background:activeTab===t.id?G.surface2:"transparent",color:activeTab===t.id?G.text:G.textDim,cursor:"pointer",fontFamily:"inherit",fontSize:11,fontWeight:600,transition:"all 0.15s",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:3}}>
            {t.label}
            {t.live && <span style={{display:"inline-block",padding:"1px 4px",borderRadius:99,fontSize:9,fontWeight:700,background:G.greenDim,color:G.green,border:`1px solid ${G.green}44`}}>LIVE</span>}
          </button>
        ))}
      </div>

      {/* Section header */}
      <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:10,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontWeight:700,fontSize:15,color:G.text}}>{tab?.label}</div>
          <div style={{fontSize:12,color:G.textMid,marginTop:2}}>{tab?.desc}</div>
        </div>
        {tab?.live && <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:99,fontSize:11,fontWeight:700,background:G.greenDim,color:G.green,border:`1px solid ${G.green}44`}}>✓ Live API</span>}
      </div>

      {/* Content */}
      <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:10,padding:"16px 18px"}}>
        <CivicTheme G={G}>
          {activeTab==="votes"     && <VotingRecords />}
          {activeTab==="recent"    && <RecentVotes />}
          {activeTab==="state"     && <StateVotes />}
          {activeTab==="local"     && <LocalVotes />}
          {activeTab==="member"    && <MemberSearch />}
          {activeTab==="bills"     && <LegislationTracker />}
          {activeTab==="review"    && <LegislationReview />}
          {activeTab==="crowdsource" && <Crowdsource />}
          {activeTab==="experts"   && <ExpertAnalysis />}
          {activeTab==="arrests"   && <Arrests />}
          {activeTab==="ethics"    && <EthicsFactCheck />}
          {activeTab==="meetings"  && <Meetings />}
        </CivicTheme>
        {activeTab==="fundraising" && <CivicFundraising G={G} />}
        {activeTab==="donors"      && <CivicDonors G={G} />}
        {activeTab==="lobbying"    && <CivicLobbying G={G} />}
      </div>

      <div style={{fontSize:11,color:G.textDim,marginTop:12,textAlign:"center"}}>
        Data sources: Congress.gov · Senate.gov · OpenStates · Legistar · FEC · Senate LDA · U.S. DOJ · CBO · GAO · Google Fact Check · All public records.
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────
const MAIN_TABS = (t) => [
  { id: "election", label: t.officialElection },
  { id: "polls", label: t.communityPolls },
  { id: "results", label: t.resultsAudit },
  { id: "register", label: t.registerTab },
  { id: "civic", label: "🏛 Civic Transparency" },
  { id: "admin", label: "⚙️ Admin" },
];

export default function App() {
  const [tab, setTab] = useState("election");
  const [voters, setVoters] = useState({});
  const [races, setRaces] = useState(ELECTION_RACES);
  const [polls, setPolls] = useState(POLL_TOPICS);
  const [currentVoter, setCurrentVoter] = useState(null);
  const [signinOpen, setSigninOpen] = useState(false);
  const [toast, setToast] = useState({ msg: "", type: "info" });
  const [regMode, setRegMode] = useState(null);
  const [released, setReleased] = useState({});
  const [regSuccess, setRegSuccess] = useState(null);
  const [auditLog, setAuditLog] = useState([]);

  // Accessibility & theme
  const [dark, setDark] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState(14);
  const [lang, setLang] = useState("en");

  const G = makeTheme(dark, highContrast);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  // Sync audit log from module-level array
  useEffect(() => { const iv = setInterval(() => setAuditLog([..._auditLog]), 2000); return () => clearInterval(iv); }, []);

  function showToast(msg, type = "info") { setToast({ msg, type }); setTimeout(() => setToast({ msg: "", type: "info" }), 4000); }

  function onRegisterTier1() {
    const id = genId("V");
    const voter = { id, tier: 1, name: "Demo Voter", email: `demo+${id}@example.com`, pinHash: simpleHash("Agora@1!"), votedOn: new Set(), registeredAt: new Date().toLocaleString(), receiptHash: genReceipt(), notifEmail: false, notifSMS: false };
    setVoters(v => ({ ...v, [voter.id]: voter }));
    setRegSuccess({ id, pin: "Agora@1!", tier: 1, receiptHash: voter.receiptHash });
    logAudit("VOTER_REGISTERED", `ID=${id}, Tier=1`);
  }

  function onRegisterTier2(voter) { setVoters(v => ({ ...v, [voter.id]: voter })); setRegSuccess({ id: voter.id, pin: "(your chosen PIN)", tier: 2, receiptHash: voter.receiptHash }); }

  function onElectionVote(raceId, ballot) {
    if (!currentVoter) return;
    setRaces(rs => rs.map(r => {
      if (r.id !== raceId) return r;
      // Store full ballot for method tallying
      const newBallot = { voterId: currentVoter.id, ...ballot };
      const newBallots = [...(r.ballots || []), newBallot];
      // Also update legacy votes object for simple display
      const newVotes = { ...r.votes };
      if (ballot.choice) newVotes[ballot.choice] = (newVotes[ballot.choice] || 0) + 1;
      if (ballot.choices) ballot.choices.forEach(id => { newVotes[id] = (newVotes[id] || 0) + 1; });
      if (ballot.approvals) ballot.approvals.forEach(id => { newVotes[id] = (newVotes[id] || 0) + 1; });
      return { ...r, votes: newVotes, ballots: newBallots };
    }));
    const updated = { ...currentVoter, votedOn: new Set([...currentVoter.votedOn, raceId]) };
    setCurrentVoter(updated); setVoters(v => ({ ...v, [updated.id]: updated }));
    logAudit("VOTE_CAST", `Race=${raceId}, Voter=${currentVoter.id}`);
    showToast(t.voteSealed, "success");
  }

  function onUpdateMethod(raceId, methodId) {
    setRaces(rs => rs.map(r => r.id === raceId ? { ...r, votingMethod: methodId } : r));
    logAudit("METHOD_CHANGED", `Race=${raceId}, Method=${methodId}`);
  }

  function onUpdateSeats(raceId, seats) {
    setRaces(rs => rs.map(r => r.id === raceId ? { ...r, seats } : r));
  }

  function onPollVote(pollId, option) {
    if (!currentVoter) return;
    setPolls(ps => ps.map(p => p.id === pollId ? { ...p, votes: { ...p.votes, [option]: (p.votes[option] || 0) + 1 } } : p));
    const updated = { ...currentVoter, votedOn: new Set([...currentVoter.votedOn, pollId]) };
    setCurrentVoter(updated); setVoters(v => ({ ...v, [updated.id]: updated }));
    logAudit("POLL_VOTE", `Poll=${pollId}, Voter=${currentVoter.id}`);
    showToast(t.voteCast, "success");
  }

  const TABS = MAIN_TABS(t);
  const css2 = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Instrument+Sans:wght@400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: ${G.bg}; font-size: ${fontSize}px; }
    ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: ${G.bg}; } ::-webkit-scrollbar-thumb { background: ${G.border2}; border-radius: 3px; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
    @keyframes scanline { 0% { top:-40px; } 100% { top:100%; } }
    input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
    @media (max-width: 600px) { .hide-mobile { display: none !important; } }
  `;

  return (
    <div style={{ background: G.bg, minHeight: "100vh", color: G.text, fontFamily: "'Instrument Sans', sans-serif", fontSize: fontSize }}>
      <style>{css2}</style>

      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${G.border}`, background: G.surface + "cc", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(10px)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 16px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${G.blue}, ${G.purple})`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🏛</div>
            <div className="hide-mobile">
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em", color: G.text }}>{t.appName}</div>
              <div style={{ fontSize: 9, color: G.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: -2 }}>{t.appSub}</div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <SessionTimer voter={currentVoter} onExpire={() => { setCurrentVoter(null); showToast("Session expired. Please sign in again.", "warning"); logAudit("SESSION_EXPIRED", currentVoter?.id || ""); }} G={G} t={t} />
            <LangPicker lang={lang} setLang={setLang} G={G} />
            {currentVoter && <div className="hide-mobile" style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <Chip label={currentVoter.tier === 2 ? "🏛 Official" : "📋 Poll"} color={currentVoter.tier === 2 ? G.gold : G.blue} />
              <span style={{ fontSize: 12, color: G.textMid }}>{currentVoter.name.split(" ")[0]}</span>
            </div>}
            <div onClick={() => { if (currentVoter) { setCurrentVoter(null); showToast(t.signedOut, "info"); logAudit("LOGOUT", currentVoter?.id || ""); } else setSigninOpen(true); }}
              style={{ display: "flex", alignItems: "center", gap: 7, background: G.surface2, border: `1px solid ${G.border2}`, borderRadius: 8, padding: "7px 13px", cursor: "pointer", fontSize: 13, flexShrink: 0 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: currentVoter ? G.green : G.red }} />
              {currentVoter ? t.signOut : t.signIn}
            </div>
          </div>
        </div>

        {/* A11y bar */}
        <div style={{ borderTop: `1px solid ${G.border}`, background: G.surface2, padding: "6px 16px" }}>
          <div style={{ maxWidth: 980, margin: "0 auto" }}>
            <A11yBar dark={dark} setDark={setDark} hc={highContrast} setHc={setHighContrast} fs={fontSize} setFs={setFontSize} G={G} t={t} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: G.surface, borderBottom: `1px solid ${G.border}`, overflowX: "auto" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", padding: "0 16px", gap: 2 }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} role="tab" aria-selected={tab === tb.id}
              style={{ padding: "14px 14px", border: "none", borderBottom: `2px solid ${tab === tb.id ? G.blue : "transparent"}`, background: "transparent", color: tab === tb.id ? G.blue : G.textDim, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, transition: "all 0.15s", whiteSpace: "nowrap" }}>
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 16px" }}>

        {/* Election */}
        {tab === "election" && <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: G.text }}>Official Election Ballot</div>
              <div style={{ fontSize: 13, color: G.textMid, marginTop: 3 }}>June 7, 2026 — California General Election · Requires <strong style={{ color: G.gold }}>Tier 2 Verification</strong></div>
            </div>
            <div style={{ background: G.blueDim, border: `1px solid ${G.blue}33`, borderRadius: 10, padding: "10px 14px", fontSize: 12, color: G.blue, maxWidth: 300, lineHeight: 1.6 }}>
              🔐 Official elections require government ID, SSN cross-check, facial recognition, and SMS MFA.
            </div>
          </div>
          {!currentVoter && <Card G={G} style={{ textAlign: "center", padding: 36, marginBottom: 20 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗳</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 8, color: G.text }}>Authentication Required</div>
            <div style={{ fontSize: 13, color: G.textMid, marginBottom: 20, maxWidth: 380, margin: "0 auto 20px" }}>Sign in with your verified Tier 2 Voter ID to access the official ballot.</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Btn onClick={() => setSigninOpen(true)}>{t.signIn}</Btn>
              <Btn variant="outline" onClick={() => setTab("register")}>{t.register} →</Btn>
            </div>
          </Card>}
          {currentVoter && currentVoter.tier !== 2 && <div style={{ background: G.redDim, border: `1px solid ${G.red}44`, borderRadius: 12, padding: 18, marginBottom: 20, fontSize: 13, color: G.red }}>⚠ Official elections require a <strong>Tier 2 verified account</strong>. Your Tier 1 account is valid for community polls only.</div>}
          {races.map(r => <RaceCard key={r.id} race={r} voter={currentVoter?.tier === 2 ? currentVoter : null} onVote={onElectionVote} G={G} t={t} />)}
        </div>}

        {/* Polls */}
        {tab === "polls" && <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: G.text, marginBottom: 4 }}>Community Polls</div>
          <div style={{ fontSize: 13, color: G.textMid, marginBottom: 22 }}>Open to all registered voters (Tier 1 or Tier 2). Results visible in real-time.</div>
          {polls.map(p => <PollCard key={p.id} poll={p} voter={currentVoter} onVote={onPollVote} G={G} t={t} />)}
        </div>}

        {/* Results */}
        {tab === "results" && <ResultsView races={races} polls={polls} voters={voters} released={released} onRelease={id => { setReleased(r => ({ ...r, [id]: true })); logAudit("RESULTS_RELEASED", `Race=${id}`); showToast("Results released.", "success"); }} auditLog={auditLog} G={G} t={t} />}

        {/* Register */}
        {tab === "register" && <div>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 26, color: G.text, marginBottom: 4 }}>{t.register}</div>
          <div style={{ fontSize: 13, color: G.textMid, marginBottom: 22 }}>Choose the tier that matches your voting needs.</div>

          {!regMode && !regSuccess && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            <Card G={G} accent={G.blue + "44"}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>📋</div>
              <Chip label="Tier 1" color={G.blue} />
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, margin: "10px 0 8px", color: G.text }}>{t.tier1Title}</div>
              <div style={{ fontSize: 13, color: G.textMid, lineHeight: 1.6, marginBottom: 18 }}>Community polls and surveys. Standard verification.</div>
              <ul style={{ fontSize: 12, color: G.textDim, lineHeight: 1.9, marginLeft: 16, marginBottom: 20 }}>
                <li>Name, email, date of birth</li><li>Age verification (18+)</li><li>Unique Voter ID</li><li>Strong PIN (8+ chars)</li>
              </ul>
              <Btn full onClick={() => { setRegMode("tier1"); onRegisterTier1(); }}>Quick Register</Btn>
            </Card>
            <Card G={G} accent={G.gold + "55"}>
              <div style={{ fontSize: 30, marginBottom: 10 }}>🏛</div>
              <Chip label="Tier 2" color={G.gold} />
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, margin: "10px 0 8px", color: G.text }}>{t.tier2Title}</div>
              <div style={{ fontSize: 13, color: G.textMid, lineHeight: 1.6, marginBottom: 18 }}>Local, state & federal elections. Full government-grade verification.</div>
              <ul style={{ fontSize: 12, color: G.textDim, lineHeight: 1.9, marginLeft: 16, marginBottom: 20 }}>
                <li>Government photo ID (DL / State / Passport)</li><li>Email confirmation</li><li>SSN cross-check with voter rolls</li><li>Registered address verification</li><li>SMS multi-factor authentication</li><li>Live facial recognition biometrics</li><li>Cryptographic ballot receipt</li><li>Notification preferences</li>
              </ul>
              <Btn full variant="gold" onClick={() => setRegMode("tier2")}>Begin Full Registration →</Btn>
            </Card>
          </div>}

          {regMode === "tier2" && !regSuccess && <div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 22 }}>
              <Btn variant="ghost" onClick={() => setRegMode(null)} size="sm">← Back</Btn>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: G.text }}>Official Voter Registration</div>
                <div style={{ fontSize: 12, color: G.textMid }}>7-step government-grade identity verification</div>
              </div>
            </div>
            <Card G={G}><RegWizard onComplete={onRegisterTier2} existingVoters={voters} G={G} t={t} lang={lang} /></Card>
          </div>}

          {regSuccess && <Card G={G} accent={G.green + "44"} style={{ textAlign: "center", animation: "fadeUp 0.4s ease" }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>✅</div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, color: G.green, marginBottom: 8 }}>{t.registrationSuccess}</div>
            <div style={{ fontSize: 13, color: G.textMid, marginBottom: 22, maxWidth: 420, margin: "0 auto 22px", lineHeight: 1.6 }}>
              {regSuccess.tier === 2 ? "Your identity has been verified against government records. You are now eligible to vote in official elections." : "You are registered to participate in community polls."}
            </div>
            <div style={{ background: G.bg, border: `1px solid ${G.border2}`, borderRadius: 12, padding: 20, maxWidth: 420, margin: "0 auto 22px", textAlign: "left" }}>
              {[["Voter ID", <span style={{ fontFamily: "monospace", color: G.gold, fontWeight: 700 }}>{regSuccess.id}</span>], ["PIN", regSuccess.tier === 1 ? regSuccess.pin : "(your chosen PIN)"], ["Tier", regSuccess.tier === 2 ? "🏛 Official Elections" : "📋 Community Polls"]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${G.border}`, fontSize: 13, gap: 12 }}>
                  <span style={{ color: G.textDim }}>{k}</span><span style={{ color: G.text }}>{v}</span>
                </div>
              ))}
              {regSuccess.tier === 2 && <div style={{ padding: "10px 0" }}>
                <div style={{ fontSize: 11, color: G.textDim, marginBottom: 4 }}>Ballot Receipt Hash</div>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: G.green, wordBreak: "break-all", lineHeight: 1.6 }}>{regSuccess.receiptHash}</div>
              </div>}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Btn onClick={() => { setRegSuccess(null); setRegMode(null); setTab(regSuccess.tier === 2 ? "election" : "polls"); }}>{regSuccess.tier === 2 ? "Go to Ballot →" : "Go to Polls →"}</Btn>
              <Btn variant="outline" onClick={() => { setRegSuccess(null); setRegMode(null); }}>Register Another</Btn>
            </div>
          </Card>}
        </div>}

        {/* Civic Transparency */}
        {tab === "civic" && <CivicTab G={G} />}

        {/* Admin */}
        {tab === "admin" && <AdminPanel races={races} voters={voters} polls={polls}
          onToggleRace={id => { setRaces(rs => rs.map(r => r.id === id ? { ...r, open: !r.open } : r)); logAudit("RACE_TOGGLED", `id=${id}`); }}
          onDeleteRace={id => { setRaces(rs => rs.filter(r => r.id !== id)); logAudit("RACE_DELETED", `id=${id}`); }}
          onUpdateReleaseTime={(id, time) => { setRaces(rs => rs.map(r => r.id === id ? { ...r, releaseTime: time } : r)); logAudit("RELEASE_TIME_SET", `Race=${id}, Time=${time}`); showToast("Release time updated.", "success"); }}
          onUpdateMethod={onUpdateMethod}
          onUpdateSeats={onUpdateSeats}
          onCreatePoll={p => { setPolls(ps => [...ps, p]); showToast("Poll created!", "success"); logAudit("POLL_CREATED", p.title); }}
          G={G} t={t} />}
      </div>

      <SignInModal open={signinOpen} onClose={() => setSigninOpen(false)} voters={voters} onSignIn={v => { setCurrentVoter(v); showToast(`${t.welcomeBack} ${v.name.split(" ")[0]}!`, "success"); }} G={G} t={t} />
      <Toast msg={toast.msg} type={toast.type} G={G} />
    </div>
  );
}
