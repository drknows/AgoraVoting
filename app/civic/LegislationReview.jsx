"use client";
/**
 * Legislation Review — summaries of new and updated legislation at every level,
 * each linked to the official record for detailed review.
 *   Federal        — Congress.gov bill summaries (written by the Congressional Research Service)
 *   State          — OpenStates bills with official abstracts (all 50 states)
 *   County / City  — Legistar ordinances & resolutions, with full text on demand
 */
import { useState, useEffect } from "react";
import { fetchCivic, cachedFetch } from "./apiConfig";
import {
  C, useApiData, ApiStatus, KeySetupBanner, styles, inputStyle, btnSmall, btnPrimary,
  panel, infoBox, linkStyle, US_STATES,
} from "./ui";
import { BILL_URL_TYPE, BILL_LABEL, LEGISTAR_PRESETS } from "./VoteSections";

const row = { display:"flex", gap:8, marginBottom:12, flexWrap:"wrap", alignItems:"center" };
const meta = { fontSize:11, color:C.textDim };
const A = ({ href, children }) => href ? <a href={href} target="_blank" rel="noreferrer" style={linkStyle}>{children}</a> : <>{children}</>;
const plain = (html = "") => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
const isoDay = (offset = 0) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
const matches = (q, ...fields) => !q || fields.join(" ").toLowerCase().includes(q);

function Item({ level, title, id, date, status, summary, links = [], tags = [], extra }) {
  const [more, setMore] = useState(false);
  const long = (summary || "").length > 420;
  return (
    <div style={{padding:"12px 0",borderBottom:`1px solid ${C.rule}`}}>
      <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:3}}>
        <span style={styles.pill(level.color, level.bg)}>{level.label}</span>
        {id && <strong style={{fontSize:12}}>{id}</strong>}
        {status && <span style={styles.pill("#888","#f0f0f0")}>{status.slice(0, 60)}</span>}
        {tags.slice(0, 3).map(t => <span key={t} style={{...meta,border:`1px solid ${C.rule}`,borderRadius:99,padding:"0 6px"}}>{t}</span>)}
      </div>
      <div style={{fontWeight:600,fontSize:14}}>{title}</div>
      {date && <div style={meta}>{date}</div>}
      {summary
        ? <div style={{fontSize:13,marginTop:6,lineHeight:1.5,color:C.textMid}}>
            <strong style={{color:C.text}}>Summary: </strong>
            {more || !long ? summary : summary.slice(0, 420) + "…"}
            {long && <button onClick={() => setMore(m => !m)} style={{...btnSmall,marginLeft:6,padding:"1px 6px",fontSize:11}}>{more ? "Less" : "More"}</button>}
          </div>
        : <div style={{...meta,marginTop:6}}>No official summary has been published yet — see the full record.</div>}
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:6,fontSize:12}}>
        {links.filter(l => l.href).map(l => <A key={l.label} href={l.href}>{l.label} →</A>)}
      </div>
      {extra}
    </div>
  );
}

/* ── Federal ─────────────────────────────────────────────────── */
const FED = { label:"Federal", color:"#1d4ed8", bg:"#dbeafe" };
function FederalReview({ q }) {
  const [congress, setCongress] = useState("119");
  const { data, loading, error } = useApiData(
    () => cachedFetch(`sum-${congress}`, async () => {
      const pages = await Promise.all([0, 250].map(offset =>
        fetchCivic("congress", `/summaries/${congress}`, { limit: 250, offset, sort: "updateDate desc" })));
      const seen = new Set();
      return pages.flatMap(p => p.summaries || []).filter(s => {
        const k = `${s.bill?.type}${s.bill?.number}`;
        if (seen.has(k)) return false; seen.add(k); return true;
      });
    }), [congress]
  );
  const items = (data || []).filter(s => matches(q, s.bill?.title, plain(s.text)));
  return (
    <>
      <div style={row}>
        <select value={congress} onChange={e => setCongress(e.target.value)} style={inputStyle}>
          <option value="119">119th Congress (2025–26)</option>
          <option value="118">118th Congress (2023–24)</option>
        </select>
        <ApiStatus loading={loading} error={error} count={data ? items.length : null} />
        <span style={meta}>Newest summaries from the Congressional Research Service</span>
      </div>
      {items.slice(0, 40).map(s => {
        const type = (s.bill?.type || "").toUpperCase();
        const base = `https://www.congress.gov/bill/${congress}th-congress/${BILL_URL_TYPE[type] || "house-bill"}/${s.bill?.number}`;
        return (
          <Item key={`${type}${s.bill?.number}`} level={FED}
            id={`${BILL_LABEL[type] || type} ${s.bill?.number}`}
            title={s.bill?.title || "Untitled bill"}
            date={`${s.actionDesc || "Summary"} · ${s.actionDate || (s.updateDate || "").slice(0, 10)}`}
            summary={plain(s.text)}
            links={[{ label:"Bill overview", href: base }, { label:"Full text", href: `${base}/text` }, { label:"All actions", href: `${base}/all-actions` }]} />
        );
      })}
    </>
  );
}

