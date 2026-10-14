/* Take Action: lawful, nonpartisan ways to respond, plus a letter builder. */
(function () {
const A = Agora, esc = A.esc;
A.chrome({product: "Take action"});

const L = (label, url) => `<a href="${url}" target="_blank" rel="noopener">${esc(label)}</a>`;

/* Where to complain: problem → who regulates it */
const WHERE = [
  ["An insurer denied care or a claim (individual, family or fully insured employer plan)", "Your state insurance department. In California, HMO and most managed-care plans go to the Department of Managed Health Care.", L("Find your state insurance department (NAIC)", "https://content.naic.org/insurance-departments") + " · " + L("California DMHC", "https://www.dmhc.ca.gov/FileaComplaint.aspx")],
  ["Your employer's plan is self-funded (common at large employers; your plan documents or HR will say)", "U.S. Department of Labor, Employee Benefits Security Administration. State insurance departments usually can't act on self-funded plans.", L("askebsa.dol.gov", "https://www.askebsa.dol.gov/") + " · 1-866-444-3272"],
  ["Medicare, Medicare Advantage or Part D", "Medicare, which oversees the plans and refers complaints to its ombudsman.", L("Medicare.gov: file a complaint", "https://www.medicare.gov/providers-services/claims-appeals-complaints/complaints") + " · 1-800-MEDICARE"],
  ["Medicaid", "Your state Medicaid agency. You also have the right to a state fair hearing.", L("Find your state Medicaid office", "https://www.medicaid.gov/about-us/where-can-people-get-help-medicaid-chip")],
  ["A surprise medical bill", "The federal No Surprises Help Desk.", L("cms.gov/nosurprises", "https://www.cms.gov/nosurprises") + " · 1-800-985-3059"],
  ["Possible Medicare or Medicaid fraud", "The HHS Office of Inspector General hotline.", L("Report fraud to HHS-OIG", "https://oig.hhs.gov/fraud/report-fraud/") + " · 1-800-HHS-TIPS"],
  ["A drug that caused harm, didn't work, or seemed defective", "The FDA's MedWatch safety reporting program.", L("FDA MedWatch", "https://www.fda.gov/safety/medwatch-fda-safety-information-and-adverse-event-reporting-program")],
  ["A merger, price-fixing, pay-for-delay deal or other anticompetitive conduct", "The Federal Trade Commission, and your state attorney general.", L("Report an antitrust violation (FTC)", "https://www.ftc.gov/enforcement/report-antitrust-violation") + " · " + L("Find your attorney general", "https://www.naag.org/find-my-ag/")],
  ["Deceptive or unfair business practices by any health company", "Your state attorney general's consumer protection office.", L("Find your attorney general", "https://www.naag.org/find-my-ag/")],
  ["Medical debt collection or credit reporting", "The Consumer Financial Protection Bureau.", L("CFPB complaint", "https://www.consumerfinance.gov/complaint/")],
  ["TRICARE or VA care", "TRICARE: your regional contractor and a Beneficiary Counseling and Assistance Coordinator. VA: the Patient Advocate at your VA medical center.", L("TRICARE help", "https://www.tricare.mil/ContactUs") + " · " + L("VA patient advocates", "https://www.va.gov/health/patientadvocate/")]
];

const STEPS = [
  {id: "rights", n: "1", h: "Use the rights you already have", lead: "The quickest win is often your own. Many denials are overturned, but few people ask.",
   items: [
    `<b>Appeal every denial you disagree with.</b> Then ask for an independent external review if the insurer says no again. See ${'<a href="/health/#denials">Denials &amp; Appeals</a>'} for step-by-step help.`,
    `<b>Ask your doctor to request prior authorization</b>, or request it yourself, before care is scheduled.`,
    `<b>Read your plan cover to cover</b> and keep a log of every call: name, ID, date, time and what was promised.`,
    `<b>Shop for the lowest drug price</b> with ${'<a href="/pharma/#save">Best Price</a>'}. Federal law lets pharmacists tell you when paying cash is cheaper than your copay, so ask.`]},
  {id: "complain", n: "2", h: "File a complaint with the right regulator", lead: "Regulators act on patterns. One complaint can fix your case; many complaints can change a company's behavior. Complaints are free, and you don't need a lawyer.",
   table: true},
  {id: "lawmakers", n: "3", h: "Contact your elected officials", lead: "Laws on drug prices, prior authorization, Medicare Advantage and insurer practices are written by Congress and state legislatures. Staff count every message from constituents.",
   items: [
    `<b>Find who represents you:</b> ${L("U.S. House and Senate (Congress.gov)", "https://www.congress.gov/members/find-your-member")}, ${L("state legislators (Open States)", "https://openstates.org/find_your_legislator/")}, and ${L("all elected officials (USA.gov)", "https://www.usa.gov/elected-officials")}.`,
    `<b>Be brief and specific:</b> say you're a constituent, tell your own story in a few sentences, cite one fact, and make one clear request. A personal letter carries more weight than a form letter.`,
    `<b>Call the local office</b>, then follow up in writing. Ask for a reply and for the official's position.`,
    `<b>Show up:</b> town halls, district office hours and state legislative hearings, where the public can often testify in person or in writing.`,
    `Use the <a href="#letter">letter builder</a> below to get started.`]},
  {id: "comment", n: "4", h: "Comment on proposed federal rules", lead: "Before agencies like CMS and the FDA finalize a rule, they must accept public comments and respond to them. Every year CMS proposes rules setting Medicare Advantage, Part D and doctor payment policy.",
   items: [
    `<b>Search open rules</b> at ${L("Regulations.gov", "https://www.regulations.gov/")} or the ${L("Federal Register", "https://www.federalregister.gov/")}. Try "Medicare Advantage", "prior authorization" or "drug pricing".`,
    `<b>Write in your own words.</b> Agencies weigh the substance of comments, not the count, so a specific personal experience or a cited fact matters more than a copy of someone else's text.`,
    `<b>Note the deadline.</b> Comment periods usually run 30 to 60 days.`]},
  {id: "shareholder", n: "5", h: "Act as a shareholder", lead: "If you own stock directly, or through a 401(k), IRA or fund, you have a voice in how these companies are run.",
   items: [
    `<b>Vote your proxy</b> for board members, executive pay ("say on pay") and shareholder proposals. Your broker sends the ballot before each annual meeting.`,
    `<b>Ask your fund how it votes.</b> Mutual funds publish their proxy votes each year (SEC Form N-PX), and many 401(k) providers now offer voting choices.`,
    `<b>Attend the annual meeting</b>, often online, and submit a question.`,
    `<b>Shareholder proposals</b> are possible, but the SEC is reviewing its rules in 2026 and stopped refereeing companies' decisions to exclude proposals in August 2026. Check ${L("the SEC's current guidance", "https://www.sec.gov/rules-regulations/staff-guidance/corporation-finance")} before filing.`,
    `Each <a href="/pharma/#drugmakers">company page</a> on Agora has an advisory ballot so you can practice and see what others think.`]},
  {id: "vote", n: "6", h: "Vote", lead: "Every officeholder who writes health laws is chosen by voters. Agora doesn't endorse candidates or parties.",
   items: [
    `<b>Register or check your registration</b> at ${L("vote.gov", "https://vote.gov/")}.`,
    `<b>Look up how your officials voted</b> on health bills at ${L("Congress.gov", "https://www.congress.gov/")} and your state legislature's website.`,
    `<b>Read your ballot measures.</b> Many states vote directly on health care, drug pricing and insurance rules.`]},
  {id: "report", n: "7", h: "Report fraud or wrongdoing", lead: "If you have inside knowledge of fraud against Medicare, Medicaid or investors, the law protects and can reward people who report it.",
   items: [
    `<b>Health care fraud:</b> ${L("HHS-OIG hotline", "https://oig.hhs.gov/fraud/report-fraud/")}, 1-800-HHS-TIPS.`,
    `<b>Fraud against the government:</b> the False Claims Act lets private citizens bring "qui tam" cases on the government's behalf, with protection from retaliation. These cases are filed under seal and require a lawyer.`,
    `<b>Securities fraud</b> by a public company: ${L("SEC whistleblower program", "https://www.sec.gov/whistleblower")}.`,
    `<b>Protect yourself:</b> talk to a lawyer before taking documents from an employer.`]},
  {id: "community", n: "8", h: "Join with others", lead: "Change rarely comes from one person alone. Service to others is also where many people find the most meaning.",
   items: [
    `<b>Help a neighbor</b> with an appeal or a Medicare choice. ${L("State Health Insurance Assistance Programs (SHIP)", "https://www.shiphelp.org/")} offer free, unbiased Medicare counseling and train volunteers.`,
    `<b>Attend public meetings:</b> county health boards, public hospital district boards and state insurance rate hearings are open to the public.`,
    `<b>Join a patient or caregiver group</b> for your condition. Many testify before lawmakers and regulators.`,
    `<b>Write a letter to the editor</b> of your local paper, citing a sourced fact from Agora.`,
    `<b>Share what you learn</b>, and vote in Agora's <a href="/polls/">public polls</a>.`]},
  {id: "lawyer", n: "9", h: "When you need a lawyer", lead: "Some harms call for legal help: a wrongful denial of urgent care, a large unpaid claim, or retaliation for speaking up.",
   items: [
    `<b>Free civil legal help</b> for people with low incomes: ${L("LawHelp.org", "https://www.lawhelp.org/")}.`,
    `<b>Lawyer referral services</b> run by state and local bar associations: ${L("ABA directory", "https://www.americanbar.org/groups/legal_services/flh-home/")}.`,
    `<b>Deadlines matter.</b> Appeals, lawsuits and whistleblower claims all have time limits, so ask early.`]}
];

/* Letter builder topics: one sourced fact each, drawn from Agora's own pages */
const TOPICS = {
  drugs: {l: "Prescription drug prices", f: "Brand-name drugs cost Americans 4.22 times what people in 33 other wealthy countries pay (RAND Corporation, 2022 data)."},
  nih: {l: "Taxpayer funding behind new drugs", f: "NIH research funding contributed to 354 of the 356 drugs approved by the FDA from 2010 to 2019 (Bentley University)."},
  denials: {l: "Insurance claim denials", f: "Marketplace insurers denied 19% of in-network claims in 2024, and fewer than 1% of denials were appealed (KFF)."},
  ma: {l: "Medicare Advantage payments", f: `Medicare pays Medicare Advantage plans about 14% more per enrollee than traditional Medicare would spend for the same people, about $76 billion in 2026 (MedPAC).`},
  priorauth: {l: "Prior authorization", f: "Medicare Advantage plans denied 4.1 million prior authorization requests in 2024. Only 11.5% of denials were appealed, and 80.7% of those appeals succeeded (KFF)."},
  spend: {l: "The cost of health care", f: "The U.S. spends $14,775 per person on health care, nearly twice what other wealthy countries spend (Peterson-KFF Health System Tracker)."},
  mergers: {l: "Health industry mergers", f: "Mergers among drugmakers, insurers and pharmacy benefit managers have concentrated control of prices and access to care in fewer companies."},
  other: {l: "Something else", f: ""}
};
const TO = {
  congress: ["My member of Congress or U.S. senator", "Dear [Senator / Representative] [Name],", "As your constituent"],
  state: ["My state legislator", "Dear [Senator / Assembly Member / Delegate] [Name],", "As your constituent"],
  regulator: ["A regulator (insurance commissioner, CMS, FTC)", "Dear [Commissioner / Administrator] [Name],", "As a resident and health care consumer"],
  company: ["A company's board or CEO (corporate address)", "To the Board of Directors of [Company],", "As a patient, customer and member of the public"],
  editor: ["The editor of my local paper", "To the Editor:", "As a reader and member of this community"]
};

function letter() {
  const g = id => document.getElementById(id).value.trim();
  const t = TOPICS[g("lt")], to = TO[g("lto")];
  const name = g("ln") || "[Your name]", place = g("lp") || "[City, State]";
  const story = g("ls"), ask = g("la") || "[What you are asking them to do]";
  const topic = g("lt") === "other" ? "[your topic]" : t.l.toLowerCase();
  return [
    to[1], "",
    `${to[2]} in ${place}, I am writing about ${topic}.`,
    t.f ? "\n" + t.f : "",
    story ? "\n" + story : "",
    "\n" + `I respectfully ask that you ${ask.replace(/^(that you|to)\s+/i, "").replace(/\.$/, "")}.`,
    "\n" + (g("lto") === "editor" ? "Sincerely," : "Thank you for your time. I would appreciate a reply stating your position.\n\nSincerely,"),
    name, place
  ].join("\n").replace(/\n{3,}/g, "\n\n");
}


/* ── The four commitments: the call to action ── */
const SITE = "https://agorasocietystands.com/";
const SHARE_MSG = "I'm part of Agora Society Stands, a nonpartisan effort for our kids and future generations: honest government, ethical business, and fair health care and drug prices. It only works if people like us take part. Take a look, then pass it on to 10 people.";
const spread = () => { const s = A.store.get("spread", []); return Array.from({length: 10}, (_, i) => s[i] || {n: "", d: false}); };
const PKEY = {p: "participate", i: "ideas", l: "act", s: "share"};
const COMMIT = [
  {k: "p", h: "Participate regularly", t: "Come back every week. Read what's new, vote in the polls, and follow the companies and officials that affect your family.",
   b: `<a class="btn sm" href="/polls/">Vote in this week's polls</a><button class="btn sm ghost" id="calBtn">Add a weekly reminder</button>`},
  {k: "i", h: "Offer your own ideas", t: "Agora belongs to the people who use it. Suggest a poll, a company or official to track, a fix for your community, or a better way to do anything here.",
   b: `<a class="btn sm" href="mailto:ideas@agorasocietystands.com?subject=${encodeURIComponent("My idea for Agora")}">Send an idea</a><a class="btn sm ghost" href="/polls/">Start a poll</a>`},
  {k: "l", h: "Take lawful steps for change", t: "Vote. Contact your representatives. File complaints, comment on federal rules, attend public meetings, vote your shares. Peaceful, legal action is how a democracy changes course.",
   b: `<a class="btn sm" href="#rights">See the steps below</a><a class="btn sm ghost" href="#letter">Write a letter</a>`},
  {k: "s", h: "Spread the word to at least 10 people", t: "This is the most important one. Movements grow person to person. Tell 10 people you know, and ask each of them to tell 10 more.",
   b: `<a class="btn sm" href="#spread">Share now</a>`}
];
const ctaHTML = () => {
  const s = spread(), done = s.filter(x => x.d).length;
  return `<section class="cta" id="you" aria-labelledby="ctaH">
  <div class="cta-top"><div class="eyebrow" style="margin:0">Our call to action</div>
    <h2 id="ctaH">It only works if <em>you</em> take part.</h2>
    <p>Don't like what you see? What are you going to do about it? Nothing changes because a website exists. Change happens when ordinary people show up, speak up and bring others with them. Agora asks four things of everyone who cares about the world we leave our children.</p></div>
  <ol class="cta-grid">${COMMIT.map((c, i) => `<li class="cta-item${c.k === "s" ? " key" : ""}"><div class="cta-hd"><label class="you-check" title="Check to make this your commitment"><input type="checkbox" data-pledge="${PKEY[c.k]}" aria-label="I commit: ${c.h}"><span class="cta-n">${i + 1}</span></label><h3>${c.h}${c.k === "s" ? ' <span class="pill cta-star">Most important</span>' : ""}</h3></div><p>${c.t}</p><div class="cta-b">${c.b}</div></li>`).join("")}</ol>
  <div class="you-foot"><span>Check each number to make it your commitment. <b id="pledgeCount"></b></span><span class="act-fine">Commitments are counted anonymously, once per device.</span></div>
  </section>
  <section class="card" id="spread"><div class="card-h"><div><h3>Spread the word: your 10</h3><div class="sub">Share Agora, then check off each person you reach. Your list stays on this device only.</div></div><div class="right"><span class="pill ${done >= 10 ? "p-good" : "p-acc"}">${done} of 10</span></div></div>
  <div class="card-b">
    <div class="cta-prog" role="progressbar" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${done}" aria-label="People reached"><span style="width:${done * 10}%"></span></div>
    <div class="field"><label for="shMsg">Your message (edit it to make it yours)</label><textarea class="input" id="shMsg" rows="3">${esc(A.store.get("shareMsg", SHARE_MSG))}</textarea></div>
    <div class="cta-share">
      <button class="btn" id="shNative">Share…</button>
      <a class="btn ghost" id="shText" href="#">Text</a>
      <a class="btn ghost" id="shMail" href="#">Email</a>
      <a class="btn ghost" id="shFb" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE)}" target="_blank" rel="noopener">Facebook</a>
      <a class="btn ghost" id="shX" href="#" target="_blank" rel="noopener">X</a>
      <button class="btn ghost" id="shCopy">Copy message and link</button>
    </div>
    <ol class="cta-ten">${s.map((p, i) => `<li><label class="chk"><input type="checkbox" data-sp="${i}" ${p.d ? "checked" : ""} aria-label="Reached person ${i + 1}"></label><input class="input" data-spn="${i}" value="${esc(p.n)}" placeholder="Person ${i + 1} (first name, optional)"></li>`).join("")}</ol>
    <p class="cta-math">${done >= 10 ? "<b>You did it.</b> Now ask each of your 10 to reach 10 more. " : ""}If each person reaches 10 others, three rounds reach 1,000 people and five rounds reach 100,000.</p>
  </div></section>`;
};

const card = s => `<section class="card act-step" id="${s.id}"><div class="card-b">
  <div class="act-hd"><span class="act-n">${s.n}</span><h2>${s.h}</h2></div>
  <p class="act-lead">${s.lead}</p>
  ${s.table ? `<div class="tbl"><table class="act-tbl"><thead><tr><th>If the problem is…</th><th>Complain to</th><th>Where</th></tr></thead><tbody>${WHERE.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table></div>
  <div class="notice brass"><span class="bar"></span><span><b>Make it count:</b> describe what happened in order, with dates; attach the denial letter, your call log and medical records; say what outcome you want; keep copies; and ask for a reference number. If you don't hear back within the regulator's stated time frame, follow up in writing.</span></div>` : ""}
  ${s.items ? `<ul class="act-list">${s.items.map(i => `<li>${i}</li>`).join("")}</ul>` : ""}
</div></section>`;

document.getElementById("main").innerHTML = A.hero("Take action", "Change starts with you",
  "Participate regularly. Offer your own ideas. Take lawful steps to change your government and society. And spread the word to at least 10 other people. Every step here is open to everyone, whatever your politics. Agora doesn't tell you what position to take; it helps you be heard.",
  ["Lawful and peaceful", "Nonpartisan", "Free"]) +
`<div class="content">
  ${ctaHTML()}
  <div class="sec-h" id="steps">Lawful steps you can take</div>
  <nav class="act-jump" aria-label="Steps">${STEPS.map(s => `<a href="#${s.id}"><span>${s.n}</span>${s.h}</a>`).join("")}<a href="#letter"><span>✎</span>Write a letter</a><a href="/stand/"><span>↗</span>Stand up: boycotts, strikes &amp; conscience</a></nav>
  <a class="card st-promo" href="/stand/"><div class="card-b"><div class="eyebrow" style="margin:0">New</div><h3>Stand up: lawful resistance</h3><p>Boycotts, strikes, protest, new laws and antitrust enforcement; hard questions about your work, technology and the future of jobs; and how to fight back when insurers override your doctor.</p><span class="go">Read the guide →</span></div></a>
  ${STEPS.map(card).join("")}
  <section class="card" id="letter"><div class="card-h"><div><h3>Letter builder</h3><div class="sub">Pick a topic and a recipient. Agora adds one sourced fact; you add your story and your request. Nothing you type leaves your device.</div></div></div>
  <div class="card-b">
    <div class="grid">
      <div class="field"><label for="lt">Topic</label><select class="input" id="lt">${Object.entries(TOPICS).map(([k, v]) => `<option value="${k}">${v.l}</option>`).join("")}</select></div>
      <div class="field"><label for="lto">Writing to</label><select class="input" id="lto">${Object.entries(TO).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("")}</select></div>
      <div class="field"><label for="ln">Your name</label><input class="input" id="ln" autocomplete="name"></div>
      <div class="field"><label for="lp">City and state</label><input class="input" id="lp" placeholder="Sacramento, CA"></div>
    </div>
    <div class="field"><label for="ls">Your story (optional, a few sentences)</label><textarea class="input" id="ls" placeholder="What happened to you or your family, with dates and amounts if you have them. Leave out details you want to keep private."></textarea></div>
    <div class="field"><label for="la">Your request: what do you want them to do?</label><input class="input" id="la" placeholder="e.g. support legislation that…, investigate…, explain your position on…"></div>
    <pre class="letter" id="lout" aria-live="polite"></pre>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="lcopy">Copy letter</button><a class="btn ghost" id="lmail" href="#">Open in email</a></div>
    <p class="act-fine">Be truthful, specific and respectful. Never threaten or harass anyone, and don't share other people's private information. Send company letters to official corporate addresses or investor-relations contacts.</p>
  </div></section>
  <div class="notice"><span class="bar"></span><span>This page is general information about civic and legal options, not legal advice. Phone numbers and links go to official government sites or nonprofit legal directories; Agora has no relationship with them. <a href="/about/#corrections">Report an outdated link</a>.</span></div>
</div>`;

const upd = () => { const t = letter(); A.$("#lout").textContent = t; A.$("#lmail").href = "mailto:?subject=" + encodeURIComponent(TOPICS[A.$("#lt").value].l) + "&body=" + encodeURIComponent(t); };
["lt", "lto", "ln", "lp", "ls", "la"].forEach(id => A.$("#" + id).addEventListener("input", upd));
A.$("#lcopy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(A.$("#lout").textContent); A.toast("Letter copied"); } catch (e) { A.toast("Select the letter text and copy it"); } });

/* commitments: anonymous public count, one per device */
const PKEYS = Object.values(PKEY).map(k => "pledge:" + k);
document.querySelectorAll("[data-pledge]").forEach(cb => {
  cb.checked = A.myVote("pledge:" + cb.dataset.pledge) === "yes";
  cb.closest(".cta-item").classList.toggle("done", cb.checked);
  cb.addEventListener("change", async () => {
    cb.closest(".cta-item").classList.toggle("done", cb.checked);
    await A.vote("pledge:" + cb.dataset.pledge, cb.checked ? "yes" : "no");
    if (cb.checked) A.toast(cb.dataset.pledge === "share" ? "Thank you. Now reach your 10." : "Thank you for committing.");
    pledgeCount();
  });
});
async function pledgeCount() {
  const t = await A.tally(PKEYS); if (A.live !== true) return;
  const n = Math.max(...PKEYS.map(k => (t[k] && t[k].counts.yes) || 0));
  A.$("#pledgeCount").textContent = n ? `${n.toLocaleString("en-US")} ${n === 1 ? "person has" : "people have"} committed so far.` : "";
}
pledgeCount();

/* call-to-action wiring */
const msg = () => (A.$("#shMsg").value.trim() || SHARE_MSG) + "\n\n" + SITE;
const shUpd = () => {
  A.store.set("shareMsg", A.$("#shMsg").value);
  A.$("#shText").href = "sms:?&body=" + encodeURIComponent(msg());
  A.$("#shMail").href = "mailto:?subject=" + encodeURIComponent("For our kids: take a look at Agora") + "&body=" + encodeURIComponent(msg());
  A.$("#shX").href = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(A.$("#shMsg").value.trim() || SHARE_MSG) + "&url=" + encodeURIComponent(SITE);
};
A.$("#shMsg").addEventListener("input", shUpd); shUpd();
A.$("#shNative").addEventListener("click", async () => {
  if (navigator.share) { try { await navigator.share({title: "Agora Society Stands", text: A.$("#shMsg").value.trim() || SHARE_MSG, url: SITE}); } catch (e) {} }
  else { try { await navigator.clipboard.writeText(msg()); A.toast("Copied. Paste it anywhere to share"); } catch (e) { A.toast("Select the message and copy it"); } }
});
A.$("#shCopy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(msg()); A.toast("Message and link copied"); } catch (e) { A.toast("Select the message and copy it"); } });
const saveSpread = () => { const s = spread(); document.querySelectorAll("[data-sp]").forEach(c => s[+c.dataset.sp].d = c.checked); document.querySelectorAll("[data-spn]").forEach(c => s[+c.dataset.spn].n = c.value); A.store.set("spread", s); return s; };
document.addEventListener("change", e => {
  if (!e.target.matches("[data-sp]")) return;
  const done = saveSpread().filter(x => x.d).length, pill = A.$("#spread .pill");
  pill.textContent = done + " of 10"; pill.className = "pill " + (done >= 10 ? "p-good" : "p-acc");
  A.$(".cta-prog span").style.width = done * 10 + "%"; A.$(".cta-prog").setAttribute("aria-valuenow", done);
  A.$(".cta-math").innerHTML = (done >= 10 ? "<b>You did it.</b> Now ask each of your 10 to reach 10 more. " : "") + "If each person reaches 10 others, three rounds reach 1,000 people and five rounds reach 100,000.";
  if (done === 10) A.toast("All 10 reached. Thank you!");
});
document.addEventListener("input", e => { if (e.target.matches("[data-spn]")) saveSpread(); });
A.$("#calBtn").addEventListener("click", () => {
  const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); const ymd = "" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Agora Society Stands//EN", "BEGIN:VEVENT", "UID:" + A.device + "@agorasocietystands.com",
    "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z", "DTSTART;VALUE=DATE:" + ymd, "RRULE:FREQ=WEEKLY",
    "SUMMARY:Agora check-in: participate, share an idea, take one step", "DESCRIPTION:Vote in this week's polls, offer an idea, take one lawful step, and tell someone new. " + SITE,
    "URL:" + SITE, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = Object.assign(document.createElement("a"), {href: URL.createObjectURL(new Blob([ics], {type: "text/calendar"})), download: "agora-weekly.ics"});
  document.body.appendChild(a); a.click(); a.remove(); A.toast("Open the file to add a weekly reminder to your calendar");
});
const pre = new URLSearchParams(location.search).get("topic"); if (pre && TOPICS[pre]) A.$("#lt").value = pre;
upd();
if (location.hash) setTimeout(() => { const el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }, 50);
})();
