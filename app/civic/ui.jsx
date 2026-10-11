"use client";
/**
 * Shared UI helpers for the civic data sections.
 *
 * Colors come from CSS variables so the same sections look right on the
 * light /civic page and inside the main platform's light, dark and
 * high-contrast themes. Wrap sections in <CivicTheme G={theme}> to map a
 * theme object onto the variables; without it, the light defaults apply.
 */
import { useState, useEffect } from "react";

export const C = {
  text:     "var(--civ-text, #1a1a1e)",
  textMid:  "var(--civ-text-mid, #666)",
  textDim:  "var(--civ-text-dim, #888)",
  surface:  "var(--civ-surface, #ffffff)",
  surface2: "var(--civ-surface2, #f9f9fb)",
  head:     "var(--civ-head, #f5f5f7)",
  border:   "var(--civ-border, #e0e0e8)",
  rule:     "var(--civ-rule, #eeeeee)",
  link:     "var(--civ-link, #2756c8)",
  input:    "var(--civ-input, #ffffff)",
  noteBg:   "var(--civ-note-bg, #fffbea)",
  noteBd:   "var(--civ-note-bd, #f59e0b)",
  infoBg:   "var(--civ-info-bg, #f0f4ff)",
  infoBd:   "var(--civ-info-bd, #c0d0f0)",
};

/** Maps an Agora theme object (G) onto the civic CSS variables. */
export function CivicTheme({ G, children }) {
  const vars = G ? {
    "--civ-text": G.text,
    "--civ-text-mid": G.textMid || G.textDim,
    "--civ-text-dim": G.textDim,
    "--civ-surface": G.surface,
    "--civ-surface2": G.surface2,
    "--civ-head": G.surface2,
    "--civ-border": G.border2 || G.border,
    "--civ-rule": G.border,
    "--civ-link": G.accent || G.blue || "#4a7bff",
    "--civ-input": G.surface2,
    "--civ-note-bg": G.goldDim || G.surface2,
    "--civ-note-bd": G.gold || "#e2b45a",
    "--civ-info-bg": G.accentDim || G.blueDim || G.surface2,
    "--civ-info-bd": G.border2 || G.border,
    color: G.text,
  } : {};
  return <div style={vars}>{children}</div>;
}

export function useApiData(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, deps);
  return { data, loading, error };
}

export const styles = {
  pill: (color, bg) => ({
    display:"inline-block", padding:"2px 8px", borderRadius:99,
    fontSize:11, fontWeight:700, background:bg, color,
    border:`1px solid ${color}33`
  }),
};

export function ApiStatus({ loading, error, count }) {
  if (loading) return <span style={styles.pill("#888","#f0f0f0")}>⏳ Loading live data…</span>;
  if (error)   return <span style={styles.pill("#c00","#fff0f0")} title={error}>⚠️ {error.includes("not configured") ? "API key needed — see setup" : error.slice(0, 70)}</span>;
  if (count != null) return <span style={styles.pill("#1a7a4a","#edf7f1")}>✅ {count} live records</span>;
  return <span style={styles.pill("#1a7a4a","#edf7f1")}>✅ Live data</span>;
}

export const noteBox = {background:C.noteBg,border:`1px solid ${C.noteBd}`,borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:C.text};
export const infoBox = {background:C.infoBg,border:`1px solid ${C.infoBd}`,borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13,color:C.text};
export const panel = {padding:"10px 12px",background:C.surface2,borderRadius:8,border:`1px solid ${C.border}`,color:C.text};
export const chip = {fontSize:12,display:"flex",justifyContent:"space-between",gap:6,padding:"3px 6px",background:C.surface,borderRadius:4,color:C.text};
export const linkStyle = {color:C.link};

export function KeySetupBanner({ name, url }) {
  return (
    <div style={noteBox}>
      <strong>🔑 API key needed:</strong> {name} —{" "}
      <a href={url} target="_blank" rel="noreferrer" style={linkStyle}>Register free →</a>
      {" "}then add it in Vercel → Settings → Environment Variables and redeploy.
    </div>
  );
}

