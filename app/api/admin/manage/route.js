/**
 * Admin tools.
 *   GET  ?view=setup        which services are connected (setup checklist)
 *   GET  ?view=members&q=   members (email shown masked), counts by level
 *   GET  ?view=keys         jurisdiction API keys
 *   POST { action:"member_disable" | "member_enable" | "member_reset_identity", id }
 *   POST { action:"key_create", name }   → key shown once
 *   POST { action:"key_revoke", id }
 */
import { handler, json, readJson, HttpError } from "../../../../lib/server/http";
import { requireAdmin, levelOf, LEVEL_NAMES } from "../../../../lib/server/auth";
import { setupStatus, features } from "../../../../lib/server/config";
import { query, one } from "../../../../lib/server/db";
import { decrypt, fingerprint } from "../../../../lib/server/crypto";
import { audit } from "../../../../lib/server/audit";
import { createJurisdictionKey, listJurisdictionKeys, revokeJurisdictionKey } from "../../../../lib/server/elections";

export const dynamic = "force-dynamic";

const mask = e => { if (!e) return ""; const [u, d] = e.split("@"); return `${u.slice(0, 2)}${"•".repeat(Math.max(1, u.length - 2))}@${d}`; };

export const GET = handler(async request => {
  requireAdmin(request);
  const view = new URL(request.url).searchParams.get("view");
  if (view === "setup") {
    let dbOk = false, dbError = null;
    if (features.database()) {
      try { await one("select 1"); dbOk = true; } catch (e) { dbError = e.message?.slice(0, 200); }
    }
    return json({ checks: setupStatus(), databaseReachable: dbOk, databaseError: dbError });
  }
  if (view === "members") {
    const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase();
    const params = [];
    let where = "";
    if (q) where = `where m.email_fp = $${params.push(fingerprint("email", q))}`;
    const rows = (await query(
      `select m.* from members m ${where} order by m.created_at desc limit 200`, params)).rows;
    const stats = (await query(
      `select count(*)::int as total,
         count(*) filter (where email_verified_at is not null)::int as email,
         count(*) filter (where phone_verified_at is not null)::int as phone,
         count(*) filter (where identity_status='verified')::int as identity,
         count(*) filter (where identity_status='duplicate')::int as duplicates,
         count(*) filter (where disabled)::int as disabled
       from members`)).rows[0];
    return json({
      stats,
      members: rows.map(m => ({
        id: m.id, displayName: m.display_name, email: mask(decrypt(m.email_enc)), phoneLast4: m.phone_last4,
        level: levelOf(m), levelName: LEVEL_NAMES[levelOf(m)], identityStatus: m.identity_status, identityError: m.identity_error,
        identityProvider: m.identity_provider, disabled: m.disabled, createdAt: m.created_at,
      })),
    });
  }
  if (view === "keys") return json({ keys: await listJurisdictionKeys() });
  throw new HttpError(400, "Unknown view");
});

export const POST = handler(async request => {
  requireAdmin(request);
  const b = await readJson(request);
  switch (b.action) {
    case "member_disable":
    case "member_enable": {
      const disabled = b.action === "member_disable";
      await query("update members set disabled=$2, updated_at=now() where id=$1", [b.id, disabled]);
      if (disabled) await query("delete from sessions where member_id=$1", [b.id]);
      await audit("global", "admin", disabled ? "MEMBER_DISABLED" : "MEMBER_ENABLED", { member: b.id });
      return json({ ok: true });
    }
    case "member_reset_identity":
      await query(`update members set identity_status='none', identity_session=null, identity_error=null, identity_verified_at=null,
                   legal_name_enc=null, ssn_fp=null, person_key=null, home_state=null, updated_at=now() where id=$1`, [b.id]);
      await audit("global", "admin", "IDENTITY_RESET", { member: b.id });
      return json({ ok: true });
    case "key_create": return json(await createJurisdictionKey(b.name));
    case "key_revoke": await revokeJurisdictionKey(b.id); return json({ ok: true });
  }
  throw new HttpError(400, "Unknown action");
});
