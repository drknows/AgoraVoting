/* /api/polls/report — POST {id, device} -> {ok: true}
   Counts distinct reporting devices per poll; at 5 reports the poll is hidden automatically.
   Storage: set "poll:reports:<id>" (hashed device ids), set "polls:hidden", list "mod:poll-reports" (newest 1000, for moderators). */
import { json, fail, body, route, DEVICE_RE } from "../_lib/http.js";
import { many, allow } from "../_lib/store.js";
import { findPoll, HIDDEN, POLL_ID_RE, ipOf, hid } from "../polls.js";

export const HIDE_AT = 5;
export const MOD_LOG = "mod:poll-reports";

export const POST = route(async req => {
  const b = await body(req);
  const device = String(b.device || ""), id = String(b.id || "");
  if (!DEVICE_RE.test(device)) return fail("Please reload the page and try again.");
  if (!POLL_ID_RE.test(id)) return fail("That poll could not be found.", 404);
  if (id.startsWith("s-")) return json({ ok: true });   // Agora starter polls are not reader content
  const poll = await findPoll(id);
  if (!poll) return fail("That poll could not be found. It may already have been removed.", 404);

  if (!await allow("report", hid(device), 20, 3600)) return fail("You've sent a lot of reports in the last hour. Please try again later.", 429);
  const ip = ipOf(req);
  if (ip && !await allow("report-ip", ip, 100, 3600)) return fail("Too many reports from your network right now. Please try again later.", 429);

  const [added, n] = await many([["SADD", "poll:reports:" + id, hid(device)], ["SCARD", "poll:reports:" + id]]);
  if (!added) return json({ ok: true });               // this device already reported it
  const hide = n >= HIDE_AT;
  const ops = [
    ["LPUSH", MOD_LOG, JSON.stringify({ id, scope: poll.scope, q: poll.q, reports: n, hidden: hide, by: hid(device), at: new Date().toISOString() })],
    ["LTRIM", MOD_LOG, 0, 999],
  ];
  if (hide) ops.push(["SADD", HIDDEN, id]);
  await many(ops);
  return json({ ok: true });
}, "Reporting");