export const inputStyle = {
  padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:6,
  fontSize:13, background:C.input, color:C.text,
};
export const tableStyle = { width:"100%", borderCollapse:"collapse", fontSize:13, color:C.text };
export const btnSmall = {
  padding:"5px 10px", borderRadius:6, border:`1px solid ${C.border}`,
  background:C.surface2, color:C.text, cursor:"pointer", fontSize:12,
};
export const btnPrimary = {...btnSmall, background:"#2756c8", color:"#fff", border:"1px solid #2756c8", padding:"6px 14px"};
export const headRow = {background:C.head};
export const bodyRow = {borderBottom:`1px solid ${C.rule}`};
export const Th = ({children, ...p}) => (
  <th {...p} style={{padding:"7px 10px",textAlign:"left",fontSize:11,fontWeight:700,
    letterSpacing:".04em",textTransform:"uppercase",color:C.textMid,whiteSpace:"nowrap",...(p.style||{})}}>
    {children}
  </th>
);
export const Td = ({children, ...p}) => (
  <td {...p} style={{padding:"8px 10px",verticalAlign:"top",...(p.style||{})}}>{children}</td>
);

export function partyBadge(party) {
  const map = { D:{bg:"#dbeafe",c:"#1d4ed8"}, R:{bg:"#fee2e2",c:"#b91c1c"},
                I:{bg:"#f3e8ff",c:"#7e22ce"}, L:{bg:"#fef9c3",c:"#854d0e"} };
  const s = map[party?.[0]] || {bg:"#f3f4f6",c:"#374151"};
  return {display:"inline-block",padding:"1px 7px",borderRadius:99,fontSize:11,fontWeight:700,background:s.bg,color:s.c};
}
export function voteBadge(pos) {
  if (!pos) return {};
  const p = pos.toLowerCase();
  if (p==="yes"||p==="yea"||p==="aye") return styles.pill("#1a7a4a","#edf7f1");
  if (p==="no"||p==="nay") return styles.pill("#c0392b","#fdf0ee");
  return styles.pill("#888","#f0f0f0");
}
export function riskBadge(level) {
  return {
    high: {display:"inline-block",padding:"2px 7px",borderRadius:5,fontSize:11,fontWeight:700,background:"#fdf0ee",color:"#c0392b"},
    med:  {display:"inline-block",padding:"2px 7px",borderRadius:5,fontSize:11,fontWeight:700,background:"#fef9ee",color:"#b45309"},
    low:  {display:"inline-block",padding:"2px 7px",borderRadius:5,fontSize:11,fontWeight:700,background:"#edf7f1",color:"#1a7a4a"},
  }[level];
}
export function fmt$(n) {
  if (n == null) return "—";
  return "$" + Number(n).toLocaleString("en-US", {maximumFractionDigits:0});
}

export const US_STATES = [
  {code:"AL",name:"Alabama"},{code:"AK",name:"Alaska"},{code:"AZ",name:"Arizona"},
  {code:"AR",name:"Arkansas"},{code:"CA",name:"California"},{code:"CO",name:"Colorado"},
  {code:"CT",name:"Connecticut"},{code:"DE",name:"Delaware"},{code:"FL",name:"Florida"},
  {code:"GA",name:"Georgia"},{code:"HI",name:"Hawaii"},{code:"ID",name:"Idaho"},
  {code:"IL",name:"Illinois"},{code:"IN",name:"Indiana"},{code:"IA",name:"Iowa"},
  {code:"KS",name:"Kansas"},{code:"KY",name:"Kentucky"},{code:"LA",name:"Louisiana"},
  {code:"ME",name:"Maine"},{code:"MD",name:"Maryland"},{code:"MA",name:"Massachusetts"},
  {code:"MI",name:"Michigan"},{code:"MN",name:"Minnesota"},{code:"MS",name:"Mississippi"},
  {code:"MO",name:"Missouri"},{code:"MT",name:"Montana"},{code:"NE",name:"Nebraska"},
  {code:"NV",name:"Nevada"},{code:"NH",name:"New Hampshire"},{code:"NJ",name:"New Jersey"},
  {code:"NM",name:"New Mexico"},{code:"NY",name:"New York"},{code:"NC",name:"North Carolina"},
  {code:"ND",name:"North Dakota"},{code:"OH",name:"Ohio"},{code:"OK",name:"Oklahoma"},
  {code:"OR",name:"Oregon"},{code:"PA",name:"Pennsylvania"},{code:"RI",name:"Rhode Island"},
  {code:"SC",name:"South Carolina"},{code:"SD",name:"South Dakota"},{code:"TN",name:"Tennessee"},
  {code:"TX",name:"Texas"},{code:"UT",name:"Utah"},{code:"VT",name:"Vermont"},
  {code:"VA",name:"Virginia"},{code:"WA",name:"Washington"},{code:"WV",name:"West Virginia"},
  {code:"WI",name:"Wisconsin"},{code:"WY",name:"Wyoming"},
];
