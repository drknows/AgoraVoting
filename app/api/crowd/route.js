/**
 * Crowdsource Democracy — citizen proposals, votes and comments.
 *
 * Storage: Upstash Redis over its REST API (free tier, added in Vercel under
 * Storage → Upstash → Redis). Vercel sets KV_REST_API_URL / KV_REST_API_TOKEN
 * (or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) automatically when
 * the database is connected to the project.
 *
 *   GET  /api/crowd?sort=top|new                 → list proposals
 *   GET  /api/crowd?id=<id>                      → one proposal + comments
 *   POST /api/crowd {action:"create", title, body, category, name}
 *   POST /api/crowd {action:"vote", id, dir: 1|-1|0}
 *   POST /api/crowd {action:"comment", id, text, name, stance}
 */
import crypto from "node:crypto";

export const dynamic = "force-dynamic";

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const SALT = process.env.CROWD_SALT || TOKEN.slice(0, 16) || "agora";

const CATEGORIES = [
  "Voting & Elections", "Government Ethics", "Civil Rights", "Economy & Jobs",
  "Healthcare", "Education", "Environment", "Housing", "Public Safety",
  "Technology & Privacy", "Local Issues", "Other",
];

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

async function redis(commands) {
  const res = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Database error ${res.status}`);
  const out = await res.json();
  return out.map((r) => {
    if (r.error) throw new Error(r.error);
    return r.result;
  });
}

const clean = (s, max) =>
  String(s ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);

function visitor(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") || "unknown";
  return crypto.createHash("sha256").update(`${SALT}:${ip}`).digest("hex").slice(0, 24);
}

async function rateLimit(who, kind, max, seconds) {
  const key = `rl:${kind}:${who}:${Math.floor(Date.now() / 1000 / seconds)}`;
  const [count] = await redis([["INCR", key], ["EXPIRE", key, String(seconds)]]);
  return count <= max;
}

const parse = (s) => { try { return JSON.parse(s); } catch { return null; } };

export async function GET(request) {
  if (!URL_ || !TOKEN) return json({ error: "Crowdsource storage not configured", setup: true }, 503);
  const { searchParams } = new URL(request.url);
  try {
    const id = searchParams.get("id");
    if (id) {
      if (!/^[a-f0-9-]{8,40}$/.test(id)) return json({ error: "Bad id" }, 400);
      const [idea, comments] = await redis([
        ["GET", `idea:${id}`],
        ["LRANGE", `idea:${id}:comments`, "0", "199"],
      ]);
      if (!idea) return json({ error: "Not found" }, 404);
      return json({ idea: parse(idea), comments: (comments || []).map(parse).filter(Boolean) });
    }
    const sort = searchParams.get("sort") === "new" ? "ideas:new" : "ideas:top";
    const category = searchParams.get("category");
    const [ids] = await redis([["ZREVRANGE", sort, "0", "199"]]);
    if (!ids?.length) return json({ ideas: [], categories: CATEGORIES });
    const [rows] = await redis([["MGET", ...ids.map((i) => `idea:${i}`)]]);
    let ideas = rows.map(parse).filter(Boolean).filter((i) => !i.hidden);
    if (category && CATEGORIES.includes(category)) ideas = ideas.filter((i) => i.category === category);
    return json({ ideas: ideas.slice(0, 60), categories: CATEGORIES });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}

export async function POST(request) {
  if (!URL_ || !TOKEN) return json({ error: "Crowdsource storage not configured", setup: true }, 503);
  const body = await request.json().catch(() => ({}));
  const who = visitor(request);
  try {
    if (body.action === "create") {
      const title = clean(body.title, 120);
      const text = clean(body.body, 2000);
      const name = clean(body.name, 40) || "Anonymous citizen";
      const category = CATEGORIES.includes(body.category) ? body.category : "Other";
      if (title.length < 8) return json({ error: "Title needs at least 8 characters" }, 400);
      if (text.length < 20) return json({ error: "Please describe the idea in at least 20 characters" }, 400);
      if (!(await rateLimit(who, "create", 3, 3600)))
        return json({ error: "Limit reached: 3 proposals per hour" }, 429);
      const id = crypto.randomUUID();
      const idea = { id, title, body: text, category, name, created: Date.now(), up: 0, down: 0, comments: 0 };
      await redis([
        ["SET", `idea:${id}`, JSON.stringify(idea)],
        ["ZADD", "ideas:new", String(idea.created), id],
        ["ZADD", "ideas:top", "0", id],
      ]);
      return json({ idea });
    }

    const id = clean(body.id, 40);
    if (!/^[a-f0-9-]{8,40}$/.test(id)) return json({ error: "Bad id" }, 400);
    const [raw] = await redis([["GET", `idea:${id}`]]);
    const idea = parse(raw);
    if (!idea) return json({ error: "Not found" }, 404);

    if (body.action === "vote") {
      if (!(await rateLimit(who, "vote", 60, 3600))) return json({ error: "Too many votes — try later" }, 429);
      const dir = [1, -1, 0].includes(body.dir) ? body.dir : 0;
      const ops = [
        ["SREM", `idea:${id}:up`, who],
        ["SREM", `idea:${id}:down`, who],
      ];
      if (dir === 1) ops.push(["SADD", `idea:${id}:up`, who]);
      if (dir === -1) ops.push(["SADD", `idea:${id}:down`, who]);
      ops.push(["SCARD", `idea:${id}:up`], ["SCARD", `idea:${id}:down`]);
      const out = await redis(ops);
      idea.up = out[out.length - 2];
      idea.down = out[out.length - 1];
      await redis([
        ["SET", `idea:${id}`, JSON.stringify(idea)],
        ["ZADD", "ideas:top", String(idea.up - idea.down), id],
      ]);
      return json({ idea, myVote: dir });
    }

    if (body.action === "comment") {
      const text = clean(body.text, 1000);
      const name = clean(body.name, 40) || "Anonymous citizen";
      const stance = ["support", "oppose", "question"].includes(body.stance) ? body.stance : "question";
      if (text.length < 3) return json({ error: "Comment is empty" }, 400);
      if (!(await rateLimit(who, "comment", 20, 3600)))
        return json({ error: "Limit reached: 20 comments per hour" }, 429);
      const comment = { text, name, stance, created: Date.now() };
      idea.comments = (idea.comments || 0) + 1;
      await redis([
        ["LPUSH", `idea:${id}:comments`, JSON.stringify(comment)],
        ["LTRIM", `idea:${id}:comments`, "0", "499"],
        ["SET", `idea:${id}`, JSON.stringify(idea)],
      ]);
      return json({ comment, idea });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}
