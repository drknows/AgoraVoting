"use client";
/**
 * Phase 2 civic sections, shared by /civic and the main Civic Transparency tab.
 *   Crowdsource     — citizen proposals, votes, comments (/api/crowd, Postgres)
 *   Expert Analysis — CBO, GAO and CRS nonpartisan reports
 *   Meetings        — congressional committee meetings & hearings (Congress.gov)
 *   Arrests         — DOJ press releases about charged/convicted public officials
 *   Ethics          — Google Fact Check claims + official ethics bodies
 */
import { useState, useEffect, Fragment } from "react";
import { fetchCivic, cachedFetch } from "./apiConfig";
import {
  C, useApiData, ApiStatus, KeySetupBanner, styles, inputStyle, tableStyle, btnSmall, btnPrimary,
  headRow, bodyRow, panel, noteBox, infoBox, Th, Td, linkStyle,
} from "./ui";

const CONGRESS = "119";
const row = { display:"flex", gap:8, marginBottom:12, flexWrap:"wrap", alignItems:"center" };
const card = { ...panel, marginBottom:10 };
const meta = { fontSize:11, color:C.textDim };
const A = ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" style={linkStyle}>{children}</a>;

/* ─────────────────────────────────────────────────────────────────
   CROWDSOURCE DEMOCRACY
───────────────────────────────────────────────────────────────── */
const CATEGORIES = [
  "Voting & Elections", "Government Ethics", "Civil Rights", "Economy & Jobs",
  "Healthcare", "Education", "Environment", "Housing", "Public Safety",
  "Technology & Privacy", "Local Issues", "Other",
];

async function crowd(method, payload) {
  const res = method === "GET"
    ? await fetch(`/api/crowd?${new URLSearchParams(payload)}`)
    : await fetch("/api/crowd", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(body.error || `Request failed (${res.status})`); e.setup = body.setup; throw e; }
  return body;
}

function loadMyVotes() {
  try { return JSON.parse(localStorage.getItem("agora-crowd-votes") || "{}"); } catch { return {}; }
}
function saveMyVotes(v) {
  try { localStorage.setItem("agora-crowd-votes", JSON.stringify(v)); } catch {}
}

