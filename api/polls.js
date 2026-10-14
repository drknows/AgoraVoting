/* /api/polls — reader-created polls.
   GET  ?scope=pharma|health        -> {polls: [{id, scope, q, opts, created}]}  (newest first, hidden polls removed)
   POST {scope, q, opts, device}    -> {ok: true, poll}
   Storage: list "polls:<scope>" (poll JSON, newest first, capped), "poll:rec:<id>" (poll JSON incl. creator),
            set "polls:hidden" (ids removed by moderation). */
import { json, fail, query, body, route, clean, DEVICE_RE } from "./_lib/http.js";
import { cmd, many, allow } from "./_lib/store.js";
import { createHash } from "node:crypto";

export const SCOPES = ["pharma", "health"];
export const MAX_POLLS = 200;           // newest polls kept per scope
export const POLL_ID_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
export const HIDDEN = "polls:hidden";
export const recKey = id => "poll:rec:" + id;
export const listKey = scope => "polls:" + scope;

/* Privacy (see /privacy/): device ids are stored only as a salted one-way hash, and IP addresses only
   as a salted hash that changes daily, used for rate limits. Set AGORA_SALT in production. */
const SALT = process.env.AGORA_SALT || "agora-society-stands";
const sha = s => createHash("sha256").update(SALT + "|" + s).digest("base64url").slice(0, 22);
export const hid = device => sha("device|" + device);
/* Daily IP hash for a second rate-limit bucket (device ids are chosen by the browser). Null when unknown. */
export const ipOf = req => {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip");
  return ip ? sha("ip|" + new Date().toISOString().slice(0, 10) + "|" + ip) : null;
};

/* Small built-in word list for obvious profanity and slurs. Matching ignores case, common
   letter/number swaps and punctuation inside words. Not exhaustive: reports + moderation catch the rest. */
const BAD = [
  "fuck", "fucking", "fucker", "motherfucker", "shit", "shitty", "bullshit", "cunt", "bitch", "bitches", "asshole", "dickhead",
  "bastard", "whore", "slut", "cocksucker", "pussy", "twat", "wanker", "jackass", "douchebag", "retarded",
  "nigger", "nigga", "faggot", "fag", "dyke", "tranny", "kike", "spic", "chink", "gook", "wetback", "beaner", "raghead", "towelhead",
  "coon", "kyke", "paki", "sandnigger", "kys", "killyourself",
];
const BAD_SET = new Set(BAD);
const LEET = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s", "!": "i" };
export function rude(...texts) {
  const s = texts.join(" ").toLowerCase().replace(/[013457@$!]/g, c => LEET[c]);
  const bad = w => BAD_SET.has(w) || BAD_SET.has(w.replace(/(.)\1+/g, "$1")) || (w.endsWith("s") && BAD_SET.has(w.slice(0, -1)));
  if (s.split(/[^a-z]+/).some(bad)) return true;
  // "f.u.c.k" / "f u c k" style spacing: join runs of single letters
  const runs = s.replace(/\b([a-z])[\s.\-_*]+(?=[a-z]\b)/g, "$1");
  return runs.split(/[^a-z]+/).some(bad);
}

/* Look up a stored reader poll (null if unknown). */
export async function findPoll(id) {
  if (!POLL_ID_RE.test(String(id || ""))) return null;
  const raw = await cmd(["GET", recKey(id)]);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
export const isHidden = async id => (await cmd(["SISMEMBER", HIDDEN, id])) === 1;

const pub = p => ({ id: p.id, scope: p.scope, q: p.q, opts: p.opts, created: p.created });

export const GET = route(async req => {
  const scope = query(req).get("scope");
  if (!SCOPES.includes(scope)) return fail("Choose which polls to show: pharma or health.");
  const raw = await cmd(["LRANGE", listKey(scope), 0, MAX_POLLS - 1]) || [];
  const polls = raw.map(r => { try { return JSON.parse(r); } catch { return null; } }).filter(p => p && p.id);
  const hidden = polls.length ? await many(polls.map(p => ["SISMEMBER", HIDDEN, p.id])) : [];
  return json({ polls: polls.filter((_, i) => hidden[i] !== 1).map(pub) });
}, "Polls");

export const POST = route(async req => {
  const b = await body(req);
  if (!DEVICE_RE.test(String(b.device || ""))) return fail("Please reload the page and try again.");
  if (!SCOPES.includes(b.scope)) return fail("Choose a topic for your poll: pharma or health.");

  const q = clean(b.q, 400);
  if (q.length < 10) return fail("Please write a question of at least 10 characters (links are removed).");
  if (q.length > 160) return fail("Please keep your question under 160 characters.");
  if (!Array.isArray(b.opts)) return fail("Add two to four answers.");
  const opts = b.opts.map(o => clean(o, 200)).filter(Boolean);
  if (opts.length < 2 || opts.length > 4) return fail("Add two to four answers.");
  if (opts.some(o => o.length > 60)) return fail("Please keep each answer under 60 characters.");
  if (new Set(opts.map(o => o.toLowerCase())).size !== opts.length) return fail("Each answer needs to be different.");
  if (rude(q, ...opts)) return fail("Please keep polls civil. Remove profanity or insults and try again.");

  const existing = await cmd(["LRANGE", listKey(b.scope), 0, MAX_POLLS - 1]) || [];
  if (existing.some(r => { try { return JSON.parse(r).q.toLowerCase() === q.toLowerCase(); } catch { return false; } }))
    return fail("Someone already asked that question. Find it in the list and vote there.");

  if (!await allow("poll", hid(b.device), 3, 86400)) return fail("You can start up to 3 polls a day. Please try again tomorrow.", 429);
  const ip = ipOf(req);
  if (ip && !await allow("poll-ip", ip, 10, 86400)) return fail("Too many polls have been started from your network today. Please try again tomorrow.", 429);

  const poll = { id: "p-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12), scope: b.scope, q, opts, created: new Date().toISOString() };
  const rec = JSON.stringify({ ...poll, by: hid(b.device) });
  await many([
    ["SET", recKey(poll.id), rec],
    ["LPUSH", listKey(b.scope), JSON.stringify(poll)],
    ["LTRIM", listKey(b.scope), 0, MAX_POLLS - 1],
  ]);
  return json({ ok: true, poll });
}, "Polls");
