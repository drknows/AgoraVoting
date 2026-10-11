/**
 * Refreshes U.S. House trade reports. Runs daily via Vercel Cron (vercel.json)
 * and on demand from Admin → Disclosures → "Sync now".
 * Cron requests carry "Authorization: Bearer $CRON_SECRET" (set CRON_SECRET in Vercel).
 */
import { handler, json, HttpError } from "../../../../lib/server/http";
import { isAdmin } from "../../../../lib/server/auth";
import { syncHouse } from "../../../../lib/server/disclosures";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request) {
  if (isAdmin(request)) return true;
  const secret = process.env.CRON_SECRET;
  return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}

const run = handler(async request => {
  if (!authorized(request)) throw new HttpError(403, "Not allowed");
  return json(await syncHouse({ budgetMs: 45_000 }));
});
export const GET = run;
export const POST = run;
