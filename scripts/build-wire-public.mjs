import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { readJson, writeJson } from "./lib/jsonl.mjs";

fs.mkdirSync("public", { recursive: true });

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() || "";
}

function readJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return readJson(filePath, fallback);
}

function normalizeList(value, fallback = []) {
  if (Array.isArray(value)) return value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
  return fallback;
}

function publicSummary(item) {
  return firstNonEmpty(
    item.public_summary,
    item.summary_ja,
    item.summary,
    item.context_summary,
    item.context?.summary,
    item.text
  ) || "Editorial note pending. Follow the source link for the original post.";
}

function normalizeWireEntry(item, index = 0) {
  const url = firstNonEmpty(item.url, item.original_url);
  const labels = normalizeList(item.labels, []);
  const contentKinds = normalizeList(item.content_kinds, labels.length ? labels : [item.post_kind || "unknown"]);
  const domains = normalizeList(item.domains, []);
  const tags = normalizeList(item.tags, []);
  const author = firstNonEmpty(item.author_handle, item.author);
  const postedAt = firstNonEmpty(item.posted_at, item.posted);
  const collectedAt = firstNonEmpty(item.collected_at, item.collected);

  return {
    id: firstNonEmpty(item.id, item.status_id ? `x_${item.status_id}` : `wire_${index + 1}`),
    source: item.source || "x_like",
    url,
    original_url: firstNonEmpty(item.original_url, url),
    collected_at: collectedAt,
    posted_at: postedAt,
    author_handle: author,
    post_kind: item.post_kind || "unknown",
    content_kinds: contentKinds.length ? contentKinds : ["unknown"],
    domains: domains.length ? domains : ["unknown"],
    labels,
    title: firstNonEmpty(item.title, item.summary, "Source note"),
    tags,
    summary: publicSummary(item),
    library_refs: Array.isArray(item.library_refs) ? item.library_refs : [],
    article_refs: Array.isArray(item.article_refs) ? item.article_refs : [],
    display: {
      original_link_required: true,
      full_text_copied: false,
      embed_allowed: false
    }
  };
}

function parseLegacyWireHtml(html) {
  const match = html.match(/<script id=["']wire-data["'] type=["']application\/json["']>([\s\S]*?)<\/script>/);
  if (!match) return [];
  const parsed = JSON.parse(match[1].trim());
  return Array.isArray(parsed) ? parsed : [];
}

function extractLegacyWireEntries() {
  const legacyPath = path.join("public", "wire.html");
  if (fs.existsSync(legacyPath)) {
    const parsed = parseLegacyWireHtml(fs.readFileSync(legacyPath, "utf8"));
    if (parsed.length > 0) return parsed;
  }

  try {
    const committedHtml = execFileSync("git", ["show", "HEAD:public/wire.html"], { encoding: "utf8" });
    return parseLegacyWireHtml(committedHtml);
  } catch {
    return [];
  }
}

function loadEntries() {
  const processed = readJsonIfExists("data/processed/wire.json", { entries: [] });
  if (Array.isArray(processed.entries) && processed.entries.length > 0) return processed.entries;

  const publicJson = readJsonIfExists("public/wire.json", { entries: [] });
  if (Array.isArray(publicJson.entries) && publicJson.entries.length > 0) return publicJson.entries;

  return extractLegacyWireEntries();
}

const entries = loadEntries().map(normalizeWireEntry);

if (entries.length === 0) {
  throw new Error("Wire has 0 entries. Source data is missing: data/processed/wire.json, public/wire.json, and legacy public/wire.html all failed.");
}

writeJson("public/wire.json", {
  generated_at: new Date().toISOString(),
  count: entries.length,
  policy: {
    full_text_copied: false,
    original_link_required: true,
    embed_x_posts: false
  },
  entries
});

console.log(`Built public Wire JSON with ${entries.length} entries.`);
