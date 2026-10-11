"use client";
/**
 * Vote-tracking sections shared by the /civic page and the main platform's
 * Civic Transparency tab.
 *   Congress  — Congress.gov (House, members, bills) + Senate.gov (Senate roll calls)
 *   States    — OpenStates (all 50 legislatures)
 *   Local     — Legistar (city councils & county boards that publish through it)
 */
import { useState, useEffect, Fragment } from "react";
import { fetchCivic, cachedFetch, API_KEYS } from "./apiConfig";
import {
  C, useApiData, ApiStatus, KeySetupBanner, styles, inputStyle, tableStyle, btnSmall, btnPrimary,
  headRow, bodyRow, panel, chip, noteBox, infoBox, Th, Td, partyBadge, voteBadge, riskBadge, US_STATES,
} from "./ui";

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
    <div style={noteBox}>
      <strong>ℹ️ House data is using a shared demo key</strong> and may stop after a few lookups.{" "}
      <a href="https://api.data.gov/signup/" target="_blank" rel="noreferrer" style={{color:C.link}}>Get a free api.data.gov key →</a>
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
  if (loading) return <div style={{color:C.textDim,fontSize:13,padding:8}}>⏳ Loading roll call…</div>;
  if (error) return <div style={{color:"#c00",fontSize:13,padding:8}}>⚠️ {error}</div>;
  const t = tally(data.members);
  const shown = data.members.filter(m =>
    !filter || `${m.name} ${m.state} ${m.party}`.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div style={panel}>
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
          <div key={i} style={chip}>
            <span>{m.name} <span style={{color:C.textDim}}>({m.party}-{m.state})</span></span>
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
    <div style={{...panel,marginTop:16,padding:14}}>
      <div style={{fontWeight:700,marginBottom:8}}>Recent roll-call votes: {member.name}</div>
      {loading && <div style={{color:C.textDim,fontSize:13}}>⏳ Checking the latest 15 roll calls…</div>}
      {error && <div style={{color:"#c00",fontSize:13}}>⚠️ {error}</div>}
      {data && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={headRow}>
              <Th>Date</Th><Th>Roll #</Th><Th>Bill</Th><Th>Question</Th><Th>Their vote</Th><Th>Result</Th>
            </tr></thead>
            <tbody>
              {data.map(v => (
                <tr key={v.number} style={bodyRow}>
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
          <div style={{fontSize:11,color:C.textDim,marginTop:6}}>
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
export function VotingRecords() {
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
              <tr style={headRow}>
                <Th>Name</Th><Th>Party</Th><Th>{chamber === "house" ? "District" : "State"}</Th><Th>Serving Since</Th><Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} style={bodyRow}>
                  <Td><strong>{m.name}</strong></Td>
                  <Td><span style={partyBadge(m.party)}>{m.partyName}</span></Td>
                  <Td style={{fontSize:12,color:C.textMid}}>{chamber === "house" ? (m.district ?? "At-large") : m.state}</Td>
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
   LEGISLATION TRACKER — Congress.gov
───────────────────────────────────────────────────────────────── */
export const BILL_URL_TYPE = {
  HR:"house-bill", S:"senate-bill", HRES:"house-resolution", SRES:"senate-resolution",
  HJRES:"house-joint-resolution", SJRES:"senate-joint-resolution",
  HCONRES:"house-concurrent-resolution", SCONRES:"senate-concurrent-resolution",
};
export const BILL_LABEL = {
  HR:"H.R.", S:"S.", HRES:"H.Res.", SRES:"S.Res.", HJRES:"H.J.Res.",
  SJRES:"S.J.Res.", HCONRES:"H.Con.Res.", SCONRES:"S.Con.Res.",
};

export function LegislationTracker() {
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
          style={btnPrimary}>
          Search
        </button>
        <ApiStatus loading={loading} error={error} count={data ? bills.length : null} />
      </div>
      <div style={{fontSize:12,color:C.textMid,marginBottom:10}}>
        Matches titles among the 500 most recently active bills.{" "}
        <a href={fullSearch} target="_blank" rel="noreferrer" style={{color:C.link}}>Full-text search on Congress.gov →</a>
      </div>

      {!loading && !error && bills.length > 0 && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={headRow}>
              <Th>Bill</Th><Th>Title</Th><Th>Latest Action</Th><Th>Risk Flag</Th>
            </tr></thead>
            <tbody>
              {bills.slice(0,40).map(b => {
                const risk = riskLevel(b);
                const type = (b.type || "").toUpperCase();
                return (
                  <tr key={`${type}${b.number}`} style={bodyRow}>
                    <Td style={{fontWeight:700,fontSize:12,whiteSpace:"nowrap"}}>
                      <a href={`https://www.congress.gov/bill/${congress}th-congress/${BILL_URL_TYPE[type] || "house-bill"}/${b.number}`}
                        target="_blank" rel="noreferrer" style={{color:C.link}}>
                        {BILL_LABEL[type] || type} {b.number}
                      </a>
                    </Td>
                    <Td style={{fontSize:12,maxWidth:340}}>{b.title}</Td>
                    <Td style={{fontSize:11,maxWidth:260}}>
                      <div style={{color:C.textDim}}>{b.latestAction?.actionDate}</div>
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
          <div style={{fontSize:11,color:C.textDim,marginTop:6}}>
            Source: Congress.gov API · {congress}th Congress · Search: "{query}"
          </div>
        </div>
      )}
      {!loading && !error && bills.length === 0 && (
        <div style={{color:C.textDim,fontSize:13,padding:12}}>No recently active bills match. Try the full-text search link above.</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   RECENT CONGRESSIONAL VOTES — Senate.gov + Congress.gov
───────────────────────────────────────────────────────────────── */
export function RecentVotes() {
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
            <thead><tr style={headRow}>
              <Th>Date</Th><Th>Roll #</Th><Th>Question</Th><Th>Bill</Th><Th>Result</Th>
              {chamber === "senate" && <><Th>Yea</Th><Th>Nay</Th></>}
              <Th></Th>
            </tr></thead>
            <tbody>
              {votes.map(v => (
                <Fragment key={v.number}>
                  <tr style={bodyRow}>
                    <Td style={{fontSize:11,whiteSpace:"nowrap"}}>{v.date}</Td>
                    <Td style={{fontSize:12}}>{v.number}</Td>
                    <Td style={{fontSize:12,maxWidth:300}}>
                      {v.question}
                      {v.title && <div style={{color:C.textDim,fontSize:11}}>{v.title.slice(0, 110)}</div>}
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
          <div style={{fontSize:11,color:C.textDim,marginTop:6}}>
            Source: {chamber === "senate" ? "Senate.gov roll-call votes" : "Congress.gov House roll-call votes"}
          </div>
        </div>
      )}
      {!loading && !error && votes.length === 0 && (
        <div style={{color:C.textDim,fontSize:13,padding:12}}>No roll-call votes recorded for this session yet.</div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   MEMBER SEARCH — Congress.gov
───────────────────────────────────────────────────────────────── */
export function MemberSearch() {
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
          style={btnPrimary}>
          Search
        </button>
        <ApiStatus loading={loading} error={error} count={q ? result.length : null} />
      </div>
      {q && !loading && !error && result.length === 0 && (
        <div style={{color:C.textDim,fontSize:13,padding:12}}>No current members match “{query}”.</div>
      )}
      {result.length > 0 && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={headRow}>
              <Th>Name</Th><Th>Party</Th><Th>State</Th><Th>Chamber</Th><Th>Serving Since</Th><Th>Actions</Th>
            </tr></thead>
            <tbody>
              {result.slice(0, 50).map(m => (
                <tr key={m.id} style={bodyRow}>
                  <Td><strong>{m.name}</strong></Td>
                  <Td><span style={partyBadge(m.party)}>{m.partyName}</span></Td>
                  <Td>{m.state}{m.chamber === "house" && m.district != null ? `-${m.district}` : ""}</Td>
                  <Td style={{fontSize:12,textTransform:"capitalize"}}>{m.chamber}</Td>
                  <Td style={{fontSize:12}}>{m.since || "—"}</Td>
                  <Td style={{whiteSpace:"nowrap"}}>
                    <button onClick={() => setSelected(m)} style={btnSmall}>View Votes</button>{" "}
                    <a href={`https://bioguide.congress.gov/search/bio/${m.id}`} target="_blank" rel="noreferrer"
                      style={{fontSize:12,color:C.link}}>Bio →</a>
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
export function StateVotes() {
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
          style={btnPrimary}>
          Search
        </button>
        <input value={legislator} onChange={e => setLegislator(e.target.value)}
          placeholder="Show one legislator's votes…" style={{...inputStyle, minWidth:200}} />
        <ApiStatus loading={loading} error={error} count={data ? rows.length : null} />
      </div>

      {!loading && !error && rows.length > 0 && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={headRow}>
              <Th>Date</Th><Th>Bill</Th><Th>Motion</Th><Th>Chamber</Th><Th>Result</Th>
              <Th>Yes</Th><Th>No</Th>{who && <Th>Their vote</Th>}<Th></Th>
            </tr></thead>
            <tbody>
              {rows.map(v => (
                <Fragment key={v.id}>
                  <tr style={bodyRow}>
                    <Td style={{fontSize:11,whiteSpace:"nowrap"}}>{(v.start_date || "").slice(0,10)}</Td>
                    <Td style={{fontSize:12,maxWidth:260}}>
                      <a href={v.billUrl} target="_blank" rel="noreferrer" style={{color:C.link,fontWeight:700}}>{v.bill}</a>
                      <div style={{color:C.textMid,fontSize:11}}>{(v.billTitle || "").slice(0, 100)}</div>
                    </Td>
                    <Td style={{fontSize:12,maxWidth:220}}>{v.motion_text}</Td>
                    <Td style={{fontSize:11}}>{v.organization?.name || v.organization?.classification || "—"}</Td>
                    <Td><span style={/pass/i.test(v.result) ? styles.pill("#1a7a4a","#edf7f1") : styles.pill("#c0392b","#fdf0ee")}>{v.result}</span></Td>
                    <Td style={{color:"#1a7a4a",fontWeight:700}}>{count(v, "yes")}</Td>
                    <Td style={{color:"#c0392b",fontWeight:700}}>{count(v, "no")}</Td>
                    {who && <Td><span style={voteBadge(v.theirs?.option)}>{v.theirs?.option}</span>
                      <div style={{fontSize:10,color:C.textDim}}>{v.theirs?.voter_name}</div></Td>}
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
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:4,maxHeight:300,overflowY:"auto",padding:10,background:C.surface2,borderRadius:8,border:`1px solid ${C.border}`}}>
                        {(v.votes || []).map((p, i) => (
                          <div key={i} style={chip}>
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
          <div style={{fontSize:11,color:C.textDim,marginTop:6}}>
            Source: OpenStates (Plural Policy) · {stateName} legislature · most recently acted-on bills with recorded votes
          </div>
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div style={{color:C.textDim,fontSize:13,padding:12}}>
          {who ? `No recorded votes by “${legislator}” in these bills.` : "No recorded floor or committee votes found for recent bills. Try a topic search."}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   LOCAL VOTES — city councils & county boards via Legistar
───────────────────────────────────────────────────────────────── */
export const LEGISTAR_PRESETS = [
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
      fetchCivic("legistar", `/events/${eventId}/eventitems`, { client, AgendaNote: 1, MinutesNote: 1 })),
    [client, eventId]
  );
  const items = (data || []).filter(i => i.EventItemActionName || i.EventItemPassedFlagName);
  const votes = useApiData(
    () => openItem ? cachedFetch(`lg-votes-${client}-${openItem}`, () =>
      fetchCivic("legistar", `/eventitems/${openItem}/votes`, { client })) : Promise.resolve(null),
    [client, openItem]
  );

  if (loading) return <div style={{color:C.textDim,fontSize:13,padding:8}}>⏳ Loading agenda actions…</div>;
  if (error) return <div style={{color:"#c00",fontSize:13,padding:8}}>⚠️ {error}</div>;
  if (items.length === 0) return <div style={{color:C.textDim,fontSize:13,padding:8}}>No recorded actions or votes for this meeting yet (minutes may not be published).</div>;

  return (
    <div style={panel}>
      {items.map(i => (
        <div key={i.EventItemId} style={{padding:"8px 0",borderBottom:`1px solid ${C.rule}`}}>
          <div style={{display:"flex",gap:8,alignItems:"flex-start",flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:240,fontSize:12}}>
              {i.EventItemMatterFile && <strong>{i.EventItemMatterFile} · </strong>}
              {(i.EventItemMatterName || i.EventItemTitle || "").slice(0, 220)}
              <div style={{color:C.textMid,fontSize:11,marginTop:2}}>
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
              {votes.loading && <span style={{fontSize:12,color:C.textDim}}>⏳ Loading…</span>}
              {votes.error && <span style={{fontSize:12,color:"#c00"}}>⚠️ {votes.error}</span>}
              {votes.data && votes.data.length === 0 && <span style={{fontSize:12,color:C.textDim}}>No individual roll call recorded (likely a voice vote).</span>}
              {votes.data && votes.data.length > 0 && (
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:4}}>
                  {votes.data.map(v => (
                    <div key={v.VoteId} style={chip}>
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

export function LocalVotes() {
  const [preset, setPreset] = useState("chicago");
  const [custom, setCustom] = useState("");
  const [client, setClient] = useState("chicago");
  const [open, setOpen] = useState(null);

  const { data, loading, error } = useApiData(
    () => cachedFetch(`lg-events-${client}`, () =>
      fetchCivic("legistar", "/events", {
        client,
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
      <div style={infoBox}>
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
        <button onClick={applyCustom} style={btnPrimary}>Look up</button>
        <ApiStatus loading={loading} error={error} count={data ? events.length : null} />
      </div>

      {!loading && !error && events.length > 0 && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={headRow}>
              <Th>Date</Th><Th>Body</Th><Th>Minutes</Th><Th></Th>
            </tr></thead>
            <tbody>
              {events.map(e => (
                <Fragment key={e.EventId}>
                  <tr style={bodyRow}>
                    <Td style={{fontSize:12,whiteSpace:"nowrap"}}>{(e.EventDate || "").slice(0,10)} <span style={{color:C.textDim}}>{e.EventTime}</span></Td>
                    <Td style={{fontSize:12}}>
                      <strong>{e.EventBodyName}</strong>
                      {e.EventInSiteURL && <> · <a href={e.EventInSiteURL} target="_blank" rel="noreferrer" style={{color:C.link}}>Agenda →</a></>}
                    </Td>
                    <Td style={{fontSize:11,color:C.textMid}}>{e.EventMinutesStatusName || "—"}</Td>
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
          <div style={{fontSize:11,color:C.textDim,marginTop:6}}>
            Source: Legistar public API · {client}.legistar.com · meetings from the last 120 days
          </div>
        </div>
      )}
      {!loading && !error && events.length === 0 && (
        <div style={{color:C.textDim,fontSize:13,padding:12}}>No meetings found in the last 120 days for “{client}”.</div>
      )}
    </div>
  );
}

