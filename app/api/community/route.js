/**
 * Community polls, petitions, recalls and votes of no confidence.
 *
 *   GET  /api/community?status=live|proposed|closed&kind=poll|petition|recall|no_confidence|drives&source=ballot|community
 *   GET  /api/community?id=<id>                       one item + trend history + public signers
 *   GET  /api/community?export=<id>                   (admin) signatures CSV
 *
 *   POST { action:"propose", kind, title, description, options?, multi?, goal?, target?, allowVote?, source?, closesAt? }
 *   POST { action:"support" | "unsupport", id }        proposals go live automatically at the threshold
 *   POST { action:"vote", id, choice }                 poll option index (or array) / "support" | "oppose"
 *   POST { action:"sign", id, city, county, state, zip, attest, showPublicly, displayName, stance? }
 *   POST { action:"unsign", id }
 *   Admin: { action:"admin_create", ...item, status? } | { action:"admin_status", id, status }
 *          { action:"admin_delete", id } | { action:"admin_settings", settings? }
 */
import { handler, json, readJson, HttpError } from "../../../lib/server/http";
import { currentMember, requireMember, isAdmin, requireAdmin } from "../../../lib/server/auth";
import * as C from "../../../lib/server/community";

export const dynamic = "force-dynamic";

export const GET = handler(async request => {
  const url = new URL(request.url);
  const p = url.searchParams;
  if (p.get("export")) {
    requireAdmin(request);
    const { filename, csv } = await C.exportSignatures(p.get("export"));
    return new Response(csv, { headers: {
      "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${filename}"`, "cache-control": "no-store" } });
  }
  const member = await currentMember(request);
  if (p.get("id")) return json(await C.getItem(p.get("id"), member?.id));
  const admin = isAdmin(request);
  return json(await C.listItems({
    status: p.get("status") || "live", kind: p.get("kind"), source: p.get("source"),
    memberId: member?.id, admin, limit: p.get("limit"),
  }));
});

export const POST = handler(async request => {
  const b = await readJson(request);
  switch (b.action) {
    case "propose": {
      const m = await requireMember(request, 1);
      return json({ item: { id: (await C.propose(m, b)).id } });
    }
    case "support":
    case "unsupport":
      return json(await C.support(await requireMember(request, 1), b.id, b.action === "support"));
    case "vote":
      return json({ vote: await C.vote(await requireMember(request, 1), b.id, b.choice) });
    case "sign":
      await C.sign(await requireMember(request, 1), b.id, b);
      return json({ signed: true });
    case "unsign":
      await C.unsign(await requireMember(request, 1), b.id);
      return json({ signed: false });

    case "admin_create": requireAdmin(request); return json({ item: { id: (await C.adminCreate(b)).id } });
    case "admin_status": requireAdmin(request); return json({ item: { id: (await C.adminSetStatus(b.id, b.status)).id } });
    case "admin_delete": requireAdmin(request); await C.adminDelete(b.id); return json({ deleted: true });
    case "admin_settings":
      requireAdmin(request);
      return json({ settings: b.settings ? await C.saveCommunitySettings(b.settings) : await C.getCommunitySettings() });
  }
  throw new HttpError(400, "Unknown action");
});
