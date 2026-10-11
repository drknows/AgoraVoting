"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchPropublica, fetchFEC, fetchCongressGov,
  fetchGovTrack, fetchLDA, fetchOpenStates,
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
   VOTING RECORDS — ProPublica Congress API
───────────────────────────────────────────────────────────────── */
function VotingRecords() {
  const [chamber, setChamber] = useState("senate");
  const [state, setState]   = useState("CA");
  const [selected, setSelected] = useState(null);
  const [memberVotes, setMemberVotes] = useState(null);
  const [memberVotesLoading, setMemberVotesLoading] = useState(false);

  const { data: members, loading, error } = useApiData(
    () => cachedFetch(`members-${chamber}-${state}`, () =>
      fetchPropublica(ENDPOINTS.propublica.stateMembers(chamber, state))
    ), [chamber, state]
  );

  const loadMemberVotes = async (memberId, name) => {
    setSelected(name);
    setMemberVotesLoading(true);
    try {
      const d = await cachedFetch(`votes-${memberId}`,
        () => fetchPropublica(ENDPOINTS.propublica.memberVotes(memberId)));
      setMemberVotes(d[0]?.votes || []);
    } catch(e) {
      setMemberVotes([]);
    } finally {
      setMemberVotesLoading(false);
    }
  };

  const needsKey = error?.includes("not configured");

  return (
    <div>
      {needsKey && <KeySetupBanner name="ProPublica Congress API" url="https://www.propublica.org/datastore/api/propublica-congress-api" />}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <select value={chamber} onChange={e => setChamber(e.target.value)} style={inputStyle}>
          <option value="senate">Senate</option>
          <option value="house">House</option>
        </select>
        <select value={state} onChange={e => setState(e.target.value)} style={inputStyle}>
          {US_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
        <ApiStatus loading={loading} error={error} count={members?.length} />
      </div>

      {!loading && !error && members && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead>
              <tr style={{background:"#f5f5f7"}}>
                <Th>Name</Th><Th>Party</Th><Th>Role</Th><Th>In Office Since</Th><Th>Next Election</Th><Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {members.map(m => (
                <tr key={m.id} style={{borderBottom:"1px solid #eee"}}>
                  <Td><strong>{m.first_name} {m.last_name}</strong></Td>
                  <Td><span style={partyBadge(m.party)}>{m.party}</span></Td>
                  <Td style={{fontSize:12,color:"#666"}}>{m.title || chamber}</Td>
                  <Td>{m.start_date || "—"}</Td>
                  <Td>{m.next_election || "—"}</Td>
                  <Td>
                    <button onClick={() => loadMemberVotes(m.id, `${m.first_name} ${m.last_name}`)}
                      style={btnSmall}>
                      View Votes
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div style={{marginTop:16,padding:14,background:"#f9f9fb",borderRadius:8,border:"1px solid #e0e0e8"}}>
          <div style={{fontWeight:700,marginBottom:8}}>Recent votes: {selected}</div>
          {memberVotesLoading && <div style={{color:"#888",fontSize:13}}>⏳ Loading votes…</div>}
          {!memberVotesLoading && memberVotes && (
            memberVotes.length === 0
              ? <div style={{color:"#888",fontSize:13}}>No vote data available.</div>
              : <div style={{overflowX:"auto"}}>
                  <table style={tableStyle}>
                    <thead><tr style={{background:"#f0f0f5"}}>
                      <Th>Date</Th><Th>Bill</Th><Th>Description</Th><Th>Position</Th><Th>Result</Th>
                    </tr></thead>
                    <tbody>
                      {memberVotes.slice(0,20).map((v,i) => (
                        <tr key={i} style={{borderBottom:"1px solid #eee"}}>
                          <Td style={{fontSize:12}}>{v.date}</Td>
                          <Td style={{fontSize:12,fontWeight:600}}>{v.bill?.number || "—"}</Td>
                          <Td style={{fontSize:12,maxWidth:260}}>{v.description?.slice(0,80) || v.bill?.title?.slice(0,80) || "—"}</Td>
                          <Td><span style={voteBadge(v.position)}>{v.position}</span></Td>
                          <Td style={{fontSize:12}}>{v.result}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
          )}
        </div>
      )}
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
   LEGISLATION TRACKER — Congress.gov + ProPublica
───────────────────────────────────────────────────────────────── */
function LegislationTracker() {
  const [searchTerm, setSearchTerm] = useState("emergency powers");
  const [query, setQuery] = useState("emergency powers");
  const [congress, setCongress] = useState("119");

  const { data, loading, error } = useApiData(
    () => cachedFetch(`bills-${congress}-${query}`, () =>
      fetchPropublica(
        ENDPOINTS.propublica.billSearch(query) + `&congress=${congress}`
      )
    ), [query, congress]
  );

  const bills = data?.[0]?.bills || [];
  const needsKey = error?.includes("not configured");

  // Constitutional risk heuristic keywords
  const riskKeywords = {
    high: ["emergency","surveillance","detention","war powers","executive order","martial","restrict press","suspend","censorship"],
    med:  ["purge","voter","registration","gerrymandering","redistrict","immunity","shield","waiver","exemption"],
  };
  function riskLevel(bill) {
    const text = `${bill.title} ${bill.short_title || ""} ${bill.summary || ""}`.toLowerCase();
    if (riskKeywords.high.some(k => text.includes(k))) return "high";
    if (riskKeywords.med.some(k => text.includes(k))) return "med";
    return "low";
  }

  return (
    <div>
      {needsKey && <KeySetupBanner name="ProPublica Congress API" url="https://www.propublica.org/datastore/api/propublica-congress-api" />}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search legislation…" style={{...inputStyle, minWidth:220}}
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
        <ApiStatus loading={loading} error={error} count={bills.length} />
      </div>

      {!loading && !error && bills.length > 0 && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={{background:"#f5f5f7"}}>
              <Th>Bill</Th><Th>Title</Th><Th>Sponsor</Th><Th>Status</Th><Th>Risk Flag</Th><Th>Introduced</Th>
            </tr></thead>
            <tbody>
              {bills.slice(0,25).map(b => {
                const risk = riskLevel(b);
                return (
                  <tr key={b.bill_id} style={{borderBottom:"1px solid #eee"}}>
                    <Td style={{fontWeight:700,fontSize:12,whiteSpace:"nowrap"}}>
                      <a href={`https://www.congress.gov/bill/${congress}th-congress/${b.bill_type?.toLowerCase()}-bill/${b.number}`}
                        target="_blank" rel="noreferrer" style={{color:"#2756c8"}}>
                        {b.bill_type?.toUpperCase()}.{b.number}
                      </a>
                    </Td>
                    <Td style={{fontSize:12,maxWidth:300}}>{b.short_title || b.title}</Td>
                    <Td style={{fontSize:12}}>{b.sponsor_name}<span style={{color:"#888",fontSize:11}}> ({b.sponsor_party}-{b.sponsor_state})</span></Td>
                    <Td style={{fontSize:11}}>{b.latest_major_action?.slice(0,60) || b.congressdotgov_url ? b.active ? "Active" : "Inactive" : "—"}</Td>
                    <Td>
                      {risk === "high" && <span style={riskBadge("high")}>⚠️ High Risk</span>}
                      {risk === "med"  && <span style={riskBadge("med")}>🔶 Review</span>}
                      {risk === "low"  && <span style={riskBadge("low")}>✅ Normal</span>}
                    </Td>
                    <Td style={{fontSize:11}}>{b.introduced_date}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{fontSize:11,color:"#999",marginTop:6}}>
            Source: ProPublica Congress API · {congress}th Congress · Search: "{query}"
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   RECENT CONGRESSIONAL VOTES — ProPublica
───────────────────────────────────────────────────────────────── */
function RecentVotes() {
  const [chamber, setChamber] = useState("senate");

  const { data, loading, error } = useApiData(
    () => cachedFetch(`recent-votes-${chamber}`, () =>
      fetchPropublica(ENDPOINTS.propublica.recentVotes(chamber))
    ), [chamber]
  );

  const votes = data?.[0]?.votes || [];
  const needsKey = error?.includes("not configured");

  return (
    <div>
      {needsKey && <KeySetupBanner name="ProPublica Congress API" url="https://www.propublica.org/datastore/api/propublica-congress-api" />}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <select value={chamber} onChange={e => setChamber(e.target.value)} style={inputStyle}>
          <option value="senate">Senate</option>
          <option value="house">House</option>
        </select>
        <ApiStatus loading={loading} error={error} count={votes.length} />
      </div>

      {!loading && !error && votes.length > 0 && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={{background:"#f5f5f7"}}>
              <Th>Date</Th><Th>Question</Th><Th>Bill</Th><Th>Result</Th><Th>Yea</Th><Th>Nay</Th><Th>Not Voting</Th>
            </tr></thead>
            <tbody>
              {votes.slice(0,20).map((v, i) => (
                <tr key={i} style={{borderBottom:"1px solid #eee"}}>
                  <Td style={{fontSize:11,whiteSpace:"nowrap"}}>{v.date}</Td>
                  <Td style={{fontSize:12,maxWidth:280}}>{v.question}</Td>
                  <Td style={{fontSize:12}}>{v.bill?.number || "—"}</Td>
                  <Td><span style={v.result?.toLowerCase().includes("pass") || v.result?.toLowerCase().includes("agreed")
                    ? styles.pill("#1a7a4a","#edf7f1")
                    : styles.pill("#c0392b","#fdf0ee")}>
                    {v.result}
                  </span></Td>
                  <Td style={{color:"#1a7a4a",fontWeight:700}}>{v.total?.yes ?? v.democratic?.yes + v.republican?.yes ?? "—"}</Td>
                  <Td style={{color:"#c0392b",fontWeight:700}}>{v.total?.no ?? v.democratic?.no + v.republican?.no ?? "—"}</Td>
                  <Td style={{color:"#888"}}>{v.total?.not_voting ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
   MEMBER SEARCH — ProPublica
───────────────────────────────────────────────────────────────── */
function MemberSearch() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const doSearch = async () => {
    if (!query) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const d = await fetchPropublica(ENDPOINTS.propublica.memberSearch(query));
      setResult(d);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (query) doSearch(); }, [query]);

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search member of Congress by name…" style={{...inputStyle, minWidth:240}}
          onKeyDown={e => e.key==="Enter" && setQuery(search)} />
        <button onClick={() => setQuery(search)}
          style={{...btnSmall,background:"#2756c8",color:"#fff",padding:"6px 14px"}}>
          Search
        </button>
        <ApiStatus loading={loading} error={error} />
      </div>
      {result?.length > 0 && (
        <div style={{overflowX:"auto"}}>
          <table style={tableStyle}>
            <thead><tr style={{background:"#f5f5f7"}}>
              <Th>Name</Th><Th>Party</Th><Th>State</Th><Th>Chamber</Th><Th>Roles</Th><Th>Twitter</Th>
            </tr></thead>
            <tbody>
              {result.map(m => (
                <tr key={m.member_id} style={{borderBottom:"1px solid #eee"}}>
                  <Td><strong>{m.first_name} {m.last_name}</strong></Td>
                  <Td><span style={partyBadge(m.most_recent_vote?.party || m.roles?.[0]?.party)}>{m.roles?.[0]?.party || "?"}</span></Td>
                  <Td>{m.roles?.[0]?.state || "—"}</Td>
                  <Td style={{fontSize:12,textTransform:"capitalize"}}>{m.roles?.[0]?.chamber || "—"}</Td>
                  <Td style={{fontSize:11}}>{m.roles?.length || 0} terms</Td>
                  <Td style={{fontSize:12}}>{m.twitter_account ? <a href={`https://twitter.com/${m.twitter_account}`} target="_blank" rel="noreferrer" style={{color:"#2756c8"}}>@{m.twitter_account}</a> : "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  { id:"votes",      label:"🗳 Voting Records",    live:true  },
  { id:"recent",     label:"🏛 Recent Votes",      live:true  },
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
        {(activeTab==="votes"||activeTab==="member"||activeTab==="bills"||activeTab==="recent") &&
          API_KEYS.PROPUBLICA.startsWith("REPLACE") && (
          <div style={{background:"#fff",border:"1px solid #e0e0e8",borderRadius:8,
            padding:"14px 16px",marginBottom:16}}>
            <div style={{fontWeight:700,marginBottom:8}}>🚀 Quick Setup — Get Live Data in 5 Minutes</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
              {[
                {num:1,name:"ProPublica Congress API",url:"https://www.propublica.org/datastore/api/propublica-congress-api",env:"NEXT_PUBLIC_PROPUBLICA_API_KEY",note:"Voting records, member lookup, bill search"},
                {num:2,name:"FEC API",url:"https://api.open.fec.gov/developers/",env:"NEXT_PUBLIC_FEC_API_KEY",note:"Campaign finance, fundraising, donor data"},
                {num:3,name:"Congress.gov API",url:"https://api.congress.gov/sign-up/",env:"NEXT_PUBLIC_CONGRESS_GOV_API_KEY",note:"Full bill text, amendments, committee actions"},
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
              Add keys to <code>/home/claude/agora-voting/.env.local</code> — no restart needed with Next.js dev server.
              Senate LDA (lobbying) requires no key.
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
          Data sources: ProPublica Congress API · FEC API · Congress.gov · Senate LDA · All public records.
          <br/>Anti-Sociopath Society is a nonpartisan civic transparency platform.
        </div>
      </div>
    </div>
  );
}
