/* Point every canonical link, share link, sitemap and email address at your real domain.
   Usage: node scripts/set-domain.mjs agorasociety.org */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const next = (process.argv[2] || "").toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(next)) { console.error("Usage: node scripts/set-domain.mjs yourdomain.org"); process.exit(1); }
const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const OLD = /agorasocietystands\.com/gi;
let changed = 0;
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (!["node_modules", ".git", ".vercel"].includes(e.name)) await walk(p); continue; }
    if (!/\.(html|js|xml|txt|webmanifest|example)$/.test(e.name)) continue;
    const s = await readFile(p, "utf8"); if (!OLD.test(s)) continue;
    await writeFile(p, s.replace(OLD, next)); changed++; console.log("updated", p.slice(ROOT.length + 1));
  }
}
await walk(join(ROOT, "public")); await walk(join(ROOT, "api"));
console.log(`Done: ${changed} files now use ${next}. Remember to create the email addresses (ideas@, corrections@) on that domain.`);