function IdeaComments({ id, onCount }) {
  const [comments, setComments] = useState(null);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [stance, setStance] = useState("support");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    crowd("GET", { id }).then(d => setComments(d.comments)).catch(e => setErr(e.message));
  }, [id]);

  const post = async () => {
    setBusy(true); setErr(null);
    try {
      const d = await crowd("POST", { action: "comment", id, text, name, stance });
      setComments(c => [d.comment, ...(c || [])]); setText(""); onCount?.(d.idea.comments);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const stanceStyle = { support: styles.pill("#1a7a4a","#edf7f1"), oppose: styles.pill("#c0392b","#fdf0ee"), question: styles.pill("#2756c8","#eef3ff") };

  return (
    <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.rule}`}}>
      <div style={row}>
        <select value={stance} onChange={e => setStance(e.target.value)} style={inputStyle}>
          <option value="support">👍 Support</option>
          <option value="oppose">👎 Oppose</option>
          <option value="question">❓ Question</option>
        </select>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name (optional)" maxLength={40} style={{...inputStyle,width:160}} />
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} maxLength={1000} rows={2}
        placeholder="Add to the debate…" style={{...inputStyle,width:"100%",boxSizing:"border-box",fontFamily:"inherit"}} />
      <div style={{...row,marginTop:6}}>
        <button onClick={post} disabled={busy || text.trim().length < 3} style={btnPrimary}>{busy ? "Posting…" : "Post comment"}</button>
        {err && <span style={{color:"#c00",fontSize:12}}>⚠️ {err}</span>}
      </div>
      {comments === null && !err && <div style={meta}>⏳ Loading comments…</div>}
      {(comments || []).map((c, i) => (
        <div key={i} style={{padding:"6px 0",borderBottom:`1px solid ${C.rule}`,fontSize:13}}>
          <span style={stanceStyle[c.stance]}>{c.stance}</span>{" "}
          <strong>{c.name}</strong> <span style={meta}>{new Date(c.created).toLocaleDateString()}</span>
          <div style={{marginTop:3,whiteSpace:"pre-wrap"}}>{c.text}</div>
        </div>
      ))}
    </div>
  );
}

export function Crowdsource() {
  const [sort, setSort] = useState("top");
  const [category, setCategory] = useState("");
  const [ideas, setIdeas] = useState(null);
  const [error, setError] = useState(null);
  const [setup, setSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "Voting & Elections", name: "" });
  const [formErr, setFormErr] = useState(null);
  const [open, setOpen] = useState(null);
  const [myVotes, setMyVotes] = useState({});

  useEffect(() => setMyVotes(loadMyVotes()), []);
  const load = () => {
    setLoading(true); setError(null);
    crowd("GET", { sort, ...(category ? { category } : {}) })
      .then(d => { setIdeas(d.ideas); setLoading(false); })
      .catch(e => { setError(e.message); setSetup(!!e.setup); setLoading(false); });
  };
  useEffect(load, [sort, category]);

  const submit = async () => {
    setFormErr(null);
    try {
      const d = await crowd("POST", { action: "create", ...form });
      setIdeas(list => [d.idea, ...(list || [])]);
      setForm(f => ({ ...f, title: "", body: "" })); setShowForm(false);
    } catch (e) { setFormErr(e.message); }
  };
  const vote = async (id, dir) => {
    const next = myVotes[id] === dir ? 0 : dir;
    try {
      const d = await crowd("POST", { action: "vote", id, dir: next });
      setIdeas(list => list.map(i => i.id === id ? d.idea : i));
      const mv = { ...myVotes, [id]: next }; setMyVotes(mv); saveMyVotes(mv);
    } catch (e) { setError(e.message); }
  };

  if (setup) return (
    <div style={noteBox}>
      <strong>🗄 One-time setup needed:</strong> Crowdsource stores proposals in Agora's database.
      In Vercel, open this project → <strong>Storage</strong> → <strong>Create Database</strong> → <strong>Neon</strong> (free plan)
      → connect it to this project, then <strong>Redeploy</strong>. No code changes are needed.
    </div>
  );

  return (
    <div>
      <div style={infoBox}>
        Propose laws your community needs, vote ideas up or down, and debate them. Popular proposals rise to the top.
        One vote per person per proposal.
      </div>
      <div style={row}>
        <select value={sort} onChange={e => setSort(e.target.value)} style={inputStyle}>
          <option value="top">Most supported</option>
          <option value="new">Newest</option>
        </select>
        <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
          <option value="">All topics</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={() => setShowForm(s => !s)} style={btnPrimary}>{showForm ? "Cancel" : "＋ Propose an idea"}</button>
        <ApiStatus loading={loading} error={error} count={ideas ? ideas.length : null} />
      </div>

      {showForm && (
        <div style={card}>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} maxLength={120}
            placeholder="Proposal title — e.g. Ban stock trading by members of Congress"
            style={{...inputStyle,width:"100%",boxSizing:"border-box",marginBottom:8,fontWeight:600}} />
          <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} maxLength={2000} rows={4}
            placeholder="What problem does it solve, and what should the law do?"
            style={{...inputStyle,width:"100%",boxSizing:"border-box",fontFamily:"inherit",marginBottom:8}} />
          <div style={row}>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} maxLength={40}
              placeholder="Your name (optional)" style={{...inputStyle,width:180}} />
            <button onClick={submit} style={btnPrimary}>Submit proposal</button>
            <span style={meta}>{form.body.length}/2000</span>
          </div>
          {formErr && <div style={{color:"#c00",fontSize:12}}>⚠️ {formErr}</div>}
        </div>
      )}

      {ideas && ideas.length === 0 && !loading && (
        <div style={{color:C.textDim,fontSize:13,padding:12}}>No proposals yet — be the first to suggest one.</div>
      )}
      {(ideas || []).map(i => (
        <div key={i.id} style={card}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,minWidth:44}}>
              <button onClick={() => vote(i.id, 1)} aria-label="Support"
                style={{...btnSmall,padding:"2px 8px",background:myVotes[i.id]===1?"#1a7a4a":btnSmall.background,color:myVotes[i.id]===1?"#fff":C.text}}>▲</button>
              <strong style={{fontSize:15}}>{(i.up || 0) - (i.down || 0)}</strong>
              <button onClick={() => vote(i.id, -1)} aria-label="Oppose"
                style={{...btnSmall,padding:"2px 8px",background:myVotes[i.id]===-1?"#c0392b":btnSmall.background,color:myVotes[i.id]===-1?"#fff":C.text}}>▼</button>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:14}}>{i.title}</div>
              <div style={meta}>{i.category} · by {i.name} · {new Date(i.created).toLocaleDateString()} · 👍 {i.up || 0} 👎 {i.down || 0}</div>
              <div style={{fontSize:13,marginTop:6,whiteSpace:"pre-wrap"}}>
                {open === i.id ? i.body : i.body.slice(0, 240) + (i.body.length > 240 ? "…" : "")}
              </div>
              <button onClick={() => setOpen(open === i.id ? null : i.id)} style={{...btnSmall,marginTop:8}}>
                {open === i.id ? "Close debate" : `💬 Debate (${i.comments || 0})`}
              </button>
              {open === i.id && <IdeaComments id={i.id}
                onCount={n => setIdeas(list => list.map(x => x.id === i.id ? { ...x, comments: n } : x))} />}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   EXPERT ANALYSIS — CBO, GAO, CRS
───────────────────────────────────────────────────────────────── */
const EXPERT_SOURCES = [
  { id:"crs", label:"Congressional Research Service", note:"Congress's own nonpartisan policy experts." },
  { id:"cbo", label:"Congressional Budget Office", note:"Cost estimates and budget analysis of bills." },
  { id:"gao", label:"Government Accountability Office", note:"Audits and investigations of federal programs." },
];

async function loadExpert(source) {
  if (source === "crs") {
    const d = await fetchCivic("congress", "/crsreport", { limit: 30 });
    const list = d.CRSReports || d.crsReports || d.reports || [];
    return list.map(r => ({
      title: r.title,
      date: (r.publishDate || r.updateDate || "").slice(0, 10),
      url: r.id ? `https://www.congress.gov/crs-product/${r.id}` : r.url,
      summary: [r.contentType, r.status].filter(Boolean).join(" · "),
    }));
  }
  const d = await fetchCivic("rss", "", { feed: source });
  return d.items || [];
}

