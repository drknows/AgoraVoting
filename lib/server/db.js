/**
 * Postgres (Neon on Vercel). Tables are created automatically on first use.
 *
 * Privacy rules built into the schema:
 *  - Email, phone and legal name are stored encrypted (AES-256-GCM).
 *  - SSNs, ID document images and selfies are NEVER stored. Only a keyed
 *    fingerprint of the SSN is kept, to stop one person opening several accounts.
 *  - Official ballots are stored with no member ID and no timestamp; a separate
 *    table records only that a voter has voted.
 */
import pg from "pg";
import { config, features } from "./config";
import { HttpError } from "./http";

const SCHEMA_VERSION = 3;

const SCHEMA = `
create table if not exists agora_meta (key text primary key, value jsonb);
create table if not exists settings (key text primary key, value jsonb not null, updated_at timestamptz default now());

-- ── Members & verification ─────────────────────────────────────
create table if not exists members (
  id text primary key,
  email_fp text unique not null,
  email_enc text not null,
  display_name text,
  phone_fp text unique,
  phone_enc text,
  phone_last4 text,
  email_verified_at timestamptz,
  phone_verified_at timestamptz,
  identity_status text not null default 'none',
  identity_provider text,
  identity_session text,
  identity_error text,
  identity_verified_at timestamptz,
  legal_name_enc text,
  ssn_fp text unique,
  person_key text,
  home_state text,
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists sessions (
  token_hash text primary key,
  member_id text not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_member on sessions(member_id);
create table if not exists verification_codes (
  id bigserial primary key,
  purpose text not null,
  target_fp text not null,
  member_id text,
  code_fp text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists verification_codes_target on verification_codes(purpose, target_fp, created_at desc);
create table if not exists rate_limits (key text primary key, window_start timestamptz not null, count int not null);

-- ── Tamper-evident audit log (each entry hashes the one before) ─
create table if not exists audit_log (
  id bigserial primary key,
  scope text not null,
  ts text not null,
  actor text not null,
  event text not null,
  detail jsonb not null default '{}'::jsonb,
  prev_hash text not null,
  hash text not null
);
create index if not exists audit_scope on audit_log(scope, id);

-- ── Community: polls, petitions, recalls, no-confidence ────────
create table if not exists community_items (
  id text primary key,
  kind text not null,
  status text not null,
  title text not null,
  description text not null default '',
  category text,
  options jsonb,
  multi boolean not null default false,
  source jsonb,
  goal int,
  allow_vote boolean not null default false,
  target jsonb,
  requires_identity boolean not null default false,
  closes_at timestamptz,
  created_by text,
  created_by_name text,
  created_by_admin boolean not null default false,
  created_at timestamptz not null default now(),
  live_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists community_items_status on community_items(status, created_at desc);
create table if not exists community_supporters (
  item_id text not null references community_items(id) on delete cascade,
  member_id text not null references members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, member_id)
);
create table if not exists community_votes (
  item_id text not null references community_items(id) on delete cascade,
  member_id text not null references members(id) on delete cascade,
  choice jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (item_id, member_id)
);
create table if not exists community_signatures (
  item_id text not null references community_items(id) on delete cascade,
  member_id text not null references members(id) on delete cascade,
  legal_name_enc text,
  display_name text,
  city text, county text, state text, zip text,
  show_publicly boolean not null default false,
  identity_verified boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (item_id, member_id)
);
create table if not exists community_snapshots (
  id bigserial primary key,
  item_id text not null references community_items(id) on delete cascade,
  ts timestamptz not null default now(),
  counts jsonb not null
);
create index if not exists community_snapshots_item on community_snapshots(item_id, ts);

-- ── Crowdsource ideas ───────────────────────────────────────────
create table if not exists crowd_ideas (
  id text primary key, title text not null, body text not null, category text not null,
  name text not null, created_at timestamptz not null default now(), hidden boolean not null default false
);
create table if not exists crowd_votes (
  idea_id text not null references crowd_ideas(id) on delete cascade,
  voter text not null, dir int not null, primary key (idea_id, voter)
);
create table if not exists crowd_comments (
  id bigserial primary key,
  idea_id text not null references crowd_ideas(id) on delete cascade,
  text text not null, name text not null, stance text not null,
  created_at timestamptz not null default now()
);

-- ── Official elections ─────────────────────────────────────────
create table if not exists elections (
  id text primary key,
  name text not null,
  jurisdiction jsonb not null,
  type text not null default 'general',
  mode text not null default 'agora_ballots',
  status text not null default 'draft',
  results_policy text not null default 'sealed_until_close',
  is_test boolean not null default false,
  opens_at timestamptz,
  closes_at timestamptz,
  source jsonb,
  source_key text unique,
  reported jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  certified_at timestamptz
);
create table if not exists election_contests (
  election_id text not null references elections(id) on delete cascade,
  id text not null,
  seq int not null default 0,
  kind text not null,
  title text not null,
  subtitle text,
  body text,
  method text not null default 'plurality_single',
  seats int not null default 1,
  options jsonb not null,
  primary key (election_id, id)
);
create table if not exists election_roll (
  election_id text not null references elections(id) on delete cascade,
  roll_fp text not null,
  primary key (election_id, roll_fp)
);
create table if not exists election_participation (
  election_id text not null references elections(id) on delete cascade,
  voter_fp text not null,
  primary key (election_id, voter_fp)
);
create table if not exists election_ballots (
  id text primary key,
  election_id text not null references elections(id) on delete cascade,
  receipt_hash text not null unique,
  selections jsonb not null
);
create index if not exists election_ballots_election on election_ballots(election_id);
create table if not exists election_reports (
  id bigserial primary key,
  election_id text not null references elections(id) on delete cascade,
  ts timestamptz not null default now(),
  status text,
  counts jsonb not null,
  subunits jsonb
);
-- ── Financial disclosures of officials ─────────────────────────
create table if not exists disclosure_officials (
  id text primary key,
  name text not null,
  name_key text not null,
  category text not null,
  office text,
  level text not null,
  jurisdiction text,
  state text,
  district text,
  created_at timestamptz not null default now(),
  unique (name_key, category, jurisdiction)
);
create table if not exists disclosure_filings (
  id text primary key,
  source text not null,
  official_id text references disclosure_officials(id) on delete set null,
  year int,
  filer_name text,
  state_district text,
  filing_type text,
  filing_date date,
  document_url text,
  parse_status text not null default 'pending',
  parse_error text,
  parsed_at timestamptz,
  txn_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists disclosure_filings_date on disclosure_filings(filing_date desc);
create table if not exists disclosure_transactions (
  id text primary key,
  official_id text not null references disclosure_officials(id) on delete cascade,
  filing_id text references disclosure_filings(id) on delete cascade,
  line_no int,
  owner text,
  asset_name text not null,
  ticker text,
  asset_type text,
  transaction_type text,
  transaction_date date,
  disclosed_date date,
  amount_min bigint,
  amount_max bigint,
  amount_text text,
  source_type text not null,
  source_url text not null,
  notes text,
  status text not null default 'published',
  auto_extracted boolean not null default false,
  submitted_by text,
  created_at timestamptz not null default now(),
  unique (filing_id, line_no)
);
create index if not exists disclosure_txn_date on disclosure_transactions(status, transaction_date desc);
-- ── Government report cards ────────────────────────────────────
create table if not exists report_cards (
  key text primary key,
  level text not null,
  name text not null,
  parent text,
  method text not null,
  ethics numeric,
  stability numeric,
  sustainability numeric,
  responsibility numeric,
  economy numeric,
  metrics jsonb not null default '{}'::jsonb,
  rubric jsonb,
  data_year int,
  updated_at timestamptz not null default now()
);
create index if not exists report_cards_level on report_cards(level);
create table if not exists report_card_history (
  id bigserial primary key,
  key text not null references report_cards(key) on delete cascade,
  ts timestamptz not null default now(),
  ethics numeric, economy numeric
);
create index if not exists report_card_history_key on report_card_history(key, ts);
create table if not exists jurisdiction_keys (
  id text primary key,
  name text not null,
  key_hash text unique not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
`;

