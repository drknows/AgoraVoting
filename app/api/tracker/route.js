/**
 * Live Tracker — one snapshot of everything moving right now:
 * live polls (with trend lines), petitions & signature drives, proposals close
 * to going live, and official elections (turnout + results when not sealed).
 * The page refreshes this every few seconds.
 */
import { handler, json } from "../../../lib/server/http";
import { query } from "../../../lib/server/db";
import { listItems } from "../../../lib/server/community";
import { listElections, getElection } from "../../../lib/server/elections";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const [polls, drives, proposals, elections] = await Promise.all([
    listItems({ status: "live", kind: "poll", limit: 30 }),
    listItems({ status: "live", limit: 60 }),
    listItems({ status: "proposed", limit: 10 }),
    listElections(),
  ]);
  const pollIds = polls.items.map(i => i.id);
  const hist = pollIds.length ? (await query(
    `select item_id, ts, counts from community_snapshots
     where item_id = any($1) and ts > now() - interval '30 days' order by ts asc`, [pollIds])).rows : [];
  const byItem = {};
  for (const h of hist) (byItem[h.item_id] ||= []).push({ t: h.ts, voters: h.counts.voters ?? 0, tally: h.counts.tally || {} });

  const active = elections.filter(e => ["open", "closed", "certified"].includes(e.status)).slice(0, 12);
  const detailed = await Promise.all(active.map(e => getElection(e.id).catch(() => null)));

  return json({
    generatedAt: new Date().toISOString(),
    polls: polls.items.sort((a, b) => b.voters - a.voters).map(p => ({ ...p, history: (byItem[p.id] || []).slice(-60) })),
    drives: drives.items.filter(i => i.kind !== "poll").sort((a, b) => b.signatures - a.signatures),
    proposals: proposals.items,
    elections: detailed.filter(Boolean).map(e => ({
      id: e.id, name: e.name, jurisdiction: e.jurisdiction, status: e.status, mode: e.mode, isTest: e.isTest,
      turnout: e.turnout, closesAt: e.closesAt, resultsVisible: e.resultsVisible, reported: e.reported,
      contests: e.contests.map(k => ({ id: k.id, title: k.title, results: e.results?.[k.id] || null })),
      history: (e.history || []).slice(-60),
      updatedAt: e.updatedAt,
    })),
    upcoming: elections.filter(e => e.status === "scheduled").slice(0, 10).map(e => ({ id: e.id, name: e.name, jurisdiction: e.jurisdiction, opensAt: e.opensAt })),
  }, 200, { "cache-control": "public, s-maxage=5, stale-while-revalidate=10" });
});
