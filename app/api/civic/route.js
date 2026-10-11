/**
 * Server-side proxy for the civic data APIs.
 *
 * Why a proxy: several of these APIs don't allow direct browser calls (CORS),
 * and Senate roll-call votes are only published as XML. Running the requests
 * here also keeps API keys off the client.
 *
 *   /api/civic?src=congress&path=/house-vote/119/2&limit=20
 *   /api/civic?src=senate&kind=menu&congress=119&session=2
 *   /api/civic?src=senate&kind=vote&congress=119&session=2&number=123
 *   /api/civic?src=openstates&path=/bills&jurisdiction=California&include=votes
 *   /api/civic?src=legistar&client=chicago&path=/events&$top=10
 */

export const dynamic = "force-dynamic";

const KEYS = {
  congress:
    process.env.CONGRESS_GOV_API_KEY ||
    process.env.NEXT_PUBLIC_CONGRESS_GOV_API_KEY ||
    "",
  openstates:
    process.env.OPENSTATES_API_KEY ||
    process.env.NEXT_PUBLIC_OPENSTATES_API_KEY ||
    "",
};
const isReal = (k) => k && !/^(your_|REPLACE)/.test(k);

const SAFE_PATH = /^\/[A-Za-z0-9/_\-.]*$/;
const SAFE_CLIENT = /^[A-Za-z0-9-]{2,60}$/;

