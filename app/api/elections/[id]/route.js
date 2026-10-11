/**
 * One official election.
 *   GET  /api/elections/:id                     details, turnout, results (if not sealed)
 *   GET  /api/elections/:id?format=cdf          NIST 1500-100 results export
 *   GET  /api/elections/:id?receipt=CODE        "is my ballot in the count?"
 *
 *   Voters:          POST { action:"cast", registration, selections }
 *   Admin/jurisdiction:
 *     POST { action:"update", election }        edit before voting opens
 *     POST { action:"status", status }          draft → scheduled → open → closed → certified
 *     POST { action:"policy", policy }          "live" | "sealed_until_close"
 *     POST { action:"roll", records:[{voterId,lastName,dob}], replace }
 *     POST { action:"delete" }
 */
import { handler, json, readJson, HttpError } from "../../../../lib/server/http";
import { isAdmin, requireMember, requireAdminOrJurisdiction } from "../../../../lib/server/auth";
import * as E from "../../../../lib/server/elections";

export const dynamic = "force-dynamic";

export const GET = handler(async (request, { params }) => {
  const p = new URL(request.url).searchParams;
  if (p.get("receipt")) return json(await E.checkReceipt(params.id, p.get("receipt")));
  if (p.get("format") === "cdf") {
    const doc = await E.exportCdf(params.id);
    return new Response(JSON.stringify(doc, null, 2), { headers: {
      "content-type": "application/json", "content-disposition": `attachment; filename="agora-election-${params.id.slice(0, 8)}-nist1500.json"` } });
  }
  return json({ election: await E.getElection(params.id, { admin: isAdmin(request) }) });
});

export const POST = handler(async (request, { params }) => {
  const b = await readJson(request, 20_000_000);
  if (b.action === "cast") {
    const member = await requireMember(request, 2, "Voting");
    return json(await E.castBallot(params.id, member, b));
  }
  const { actor } = await requireAdminOrJurisdiction(request);
  switch (b.action) {
    case "update": await E.updateElection(params.id, b.election || {}, actor); return json({ ok: true });
    case "status": await E.setStatus(params.id, b.status, actor); return json({ ok: true });
    case "policy": await E.setPolicy(params.id, b.policy, actor); return json({ ok: true });
    case "roll": return json(await E.loadRoll(params.id, b.records, { replace: !!b.replace }, actor));
    case "delete": await E.deleteElection(params.id, actor); return json({ ok: true });
  }
  throw new HttpError(400, "Unknown action");
});
