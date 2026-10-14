/* Shared helpers for every /api route. Web-standard Request -> Response handlers (Vercel Node.js runtime). */

export const json = (data, status = 200, maxAge = 0) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": maxAge ? `public, s-maxage=${maxAge}, stale-while-revalidate=${maxAge * 4}` : "no-store",
    },
  });

/* A user-facing error: the site shows `error` to the reader, so keep it plain and helpful. */
export const fail = (error, status = 400) => json({ error }, status);

export const query = req => new URL(req.url).searchParams;

export async function body(req) {
  try { const b = await req.json(); return b && typeof b === "object" ? b : {}; } catch { return {}; }
}

/* fetch with a timeout; throws on non-2xx */
export async function get(url, opt = {}) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), opt.timeout || 15000);
  try {
    const r = await fetch(url, { ...opt, signal: ctl.signal });
    if (!r.ok) throw Object.assign(new Error(`${r.status} from ${new URL(url).host}`), { status: r.status });
    return r;
  } finally { clearTimeout(timer); }
}
export const getJSON = async (url, opt) => (await get(url, opt)).json();

/* Wrap a handler so unexpected failures return a friendly JSON error instead of a crash page. */
export const route = (fn, what = "This feature") => async req => {
  try { return await fn(req); }
  catch (e) {
    console.error(e);
    return fail(`${what} is temporarily unavailable. Please try again in a few minutes.`, 502);
  }
};

/* Clean text from readers: trim, collapse whitespace, cap length, drop links. */
export const clean = (s, max = 200) =>
  String(s ?? "").replace(/\s+/g, " ").replace(/https?:\/\/\S+|www\.\S+/gi, "").trim().slice(0, max);

export const DEVICE_RE = /^[A-Za-z0-9-]{8,64}$/;
