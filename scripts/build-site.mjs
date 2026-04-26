import fs from "node:fs";
import path from "node:path";
import { readJson, writeJson } from "./lib/jsonl.mjs";

const config = readJson("config/site.config.json", { siteName: "Interest Wiki" });
const wire = readJson("data/processed/wire.json", { entries: [] });
const library = readJson("data/processed/library_seed.json", { items: [] });
const publicWirePolicy = config.publicWire || {};

fs.mkdirSync("public", { recursive: true });

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() || "";
}

function publicSummary(item) {
  return firstNonEmpty(
    item.public_summary,
    item.summary_ja,
    item.summary,
    item.context_summary,
    item.context?.summary
  ) || "要約未作成。元ポストのリンクを参照。";
}

function publicWireEntry(item) {
  return {
    id: item.id,
    source: item.source || "x_like",
    url: item.url,
    original_url: item.original_url || item.url,
    collected_at: item.collected_at || "",
    posted_at: item.posted_at || "",
    author_handle: item.author_handle || "",
    post_kind: item.post_kind || "unknown",
    content_kinds: item.content_kinds || ["unknown"],
    domains: item.domains || ["unknown"],
    tags: item.tags || [],
    summary: publicSummary(item),
    library_refs: item.library_refs || [],
    article_refs: item.article_refs || [],
    display: {
      original_link_required: true,
      full_text_copied: false,
      embed_allowed: publicWirePolicy.embedXPosts === true
    }
  };
}

const publicWireEntries = (wire.entries || []).map(publicWireEntry);

function layout(title, body, extraScripts = "") {
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
    .summary { white-space: pre-wrap; line-height: 1.55; }
    .search { width: min(420px, 40vw); padding: 10px 12px; border: 1px solid #ccc; border-radius: 999px; }
    .tag { display: inline-block; padding: 3px 8px; border: 1px solid #ddd; border-radius: 999px; font-size: 12px; margin-right: 6px; color: #555; }
    a { color: #0756a5; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
    .stat { font-size: 32px; font-weight: 700; }
    .notice { color: #666; font-size: 13px; }
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
${extraScripts}
</body>
</html>`;
}

const indexHtml = layout(config.siteName || "Interest Wiki", `
  <h1>${esc(config.siteName || "Interest Wiki")}</h1>
  <p>X Likeを起点にしたWire / Article / Library型の個人関心Wikiです。</p>
  <section class="grid">
    <div class="card"><div class="stat">${publicWireEntries.length}</div><div>Wire entries</div></div>
    <div class="card"><div class="stat">${library.items.length}</div><div>Library items</div></div>
  </section>
  <section class="card">
    <h2>Policy</h2>
    <p>公開Wireはポスト本文を転載せず、取得日時、要約、元リンク、必要に応じたX埋め込みだけを表示します。ランキングは丸写しせず、対象物と順位メタデータだけを記録します。</p>
  </section>
`);

const shouldEmbedXPosts = publicWirePolicy.embedXPosts === true;

const wireCards = publicWireEntries.map((item) => {
  const tags = [...(item.content_kinds || []), ...(item.domains || []), ...(item.tags || [])].map((tag) => `<span class="tag">${esc(tag)}</span>`).join("");
  const search = [item.summary, item.author_handle, item.url, ...(item.tags || []), ...(item.content_kinds || []), ...(item.domains || [])].join(" ");
  const embed = shouldEmbedXPosts
    ? `<blockquote class="twitter-tweet"><a href="${esc(item.url)}">Original X post</a></blockquote>`
    : "";

  return `<article class="card" data-search="${esc(search)}">
    <div class="meta">
      <span>collected: ${esc(item.collected_at || "unknown")}</span>
      <span>posted: ${esc(item.posted_at || "unknown")}</span>
      <span>${esc(item.author_handle || "handle unknown")}</span>
      <span>${esc(item.post_kind || "unknown")}</span>
    </div>
    <p class="summary">${esc(item.summary)}</p>
    <p><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Original X post</a></p>
    ${embed}
    <div>${tags}</div>
  </article>`;
}).join("\n");

const embedScript = shouldEmbedXPosts
  ? '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>'
  : "";

const wireHtml = layout("Wire", `
  <h1>Wire</h1>
  <p>LikeしたXポストの公開用リストです。ポスト本文は転載せず、要約と元リンクを保持します。</p>
  <p class="notice">全文・画像URL・収集時の生データはローカルのraw/processedにだけ保持します。</p>
  ${wireCards || '<div class="card">No wire entries yet.</div>'}
`, embedScript);

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

writeJson("public/wire.json", {
  generated_at: new Date().toISOString(),
  policy: {
    full_text_copied: false,
    original_link_required: true,
    embed_x_posts: shouldEmbedXPosts
  },
  entries: publicWireEntries
});
writeJson("public/library.json", library);

console.log("Built static site into public/.");
console.log(`Public Wire entries: ${publicWireEntries.length}`);
console.log(`X embed enabled: ${shouldEmbedXPosts}`);
