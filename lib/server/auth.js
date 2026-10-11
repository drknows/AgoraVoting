/**
 * Who is making this request?
 *   - Members: signed-in via Agora's email code; session cookie "agora_session".
 *   - Admins: staff password at /admin; signed cookie "agora_admin".
 *   - Jurisdictions: election offices' systems, using an API key created by an admin.
 *
 * Verification levels:
 *   0  not signed in
 *   1  email verified
 *   2  email + mobile phone verified
 *   3  email + phone + government photo ID + live selfie + SSN verified
 */
import crypto from "node:crypto";
import { config, features } from "./config";
import { one, query } from "./db";
import { decrypt, sha256, randomToken, safeEqual } from "./crypto";
import { HttpError } from "./http";

/* ── Admin ───────────────────────────────────────────────────── */
const ADMIN_COOKIE = "agora_admin";
const adminSign = v =>
  crypto.createHmac("sha256", `agora-admin:${process.env.ADMIN_SESSION_SECRET || config.adminPassword}`).update(v).digest("hex");

export function isAdmin(request) {
  if (!features.admin()) return false;
  const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)agora_admin=([^;]+)/);
  if (!m) return false;
  const [exp, mac] = decodeURIComponent(m[1]).split(".");
  if (!exp || !mac || Number(exp) < Date.now()) return false;
  return safeEqual(mac, adminSign(exp));
}
export function adminCookie(hours = 8) {
  const exp = String(Date.now() + hours * 3600 * 1000);
  return cookie(ADMIN_COOKIE, encodeURIComponent(`${exp}.${adminSign(exp)}`), hours * 3600, "Strict");
}
export const clearAdminCookie = () => cookie(ADMIN_COOKIE, "", 0, "Strict");
export function requireAdmin(request) {
  if (!isAdmin(request)) throw new HttpError(403, "Admin sign-in required");
}

/* ── Jurisdiction API keys (for election offices' systems) ───── */
export async function jurisdictionFromRequest(request) {
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(agk_[A-Za-z0-9_-]{20,})$/);
  if (!m) return null;
  const row = await one("select id, name from jurisdiction_keys where key_hash=$1 and revoked_at is null", [sha256(m[1])]);
  if (row) await query("update jurisdiction_keys set last_used_at=now() where id=$1", [row.id]);
  return row;
}
export async function requireAdminOrJurisdiction(request) {
  if (isAdmin(request)) return { actor: "admin", jurisdiction: null };
  const j = await jurisdictionFromRequest(request);
  if (j) return { actor: `jurisdiction:${j.id}`, jurisdiction: j };
  throw new HttpError(403, "Admin sign-in or a jurisdiction API key is required");
}

/* ── Members ─────────────────────────────────────────────────── */
const SESSION_COOKIE = "agora_session";
const SESSION_DAYS = 30;

function cookie(name, value, maxAge, sameSite = "Lax") {
  const secure = config.production ? "; Secure" : "";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge}${secure}`;
}

export async function createSession(memberId) {
  const token = randomToken(32);
  await query(
    "insert into sessions(token_hash, member_id, expires_at) values($1,$2, now() + ($3 || ' days')::interval)",
    [sha256(token), memberId, String(SESSION_DAYS)]
  );
  await query("delete from sessions where member_id=$1 and expires_at < now()", [memberId]);
  return cookie(SESSION_COOKIE, token, SESSION_DAYS * 86400);
}

export async function endSession(request) {
  const t = sessionToken(request);
  if (t) await query("delete from sessions where token_hash=$1", [sha256(t)]);
  return cookie(SESSION_COOKIE, "", 0);
}

function sessionToken(request) {
  const m = (request.headers.get("cookie") || "").match(/(?:^|;\s*)agora_session=([A-Za-z0-9_-]{20,})/);
  return m ? m[1] : null;
}

export function levelOf(m) {
  if (!m || m.disabled) return 0;
  if (!m.email_verified_at) return 0;
  if (!m.phone_verified_at) return 1;
  if (m.identity_status !== "verified") return 2;
  return 3;
}

/** The signed-in member (database row), or null. */
export async function currentMember(request) {
  if (!features.database() || !features.secret()) return null;
  const t = sessionToken(request);
  if (!t) return null;
  const m = await one(
    `select m.* from sessions s join members m on m.id = s.member_id
     where s.token_hash=$1 and s.expires_at > now() and not m.disabled`,
    [sha256(t)]
  );
  if (m) m.level = levelOf(m);
  return m;
}

export const LEVEL_NAMES = ["Not signed in", "Email verified", "Email + phone verified", "Identity verified"];

export async function requireMember(request, minLevel = 1, why = "") {
  const m = await currentMember(request);
  if (!m) throw new HttpError(401, "Please sign in first.", { needLevel: minLevel });
  if (m.level < minLevel)
    throw new HttpError(403, `${why || "This action"} requires: ${LEVEL_NAMES[minLevel]}. Complete verification on the Register tab.`, { needLevel: minLevel, level: m.level });
  return m;
}

/** What the member themself is allowed to see about their own account. */
export function publicMember(m) {
  if (!m) return null;
  const email = decrypt(m.email_enc);
  return {
    id: m.id,
    displayName: m.display_name || (email ? email.split("@")[0] : "Member"),
    email,
    phoneLast4: m.phone_last4 || null,
    level: m.level ?? levelOf(m),
    levelName: LEVEL_NAMES[m.level ?? levelOf(m)],
    identity: {
      status: m.identity_status,
      error: m.identity_error || null,
      verifiedAt: m.identity_verified_at,
      legalName: m.identity_status === "verified" ? decrypt(m.legal_name_enc) : null,
      state: m.home_state || null,
    },
  };
}
