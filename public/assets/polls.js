/* Public polls: starter questions from Agora plus polls the public creates. */
(function () {
const A = Agora, esc = A.esc;
const SEED = {
  pharma: [
    {id: "s-ph-negotiate", q: "Should Medicare negotiate prices for every brand-name drug, not just a few dozen?", opts: ["Yes, all of them", "Only the most expensive", "No"]},
    {id: "s-ph-grants", q: "When taxpayers funded a drug's research, should that cap its U.S. price?", opts: ["Yes", "Partly, through a discount", "No"]},
    {id: "s-ph-world", q: "Should U.S. drug prices be tied to what other wealthy countries pay?", opts: ["Yes", "Only for Medicare", "No"]},
    {id: "s-ph-ads", q: "Should prescription drug ads on TV be allowed?", opts: ["Yes", "Only with prices shown", "No"]},
  ],
  health: [
    {id: "s-he-denials", q: "Have you or your family had a claim or prior authorization denied in the last two years?", opts: ["Yes", "No", "Not sure"]},
    {id: "s-he-appeal", q: "If a claim was denied, did you appeal?", opts: ["Yes, and won", "Yes, and lost", "No, I didn't know how", "No, it wasn't worth it"]},
    {id: "s-he-ma", q: "Should Medicare Advantage plans be paid the same as traditional Medicare for similar patients?", opts: ["Yes", "No", "Not sure"]},
    {id: "s-he-pay", q: "Should insurer executive bonuses be allowed to reward lower claim payouts?", opts: ["No", "Yes", "Not sure"]},
  ],
};
async function load(scope) {
  let user = [];
  try { user = (await A.api("polls?scope=" + scope)).polls || []; }
  catch (e) { user = A.store.get("mypolls", []).filter(p => p.scope === scope); }
  const polls = [...SEED[scope].map(p => ({...p, seed: true})), ...user];
  const t = await A.tally(polls.map(p => "poll:" + p.id));
  return polls.map(p => ({...p, counts: (t["poll:" + p.id] || {}).counts || {}}));
}
function card(p) {
  const my = A.myVote("poll:" + p.id), c = p.counts, sum = p.opts.reduce((a, _, i) => a + (c[i] || 0), 0);
  return `<div class="card"><div class="card-h"><div><h3 style="font-size:.95rem">${esc(p.q)}</h3><div class="sub">${p.seed ? "Agora starter poll" : "Started by a reader" + (p.created ? " · " + A.fmtDate(p.created) : "")}</div></div>${p.seed ? "" : `<div class="right"><button class="link-btn" data-report="${esc(p.id)}">Report</button></div>`}</div><div class="card-b">
    ${p.opts.map((o, i) => { const share = sum ? (c[i] || 0) / sum * 100 : 0; return `<button class="opt" data-pvote="${esc(p.id)}" data-i="${i}" aria-pressed="${my == i}"><span class="fill" style="width:${my != null ? share.toFixed(1) : 0}%"></span><span class="lab">${esc(o)}</span><span class="num">${my != null ? Math.round(share) + "%" : ""}</span></button>`; }).join("")}
    <div class="src num">${sum.toLocaleString()} vote${sum === 1 ? "" : "s"}${my == null ? " · vote to see results" : ""}${A.live === false ? " · preview: votes stay in this browser" : ""}</div></div></div>`;
}
const form = scope => `<div class="card"><div class="card-h"><div><h3>Start a poll</h3><div class="sub">Ask about ${scope === "pharma" ? "drug prices, drugmakers or pharmacy costs" : "insurance, Medicare, Medicaid or medical bills"}. Two to four answers. No links or personal attacks.</div></div></div>
  <form class="card-b" data-pform="${scope}">
    <div class="field"><label for="pq-${scope}">Question</label><input class="input" id="pq-${scope}" maxlength="160" required></div>
    <div class="form-row">${[0, 1, 2, 3].map(i => `<div class="field"><label for="po-${scope}-${i}">Answer ${i + 1}${i < 2 ? "" : " (optional)"}</label><input class="input" id="po-${scope}-${i}" maxlength="60" ${i < 2 ? "required" : ""}></div>`).join("")}</div>
    <div><button class="btn" type="submit">Publish poll</button></div></form></div>`;
const mounts = {};
window.AgoraPolls = {
  async mount(el, scope) {
    mounts[scope] = el; el.innerHTML = `<p class="skel">Loading polls…</p>`;
    const polls = await load(scope);
    el.innerHTML = `<div class="grid">${polls.map(card).join("")}</div>${form(scope)}`;
  }
};
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-pvote],[data-report]"); if (!b) return;
  const scope = Object.keys(mounts).find(s => mounts[s].contains(b)); if (!scope) return;
  if (b.dataset.report) { try { await A.api("polls/report", {id: b.dataset.report}); } catch (x) {} A.toast("Thanks. A moderator will review this poll."); return; }
  await A.vote("poll:" + b.dataset.pvote, +b.dataset.i, false);
  AgoraPolls.mount(mounts[scope], scope);
});
document.addEventListener("submit", async e => {
  const f = e.target.closest("[data-pform]"); if (!f) return; e.preventDefault();
  const scope = f.dataset.pform, q = f.querySelector(`#pq-${scope}`).value.trim();
  const opts = [0, 1, 2, 3].map(i => f.querySelector(`#po-${scope}-${i}`).value.trim()).filter(Boolean);
  if (opts.length < 2) return A.toast("Add at least two answers");
  try { await A.api("polls", {scope, q, opts}); A.toast("Poll published"); }
  catch (err) {
    if (err.user) return A.toast(err.message);
    const mine = A.store.get("mypolls", []); mine.unshift({id: "local-" + Date.now(), scope, q, opts, created: new Date().toISOString()}); A.store.set("mypolls", mine);
    A.toast("Saved in this browser (preview)");
  }
  AgoraPolls.mount(mounts[scope], scope);
});
})();
