// Rebuilds the "Released" table in README.md.
//
// Sources, in order:
//   1. Every published project on the website (SITE/projects.json): add or edit projects in the site's admin panel.
//   2. extra-projects.json in this repo: anything that isn't on the website.
//
// Icons are copied into assets/projects/<slug>.png so the README never depends on the website being up.
// If a project has no icon, an icon already in that folder is kept; otherwise the YM logo is used.
//
// Run: node scripts/update-projects.mjs   (Node 20+, no dependencies)

import { readFile, writeFile, readdir, unlink, access } from "node:fs/promises";

const SITE = (process.env.SITE_URL || "https://ymdevsolutions.onrender.com").replace(/\/$/, "");
const README = "README.md";
const ICON_DIR = "assets/projects";
const DEFAULT_ICON = "assets/default-icon.png";
const START = "<!-- projects:start -->";
const END = "<!-- projects:end -->";

const exists = (p) => access(p).then(() => true, () => false);
const esc = (s = "") => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function fetchWithRetry(url, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "ymdevsolution-profile-readme" }, signal: AbortSignal.timeout(60_000) });
      if (res.ok) return res;
      throw new Error(`${url} answered ${res.status}`);
    } catch (e) {
      if (i >= tries) throw e;
      console.warn(`Retrying (${i}/${tries - 1}): ${e.message}`);
      await new Promise((r) => setTimeout(r, 10_000 * i));
    }
  }
}

async function saveIcon(slug, url) {
  const path = `${ICON_DIR}/${slug}.png`;
  if (url) {
    try {
      const res = await fetchWithRetry(url, 2);
      const type = res.headers.get("content-type") || "";
      if (!type.startsWith("image/")) throw new Error(`not an image (${type})`);
      await writeFile(path, Buffer.from(await res.arrayBuffer()));
      return path;
    } catch (e) {
      console.warn(`Icon for ${slug} not downloaded: ${e.message}`);
    }
  }
  return (await exists(path)) ? path : DEFAULT_ICON;
}

/** The main button: the Chrome Web Store link if there is one, otherwise the first link. */
function mainLink(links = []) {
  const store = links.find((l) => l.icon === "chrome" || /chromewebstore\.google\.com|chrome\.google\.com\/webstore/.test(l.url));
  if (store) return { label: "Install", url: store.url };
  const first = links[0];
  return first ? { label: first.label || "Open", url: first.url } : null;
}

const site = await (await fetchWithRetry(`${SITE}/projects.json`)).json();
const extras = (await exists("extra-projects.json")) ? JSON.parse(await readFile("extra-projects.json", "utf8")) : [];

const rows = [];
const kept = new Set();
for (const p of site.projects) {
  const icon = await saveIcon(p.slug, p.icon);
  kept.add(icon);
  rows.push({ title: p.title, summary: p.summary, page: p.page, icon, link: mainLink(p.links) });
}
for (const p of extras) {
  if (!p.title) continue;
  const icon = p.icon && !/^https?:/.test(p.icon) ? p.icon : await saveIcon(p.slug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), p.icon);
  kept.add(icon);
  rows.push({ title: p.title, summary: p.summary || "", page: p.page || p.url || "", icon, link: p.url ? { label: p.button || "Open", url: p.url } : null });
}

// Drop icons of projects that were removed from the site.
for (const f of await readdir(ICON_DIR)) if (!kept.has(`${ICON_DIR}/${f}`)) await unlink(`${ICON_DIR}/${f}`);

const cell = (r) => {
  const name = r.page ? `<a href="${esc(r.page)}">${esc(r.title)}</a>` : esc(r.title);
  const btn = r.link ? `<a href="${esc(r.link.url)}">${esc(r.link.label)}</a>` : "";
  return [
    "  <tr>",
    `    <td width="72" align="center"><img src="${esc(r.icon)}" width="48" alt=""></td>`,
    `    <td><b>${name}</b><br>${esc(r.summary)}</td>`,
    `    <td align="center">${btn}</td>`,
    "  </tr>",
  ].join("\n");
};

const table = rows.length ? `<table>\n${rows.map(cell).join("\n")}\n</table>` : "_First releases coming soon._";

let readme = await readFile(README, "utf8");
const a = readme.indexOf(START);
const b = readme.indexOf(END);
if (a < 0 || b < a) throw new Error(`README.md needs ${START} and ${END} markers`);
readme = readme.slice(0, a + START.length) + "\n" + table + "\n" + readme.slice(b);
readme = readme.replace(/Projects-\d+_released/, `Projects-${rows.length}_released`);
await writeFile(README, readme);
console.log(`README updated with ${rows.length} project(s).`);
