import fs from "node:fs";

const WIRE_DATA_RE = /<script id=["']wire-data["'] type=["']application\/json["']>([\s\S]*?)<\/script>/;

function bad(raw, i) {
  const code = raw.charCodeAt(i);
  return code < 32 || code === 8232 || code === 8233;
}

function clean(raw) {
  let out = "";
  for (let i = 0; i < raw.length; i += 1) out += bad(raw, i) ? " " : raw[i];
  return out;
}

function parseJson(raw, source) {
  try {
    return JSON.parse(raw.trim());
  } catch (firstError) {
    try {
      return JSON.parse(clean(raw.trim()));
    } catch (secondError) {
      throw new Error(`${source}: JSON parse failed: ${secondError.message}; original: ${firstError.message}`);
    }
  }
}

function readJson(path, fallback) {
  if (!fs.existsSync(path)) return fallback;
  return parseJson(fs.readFileSync(path, "utf8"), path);
}

function text(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

function list(value, fallback = []) {
  return Array.isArray(value) ? value.filter(Boolean).map(String) : fallback;
}

function normalize(entry, index) {
  const labels = list(entry.labels);
  const tags = list(entry.tags);
  const contentKinds = list(entry.content_kinds, labels.length ? labels : [entry.post_kind || "unknown"]);
  const domains = list(entry.domains);
  const summary = text(entry.public_summary, entry.summary_ja, entry.summary, entry.context_summary, entry.context?.summary, entry.text, "Source note.");
  const url = text(entry.url, entry.original_url);
  return {
    id: text(entry.id, entry.status_id ? `x_${entry.status_id}` : `wire_${index + 1}`),
    title: text(entry.title, summary, "Source note"),
    summary,
    url,
    original_url: text(entry.original_url, url),
    author_handle: text(entry.author_handle, entry.author),
    posted_at: text(entry.posted_at, entry.posted),
    collected_at: text(entry.collected_at, entry.collected),
    source: entry.source || "x_like",
    labels,
    tags,
    content_kinds: contentKinds.length ? contentKinds : ["unknown"],
    domains: domains.length ? domains : ["unknown"]
  };
}

function loadEntries() {
  const processed = readJson("data/processed/wire.json", { entries: [] });
  if (Array.isArray(processed.entries) && processed.entries.length) return ["data/processed/wire.json", processed.entries];

  const publicJson = readJson("public/wire.json", { entries: [] });
  if (Array.isArray(publicJson.entries) && publicJson.entries.length) return ["public/wire.json", publicJson.entries];

  if (fs.existsSync("public/wire.html")) {
    const html = fs.readFileSync("public/wire.html", "utf8");
    const match = html.match(WIRE_DATA_RE);
    if (match) {
      const entries = parseJson(match[1], "public/wire.html#wire-data");
      if (Array.isArray(entries) && entries.length) return ["public/wire.html#wire-data", entries];
    }
  }

  throw new Error("No Wire entries found. Refusing to publish a 0-entry site.");
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function tags(entry) {
  return [...new Set([...list(entry.tags), ...list(entry.content_kinds), ...list(entry.domains), ...list(entry.labels)])];
}

function html(entries, source) {
  const cards = entries.map((entry) => `<article class="card" data-search="${esc([entry.title, entry.summary, entry.author_handle, entry.posted_at, entry.url, ...tags(entry)].join(" "))}" data-tags="${esc(tags(entry).join("|"))}"><div class="meta">${esc(entry.posted_at || "unknown")} · ${esc(entry.author_handle || "Unknown source")}</div><h2>${esc(entry.title)}</h2><p>${esc(entry.summary)}</p><p><a href="${esc(entry.url)}">Source</a></p><p>${tags(entry).map((tag) => `<button class="tag" data-tag="${esc(tag)}">${esc(tag)}</button>`).join(" ")}</p></article>`).join("\n");
  const counts = new Map();
  for (const entry of entries) for (const tag of tags(entry)) counts.set(tag, (counts.get(tag) || 0) + 1);
  const filters = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 80).map(([tag, count]) => `<button class="filter" data-tag="${esc(tag)}">${esc(tag)} ${count}</button>`).join(" ");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wire — Knowledge Hub Magazine</title><style>body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#f7f7f5;color:#1f1f1f}header{display:flex;justify-content:space-between;gap:20px;padding:18px 28px;background:white;border-bottom:1px solid #ddd;position:sticky;top:0}.brand{font-weight:700}nav{display:flex;gap:16px}main{max-width:1120px;margin:0 auto;padding:44px 28px}h1{font-size:clamp(38px,6vw,76px);letter-spacing:-.06em;line-height:.95}.deck{max-width:780px;color:#444;font-size:19px;line-height:1.55}.toolbar,.card,.empty{background:white;border:1px solid #ddd;border-radius:14px;padding:18px;margin:14px 0}.meta,.small{color:#666;font-size:13px}.filter,.tag{border:1px solid #ddd;border-radius:999px;background:white;padding:4px 9px;margin:3px;cursor:pointer}.active{border-color:#111}.search{padding:10px 12px;border:1px solid #ccc;border-radius:999px;width:min(420px,70vw)}a{color:#0756a5;text-decoration:none}</style></head><body><header><div class="brand">Knowledge Hub Magazine</div><nav><a href="/">Home</a><a href="/wire">Wire</a><a href="/articles">Articles</a><a href="/library">Library</a></nav></header><main><section><div class="small">Wire</div><h1>Signals, fragments, and source notes.</h1><p class="deck">Short entries for tools, films, systems, images, and ideas before they become essays or library records.</p></section><section class="toolbar"><div><button class="filter active" data-tag="all">All</button>${filters}</div><p><input id="search" class="search" placeholder="Search Wire"></p><p><span id="visibleCount">${entries.length}</span> / <span id="totalCount">${entries.length}</span> entries shown</p><p class="small">Static source: ${esc(source)} · <a href="/wire.json">JSON</a> · <a href="/wire.md">Markdown</a> · <a href="/wire.ndjson">NDJSON</a> · <a href="/llms.txt">llms.txt</a></p></section><section id="feed">${cards}</section><section id="empty" class="empty" style="display:none">No entries match this filter.</section></main><script>const search=document.getElementById('search'),visible=document.getElementById('visibleCount'),empty=document.getElementById('empty'),cards=Array.from(document.querySelectorAll('.card'));let activeTag='all';function apply(){const q=search.value.trim().toLowerCase();let n=0;for(const card of cards){const tagOk=activeTag==='all'||card.dataset.tags.split('|').includes(activeTag);const searchOk=!q||card.dataset.search.toLowerCase().includes(q);const show=tagOk&&searchOk;card.style.display=show?'':'none';if(show)n++;}visible.textContent=String(n);empty.style.display=n?'none':'block';}document.querySelectorAll('.filter,.tag').forEach(btn=>btn.addEventListener('click',()=>{activeTag=btn.dataset.tag;document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.tag===activeTag));apply();}));search.addEventListener('input',apply);</script></body></html>`;
}

function markdown(entries, source) {
  const lines = ["# Knowledge Hub Wire", "", `Generated: ${new Date().toISOString()}`, `Source: ${source}`, `Count: ${entries.length}`, "", "Machine-readable archive for AI agents and search indexing.", ""];
  for (const entry of entries) lines.push(`## ${entry.title}`, "", `- URL: ${entry.url}`, `- Author: ${entry.author_handle || "Unknown"}`, `- Posted: ${entry.posted_at || "unknown"}`, `- Collected: ${entry.collected_at || "unknown"}`, `- Tags: ${tags(entry).join(", ")}`, "", entry.summary, "");
  return lines.join("\n");
}

const [source, rawEntries] = loadEntries();
const entries = rawEntries.map(normalize);
if (!entries.length) throw new Error("Refusing to build Wire with 0 entries.");
const payload = { generated_at: new Date().toISOString(), source, count: entries.length, entries };
fs.writeFileSync("public/wire.json", JSON.stringify(payload, null, 2), "utf8");
fs.writeFileSync("public/wire.html", html(entries, source), "utf8");
fs.writeFileSync("public/wire.md", markdown(entries, source), "utf8");
fs.writeFileSync("public/wire.ndjson", entries.map((entry) => JSON.stringify(entry)).join("\n") + "\n", "utf8");
fs.writeFileSync("public/llms.txt", "# Knowledge Hub Magazine\n\nMachine-readable resources:\n- /wire.md\n- /wire.json\n- /wire.ndjson\n- /articles\n- /library\n", "utf8");
console.log(`Built static Wire with ${entries.length} entries from ${source}.`);
