/* Local dev server: serves public/ and runs api/*.js handlers, like Vercel does.
   Usage: npm run dev   (then open http://localhost:3000) */
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const PUB = join(ROOT, "public"), PORT = +process.env.PORT || 3000;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json", ".txt": "text/plain", ".xml": "application/xml" };

async function api(req, res, path) {
  let file = join(ROOT, "api", path.replace(/^\/api\//, "").replace(/\/$/, "") + ".js");
  if (file.includes("_lib") || !file.startsWith(join(ROOT, "api"))) return false;
  try { await stat(file); } catch { try { file = join(ROOT, "api", "[...path].js"); await stat(file); } catch { return false; } }
  const mod = await import(pathToFileURL(file).href + "?t=" + Date.now());
  const h = mod[req.method]; if (!h) { res.writeHead(405, { "content-type": "application/json" }); res.end('{"error":"Method not allowed"}'); return true; }
  const chunks = []; for await (const c of req) chunks.push(c);
  const request = new Request("http://localhost" + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : Buffer.concat(chunks) });
  const r = await h(request);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
  return true;
}
http.createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (path.startsWith("/api/") && await api(req, res, path)) return;
    let f = join(PUB, path); if (!f.startsWith(PUB)) throw 0;
    try { if ((await stat(f)).isDirectory()) f = join(f, "index.html"); } catch {}
    const data = await readFile(f).catch(() => null);
    if (!data) { res.writeHead(404, { "content-type": TYPES[".html"] }); return res.end(await readFile(join(PUB, "404.html"))); }
    res.writeHead(200, { "content-type": TYPES[extname(f)] || "application/octet-stream" }); res.end(data);
  } catch (e) { console.error(e); res.writeHead(500); res.end("Server error"); }
}).listen(PORT, () => console.log(`Agora dev server: http://localhost:${PORT}`));
