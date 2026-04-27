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

function sanitizeLegacyJson(raw) {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ")
    .replace(/[\u2028\u2029]/g, " ");
}

function parseLegacyWireJson(raw, source) {
  const trimmed = raw.trim();

  try {
    return JSON.parse(trimmed);
  } catch (firstError) {
    try {
      return JSON.parse(sanitizeLegacyJson(trimmed));
    } catch (secondError) {
      throw new Error(`${source}: JSON parse failed after sanitizing control characters: ${secondError.message}; original error: ${firstError.message}`);
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

async function inspectWireSource(source, request, env) {
  try {
    const html = await fetchText(source, request, env);
    const match = html.match(WIRE_DATA_RE);
    let count = 0;
    let parse_error = null;
    let has_control_chars = false;

    if (match) {
      has_control_chars = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u2028\u2029]/.test(match[1]);
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
      has_control_chars,
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
      return env.ASSETS.fetch(assetResponse("/wire-app.html", request));
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
