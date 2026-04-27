import fs from "node:fs";
import path from "node:path";

const DEFAULT_CANDIDATE = "data/incoming/wire_20260426_candidate_min.json";
const candidatePath = process.argv[2] || DEFAULT_CANDIDATE;
const OUT_DIR = "data/processed";
const WIRE_DATA_RE = /<script id=["']wire-data["'] type=["']application\/json["']>([\s\S]*?)<\/script>/;

function readText(filePath) {
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

function parseJsonText(raw, label) {
  if (!raw || !raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label}: JSON parse failed: ${error.message}`);
  }
}

function entriesFromJsonValue(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (Array.isArray(value.entries)) return value.entries;
  if (Array.isArray(value.items)) return value.items;
  return [];
}

function readJsonEntries(filePath) {
  const value = parseJsonText(readText(filePath), filePath);
  return entriesFromJsonValue(value);
}

function readHtmlWireEntries(filePath) {
  const html = readText(filePath);
  if (!html) return [];
  const match = html.match(WIRE_DATA_RE);
  if (!match) return [];
  return entriesFromJsonValue(parseJsonText(match[1], `${filePath}#wire-data`));
}

function statusIdFromUrl(value) {
  const match = String(value || "").match(/\/status\/(\d+)/);
  return match ? match[1] : "";
}

function normalizeEntry(entry) {
  const url = String(entry.url || entry.original_url || "").trim();
  const id = String(entry.id || (statusIdFromUrl(url) ? `x_${statusIdFromUrl(url)}` : "")).trim();
  return {
    ...entry,
    id,
    source: entry.source || "x_like",
    url,
    original_url: entry.original_url || url,
    author_handle: entry.author_handle || entry.author || "",
    posted_at: entry.posted_at || entry.posted || "",
    collected_at: entry.collected_at || entry.collected || "",
    summary: entry.public_summary || entry.summary || "要約未作成。元リンクを参照してください。",
    public_summary: entry.public_summary || entry.summary || "要約未作成。元リンクを参照してください。"
  };
}

function entryKeys(entry) {
  const keys = new Set();
  const normalized = normalizeEntry(entry);
  if (normalized.id) keys.add(`id:${normalized.id}`);
  if (normalized.url) keys.add(`url:${normalized.url}`);
  const statusId = statusIdFromUrl(normalized.url || normalized.original_url);
  if (statusId) keys.add(`status:${statusId}`);
  return keys;
}

function hasAnyKey(keySet, entry) {
  for (const key of entryKeys(entry)) {
    if (keySet.has(key)) return true;
  }
  return false;
}

function addKeys(keySet, entry) {
  for (const key of entryKeys(entry)) keySet.add(key);
}

function uniqueByKeys(entries) {
  const keys = new Set();
  const out = [];
  for (const raw of entries) {
    const entry = normalizeEntry(raw);
    if (!entry.id && !entry.url) continue;
    if (hasAnyKey(keys, entry)) continue;
    addKeys(keys, entry);
    out.push(entry);
  }
  return out;
}

function loadExistingEntries() {
  const sources = [
    ["data/processed/wire.json", () => readJsonEntries("data/processed/wire.json")],
    ["content/wire/index.json", () => readJsonEntries("content/wire/index.json")],
    ["public/wire.json", () => readJsonEntries("public/wire.json")],
    ["public/wire.html#wire-data", () => readHtmlWireEntries("public/wire.html")],
    [".cache/static-wire-source.json", () => readJsonEntries(".cache/static-wire-source.json")]
  ];

  const all = [];
  const stats = [];
  for (const [label, loader] of sources) {
    let entries = [];
    try {
      entries = loader();
    } catch (error) {
      console.warn(`Skipped ${label}: ${error.message}`);
      continue;
    }
    if (entries.length) {
      stats.push({ source: label, count: entries.length });
      all.push(...entries);
    }
  }
  return { entries: uniqueByKeys(all), stats };
}

if (!fs.existsSync(candidatePath)) {
  throw new Error(`Candidate file not found: ${candidatePath}`);
}

const candidateEntries = uniqueByKeys(readJsonEntries(candidatePath));
const { entries: existingEntries, stats: existingSourceStats } = loadExistingEntries();
const existingKeys = new Set();
for (const entry of existingEntries) addKeys(existingKeys, entry);

const newEntries = [];
const duplicateEntries = [];
const stagedKeys = new Set(existingKeys);

for (const entry of candidateEntries) {
  if (hasAnyKey(existingKeys, entry)) {
    duplicateEntries.push(entry);
    continue;
  }
  if (hasAnyKey(stagedKeys, entry)) {
    duplicateEntries.push(entry);
    continue;
  }
  addKeys(stagedKeys, entry);
  newEntries.push(entry);
}

const mergedEntries = uniqueByKeys([...existingEntries, ...newEntries]);
fs.mkdirSync(OUT_DIR, { recursive: true });

const generatedAt = new Date().toISOString();
function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

writeJson(path.join(OUT_DIR, "wire_new_entries.json"), {
  generated_at: generatedAt,
  candidate: candidatePath,
  count: newEntries.length,
  entries: newEntries
});

writeJson(path.join(OUT_DIR, "wire_existing_matches.json"), {
  generated_at: generatedAt,
  candidate: candidatePath,
  count: duplicateEntries.length,
  entries: duplicateEntries
});

writeJson(path.join(OUT_DIR, "wire_merged_preview.json"), {
  generated_at: generatedAt,
  existing_sources: existingSourceStats,
  existing_count: existingEntries.length,
  candidate_count: candidateEntries.length,
  new_count: newEntries.length,
  duplicate_count: duplicateEntries.length,
  merged_count: mergedEntries.length,
  entries: mergedEntries
});

console.log(`Existing unique entries: ${existingEntries.length}`);
console.log(`Candidate unique entries: ${candidateEntries.length}`);
console.log(`New entries: ${newEntries.length}`);
console.log(`Existing/duplicate matches: ${duplicateEntries.length}`);
console.log(`Merged preview entries: ${mergedEntries.length}`);
console.log("Wrote data/processed/wire_new_entries.json");
console.log("Wrote data/processed/wire_existing_matches.json");
console.log("Wrote data/processed/wire_merged_preview.json");
