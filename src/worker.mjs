const WIRE_DATA_RE = /<script id=["']wire-data["'] type=["']application\/json["']>([\s\S]*?)<\/script>/;
const LEGACY_WIRE_SOURCES = [
  "/wire.html",
  "https://raw.githubusercontent.com/OliverTaki/knowledgehub/main/public/wire.html"
];

function hasEntries(data) {
  const entries = Array.isArray(data) ? data : data?.entries;
  return Array.isArray(entries) && entries.length > 0;
}

function normalizeList(value, fallback = []) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
    : fallback;
}

function firstText(...values) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() || "";
}

function normalizeWireEntry(item, index) {
  const url = firstText(item.url, item.original_url);
  const labels = normalizeList(item.labels);
  const contentKinds = normalizeList(item.content_kinds, labels.length ? labels : [item.post_kind || "unknown"]);
  const domains = normalizeList(item.domains, []);
  const tags = normalizeList(item.tags, []);
  const summary = firstText(
    item.public_summary,
    item.summary_ja,
    item.summary,
    item.context_summary,
    item.context?.summary,
    item.text,
    "Editorial note pending. Follow the source link for the original post."
  );

  return {
    id: firstText(item.id, item.status_id ? `x_${item.status_id}` : `wire_${index + 1}`),
    source: item.source || "x_like",
    url,
    original_url: firstText(item.original_url, url),
    collected_at: firstText(item.collected_at, item.collected),
    posted_at: firstText(item.posted_at, item.posted),
    author_handle: firstText(item.author_handle, item.author),
    post_kind: item.post_kind || "unknown",
    content_kinds: contentKinds.length ? contentKinds : ["unknown"],
    domains: domains.length ? domains : ["unknown"],
    labels,
    title: firstText(item.title, summary, "Source note"),
    tags,
    summary,
    library_refs: Array.isArray(item.library_refs) ? item.library_refs : [],
    article_refs: Array.isArray(item.article_refs) ? item.article_refs : [],
    display: {
      original_link_required: true,
      full_text_copied: false,
      embed_allowed: false
    }
  };
}

function publicWirePayload(entries, source) {
  return {
    generated_at: new Date().toISOString(),
    source,
    count: entries.length,
    policy: {
      full_text_copied: false,
      original_link_required: true,
      embed_x_posts: false
    },
    entries: entries.map(normalizeWireEntry)
  };
}

function isInvalidJsonStringCharacter(raw, index) {
  const code = raw.charCodeAt(index);
  return code < 32 || code === 8232 || code === 8233;
}

function hasInvalidJsonStringCharacters(raw) {
  for (let index = 0; index < raw.length; index += 1) {
    if (isInvalidJsonStringCharacter(raw, index)) return true;
  }
  return false;
}

function sanitizeLegacyJson(raw) {
  let cleaned = "";
  for (let index = 0; index < raw.length; index += 1) {
    cleaned += isInvalidJsonStringCharacter(raw, index) ? " " : raw[index];
  }
  return cleaned;
}

function parseLegacyWireJson(raw, source) {
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed);
  } catch (firstError) {
    try {
      return JSON.parse(sanitizeLegacyJson(trimmed));
    } catch (secondError) {
      throw new Error(`${source}: JSON parse failed after sanitizing invalid JSON string characters: ${secondError.message}; original error: ${firstError.message}`);
    }
  }
}

