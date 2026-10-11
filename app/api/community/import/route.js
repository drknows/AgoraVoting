/**
 * Admin: look up real races and ballot measures to turn into polls.
 *   GET /api/community/import?source=fec&year=2026&office=S&state=CA&district=
 *   GET /api/community/import?source=civic_elections
 *   GET /api/community/import?source=civic_contests&electionId=...&address=...
 */
import { handler, json, HttpError } from "../../../../lib/server/http";
import { requireAdmin } from "../../../../lib/server/auth";
import { fecCandidates, civicElections, civicContests } from "../../../../lib/server/ballotdata";

export const dynamic = "force-dynamic";

export const GET = handler(async request => {
  requireAdmin(request);
  const p = new URL(request.url).searchParams;
  switch (p.get("source")) {
    case "fec": return json(await fecCandidates({ year: p.get("year"), office: p.get("office"), state: p.get("state"), district: p.get("district") }));
    case "civic_elections": return json({ elections: await civicElections() });
    case "civic_contests": return json(await civicContests(p.get("electionId"), p.get("address")));
  }
  throw new HttpError(400, "Unknown source");
});
