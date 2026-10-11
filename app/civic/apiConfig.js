/**
 * API Configuration for Anti-Sociopath Society Civic Platform
 *
 * APIs used (all free-tier, browser-callable):
 *  - ProPublica Congress API  → voting records, members, bills
 *    Key: free, register at https://www.propublica.org/datastore/api/propublica-congress-api
 *  - FEC API                  → campaign finance, fundraising
 *    Key: free, register at https://api.open.fec.gov/developers/
 *  - Congress.gov API         → bill text, status, amendments
 *    Key: free, register at https://api.congress.gov/sign-up/
 *  - GovTrack.us API          → votes, legislators (no key required)
 *  - OpenStates API           → state legislation
 *    Key: free, register at https://openstates.org/accounts/signup/
 *  - Senate LDA API           → lobbyist disclosures (no key required)
 *  - House Clerk API          → financial disclosures (no key required)
 */

export const API_KEYS = {
  // ⚠️ Replace these placeholders with real keys from the links above
  PROPUBLICA:   process.env.NEXT_PUBLIC_PROPUBLICA_API_KEY   || "REPLACE_WITH_PROPUBLICA_KEY",
  FEC:          process.env.NEXT_PUBLIC_FEC_API_KEY          || "DEMO_KEY", // DEMO_KEY works with rate limits
  CONGRESS_GOV: process.env.NEXT_PUBLIC_CONGRESS_GOV_API_KEY || "REPLACE_WITH_CONGRESS_GOV_KEY",
  OPENSTATES:   process.env.NEXT_PUBLIC_OPENSTATES_API_KEY   || "REPLACE_WITH_OPENSTATES_KEY",
};

export const ENDPOINTS = {
  // ProPublica Congress API
  propublica: {
    base: "https://api.propublica.org/congress/v1",
    members:        (chamber) => `/members/${chamber}/current.json`,
    memberVotes:    (memberId) => `/members/${memberId}/votes.json`,
    memberBills:    (memberId) => `/members/${memberId}/bills/introduced.json`,
    recentVotes:    (chamber) => `/${chamber}/votes/recent.json`,
    voteRollCall:   (chamber, session, rollCallNum) => `/congress/votes/${session}/${chamber}/${rollCallNum}.json`,
    billSearch:     (query) => `/bills/search.json?query=${encodeURIComponent(query)}`,
    billDetail:     (billId, congress) => `/${congress}/bills/${billId}.json`,
    memberSearch:   (name) => `/members/search.json?name=${encodeURIComponent(name)}`,
    memberById:     (id) => `/members/${id}.json`,
    partyVotes:     (chamber, party, congress, session) => `/${congress}/${chamber}/sessions/${session}/votes/${party}.json`,
    stateMembers:   (chamber, state) => `/members/${chamber}/${state}/current.json`,
  },

  // FEC Campaign Finance API
  fec: {
    base: "https://api.open.fec.gov/v1",
    candidates:     "/candidates/",
    candidateDetail:(id) => `/candidate/${id}/`,
    committeeTotals:(id) => `/committee/${id}/totals/`,
    receipts:       "/schedules/schedule_a/",
    disbursements:  "/schedules/schedule_b/",
    independent:    "/schedules/schedule_e/",
    filings:        "/filings/",
    electionSearch: "/elections/search/",
    totalsByOffice: "/elections/",
  },

  // Congress.gov API
  congressGov: {
    base: "https://api.congress.gov/v3",
    bills:          "/bill",
    billDetail:     (congress, type, num) => `/bill/${congress}/${type}/${num}`,
    billActions:    (congress, type, num) => `/bill/${congress}/${type}/${num}/actions`,
    billText:       (congress, type, num) => `/bill/${congress}/${type}/${num}/text`,
    amendments:     "/amendment",
    members:        "/member",
    memberDetail:   (id) => `/member/${id}`,
    memberSponsor:  (id) => `/member/${id}/sponsored-legislation`,
    committees:     "/committee",
    nominations:    "/nomination",
    treaties:       "/treaty",
  },

  // GovTrack (no API key needed)
  govtrack: {
    base: "https://www.govtrack.us/api/v2",
    votes:          "/vote",
    voteVoters:     (voteId) => `/vote_voter?vote=${voteId}&limit=500`,
    persons:        "/person",
    personDetail:   (id) => `/person/${id}`,
    bills:          "/bill",
    billDetail:     (id) => `/bill/${id}`,
    cosponsors:     (billId) => `/cosponsor?bill=${billId}`,
    committees:     "/committee",
    committeeMembers: (id) => `/committee-member?committee=${id}`,
  },

  // Senate Lobbying Disclosure Act API (no key needed)
  lda: {
    base: "https://lda.senate.gov/api/v1",
    filings:        "/filings/",
    registrants:    "/registrants/",
    clients:        "/clients/",
    lobbyists:      "/lobbyists/",
    constants:      "/constants/",
  },

  // OpenStates API
  openStates: {
    base: "https://v3.openstates.org",
    bills:          "/bills",
    people:         "/people",
    jurisdictions:  "/jurisdictions",
  },
};