export function ExpertAnalysis() {
  const [source, setSource] = useState("crs");
  const [filter, setFilter] = useState("");
  const { data, loading, error } = useApiData(
    () => cachedFetch(`expert-${source}`, () => loadExpert(source)), [source]
  );
  const f = filter.trim().toLowerCase();
  const items = (data || []).filter(i => !f || `${i.title} ${i.summary}`.toLowerCase().includes(f));
  const src = EXPERT_SOURCES.find(s => s.id === source);

  return (
    <div>
      <div style={row}>
        {EXPERT_SOURCES.map(s => (
          <button key={s.id} onClick={() => setSource(s.id)}
            style={source === s.id ? btnPrimary : btnSmall}>{s.label}</button>
        ))}
      </div>
      <div style={row}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter by topic…" style={{...inputStyle,minWidth:220}} />
        <span style={meta}>{src.note}</span>
        <ApiStatus loading={loading} error={error} count={data ? items.length : null} />
      </div>
      {items.map((i, n) => (
        <div key={n} style={{padding:"9px 0",borderBottom:`1px solid ${C.rule}`}}>
          <div style={{fontWeight:600,fontSize:13}}><A href={i.url}>{i.title}</A></div>
          <div style={meta}>{i.date}{i.summary ? ` · ${i.summary.slice(0, 220)}` : ""}</div>
        </div>
      ))}
      {!loading && !error && items.length === 0 && <div style={{color:C.textDim,fontSize:13,padding:12}}>No reports match.</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MEETINGS — congressional committee meetings & hearings
───────────────────────────────────────────────────────────────── */
async function loadMeetings(chamber) {
  const d = await fetchCivic("congress", `/committee-meeting/${CONGRESS}/${chamber}`, { limit: 15 });
  const list = d.committeeMeetings || [];
  const details = await Promise.all(list.map(m =>
    cachedFetch(`mtg-${chamber}-${m.eventId}`, () =>
      fetchCivic("congress", `/committee-meeting/${CONGRESS}/${chamber}/${m.eventId}`), 60 * 60 * 1000)
      .then(x => x.committeeMeeting || {}).catch(() => ({}))
  ));
  return list.map((m, i) => {
    const x = details[i];
    const loc = x.location || {};
    return {
      id: m.eventId,
      date: x.date || m.updateDate || "",
      title: x.title || "(details unavailable)",
      type: x.type || "",
      status: x.meetingStatus || "",
      committees: (x.committees?.item || x.committees || []).map(c => c.name).filter(Boolean).join("; "),
      where: [loc.room, loc.building].filter(Boolean).join(", "),
      url: `https://www.congress.gov/event/${CONGRESS}th-congress/${chamber}-event/${m.eventId}`,
    };
  }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

export function Meetings() {
  const [chamber, setChamber] = useState("house");
  const { data, loading, error } = useApiData(
    () => cachedFetch(`meetings-${chamber}`, () => loadMeetings(chamber)), [chamber]
  );
  const now = new Date().toISOString();
  return (
    <div>
      <div style={row}>
        <select value={chamber} onChange={e => setChamber(e.target.value)} style={inputStyle}>
          <option value="house">House committees</option>
          <option value="senate">Senate committees</option>
        </select>
        <ApiStatus loading={loading} error={error} count={data ? data.length : null} />
      </div>
      <div style={{...meta,marginBottom:10}}>
        Most recently scheduled or updated committee meetings and hearings. For city council and county board meetings, see <strong>Local Votes</strong>.
      </div>
      {data && data.length > 0 && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={headRow}><Th>When</Th><Th>Meeting</Th><Th>Committee</Th><Th>Status</Th></tr></thead>
            <tbody>
              {data.map(m => (
                <tr key={m.id} style={bodyRow}>
                  <Td style={{fontSize:12,whiteSpace:"nowrap"}}>
                    {m.date ? new Date(m.date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—"}
                    {m.date > now && <div><span style={styles.pill("#2756c8","#eef3ff")}>Upcoming</span></div>}
                  </Td>
                  <Td style={{fontSize:12,maxWidth:380}}>
                    <A href={m.url}>{m.title}</A>
                    <div style={meta}>{[m.type, m.where].filter(Boolean).join(" · ")}</div>
                  </Td>
                  <Td style={{fontSize:12,maxWidth:220}}>{m.committees || "—"}</Td>
                  <Td style={{fontSize:11}}>{m.status || "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{...meta,marginTop:6}}>Source: Congress.gov committee meetings</div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ARRESTS & INDICTMENTS — DOJ press releases about public officials
───────────────────────────────────────────────────────────────── */
const STAGE_STYLE = {
  "Charged":        styles.pill("#b45309","#fef9ee"),
  "Indicted":       styles.pill("#b45309","#fef9ee"),
  "Pleaded guilty": styles.pill("#c0392b","#fdf0ee"),
  "Convicted":      styles.pill("#c0392b","#fdf0ee"),
  "Sentenced":      styles.pill("#7e22ce","#f3e8ff"),
  "Update":         styles.pill("#888","#f0f0f0"),
};

export function Arrests() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const { data, loading, error } = useApiData(
    () => cachedFetch(`doj-${query}`, () => fetchCivic("doj", "", { q: query, pages: 4 })), [query]
  );
  const items = (data?.items || []).filter(i => !stage || i.stage === stage);

  return (
    <div>
      <div style={noteBox}>
        <strong>⚖️ Charges are allegations.</strong> Anyone charged or indicted is presumed innocent unless and until proven guilty in court.
        Entries come directly from U.S. Department of Justice press releases; follow the link for the official record.
      </div>
      <div style={row}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && setQuery(search)}
          placeholder="Name, office or state…" style={{...inputStyle,minWidth:220}} />
        <button onClick={() => setQuery(search)} style={btnPrimary}>Search</button>
        <select value={stage} onChange={e => setStage(e.target.value)} style={inputStyle}>
          <option value="">All stages</option>
          {Object.keys(STAGE_STYLE).map(s => <option key={s}>{s}</option>)}
        </select>
        <ApiStatus loading={loading} error={error} count={data ? items.length : null} />
      </div>
      {data && <div style={{...meta,marginBottom:8}}>Scanned the {data.scanned} most recent DOJ press releases for cases involving public officials or public corruption.</div>}
      {items.map((i, n) => (
        <div key={n} style={{padding:"10px 0",borderBottom:`1px solid ${C.rule}`}}>
          <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
            <span style={STAGE_STYLE[i.stage]}>{i.stage}</span>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:13}}><A href={i.url}>{i.title}</A></div>
              <div style={meta}>{i.date} · {i.office}</div>
              <div style={{fontSize:12,marginTop:4,color:C.textMid}}>{i.summary}</div>
            </div>
          </div>
        </div>
      ))}
      {!loading && !error && items.length === 0 && (
        <div style={{color:C.textDim,fontSize:13,padding:12}}>No matching cases in recent DOJ releases.</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   ETHICS & FACT-CHECK — Google Fact Check Tools + official ethics bodies
───────────────────────────────────────────────────────────────── */
const ETHICS_BODIES = [
  { name:"House Committee on Ethics", url:"https://ethics.house.gov/", note:"Investigations and reports on House members and staff." },
  { name:"Senate Select Committee on Ethics", url:"https://www.ethics.senate.gov/", note:"Complaints, rulings and reports on senators." },
  { name:"U.S. Office of Government Ethics", url:"https://www.oge.gov/", note:"Executive-branch ethics rules and financial disclosures." },
  { name:"Oversight.gov (Inspectors General)", url:"https://www.oversight.gov/", note:"Reports from every federal Inspector General." },
];

function ratingStyle(r = "") {
  const t = r.toLowerCase();
  if (/false|pants|incorrect|wrong|fake|misleading|no evidence|four pinocchios/.test(t)) return styles.pill("#c0392b","#fdf0ee");
  if (/mostly true|^true|correct|accurate|geppetto/.test(t)) return styles.pill("#1a7a4a","#edf7f1");
  return styles.pill("#b45309","#fef9ee");
}

export function EthicsFactCheck() {
  const [search, setSearch] = useState("senator");
  const [query, setQuery] = useState("senator");
  const [age, setAge] = useState("365");
  const { data, loading, error } = useApiData(
    () => cachedFetch(`fc-${query}-${age}`, () => fetchCivic("factcheck", "", { q: query, maxAgeDays: age })), [query, age]
  );
  const needsKey = error?.includes("not configured");
  const claims = data?.claims || [];

  return (
    <div>
      {needsKey && <KeySetupBanner name="Google Fact Check Tools API (free) — add as GOOGLE_FACTCHECK_API_KEY"
        url="https://developers.google.com/fact-check/tools/api" />}
      <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>Fact checks of public statements</div>
      <div style={row}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && setQuery(search)}
          placeholder="Politician or topic…" style={{...inputStyle,minWidth:220}} />
        <button onClick={() => setQuery(search)} style={btnPrimary}>Search</button>
        <select value={age} onChange={e => setAge(e.target.value)} style={inputStyle}>
          <option value="30">Past month</option>
          <option value="365">Past year</option>
          <option value="1825">Past 5 years</option>
        </select>
        <ApiStatus loading={loading} error={error} count={data ? claims.length : null} />
      </div>
      {claims.map((c, n) => (
        <div key={n} style={{padding:"10px 0",borderBottom:`1px solid ${C.rule}`}}>
          <div style={{fontSize:13}}>“{c.text}”</div>
          <div style={meta}>{c.claimant ? `Claimed by ${c.claimant}` : "Claimant not specified"}{c.claimDate ? ` · ${c.claimDate.slice(0, 10)}` : ""}</div>
          {(c.claimReview || []).slice(0, 3).map((r, k) => (
            <div key={k} style={{marginTop:4,fontSize:12,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <span style={ratingStyle(r.textualRating)}>{r.textualRating || "Reviewed"}</span>
              <A href={r.url}>{r.publisher?.name || r.publisher?.site || "Fact-check"}</A>
              {r.reviewDate && <span style={meta}>{r.reviewDate.slice(0, 10)}</span>}
            </div>
          ))}
        </div>
      ))}
      {!loading && !error && claims.length === 0 && <div style={{color:C.textDim,fontSize:13,padding:12}}>No fact checks found for that search.</div>}
      {data && <div style={{...meta,marginTop:6}}>Source: Google Fact Check Tools — ratings by independent fact-checkers (PolitiFact, FactCheck.org, AP, Reuters and others).</div>}

      <div style={{fontWeight:700,fontSize:13,margin:"18px 0 8px"}}>Official ethics & oversight records</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(230px,1fr))",gap:8}}>
        {ETHICS_BODIES.map(b => (
          <div key={b.name} style={panel}>
            <div style={{fontWeight:700,fontSize:12}}><A href={b.url}>{b.name} →</A></div>
            <div style={{...meta,marginTop:3}}>{b.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
