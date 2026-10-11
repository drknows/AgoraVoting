/** Small helpers shared by every API route. */

export class HttpError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; this.extra = extra; }
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}

export async function readJson(request, maxBytes = 2_000_000) {
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, "Request too large");
  if (!text) return {};
  try { return JSON.parse(text); } catch { throw new HttpError(400, "Invalid JSON"); }
}

export function clientIp(request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

export function origin(request) {
  const h = request.headers;
  const proto = h.get("x-forwarded-proto") || "https";
  const host = h.get("x-forwarded-host") || h.get("host");
  return host ? `${proto}://${host}` : new URL(request.url).origin;
}

/** Wraps a route handler: turns thrown HttpErrors into JSON responses. */
export function handler(fn) {
  return async (request, ctx) => {
    try {
      return await fn(request, ctx);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, ...e.extra }, e.status);
      console.error(e);
      return json({ error: "Server error" }, 500);
    }
  };
}

export const clean = (s, max = 500) =>
  String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