function json(body, status = 200, cacheSeconds = 300) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control":
        status === 200
          ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=600`
          : "no-store",
    },
  });
}

function passthroughParams(searchParams, drop) {
  const out = new URLSearchParams();
  for (const [k, v] of searchParams) if (!drop.includes(k)) out.append(k, v);
  return out;
}

async function upstream(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      "user-agent": "AgoraCivicPlatform/2.1 (+https://vercel.app)",
      accept: "application/json, text/xml;q=0.9, */*;q=0.8",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  return res;
}

/* ── Senate XML helpers ─────────────────────────────────────────── */
const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : null;
};
const blocks = (xml, name) =>
  [...xml.matchAll(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "g"))].map(
    (m) => m[1]
  );
const yearFor = (congress, session) =>
  1789 + 2 * (Number(congress) - 1) + (Number(session) - 1);

async function senate(searchParams) {
  const congress = searchParams.get("congress") || "119";
  const session = searchParams.get("session") || "1";
  const kind = searchParams.get("kind") || "menu";
  if (!/^\d{2,3}$/.test(congress) || !/^[12]$/.test(session))
    return json({ error: "Invalid congress or session" }, 400);

  const base = "https://www.senate.gov/legislative/LIS";
  if (kind === "menu") {
    const res = await upstream(
      `${base}/roll_call_lists/vote_menu_${congress}_${session}.xml`
    );
    if (!res.ok) return json({ error: `Senate.gov ${res.status}` }, 502);
    const xml = await res.text();
    const year = yearFor(congress, session);
    const votes = blocks(xml, "vote").map((v) => ({
      number: Number(tag(v, "vote_number")),
      date: `${tag(v, "vote_date")}-${year}`,
      issue: tag(v, "issue"),
      question: tag(v, "question"),
      result: tag(v, "result"),
      title: tag(v, "title"),
      yeas: Number(tag(v, "yeas")) || 0,
      nays: Number(tag(v, "nays")) || 0,
    }));
    votes.sort((a, b) => b.number - a.number);
    return json({ congress, session, votes });
  }

  if (kind === "vote") {
    const number = searchParams.get("number");
    if (!/^\d{1,5}$/.test(number || ""))
      return json({ error: "Invalid vote number" }, 400);
    const padded = number.padStart(5, "0");
    const res = await upstream(
      `${base}/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${padded}.xml`
    );
    if (!res.ok) return json({ error: `Senate.gov ${res.status}` }, 502);
    const xml = await res.text();
    const members = blocks(xml, "member").map((m) => ({
      name: `${tag(m, "first_name")} ${tag(m, "last_name")}`,
      lastName: tag(m, "last_name"),
      party: tag(m, "party"),
      state: tag(m, "state"),
      vote: tag(m, "vote_cast"),
    }));
    return json(
      {
        number: Number(number),
        date: tag(xml, "vote_date"),
        question: tag(xml, "vote_question_text") || tag(xml, "question"),
        result: tag(xml, "vote_result_text") || tag(xml, "vote_result"),
        document: tag(xml, "document_name"),
        title: tag(xml, "vote_title") || tag(xml, "document_title"),
        members,
      },
      200,
      3600
    );
  }
  return json({ error: "Unknown Senate request" }, 400);
}

/* ── DOJ press releases (no key; no server-side search, so we filter) ── */
const stripHtml = (s = "") =>
  decode(String(s).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")).replace(/\s+/g, " ");

// Words that indicate the defendant held public office or a government job.
const OFFICIAL_TERMS = [
  "public corruption", "public official", "elected official", "government official",
  "former mayor", "mayor", "city council", "councilman", "councilwoman", "council member",
  "county commissioner", "commissioner", "state senator", "state representative",
  "assemblyman", "assemblywoman", "legislator", "congressman", "congresswoman",
  "member of congress", "sheriff", "police chief", "judge", "alderman", "township",
  "school board", "superintendent", "city manager", "county executive", "governor",
  "federal employee", "state employee", "bribery", "bribe", "kickback", "honest services",
  "extortion under color", "embezzle",
];

async function doj(searchParams) {
  const q = (searchParams.get("q") || "").trim().toLowerCase().slice(0, 80);
  const officialsOnly = searchParams.get("officials") !== "0";
  const pages = Math.min(Number(searchParams.get("pages")) || 4, 6);
  const headers = {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    accept: "application/json, text/javascript, */*; q=0.01",
    "x-requested-with": "XMLHttpRequest",
    referer: "https://www.justice.gov/",
  };
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      fetch(
        `https://www.justice.gov/api/v1/press_releases.json?pagesize=50&sort=date&direction=DESC&page=${i}`,
        { headers, cache: "no-store" }
      )
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .catch(() => ({ results: [] }))
    )
  );
  const seen = new Set();
  const items = [];
  for (const page of results) {
    for (const r of page.results || []) {
      if (!r || seen.has(r.url)) continue;
      seen.add(r.url);
      const title = stripHtml(r.title);
      const teaser = stripHtml(r.teaser || "").slice(0, 400);
      const body = stripHtml(r.body || "").slice(0, 4000);
      const hay = `${title} ${teaser} ${body}`.toLowerCase();
      if (officialsOnly && !OFFICIAL_TERMS.some((t) => hay.includes(t))) continue;
      if (q && !hay.includes(q)) continue;
      const stage = /sentenced/i.test(title) ? "Sentenced"
        : /convicted|found guilty|jury verdict/i.test(title) ? "Convicted"
        : /pleads? guilty|plea/i.test(title) ? "Pleaded guilty"
        : /indicted|indictment/i.test(title) ? "Indicted"
        : /charged|charges|complaint|arrested/i.test(title) ? "Charged"
        : "Update";
      items.push({
        title,
        summary: teaser || body.slice(0, 300),
        date: r.date ? new Date(Number(r.date) * 1000).toISOString().slice(0, 10) : null,
        url: r.url && r.url.startsWith("http") ? r.url : `https://www.justice.gov${r.url || ""}`,
        office: (Array.isArray(r.component) ? r.component : [r.component])
          .map((c) => c?.name).filter(Boolean).join(", "),
        topics: (Array.isArray(r.topic) ? r.topic : [r.topic]).map((t) => t?.name).filter(Boolean),
        stage,
      });
    }
  }
  if (!results.some((p) => (p.results || []).length))
    return json({ error: "Justice Department API did not respond" }, 502);
  return json({ items, scanned: seen.size }, 200, 1800);
}

