/**
 * Public health check — shows which parts of Agora are connected, never any secret values.
 *   GET /api/health
 */
import { features, config, databaseVarName } from "../../../lib/server/config";
import { one } from "../../../lib/server/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = { configured: features.database(), variable: databaseVarName(), reachable: false, tables: false, error: null };
  if (db.configured) {
    try {
      await one("select 1");
      db.reachable = true;
      db.tables = !!(await one("select value from agora_meta where key='schema_version'"));
    } catch (e) {
      db.error = String(e.code || "") + " " + String(e.message || "").replace(/postgres(ql)?:\/\/[^\s]+/g, "[hidden]").slice(0, 200);
    }
  }
  const body = {
    ok: db.reachable && features.secret(),
    environment: process.env.VERCEL_ENV || "local",
    database: db,
    secretKey: features.secret(),
    adminPassword: features.admin(),
    cronSecret: !!process.env.CRON_SECRET,
    emailCodes: features.email(),
    textCodes: features.sms(),
    identityChecks: features.identity(),
    fred: features.fred(),
    googleCivic: features.googleCivic(),
    devMode: config.devMode,
    checkedAt: new Date().toISOString(),
  };
  return new Response(JSON.stringify(body, null, 2), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
