/**
 * Crowdsource Democracy — citizen law ideas, votes and debate (Postgres).
 *
 *   GET  /api/crowd?sort=top|new&category=     → list ideas
 *   GET  /api/crowd?id=<id>                    → one idea + comments
 *   POST {action:"create", title, body, category, name}
 *   POST {action:"vote", id, dir: 1|-1|0}
 *   POST {action:"comment", id, text, name, stance}
 * Signed-in members vote as themselves; visitors are identified by a hashed IP.
 */
import { handler, json, readJson, clientIp, clean, HttpError } from "../../../lib/server/http";
import { query, one, requireRate } from "../../../lib/server/db";
import { currentMember } from "../../../lib/server/auth";
import { fingerprint, randomId } from "../../../lib/server/crypto";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "Voting & Elections", "Government Ethics", "Civil Rights", "Economy & Jobs",
  "Healthcare", "Education", "Environment", "Housing", "Public Safety",
  "Technology & Privacy", "Local Issues", "Other",
];

async function voterId(request) {
  const m = await currentMember(request);
  return m ? `m:${m.id}` : `v:${fingerprint("visitor", clientIp(request)).slice(0, 32)}`;
}

const IDEA_SQL = `select i.id, i.title, i.body, i.category, i.name, extract(epoch from i.created_at)*1000 as created,
  coalesce((select count(*) from crowd_votes v where v.idea_id=i.id and v.dir=1),0)::int as up,
  coalesce((select count(*) from crowd_votes v where v.idea_id=i.id and v.dir=-1),0)::int as down,
  (select count(*) from crowd_comments c where c.idea_id=i.id)::int as comments
  from crowd_ideas i`;
const shape = r => r && ({ ...r, created: Number(r.created) });

export const GET = handler(async request => {
  const p = new URL(request.url).searchParams;
  const id = p.get("id");
  if (id) {
    const idea = shape(await one(`${IDEA_SQL} where i.id=$1 and not i.hidden`, [id]));
    if (!idea) throw new HttpError(404, "Not found");
    const comments = (await query(
      "select text, name, stance, extract(epoch from created_at)*1000 as created from crowd_comments where idea_id=$1 order by created_at desc limit 200", [id]
    )).rows.map(shape);
    return json({ idea, comments });
  }
  const params = [];
  let where = "where not i.hidden";
  const category = p.get("category");
  if (category && CATEGORIES.includes(category)) where += ` and i.category=$${params.push(category)}`;
  const order = p.get("sort") === "new" ? "created desc" : "(up - down) desc, created desc";
  const ideas = (await query(`select * from (${IDEA_SQL} ${where}) x order by ${order} limit 60`, params)).rows.map(shape);
  return json({ ideas, categories: CATEGORIES });
});

export const POST = handler(async request => {
  const body = await readJson(request);
  const who = await voterId(request);

  if (body.action === "create") {
    const title = clean(body.title, 120), text = clean(body.body, 2000);
    const name = clean(body.name, 40) || "Anonymous citizen";
    const category = CATEGORIES.includes(body.category) ? body.category : "Other";
    if (title.length < 8) throw new HttpError(400, "Title needs at least 8 characters");
    if (text.length < 20) throw new HttpError(400, "Please describe the idea in at least 20 characters");
    await requireRate(`crowd-create:${who}`, 3, 3600, "Limit reached: 3 proposals per hour");
    const id = randomId();
    await query("insert into crowd_ideas(id, title, body, category, name) values($1,$2,$3,$4,$5)", [id, title, text, category, name]);
    return json({ idea: shape(await one(`${IDEA_SQL} where i.id=$1`, [id])) });
  }

  const id = clean(body.id, 40);
  if (!(await one("select 1 from crowd_ideas where id=$1 and not hidden", [id]))) throw new HttpError(404, "Not found");

  if (body.action === "vote") {
    await requireRate(`crowd-vote:${who}`, 60, 3600, "Too many votes — try later");
    const dir = [1, -1].includes(body.dir) ? body.dir : 0;
    if (dir === 0) await query("delete from crowd_votes where idea_id=$1 and voter=$2", [id, who]);
    else await query(
      "insert into crowd_votes(idea_id, voter, dir) values($1,$2,$3) on conflict (idea_id, voter) do update set dir=excluded.dir",
      [id, who, dir]);
    return json({ idea: shape(await one(`${IDEA_SQL} where i.id=$1`, [id])), myVote: dir });
  }

  if (body.action === "comment") {
    const text = clean(body.text, 1000), name = clean(body.name, 40) || "Anonymous citizen";
    const stance = ["support", "oppose", "question"].includes(body.stance) ? body.stance : "question";
    if (text.length < 3) throw new HttpError(400, "Comment is empty");
    await requireRate(`crowd-comment:${who}`, 20, 3600, "Limit reached: 20 comments per hour");
    const c = await one(
      "insert into crowd_comments(idea_id, text, name, stance) values($1,$2,$3,$4) returning text, name, stance, extract(epoch from created_at)*1000 as created",
      [id, text, name, stance]);
    return json({ comment: shape(c), idea: shape(await one(`${IDEA_SQL} where i.id=$1`, [id])) });
  }
  throw new HttpError(400, "Unknown action");
});
