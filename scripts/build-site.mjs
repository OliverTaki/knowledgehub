import fs from "node:fs";
import path from "node:path";
import { readJson, writeJson } from "./lib/jsonl.mjs";

const config = readJson("config/site.config.json", { siteName: "Interest Wiki" });
const wire = readJson("data/processed/wire.json", { entries: [] });
const library = readJson("data/processed/library_seed.json", { items: [] });

fs.mkdirSync("public", { recursive: true });

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function layout(title, body) {
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #f7f7f5; color: #1f1f1f; }
    header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 18px 28px; background: #fff; border-bottom: 1px solid #ddd; position: sticky; top: 0; z-index: 5; }
    .brand { font-weight: 700; }
    nav { justify-self: end; display: flex; gap: 16px; }
    nav a { color: #222; text-decoration: none; }
    main { max-width: 1040px; margin: 0 auto; padding: 28px; }
    .card { background: #fff; border: 1px solid #ddd; border-radius: 14px; padding: 18px; margin-bottom: 14px; }
    .meta { color: #666; font-size: 13px; display: flex; gap: 12px; flex-wrap: wrap; }
    .text { white-space: pre-wrap; line-height: 1.55; }
    .search { width: min(420px, 40vw); padding: 10px 12px; border: 1px solid #ccc; border-radius: 999px; }
    .tag { display: inline-block; padding: 3px 8px; border: 1px solid #ddd; border-radius: 999px; font-size: 12px; margin-right: 6px; color: #555; }
    a { color: #0756a5; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    .stat { font-size: 32px; font-weight: 700; }
  </style>
</head>
<body>
<header>
  <div class="brand">${esc(config.siteName || "Interest Wiki")}</div>
  <input id="siteSearch" class="search" placeholder="Search this page">
  <nav>
    <a href="./index.html">Home</a>
    <a href="./wire.html">Wire</a>
    <a href="./library.html">Library</a>
  </nav>
</header>
<main>${body}</main>
<script>
const input = document.getElementById("siteSearch");
if (input) {
  input.addEventListener("input", () => {
    const q = input.value.toLowerCase();
    document.querySelectorAll("[data-search]").forEach((el) => {
      el.style.display = el.dataset.search.toLowerCase().includes(q) ? "" : "none";
    });
  });
}
</script>
</body>
</html>`;
}

const indexHtml = layout(config.siteName || "Interest Wiki", `
  <h1>${esc(config.siteName || "Interest Wiki")}</h1>
  <p>X Likeを起点にしたWire / Article / Library型の個人関心Wikiです。</p>
  <section class="grid">
    <div class="card"><div class="stat">${wire.entries.length}</div><div>Wire entries</div></div>
    <div class="card"><div class="stat">${library.items.length}</div><div>Library items</div></div>
  </section>
  <section class="card">
    <h2>Policy</h2>
    <p>Wireは一次資料として保持し、ArticleとLibraryは追記ベースで育てます。ランキングは丸写しせず、対象物と順位メタデータだけを記録します。</p>
  </section>
`);

const wireCards = wire.entries.map((item) => {
  const tags = [...(item.content_kinds || []), ...(item.domains || []), ...(item.tags || [])].map((tag) => `<span class="tag">${esc(tag)}</span>`).join("");
  const search = [item.text, item.author_handle, item.url, ...(item.tags || []), ...(item.content_kinds || []), ...(item.domains || [])].join(" ");
  return `<article class="card" data-search="${esc(search)}">
    <div class="meta">
      <span>${esc(item.posted_at || "posted_at unknown")}</span>
      <span>${esc(item.author_handle || "handle unknown")}</span>
      <span>${esc(item.post_kind || "unknown")}</span>
    </div>
    <p class="text">${esc(item.text)}</p>
    <p><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Original X post</a></p>
    <div>${tags}</div>
  </article>`;
}).join("\n");

const wireHtml = layout("Wire", `
  <h1>Wire</h1>
  <p>LikeしたXポストの一次資料リストです。元リンクを保持します。</p>
  ${wireCards || '<div class="card">No wire entries yet.</div>'}
`);

const libraryCards = library.items.map((item) => {
  const search = [item.title, item.kind, ...(item.tags || []), ...(item.aliases || [])].join(" ");
  return `<article class="card" data-search="${esc(search)}">
    <h2>${esc(item.title)}</h2>
    <div class="meta"><span>${esc(item.kind)}</span></div>
    <p>${esc(item.description || "")}</p>
  </article>`;
}).join("\n");

const libraryHtml = layout("Library", `
  <h1>Library</h1>
  <p>本、映画、ソフトウェア、プラグイン、ワークフローなどをフラットに管理します。</p>
  ${libraryCards || '<div class="card">No library items yet.</div>'}
`);

fs.writeFileSync(path.join("public", "index.html"), indexHtml, "utf8");
fs.writeFileSync(path.join("public", "wire.html"), wireHtml, "utf8");
fs.writeFileSync(path.join("public", "library.html"), libraryHtml, "utf8");

writeJson("public/wire.json", wire);
writeJson("public/library.json", library);

console.log("Built static site into public/.");
