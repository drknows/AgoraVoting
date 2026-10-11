"use client";
import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { fetchFEC, fetchLDA, cachedFetch, API_KEYS } from "./apiConfig";
import {
  useApiData, ApiStatus, KeySetupBanner, styles, inputStyle, tableStyle, btnSmall,
  Th, Td, partyBadge, voteBadge, riskBadge, fmt$, US_STATES,
} from "./ui";
import {
  VotingRecords, RecentVotes, MemberSearch, LegislationTracker, StateVotes, LocalVotes,
} from "./VoteSections";
import { Crowdsource, ExpertAnalysis, Meetings, Arrests, EthicsFactCheck } from "./PhaseTwoSections";
import { LegislationReview } from "./LegislationReview";

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
   MAIN PLATFORM SHELL
───────────────────────────────────────────────────────────────── */
const TABS = [
  { id:"review",     label:"📜 Legislation Review", live:true },
  { id:"votes",      label:"🗳 Congress Votes",    live:true  },
  { id:"recent",     label:"🏛 Recent Roll Calls", live:true  },
  { id:"state",      label:"🏢 State Votes",       live:true  },
  { id:"local",      label:"🏙 Local Votes",       live:true  },
  { id:"member",     label:"🔍 Member Search",     live:true  },
  { id:"bills",      label:"📋 Legislation",       live:true  },
  { id:"fundraising",label:"💰 Fundraising",       live:true  },
  { id:"donors",     label:"📈 Donor Lookup",      live:true  },
  { id:"lobbying",   label:"🤝 Lobbying",          live:true  },
  { id:"crowdsource",label:"🗣 Crowdsource",       live:true  },
  { id:"experts",    label:"🎓 Expert Analysis",   live:true  },
  { id:"arrests",    label:"🔒 Arrests",           live:true  },
  { id:"ethics",     label:"⚖️ Ethics & Fact-Check", live:true },
  { id:"meetings",   label:"📅 Meetings",          live:true  },
];

export default function CivicPlatform() {
  const [activeTab, setActiveTab] = useState("review");

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
          {activeTab === "review"      && <LegislationReview />}
          {activeTab === "crowdsource" && <Crowdsource />}
          {activeTab === "experts"     && <ExpertAnalysis />}
          {activeTab === "arrests"     && <Arrests />}
          {activeTab === "ethics"      && <EthicsFactCheck />}
          {activeTab === "meetings"    && <Meetings />}

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
          Data sources: Congress.gov · Senate.gov · OpenStates · Legistar · FEC · Senate LDA · U.S. DOJ · CBO · GAO · Google Fact Check · All public records.
          <br/>Anti-Sociopath Society is a nonpartisan civic transparency platform.
        </div>
      </div>
    </div>
  );
}
