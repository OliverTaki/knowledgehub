import fs from "node:fs";
import path from "node:path";
import { readJson, writeJson } from "./lib/jsonl.mjs";

const config = readJson("config/site.config.json", { siteName: "Knowledge Hub Magazine" });
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
  ) || publicWirePolicy.summaryFallback || "Editorial note pending. Follow the source link for the original post.";
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
  const siteName = config.siteName || "Knowledge Hub Magazine";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <style>
    body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f7f7f5;color:#1f1f1f} header{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:18px 28px;background:#fff;border-bottom:1px solid #ddd;position:sticky;top:0;z-index:5}.brand{font-weight:700;letter-spacing:-.02em} nav{justify-self:end;display:flex;gap:16px} nav a{color:#222;text-decoration:none} main{max-width:1040px;margin:0 auto;padding:44px 28px}.eyebrow{color:#666;text-transform:uppercase;letter-spacing:.08em;font-size:12px} h1{font-size:clamp(38px,6vw,76px);letter-spacing:-.06em;line-height:.95;margin:10px 0 16px}.deck{max-width:760px;color:#444;font-size:19px;line-height:1.55}.card,.article{background:#fff;border:1px solid #ddd;border-radius:14px;padding:20px;margin-bottom:14px}.article{padding:26px;margin:22px 0}.article h2{font-size:30px;letter-spacing:-.03em;margin:0 0 12px}.meta{color:#666;font-size:13px;display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px}.summary,.article p{line-height:1.6}.search{width:min(420px,40vw);padding:10px 12px;border:1px solid #ccc;border-radius:999px}.tag{display:inline-block;padding:3px 8px;border:1px solid #ddd;border-radius:999px;font-size:12px;margin-right:6px;color:#555}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:24px}.stat{font-size:32px;font-weight:700}a{color:#0756a5;text-decoration:none}
  </style>
</head>
<body>
<header>
  <div class="brand">${esc(siteName)}</div>
  <input id="siteSearch" class="search" placeholder="Search this page">
  <nav>
    <a href="/">Home</a>
    <a href="/wire">Wire</a>
    <a href="/articles">Articles</a>
    <a href="/library">Library</a>
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

const siteName = config.siteName || "Knowledge Hub Magazine";
const siteDeck = config.siteDeck || "A living index of creative technology, moving images, production systems, AI tools, books, films, and ideas worth returning to.";

const indexHtml = layout(siteName, `
  <section>
    <div class="eyebrow">Knowledge base / magazine</div>
    <h1>Notes that want to become a map.</h1>
    <p class="deck">${esc(siteDeck)}</p>
  </section>
  <section class="grid">
    <article class="card"><div class="meta">Wire</div><h2>Signals and source notes</h2><p>Short entries that catch tools, references, workflows, and arguments before they are developed into longer pieces.</p><p><a href="/wire">Read Wire</a></p></article>
    <article class="card"><div class="meta">Articles</div><h2>Developed observations</h2><p>Essays that connect repeated signals into practical theses about creative work, software, and media culture.</p><p><a href="/articles">Read Articles</a></p></article>
    <article class="card"><div class="meta">Library</div><h2>Reusable references</h2><p>A flat index of books, films, software, plugins, workflows, papers, and examples to revisit.</p><p><a href="/library">Browse Library</a></p></article>
  </section>
`);

const shouldEmbedXPosts = publicWirePolicy.embedXPosts === true;
const wireCards = publicWireEntries.map((item) => {
  const tags = [...(item.content_kinds || []), ...(item.domains || []), ...(item.tags || [])].map((tag) => `<span class="tag">${esc(tag)}</span>`).join("");
  const search = [item.summary, item.author_handle, item.url, ...(item.tags || []), ...(item.content_kinds || []), ...(item.domains || [])].join(" ");
  const embed = shouldEmbedXPosts ? `<blockquote class="twitter-tweet"><a href="${esc(item.url)}">Original X post</a></blockquote>` : "";
  return `<article class="card" data-search="${esc(search)}"><div class="meta"><span>Collected ${esc(item.collected_at || "unknown")}</span><span>Published ${esc(item.posted_at || "unknown")}</span><span>${esc(item.author_handle || "Unknown source")}</span><span>${esc(item.post_kind || "unknown")}</span></div><p class="summary">${esc(item.summary)}</p><p><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Source</a></p>${embed}<div>${tags}</div></article>`;
}).join("\n");
const embedScript = shouldEmbedXPosts ? '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>' : "";
const wireHtml = layout("Wire — Knowledge Hub Magazine", `
  <section>
    <div class="eyebrow">Wire</div>
    <h1>Signals, fragments, and source notes.</h1>
    <p class="deck">Short entries for tools, films, systems, images, and ideas before they become essays or library records.</p>
  </section>
  ${wireCards || '<div class="card">No wire entries yet.</div>'}
`, embedScript);

