/* /api/vote — POST {key, choice, shareholder, device} -> {ok: true, key, choice, counts, sh}
   One vote per device per key; voting again moves the vote. Shareholder votes are also counted in "sh".
   Storage: hash "v:<key>" (everyone), hash "vsh:<key>" (self-identified shareholders),
            string "vd:<key>:<hashed device>" = "<choice>|<1 if shareholder else 0>". */
import { json, fail, body, route, DEVICE_RE } from "./_lib/http.js";
import { cmd, many, allow } from "./_lib/store.js";
import { okTicker } from "./_lib/sec.js";
import { findPoll, isHidden, ipOf, hid } from "./polls.js";

export const POLL_KEY_RE = /^poll:([a-z0-9][a-z0-9-]{1,39})$/;
export const BALLOT_KEY_RE = /^ballot:([A-Z]{1,5}):([a-z][a-z0-9-]{1,23})$/;
export const BALLOT_CHOICES = ["for", "against", "abstain"];
export const validKey = k => typeof k === "string" && (POLL_KEY_RE.test(k) || (BALLOT_KEY_RE.test(k) && okTicker(k.split(":")[1])));

const counts = (a = []) => { const o = {}; for (let i = 0; i < a.length; i += 2) { const n = +a[i + 1] || 0; if (n > 0) o[a[i]] = n; } return o; };

export const POST = route(async req => {
  const b = await body(req);
  const { key } = b, device = String(b.device || ""), sh = b.shareholder === true;
  if (!DEVICE_RE.test(device)) return fail("Please reload the page and try again.");
  if (!validKey(key)) return fail("That vote isn't recognized. Please reload the page and try again.");

  let choice;
  const pm = key.match(POLL_KEY_RE);
  if (pm) {
    choice = b.choice;
    if (typeof choice === "string" && /^[0-3]$/.test(choice)) choice = +choice;
    if (!Number.isInteger(choice) || choice < 0 || choice > 3) return fail("Please pick one of the answers.");
    const id = pm[1];
    if (!id.startsWith("s-")) {               // reader poll: must exist, be visible, and have that option
      const poll = await findPoll(id);
      if (!poll) return fail("That poll could not be found. It may have been removed.", 404);
      if (choice >= poll.opts.length) return fail("Please pick one of the answers.");
      if (await isHidden(id)) return fail("This poll was removed after reader reports and is closed.", 410);
    }
    choice = String(choice);
  } else {
    choice = String(b.choice || "").toLowerCase();
    if (!BALLOT_CHOICES.includes(choice)) return fail("Please vote For, Against or Abstain.");
  }

  if (!await allow("vote", hid(device), 60, 3600)) return fail("You've voted a lot in the last hour. Please try again a little later.", 429);
  const ip = ipOf(req);
  if (ip && !await allow("vote-ip", ip, 600, 3600)) return fail("Too many votes from your network right now. Please try again a little later.", 429);

  const dk = `vd:${key}:${hid(device)}`, vk = "v:" + key, sk = "vsh:" + key;
  const prev = await cmd(["GET", dk]);
  const [pc, ps] = prev ? prev.split("|") : [null, "0"];
  const ops = [];
  if (pc !== choice || ps !== (sh ? "1" : "0")) {
    if (pc != null) { ops.push(["HINCRBY", vk, pc, -1]); if (ps === "1") ops.push(["HINCRBY", sk, pc, -1]); }
    ops.push(["HINCRBY", vk, choice, 1]); if (sh) ops.push(["HINCRBY", sk, choice, 1]);
    ops.push(["SET", dk, `${choice}|${sh ? 1 : 0}`]);
  }
  const [c, s] = (await many([...ops, ["HGETALL", vk], ["HGETALL", sk]])).slice(-2);
  return json({ ok: true, key, choice: pm ? +choice : choice, changed: !!prev && ops.length > 0, counts: counts(c), sh: counts(s) });
}, "Voting");
