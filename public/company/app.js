/* Company accountability page: /company/#TICKER */
(function () {
const A = Agora, {esc, money, pct, big, src} = A, CS = AGORA_COMPANIES, SC = AGORA_SOURCES_CO;
const get = () => CS.find(c => c.t === location.hash.slice(1).toUpperCase()) || CS[0];
let co = get();
A.chrome({product: co.s === "pharma" ? "Pharma" : "Health"});
const BIZDAYS = (a, b) => { let d = new Date(a + "T12:00:00"), e = new Date(b + "T12:00:00"), n = 0; while (d < e) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w && w < 6) n++; } return n; };
const CODE = {P: ["Open-market purchase", "p-good"], S: ["Open-market sale", "p-bad"], A: ["Stock award", "p-neu"], M: ["Option exercise", "p-neu"], F: ["Shares withheld for tax", "p-neu"], G: ["Gift", "p-neu"], D: ["Returned to company", "p-neu"], C: ["Conversion", "p-neu"], X: ["Option exercise", "p-neu"]};

function page() {
  const back = co.s === "pharma" ? ["/pharma/#drugmakers", "Drugmakers"] : ["/health/#insurers", "Insurers"];
  const hrs = co.med ? co.med / (co.pay * 1e6 / 2080) : null;
  const maxOff = Math.max(...co.off.map(o => o[1]));
  const ballot = AGORA_BALLOT(co);
  const sh = A.store.get("shareholder:" + co.t, false);
  return `<header class="hero"><div class="hero-in">
    <div class="eyebrow"><a href="${back[0]}" style="color:inherit;text-decoration:none">← ${back[1]}</a></div>
    <div class="co-head"><div><h1>${esc(co.name)}</h1><p><span class="tick">${co.t}</span> · ${co.s === "pharma" ? "Drugmaker" : "Health insurer"} · CEO ${esc(co.ceo)}</p></div>
      <div class="px"><div class="v" id="pxLast">—</div><div class="num" id="pxChg" style="font-size:.85rem;color:var(--muted)">Live price on the deployed site</div></div></div>
    <div class="picker" role="group" aria-label="Choose company" style="margin-top:14px">${CS.filter(c => c.s === co.s).map(c => `<a class="chip" href="#${c.t}" style="text-decoration:none;${c.t === co.t ? "border-color:var(--accent);color:var(--accent)" : ""}">${c.t}</a>`).join("")}</div>
  </div></header>
  <div class="content">
    <div class="card"><div class="card-h"><div><h3>Share price, past year</h3><div class="sub">Daily close</div></div><div class="right"><span class="live offline" id="pxBadge">Loads when live</span></div></div><div class="card-b"><div class="chart-wrap" id="pxChart"><p class="skel">The price chart appears on the live site.</p></div></div></div>

    <div class="card" id="profile"><div class="card-h"><div><h3>Company profile & finances</h3><div class="sub">Registered address, phone and results from SEC filings</div></div><div class="right"><span class="live offline" id="profBadge">Loads when live</span></div></div>
      <div id="prof"><div class="card-b"><p class="skel">Headquarters, revenue and net income by quarter and year load from SEC EDGAR on the live site. <a href="${SC.sec(co.t)[1]}" target="_blank" rel="noopener">View filings on EDGAR</a>.</p></div></div></div>
    ${insurerCards()}
    <div class="grid">
      ${co.pay ? `<div class="card"><div class="card-h"><div><h3>CEO pay, 2025</h3><div class="sub">${esc(co.ceo)} · total compensation from the 2026 proxy</div></div><div class="right">${A.publicBadge}</div></div>
        <div class="card-b"><div class="grid-tight">
          <div class="stat"><div class="l">CEO total pay</div><div class="v">$${co.pay.toFixed(1)}M</div></div>
          ${co.med ? `<div class="stat"><div class="l">Median employee</div><div class="v">${money(co.med, 0)}</div></div>` : ""}
          ${co.ratio ? `<div class="stat"><div class="l">Pay ratio</div><div class="v down">${co.ratio}:1</div></div>` : ""}
          ${hrs ? `<div class="stat"><div class="l">CEO earns a median worker's year in</div><div class="v">${hrs < 8 ? hrs.toFixed(1) + " hrs" : (hrs / 8).toFixed(1) + " days"}</div><div class="s">at 2,080 work hours a year</div></div>` : ""}
        </div>${co.payNote ? `<p class="src">${esc(co.payNote)}</p>` : ""}<p class="src">Source: ${src(co.paySrc)}. ${!co.med ? "Median employee pay will be added from the proxy's pay-ratio disclosure." : ""}</p></div></div>` : `<div class="card"><div class="card-h"><div><h3>CEO pay</h3><div class="sub">${esc(co.ceo)}</div></div></div><div class="card-b"><p class="skel">Not yet compiled. See the company's latest proxy statement (Form DEF 14A) on <a href="${SC.sec(co.t)[1]}" target="_blank" rel="noopener">SEC EDGAR</a>.</p></div></div>`}
      ${co.pen ? `<div class="card"><div class="card-h"><div><h3>Enforcement record since 2000</h3><div class="sub">Federal and state penalties, including subsidiaries</div></div><div class="right">${A.publicBadge}</div></div>
        <div class="card-b"><div class="grid-tight"><div class="stat"><div class="l">Total penalties</div><div class="v down">${big(co.pen)}</div></div><div class="stat"><div class="l">Records</div><div class="v">${co.rec}</div></div>${co.maDenial ? `<div class="stat"><div class="l">MA prior-auth denials</div><div class="v">${co.maDenial}%</div><div class="s">2024; average 7.7%</div></div>` : ""}</div>
        ${A.hbars(co.off.map(([g, v, n]) => [`${g} <span class="tsub">${n} records</span>`, v, "var(--s-otc)", big(v)]), maxOff)}
        <p class="src">Source: <a href="https://violationtracker.goodjobsfirst.org/parent/${co.vt}" target="_blank" rel="noopener">Violation Tracker: ${esc(co.name)}</a>, which lists every case with links to the agency record.${co.maDenial ? " Denial rate: " + src(SC.ma) + "." : ""}</p></div></div>` : `<div class="card"><div class="card-h"><div><h3>Enforcement record</h3></div></div><div class="card-b"><p class="skel">Not yet compiled. Search the company on <a href="https://violationtracker.goodjobsfirst.org/" target="_blank" rel="noopener">Violation Tracker</a>.</p></div></div>`}
    </div>

    <div class="card"><div class="card-h"><div><h3>Insider trades</h3><div class="sub">Officers' and directors' Form 4 filings with the SEC, most recent first</div></div><div class="right"><span class="live offline" id="insBadge">Loads when live</span></div></div>
      <div id="ins"><div class="card-b"><p class="skel">Insider filings load directly from SEC EDGAR on the live site. <a href="${SC.sec(co.t)[1]}" target="_blank" rel="noopener">View ${esc(co.name)} filings on EDGAR</a>.</p></div></div>
      <div class="card-f">Insiders must file within 2 business days of a trade. Many sales are pre-scheduled under Rule 10b5-1 plans or cover taxes on vested stock, and are not a sign of wrongdoing. Agora flags late filings and open-market trades for context only.</div></div>

    <div class="card"><div class="card-h"><div><h3>Shareholder ballot</h3><div class="sub">Advisory vote. Your result is shown separately for shareholders and the public.</div></div></div>
      <div class="card-b" style="padding-block:6px 0">
        <label class="chk" for="shBox"><input type="checkbox" id="shBox" ${sh ? "checked" : ""}> I own ${co.t} shares, directly or through a fund</label>
        <div id="ballot">${ballot.map(b => ballotItem(b, {})).join("")}</div></div>
      <div class="card-f">Agora votes are not binding and do not count at the company's annual meeting. To vote your actual shares, use the proxy materials from your broker or at <a href="https://www.proxyvote.com" target="_blank" rel="noopener">ProxyVote.com</a>.</div></div>

    <div class="card"><div class="card-b foot-notes"><b style="color:var(--ink)">Primary sources</b><span><a href="${SC.sec(co.t)[1]}" target="_blank" rel="noopener">SEC EDGAR: annual reports, proxy statements and Form 4 filings</a></span><span>${src(SC.vt)}</span><span>Spot an error? <a href="/about/#corrections">Request a correction</a>.</span></div></div>
  </div>`;
}
function insurerCards() {
  const I = (window.AGORA_INSURERS || []).find(x => x.t === co.t); if (!I) return "";
  const IS = window.AGORA_INS_SRC;
  return `<div class="grid">
    <div class="card"><div class="card-h"><div><h3>Subsidiaries</h3><div class="sub">Major businesses owned by ${esc(co.name)}</div></div></div>
      <div class="tbl"><table><tbody>${I.subs.map(([n, d]) => `<tr><td class="strong">${esc(n)}</td><td style="font-size:.85rem">${esc(d)}</td></tr>`).join("")}</tbody></table></div>
      <div class="card-f">The full list of legal subsidiaries is in Exhibit 21 of the annual report (Form 10-K) on <a href="${SC.sec(co.t)[1]}" target="_blank" rel="noopener">SEC EDGAR</a>.</div></div>
    <div class="card"><div class="card-h"><div><h3>Government programs</h3><div class="sub">Medicare, Medicaid, TRICARE, VA and others</div></div></div>
      <div class="tbl"><table><tbody>${I.gov.map(([n, d]) => `<tr><td class="strong">${esc(n)}</td><td style="font-size:.85rem">${esc(d)}</td></tr>`).join("")}</tbody></table></div></div>
  </div>
  <div class="card"><div class="card-h"><div><h3>Conflicts of interest</h3><div class="sub">Where the same company sits on more than one side of a transaction, with sources</div></div></div>
    <div class="card-b">${I.conflicts.length ? `<ul class="decisions">${I.conflicts.map(([t, k]) => `<li>${esc(t)}${k ? ` <span class="tsub">${src(IS[k])}</span>` : ""}</li>`).join("")}</ul>` : `<p class="skel">None documented yet.</p>`}</div>
    <div class="card-f">"Conflict of interest" here means a structural incentive that can work against patients or taxpayers, not a finding of wrongdoing. Investigations are not findings of guilt.</div></div>`;
}
async function profile() {
  try {
    const p = await A.api("profile?t=" + co.t);
    A.$("#profBadge").className = "live"; A.$("#profBadge").textContent = "Live from SEC EDGAR";
    const qs = p.quarterly.slice(-8), maxR = Math.max(...p.annual.map(a => a.revenue || 0));
    A.$("#prof").innerHTML = `<div class="card-b"><div class="kv"><span class="k">Address</span><span class="v">${esc(p.address)}, ${esc(p.city)}, ${esc(p.state)} ${esc(p.zip)}</span><span></span><span class="k">Phone</span><span class="v">${esc(p.phone || "—")}</span><span></span><span class="k">CEO</span><span class="v">${esc(co.ceo)}</span><span></span></div>
      ${A.hbars(p.annual.map(a => [String(a.year), a.revenue || 0, "var(--s-rx)", big(a.revenue || 0)]), maxR)}</div>
      <div class="tbl"><table><thead><tr><th>Year</th><th class="r">Revenue</th><th class="r">Net income</th><th class="r">Net margin</th></tr></thead><tbody>${p.annual.slice().reverse().map(a => `<tr><td class="num strong">${a.year}</td><td class="r num">${a.revenue != null ? big(a.revenue) : "—"}</td><td class="r num ${a.net < 0 ? "down" : ""}">${a.net != null ? big(a.net) : "—"}</td><td class="r num">${a.revenue && a.net != null ? (a.net / a.revenue * 100).toFixed(1) + "%" : "—"}</td></tr>`).join("")}</tbody></table></div>
      <div class="tbl"><table><thead><tr><th>Quarter</th><th class="r">Revenue</th><th class="r">Net income</th></tr></thead><tbody>${qs.slice().reverse().map(q => `<tr><td class="num">${q.q}${q.derived ? "*" : ""}</td><td class="r num">${q.revenue != null ? big(q.revenue) : "—"}</td><td class="r num ${q.net < 0 ? "down" : ""}">${q.net != null ? big(q.net) : "—"}</td></tr>`).join("")}</tbody></table></div>
      <div class="card-f">Revenue is total revenue as tagged in the company's SEC filings (${esc(p.revenueConcept || "")}); net income is profit after all costs and taxes. * Fourth quarter calculated as full year minus the first three quarters. For executives' direct contact, use the company's investor relations or media office listed in its filings.</div>`;
  } catch (e) {}
}
function ballotItem(b, t) {
  const my = A.myVote(b.key), c = (t[b.key] || {}).counts || {}, s = (t[b.key] || {}).sh || {};
  const tot = ["for", "against", "abstain"].reduce((a, k) => a + (c[k] || 0), 0), stot = ["for", "against", "abstain"].reduce((a, k) => a + (s[k] || 0), 0);
  const w = k => tot ? (c[k] || 0) / tot * 100 : 0, sw = k => stot ? Math.round((s[k] || 0) / stot * 100) : 0;
  return `<div class="ballot-item" data-key="${b.key}"><div><span class="t">${esc(b.t)}</span><div class="d">${esc(b.d)}</div></div>
    <div class="seg vote" role="group" aria-label="Your vote on ${esc(b.t)}">${["for", "against", "abstain"].map(v => `<button data-v="${v}" data-bvote="${b.key}" aria-pressed="${my === v}">${v[0].toUpperCase() + v.slice(1)}</button>`).join("")}</div>
    <div class="full">${tot ? `<div class="tally"><span class="t-for" style="width:${w("for")}%"></span><span class="t-against" style="width:${w("against")}%"></span><span class="t-abs" style="width:${w("abstain")}%"></span></div>
      <div class="tally-legend"><span>Everyone: For ${Math.round(w("for"))}% · Against ${Math.round(w("against"))}% · ${tot.toLocaleString()} votes</span>${stot ? `<span>Shareholders: For ${sw("for")}% · Against ${sw("against")}% · ${stot.toLocaleString()}</span>` : ""}</div>` : `<div class="tally-legend"><span>No votes yet</span></div>`}</div></div>`;
}
async function ballots() {
  const items = AGORA_BALLOT(co), t = await A.tally(items.map(b => b.key));
  A.$("#ballot").innerHTML = items.map(b => ballotItem(b, t)).join("");
}
async function prices() {
  try {
    const q = await A.api("quote?t=" + co.t); const r = q.series;
    A.$("#pxLast").textContent = money(q.last); A.$("#pxChg").innerHTML = `<span class="${q.chg >= 0 ? "up" : "down"}">${pct(q.chg)} today</span>${q.chg1y != null ? ` · <span class="${q.chg1y >= 0 ? "up" : "down"}">${pct(q.chg1y)} 1 yr</span>` : ""}`;
    if (r && r.length > 5) A.$("#pxChart").innerHTML = A.priceChart(r, `${co.t} daily close, past year`);
    A.$("#pxBadge").className = "live"; A.$("#pxBadge").textContent = "Live · " + (q.source || "delayed");
  } catch (e) {}
}
async function insiders() {
  try {
    const d = await A.api("insiders?t=" + co.t);
    A.$("#insBadge").className = "live"; A.$("#insBadge").textContent = "Live from SEC EDGAR";
    const rows = d.trades || [];
    A.$("#ins").innerHTML = rows.length ? `<div class="tbl"><table><thead><tr><th>Insider</th><th>Transaction</th><th class="r">Shares</th><th class="r">Price</th><th class="r">Value</th><th>Traded</th><th>Filed</th></tr></thead><tbody>
      ${rows.map(x => { const [lab, cls] = CODE[x.code] || [x.code, "p-neu"]; const lag = x.date && x.filed ? BIZDAYS(x.date, x.filed) : null; const val = x.price && x.shares ? x.price * x.shares : null;
        return `<tr><td><span class="strong">${esc(x.owner)}</span><span class="tsub">${esc(x.title || "")}</span></td><td><span class="pill ${cls}">${lab}</span>${x.plan ? `<span class="tsub">10b5-1 plan</span>` : ""}</td><td class="r num">${x.shares ? Math.round(x.shares).toLocaleString() : "—"}</td><td class="r num">${x.price ? money(x.price) : "—"}</td><td class="r num">${val ? big(val) : "—"}</td><td class="num">${x.date ? A.fmtDate(x.date) : "—"}</td><td class="num"><a href="${x.url}" target="_blank" rel="noopener">${x.filed ? A.fmtDate(x.filed) : "Filing"}</a>${lag != null && lag > 2 ? `<span class="pill p-warn">Late · ${lag} days</span>` : ""}</td></tr>`; }).join("")}
      </tbody></table></div>` : `<div class="card-b"><p class="skel">No Form 4 filings in the last 90 days.</p></div>`;
  } catch (e) {}
}
function render() { co = get(); document.title = co.name + " · Agora"; A.$("#main").innerHTML = page(); ballots(); prices(); insiders(); profile(); }
window.addEventListener("hashchange", () => { render(); window.scrollTo({top: 0}); });
document.addEventListener("change", e => { if (e.target.id === "shBox") A.store.set("shareholder:" + co.t, e.target.checked); });
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-bvote]"); if (!b) return;
  await A.vote(b.dataset.bvote, b.dataset.v, A.$("#shBox").checked); A.toast("Vote recorded"); ballots();
});
render();
})();
