"use client";
import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import {
  fetchPropublica, fetchFEC, fetchCongressGov,
  fetchGovTrack, fetchLDA, fetchOpenStates, fetchCivic,
  cachedFetch, ENDPOINTS, API_KEYS
} from "./apiConfig";

/* ─────────────────────────────────────────────────────────────────
   SHARED UTILITIES
───────────────────────────────────────────────────────────────── */
function useApiData(fetcher, deps = []) {
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

function ApiStatus({ loading, error, count }) {
  if (loading) return <span style={styles.pill("#888","#f0f0f0")}>⏳ Loading live data…</span>;
  if (error)   return <span style={styles.pill("#c00","#fff0f0")} title={error}>⚠️ {error.includes("not configured") ? "API key needed — see setup" : "API error"}</span>;
  if (count != null) return <span style={styles.pill("#1a7a4a","#edf7f1")}>✅ {count} live records</span>;
  return <span style={styles.pill("#1a7a4a","#edf7f1")}>✅ Live data</span>;
}

function KeySetupBanner({ name, url }) {
  return (
    <div style={{background:"#fffbea",border:"1px solid #f59e0b",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13}}>
      <strong>🔑 API key needed:</strong> {name} —{" "}
      <a href={url} target="_blank" rel="noreferrer" style={{color:"#2756c8"}}>Register free →</a>
      {" "}then add to <code>.env.local</code> as shown in <code>app/civic/apiConfig.js</code>.
    </div>
  );
}

const styles = {
  pill: (color, bg) => ({
    display:"inline-block", padding:"2px 8px", borderRadius:99,
    fontSize:11, fontWeight:700, background:bg, color,
    border:`1px solid ${color}33`
  }),
};

/* ─────────────────────────────────────────────────────────────────
   CONGRESS DATA HELPERS — Congress.gov (House) + Senate.gov (Senate)
───────────────────────────────────────────────────────────────── */
const CONGRESS = "119";
// 119th Congress: session 1 = 2025, session 2 = 2026
const DEFAULT_SESSION = new Date().getFullYear() % 2 === 0 ? "2" : "1";
const SESSION_OPTIONS = [
  { v: "2", label: "2026 (2nd session)" },
  { v: "1", label: "2025 (1st session)" },
];

// US_STATES is defined further down this file; it's read at call time.
function stateCode(name) {
  if (!name) return "";
  if (name.length === 2) return name.toUpperCase();
  return US_STATES.find(s => s.name.toLowerCase() === name.toLowerCase())?.code || "";
}

function normalizeMember(m) {
  const terms = m.terms?.item || m.terms || [];
  const last = terms[terms.length - 1] || {};
  const chamber = (last.chamber || "").includes("Senate") ? "senate" : "house";
  const sameChamber = terms.filter(t => (t.chamber || "").includes(chamber === "senate" ? "Senate" : "House"));
  const since = sameChamber.reduce((min, t) => Math.min(min, t.startYear || 9999), 9999);
  const [lastName, first = ""] = (m.name || "").split(",").map(s => s.trim());
  return {
    id: m.bioguideId,
    name: first ? `${first} ${lastName}` : m.name,
    lastName,
    party: (m.partyName || "").charAt(0),
    partyName: m.partyName,
    state: m.state,
    stateCode: stateCode(m.state),
    district: m.district,
    chamber,
    since: since === 9999 ? null : since,
  };
}

async function houseLatest(session, n = 15) {
  const path = `/house-vote/${CONGRESS}/${session}`;
  const first = await fetchCivic("congress", path, { limit: 1 });
  const count = first.pagination?.count || (first.houseRollCallVotes || []).length;
  if (!count) return [];
  const [a, b] = await Promise.all([
    fetchCivic("congress", path, { limit: n, offset: 0 }),
    fetchCivic("congress", path, { limit: n, offset: Math.max(0, count - n) }),
  ]);
  const byNum = new Map();
  [...(a.houseRollCallVotes || []), ...(b.houseRollCallVotes || [])]
    .forEach(v => byNum.set(v.rollCallNumber, v));
  return [...byNum.values()]
    .sort((x, y) => y.rollCallNumber - x.rollCallNumber)
    .slice(0, n)
    .map(v => ({
      number: v.rollCallNumber,
      date: (v.startDate || "").slice(0, 10),
      bill: v.legislationType ? `${v.legislationType} ${v.legislationNumber}` : null,
      question: v.voteQuestion || v.voteType || "",
      result: v.result || "",
    }));
}

async function houseRollCall(session, number) {
  return cachedFetch(`house-rc-${session}-${number}`, async () => {
    const d = await fetchCivic("congress", `/house-vote/${CONGRESS}/${session}/${number}/members`);
    const block = d.houseRollCallVoteMemberVotes || d;
    const members = (block.results || []).map(r => ({
      id: r.bioguideID || r.bioguideId,
      name: `${r.firstName || ""} ${r.lastName || ""}`.trim(),
      lastName: r.lastName,
      party: r.voteParty,
      state: r.voteState,
      vote: r.voteCast,
    }));
    return {
      number,
      question: block.voteQuestion || "",
      result: block.result || "",
      bill: block.legislationType ? `${block.legislationType} ${block.legislationNumber}` : null,
      date: (block.startDate || "").slice(0, 10),
      members,
    };
  }, 60 * 60 * 1000);
}

async function senateLatest(session, n = 15) {
  const d = await fetchCivic("senate", "", { kind: "menu", congress: CONGRESS, session });
  return (d.votes || []).slice(0, n).map(v => ({
    number: v.number,
    date: v.date,
    bill: v.issue || null,
    question: v.question || "",
    title: v.title || "",
    result: v.result || "",
    yeas: v.yeas, nays: v.nays,
  }));
}

async function senateRollCall(session, number) {
  return cachedFetch(`senate-rc-${session}-${number}`, async () => {
    const d = await fetchCivic("senate", "", { kind: "vote", congress: CONGRESS, session, number });
    return { ...d, bill: d.document || null };
  }, 60 * 60 * 1000);
}

function tally(members) {
  const t = { yea: 0, nay: 0, other: 0 };
  members.forEach(m => {
    const v = (m.vote || "").toLowerCase();
    if (v === "yea" || v === "aye" || v === "yes") t.yea++;
    else if (v === "nay" || v === "no") t.nay++;
    else t.other++;
  });
  return t;
}

function DemoKeyNote() {
  if (!API_KEYS.CONGRESS_GOV.startsWith("REPLACE")) return null;
  return (
    <div style={{background:"#fffbea",border:"1px solid #f59e0b",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13}}>
      <strong>ℹ️ House data is using a shared demo key</strong> and may stop after a few lookups.{" "}
      <a href="https://api.data.gov/signup/" target="_blank" rel="noreferrer" style={{color:"#2756c8"}}>Get a free api.data.gov key →</a>
      {" "}and add it as <code>NEXT_PUBLIC_CONGRESS_GOV_API_KEY</code>. Senate votes need no key.
    </div>
  );
}

/* Expandable roll call: who voted how */
function RollCallDetail({ chamber, session, number }) {
  const { data, loading, error } = useApiData(
    () => chamber === "senate" ? senateRollCall(session, number) : houseRollCall(session, number),
    [chamber, session, number]
  );
  const [filter, setFilter] = useState("");
  if (loading) return <div style={{color:"#888",fontSize:13,padding:8}}>⏳ Loading roll call…</div>;
  if (error) return <div style={{color:"#c00",fontSize:13,padding:8}}>⚠️ {error}</div>;
  const t = tally(data.members);
  const shown = data.members.filter(m =>
    !filter || `${m.name} ${m.state} ${m.party}`.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div style={{padding:"10px 12px",background:"#f9f9fb",borderRadius:8,border:"1px solid #e0e0e8"}}>
      {data.question && <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{data.question}</div>}
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:8,fontSize:12}}>
        <span style={styles.pill("#1a7a4a","#edf7f1")}>Yea {t.yea}</span>
        <span style={styles.pill("#c0392b","#fdf0ee")}>Nay {t.nay}</span>
        <span style={styles.pill("#888","#f0f0f0")}>Other {t.other}</span>
        <input value={filter} onChange={e => setFilter(e.target.value)}
          placeholder="Filter by name, state or party…" style={{...inputStyle,fontSize:12,minWidth:200}} />
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:4,maxHeight:320,overflowY:"auto"}}>
        {shown.map((m, i) => (
          <div key={i} style={{fontSize:12,display:"flex",justifyContent:"space-between",gap:6,padding:"3px 6px",background:"#fff",borderRadius:4}}>
            <span>{m.name} <span style={{color:"#888"}}>({m.party}-{m.state})</span></span>
            <span style={voteBadge(m.vote)}>{m.vote}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* A member's recent votes, built from the latest roll calls */
function MemberVoteHistory({ member, session }) {
  const { data, loading, error } = useApiData(async () => {
    if (member.chamber === "senate") {
      const latest = await senateLatest(session, 15);
      const calls = await Promise.all(latest.map(v => senateRollCall(session, v.number).catch(() => null)));
      return latest.map((v, i) => {
        const me = calls[i]?.members.find(m =>
          (m.lastName || "").toLowerCase() === (member.lastName || "").toLowerCase() &&
          m.state === member.stateCode);
        return { ...v, position: me?.vote || "—" };
      });
    }
    const latest = await houseLatest(session, 15);
    const calls = await Promise.all(latest.map(v => houseRollCall(session, v.number).catch(() => null)));
    return latest.map((v, i) => ({
      ...v,
      question: calls[i]?.question || v.question,
      position: calls[i]?.members.find(m => m.id === member.id)?.vote || "—",
    }));
  }, [member.id, session]);

  return (
    <div style={{marginTop:16,padding:14,background:"#f9f9fb",borderRadius:8,border:"1px solid #e0e0e8"}}>
      <div style={{fontWeight:700,marginBottom:8}}>Recent roll-call votes: {member.name}</div>
      {loading && <div style={{color:"#888",fontSize:13}}>⏳ Checking the latest 15 roll calls…</div>}
      {error && <div style={{color:"#c00",fontSize:13}}>⚠️ {error}</div>}
      {data && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={{background:"#f0f0f5"}}>
              <Th>Date</Th><Th>Roll #</Th><Th>Bill</Th><Th>Question</Th><Th>Their vote</Th><Th>Result</Th>
            </tr></thead>
            <tbody>
              {data.map(v => (
                <tr key={v.number} style={{borderBottom:"1px solid #eee"}}>
                  <Td style={{fontSize:12,whiteSpace:"nowrap"}}>{v.date}</Td>
                  <Td style={{fontSize:12}}>{v.number}</Td>
                  <Td style={{fontSize:12,fontWeight:600}}>{v.bill || "—"}</Td>
                  <Td style={{fontSize:12,maxWidth:300}}>{(v.question || v.title || "—").slice(0, 110)}</Td>
                  <Td><span style={voteBadge(v.position)}>{v.position}</span></Td>
                  <Td style={{fontSize:12}}>{v.result}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{fontSize:11,color:"#999",marginTop:6}}>
            Source: {member.chamber === "senate" ? "Senate.gov roll-call records" : "Congress.gov House roll-call votes"}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   VOTING RECORDS — members by state, with their recent votes
───────────────────────────────────────────────────────────────── */
function VotingRecords() {
  const [chamber, setChamber] = useState("senate");
  const [state, setState] = useState("CA");
  const [session, setSession] = useState(DEFAULT_SESSION);
  const [selected, setSelected] = useState(null);

  const { data, loading, error } = useApiData(
    () => cachedFetch(`members-${state}`, async () => {
      const d = await fetchCivic("congress", `/member/congress/${CONGRESS}/${state}`, { currentMember: "true", limit: 250 });
      return (d.members || []).map(normalizeMember);
    }), [state]
  );
  const members = (data || []).filter(m => m.chamber === chamber);
  useEffect(() => setSelected(null), [state, chamber]);

  return (
    <div>
      <DemoKeyNote />
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <select value={chamber} onChange={e => setChamber(e.target.value)} style={inputStyle}>
          <option value="senate">Senate</option>
          <option value="house">House</option>
        </select>
        <select value={state} onChange={e => setState(e.target.value)} style={inputStyle}>
          {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
        <select value={session} onChange={e => setSession(e.target.value)} style={inputStyle}>
          {SESSION_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
        <ApiStatus loading={loading} error={error} count={data ? members.length : null} />
      </div>

      {!loading && !error && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead>
              <tr style={{background:"#f5f5f7"}}>
                <Th>Name</Th><Th>Party</Th><Th>{chamber === "house" ? "District" : "State"}</Th><Th>Serving Since</Th><Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} style={{borderBottom:"1px solid #eee"}}>
                  <Td><strong>{m.name}</strong></Td>
                  <Td><span style={partyBadge(m.party)}>{m.partyName}</span></Td>
                  <Td style={{fontSize:12,color:"#666"}}>{chamber === "house" ? (m.district ?? "At-large") : m.state}</Td>
                  <Td>{m.since || "—"}</Td>
                  <Td>
                    <button onClick={() => setSelected(m)} style={btnSmall}>View Votes</button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <MemberVoteHistory member={selected} session={session} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   FUNDRAISING — FEC API
───────────────────────────────────────────────────────────────── */
function Fundraising() {
  const [office, setOffice] = useState("S");
  const [cycleYear, setCycleYear] = useState("2026");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState({office:"S", cycle:"2026", name:""});

  const { data, loading, error } = useApiData(
    () => cachedFetch(`fec-cands-${query.office}-${query.cycle}-${query.name}`, () =>
      fetchFEC("/candidates/totals/", {
        office: query.office,
        election_year: query.cycle,
        ...(query.name ? {name: query.name.toUpperCase()} : {}),
        per_page: 20,
        sort: "-receipts",
        is_active_candidate: true,
      })
    ), [query]
  );

  const candidates = data?.results || [];
  const needsKey = error?.includes("not configured") || error?.includes("403");

  return (
    <div>
      {API_KEYS.FEC === "DEMO_KEY" && (
        <div style={{background:"#fffbea",border:"1px solid #f59e0b",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13}}>
          <strong>ℹ️ Using FEC DEMO_KEY</strong> — limited to 1,000 requests/day.{" "}
          <a href="https://api.open.fec.gov/developers/" target="_blank" rel="noreferrer" style={{color:"#2756c8"}}>
            Register for a free key →
          </a>
        </div>
      )}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name…" style={{...inputStyle, minWidth:180}}
          onKeyDown={e => e.key==="Enter" && setQuery({office,cycle:cycleYear,name:search})} />
        <select value={office} onChange={e => setOffice(e.target.value)} style={inputStyle}>
          <option value="S">Senate</option>
          <option value="H">House</option>
          <option value="P">President</option>
        </select>
        <select value={cycleYear} onChange={e => setCycleYear(e.target.value)} style={inputStyle}>
          {["2026","2024","2022","2020"].map(y => <option key={y}>{y}</option>)}
        </select>
        <button onClick={() => setQuery({office,cycle:cycleYear,name:search})}
          style={{...btnSmall, background:"#2756c8",color:"#fff",padding:"6px 14px"}}>
          Search
        </button>
        <ApiStatus loading={loading} error={error} count={data?.pagination?.count} />
      </div>

      {!loading && !error && candidates.length > 0 && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={{background:"#f5f5f7"}}>
              <Th>#</Th><Th>Candidate</Th><Th>Party</Th><Th>State</Th>
              <Th>Total Raised</Th><Th>Total Spent</Th><Th>Cash on Hand</Th><Th>Individual Donors</Th>
            </tr></thead>
            <tbody>
              {candidates.map((c, i) => (
                <tr key={c.candidate_id} style={{borderBottom:"1px solid #eee"}}>
                  <Td style={{fontWeight:700,color:"#888"}}>{i+1}</Td>
                  <Td><strong>{c.name}</strong><div style={{fontSize:11,color:"#888"}}>{c.office_full}</div></Td>
                  <Td><span style={partyBadge(c.party)}>{c.party}</span></Td>
                  <Td>{c.state || "—"}</Td>
                  <Td style={{fontWeight:700,color:"#1a7a4a"}}>{fmt$(c.receipts)}</Td>
                  <Td>{fmt$(c.disbursements)}</Td>
                  <Td style={{fontWeight:600}}>{fmt$(c.cash_on_hand_end_period)}</Td>
                  <Td>{c.individual_itemized_contributions ? fmt$(c.individual_itemized_contributions) : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{fontSize:11,color:"#999",marginTop:6}}>
            Source: FEC API · {data?.pagination?.count?.toLocaleString()} total candidates in {cycleYear} cycle
          </div>
        </div>
      )}
      {!loading && !error && candidates.length === 0 && (
        <div style={{color:"#888",fontSize:13,padding:12}}>No candidates found. Try a different search.</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   LEGISLATION TRACKER — Congress.gov
───────────────────────────────────────────────────────────────── */
const BILL_URL_TYPE = {
  HR:"house-bill", S:"senate-bill", HRES:"house-resolution", SRES:"senate-resolution",
  HJRES:"house-joint-resolution", SJRES:"senate-joint-resolution",
  HCONRES:"house-concurrent-resolution", SCONRES:"senate-concurrent-resolution",
};
const BILL_LABEL = {
  HR:"H.R.", S:"S.", HRES:"H.Res.", SRES:"S.Res.", HJRES:"H.J.Res.",
  SJRES:"S.J.Res.", HCONRES:"H.Con.Res.", SCONRES:"S.Con.Res.",
};

function LegislationTracker() {
  const [searchTerm, setSearchTerm] = useState("emergency powers");
  const [query, setQuery] = useState("emergency powers");
  const [congress, setCongress] = useState("119");

  const { data, loading, error } = useApiData(
    () => cachedFetch(`bills-${congress}`, async () => {
      const pages = await Promise.all([0, 250].map(offset =>
        fetchCivic("congress", `/bill/${congress}`, { limit: 250, offset, sort: "updateDate desc" })));
      return pages.flatMap(p => p.bills || []);
    }), [congress]
  );

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const bills = (data || []).filter(b =>
    words.length === 0 || words.some(w => (b.title || "").toLowerCase().includes(w)));

  // Constitutional risk heuristic keywords
  const riskKeywords = {
    high: ["emergency","surveillance","detention","war powers","executive order","martial","restrict press","suspend","censorship"],
    med:  ["purge","voter","registration","gerrymandering","redistrict","immunity","shield","waiver","exemption"],
  };
  function riskLevel(bill) {
    const text = `${bill.title || ""}`.toLowerCase();
    if (riskKeywords.high.some(k => text.includes(k))) return "high";
    if (riskKeywords.med.some(k => text.includes(k))) return "med";
    return "low";
  }
  const fullSearch = `https://www.congress.gov/search?q=${encodeURIComponent(JSON.stringify({congress:[congress],source:"legislation",search:query}))}`;

  return (
    <div>
      <DemoKeyNote />
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="Keywords in bill titles…" style={{...inputStyle, minWidth:220}}
          onKeyDown={e => e.key==="Enter" && setQuery(searchTerm)} />
        <select value={congress} onChange={e => setCongress(e.target.value)} style={inputStyle}>
          <option value="119">119th Congress (2025–26)</option>
          <option value="118">118th Congress (2023–24)</option>
          <option value="117">117th Congress (2021–22)</option>
        </select>
        <button onClick={() => setQuery(searchTerm)}
          style={{...btnSmall,background:"#2756c8",color:"#fff",padding:"6px 14px"}}>
          Search
        </button>
        <ApiStatus loading={loading} error={error} count={data ? bills.length : null} />
      </div>
      <div style={{fontSize:12,color:"#666",marginBottom:10}}>
        Matches titles among the 500 most recently active bills.{" "}
        <a href={fullSearch} target="_blank" rel="noreferrer" style={{color:"#2756c8"}}>Full-text search on Congress.gov →</a>
      </div>

      {!loading && !error && bills.length > 0 && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={{background:"#f5f5f7"}}>
              <Th>Bill</Th><Th>Title</Th><Th>Latest Action</Th><Th>Risk Flag</Th>
            </tr></thead>
            <tbody>
              {bills.slice(0,40).map(b => {
                const risk = riskLevel(b);
                const type = (b.type || "").toUpperCase();
                return (
                  <tr key={`${type}${b.number}`} style={{borderBottom:"1px solid #eee"}}>
                    <Td style={{fontWeight:700,fontSize:12,whiteSpace:"nowrap"}}>
                      <a href={`https://www.congress.gov/bill/${congress}th-congress/${BILL_URL_TYPE[type] || "house-bill"}/${b.number}`}
                        target="_blank" rel="noreferrer" style={{color:"#2756c8"}}>
                        {BILL_LABEL[type] || type} {b.number}
                      </a>
                    </Td>
                    <Td style={{fontSize:12,maxWidth:340}}>{b.title}</Td>
                    <Td style={{fontSize:11,maxWidth:260}}>
                      <div style={{color:"#888"}}>{b.latestAction?.actionDate}</div>
                      {(b.latestAction?.text || "—").slice(0, 120)}
                    </Td>
                    <Td>
                      {risk === "high" && <span style={riskBadge("high")}>⚠️ High Risk</span>}
                      {risk === "med"  && <span style={riskBadge("med")}>🔶 Review</span>}
                      {risk === "low"  && <span style={riskBadge("low")}>✅ Normal</span>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{fontSize:11,color:"#999",marginTop:6}}>
            Source: Congress.gov API · {congress}th Congress · Search: "{query}"
          </div>
        </div>
      )}
      {!loading && !error && bills.length === 0 && (
        <div style={{color:"#888",fontSize:13,padding:12}}>No recently active bills match. Try the full-text search link above.</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   RECENT CONGRESSIONAL VOTES — Senate.gov + Congress.gov
───────────────────────────────────────────────────────────────── */
function RecentVotes() {
  const [chamber, setChamber] = useState("senate");
  const [session, setSession] = useState(DEFAULT_SESSION);
  const [open, setOpen] = useState(null);

  const { data, loading, error } = useApiData(
    () => cachedFetch(`recent-${chamber}-${session}`, () =>
      chamber === "senate" ? senateLatest(session, 25) : houseLatest(session, 25)
    ), [chamber, session]
  );
  const votes = data || [];
  useEffect(() => setOpen(null), [chamber, session]);

  return (
    <div>
      {chamber === "house" && <DemoKeyNote />}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <select value={chamber} onChange={e => setChamber(e.target.value)} style={inputStyle}>
          <option value="senate">Senate</option>
          <option value="house">House</option>
        </select>
        <select value={session} onChange={e => setSession(e.target.value)} style={inputStyle}>
          {SESSION_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
        </select>
        <ApiStatus loading={loading} error={error} count={data ? votes.length : null} />
      </div>

      {!loading && !error && votes.length > 0 && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={{background:"#f5f5f7"}}>
              <Th>Date</Th><Th>Roll #</Th><Th>Question</Th><Th>Bill</Th><Th>Result</Th>
              {chamber === "senate" && <><Th>Yea</Th><Th>Nay</Th></>}
              <Th></Th>
            </tr></thead>
            <tbody>
              {votes.map(v => (
                <Fragment key={v.number}>
                  <tr style={{borderBottom:"1px solid #eee"}}>
                    <Td style={{fontSize:11,whiteSpace:"nowrap"}}>{v.date}</Td>
                    <Td style={{fontSize:12}}>{v.number}</Td>
                    <Td style={{fontSize:12,maxWidth:300}}>
                      {v.question}
                      {v.title && <div style={{color:"#888",fontSize:11}}>{v.title.slice(0, 110)}</div>}
                    </Td>
                    <Td style={{fontSize:12}}>{v.bill || "—"}</Td>
                    <Td><span style={/pass|agreed|confirmed|adopted/i.test(v.result)
                      ? styles.pill("#1a7a4a","#edf7f1")
                      : styles.pill("#c0392b","#fdf0ee")}>
                      {v.result || "—"}
                    </span></Td>
                    {chamber === "senate" && <>
                      <Td style={{color:"#1a7a4a",fontWeight:700}}>{v.yeas}</Td>
                      <Td style={{color:"#c0392b",fontWeight:700}}>{v.nays}</Td>
                    </>}
                    <Td>
                      <button onClick={() => setOpen(open === v.number ? null : v.number)} style={btnSmall}>
                        {open === v.number ? "Hide" : "Who voted"}
                      </button>
                    </Td>
                  </tr>
                  {open === v.number && (
                    <tr><td colSpan={8} style={{padding:"6px 0 12px"}}>
                      <RollCallDetail chamber={chamber} session={session} number={v.number} />
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          <div style={{fontSize:11,color:"#999",marginTop:6}}>
            Source: {chamber === "senate" ? "Senate.gov roll-call votes" : "Congress.gov House roll-call votes"}
          </div>
        </div>
      )}
      {!loading && !error && votes.length === 0 && (
        <div style={{color:"#888",fontSize:13,padding:12}}>No roll-call votes recorded for this session yet.</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   LOBBYING DISCLOSURES — Senate LDA API (no key needed)
───────────────────────────────────────────────────────────────── */
function LobbyingTracker() {
  const [clientSearch, setClientSearch] = useState("");
  const [query, setQuery] = useState("pharmaceutical");

  const { data, loading, error } = useApiData(
    () => cachedFetch(`lda-${query}`, () =>
      fetchLDA("/filings/", {
        client_name: query,
        filing_year: new Date().getFullYear(),
        per_page: 20,
      })
    ), [query]
  );

  const filings = data?.results || [];

  return (
    <div>
      <div style={{background:"#edf7f1",border:"1px solid #1a7a4a44",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13}}>
        <strong>✅ No API key required</strong> — Senate Lobbying Disclosure Act database is public.
      </div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={clientSearch} onChange={e => setClientSearch(e.target.value)}
          placeholder="Search by client/company name…" style={{...inputStyle, minWidth:220}}
          onKeyDown={e => e.key==="Enter" && setQuery(clientSearch)} />
        <button onClick={() => setQuery(clientSearch)}
          style={{...btnSmall,background:"#2756c8",color:"#fff",padding:"6px 14px"}}>
          Search
        </button>
        <ApiStatus loading={loading} error={error} count={data?.count} />
      </div>

      {!loading && !error && filings.length > 0 && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={{background:"#f5f5f7"}}>
              <Th>Client</Th><Th>Registrant (Lobbying Firm)</Th><Th>Period</Th><Th>Amount</Th><Th>Issues</Th>
            </tr></thead>
            <tbody>
              {filings.map((f,i) => (
                <tr key={i} style={{borderBottom:"1px solid #eee"}}>
                  <Td style={{fontWeight:600,fontSize:12}}>{f.client?.name || "—"}</Td>
                  <Td style={{fontSize:12}}>{f.registrant?.name || "—"}</Td>
                  <Td style={{fontSize:11}}>{f.period_of_report || `${f.filing_year} ${f.filing_period}`}</Td>
                  <Td style={{fontWeight:700,color:"#b45309"}}>
                    {f.income ? fmt$(f.income) : f.expenses ? fmt$(f.expenses) : "Disclosed"}
                  </Td>
                  <Td style={{fontSize:11,maxWidth:200,color:"#555"}}>
                    {f.lobbying_activities?.map(a => a.general_issue_code_display).filter(Boolean).slice(0,3).join(", ") || "—"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{fontSize:11,color:"#999",marginTop:6}}>
            Source: Senate LDA API · {data?.count?.toLocaleString()} total filings matching "{query}"
          </div>
        </div>
      )}
      {!loading && !error && filings.length === 0 && (
        <div style={{color:"#888",fontSize:13,padding:12}}>No filings found. Try a company name like "pharmaceutical", "defense", "energy".</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MEMBER SEARCH — Congress.gov
───────────────────────────────────────────────────────────────── */
function MemberSearch() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const { data, loading, error } = useApiData(
    () => cachedFetch("all-current-members", async () => {
      const pages = await Promise.all([0, 250, 500].map(offset =>
        fetchCivic("congress", "/member", { currentMember: "true", limit: 250, offset })));
      return pages.flatMap(p => p.members || []).map(normalizeMember);
    }, 6 * 60 * 60 * 1000), []
  );

  const q = query.trim().toLowerCase();
  const result = q ? (data || []).filter(m =>
    `${m.name} ${m.state} ${m.stateCode}`.toLowerCase().includes(q)) : [];

  return (
    <div>
      <DemoKeyNote />
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Name or state of a member of Congress…" style={{...inputStyle, minWidth:260}}
          onKeyDown={e => e.key==="Enter" && setQuery(search)} />
        <button onClick={() => setQuery(search)}
          style={{...btnSmall,background:"#2756c8",color:"#fff",padding:"6px 14px"}}>
          Search
        </button>
        <ApiStatus loading={loading} error={error} count={q ? result.length : null} />
      </div>
      {q && !loading && !error && result.length === 0 && (
        <div style={{color:"#888",fontSize:13,padding:12}}>No current members match “{query}”.</div>
      )}
      {result.length > 0 && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={{background:"#f5f5f7"}}>
              <Th>Name</Th><Th>Party</Th><Th>State</Th><Th>Chamber</Th><Th>Serving Since</Th><Th>Actions</Th>
            </tr></thead>
            <tbody>
              {result.slice(0, 50).map(m => (
                <tr key={m.id} style={{borderBottom:"1px solid #eee"}}>
                  <Td><strong>{m.name}</strong></Td>
                  <Td><span style={partyBadge(m.party)}>{m.partyName}</span></Td>
                  <Td>{m.state}{m.chamber === "house" && m.district != null ? `-${m.district}` : ""}</Td>
                  <Td style={{fontSize:12,textTransform:"capitalize"}}>{m.chamber}</Td>
                  <Td style={{fontSize:12}}>{m.since || "—"}</Td>
                  <Td style={{whiteSpace:"nowrap"}}>
                    <button onClick={() => setSelected(m)} style={btnSmall}>View Votes</button>{" "}
                    <a href={`https://bioguide.congress.gov/search/bio/${m.id}`} target="_blank" rel="noreferrer"
                      style={{fontSize:12,color:"#2756c8"}}>Bio →</a>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && <MemberVoteHistory member={selected} session={DEFAULT_SESSION} />}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   STATE LEGISLATURE VOTES — OpenStates (all 50 states + DC, PR)
───────────────────────────────────────────────────────────────── */
function StateVotes() {
  const [state, setState] = useState("CA");
  const [searchTerm, setSearchTerm] = useState("");
  const [query, setQuery] = useState({ state: "CA", q: "" });
  const [legislator, setLegislator] = useState("");
  const [open, setOpen] = useState(null);

  const stateName = US_STATES.find(s => s.code === query.state)?.name || query.state;
  const { data, loading, error } = useApiData(
    () => cachedFetch(`os-votes-${query.state}-${query.q}`, async () => {
      const events = [];
      for (let page = 1; page <= 3 && events.length < 20; page++) {
        const d = await fetchCivic("openstates", "/bills", {
          jurisdiction: stateName, sort: "latest_action_desc", include: "votes",
          per_page: 20, page, ...(query.q ? { q: query.q } : {}),
        });
        (d.results || []).forEach(b => (b.votes || []).forEach(v => events.push({
          ...v,
          bill: b.identifier, billTitle: b.title, billUrl: b.openstates_url,
        })));
        if (!d.pagination || page >= d.pagination.max_page) break;
      }
      events.sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""));
      return events;
    }), [query]
  );

  const needsKey = error?.includes("not configured");
  const who = legislator.trim().toLowerCase();
  const rows = (data || [])
    .map(v => ({ ...v, theirs: who ? (v.votes || []).find(p => (p.voter_name || "").toLowerCase().includes(who)) : null }))
    .filter(v => !who || v.theirs);
  const count = (v, opt) => (v.counts || []).find(c => c.option === opt)?.value ?? "—";

  return (
    <div>
      {needsKey && <KeySetupBanner name="OpenStates API" url="https://openstates.org/accounts/signup/" />}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <select value={state} onChange={e => { setState(e.target.value); setQuery({ state: e.target.value, q: searchTerm }); }} style={inputStyle}>
          {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="Bill topic (optional)…" style={{...inputStyle, minWidth:180}}
          onKeyDown={e => e.key==="Enter" && setQuery({ state, q: searchTerm })} />
        <button onClick={() => setQuery({ state, q: searchTerm })}
          style={{...btnSmall,background:"#2756c8",color:"#fff",padding:"6px 14px"}}>
          Search
        </button>
        <input value={legislator} onChange={e => setLegislator(e.target.value)}
          placeholder="Show one legislator's votes…" style={{...inputStyle, minWidth:200}} />
        <ApiStatus loading={loading} error={error} count={data ? rows.length : null} />
      </div>

      {!loading && !error && rows.length > 0 && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={{background:"#f5f5f7"}}>
              <Th>Date</Th><Th>Bill</Th><Th>Motion</Th><Th>Chamber</Th><Th>Result</Th>
              <Th>Yes</Th><Th>No</Th>{who && <Th>Their vote</Th>}<Th></Th>
            </tr></thead>
            <tbody>
              {rows.map(v => (
                <Fragment key={v.id}>
                  <tr style={{borderBottom:"1px solid #eee"}}>
                    <Td style={{fontSize:11,whiteSpace:"nowrap"}}>{(v.start_date || "").slice(0,10)}</Td>
                    <Td style={{fontSize:12,maxWidth:260}}>
                      <a href={v.billUrl} target="_blank" rel="noreferrer" style={{color:"#2756c8",fontWeight:700}}>{v.bill}</a>
                      <div style={{color:"#666",fontSize:11}}>{(v.billTitle || "").slice(0, 100)}</div>
                    </Td>
                    <Td style={{fontSize:12,maxWidth:220}}>{v.motion_text}</Td>
                    <Td style={{fontSize:11}}>{v.organization?.name || v.organization?.classification || "—"}</Td>
                    <Td><span style={/pass/i.test(v.result) ? styles.pill("#1a7a4a","#edf7f1") : styles.pill("#c0392b","#fdf0ee")}>{v.result}</span></Td>
                    <Td style={{color:"#1a7a4a",fontWeight:700}}>{count(v, "yes")}</Td>
                    <Td style={{color:"#c0392b",fontWeight:700}}>{count(v, "no")}</Td>
                    {who && <Td><span style={voteBadge(v.theirs?.option)}>{v.theirs?.option}</span>
                      <div style={{fontSize:10,color:"#888"}}>{v.theirs?.voter_name}</div></Td>}
                    <Td>
                      {(v.votes || []).length > 0 && (
                        <button onClick={() => setOpen(open === v.id ? null : v.id)} style={btnSmall}>
                          {open === v.id ? "Hide" : "Who voted"}
                        </button>
                      )}
                    </Td>
                  </tr>
                  {open === v.id && (
                    <tr><td colSpan={9} style={{padding:"6px 0 12px"}}>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:4,maxHeight:300,overflowY:"auto",padding:10,background:"#f9f9fb",borderRadius:8,border:"1px solid #e0e0e8"}}>
                        {(v.votes || []).map((p, i) => (
                          <div key={i} style={{fontSize:12,display:"flex",justifyContent:"space-between",gap:6,padding:"3px 6px",background:"#fff",borderRadius:4}}>
                            <span>{p.voter_name}</span><span style={voteBadge(p.option)}>{p.option}</span>
                          </div>
                        ))}
                      </div>
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          <div style={{fontSize:11,color:"#999",marginTop:6}}>
            Source: OpenStates (Plural Policy) · {stateName} legislature · most recently acted-on bills with recorded votes
          </div>
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div style={{color:"#888",fontSize:13,padding:12}}>
          {who ? `No recorded votes by “${legislator}” in these bills.` : "No recorded floor or committee votes found for recent bills. Try a topic search."}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   LOCAL VOTES — city councils & county boards via Legistar
───────────────────────────────────────────────────────────────── */
const LEGISTAR_PRESETS = [
  { v:"chicago",     label:"Chicago, IL — City Council" },
  { v:"seattle",     label:"Seattle, WA — City Council" },
  { v:"sfgov",       label:"San Francisco, CA — Board of Supervisors" },
  { v:"phila",       label:"Philadelphia, PA — City Council" },
  { v:"oakland",     label:"Oakland, CA — City Council" },
  { v:"denver",      label:"Denver, CO — City Council" },
  { v:"cook-county", label:"Cook County, IL — Board of Commissioners" },
  { v:"metro",       label:"Los Angeles County Metro — Board" },
];

function isoDay(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 864e5);
  return d.toISOString().slice(0, 10);
}

function LocalMeetingItems({ client, eventId }) {
  const [openItem, setOpenItem] = useState(null);
  const { data, loading, error } = useApiData(
    () => cachedFetch(`lg-items-${client}-${eventId}`, () =>
      fetchCivic("legistar", `/events/${eventId}/eventitems`, { AgendaNote: 1, MinutesNote: 1 })),
    [client, eventId]
  );
  const items = (data || []).filter(i => i.EventItemActionName || i.EventItemPassedFlagName);
  const votes = useApiData(
    () => openItem ? cachedFetch(`lg-votes-${client}-${openItem}`, () =>
      fetchCivic("legistar", `/eventitems/${openItem}/votes`)) : Promise.resolve(null),
    [client, openItem]
  );

  if (loading) return <div style={{color:"#888",fontSize:13,padding:8}}>⏳ Loading agenda actions…</div>;
  if (error) return <div style={{color:"#c00",fontSize:13,padding:8}}>⚠️ {error}</div>;
  if (items.length === 0) return <div style={{color:"#888",fontSize:13,padding:8}}>No recorded actions or votes for this meeting yet (minutes may not be published).</div>;

  return (
    <div style={{padding:"10px 12px",background:"#f9f9fb",borderRadius:8,border:"1px solid #e0e0e8"}}>
      {items.map(i => (
        <div key={i.EventItemId} style={{padding:"8px 0",borderBottom:"1px solid #eee"}}>
          <div style={{display:"flex",gap:8,alignItems:"flex-start",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:240,fontSize:12}}>
              {i.EventItemMatterFile && <strong>{i.EventItemMatterFile} · </strong>}
              {(i.EventItemMatterName || i.EventItemTitle || "").slice(0, 220)}
              <div style={{color:"#666",fontSize:11,marginTop:2}}>
                {i.EventItemActionName}
                {i.EventItemMover && ` · moved by ${i.EventItemMover}`}
                {i.EventItemTally && ` · tally ${i.EventItemTally}`}
              </div>
            </div>
            {i.EventItemPassedFlagName && (
              <span style={/pass/i.test(i.EventItemPassedFlagName) ? styles.pill("#1a7a4a","#edf7f1") : styles.pill("#c0392b","#fdf0ee")}>
                {i.EventItemPassedFlagName}
              </span>
            )}
            <button onClick={() => setOpenItem(openItem === i.EventItemId ? null : i.EventItemId)} style={btnSmall}>
              {openItem === i.EventItemId ? "Hide" : "Roll call"}
            </button>
          </div>
          {openItem === i.EventItemId && (
            <div style={{marginTop:6}}>
              {votes.loading && <span style={{fontSize:12,color:"#888"}}>⏳ Loading…</span>}
              {votes.error && <span style={{fontSize:12,color:"#c00"}}>⚠️ {votes.error}</span>}
              {votes.data && votes.data.length === 0 && <span style={{fontSize:12,color:"#888"}}>No individual roll call recorded (likely a voice vote).</span>}
              {votes.data && votes.data.length > 0 && (
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:4}}>
                  {votes.data.map(v => (
                    <div key={v.VoteId} style={{fontSize:12,display:"flex",justifyContent:"space-between",gap:6,padding:"3px 6px",background:"#fff",borderRadius:4}}>
                      <span>{v.VotePersonName}</span><span style={voteBadge(v.VoteValueName)}>{v.VoteValueName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function LocalVotes() {
  const [preset, setPreset] = useState("chicago");
  const [custom, setCustom] = useState("");
  const [client, setClient] = useState("chicago");
  const [open, setOpen] = useState(null);

  const { data, loading, error } = useApiData(
    () => cachedFetch(`lg-events-${client}`, () =>
      fetchCivic("legistar", "/events", {
        "$filter": `EventDate ge datetime'${isoDay(-120)}' and EventDate lt datetime'${isoDay(1)}'`,
        "$orderby": "EventDate desc",
        "$top": 30,
      })), [client]
  );
  const events = Array.isArray(data) ? data : [];
  useEffect(() => setOpen(null), [client]);

  const applyCustom = () => {
    const name = custom.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\.legistar\.com.*$/, "");
    if (name) { setPreset(""); setClient(name); }
  };

  return (
    <div>
      <div style={{background:"#f0f4ff",border:"1px solid #c0d0f0",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13}}>
        <strong>✅ No API key required.</strong> Covers cities and counties that publish meetings through Legistar.
        If your local agendas are at <code>NAME.legistar.com</code>, type <code>NAME</code> below.
      </div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <select value={preset} onChange={e => { setPreset(e.target.value); if (e.target.value) setClient(e.target.value); }} style={inputStyle}>
          {LEGISTAR_PRESETS.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
          <option value="">Other…</option>
        </select>
        <input value={custom} onChange={e => setCustom(e.target.value)}
          placeholder="Other city/county (e.g. sanjose)" style={{...inputStyle, minWidth:200}}
          onKeyDown={e => e.key==="Enter" && applyCustom()} />
        <button onClick={applyCustom} style={{...btnSmall,background:"#2756c8",color:"#fff",padding:"6px 14px"}}>Look up</button>
        <ApiStatus loading={loading} error={error} count={data ? events.length : null} />
      </div>

      {!loading && !error && events.length > 0 && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={{background:"#f5f5f7"}}>
              <Th>Date</Th><Th>Body</Th><Th>Minutes</Th><Th></Th>
            </tr></thead>
            <tbody>
              {events.map(e => (
                <Fragment key={e.EventId}>
                  <tr style={{borderBottom:"1px solid #eee"}}>
                    <Td style={{fontSize:12,whiteSpace:"nowrap"}}>{(e.EventDate || "").slice(0,10)} <span style={{color:"#888"}}>{e.EventTime}</span></Td>
                    <Td style={{fontSize:12}}>
                      <strong>{e.EventBodyName}</strong>
                      {e.EventInSiteURL && <> · <a href={e.EventInSiteURL} target="_blank" rel="noreferrer" style={{color:"#2756c8"}}>Agenda →</a></>}
                    </Td>
                    <Td style={{fontSize:11,color:"#666"}}>{e.EventMinutesStatusName || "—"}</Td>
                    <Td>
                      <button onClick={() => setOpen(open === e.EventId ? null : e.EventId)} style={btnSmall}>
                        {open === e.EventId ? "Hide" : "Votes & actions"}
                      </button>
                    </Td>
                  </tr>
                  {open === e.EventId && (
                    <tr><td colSpan={4} style={{padding:"6px 0 12px"}}>
                      <LocalMeetingItems client={client} eventId={e.EventId} />
                    </td></tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          <div style={{fontSize:11,color:"#999",marginTop:6}}>
            Source: Legistar public API · {client}.legistar.com · meetings from the last 120 days
          </div>
        </div>
      )}
      {!loading && !error && events.length === 0 && (
        <div style={{color:"#888",fontSize:13,padding:12}}>No meetings found in the last 120 days for “{client}”.</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   INVESTMENTS — FEC Individual Contributions
───────────────────────────────────────────────────────────────── */
function InvestmentsPanel() {
  const [candidateId, setCandidateId] = useState("");
  const [searchName, setSearchName] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [schedA, setSchedA] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchCandidates = async () => {
    if (!searchName) return;
    setLoading(true); setError(null);
    try {
      const d = await fetchFEC("/candidates/search/", {
        name: searchName.toUpperCase(),
        per_page: 10,
        sort: "-receipts",
      });
      setCandidates(d.results || []);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const loadDonors = async (cid) => {
    setCandidateId(cid);
    setLoading(true); setError(null);
    try {
      // Get committee IDs for this candidate
      const cand = await fetchFEC(`/candidate/${cid}/`, {});
      const committeeId = cand.results?.[0]?.principal_committees?.[0]?.committee_id;
      if (!committeeId) throw new Error("No committee found");
      const donors = await fetchFEC("/schedules/schedule_a/", {
        committee_id: committeeId,
        per_page: 20,
        sort: "-contribution_receipt_amount",
        two_year_transaction_period: 2026,
      });
      setSchedA(donors.results || []);
    } catch(e) { setError(e.message); setSchedA([]); }
    finally { setLoading(false); }
  };

  return (
    <div>
      {API_KEYS.FEC === "DEMO_KEY" && (
        <div style={{background:"#fffbea",border:"1px solid #f59e0b",borderRadius:8,padding:"10px 14px",marginBottom:12,fontSize:13}}>
          ℹ️ Using FEC DEMO_KEY — limited rate.{" "}
          <a href="https://api.open.fec.gov/developers/" target="_blank" rel="noreferrer" style={{color:"#2756c8"}}>Get free key →</a>
        </div>
      )}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={searchName} onChange={e => setSearchName(e.target.value)}
          placeholder="Candidate name (e.g. SMITH)…" style={{...inputStyle, minWidth:200}}
          onKeyDown={e => e.key==="Enter" && searchCandidates()} />
        <button onClick={searchCandidates}
          style={{...btnSmall,background:"#2756c8",color:"#fff",padding:"6px 14px"}}>
          Find Candidate
        </button>
        <ApiStatus loading={loading} error={error} />
      </div>

      {candidates.length > 0 && !schedA && (
        <div>
          <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>Select a candidate to view their top donors:</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {candidates.map(c => (
              <button key={c.candidate_id} onClick={() => loadDonors(c.candidate_id)}
                style={{...btnSmall, background:"#f0f4ff", color:"#2756c8", border:"1px solid #c0d0f0"}}>
                {c.name} ({c.party}) — {c.state} {c.office}
              </button>
            ))}
          </div>
        </div>
      )}

      {schedA && (
        <div style={{marginTop:12}}>
          <div style={{fontWeight:700,fontSize:13,marginBottom:6}}>Top individual contributions:</div>
          <div style={{overflowX:"auto"}}>
            <table style={tableStyle}>
              <thead><tr style={{background:"#f5f5f7"}}>
                <Th>Donor</Th><Th>Employer</Th><Th>Occupation</Th><Th>City/State</Th><Th>Amount</Th><Th>Date</Th>
              </tr></thead>
              <tbody>
                {schedA.map((d,i) => (
                  <tr key={i} style={{borderBottom:"1px solid #eee"}}>
                    <Td style={{fontWeight:600,fontSize:12}}>{d.contributor_name || "—"}</Td>
                    <Td style={{fontSize:11}}>{d.contributor_employer || "—"}</Td>
                    <Td style={{fontSize:11}}>{d.contributor_occupation || "—"}</Td>
                    <Td style={{fontSize:11}}>{d.contributor_city}, {d.contributor_state}</Td>
                    <Td style={{fontWeight:700,color:"#1a7a4a"}}>{fmt$(d.contribution_receipt_amount)}</Td>
                    <Td style={{fontSize:11}}>{d.contribution_receipt_date}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{fontSize:11,color:"#999",marginTop:6}}>Source: FEC Schedule A filings</div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   HELPER STYLES & CONSTANTS
───────────────────────────────────────────────────────────────── */
const inputStyle = {
  padding:"6px 10px", border:"1px solid #ddd", borderRadius:6,
  fontSize:13, background:"#fff", color:"#111",
};
const tableStyle = { width:"100%", borderCollapse:"collapse", fontSize:13 };
const btnSmall = {
  padding:"5px 10px", borderRadius:6, border:"1px solid #ddd",
  background:"#f5f5f7", color:"#333", cursor:"pointer", fontSize:12,
};
const Th = ({children, ...p}) => (
  <th {...p} style={{padding:"7px 10px",textAlign:"left",fontSize:11,fontWeight:700,
    letterSpacing:".04em",textTransform:"uppercase",color:"#666",whiteSpace:"nowrap",...(p.style||{})}}>
    {children}
  </th>
);
const Td = ({children, ...p}) => (
  <td {...p} style={{padding:"8px 10px",verticalAlign:"top",...(p.style||{})}}>{children}</td>
);

function partyBadge(party) {
  const map = { D:{bg:"#dbeafe",c:"#1d4ed8"}, R:{bg:"#fee2e2",c:"#b91c1c"},
                I:{bg:"#f3e8ff",c:"#7e22ce"}, L:{bg:"#fef9c3",c:"#854d0e"} };
  const s = map[party?.[0]] || {bg:"#f3f4f6",c:"#374151"};
  return {display:"inline-block",padding:"1px 7px",borderRadius:99,fontSize:11,fontWeight:700,background:s.bg,color:s.c};
}
function voteBadge(pos) {
  if (!pos) return {};
  const p = pos.toLowerCase();
  if (p==="yes"||p==="yea") return styles.pill("#1a7a4a","#edf7f1");
  if (p==="no"||p==="nay") return styles.pill("#c0392b","#fdf0ee");
  return styles.pill("#888","#f0f0f0");
}
function riskBadge(level) {
  return {
    high: {display:"inline-block",padding:"2px 7px",borderRadius:5,fontSize:11,fontWeight:700,background:"#fdf0ee",color:"#c0392b"},
    med:  {display:"inline-block",padding:"2px 7px",borderRadius:5,fontSize:11,fontWeight:700,background:"#fef9ee",color:"#b45309"},
    low:  {display:"inline-block",padding:"2px 7px",borderRadius:5,fontSize:11,fontWeight:700,background:"#edf7f1",color:"#1a7a4a"},
  }[level];
}
function fmt$(n) {
  if (n == null) return "—";
  return "$" + Number(n).toLocaleString("en-US", {maximumFractionDigits:0});
}

const US_STATES = [
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

/* ─────────────────────────────────────────────────────────────────
   MAIN PLATFORM SHELL
───────────────────────────────────────────────────────────────── */
const TABS = [
  { id:"votes",      label:"🗳 Congress Votes",    live:true  },
  { id:"recent",     label:"🏛 Recent Roll Calls", live:true  },
  { id:"state",      label:"🏢 State Votes",       live:true  },
  { id:"local",      label:"🏙 Local Votes",       live:true  },
  { id:"member",     label:"🔍 Member Search",     live:true  },
  { id:"bills",      label:"📋 Legislation",       live:true  },
  { id:"fundraising",label:"💰 Fundraising",       live:true  },
  { id:"donors",     label:"📈 Donor Lookup",      live:true  },
  { id:"lobbying",   label:"🤝 Lobbying",          live:true  },
  { id:"crowdsource",label:"🗣 Crowdsource",       live:false },
  { id:"experts",    label:"🎓 Expert Analysis",   live:false },
  { id:"arrests",    label:"🔒 Arrests",           live:false },
  { id:"ethics",     label:"⚖️ Ethics",            live:false },
];

export default function CivicPlatform() {
  const [activeTab, setActiveTab] = useState("votes");

  const tab = TABS.find(t => t.id === activeTab);

  return (
    <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
      background:"#f5f4f1",minHeight:"100vh",color:"#1a1a1e"}}>

      {/* Header */}
      <div style={{background:"#0e1420",padding:"14px 20px",display:"flex",
        alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{color:"#fff",fontWeight:800,fontSize:18,letterSpacing:"-.02em"}}>
          <span style={{color:"#4b7ef0"}}>Anti-Sociopath</span> Society
          <span style={{fontSize:11,fontWeight:400,color:"#888",marginLeft:8}}>
            antisociopathsociety.com
          </span>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <span style={{...styles.pill("#4ade80","#0b1f12"),fontSize:10}}>
            🔴 LIVE DATA
          </span>
          <a href="/" style={{color:"#888",fontSize:12,textDecoration:"none"}}>
            ← Voting Platform
          </a>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{background:"#fff",borderBottom:"1px solid #e0e0e8",
        padding:"0 16px",display:"flex",gap:2,flexWrap:"wrap",overflowX:"auto"}}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              padding:"10px 12px", border:"none", background:"none",
              fontSize:12, fontWeight:600, cursor:"pointer",
              color: activeTab===t.id ? "#2756c8" : "#555",
              borderBottom: activeTab===t.id ? "2px solid #2756c8" : "2px solid transparent",
              whiteSpace:"nowrap",
              display:"flex",alignItems:"center",gap:4,
            }}>
            {t.label}
            {t.live && <span style={{...styles.pill("#1a7a4a","#edf7f1"),fontSize:9,padding:"1px 4px"}}>LIVE</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{maxWidth:1100,margin:"0 auto",padding:"20px 16px"}}>

        {/* API Setup Guide */}
        {(activeTab==="votes"||activeTab==="member"||activeTab==="bills"||activeTab==="recent"||activeTab==="state") &&
          (API_KEYS.CONGRESS_GOV.startsWith("REPLACE") || API_KEYS.OPENSTATES.startsWith("REPLACE")) && (
          <div style={{background:"#fff",border:"1px solid #e0e0e8",borderRadius:8,
            padding:"14px 16px",marginBottom:16}}>
            <div style={{fontWeight:700,marginBottom:8}}>🚀 Quick Setup — Get Live Data in 5 Minutes</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
              {[
                {num:1,name:"api.data.gov key",url:"https://api.data.gov/signup/",env:"NEXT_PUBLIC_CONGRESS_GOV_API_KEY",note:"Congress.gov: House votes, members, bills (same key also works for FEC)"},
                {num:2,name:"FEC API",url:"https://api.data.gov/signup/",env:"NEXT_PUBLIC_FEC_API_KEY",note:"Campaign finance, fundraising, donor data — use the same api.data.gov key"},
                {num:3,name:"OpenStates API",url:"https://openstates.org/accounts/signup/",env:"NEXT_PUBLIC_OPENSTATES_API_KEY",note:"State legislature bills and roll-call votes, all 50 states"},
              ].map(k => (
                <div key={k.num} style={{background:"#f9f9fb",borderRadius:6,padding:"10px 12px",border:"1px solid #e8e8f0"}}>
                  <div style={{fontWeight:700,fontSize:12,marginBottom:4}}>Step {k.num}: {k.name}</div>
                  <div style={{fontSize:11,color:"#666",marginBottom:6}}>{k.note}</div>
                  <a href={k.url} target="_blank" rel="noreferrer"
                    style={{fontSize:11,color:"#2756c8"}}>Register free →</a>
                  <div style={{fontSize:10,color:"#999",marginTop:4,fontFamily:"monospace",
                    background:"#eef",padding:"2px 5px",borderRadius:3}}>
                    {k.env}=your_key_here
                  </div>
                </div>
              ))}
            </div>
            <div style={{fontSize:11,color:"#888",marginTop:10}}>
              Add keys in Vercel → Settings → Environment Variables, then redeploy.
              Senate votes, local votes (Legistar) and lobbying (Senate LDA) need no key.
            </div>
          </div>
        )}

        {/* Active section */}
        <div style={{background:"#fff",border:"1px solid #e0e0e8",borderRadius:10,
          padding:"16px 18px",boxShadow:"0 2px 8px rgba(0,0,0,.05)"}}>
          <div style={{fontWeight:800,fontSize:16,marginBottom:14,paddingBottom:10,
            borderBottom:"1px solid #eee",display:"flex",alignItems:"center",gap:8}}>
            {tab?.label}
            {tab?.live && <span style={styles.pill("#1a7a4a","#edf7f1")}>LIVE</span>}
          </div>

          {activeTab === "votes"       && <VotingRecords />}
          {activeTab === "recent"      && <RecentVotes />}
          {activeTab === "state"       && <StateVotes />}
          {activeTab === "local"       && <LocalVotes />}
          {activeTab === "member"      && <MemberSearch />}
          {activeTab === "bills"       && <LegislationTracker />}
          {activeTab === "fundraising" && <Fundraising />}
          {activeTab === "donors"      && <InvestmentsPanel />}
          {activeTab === "lobbying"    && <LobbyingTracker />}

          {!tab?.live && (
            <div style={{padding:"24px 0",textAlign:"center",color:"#888"}}>
              <div style={{fontSize:32,marginBottom:8}}>🏗</div>
              <div style={{fontWeight:700,marginBottom:4}}>Coming in Phase 2</div>
              <div style={{fontSize:13}}>This section requires human curation or partnerships with data providers.
              <br/>See the platform roadmap for timeline.</div>
            </div>
          )}
        </div>

        <div style={{fontSize:11,color:"#999",marginTop:12,textAlign:"center"}}>
          Data sources: Congress.gov · Senate.gov · OpenStates · Legistar · FEC API · Senate LDA · All public records.
          <br/>Anti-Sociopath Society is a nonpartisan civic transparency platform.
        </div>
      </div>
    </div>
  );
}
