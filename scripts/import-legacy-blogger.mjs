import fs from "node:fs";
import path from "node:path";
import { writeJson } from "./lib/jsonl.mjs";

const defaultLegacyRoot = "C:/Users/punch/Desktop/AI_Blog_Editorial_Shared";
const legacyRoot = process.env.LEGACY_BLOGGER_DIR || defaultLegacyRoot;
const bloggerDir = path.join(legacyRoot, "05_drafts", "blogger");

function decodeHtml(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function matchAll(pattern, text) {
  return [...text.matchAll(pattern)];
}

function extractTitle(html, fallback) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return decodeHtml(match?.[1] || fallback.replace(/[-_]+/g, " "));
}

function normalizeSourceUrl(url = "") {
  return String(url).replace("https://twitter.com/", "https://x.com/");
}

function extractLinks(html) {
  return matchAll(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, html)
    .map((match) => ({
      url: normalizeSourceUrl(match[1]),
      label: decodeHtml(match[2])
    }))
    .filter((link) => link.url);
}

function extractPostPoints(html) {
  const ulMatch = html.match(/<ul[^>]*>([\s\S]*?)<\/ul>/i);
  if (!ulMatch) return [];
  return matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi, ulMatch[1])
    .map((match) => decodeHtml(match[1]))
    .filter(Boolean);
}

function extractSections(html) {
  const sections = [];
  const h2Matches = matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, html);
  for (let index = 1; index < h2Matches.length; index += 1) {
    const current = h2Matches[index];
    const next = h2Matches[index + 1];
    const heading = decodeHtml(current[1]);
    if (/参考|リンク|source|reference/i.test(heading)) continue;
    const body = html.slice(current.index + current[0].length, next?.index ?? html.length);
    const paragraphs = matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi, body)
      .map((match) => decodeHtml(match[1]))
      .filter(Boolean);
    if (paragraphs.length) sections.push({ heading, paragraphs });
  }
  return sections;
}

function extractBodyHtml(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch?.[1] || html;
}

function legacyContentHtml(html, sourceUrl) {
  let content = extractBodyHtml(html)
    .replace(/<script[\s\S]*?platform\.twitter\.com\/widgets\.js[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?(?:!doctype|html|head|body|meta)[^>]*>/gi, "")
    .replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, "")
    .replace(/<blockquote\s+class=["']twitter-tweet["'][\s\S]*?<\/blockquote>/gi, "");

  if (sourceUrl) {
    const normalizedUrl = normalizeSourceUrl(sourceUrl);
    content = `<div class="source-embed lazy-x-embed" data-x-url="${normalizedUrl}">
  <p class="entry-meta">Original post embed loads when this block enters the viewport.</p>
  <a href="${normalizedUrl}" target="_blank" rel="noopener noreferrer">Open original post</a>
</div>\n${content}`;
  }

  return content.trim();
}

function addIf(tags, condition, values) {
  if (condition) tags.push(...values);
}

function inferTags(slug, title, points) {
  const text = `${slug} ${title} ${points.join(" ")}`.toLowerCase();
  const tags = ["legacy-blogger", "source-note"];

  addIf(tags, /blender|sverchok|geometry|home-builder/.test(text), ["blender", "3d", "tutorial"]);
  addIf(tags, /maya|joint-orient|rig/.test(text), ["maya", "rigging", "tutorial"]);
  addIf(tags, /houdini|xparticles|procedural|serpens/.test(text), ["houdini", "procedural", "vfx"]);
  addIf(tags, /3dgs|gaussian|splat|nerf|reconstruction|vgg/.test(text), ["spatial-capture", "3dgs", "research"]);
  addIf(tags, /render|materialx|filament|eevee|omniverse/.test(text), ["rendering", "vfx", "workflow"]);
  addIf(tags, /claude|codex|xcode|vibe-local|gitnexus|mcp|cli/.test(text), ["ai-coding", "agents", "workflow"]);
  addIf(tags, /notebooklm|obsidian|gemini|learning|mext/.test(text), ["learning", "knowledge-map", "reference"]);
  addIf(tags, /ocr|ndl|document/.test(text), ["document-ai", "ocr", "archive"]);
  addIf(tags, /film|movie|trailer|cinema|james-cameron|touch-me|sirāt|die-hard|silicon-valley/.test(text), ["film", "visual-reference", "criticism"]);
  addIf(tags, /book|library|dawn-of-everything|literature|daniel-day-lewis|lincoln/.test(text), ["books", "archive", "criticism"]);
  addIf(tags, /ai.?video|seedance|dreamdojo|stablegen|trellis|midjourney|grok|automatic1111|stable-diffusion/.test(text), ["ai-video", "ai", "production"]);
  addIf(tags, /ui|stitch|uicomponents|pencil|rork|freepik|floorplan/.test(text), ["design-tools", "ui", "workflow"]);
  addIf(tags, /animation|stop-motion|puppet|motion|rokoko|cavalry|pikimov/.test(text), ["animation", "motion-design", "visual-reference"]);

  return [...new Set(tags)].slice(0, 8);
}

if (!fs.existsSync(bloggerDir)) {
  throw new Error(`Legacy Blogger draft directory was not found: ${bloggerDir}`);
}

const files = fs.readdirSync(bloggerDir)
  .filter((file) => file.endsWith(".html"))
  .sort((a, b) => a.localeCompare(b));

const notes = files.map((file) => {
  const fullPath = path.join(bloggerDir, file);
  const html = fs.readFileSync(fullPath, "utf8");
  const slug = file.replace(/\.html$/i, "");
  const title = extractTitle(html, slug);
  const links = extractLinks(html);
  const sourceUrl = links.find((link) => /x\.com\/|twitter\.com\//.test(link.url))?.url || "";
  const postPoints = extractPostPoints(html);
  const sections = extractSections(html);

  return {
    id: `legacy_blogger_${slug}`,
    source: "legacy_blogger",
    source_file: `AI_Blog_Editorial_Shared/05_drafts/blogger/${file}`,
    title,
    slug,
    source_url: sourceUrl,
    tags: inferTags(slug, title, postPoints),
    post_points: postPoints,
    sections,
    legacy_html: legacyContentHtml(html, sourceUrl),
    links
  };
});

writeJson("data/legacy-blogger-source-notes.json", {
  generated_at: new Date().toISOString(),
  source_root: legacyRoot,
  count: notes.length,
  policy: {
    reuse_template: false,
    note: "These are extracted editorial source notes. The old Blogger page template is not reused."
  },
  notes
});

console.log(`Imported ${notes.length} legacy Blogger source notes.`);