/** Build a ProPublica fetch with auth header */
export async function fetchPropublica(path) {
  const key = API_KEYS.PROPUBLICA;
  if (key.startsWith("REPLACE")) throw new Error("ProPublica API key not configured");
  const url = ENDPOINTS.propublica.base + path;
  const res = await fetch(url, { headers: { "X-API-Key": key } });
  if (!res.ok) throw new Error(`ProPublica ${res.status}: ${res.statusText}`);
  const data = await res.json();
  return data.results ?? data;
}

/** Build an FEC fetch with API key query param */
export async function fetchFEC(path, params = {}) {
  const url = new URL(ENDPOINTS.fec.base + path);
  url.searchParams.set("api_key", API_KEYS.FEC);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`FEC ${res.status}: ${res.statusText}`);
  return res.json();
}

/** Congress.gov fetch */
export async function fetchCongressGov(path, params = {}) {
  const key = API_KEYS.CONGRESS_GOV;
  if (key.startsWith("REPLACE")) throw new Error("Congress.gov API key not configured");
  const url = new URL(ENDPOINTS.congressGov.base + path);
  url.searchParams.set("api_key", key);
  url.searchParams.set("format", "json");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Congress.gov ${res.status}: ${res.statusText}`);
  return res.json();
}

/** GovTrack fetch (no key needed) */
export async function fetchGovTrack(path, params = {}) {
  const url = new URL(ENDPOINTS.govtrack.base + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`GovTrack ${res.status}: ${res.statusText}`);
  return res.json();
}

/** Senate LDA Lobbying Disclosure fetch (no key needed) */
export async function fetchLDA(path, params = {}) {
  const url = new URL(ENDPOINTS.lda.base + path);
  url.searchParams.set("format", "json");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`LDA ${res.status}: ${res.statusText}`);
  return res.json();
}

/** OpenStates fetch */
export async function fetchOpenStates(path, params = {}) {
  const key = API_KEYS.OPENSTATES;
  if (key.startsWith("REPLACE")) throw new Error("OpenStates API key not configured");
  const url = new URL(ENDPOINTS.openStates.base + path);
  url.searchParams.set("apikey", key);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`OpenStates ${res.status}: ${res.statusText}`);
  return res.json();
}

/**
 * Server-proxied civic data (see app/api/civic/route.js).
 *   src: "congress" | "senate" | "openstates" | "legistar"
 * Keys are added on the server, so these work without exposing them.
 */
export async function fetchCivic(src, path = "", params = {}) {
  const qs = new URLSearchParams({ src, ...(path ? { path } : {}) });
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
  });
  const res = await fetch(`/api/civic?${qs}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

/** Simple in-memory cache to avoid re-fetching within a session */
const _cache = new Map();
export async function cachedFetch(key, fetcher, ttlMs = 5 * 60 * 1000) {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;
  const data = await fetcher();
  _cache.set(key, { data, ts: Date.now() });
  return data;
}