let pool = null;
let ready = null;

function getPool() {
  if (!features.database())
    throw new HttpError(503, "Database is not connected yet. See Admin → Setup.", { setup: true });
  if (!pool) {
    pool = new pg.Pool({ connectionString: config.databaseUrl, max: 3, idleTimeoutMillis: 10_000 });
    pool.on("error", e => console.error("pg pool error", e.message));
  }
  return pool;
}

async function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      const client = await getPool().connect();
      try {
        await client.query("begin");
        await client.query("select pg_advisory_xact_lock(724001)");
        await client.query("create table if not exists agora_meta (key text primary key, value jsonb)");
        const r = await client.query("select value from agora_meta where key='schema_version'");
        if (!r.rows[0] || Number(r.rows[0].value) < SCHEMA_VERSION) {
          await client.query(SCHEMA);
          await client.query(
            "insert into agora_meta(key,value) values('schema_version',$1) on conflict (key) do update set value=$1",
            [JSON.stringify(SCHEMA_VERSION)]
          );
        }
        await client.query("commit");
      } catch (e) {
        await client.query("rollback").catch(() => {});
        ready = null;
        throw e;
      } finally {
        client.release();
      }
    })();
  }
  return ready;
}

export async function query(text, params = []) {
  await ensureSchema();
  return getPool().query(text, params);
}

export async function one(text, params = []) {
  return (await query(text, params)).rows[0] || null;
}

export async function tx(fn) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function getSetting(key, fallback) {
  const r = await one("select value from settings where key=$1", [key]);
  return r ? { ...fallback, ...r.value } : fallback;
}
export async function putSetting(key, value) {
  await query(
    "insert into settings(key,value,updated_at) values($1,$2,now()) on conflict (key) do update set value=$2, updated_at=now()",
    [key, JSON.stringify(value)]
  );
}

/** Fixed-window rate limit. Returns true when the action is allowed. */
export async function rateLimit(key, max, windowSeconds) {
  const windowStart = new Date(Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds * 1000);
  const r = await one(
    `insert into rate_limits(key, window_start, count) values($1,$2,1)
     on conflict (key) do update set
       count = case when rate_limits.window_start = excluded.window_start then rate_limits.count + 1 else 1 end,
       window_start = excluded.window_start
     returning count`,
    [key, windowStart]
  );
  return r.count <= max;
}

export async function requireRate(key, max, windowSeconds, message) {
  if (!(await rateLimit(key, max, windowSeconds))) throw new HttpError(429, message || "Too many attempts. Please wait and try again.");
}
