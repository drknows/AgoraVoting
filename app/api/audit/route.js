/**
 * Public, tamper-evident audit log.
 *   GET /api/audit?scope=election:<id>   one election's log (public)
 *   GET /api/audit?scope=global          platform log (admins only — it references accounts)
 * Each response re-verifies the whole hash chain and reports { valid }.
 */
import { handler, json, HttpError } from "../../../lib/server/http";
import { isAdmin } from "../../../lib/server/auth";
import { readAudit } from "../../../lib/server/audit";

export const dynamic = "force-dynamic";

export const GET = handler(async request => {
  const scope = new URL(request.url).searchParams.get("scope") || "global";
  if (!/^(global|election:[0-9a-f-]{36})$/.test(scope)) throw new HttpError(400, "Unknown scope");
  if (scope === "global" && !isAdmin(request)) throw new HttpError(403, "Admin sign-in required");
  const log = await readAudit(scope, 300);
  if (scope !== "global") log.entries = log.entries.map(e => ({ ...e, actor: e.actor.startsWith("jurisdiction:") ? "jurisdiction" : e.actor }));
  return json(log);
});
