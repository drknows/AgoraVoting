/**
 * Real ballot data for "polling" polls (admin imports):
 *   - Federal races: candidates from the FEC (fec.gov)
 *   - State & local contests and ballot measures: Google Civic Information API
 *     (election list + the contests on the ballot at a given address, once the
 *     state has published them — usually a few weeks before an election)
 */
import { config, features } from "./config";
import { HttpError } from "./http";

const OFFICE = { S: "U.S. Senate", H: "U.S. House", P: "President" };

export async function fecCandidates({ year, office, state, district }) {
  if (!OFFICE[office]) throw new HttpError(400, "Office must be S, H or P.");
  const qs = new URLSearchParams({
    api_key: config.fecKey, election_year: String(year || new Date().getFullYear()), office,
    candidate_status: "C", is_active_candidate: "true", per_page: "100", sort: "name",
  });
  if (office !== "P") {
    if (!/^[A-Z]{2}$/.test(state || "")) throw new HttpError(400, "Choose a state.");
    qs.set("state", state);
  }
  if (office === "H" && district) qs.set("district", String(district).padStart(2, "0"));
  const res = await fetch(`https://api.open.fec.gov/v1/candidates/?${qs}`, { cache: "no-store" });
  if (!res.ok) throw new HttpError(502, res.status === 429 ? "FEC rate limit reached — add your own FEC key." : `FEC ${res.status}`);
  const d = await res.json();
  const candidates = (d.results || []).map(c => ({
    id: c.candidate_id,
    name: String(c.name || "").split(",").reverse().map(s => s.trim()).join(" ").replace(/\s+/g, " ")
      .toLowerCase().replace(/\b\w/g, ch => ch.toUpperCase()),
    party: c.party_full || c.party || "",
    incumbent: c.incumbent_challenge === "I",
  }));
  const where = office === "P" ? "" : ` — ${state}${office === "H" && district ? `-${String(district).padStart(2, "0")}` : ""}`;
  return {
    title: `${year} ${OFFICE[office]}${where}: who do you plan to vote for?`,
    candidates,
    source: { type: "fec", label: `FEC registered candidates (${year})`, url: "https://www.fec.gov/data/candidates/", electionDate: String(year), contestType: "candidate" },
  };
}

async function civic(path, params) {
  if (!features.googleCivic()) throw new HttpError(503, "Add GOOGLE_CIVIC_API_KEY to import state and local contests.");
  const qs = new URLSearchParams({ ...params, key: config.googleCivicKey });
  const res = await fetch(`https://www.googleapis.com/civicinfo/v2/${path}?${qs}`, { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new HttpError(res.status === 400 ? 400 : 502, body?.error?.message || `Google Civic ${res.status}`);
  return body;
}

export async function civicElections() {
  const d = await civic("elections", {});
  return (d.elections || []).filter(e => e.id !== "2000").map(e => ({ id: e.id, name: e.name, date: e.electionDay, division: e.ocdDivisionId }));
}

export async function civicContests(electionId, address) {
  if (!address || address.length < 5) throw new HttpError(400, "Enter a street address in the area you want contests for.");
  const d = await civic("voterinfo", { address, electionId: String(electionId || ""), officialOnly: "false" });
  const contests = (d.contests || []).map((c, i) => {
    const isMeasure = c.type === "Referendum" || !!c.referendumTitle;
    const title = isMeasure ? (c.referendumTitle || c.ballotTitle || "Ballot measure") : (c.office || c.ballotTitle || "Contest");
    const options = isMeasure
      ? (c.referendumBallotResponses?.length ? c.referendumBallotResponses : ["Yes", "No"])
      : (c.candidates || []).map(k => k.party ? `${k.name} (${k.party})` : k.name);
    return {
      key: `${i}`,
      kind: isMeasure ? "measure" : "candidate",
      title,
      subtitle: c.referendumSubtitle || c.district?.name || "",
      description: (c.referendumText || c.referendumBrief || "").slice(0, 4000),
      options: [...new Set(options.filter(Boolean))],
      url: c.referendumUrl || null,
      district: c.district?.name || null,
    };
  }).filter(c => c.options.length >= 1);
  return {
    election: d.election ? { id: d.election.id, name: d.election.name, date: d.election.electionDay } : null,
    contests,
  };
}
