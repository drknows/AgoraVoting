/**
 * Government Report Cards.
 *   GET ?level=national|state|county|city&q=&state=&sort=name|ethics|economy|ethics_low|economy_low
 *   GET ?key=country:USA                     one card + history + methodology
 *   POST (admin) { action:"assess", level, name, state?, iso?, key?, items:{ <criterion>: { score 0-4, source, note } } }
 */
import { handler, json, readJson, HttpError } from "../../../lib/server/http";
import { requireAdmin } from "../../../lib/server/auth";
import { listCards, getCard, saveRubric } from "../../../lib/server/reportcards";

export const dynamic = "force-dynamic";

export const GET = handler(async request => {
  const p = Object.fromEntries(new URL(request.url).searchParams);
  if (p.key) return json(await getCard(p.key));
  return json(await listCards(p), 200, { "cache-control": "public, s-maxage=300, stale-while-revalidate=600" });
});

export const POST = handler(async request => {
  requireAdmin(request);
  const b = await readJson(request);
  if (b.action === "assess") return json({ key: await saveRubric(b) });
  throw new HttpError(400, "Unknown action");
});
