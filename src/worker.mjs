const WIRE_DATA_RE = /<script id=["']wire-data["'] type=["']application\/json["']>([\s\S]*?)<\/script>/;
const LEGACY_WIRE_SOURCES = [
  "/wire.html?legacy_data=1",
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
  const response = await env.ASSETS.fetch(new Request(assetUrl, request));
  const data = await responseJson(response);
  return hasEntries(data) ? data : null;
}

async function fetchText(source, request, env) {
  const url = new URL(source, request.url);
  const targetRequest = new Request(url, request);
  const response = url.origin === new URL(request.url).origin
    ? await env.ASSETS.fetch(targetRequest)
    : await fetch(targetRequest);

  if (!response.ok) {
    throw new Error(`${url.href}: ${response.status}`);
  }
  return await response.text();
}

async function loadWireFromLegacyHtml(request, env) {
  const errors = [];

  for (const source of LEGACY_WIRE_SOURCES) {
    try {
      const html = await fetchText(source, request, env);
      const match = html.match(WIRE_DATA_RE);
      if (!match) throw new Error(`${source}: wire-data block not found`);
      const parsed = JSON.parse(match[1].trim());
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error(`${source}: parsed 0 entries`);
      return publicWirePayload(parsed, source);
    } catch (error) {
      errors.push(error.message);
    }
  }

  throw new Error(errors.join(" / "));
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

async function handleWireJson(request, env) {
  const assetData = await loadWireJsonAsset(request, env);
  if (assetData) return jsonResponse(assetData);

  try {
    const migratedData = await loadWireFromLegacyHtml(request, env);
    return jsonResponse(migratedData);
  } catch (error) {
    return jsonResponse({
      generated_at: new Date().toISOString(),
      count: 0,
      entries: [],
      error: error.message
    }, { status: 502 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/") {
      return env.ASSETS.fetch(new Request(new URL("/index.html", url), request));
    }

    if (url.pathname === "/wire") {
      return env.ASSETS.fetch(new Request(new URL("/wire-app.html", url), request));
    }

    if (url.pathname === "/wire.json") {
      return handleWireJson(request, env);
    }

    if (url.pathname === "/articles") {
      return env.ASSETS.fetch(new Request(new URL("/articles.html", url), request));
    }

    if (url.pathname === "/library") {
      return env.ASSETS.fetch(new Request(new URL("/library.html", url), request));
    }

    return env.ASSETS.fetch(request);
  }
};
