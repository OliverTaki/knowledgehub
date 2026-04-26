import { readJsonl } from "./lib/jsonl.mjs";

const rows = readJsonl("data/raw/x_likes.jsonl");
const ids = new Set();
let duplicates = 0;

for (const row of rows) {
  if (!row.status_id || !row.url) {
    throw new Error(`Invalid row: ${JSON.stringify(row)}`);
  }
  if (ids.has(row.status_id)) duplicates += 1;
  ids.add(row.status_id);
}

console.log(`Rows: ${rows.length}`);
console.log(`Unique status IDs: ${ids.size}`);
console.log(`Duplicates: ${duplicates}`);
