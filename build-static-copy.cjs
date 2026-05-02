const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const out = path.join(root, "public");
const exclude = new Set([".git", "public", "package.json", "build-static-copy.cjs"]);

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (exclude.has(entry.name)) continue;
  const src = path.join(root, entry.name);
  const dest = path.join(out, entry.name);
  fs.cpSync(src, dest, { recursive: true });
}

console.log("Prepared static GitHub Pages output in public/.");
