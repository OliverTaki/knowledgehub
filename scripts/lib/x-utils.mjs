export function normalizeXUrl(url) {
  if (!url) return "";
  return url
    .replace("https://twitter.com/", "https://x.com/")
    .replace("http://twitter.com/", "https://x.com/")
    .replace("http://x.com/", "https://x.com/")
    .split("?")[0]
    .replace(/\/$/, "");
}

export function extractStatusId(url) {
  const normalized = normalizeXUrl(url);
  const match = normalized.match(/\/status\/(\d+)/);
  return match ? match[1] : "";
}

export function nowIso() {
  return new Date().toISOString();
}

export function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}
