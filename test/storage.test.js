/* Storage-backed routes: votes, tallies, reader polls, poll reports, price reports.
   No Redis env vars are set, so store.js uses its in-memory fallback. */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as vote from "../api/vote.js";
import * as tally from "../api/tally.js";
import * as polls from "../api/polls.js";
import * as report from "../api/polls/report.js";
import * as reports from "../api/reports.js";

let n = 0;
const dev = () => `test-device-${Date.now().toString(36)}-${++n}`;
const post = (h, path, b) => h.POST(new Request("http://localhost/api/" + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }));
const get = (h, path) => h.GET(new Request("http://localhost/api/" + path));
async function call(res) {
  assert.match(res.headers.get("content-type"), /application\/json/);
  return { status: res.status, j: await res.json() };
}
async function err(res, status) {
  const { status: s, j } = await call(res);
  if (status) assert.equal(s, status); else assert.ok(s >= 400 && s < 500, "expected a 4xx, got " + s);
  assert.equal(typeof j.error, "string"); assert.ok(j.error.length > 5);
  return j.error;
}
const tallyOf = async keys => (await call(await get(tally, "tally?keys=" + encodeURIComponent(keys.join(","))))).j;

test("ballot vote, change of vote, shareholder split, tally shape", async () => {
  const key = "ballot:PFE:pay", a = dev(), b = dev(), c = dev();
  let r = await call(await post(vote, "vote", { key, choice: "for", shareholder: true, device: a }));
  assert.equal(r.status, 200); assert.equal(r.j.ok, true);
  await post(vote, "vote", { key, choice: "against", shareholder: false, device: b });
  await post(vote, "vote", { key, choice: "against", shareholder: true, device: c });
  let t = await tallyOf([key, "ballot:PFE:chair"]);
  assert.deepEqual(t[key], { counts: { for: 1, against: 2 }, sh: { for: 1, against: 1 } });
  assert.deepEqual(t["ballot:PFE:chair"], { counts: {}, sh: {} });

  // same device votes again: moves, not adds
  await post(vote, "vote", { key, choice: "abstain", shareholder: true, device: a });
  t = await tallyOf([key]);
  assert.deepEqual(t[key], { counts: { abstain: 1, against: 2 }, sh: { abstain: 1, against: 1 } });
  // repeating the identical vote is a no-op
  await post(vote, "vote", { key, choice: "abstain", shareholder: true, device: a });
  // dropping the shareholder flag moves it out of "sh" only
  r = await call(await post(vote, "vote", { key, choice: "abstain", shareholder: false, device: a }));
  assert.deepEqual(r.j.counts, { abstain: 1, against: 2 });
  assert.deepEqual(r.j.sh, { against: 1 });
});

test("poll votes use integer option indexes", async () => {
  const key = "poll:s-ph-negotiate", a = dev(), b = dev();
  await post(vote, "vote", { key, choice: 0, shareholder: false, device: a });
  await post(vote, "vote", { key, choice: 2, shareholder: false, device: b });
  await post(vote, "vote", { key, choice: 1, shareholder: false, device: b });
  const t = await tallyOf([key]);
  assert.deepEqual(t[key], { counts: { 0: 1, 1: 1 }, sh: {} });
  // the client reads counts[i] with a number index
  assert.equal(t[key].counts[0], 1);
});

test("vote validation returns friendly JSON errors", async () => {
  const d = dev();
  await err(await post(vote, "vote", { key: "ballot:PFE:pay", choice: "maybe", device: d }));
  await err(await post(vote, "vote", { key: "poll:s-ph-ads", choice: 4, device: d }));
  await err(await post(vote, "vote", { key: "poll:s-ph-ads", choice: "x", device: d }));
  await err(await post(vote, "vote", { key: "ballot:ZZZZ:pay", choice: "for", device: d }));      // untracked ticker
  await err(await post(vote, "vote", { key: "bogus:thing", choice: "for", device: d }));
  await err(await post(vote, "vote", { key: "ballot:PFE:pay", choice: "for", device: "bad id!" }));
  await err(await post(vote, "vote", { key: "ballot:PFE:pay", choice: "for" }));
  await err(await post(vote, "vote", { key: "poll:p-doesnotexist", choice: 0, device: d }), 404);
  // malformed JSON body
  await err(await vote.POST(new Request("http://localhost/api/vote", { method: "POST", body: "{not json" })));
});

test("tally skips unknown keys and caps the key count", async () => {
  const t = await tallyOf(["poll:s-he-ma", "nope", "ballot:pfe:pay"]);
  assert.deepEqual(Object.keys(t), ["poll:s-he-ma"]);
  assert.deepEqual(await tallyOf([]), {});
  const many = Array.from({ length: 51 }, (_, i) => "poll:s-x" + i);
  await err(await get(tally, "tally?keys=" + many.join(",")));
});