async function responseJson(response) {
  if (!response.ok) return null;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function loadWireJsonAsset(request, env) {
  const assetUrl = new URL("/wire.json", request.url);
  const response = await env.ASSETS.fetch(new Request(assetUrl.toString(), { method: "GET" }));
  const data = await responseJson(response);
  return hasEntries(data) ? data : null;
}

async function fetchText(source, request, env) {
  const url = new URL(source, request.url);
  const sameOrigin = url.origin === new URL(request.url).origin;
  const response = sameOrigin
    ? await env.ASSETS.fetch(new Request(url.toString(), { method: "GET" }))
    : await fetch(url.toString(), {
        method: "GET",
        headers: {
          "accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
          "user-agent": "knowledgehub-wire-loader"
        }
      });

  if (!response.ok) {
    throw new Error(`${url.href}: ${response.status}`);
  }
  return await response.text();
}

function extractWireData(html, source) {
  const match = html.match(WIRE_DATA_RE);
  if (!match) throw new Error(`${source}: wire-data block not found`);
  const parsed = parseLegacyWireJson(match[1], source);
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error(`${source}: parsed 0 entries`);
  return parsed;
}

async function loadWireFromLegacyHtml(request, env) {
  const errors = [];

  for (const source of LEGACY_WIRE_SOURCES) {
    try {
      const html = await fetchText(source, request, env);
      return publicWirePayload(extractWireData(html, source), source);
    } catch (error) {
      errors.push(error.message);
    }
  }

  throw new Error(errors.join(" / "));
}

async function loadWirePayload(request, env) {
  const assetData = await loadWireJsonAsset(request, env);
  if (assetData) return assetData;
  return loadWireFromLegacyHtml(request, env);
}

async function inspectWireSource(source, request, env) {
  try {
    const html = await fetchText(source, request, env);
    const match = html.match(WIRE_DATA_RE);
    let count = 0;
    let parse_error = null;
    let has_invalid_json_string_characters = false;

    if (match) {
      has_invalid_json_string_characters = hasInvalidJsonStringCharacters(match[1]);
      try {
        const parsed = parseLegacyWireJson(match[1], source);
        count = Array.isArray(parsed) ? parsed.length : 0;
      } catch (error) {
        parse_error = error.message;
      }
    }

    return {
      source,
      ok: true,
      bytes: html.length,
      has_wire_data: Boolean(match),
      has_invalid_json_string_characters,
      count,
      parse_error,
      sample: html.slice(0, 120)
    };
  } catch (error) {
    return { source, ok: false, error: error.message };
  }
}

function jsonResponse(data, init = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {})
    }
  });
}

function htmlEscape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function wireTagSet(entry) {
  return [...new Set([
    ...normalizeList(entry.tags),
    ...normalizeList(entry.content_kinds),
    ...normalizeList(entry.domains),
    ...normalizeList(entry.labels)
  ])];
}

function wireCard(entry) {
  const labels = (entry.labels.length ? entry.labels : entry.content_kinds).map((label) => `<span class="label">${htmlEscape(label)}</span>`).join("");
  const tags = wireTagSet(entry).map((tag) => `<button class="tag" data-tag="${htmlEscape(tag)}">${htmlEscape(tag)}</button>`).join("");
  const search = [entry.title, entry.summary, entry.author_handle, entry.posted_at, entry.url, ...wireTagSet(entry)].join(" ");

  return `<article class="card" data-search="${htmlEscape(search)}" data-tags="${htmlEscape(wireTagSet(entry).join("|"))}"><div class="meta">${labels}<span>Posted ${htmlEscape(entry.posted_at || "unknown")}</span><span>${htmlEscape(entry.author_handle || "Unknown source")}</span></div><h2>${htmlEscape(entry.title || "Source note")}</h2><p class="summary">${htmlEscape(entry.summary)}</p><p><a href="${htmlEscape(entry.url)}" target="_blank" rel="noopener noreferrer">Source</a></p><div class="tag-row">${tags}</div></article>`;
}