/* ── State ───────────────────────────────────────────────────── */
const ST = { label:"State", color:"#7e22ce", bg:"#f3e8ff" };
function StateReview({ q }) {
  const [state, setState] = useState("CA");
  const name = US_STATES.find(s => s.code === state)?.name;
  const { data, loading, error } = useApiData(
    () => cachedFetch(`os-review-${state}-${q}`, async () => {
      const d = await fetchCivic("openstates", "/bills", {
        jurisdiction: name, sort: "updated_desc", include: "abstracts", per_page: 20,
        ...(q ? { q } : {}),
      });
      return d.results || [];
    }), [state, q]
  );
  const needsKey = error?.includes("not configured");
  return (
    <>
      {needsKey && <KeySetupBanner name="OpenStates API" url="https://openstates.org/accounts/signup/" />}
      <div style={row}>
        <select value={state} onChange={e => setState(e.target.value)} style={inputStyle}>
          {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
        <ApiStatus loading={loading} error={error} count={data ? data.length : null} />
        <span style={meta}>Most recently updated bills in the {name} legislature</span>
      </div>
      {(data || []).map(b => (
        <Item key={b.id} level={ST} id={b.identifier} title={b.title}
          date={`${b.latest_action_description || "Latest action"} · ${b.latest_action_date?.slice(0, 10) || ""}`}
          tags={b.subject || []}
          summary={(b.abstracts || []).map(a => a.abstract).filter(Boolean).join(" ")}
          links={[{ label:"Bill details & votes", href: b.openstates_url }, { label:"Official legislature page", href: b.sources?.[0]?.url }]} />
      ))}
    </>
  );
}

/* ── County / City ───────────────────────────────────────────── */
const LOC = { label:"Local", color:"#1a7a4a", bg:"#edf7f1" };
function MatterText({ client, id }) {
  const [text, setText] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const versions = await fetchCivic("legistar", `/matters/${id}/versions`, { client }).catch(() => []);
        const version = Array.isArray(versions) && versions.length ? versions[versions.length - 1].Key : "1";
        const t = await fetchCivic("legistar", `/matters/${id}/texts/${version}`, { client }).catch(() => null);
        const body = t?.MatterTextPlain || plain(t?.MatterTextRtf || "") || "";
        setText(body || "No text has been posted for this item — open the official record for attachments.");
      } catch (e) { setErr(e.message); }
    })();
  }, [client, id]);
  if (err) return <div style={{color:"#c00",fontSize:12}}>⚠️ {err}</div>;
  if (text === null) return <div style={meta}>⏳ Loading text…</div>;
  return <div style={{...panel,marginTop:8,fontSize:12,whiteSpace:"pre-wrap",maxHeight:320,overflowY:"auto"}}>{text.slice(0, 8000)}</div>;
}

