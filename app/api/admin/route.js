/**
 * Admin sign-in, checked on the server.
 *
 * The password lives only in the ADMIN_PASSWORD environment variable (set in
 * Vercel → Settings → Environment Variables). It is never sent to browsers.
 * If ADMIN_PASSWORD is not set, admin access is switched off entirely.
 *
 *   GET    /api/admin  → { enabled, admin }       is this browser signed in?
 *   POST   /api/admin  { password }               sign in (sets a secure cookie)
 *   DELETE /api/admin                             sign out
 */
import crypto from "node:crypto";
import { features, config } from "../../../lib/server/config";
import { isAdmin, adminCookie, clearAdminCookie } from "../../../lib/server/auth";
import { json, clientIp } from "../../../lib/server/http";

export const dynamic = "force-dynamic";

// Slow down password guessing (per server instance).
const attempts = new Map();
function tooManyAttempts(ip) {
  const now = Date.now(), windowMs = 15 * 60 * 1000;
  const list = (attempts.get(ip) || []).filter(t => now - t < windowMs);
  attempts.set(ip, list);
  return list.length >= 5;
}

export async function GET(request) {
  return json({ enabled: features.admin(), admin: isAdmin(request) });
}

export async function POST(request) {
  if (!features.admin())
    return json({ error: "Admin access is turned off. Set ADMIN_PASSWORD (12+ characters) in Vercel and redeploy." }, 503);
  const ip = clientIp(request);
  if (tooManyAttempts(ip)) return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);

  const { password } = await request.json().catch(() => ({}));
  const h = v => crypto.createHash("sha256").update(String(v || "")).digest();
  if (!crypto.timingSafeEqual(h(password), h(config.adminPassword))) {
    attempts.set(ip, [...(attempts.get(ip) || []), Date.now()]);
    await new Promise(r => setTimeout(r, 800));
    return json({ error: "Incorrect password." }, 401);
  }
  return json({ admin: true }, 200, { "set-cookie": adminCookie(8) });
}

export async function DELETE() {
  return json({ admin: false }, 200, { "set-cookie": clearAdminCookie() });
}