function wireHtml(payload) {
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const tagCounts = new Map();
  for (const entry of entries) {
    for (const tag of wireTagSet(entry)) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }
  const filters = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 64)
    .map(([tag, count]) => `<button class="filter" data-tag="${htmlEscape(tag)}">${htmlEscape(tag)} <span class="small">${count}</span></button>`)
    .join("");
  const cards = entries.map(wireCard).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Wire — Knowledge Hub Magazine</title>
  <style>
    :root{--bg:#f7f7f5;--paper:#fff;--ink:#1f1f1f;--muted:#666;--line:#ddd}body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:var(--bg);color:var(--ink)}header{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:18px 28px;background:var(--paper);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:5}.brand{font-weight:700;letter-spacing:-.02em}nav{justify-self:end;display:flex;gap:16px}nav a{color:#222;text-decoration:none}main{max-width:1120px;margin:0 auto;padding:44px 28px}.eyebrow{color:var(--muted);text-transform:uppercase;letter-spacing:.08em;font-size:12px}h1{font-size:clamp(38px,6vw,76px);letter-spacing:-.06em;line-height:.95;margin:10px 0 16px}.deck{max-width:780px;color:#444;font-size:19px;line-height:1.55}.toolbar{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:16px;margin:26px 0 22px}.toolbar-top{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap}.toolbar-title{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin-bottom:10px}.filter-row{display:flex;flex-wrap:wrap;gap:8px}.filter,.tag{display:inline-block;padding:4px 9px;border:1px solid var(--line);border-radius:999px;font-size:12px;color:#555;background:#fff;cursor:pointer}.filter:hover,.tag:hover,.filter.active{border-color:#222;color:#111}.search{width:min(420px,70vw);padding:10px 12px;border:1px solid #ccc;border-radius:999px}.count{color:var(--muted);font-size:13px;margin-top:10px}.feed{margin-top:20px}.card{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:20px;margin-bottom:14px}.meta{color:var(--muted);font-size:13px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}.label{display:inline-block;padding:3px 8px;border:1px solid #d8d8d8;border-radius:999px;background:#f2f2ef;color:#555;font-size:12px}.summary{line-height:1.55}.tag-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}a{color:#0756a5;text-decoration:none}.empty{display:none;background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:20px;color:var(--muted)}.small{font-size:12px;color:var(--muted)}
  </style>
</head>
<body>
<header><div class="brand">Knowledge Hub Magazine</div><div></div><nav><a href="/">Home</a><a href="/wire">Wire</a><a href="/articles">Articles</a><a href="/library">Library</a></nav></header>
<main>
  <section><div class="eyebrow">Wire</div><h1>Signals, fragments, and source notes.</h1><p class="deck">Short entries for tools, films, systems, images, and ideas before they become essays or library records.</p></section>
  <section class="toolbar"><div class="toolbar-top"><div><div class="toolbar-title">Filter by tag</div><div id="filters" class="filter-row"><button class="filter active" data-tag="all">All</button>${filters}</div></div><input id="search" class="search" placeholder="Search Wire"></div><div class="count"><span id="visibleCount">${entries.length}</span> / <span id="totalCount">${entries.length}</span> entries shown</div><div class="small">Data source: ${htmlEscape(payload.source || "wire.json")}</div></section>
  <section id="feed" class="feed">${cards}</section>
  <section id="empty" class="empty">No entries match this filter.</section>
</main>
<script>
const search=document.getElementById('search');const visibleCount=document.getElementById('visibleCount');const empty=document.getElementById('empty');const cards=Array.from(document.querySelectorAll('.card'));let activeTag='all';
function applyFilters(){const q=search.value.trim().toLowerCase();let count=0;for(const card of cards){const tagOk=activeTag==='all'||card.dataset.tags.split('|').includes(activeTag);const searchOk=!q||card.dataset.search.toLowerCase().includes(q);const show=tagOk&&searchOk;card.style.display=show?'':'none';if(show)count+=1;}visibleCount.textContent=String(count);empty.style.display=count?'none':'block';}
document.querySelectorAll('.filter').forEach(btn=>btn.addEventListener('click',()=>{activeTag=btn.dataset.tag;document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b===btn));applyFilters();}));
document.querySelectorAll('.tag').forEach(btn=>btn.addEventListener('click',()=>{activeTag=btn.dataset.tag;document.querySelectorAll('.filter').forEach(b=>b.classList.toggle('active',b.dataset.tag===activeTag));applyFilters();window.scrollTo({top:0,behavior:'smooth'});}));
search.addEventListener('input',applyFilters);
</script>
</body>
</html>`;
}

function htmlResponse(html, init = {}) {
  return new Response(html, {
    ...init,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      ...(init.headers || {})
    }
  });
}

async function handleWireJson(request, env) {
  try {
    return jsonResponse(await loadWirePayload(request, env));
  } catch (error) {
    return jsonResponse({
      generated_at: new Date().toISOString(),
      count: 0,
      entries: [],
      error: error.message
    }, { status: 502 });
  }
}

async function handleWirePage(request, env) {
  try {
    const payload = await loadWirePayload(request, env);
    return htmlResponse(wireHtml(payload));
  } catch (error) {
    return htmlResponse(`<!doctype html><meta charset="utf-8"><title>Wire error</title><pre>${htmlEscape(error.message)}</pre>`, { status: 502 });
  }
}

async function handleWireDebug(request, env) {
  const assetData = await loadWireJsonAsset(request, env);
  const sources = [];
  for (const source of LEGACY_WIRE_SOURCES) {
    sources.push(await inspectWireSource(source, request, env));
  }
  return jsonResponse({
    generated_at: new Date().toISOString(),
    wire_json_asset_has_entries: hasEntries(assetData),
    sources
  });
}

function assetResponse(pathname, request) {
  const url = new URL(request.url);
  return new Request(new URL(pathname, url).toString(), { method: "GET" });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return env.ASSETS.fetch(assetResponse("/index.html", request));
    }

    if (url.pathname === "/wire") {
      return handleWirePage(request, env);
    }

    if (url.pathname === "/wire.json") {
      return handleWireJson(request, env);
    }

    if (url.pathname === "/wire-debug") {
      return handleWireDebug(request, env);
    }

    if (url.pathname === "/articles") {
      return env.ASSETS.fetch(assetResponse("/articles.html", request));
    }

    if (url.pathname === "/library") {
      return env.ASSETS.fetch(assetResponse("/library.html", request));
    }

    return env.ASSETS.fetch(request);
  }
};
