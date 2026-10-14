/* Stand Up: lawful resistance, questions of conscience, and insurers that override doctors. */
(function () {
const A = Agora, esc = A.esc;
A.chrome({product: "Take action"});
const L = (label, url) => `<a href="${url}" target="_blank" rel="noopener">${esc(label)}</a>`;

/* ── Part 1: lawful pressure ── */
const PRESSURE = [
  {id: "boycott", h: "Boycotts and buycotts", lead: "Refusing to buy from a company, and deliberately buying from better ones, is one of the oldest and most powerful tools citizens have. The Supreme Court held in <i>NAACP v. Claiborne Hardware</i> (1982) that a peaceful consumer boycott is speech protected by the First Amendment.",
   how: [
    "<b>Pick one target and one demand.</b> \"Stop denying care without a doctor reviewing my records\" works better than \"be less greedy.\"",
    "<b>Tell the company</b>, in writing, what you're doing and what would end it. Then tell the public.",
    "<b>Have an alternative ready.</b> A generic instead of a brand, an independent pharmacy, a different plan at open enrollment, a local business.",
    "<b>Buycott:</b> spend deliberately with companies that treat patients, workers and communities well, and tell them why.",
    "<b>Organize, don't just abstain.</b> One person switching is invisible; a congregation, union, employer or city switching is news.",
    "<b>Stop when you win</b>, and say so publicly. A boycott that never ends teaches companies that nothing they do matters."],
   care: [
    "Stick to facts. False statements about a company or person can be defamation.",
    "Labor unions face legal limits on \"secondary\" boycotts of companies they don't have a dispute with (NLRA section 8(b)(4)). Consumers acting on their own don't.",
    "Some states restrict government contractors from certain boycotts. If you contract with a government, check first.",
    "Never boycott care you need. Switch plans or pharmacies; don't go without treatment."]},
  {id: "strike", h: "Strikes and collective action at work", lead: "Federal law protects most private-sector employees who act together to improve pay or working conditions, whether or not they have a union. That includes raising concerns as a group, petitioning management, and striking.",
   how: [
    "<b>Talk with coworkers first.</b> Two or more employees acting together is \"protected concerted activity\" under section 7 of the National Labor Relations Act.",
    "<b>Start small:</b> a joint letter, a delegation to a manager, a petition. Many problems are solved before a strike is ever needed.",
    "<b>Form or join a union</b> through a National Labor Relations Board election, or by voluntary recognition.",
    "<b>Strike only with a plan:</b> clear demands, a strike fund, community support and, ideally, a union and a labor lawyer."],
   care: [
    "Supervisors, managers, independent contractors, agricultural and domestic workers are not covered by the NLRA.",
    "Unions at hospitals, nursing homes and clinics must give 10 days' notice before a strike (NLRA section 8(g)).",
    "Public employees' rights depend on state law; federal employees may not strike.",
    "Workers in an \"economic\" strike can be permanently replaced, though not fired. Get advice before you walk out."],
   links: [L("NLRB: Your right to strike", "https://www.nlrb.gov/strikes"), L("NLRB: Concerted activity", "https://www.nlrb.gov/about-nlrb/rights-we-protect/the-law/employees/concerted-activity")]},
  {id: "protest", h: "Peaceful protest", lead: "The First Amendment protects the right to assemble and speak, including outside corporate headquarters, insurer offices and shareholder meetings.",
   how: [
    "<b>Public sidewalks and parks</b> are generally open for protest without a permit, as long as you don't block entrances or traffic.",
    "<b>Marches and large rallies</b> usually need a permit. Apply early with your city.",
    "<b>Bring the story, not just the sign:</b> patients and families who were denied care, with their permission, are the most persuasive voices.",
    "<b>Invite the press</b> and share a one-page fact sheet with sources from Agora."],
   care: [
    "Private property, including pharmacies, hospitals and office lobbies, can be closed to protesters.",
    "Keep it peaceful. Never block a patient from getting care.",
    "Don't share anyone's medical information without their written permission."],
   links: [L("ACLU: Know your rights as a protester", "https://www.aclu.org/know-your-rights/protesters-rights")]},
  {id: "legislate", h: "Demand changes to the law", lead: "Companies follow the rules they're given. Lawmakers in both parties have passed limits on prior authorization, pharmacy benefit managers and AI-driven denials when constituents pushed hard enough.",
   how: [
    "<b>Ask for something specific:</b> for example, that only a licensed physician in the same specialty may deny care as not medically necessary; that AI may never be the sole basis of a denial; that insurers publish denial and appeal rates; that prior authorization decisions come within 72 hours.",
    "<b>Point to working examples.</b> California's SB 1120, in effect since January 2025, requires a licensed physician or qualified health professional to make medical-necessity denials and bars AI from being the sole basis.",
    "<b>Testify</b> at state legislative hearings, in person or in writing.",
    "<b>Use ballot initiatives.</b> In about half the states, citizens can put a law directly on the ballot by gathering signatures.",
    "<b>Follow the money:</b> look up which industries fund your officials at the Federal Election Commission and your state's campaign finance site."],
   links: [`<a href="/act/#lawmakers">Contact your lawmakers</a>`, `<a href="/act/#letter">Letter builder</a>`, L("FEC campaign finance data", "https://www.fec.gov/data/")]},
  {id: "antitrust", h: "Enforce the antitrust laws", lead: "When a few companies control a market, they can raise prices and cut access without losing customers. America's antitrust laws (the Sherman Act, the Clayton Act and the FTC Act) exist to stop that, and citizens can help enforce them.",
   how: [
    "<b>Report conduct</b> such as price-fixing, pay-for-delay deals that keep generics off the market, or mergers that leave you fewer choices, to the Federal Trade Commission and the Justice Department.",
    "<b>Ask your state attorney general</b> to review health care mergers. Several states, including California, Oregon and Massachusetts, now review health care deals before they close.",
    "<b>Comment publicly</b> when the FTC or a state invites comments on a proposed settlement or merger.",
    "<b>Private lawsuits:</b> people harmed by antitrust violations can sue for three times their damages. These are usually class actions, so consult an antitrust lawyer."],
   links: [L("Report to the FTC", "https://www.ftc.gov/enforcement/report-antitrust-violation"), L("Report to the Justice Department", "https://www.justice.gov/atr/citizen-complaint-center"), L("Find your attorney general", "https://www.naag.org/find-my-ag/"), `<a href="/pharma/#mergers">Drug-industry mergers on Agora</a>`]},
  {id: "money", h: "Move your money and your vote as an owner", lead: "Your savings, retirement account and bank all give companies their capital.",
   how: [
    "<b>Vote your proxies</b> against directors and pay packages you disagree with.",
    "<b>Choose funds</b> whose voting records match your values (funds publish them each year on SEC Form N-PX).",
    "<b>Bank with a credit union</b> or community bank if you want your deposits lent locally.",
    "<b>Ask your employer</b> or pension fund how it votes and which insurers it hires."],
   links: [`<a href="/act/#shareholder">More on shareholder action</a>`, `<a href="/pharma/#drugmakers">Company ballots</a>`]}
];

/* ── Part 2: questions of conscience ── */
const CONSCIENCE = [
  {id: "q-jobs", q: "Should I support businesses and technologies that may eventually end my job, and most jobs?",
   ask: ["Who will own the technology, and who will share in what it saves?", "Is this company replacing drudgery, or replacing people to cut costs and raise its share price?", "Am I paying for convenience today with my community's livelihood tomorrow?"],
   know: "Economists disagree about how many jobs automation and artificial intelligence will eliminate or create. History shows both: new technologies have destroyed some occupations and created others, but the transition has often been painful for the workers and towns left behind, and the gains have not always been shared.",
   views: ["Supporters say new technology raises living standards, ends dangerous and tedious work, and creates jobs we can't yet imagine.", "Critics say this wave may move faster and reach further than past ones, concentrating wealth in a handful of companies unless laws change how gains are shared."],
   do: ["Buy from businesses that invest in their workers, not only in replacing them.", "Ask lawmakers about retraining, portable benefits and how the gains from automation will be shared.", "Support employee ownership and cooperatives in your community."]},
  {id: "q-myjob", q: "Is the work I'm doing helping my employer eliminate my job and many others?",
   ask: ["Am I training a system, or documenting a process, that is designed to replace the people who do it?", "Has my employer said what happens to the people affected?", "Would I be comfortable explaining this work to the people it will displace?"],
   know: "Many workers are now asked to help build or train the systems that will take over part of their work. Being part of that change isn't wrong in itself; doing it without asking these questions can be.",
   views: ["Some argue it's better to shape the change from the inside, so it's done responsibly, than to leave it to others.", "Others argue workers should insist on a voice, and on protections for those affected, before contributing."],
   do: ["Ask, ideally with coworkers, what the plan is for affected workers. That is protected concerted activity.", "Build skills that are hard to automate: judgment, care, trust and relationships.", "Negotiate, individually or through a union, for retraining, severance and a share of the savings."]},
  {id: "q-ethics", q: "Is the work I'm doing moral, honest and ethical?",
   ask: ["Would I be comfortable if my children, or the people affected, saw exactly what I do?", "Am I asked to mislead customers, hide information or deny something people are entitled to?", "Does my work follow the law, and my profession's code of ethics?"],
   know: "Most professions, including medicine, nursing, pharmacy, law, accounting and engineering, have written ethics codes. Many states protect employees fired for refusing to break the law, and federal and state whistleblower laws protect people who report fraud.",
   views: ["Some believe the right path is to stay and change things from within.", "Others believe that when a job requires dishonesty, the right choice is to leave and, where appropriate, report it."],
   do: ["Write down what you're asked to do, and when.", "Raise concerns through ethics hotlines or compliance offices, and keep copies.", "Before refusing an assignment or reporting outside the company, talk with an employment lawyer. See <a href=\"/act/#report\">reporting fraud</a>."]},
  {id: "q-benefit", q: "Does my work benefit society and the customer, or only executives and investors? If only them, why am I doing it?",
   ask: ["Who is better off because of what I did today? Who is worse off?", "If my company disappeared tomorrow, would customers miss it, or be relieved?", "What would I do if I didn't need this paycheck, and is there a path toward it?"],
   know: "Studies of work and well-being consistently find that people who see their work as helping others report more meaning and satisfaction. Many people also have bills to pay and few options. Both are true.",
   views: ["Some say every honest job serves someone, and providing for your family is itself meaningful.", "Others say we each have a duty not to spend our working lives making things worse for others."],
   do: ["Look for ways to make your current job serve customers better.", "Volunteer your skills where they're needed.", "Plan, without shame, a move toward work that matches your values."]},
  {id: "q-unplug", q: "Should I turn off or stop buying electronics? Would I be happier helping others, serving my community and investing in relationships?",
   ask: ["How many hours a day do I spend on screens, and how do I feel afterward?", "Who have I not called, visited or helped because I was on a device?", "Do I need a new device, or would a repair do?"],
   know: "The Harvard Study of Adult Development, which has followed people since 1938, finds that close relationships are among the strongest predictors of long-term health and happiness. In 2023 the U.S. Surgeon General reported that about half of American adults experience measurable loneliness, and that social disconnection carries health risks comparable to smoking up to 15 cigarettes a day.",
   views: ["Technology also connects people: telehealth, video calls with distant family, support groups for rare diseases.", "The question for most people isn't all or nothing; it's whether technology serves your relationships or replaces them."],
   do: ["Try a regular screen-free day or evening, and spend it with people.", "Keep and repair devices longer, and support right-to-repair laws.", "Join something that meets in person: a congregation, club, team, volunteer crew or neighborhood group."]},
  {id: "q-isolate", q: "Are technologies that leave more people isolated or shut out really in society's best interest? Who benefits?",
   ask: ["Is this product designed to help me, or to keep me using it?", "Who makes money from my attention and my data?", "Who gets left out: older people, people with disabilities, rural communities, people who can't afford it?"],
   know: "Many apps and platforms earn money from advertising, which rewards keeping users engaged as long as possible. The Surgeon General's 2023 advisory called for technology to be designed to strengthen, not replace, human connection.",
   views: ["Some see these tools as neutral, with the responsibility falling on how each person uses them.", "Others believe design choices made for profit should be regulated, especially where children are involved."],
   do: ["Ask your representatives about privacy, data and children's online safety laws.", "Insist on a human option: a person to talk to at your insurer, bank or pharmacy.", "Help someone in your life who struggles with technology, or is left out by it."]},
  {id: "q-stipend", q: "If mass layoffs come and most people live on a stipend, can that work? What if I run out of money? What will people do when they're bored and broke?",
   ask: ["What would give my days purpose if I didn't need to work for pay?", "Do I have savings, skills and people I could rely on if my income stopped?", "Who would decide how much a stipend is, and who would pay for it?"],
   know: "Real-world evidence is limited. In the largest U.S. study, 1,000 low-income adults received $1,000 a month for three years (OpenResearch, 2024). They worked about 1.4 fewer hours a week than a comparison group and spent the money mostly on basic needs; reductions in stress faded after the first year. Alaska has paid every resident an annual oil dividend since 1982, and research has found it did not reduce overall employment. No country has tried supporting most of its population this way.",
   views: ["Supporters argue a basic income could provide security, simplify welfare and free people for caregiving, learning and community work.", "Critics raise the cost, the risk of inflation, weaker incentives to work and the loss of meaning that work provides, and favor alternatives such as job guarantees, wage insurance, shorter work weeks or broader employee ownership."],
   do: ["Build an emergency fund, even a small one, and keep debts low.", "Invest in skills and relationships that don't depend on one employer.", "Ask candidates of every party how they would handle large-scale job loss, and weigh the answers yourself."]}
];

/* ── Part 3: insurers overriding doctors ── */
const SCRIPT = `Questions to ask your insurer about a denial (ask for the answers in writing):

1. Who made this decision? Please give me the reviewer's name, credentials and specialty.
2. Did a physician review my medical records and my doctor's notes before denying this request?
3. Was an algorithm, artificial intelligence or automated tool used in this decision?
4. Which specific coverage criteria or guidelines were used? Please send me a copy.
5. Please send me my complete claim file. (You have a right to it free of charge.)
6. Will you allow my doctor a peer-to-peer review with the reviewer?
7. Is the company that reviewed my request licensed or registered as a utilization review agent in my state?
8. What is the deadline for my appeal, and can it be expedited?

Name of representative: ________  ID: ________  Date and time: ________  Reference number: ________`;

const sec = (id, n, h, lead, body) => `<section class="card act-step" id="${id}"><div class="card-b"><div class="act-hd"><span class="act-n">${n}</span><h2>${h}</h2></div><p class="act-lead">${lead}</p>${body}</div></section>`;
const list = items => `<ul class="act-list">${items.map(i => `<li>${i}</li>`).join("")}</ul>`;

const pressureHTML = PRESSURE.map((p, i) => sec(p.id, i + 1, p.h, p.lead,
  `<div class="st-cols"><div><div class="st-k">How to do it well</div>${list(p.how)}</div>${p.care ? `<div><div class="st-k">Know the limits</div>${list(p.care)}</div>` : ""}</div>${p.links ? `<div class="st-links">${p.links.join(" · ")}</div>` : ""}`)).join("");

const conscienceHTML = CONSCIENCE.map((c, i) => `<details class="card st-q" id="${c.id}"${i === 0 ? " open" : ""}><summary><span class="act-n">${i + 1}</span><span>${c.q}</span></summary><div class="card-b">
  <div class="st-grid">
    <div><div class="st-k">Ask yourself</div>${list(c.ask)}</div>
    <div><div class="st-k">What we know</div><p>${c.know}</p></div>
    <div><div class="st-k">Views differ</div>${list(c.views)}</div>
    <div><div class="st-k">Lawful things you can do</div>${list(c.do)}</div>
  </div></div></details>`).join("");

document.getElementById("main").innerHTML = A.hero("Stand up", "Lawful resistance to companies that put profit over people",
  "When drugmakers, insurers and other corporations act against patients, workers and communities, citizens are not powerless. Boycotts, strikes, protest, new laws and antitrust enforcement have changed powerful industries before. This guide covers how to use them, the hard questions each of us should ask about our own work and technology, and what to do when an insurer overrides your doctor.",
  ["Peaceful and legal", "Nonpartisan", "Not legal advice"]) +
`<div class="content">
  <div class="notice brass"><span class="bar"></span><span><b>Our line: lawful and peaceful, always.</b> Agora does not support sabotage, hacking, threats, harassment, trespass, publishing people's private information, or violence. They hurt real people, discredit good causes and land good people in prison. Every tool on this page is legal, and together they are far more powerful.</span></div>
  <nav class="act-jump" aria-label="Sections"><a href="#pressure"><span>A</span>Lawful pressure</a><a href="#conscience"><span>B</span>Questions of conscience</a><a href="#override"><span>C</span>When insurers override your doctor</a><a href="/act/"><span>→</span>All ways to take action</a></nav>

  <div class="st-part" id="pressure"><div class="eyebrow" style="margin:0">Part A</div><h2>Lawful pressure</h2><p>Six tools citizens have used to change powerful industries.</p></div>
  ${pressureHTML}

  <div class="st-part" id="conscience"><div class="eyebrow" style="margin:0">Part B</div><h2>Questions of conscience</h2><p>Some of the most important choices aren't about what companies do, but about what each of us does: the work we take on, the technology we buy, and how we spend our time. Agora doesn't answer these for you. Here are honest questions, what the evidence says, and the views on different sides.</p></div>
  ${conscienceHTML}

  <div class="st-part" id="override"><div class="eyebrow" style="margin:0">Part C</div><h2>When insurers override your doctor</h2><p>Patients and physicians increasingly report denials made without anyone examining the patient or reading the records, decisions driven by algorithms, and patients steered to insurer-chosen vendors instead of the care their own doctor recommended. Here's what the rules say, and how to push back.</p></div>
  ${sec("ov-what", "1", "What's happening", "These are the documented practices and the legal limits on them.", list([
    "<b>Algorithm-driven denials.</b> Class-action lawsuits allege that UnitedHealth used a tool called nH Predict to cut off Medicare Advantage patients' rehabilitation care, and that Cigna's PxDx system let its doctors deny claims in batches without opening patient files. Humana faces similar claims. The companies deny wrongdoing; the cases are pending. In March 2026 a federal court ordered UnitedHealth to turn over records about the tool.",
    "<b>Steering.</b> A 2024 Federal Trade Commission interim report found that the largest pharmacy benefit managers, which are owned by or tied to major insurers, steer patients toward pharmacies they own.",
    "<b>Medicare Advantage rules (since 2024).</b> Plans must follow traditional Medicare's coverage rules, consider each patient's individual circumstances, and have a physician or other professional with expertise in the relevant field review any denial based on medical necessity. CMS has said an algorithm alone may not be the basis for a denial.",
    "<b>California's SB 1120 (since January 2025)</b> requires a licensed physician or qualified health professional to make medical-necessity denials and bars AI from being the only basis. Other states are considering similar laws.",
    "<b>Traditional Medicare is testing AI too.</b> The WISeR model, which began in January 2026 in Arizona, New Jersey, Ohio, Oklahoma, Texas and Washington, uses AI-assisted prior authorization for selected services. A clinician must review any denial before it is final.",
    "<b>Is it \"practicing medicine without a license\"?</b> That question is unsettled and varies by state. Insurers say they decide what they'll pay for, not what care you get. Many physicians and lawmakers argue that when a denial overrides a treating doctor, it is a medical decision. Many states require utilization review companies to be licensed or registered, and state medical boards can review complaints about a licensed physician who made a denial."
  ]) + `<div class="st-links">${[L("Manatt: CMS on algorithms and AI in coverage decisions", "https://www.manatt.com/insights/newsletters/health-highlights/cms-weighs-in-on-the-use-of-algorithms-and-artific"), L("Senator Becker: SB 1120", "https://sd13.senate.ca.gov/news/press-release/december-9-2024/landmark-law-prohibits-health-insurance-companies-using-ai-to"), L("Dinsmore: the WISeR model", "https://www.dinsmore.com/publications/is-ai-wiser-cms-models-ai-based-prior-authorization-process-in-six-states/"), L("Court orders UnitedHealth disclosure (Mar. 2026)", "https://distilinfo.com/2026/03/12/court-orders-unitedhealth-to-disclose-ai-denial-algorithm/")].join(" · ")}</div>`)}
  ${sec("ov-case", "2", "Fight your own case", "Insurers count on people giving up. Most Medicare Advantage denials that are appealed are overturned.", list([
    "<b>Ask who decided, and how.</b> Use the questions below and request the answers in writing.",
    "<b>Get your claim file and the criteria used.</b> Federal law gives you the right to them at no cost.",
    "<b>Ask your doctor for a peer-to-peer review</b> and a letter explaining why the recommended care is medically necessary, citing your records.",
    "<b>Appeal fast</b>, ask for an expedited appeal if delay could harm your health, and request an independent external review if the plan says no again.",
    "<b>Don't accept a substitute you didn't choose.</b> If you're steered to a different vendor, pharmacy or treatment, ask your doctor to document why the original recommendation is necessary, and appeal. Many states let you use any pharmacy willing to accept your plan's terms."
  ]) + `<div class="st-script"><div class="st-k">Questions to ask your insurer</div><pre class="letter" id="script"></pre><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" id="copyScript">Copy questions</button><a class="btn sm ghost" href="/health/#denials">Full appeal guide</a><a class="btn sm ghost" href="/health/#calllog">Call log</a></div></div>`)}
  ${sec("ov-report", "3", "Report it", "Every complaint creates a record regulators can act on. Complaints about the same company, practice or reviewer add up.", list([
    "<b>State insurance department</b> (or California's Department of Managed Health Care): report denials made without proper review, an unlicensed review company, or missed deadlines. " + L("Find yours", "https://content.naic.org/insurance-departments"),
    "<b>State medical board:</b> if a licensed physician denied your care without reviewing your records, you can file a complaint about that physician.",
    "<b>Medicare</b> (1-800-MEDICARE) for Medicare Advantage and Part D; <b>U.S. Department of Labor</b> for self-funded employer plans. " + L("askebsa.dol.gov", "https://www.askebsa.dol.gov/"),
    "<b>Federal Trade Commission and your state attorney general</b> for steering and unfair practices. " + L("FTC", "https://reportfraud.ftc.gov/") + " · " + L("Attorneys general", "https://www.naag.org/find-my-ag/"),
    "<b>Your lawmakers:</b> tell them your story and ask them to support physician-review and AI-denial protections. " + `<a href="/act/#letter">Use the letter builder</a>.`
  ]))}
  ${sec("ov-boycott", "4", "Protest and boycott, together", "One denied patient is a case number. Thousands are a movement.", list([
    "<b>Vote with your enrollment.</b> Medicare beneficiaries can switch plans from October 15 to December 7 each year, and Medicare Advantage members can switch again from January 1 to March 31. Marketplace shoppers can switch during open enrollment each fall. Compare denial rates on Agora's <a href=\"/health/#denials\">Denials</a> and <a href=\"/health/#insurers\">Insurers</a> pages first.",
    "<b>Ask your employer</b>, HR department or union to drop insurers and vendors with high denial rates, and to require physician review in their contracts. Employers are an insurer's biggest customers.",
    "<b>Organize with your doctors.</b> Many physician groups and medical societies are fighting the same practices. Ask your doctor's office which plans cause the most harm.",
    "<b>Tell your story publicly</b>, if you choose to. Privacy law limits what insurers and providers can share, not what you share about yourself. Stick to documented facts.",
    "<b>Join or follow class actions</b> through your own lawyer or the court's official notice. Be wary of ads and websites that ask for personal information to \"join\" a lawsuit.",
    "<b>Show up</b> at insurers' annual shareholder meetings, state insurance rate hearings and legislative hearings, and bring others with you."
  ]))}
  <div class="notice"><span class="bar"></span><span>This guide is general information, not legal, financial or medical advice. Laws vary by state and change often. Lawsuits described here involve allegations the companies dispute. Before striking, refusing work, reporting your employer or suing, talk with a qualified lawyer. <a href="/about/#corrections">Report an error</a>.</span></div>
  ${A.actBand()}
</div>`;

A.$("#script").textContent = SCRIPT;
A.$("#copyScript").addEventListener("click", async () => { try { await navigator.clipboard.writeText(SCRIPT); A.toast("Questions copied"); } catch (e) { A.toast("Select the text and copy it"); } });
if (location.hash) setTimeout(() => { const el = document.getElementById(location.hash.slice(1)); if (el) { if (el.tagName === "DETAILS") el.open = true; el.scrollIntoView(); } }, 50);
document.addEventListener("click", e => { const a = e.target.closest('a[href^="#"]'); if (!a) return; const el = document.getElementById(a.getAttribute("href").slice(1)); if (el && el.tagName === "DETAILS") el.open = true; });
})();