test("votes are rate limited per device", async () => {
  const d = dev();
  for (let i = 0; i < 60; i++) {
    const r = await post(vote, "vote", { key: "poll:s-rate", choice: i % 4, device: d });
    assert.equal(r.status, 200, "vote " + i);
  }
  const msg = await err(await post(vote, "vote", { key: "poll:s-rate", choice: 0, device: d }), 429);
  assert.match(msg, /try again/i);
});

test("create, list, vote on and report-hide a reader poll", async () => {
  const author = dev();
  const r = await call(await post(polls, "polls", { scope: "pharma", q: "  Should pharmacies post   cash prices at the counter? https://spam.example ", opts: ["Yes", " No ", "Only for generics"], device: author }));
  assert.equal(r.status, 200); assert.equal(r.j.ok, true);
  const p = r.j.poll;
  assert.match(p.id, /^p-[a-z0-9]+$/);
  assert.equal(p.q, "Should pharmacies post cash prices at the counter?");
  assert.deepEqual(p.opts, ["Yes", "No", "Only for generics"]);
  assert.equal(p.scope, "pharma"); assert.ok(!Number.isNaN(Date.parse(p.created)));

  let list = (await call(await get(polls, "polls?scope=pharma"))).j.polls;
  assert.deepEqual(list[0], p);                                          // newest first, public fields only
  assert.ok(!(await call(await get(polls, "polls?scope=health"))).j.polls.some(x => x.id === p.id));

  // votes on a reader poll are checked against its options
  assert.equal((await post(vote, "vote", { key: "poll:" + p.id, choice: 2, device: dev() })).status, 200);
  await err(await post(vote, "vote", { key: "poll:" + p.id, choice: 3, device: dev() }));

  // reports: duplicates from one device count once; the fifth distinct device hides it
  const first = dev();
  for (let i = 0; i < 3; i++) assert.deepEqual((await call(await post(report, "polls/report", { id: p.id, device: first }))).j, { ok: true });
  for (let i = 0; i < 3; i++) await post(report, "polls/report", { id: p.id, device: dev() });
  list = (await call(await get(polls, "polls?scope=pharma"))).j.polls;
  assert.ok(list.some(x => x.id === p.id), "4 reports: still visible");
  await post(report, "polls/report", { id: p.id, device: dev() });
  list = (await call(await get(polls, "polls?scope=pharma"))).j.polls;
  assert.ok(!list.some(x => x.id === p.id), "5 reports: hidden");
  await err(await post(vote, "vote", { key: "poll:" + p.id, choice: 0, device: dev() }), 410);

  // moderator log
  const { cmd } = await import("../api/_lib/store.js");
  const log = (await cmd(["LRANGE", report.MOD_LOG, 0, -1])).map(JSON.parse).filter(x => x.id === p.id);
  assert.equal(log.length, 5);
  assert.equal(log[0].hidden, true); assert.equal(log[0].reports, 5);
  assert.ok(!JSON.stringify(log).includes(first), "raw device ids are not stored");

  await err(await post(report, "polls/report", { id: "p-nosuchpoll", device: dev() }), 404);
  await err(await post(report, "polls/report", { id: p.id, device: "x" }));
});

test("poll validation", async () => {
  const d = dev(), ok = { scope: "health", q: "Is your insurer easy to reach by phone?", opts: ["Yes", "No"], device: d };
  await err(await get(polls, "polls?scope=sports"));
  await err(await post(polls, "polls", { ...ok, scope: "sports" }));
  await err(await post(polls, "polls", { ...ok, q: "Too short" }));
  await err(await post(polls, "polls", { ...ok, q: "x".repeat(161) }));
  await err(await post(polls, "polls", { ...ok, q: "http://example.com/abcdefghijk" }));        // only a link
  await err(await post(polls, "polls", { ...ok, opts: ["Yes"] }));
  await err(await post(polls, "polls", { ...ok, opts: ["a", "b", "c", "d", "e"] }));
  await err(await post(polls, "polls", { ...ok, opts: ["Yes", "y".repeat(61)] }));
  await err(await post(polls, "polls", { ...ok, opts: ["Yes", "yes"] }));
  await err(await post(polls, "polls", { ...ok, opts: "Yes,No" }));
  await err(await post(polls, "polls", { ...ok, device: "nope" }));
  assert.match(await err(await post(polls, "polls", { ...ok, q: "Is my insurer run by a bunch of a$$holes?" })), /civil/);
  assert.match(await err(await post(polls, "polls", { ...ok, opts: ["Yes", "f u c k no"] })), /civil/);
  assert.equal(polls.rude("Should Medicare cover the shingles vaccine for everyone?"), false);
  assert.equal(polls.rude("Should insurers cover extended-release tablets?"), false);
});