const articlesHtml = layout("Articles — Knowledge Hub Magazine", `
  <section><div class="eyebrow">Articles</div><h1>Patterns, not clippings.</h1><p class="deck">Longer notes drawn from repeated signals: tools, references, workflows, and cultural fragments that begin to form a usable map.</p></section>
  <article class="article"><div class="meta"><span>Creative systems</span><span>AI tools</span><span>Production workflow</span></div><h2>The useful AI tool is the one that disappears into the workflow</h2><p>The most interesting AI posts are no longer the ones that announce a spectacular model. They are the ones that make a step in the production chain cheaper, faster, or more local.</p><p>For a creative worker, this changes the evaluation criteria. The question is not only whether a model is impressive. The question is whether it can be placed inside an existing loop: ingest, search, annotate, edit, archive, compare, and publish.</p><div><span class="tag">local-ai</span><span class="tag">workflow</span><span class="tag">production</span></div></article>
  <article class="article"><div class="meta"><span>Moving image</span><span>AI video</span><span>Visual culture</span></div><h2>AI video is becoming a reference library before it becomes a cinema</h2><p>The more immediate use of AI video is not finished film. It is reference: motion mood, impossible camera language, texture tests, lighting proposals, transitions, and image behaviors that can be studied and translated into other tools.</p><p>A short AI clip can be weak as a complete work but strong as a visual note. It can reveal a style of movement, a treatment of surface, or a rhythm that becomes useful elsewhere.</p><div><span class="tag">ai-video</span><span class="tag">lookdev</span><span class="tag">reference</span></div></article>
  <article class="article"><div class="meta"><span>Knowledge systems</span><span>Node tools</span><span>Memory</span></div><h2>Node-based work needs a memory layer outside the node graph</h2><p>Node graphs are powerful because they expose structure. They are also fragile because structure without memory becomes archaeology.</p><p>A serious creative pipeline needs the graph, the note, the source, and the reusable library entry. Without them, the same discoveries are repeatedly made and lost.</p><div><span class="tag">houdini</span><span class="tag">knowledge-map</span><span class="tag">pipeline</span></div></article>
`);

const libraryCards = library.items.map((item) => {
  const search = [item.title, item.kind, ...(item.tags || []), ...(item.aliases || [])].join(" ");
  return `<article class="card" data-search="${esc(search)}"><h2>${esc(item.title)}</h2><div class="meta"><span>${esc(item.kind)}</span></div><p>${esc(item.description || "")}</p></article>`;
}).join("\n");
const libraryHtml = layout("Library — Knowledge Hub Magazine", `
  <section><div class="eyebrow">Library</div><h1>An index of reusable knowledge.</h1><p class="deck">Books, films, software, workflows, plugins, essays, and references organized as material for future thinking.</p></section>
  ${libraryCards || '<div class="card">No library items yet.</div>'}
`);

fs.writeFileSync(path.join("public", "index.html"), indexHtml, "utf8");
fs.writeFileSync(path.join("public", "wire.html"), wireHtml, "utf8");
fs.writeFileSync(path.join("public", "articles.html"), articlesHtml, "utf8");
fs.writeFileSync(path.join("public", "library.html"), libraryHtml, "utf8");
writeJson("public/wire.json", { generated_at: new Date().toISOString(), policy: { full_text_copied: false, original_link_required: true, embed_x_posts: shouldEmbedXPosts }, entries: publicWireEntries });
writeJson("public/library.json", library);
console.log("Built static site into public/.");
console.log(`Public Wire entries: ${publicWireEntries.length}`);
console.log(`X embed enabled: ${shouldEmbedXPosts}`);
