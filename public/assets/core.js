/* Agora core: helpers, charts, site chrome, API client. Shared by every page. */
(function () {
const A = window.Agora = {};

/* ── helpers ── */
A.$ = s => document.querySelector(s);
A.esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
A.money = (n, d = 2) => "$" + Number(n).toLocaleString("en-US", {minimumFractionDigits: d, maximumFractionDigits: d});
A.big = n => { const a = Math.abs(n); return (n < 0 ? "−" : "") + (a >= 1e12 ? "$" + (a/1e12).toFixed(2) + "T" : a >= 1e9 ? "$" + (a/1e9).toFixed(1) + "B" : a >= 1e6 ? "$" + (a/1e6).toFixed(1) + "M" : a >= 1e3 ? "$" + (a/1e3).toFixed(0) + "K" : "$" + a.toFixed(0)); };
A.pct = n => (n > 0 ? "+" : "") + n.toFixed(1) + "%";
A.fmtDate = s => new Date(String(s).slice(0,10) + "T12:00:00").toLocaleDateString("en-US", {month: "short", day: "numeric", year: "numeric"});
A.niceStep = raw => { const p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p; };
A.toast = msg => { let t = A.$("#toast"); if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(A.toast.h); A.toast.h = setTimeout(() => t.hidden = true, 2400); };
A.src = ([label, url]) => `<a href="${url}" target="_blank" rel="noopener">${A.esc(label)}</a>`;
A.publicBadge = `<span class="pill badge-real">Public data</span>`;
A.store = {
  get(k, d) { try { const v = localStorage.getItem("agora:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("agora:" + k, JSON.stringify(v)); } catch (e) {} }
};
A.device = (() => { let id = A.store.get("device"); if (!id) { id = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now()); A.store.set("device", id); } return id; })();

/* ── charts ── */
A.legend = items => `<div class="legend">${items.map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join("")}</div>`;
A.hbars = (rows, max, par) => `<div class="bars">${rows.map(([l, v, c, d]) => `<div class="hbar"><span>${l}</span><div class="trk"><span style="width:${Math.max(0, Math.min(100, v / max * 100)).toFixed(1)}%;background:${c}"></span>${par != null ? `<i class="par" style="left:${(par / max * 100).toFixed(1)}%"></i>` : ""}</div><span class="v">${d ?? v}</span></div>`).join("")}</div>`;
A.yearChart = (series, opt = {}) => {
  const W = 760, H = opt.h || 300, L = 58, R = 74, T = 16, B = 32;
  const all = series.flatMap(s => s.pts.map(p => p[1])), xs = series.flatMap(s => s.pts.map(p => p[0]));
  const x0 = opt.x0 ?? Math.min(...xs), x1 = opt.x1 ?? Math.max(...xs);
  let mn = opt.ymin ?? Math.min(0, ...all), mx = Math.max(...all) * 1.06;
  const step = A.niceStep((mx - mn) / 5); mx = Math.ceil(mx / step) * step;
  const X = x => L + (x - x0) / (x1 - x0) * (W - L - R), Y = v => T + (mx - v) / (mx - mn) * (H - T - B);
  const fmt = opt.fmt || (v => v.toLocaleString("en-US"));
  let g = "";
  for (let v = Math.ceil(mn / step) * step; v <= mx + 1e-9; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--s-grid)"/><text x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${fmt(v)}</text>`;
  const xstep = opt.xstep || 10;
  for (let x = Math.ceil(x0 / xstep) * xstep; x <= x1; x += xstep) g += `<text x="${X(x).toFixed(1)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${x}</text>`;
  if (opt.ref != null) g += `<line x1="${L}" x2="${W - R}" y1="${Y(opt.ref).toFixed(1)}" y2="${Y(opt.ref).toFixed(1)}" stroke="var(--ink-2)" stroke-dasharray="4 4" opacity=".6"/>`;
  (opt.marks || []).forEach(([x, label]) => { g += `<line x1="${X(x).toFixed(1)}" x2="${X(x).toFixed(1)}" y1="${T}" y2="${H - B}" stroke="var(--line)" stroke-dasharray="2 3"/><text x="${(X(x) + 4).toFixed(1)}" y="${T + 10}" font-size="10" fill="var(--muted)">${label}</text>`; });
  let lines = "", ends = [];
  series.forEach(s => {
    const pl = s.pts.map(p => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(" ");
    const base = Y(Math.max(mn, 0)).toFixed(1);
    if (s.fill) lines += `<polygon points="${X(s.pts[0][0]).toFixed(1)},${base} ${pl} ${X(s.pts[s.pts.length - 1][0]).toFixed(1)},${base}" fill="var(--chart-fill)"/>`;
    lines += `<polyline points="${pl}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" ${s.dash ? `stroke-dasharray="${s.dash}"` : ""}/>`;
    const lp = s.pts[s.pts.length - 1];
    lines += `<circle cx="${X(lp[0]).toFixed(1)}" cy="${Y(lp[1]).toFixed(1)}" r="3.5" fill="${s.color}" stroke="var(--surface)" stroke-width="1.5"/>`;
    ends.push({y: Y(lp[1]), x: X(lp[0]), t: fmt(lp[1]), c: s.color});
  });
  ends.sort((a, b) => a.y - b.y); for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
  ends.forEach(e => { lines += `<text x="${(e.x + 8).toFixed(1)}" y="${(e.y + 4).toFixed(1)}" font-size="11" font-weight="600" fill="${e.c}" font-family="IBM Plex Mono, monospace">${e.t}</text>`; });
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${A.esc(opt.label || "Chart")}">${g}${lines}</svg>`;
};
A.priceChart = (rows, label) => { // rows: [[iso date, close]]
  const W = 760, H = 260, L = 56, R = 14, T = 14, B = 30;
  const vals = rows.map(r => r[1]); let mn = Math.min(...vals), mx = Math.max(...vals); const pad = (mx - mn) * 0.08 || 1; mn -= pad; mx += pad;
  const step = A.niceStep((mx - mn) / 4), X = i => L + i / (rows.length - 1) * (W - L - R), Y = v => T + (mx - v) / (mx - mn) * (H - T - B);
  let g = "";
  for (let v = Math.ceil(mn / step) * step; v <= mx; v += step) g += `<line x1="${L}" x2="${W - R}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--s-grid)"/><text x="${L - 8}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${v >= 100 ? v.toFixed(0) : v.toFixed(2)}</text>`;
  let lastM = "", lastX = -99;
  rows.forEach((r, i) => { const m = r[0].slice(0, 7); if (m !== lastM) { lastM = m; const x = X(i); if (i > 2 && x - lastX > 44) { g += `<text x="${x.toFixed(1)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="var(--muted)">${new Date(r[0] + "T12:00:00").toLocaleDateString("en-US", {month: "short"})}</text>`; lastX = x; } } });
  const line = rows.map((r, i) => `${X(i).toFixed(1)},${Y(r[1]).toFixed(1)}`).join(" ");
  const up = vals[vals.length - 1] >= vals[0], col = up ? "var(--good)" : "var(--bad)";
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${A.esc(label)}">${g}<polygon points="${L},${H - B} ${line} ${W - R},${H - B}" fill="var(--chart-fill)"/><polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="2"/><circle cx="${X(rows.length - 1).toFixed(1)}" cy="${Y(vals[vals.length - 1]).toFixed(1)}" r="4" fill="${col}" stroke="var(--surface)" stroke-width="2"/></svg>`;
};

/* ── API client: live on the deployed site, browser-only fallback in previews ── */
A.live = null; // null = unknown, true = API reachable, false = preview mode
async function call(path, body) {
  const r = await fetch("/api/" + path, body ? {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({...body, device: A.device})} : {});
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) throw new Error("no-api");
  const j = await r.json(); if (!r.ok) { const e = new Error(j.error || "Request failed"); e.user = true; throw e; } A.live = true; return j;
}
A.api = async (path, body) => {
  if (A.live === false) throw new Error("no-api");
  try { return await call(path, body); } catch (e) { if (!e.user) A.live = false; throw e; }
};
/* Votes: key -> choice. Server dedupes one vote per device per key. */
A.tally = async keys => {
  try { return await A.api("tally?keys=" + encodeURIComponent(keys.join(","))); }
  catch (e) { const mine = A.store.get("votes", {}), out = {}; keys.forEach(k => { out[k] = {counts: {}, sh: {}}; if (mine[k]) { out[k].counts[mine[k].c] = 1; if (mine[k].sh) out[k].sh[mine[k].c] = 1; } }); return out; }
};
A.vote = async (key, choice, shareholder) => {
  const mine = A.store.get("votes", {}); mine[key] = {c: choice, sh: !!shareholder}; A.store.set("votes", mine);
  try { return await A.api("vote", {key, choice, shareholder: !!shareholder}); } catch (e) { if (e.user) A.toast(e.message); return null; }
};
A.myVote = key => (A.store.get("votes", {})[key] || {}).c;

/* ── chrome ── */
const PRODUCTS = [["/", "Home"], ["/pharma/", "Pharma"], ["/health/", "Health"], ["/polls/", "Polls"], ["/act/", "Take action"], ["/about/", "About"]];
A.chrome = ({product, tabs, active}) => {
  const top = document.createElement("nav"); top.className = "topnav"; top.setAttribute("aria-label", "Site");
  top.innerHTML = `<div class="nav-row">
    <a class="logo" href="/"><span class="logo-mark">A</span>Agora <small>Society Stands</small></a>
    <div class="prod">${PRODUCTS.slice(1).map(([h, l]) => `<a href="${h}" ${product === l ? 'aria-current="page"' : ""}>${l}</a>`).join("")}</div>
    <div class="nav-tools"><button class="icon-btn" id="themeBtn" aria-label="Switch light or dark theme"><svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg></button></div>
  </div>${tabs ? `<div class="tabs" role="tablist" id="tabs">${tabs.map(([id, lab]) => `<a class="tab" role="tab" href="#${id}" data-p="${id}" aria-selected="${id === active}">${lab}</a>`).join("")}</div>` : ""}`;
  document.body.prepend(top);
  const foot = document.createElement("footer"); foot.className = "site-foot";
  foot.innerHTML = `<div class="in">
    <div><b>Agora Society Stands</b>Dedicated to our children and to future generations: leaving our communities better than we found them. Independent and nonpartisan, serving the common good. Not investment, legal or medical advice. <a href="/about/#why" style="display:inline;color:var(--accent)">Our purpose</a></div>
    <div><b>Trackers</b><a href="/pharma/">Agora Pharma</a><a href="/health/">Agora Health</a><a href="/polls/">Public polls</a><a href="/act/">Take action</a><a href="/stand/">Stand up</a></div>
    <div><b>Trust</b><a href="/about/#methodology">Methodology &amp; sources</a><a href="/about/#corrections">Request a correction</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></div>
  </div>`;
  if (product === "Pharma" || product === "Health") document.body.appendChild(Object.assign(document.createElement("div"), {className: "act-band-wrap", innerHTML: A.actBand()}));
  document.body.appendChild(foot);
  try { const th = localStorage.getItem("agora:theme"); if (th) document.documentElement.dataset.theme = th; } catch (e) {}
  A.$("#themeBtn").addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = next; try { localStorage.setItem("agora:theme", next); } catch (e) {}
  });
};
A.actBand = () => `<aside class="act-band" aria-label="Take action"><div><div class="eyebrow" style="margin:0">It's up to you</div><h2>Don't like what you see? What are you going to do about it?</h2><p>Change happens only if <b>you</b> take part: come back regularly, offer your own ideas, take lawful steps to change your government and society, and spread the word to at least 10 other people.</p></div><a class="btn" href="/act/#you">Make your commitment →</a></aside>`;
A.setTab = id => document.querySelectorAll(".tab").forEach(t => t.setAttribute("aria-selected", t.dataset.p === id));
A.hero = (eyebrow, title, text, chips) => `<header class="hero"><div class="hero-in"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${text}</p>${chips ? `<div class="chips">${chips.map(c => `<span class="chip">${c}</span>`).join("")}</div>` : ""}</div></header>`;

/* ── preview support: when the site is opened from a sub-folder (not the domain root), keep root links working ── */
const me = document.currentScript && document.currentScript.src;
A.root = me ? me.replace(/assets\/core\.js.*$/, "") : "/";
if (new URL(A.root).pathname !== "/") {
  document.addEventListener("click", e => {
    const a = e.target.closest("a[href^='/']"); if (!a) return;
    e.preventDefault();
    let [path, hash] = a.getAttribute("href").slice(1).split("#");
    if (path === "" || path.endsWith("/")) path += "index.html";
    location.href = A.root + path + (hash ? "#" + hash : "");
  });
}

/* ── installable app ── */
let deferred = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; document.querySelectorAll("[data-install]").forEach(b => b.hidden = false); });
A.installCard = () => {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream, standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (standalone) return "";
  return `<div class="install"><span><b>Get the app.</b> ${ios ? "In Safari, tap Share, then <b>Add to Home Screen</b>." : "Install Agora on your phone or computer for one-tap access."}</span>${ios ? "" : `<button class="btn sm" data-install hidden>Install</button>`}</div>`;
};
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-install]"); if (!b || !deferred) return;
  deferred.prompt(); await deferred.userChoice; deferred = null; b.hidden = true;
});
if ("serviceWorker" in navigator && location.protocol === "https:" && !/claude|claudeusercontent/.test(location.hostname)) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {}));
}
})();
