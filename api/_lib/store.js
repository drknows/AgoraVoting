/* Durable storage: Upstash Redis over its REST API (connect it from the Vercel Marketplace).
   Vercel adds KV_REST_API_URL / KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL / _TOKEN) automatically.
   With neither set (local dev, tests) it falls back to an in-memory store that resets on restart. */

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const durable = !!(URL_ && TOKEN);

async function remote(cmd) {
  const r = await fetch(URL_, { method: "POST", headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" }, body: JSON.stringify(cmd) });
  const j = await r.json(); if (j.error) throw new Error("Redis: " + j.error); return j.result;
}
async function pipeline(cmds) {
  const r = await fetch(URL_.replace(/\/$/, "") + "/pipeline", { method: "POST", headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" }, body: JSON.stringify(cmds) });
  const j = await r.json(); return j.map(x => { if (x.error) throw new Error("Redis: " + x.error); return x.result; });
}

/* ── in-memory fallback implementing just the commands we use ── */
const mem = globalThis.__agoraMem ||= new Map();
const exp = globalThis.__agoraExp ||= new Map();
const alive = k => { const t = exp.get(k); if (t && t < Date.now()) { mem.delete(k); exp.delete(k); } return mem.has(k); };
function local([c, k, ...a]) {
  c = c.toUpperCase();
  switch (c) {
    case "GET": return alive(k) ? mem.get(k) : null;
    case "SET": { const nx = a.includes("NX"), ex = a.indexOf("EX"); if (nx && alive(k)) return null; mem.set(k, String(a[0])); if (ex >= 0) exp.set(k, Date.now() + a[ex + 1] * 1000); return "OK"; }
    case "DEL": return mem.delete(k) ? 1 : 0;
    case "EXPIRE": if (!alive(k)) return 0; exp.set(k, Date.now() + a[0] * 1000); return 1;
    case "INCR": { const v = (+(alive(k) ? mem.get(k) : 0) || 0) + 1; mem.set(k, String(v)); return v; }
    case "HINCRBY": { const h = alive(k) ? mem.get(k) : {}; h[a[0]] = (+h[a[0]] || 0) + +a[1]; mem.set(k, h); return h[a[0]]; }
    case "HGETALL": { const h = alive(k) ? mem.get(k) : null; return h ? Object.entries(h).flat().map(String) : []; }
    case "HGET": { const h = alive(k) ? mem.get(k) : null; return h && h[a[0]] != null ? String(h[a[0]]) : null; }
    case "HSET": { const h = alive(k) ? mem.get(k) : {}; for (let i = 0; i < a.length; i += 2) h[a[i]] = String(a[i + 1]); mem.set(k, h); return a.length / 2; }
    case "LPUSH": { const l = alive(k) ? mem.get(k) : []; l.unshift(...a.map(String).reverse()); mem.set(k, l); return l.length; }
    case "LTRIM": { const l = alive(k) ? mem.get(k) : []; const end = +a[1] < 0 ? l.length + +a[1] + 1 : +a[1] + 1; mem.set(k, l.slice(+a[0], end)); return "OK"; }
    case "LRANGE": { const l = alive(k) ? mem.get(k) : []; const end = +a[1] < 0 ? l.length + +a[1] + 1 : +a[1] + 1; return l.slice(+a[0], end); }
    case "SADD": { const s = alive(k) ? mem.get(k) : new Set(); let n = 0; a.forEach(v => { if (!s.has(String(v))) { s.add(String(v)); n++; } }); mem.set(k, s); return n; }
    case "SISMEMBER": return alive(k) && mem.get(k).has(String(a[0])) ? 1 : 0;
    case "SCARD": return alive(k) ? mem.get(k).size : 0;
    default: throw new Error("memory store: unsupported " + c);
  }
}

export const cmd = c => durable ? remote(c) : Promise.resolve(local(c));
export const many = cs => durable ? pipeline(cs) : Promise.resolve(cs.map(local));

export const hgetall = async k => { const a = await cmd(["HGETALL", k]) || []; const o = {}; for (let i = 0; i < a.length; i += 2) o[a[i]] = +a[i + 1] || 0; return o; };

/* Simple fixed-window rate limit. Returns true if the action is allowed. */
export async function allow(bucket, id, limit, windowSec) {
  const k = `rl:${bucket}:${id}:${Math.floor(Date.now() / 1000 / windowSec)}`;
  const [n] = await many([["INCR", k], ["EXPIRE", k, windowSec]]);
  return n <= limit;
}

/* Cache JSON from slow upstream sources. */
export async function cached(key, ttlSec, fn) {
  try { const hit = await cmd(["GET", "cache:" + key]); if (hit) return JSON.parse(hit); } catch {}
  const v = await fn();
  try { await cmd(["SET", "cache:" + key, JSON.stringify(v), "EX", ttlSec]); } catch {}
  return v;
}
