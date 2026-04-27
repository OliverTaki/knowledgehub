import fs from "node:fs";

function readPublicJsonEntries() {
  if (!fs.existsSync("public/wire.json")) return [];
  const data = JSON.parse(fs.readFileSync("public/wire.json", "utf8"));
  return Array.isArray(data) ? data : Array.isArray(data.entries) ? data.entries : [];
}

function readLegacyHtmlEntries() {
  if (!fs.existsSync("public/wire.html")) return [];
  const html = fs.readFileSync("public/wire.html", "utf8");
  const match = html.match(/<script id=["']wire-data["'] type=["']application\/json["']>([\s\S]*?)<\/script>/);
  if (!match) return [];
  const data = JSON.parse(match[1].trim());
  return Array.isArray(data) ? data : [];
}

function validateEntry(entry, index) {
  const id = entry.id || `entry at index ${index}`;
  if (!entry.url && !entry.original_url) throw new Error(`${id}: missing url`);
  if (!entry.summary && !entry.title && !entry.text) throw new Error(`${id}: missing summary/title/text`);
}

const entries = readPublicJsonEntries();
const legacyEntries = entries.length > 0 ? [] : readLegacyHtmlEntries();
const target = entries.length > 0 ? entries : legacyEntries;

if (target.length === 0) {
  throw new Error("Wire has 0 public entries. Run npm run build:wire && npm run build:site, or keep reviewed data in public/wire.json.");
}

target.forEach(validateEntry);
console.log(`Validated ${target.length} public Wire entries.`);
