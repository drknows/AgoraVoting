/**
 * Refreshes report cards from the World Bank, IMF and FRED.
 * Runs daily via Vercel Cron and on demand from the admin screen.
 */
import { handler, json, HttpError } from "../../../../lib/server/http";
import { isAdmin } from "../../../../lib/server/auth";
import { syncAll } from "../../../../lib/server/reportcards";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const run = handler(async request => {
  const secret = process.env.CRON_SECRET;
  const cron = !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
  if (!cron && !isAdmin(request)) throw new HttpError(403, "Not allowed");
  return json(await syncAll());
});
export const GET = run;
export const POST = run;
