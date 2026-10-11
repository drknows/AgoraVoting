/**
 * Official elections.
 *   GET  /api/elections                          public list (admins also see drafts)
 *   POST /api/elections { action:"create", election }            admin or jurisdiction key
 *   POST /api/elections { action:"import_cdf", report, mode? }    NIST SP 1500-100 v2 JSON
 *        (send the same report again with new counts to update live results)
 *
 * Jurisdiction systems authenticate with:  Authorization: Bearer agk_...
 */
import { handler, json, readJson, HttpError } from "../../../lib/server/http";
import { isAdmin, requireAdminOrJurisdiction } from "../../../lib/server/auth";
import { listElections, createElection, importCdf } from "../../../lib/server/elections";

export const dynamic = "force-dynamic";

export const GET = handler(async request => json({ elections: await listElections({ admin: isAdmin(request) }) }));

export const POST = handler(async request => {
  const { actor } = await requireAdminOrJurisdiction(request);
  const b = await readJson(request, 20_000_000);
  if (b.action === "create") return json({ id: await createElection(b.election || {}, actor) });
  if (b.action === "import_cdf") return json(await importCdf(b.report, actor, { mode: b.mode }));
  // Allow posting a bare ElectionReport document too.
  if (/ElectionReport$/.test(b["@type"] || "")) return json(await importCdf(b, actor));
  throw new HttpError(400, "Unknown action");
});