test("polls are rate limited to 3 per device per day", async () => {
  const d = dev();
  for (let i = 1; i <= 3; i++) {
    const r = await post(polls, "polls", { scope: "health", q: `Rate limit test question number ${i} for ${d}?`, opts: ["Yes", "No"], device: d });
    assert.equal(r.status, 200);
  }
  await err(await post(polls, "polls", { scope: "health", q: `Rate limit test question number 4 for ${d}?`, opts: ["Yes", "No"], device: d }), 429);
  // duplicate questions are rejected
  await err(await post(polls, "polls", { scope: "health", q: `Rate limit test question number 1 for ${d}?`, opts: ["Yes", "No"], device: dev() }));
});

test("price reports round trip with nearby-first, cheapest-per-unit ordering", async () => {
  const drug = "Atorvastatin-" + n++;    // unique drug so earlier runs in this process don't interfere
  const base = { drug, strength: "40 mg tablet", method: "coupon", coupon: "GoodRx" };
  const send = (x, d = dev()) => post(reports, "reports", { ...base, ...x, device: d });
  assert.deepEqual((await call(await send({ qty: 30, price: 15, pharmacy: "CVS", zip: "94110" }))).j, { ok: true });
  await send({ qty: 90, price: 18.5, pharmacy: "Costco", zip: "94117", method: "cash", coupon: "" });   // cheapest per unit, near
  await send({ qty: 30, price: 4, pharmacy: "Walmart", zip: "10001" });                                  // cheapest overall, far
  await send({ qty: 30, price: 40, pharmacy: "Walgreens https://x.example", zip: "94103" });

  let r = (await call(await get(reports, `reports?drug=${encodeURIComponent(drug.toLowerCase())}&zip=94110`))).j;
  assert.equal(r.zip3, "941"); assert.equal(r.count, 4);
  assert.deepEqual(r.near.map(x => x.pharmacy), ["Costco", "CVS", "Walgreens"]);
  assert.deepEqual(r.nationalLow.map(x => x.pharmacy), ["Walmart", "Costco", "CVS", "Walgreens"]);
  const row = r.near[0];
  for (const k of ["pharmacy", "strength", "method", "coupon", "qty", "price", "zip3", "created"]) assert.ok(k in row, k);
  assert.equal(row.zip3, "941"); assert.equal(row.qty, 90); assert.equal(row.price, 18.5);
  assert.equal(row.method, "Cash");
  assert.ok(!("zip" in row) && !("by" in row) && !("device" in row));
  assert.equal(r.near[2].pharmacy, "Walgreens");                            // link stripped

  // case-insensitive drug, unknown area, no zip
  r = (await call(await get(reports, `reports?drug=${encodeURIComponent(drug.toUpperCase())}&zip=60601`))).j;
  assert.deepEqual(r.near, []); assert.equal(r.nationalLow[0].pharmacy, "Walmart");
  r = (await call(await get(reports, `reports?drug=${encodeURIComponent(drug)}&zip=`))).j;
  assert.equal(r.zip3, null); assert.deepEqual(r.near, []); assert.equal(r.nationalLow.length, 4);
  r = (await call(await get(reports, "reports?drug=neverreported&zip=94110"))).j;
  assert.deepEqual({ near: r.near, nationalLow: r.nationalLow }, { near: [], nationalLow: [] });
});

test("price report validation and rate limit", async () => {
  const d = dev(), ok = { drug: "metformin", strength: "500 mg", qty: 60, price: 9.99, pharmacy: "Costco", method: "cash", coupon: "", zip: "30301", device: d };
  await err(await get(reports, "reports?zip=94110"));
  await err(await post(reports, "reports", { ...ok, zip: "3030" }));
  await err(await post(reports, "reports", { ...ok, zip: "" }));
  await err(await post(reports, "reports", { ...ok, qty: 0 }));
  await err(await post(reports, "reports", { ...ok, qty: 1.5 }));
  await err(await post(reports, "reports", { ...ok, qty: 5000 }));
  await err(await post(reports, "reports", { ...ok, price: -1 }));
  await err(await post(reports, "reports", { ...ok, price: 1e9 }));
  await err(await post(reports, "reports", { ...ok, price: "abc" }));
  await err(await post(reports, "reports", { ...ok, pharmacy: "" }));
  await err(await post(reports, "reports", { ...ok, method: "bitcoin" }));
  await err(await post(reports, "reports", { ...ok, drug: "" }));
  await err(await post(reports, "reports", { ...ok, drug: "<script>" }));
  await err(await post(reports, "reports", { ...ok, device: "!" }));
  await err(await post(reports, "reports", { ...ok, pharmacy: "shitty pharmacy" }));
  for (let i = 0; i < 10; i++) assert.equal((await post(reports, "reports", ok)).status, 200, "report " + i);
  await err(await post(reports, "reports", ok), 429);
});
