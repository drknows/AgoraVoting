/**
 * Tamper-evident audit log. Every entry stores the hash of the previous entry
 * in the same scope, so editing or deleting any past entry breaks the chain —
 * anyone can re-verify it via /api/audit.
 *   scope "global"          — accounts, admin actions, community items
 *   scope "election:<id>"   — everything that happens to one election
 */
import { tx, query } from "./db";
import { sha256 } from "./crypto";

const GENESIS = "0".repeat(64);
// Canonical JSON (sorted keys) so the hash survives the database's key reordering.
const canon = v => Array.isArray(v) ? `[${v.map(canon).join(",")}]`
  : v && typeof v === "object" ? `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`
  : JSON.stringify(v ?? null);
const entryHash = (prev, e) =>
  sha256(prev + canon({ scope: e.scope, ts: e.ts, actor: e.actor, event: e.event, detail: e.detail }));

export async function audit(scope, actor, event, detail = {}, client = null) {
  const write = async c => {
    await c.query("select pg_advisory_xact_lock(hashtext($1))", [`audit:${scope}`]);
    const last = (await c.query("select hash from audit_log where scope=$1 order by id desc limit 1", [scope])).rows[0];
    const prev = last?.hash || GENESIS;
    const e = { scope, ts: new Date().toISOString(), actor: String(actor), event, detail };
    const hash = entryHash(prev, e);
    await c.query(
      "insert into audit_log(scope, ts, actor, event, detail, prev_hash, hash) values($1,$2,$3,$4,$5,$6,$7)",
      [scope, e.ts, e.actor, event, JSON.stringify(detail), prev, hash]
    );
    return hash;
  };
  return client ? write(client) : tx(write);
}

export async function readAudit(scope, limit = 200) {
  const rows = (await query(
    "select id, ts, actor, event, detail, prev_hash, hash from audit_log where scope=$1 order by id asc",
    [scope]
  )).rows;
  let prev = GENESIS, valid = true, brokenAt = null;
  for (const r of rows) {
    const expected = entryHash(prev, { scope, ts: r.ts, actor: r.actor, event: r.event, detail: r.detail });
    if (r.prev_hash !== prev || r.hash !== expected) { valid = false; brokenAt = r.id; break; }
    prev = r.hash;
  }
  return {
    scope, valid, brokenAt, count: rows.length, head: prev,
    entries: rows.slice(-limit).reverse().map(r => ({ id: Number(r.id), ts: r.ts, actor: r.actor, event: r.event, detail: r.detail, hash: r.hash })),
  };
}