function LocalReview({ q }) {
  const [preset, setPreset] = useState("chicago");
  const [custom, setCustom] = useState("");
  const [client, setClient] = useState("chicago");
  const [open, setOpen] = useState(null);
  const { data, loading, error } = useApiData(
    () => cachedFetch(`matters-${client}`, () => fetchCivic("legistar", "/matters", {
      client,
      "$filter": `MatterIntroDate ge datetime'${isoDay(-120)}'`,
      "$orderby": "MatterIntroDate desc",
      "$top": 60,
    })), [client]
  );
  const items = (Array.isArray(data) ? data : []).filter(m =>
    matches(q, m.MatterName, m.MatterTitle, m.MatterTypeName, m.MatterBodyName));
  const applyCustom = () => {
    const n = custom.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\.legistar\.com.*$/, "");
    if (n) { setPreset(""); setClient(n); }
  };
  return (
    <>
      <div style={row}>
        <select value={preset} onChange={e => { setPreset(e.target.value); if (e.target.value) setClient(e.target.value); }} style={inputStyle}>
          {LEGISTAR_PRESETS.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
          <option value="">Other…</option>
        </select>
        <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === "Enter" && applyCustom()}
          placeholder="Other city/county (NAME.legistar.com)" style={{...inputStyle,minWidth:220}} />
        <button onClick={applyCustom} style={btnSmall}>Look up</button>
        <ApiStatus loading={loading} error={error} count={data ? items.length : null} />
      </div>
      {items.slice(0, 40).map(m => {
        const record = m.MatterGuid ? `https://${client}.legistar.com/LegislationDetail.aspx?ID=${m.MatterId}&GUID=${m.MatterGuid}` : null;
        const title = m.MatterName && m.MatterName !== m.MatterTitle ? m.MatterName : (m.MatterTitle || "").slice(0, 160);
        return (
          <Item key={m.MatterId} level={LOC} id={m.MatterFile} title={title}
            date={[m.MatterTypeName, m.MatterBodyName, m.MatterIntroDate && `introduced ${m.MatterIntroDate.slice(0, 10)}`,
              m.MatterPassedDate && `passed ${m.MatterPassedDate.slice(0, 10)}`].filter(Boolean).join(" · ")}
            status={m.MatterStatusName}
            summary={m.MatterTitle && m.MatterTitle !== title ? m.MatterTitle : (m.MatterEXText5 || m.MatterEXText1 || "")}
            links={[{ label:"Official record & attachments", href: record }]}
            extra={
              <div style={{marginTop:6}}>
                <button onClick={() => setOpen(open === m.MatterId ? null : m.MatterId)} style={btnSmall}>
                  {open === m.MatterId ? "Hide text" : "Read full text"}
                </button>
                {open === m.MatterId && <MatterText client={client} id={m.MatterId} />}
              </div>
            } />
        );
      })}
      {!loading && !error && items.length === 0 && <div style={{color:C.textDim,fontSize:13,padding:12}}>No legislation introduced in the last 120 days matches.</div>}
    </>
  );
}

/* ── Section shell ───────────────────────────────────────────── */
export function LegislationReview() {
  const [level, setLevel] = useState("federal");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const levels = [
    { id:"federal", label:"🇺🇸 Federal" },
    { id:"state",   label:"🏢 State" },
    { id:"local",   label:"🏙 County & City" },
  ];
  return (
    <div>
      <div style={infoBox}>
        Plain summaries of new and updated legislation, from Congress to your city council. Summaries are the official ones
        published by each government (federal summaries are written by the nonpartisan Congressional Research Service).
        Use the links to read the full text, amendments and votes.
      </div>
      <div style={row}>
        {levels.map(l => <button key={l.id} onClick={() => setLevel(l.id)} style={level === l.id ? btnPrimary : btnSmall}>{l.label}</button>)}
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && setQ(search.trim().toLowerCase())}
          placeholder="Topic or keyword (e.g. housing)…" style={{...inputStyle,minWidth:220}} />
        <button onClick={() => setQ(search.trim().toLowerCase())} style={btnPrimary}>Search</button>
        {q && <button onClick={() => { setQ(""); setSearch(""); }} style={btnSmall}>Clear</button>}
      </div>
      {level === "federal" && <FederalReview q={q} />}
      {level === "state"   && <StateReview q={q} />}
      {level === "local"   && <LocalReview q={q} />}
    </div>
  );
}
