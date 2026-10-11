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

/* ── Handler ────────────────────────────────────────────────────── */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get("src");
  const path = searchParams.get("path") || "";

  try {
    if (src === "senate") return await senate(searchParams);

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
