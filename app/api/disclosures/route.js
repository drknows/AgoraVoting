/**
 * Officials' financial disclosures.
 *   GET ?view=transactions&q=&category=&level=&assetType=&from=&to=&late=1&minAmount=&official=
 *   GET ?view=summary | filings&q= | directory | meta
 *   GET ?view=pending                                  (admin) member submissions awaiting review
 *   POST { action:"submit", official, ...transaction }  verified member → pending review
 *   Admin: { action:"add", ... } | { action:"review", id, status } | { action:"delete", id }
 *          { action:"import_csv", csv } | { action:"parse_filing", id }
 */
import { handler, json, readJson, HttpError } from "../../../lib/server/http";
import { isAdmin, requireAdmin, requireMember } from "../../../lib/server/auth";
import { requireRate } from "../../../lib/server/db";
import * as D from "../../../lib/server/disclosures";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = handler(async request => {
  const p = Object.fromEntries(new URL(request.url).searchParams);
  switch (p.view || "transactions") {
    case "transactions": return json({ transactions: await D.listTransactions(p) });
    case "summary": return json(await D.summary());
    case "filings": return json({ filings: await D.listFilings(p) });
    case "directory": return json({ directory: D.DIRECTORY });
    case "meta": return json({
      categories: Object.entries(D.CATEGORIES).map(([id, c]) => ({ id, ...c })),
      assetTypes: D.ASSET_TYPES, transactionTypes: D.TXN_TYPES, directory: D.DIRECTORY,
    });
    case "pending":
      requireAdmin(request);
      return json({ transactions: await D.listTransactions({ status: "pending" }, { admin: true }) });
  }
  throw new HttpError(400, "Unknown view");
});

export const POST = handler(async request => {
  const b = await readJson(request, 5_000_000);
  if (b.action === "submit") {
    const m = await requireMember(request, 2, "Submitting a disclosure");
    await requireRate(`disclosure-submit:${m.id}`, 20, 86400, "You can submit up to 20 entries per day.");
    return json({ id: await D.addTransaction(b, { status: "pending", actor: m.id, memberId: m.id }), status: "pending" });
  }
  requireAdmin(request);
  switch (b.action) {
    case "add": return json({ id: await D.addTransaction(b, { status: "published", actor: "admin" }) });
    case "review": await D.reviewTransaction(b.id, b.status); return json({ ok: true });
    case "delete": await D.deleteTransaction(b.id); return json({ ok: true });
    case "import_csv": return json(await D.importCsv(String(b.csv || "")));
    case "parse_filing": return json(await D.parseFiling(b.id));
  }
  throw new HttpError(400, "Unknown action");
});