/* ── Google Fact Check Tools ────────────────────────────────────── */
async function factcheck(searchParams) {
  const key =
    process.env.GOOGLE_FACTCHECK_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_FACTCHECK_API_KEY || "";
  if (!isReal(key)) return json({ error: "Google Fact Check API key not configured" }, 400);
  const qs = new URLSearchParams({
    query: (searchParams.get("q") || "Congress").slice(0, 120),
    languageCode: "en-US",
    pageSize: "25",
    key,
  });
  const age = searchParams.get("maxAgeDays");
  if (/^\d{1,4}$/.test(age || "")) qs.set("maxAgeDays", age);
  const res = await upstream(`https://factchecktools.googleapis.com/v1alpha1/claims:search?${qs}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return json({ error: `Fact Check API ${res.status}: ${body?.error?.message || ""}`.trim() }, 502);
  return json({ claims: body.claims || [] }, 200, 1800);
}

/* ── Report feeds (RSS) ─────────────────────────────────────────── */
const FEEDS = {
  cbo: "https://www.cbo.gov/publications/all/rss.xml",
  gao: "https://www.gao.gov/rss/reports.xml",
};
async function rss(searchParams) {
  const feed = searchParams.get("feed");
  if (!FEEDS[feed]) return json({ error: "Unknown feed" }, 400);
  const res = await upstream(FEEDS[feed], { headers: { accept: "application/rss+xml, application/xml, text/xml" } });
  if (!res.ok) return json({ error: `${feed.toUpperCase()} feed ${res.status}` }, 502);
  const xml = await res.text();
  const items = blocks(xml, "item").slice(0, 30).map((it) => ({
    title: stripHtml(tag(it, "title") || ""),
    url: (tag(it, "link") || "").trim(),
    date: tag(it, "pubDate") ? new Date(tag(it, "pubDate")).toISOString().slice(0, 10) : null,
    summary: stripHtml(tag(it, "description") || "").slice(0, 400),
  }));
  return json({ items }, 200, 3600);
}

/* ── Handler ────────────────────────────────────────────────────── */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get("src");
  const path = searchParams.get("path") || "";

  try {
    if (src === "senate") return await senate(searchParams);
    if (src === "doj") return await doj(searchParams);
    if (src === "factcheck") return await factcheck(searchParams);
    if (src === "rss") return await rss(searchParams);

    if (path && (!SAFE_PATH.test(path) || path.includes("..")))
      return json({ error: "Invalid path" }, 400);

    if (src === "congress") {
      // Congress.gov keys come from api.data.gov; DEMO_KEY works at very low volume.
      const key = isReal(KEYS.congress) ? KEYS.congress : "DEMO_KEY";
      const qs = passthroughParams(searchParams, ["src", "path"]);
      qs.set("api_key", key);
      qs.set("format", "json");
      const res = await upstream(`https://api.congress.gov/v3${path}?${qs}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok)
        return json(
          {
            error:
              res.status === 429
                ? "Congress.gov rate limit reached — add your own free api.data.gov key"
                : `Congress.gov ${res.status}`,
          },
          res.status === 429 ? 429 : 502
        );
      return json({ ...body, _demoKey: key === "DEMO_KEY" });
    }

    if (src === "openstates") {
      if (!isReal(KEYS.openstates))
        return json({ error: "OpenStates API key not configured" }, 400);
      const qs = passthroughParams(searchParams, ["src", "path"]);
      const res = await upstream(`https://v3.openstates.org${path}?${qs}`, {
        headers: { "X-API-KEY": KEYS.openstates },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok)
        return json(
          { error: body?.detail ? `OpenStates: ${JSON.stringify(body.detail).slice(0, 160)}` : `OpenStates ${res.status}` },
          res.status === 429 ? 429 : 502
        );
      return json(body);
    }

    if (src === "legistar") {
      const client = searchParams.get("client") || "";
      if (!SAFE_CLIENT.test(client))
        return json({ error: "Enter a valid Legistar name (e.g. chicago)" }, 400);
      const qs = passthroughParams(searchParams, ["src", "path", "client"]);
      const res = await upstream(
        `https://webapi.legistar.com/v1/${client}${path}?${qs}`
      );
      const body = await res.json().catch(() => null);
      if (!res.ok || body == null)
        return json(
          {
            error:
              res.status === 404 || res.status === 400
                ? `"${client}" isn't a public Legistar jurisdiction`
                : res.status === 403
                ? `${client} requires a private Legistar token`
                : `Legistar ${res.status}`,
          },
          502
        );
      return json(body);
    }

    return json({ error: "Unknown data source" }, 400);
  } catch (e) {
    return json({ error: `Network error: ${e.message}` }, 502);
  }
}
