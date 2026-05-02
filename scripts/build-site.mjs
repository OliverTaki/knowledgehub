import fs from "node:fs";
import path from "node:path";
import { readJson, writeJson } from "./lib/jsonl.mjs";

const config = readJson("config/site.config.json", { siteName: "Knowledge Hub" });
const wire = readJson("data/processed/wire.json", readJson("public/wire.json", { entries: [] }));
const librarySource = readJson("data/processed/library_seed.json", { items: [] });
const publicWirePolicy = config.publicWire || {};
const siteName = config.siteName || "Knowledge Hub";
const timezone = config.timezone || "Asia/Tokyo";
const now = new Date();

const DEFAULT_LIBRARY_ITEMS = [
  {
    title: "MaterialX",
    kind: "Library / Rendering",
    description: "A reusable reference on material interchange, look development, and renderer-independent material description.",
    tags: ["rendering", "materialx", "pipeline"]
  },
  {
    title: "Filament",
    kind: "Library / Rendering",
    description: "A real-time rendering reference useful for asset inspection, material preview, lightweight look development, and production-adjacent visualization.",
    tags: ["rendering", "lookdev", "software"]
  },
  {
    title: "Node graph memory",
    kind: "Library / Workflow",
    description: "A wiki-style concept for linking node-based work to external notes, reusable explanations, and production memory so procedural systems remain understandable.",
    tags: ["pipeline", "procedural", "documentation"]
  },
  {
    title: "Tarkovsky Polaroids",
    kind: "Library / Film reference",
    description: "A visual-reference entry for studying atmosphere, time, texture, framing, and the unresolved density of ordinary spaces.",
    tags: ["film", "visual-reference", "archive"]
  }
];

const BASE_ARTICLES = [
  {
    published_at: "2026-04-27",
    updated_at: "2026-04-27",
    title: "The useful AI tool is the one that disappears into the workflow",
    tags: ["local-ai", "workflow", "production"],
    paragraphs: [
      "The most interesting AI posts are no longer the ones that announce a spectacular model. They are the ones that make a step in the production chain cheaper, faster, or more local.",
      "For a creative worker, this changes the evaluation criteria. The question is not only whether a model is impressive. The question is whether it can be placed inside an existing loop: ingest, search, annotate, edit, archive, compare, and publish."
    ]
  },
  {
    published_at: "2026-04-27",
    updated_at: "2026-04-27",
    title: "AI video is becoming a reference library before it becomes a cinema",
    tags: ["ai-video", "visual-reference", "lookdev"],
    paragraphs: [
      "The more immediate use of AI video is not finished film. It is reference: motion mood, impossible camera language, texture tests, lighting proposals, transitions, and image behaviors that can be studied and translated into other tools.",
      "A short AI clip can be weak as a complete work but strong as a visual note. It can reveal a style of movement, a treatment of surface, or a rhythm that becomes useful elsewhere."
    ]
  },
  {
    published_at: "2026-04-27",
    updated_at: "2026-04-27",
    title: "Node-based work needs a memory layer outside the node graph",
    tags: ["houdini", "knowledge-map", "pipeline"],
    paragraphs: [
      "Node graphs are powerful because they expose structure. They are also fragile because structure without memory becomes archaeology.",
      "A serious creative pipeline needs the graph, the note, the source, and the reusable library entry. Without them, the same discoveries are repeatedly made and lost."
    ]
  },
  {
    published_at: "2026-05-02",
    updated_at: "2026-05-02",
    title: "A useful wire is not a feed, it is a staging area",
    tags: ["wire", "editorial-system", "knowledge-map"],
    paragraphs: [
      "A feed is optimized for arrival. A wire is optimized for later judgment. That difference matters because the first pass should not pretend to know what will become useful.",
      "The job of the wire lane is to preserve a source, attach the minimum useful metadata, and keep enough context for a future article or library entry. It should be fast, flat, and recoverable."
    ]
  },
  {
    published_at: "2026-05-02",
    updated_at: "2026-05-02",
    title: "Rendering notes become valuable when they connect tools to decisions",
    tags: ["rendering", "materialx", "filament"],
    paragraphs: [
      "Material systems, viewport renderers, and look-development tools are often collected as isolated technical bookmarks. They become more useful when they are connected to decisions: what can be previewed, exchanged, trusted, or automated.",
      "A Knowledge Hub entry should therefore describe not only what a tool is, but where it sits in the chain between asset, material, renderer, review, and final output."
    ]
  },
  {
    published_at: "2026-05-02",
    updated_at: "2026-05-02",
    title: "The library layer should compress repeated curiosity into reusable entries",
    tags: ["library", "research", "taxonomy"],
    paragraphs: [
      "If the same topic appears in wire captures several times, it should stop being rediscovered as a new object each time. That is the signal that a library entry is needed.",
      "The library layer is not a dumping ground. It is a compression layer: names, aliases, categories, short descriptions, and links that make future writing faster."
    ]
  },
  {
    published_at: "2026-05-02",
    updated_at: "2026-05-02",
    title: "Visual reference is a production asset, not decoration",
    tags: ["visual-reference", "film", "lookdev"],
    paragraphs: [
      "A still, a clip, or a film note is useful when it names a visual behavior: density, texture, distance, contrast, rhythm, surface, framing, or time.",
      "That makes visual reference part of production memory. It can guide a shader test, a motion study, an edit decision, a lighting pass, or the mood of an interface."
    ]
  },
  {
    published_at: "2026-05-02",
    updated_at: "2026-05-02",
    title: "Local AI belongs in the boring parts of the loop first",
    tags: ["local-ai", "workflow", "automation"],
    paragraphs: [
      "The easiest mistake is to judge local AI only by whether it can produce a complete finished artifact. The more durable use is often smaller: clean, classify, summarize, compare, rename, extract, and route.",
      "Those tasks are boring in the right way. When they become local and repeatable, the whole knowledge system gets cheaper to maintain."
    ]
  },
  {
    published_at: "2026-05-02",
    updated_at: "2026-05-02",
    title: "A tag is useful only when it changes retrieval",
    tags: ["taxonomy", "search", "metadata"],
    paragraphs: [
      "Tags should not be decorative labels. A tag earns its place when it helps retrieve a set of entries that would otherwise be hard to find.",
      "That means the taxonomy should stay small at first. The right categories are the ones that create useful work surfaces: tools, workflows, references, visual systems, books, films, and production questions."
    ]
  },
  {
    published_at: "2026-05-02",
    updated_at: "2026-05-02",
    title: "Books and films need the same treatment as tools",
    tags: ["books", "films", "library"],
    paragraphs: [
      "A tool can be evaluated by where it fits in a workflow. A book or film can be evaluated the same way: what habit, concept, image, rhythm, or decision does it make available?",
      "Putting books, films, tools, and workflow notes in the same hub is not a category mistake. It reflects how creative work actually borrows from everything at once."
    ]
  },
  {
    published_at: "2026-05-02",
    updated_at: "2026-05-02",
    title: "The archive should stay readable before it becomes large",
    tags: ["archive", "maintenance", "publishing"],
    paragraphs: [
      "A knowledge site can grow quickly, but size is not the achievement. The achievement is that a future reader can still scan it, search it, and understand why an entry exists.",
      "That requires short summaries, stable lanes, conservative navigation, and periodic promotion from wire to article to library."
    ]
  },
  {
    published_at: "2026-05-02",
    updated_at: "2026-05-02",
    title: "A personal magazine can be built from operational notes",
    tags: ["publishing", "magazine", "knowledge-map"],
    paragraphs: [
      "The line between a private research notebook and a public magazine is thinner than it looks. The difference is not the source material. It is the editorial pass.",
      "When notes are grouped, titled, summarized, and connected to durable references, operational memory becomes readable as a magazine without losing its practical origin."
    ]
  }
];

const legacyBloggerArticles = readJson("data/legacy-blogger-articles.json", []);
const legacyBloggerSourceNotes = readJson("data/legacy-blogger-source-notes.json", { notes: [] });
const sourceNotesByFile = new Map(
  (Array.isArray(legacyBloggerSourceNotes.notes) ? legacyBloggerSourceNotes.notes : [])
    .map((note) => [note.source_file, note])
);
const curatedLegacySources = new Set(
  (Array.isArray(legacyBloggerArticles) ? legacyBloggerArticles : [])
    .map((article) => article.source_file)
    .filter(Boolean)
);
function slugifyArticle(value, fallback = "article") {
  const slug = String(value || fallback)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

function decorateArticle(article, fallback) {
  const sourceNote = article.source_file ? sourceNotesByFile.get(article.source_file) : null;
  const slug = article.slug || sourceNote?.slug || slugifyArticle(article.title, fallback);
  return {
    ...article,
    slug,
    source_url: article.source_url || sourceNote?.source_url || "",
    legacy_html: article.legacy_html || sourceNote?.legacy_html || "",
    detail_url: `articles/${slug}.html`
  };
}

const sourceNoteArticles = (Array.isArray(legacyBloggerSourceNotes.notes) ? legacyBloggerSourceNotes.notes : [])
  .filter((note) => !curatedLegacySources.has(note.source_file))
  .map((note) => {
    const points = (note.post_points || []).slice(0, 3);
    const sectionParagraphs = (note.sections || [])
      .flatMap((section) => (section.paragraphs || []).slice(0, 1))
      .slice(0, Math.max(0, 3 - points.length));
    const paragraphs = [...points, ...sectionParagraphs].filter(Boolean);
    return {
      published_at: "2026-05-02",
      updated_at: "2026-05-02",
      title: note.title,
      slug: note.slug,
      source_file: note.source_file,
      source_url: note.source_url,
      tags: note.tags || ["legacy-blogger", "source-note"],
      legacy_html: note.legacy_html,
      paragraphs: paragraphs.length ? paragraphs : ["Legacy Blogger source note imported for editorial review and future Knowledge Hub promotion."]
    };
  });
const ARTICLES = [
  ...BASE_ARTICLES.map((article, index) => decorateArticle(article, `base-${index + 1}`)),
  ...(Array.isArray(legacyBloggerArticles) ? legacyBloggerArticles : []).map((article, index) => decorateArticle(article, `legacy-curated-${index + 1}`)),
  ...sourceNoteArticles.map((article, index) => decorateArticle(article, `legacy-source-${index + 1}`))
];

const library = {
  ...librarySource,
  items: Array.isArray(librarySource.items) && librarySource.items.length > 0 ? librarySource.items : DEFAULT_LIBRARY_ITEMS
};
const tagTaxonomy = readJson("data/tag-taxonomy.json", { tags: [] });
const tagAliasToCanonical = new Map();
for (const entry of Array.isArray(tagTaxonomy.tags) ? tagTaxonomy.tags : []) {
  const canonical = String(entry.tag || "").trim();
  if (!canonical) continue;
  tagAliasToCanonical.set(canonical.toLowerCase(), canonical);
  for (const alias of entry.aliases || []) {
    tagAliasToCanonical.set(String(alias || "").trim().toLowerCase(), canonical);
  }
}

fs.mkdirSync("public", { recursive: true });

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function firstNonEmpty(...values) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim() || "";
}

function cleanWireText(item) {
  const handle = item.author_handle || "";
  return String(item.text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line !== "·")
    .filter((line) => line !== handle)
    .filter((line) => !/^@\w+/.test(line))
    .filter((line) => !/^\d[\d,.\s]*万?$/.test(line))
    .filter((line) => !/^\d+\s+\d+\s+\d+/.test(line))
    .filter((line) => !/^\d+時間$/.test(line))
    .filter((line) => !/^\d+月\d+日$/.test(line))
    .filter((line) => !/(原文を表示|翻訳|さらに表示|返信先|投稿者:|analytics)/i.test(line))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAny(text, words) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word.toLowerCase()));
}

function inferWireTopic(item) {
  const text = cleanWireText(item);
  const haystack = `${text} ${item.url || ""} ${(item.tags || []).join(" ")}`;
  const rules = [
    {
      words: ["Whisper", "文字起こし", "transcription", "audio"],
      title: "Open-source Whisper transcription workflow",
      summary: "A saved source on fast local audio transcription and where Whisper-style tooling may fit in a production loop."
    },
    {
      words: ["MaterialX", "Filament", "レンダリング"],
      title: "MaterialX and Filament rendering compatibility note",
      summary: "A rendering pipeline note for tracking MaterialX support, lightweight preview quality, and Filament-related look-development experiments."
    },
    {
      words: ["Midjourney", "Seedance", "AIショート", "AIで生成"],
      title: "AI video reference: Midjourney and Seedance experiment",
      summary: "A visual-reference entry for AI-generated motion, useful for studying frame behavior, image texture, and short-form motion language."
    },
    {
      words: ["太宰", "五味", "文学", "エッセイ"],
      title: "Literary reference note on Dazai and Gomi",
      summary: "A literature-oriented Wire item to revisit for themes of guilt, interpretation, and how essays can reframe an author's work."
    },
    {
      words: ["テッセラクト", "4次元", "projection", "shadow"],
      title: "Mathematics visual reference: tesseract projection",
      summary: "A geometric visual-reference item around higher-dimensional projection, useful for motion studies and abstract visual systems."
    },
    {
      words: ["OCR", "olmocr", "レイアウト", "90言語", "benchmark"],
      title: "OCR model benchmark and layout extraction note",
      summary: "A tool-tracking entry for OCR quality, multilingual support, layout preservation, and document understanding workflows."
    },
    {
      words: ["Houdini", "Obsidian", "Node Viewer", "ノード"],
      title: "Houdini Node Viewer workflow note",
      summary: "A pipeline note about pinning node details and linking Houdini-style node inspection with an external knowledge workspace."
    },
    {
      words: ["タルコフスキー", "Tarkovsky", "ポラロイド"],
      title: "Tarkovsky Polaroid visual reference",
      summary: "A film and image-reference entry for studying atmosphere, texture, framing, and unresolved visual density."
    },
    {
      words: ["VibeVoice", "AI音声", "voice", "Microsoft", "Open-Source Frontier Voice AI"],
      title: "Open-source AI voice tool note",
      summary: "A source to review for local or open AI voice generation, voice cloning constraints, and audio-production automation."
    },
    {
      words: ["Possession", "ポゼッション", "Żuławski", "ズラフスキ"],
      title: "Film reference note on Possession",
      summary: "A film-reference item about why some works resist remake logic because their form is tied to lived trauma and performance intensity."
    },
    {
      words: ["Mussorgsky", "ムソルグスキー", "禿山", "Chernabog", "チェルナボーグ"],
      title: "Animation and music reference: Night on Bald Mountain",
      summary: "A visual and music reference for studying ominous staging, character animation, and dense atmospheric detail."
    },
    {
      words: ["book", "本", "読書", "essay", "エッセイ"],
      title: "Book and essay reference for later review",
      summary: "A reading-list Wire item that may become a library entry after source checking and short annotation."
    },
    {
      words: ["AI", "model", "LLM", "生成", "open source", "オープンソース"],
      title: "AI tool and model source note",
      summary: "A saved source on AI tooling or model behavior, queued for later classification into workflow, library, or article material."
    },
    {
      words: ["film", "映画", "cinema", "アニメーション"],
      title: "Film and moving-image reference note",
      summary: "A visual-culture Wire item to revisit for film language, animation, staging, or image-reference value."
    },
    {
      words: ["workflow", "tool", "plugin", "software", "ツール", "ソフト"],
      title: "Creative software workflow note",
      summary: "A tool or workflow source saved for later evaluation against the Knowledge Hub library and article lanes."
    }
  ];
  const matched = rules.find((rule) => includesAny(haystack, rule.words));
  if (matched) return matched;

  const compact = text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[|｜].*$/g, "")
    .trim();
  const phrase = compact.length > 0 ? compact.slice(0, 72).replace(/[。、,.]?\s*$/, "") : "";
  const source = item.author_handle || "unknown source";
  return {
    title: phrase ? `Source note from ${source}: ${phrase}${compact.length > 72 ? "..." : ""}` : `Source note from ${source}`,
    summary: "A saved Wire source queued for editorial review. Use the original link to decide whether it should become an article note, a library entry, or remain as raw context."
  };
}

function publicSummary(item) {
  const explicitSummary = firstNonEmpty(
    item.public_summary,
    item.summary_ja,
    item.summary,
    item.context_summary,
    item.context?.summary
  );
  return explicitSummary || inferWireTopic(item).summary;
}

function publicWireEntry(item) {
  const inferred = inferWireTopic(item);
  return {
    id: item.id,
    source: item.source || "x_like",
    url: item.url,
    original_url: item.original_url || item.url,
    collected_at: item.collected_at || "",
    posted_at: item.posted_at || "",
    author_handle: item.author_handle || "",
    post_kind: item.post_kind || "unknown",
    content_kinds: item.content_kinds || ["unknown"],
    domains: item.domains || ["unknown"],
    tags: item.tags || [],
    title: firstNonEmpty(item.public_title, item.title, inferred.title),
    summary: publicSummary(item),
    library_refs: item.library_refs || [],
    article_refs: item.article_refs || [],
    display: {
      original_link_required: true,
      full_text_copied: false,
      embed_allowed: publicWirePolicy.embedXPosts === true
    }
  };
}

const publicWireEntries = (wire.entries || []).map(publicWireEntry);

function entryDate(item) {
  const raw = item.posted_at || item.collected_at || wire.generated_at;
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return "Date unknown";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
    timeZoneName: "short"
  }).format(date);
}

function searchText(parts) {
  return esc(parts.filter(Boolean).join(" ").toLowerCase());
}

const QUICK_FILTER_EXCLUDE = new Set([
  "wire",
  "reference",
  "source-note",
  "legacy-blogger",
  "legacy_blogger",
  "needs-review",
  "unknown",
  "staging"
]);

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeTag(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  return tagAliasToCanonical.get(raw.toLowerCase()) || raw;
}

function displayTags(tags = []) {
  return unique(tags.map(normalizeTag).filter(Boolean))
    .filter((tag) => !QUICK_FILTER_EXCLUDE.has(tag.toLowerCase()));
}

function tagList(tags = [], { target = "", hrefBase = "" } = {}) {
  const visibleTags = displayTags(tags);
  return visibleTags.map((tag) => {
    if (hrefBase) return `<a class="tag tag-link" href="${esc(hrefBase)}?q=${encodeURIComponent(tag)}">${esc(tag)}</a>`;
    if (!target) return `<span class="tag">${esc(tag)}</span>`;
    return `<button class="tag tag-filter-button" type="button" data-filter-target="${esc(target)}" data-filter-value="${esc(tag)}">${esc(tag)}</button>`;
  }).join("");
}

function tagTimestamp(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.getTime() : 0;
}

function tagStats({ items, getTags, getDate = () => "" }) {
  const counts = new Map();
  const latest = new Map();
  for (const item of items) {
    for (const tag of displayTags(getTags(item))) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
      latest.set(tag, Math.max(latest.get(tag) || 0, tagTimestamp(getDate(item))));
    }
  }

  return [...counts.entries()].map(([tag, count]) => ({
    tag,
    count,
    latest: latest.get(tag) || 0
  }));
}

function tagButton(tag, target, className = "tag-button", count = 0) {
  const label = count ? `${tag} ${count}` : tag;
  return `<button class="${esc(className)}" type="button" data-filter-target="${esc(target)}" data-filter-value="${esc(tag)}">${esc(label)}</button>`;
}

function tagFilterPanel({ items, target, getTags, getDate, quickLimit = 14, modalId }) {
  const stats = tagStats({ items, getTags, getDate });
  const quickTags = [...stats]
    .sort((a, b) => (b.count * 10000000000000 + b.latest) - (a.count * 10000000000000 + a.latest) || a.tag.localeCompare(b.tag))
    .slice(0, quickLimit);
  const allTags = [...stats].sort((a, b) => a.tag.localeCompare(b.tag));

  if (!allTags.length) return '<p class="entry-meta">No filters yet.</p>';

  return `<div class="quick-filter-panel">
            <div class="tag-row">
${quickTags.map(({ tag }) => `              ${tagButton(tag, target)}`).join("\n")}
            </div>
            <button class="all-tags-button" type="button" data-tag-modal-open="${esc(modalId)}">All tags</button>
          </div>
          <dialog class="tag-modal" id="${esc(modalId)}">
            <div class="tag-modal-inner">
              <div class="tag-modal-header">
                <div>
                  <p class="eyebrow">All tags</p>
                  <p class="entry-meta">${esc(allTags.length)} tags available.</p>
                </div>
                <button class="modal-close" type="button" data-tag-modal-close="${esc(modalId)}">Close</button>
              </div>
              <div class="tag-modal-list">
${allTags.map(({ tag, count }) => `                ${tagButton(tag, target, "tag-button tag-modal-tag", count)}`).join("\n")}
              </div>
            </div>
          </dialog>`;
}

function nav(active, basePath = "") {
  const links = [
    ["index.html", "Home"],
    ["news.html", "Wire"],
    ["articles.html", "Articles"],
    ["library.html", "Library"],
    ["about.html", "About"]
  ];
  return links
    .map(([href, label]) => `<a${active === label ? ' class="active"' : ""} href="${basePath}${href}">${label}</a>`)
    .join("\n          ");
}

function layout({ title, active, searchId = "", searchPlaceholder = "", body, script = "", basePath = "", lang = "en" }) {
  const search = searchId
    ? `<div class="topbar-search">
        <label class="visually-hidden" for="${esc(searchId)}">${esc(searchPlaceholder)}</label>
        <input id="${esc(searchId)}" class="search-input" type="search" placeholder="${esc(searchPlaceholder)}">
      </div>`
    : '<div class="topbar-search topbar-search--placeholder" aria-hidden="true"></div>';

  return `<!doctype html>
<html lang="${esc(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="${basePath}styles.css">
  <link rel="stylesheet" href="${basePath}desk.css">
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="${basePath}index.html"><span class="brand-mark"></span> ${esc(siteName)}</a>
      ${search}
      <div class="topbar-actions">
        <nav class="topnav">
          ${nav(active, basePath)}
        </nav>
      </div>
    </div>
  </header>

  <main>
${body}
  </main>
${script}
</body>
</html>`;
}

function statusCards(cards) {
  return `<div class="status-grid compact-status-grid">
${cards.map(([label, value]) => `            <div class="status-card"><span class="status-k">${esc(label)}</span><strong>${esc(value)}</strong></div>`).join("\n")}
          </div>`;
}

function wireItem(item, options = {}) {
  const tags = displayTags([...(item.content_kinds || []), ...(item.domains || []), ...(item.tags || [])]);
  const title = firstNonEmpty(item.title, item.summary, item.author_handle, item.url, "Untitled wire entry");
  const shortTitle = title.length > 112 ? `${title.slice(0, 109)}...` : title;
  const meta = [entryDate(item), item.author_handle, item.post_kind].filter(Boolean).join(" - ");
  const haystack = searchText([title, item.summary, item.author_handle, item.url, item.post_kind, ...tags]);
  return `        <li data-search="${haystack}">
          <a href="${esc(item.url || "#")}" target="_blank" rel="noopener noreferrer">${esc(shortTitle)}</a>
          <p class="entry-meta">${esc(meta || "Metadata pending")}</p>
          <p>${esc(item.summary || "Editorial note pending.")}</p>
          ${tags.length ? `<div class="tag-row">${tagList(tags, options.home ? { hrefBase: "news.html" } : { target: "wire-filter" })}</div>` : ""}
        </li>`;
}

function libraryItem(item, options = {}) {
  const tags = displayTags(item.tags || []);
  const searchTags = displayTags([...(item.tags || []), ...(item.aliases || []), item.kind]);
  const title = item.title || "Untitled library item";
  const haystack = searchText([title, item.kind, item.description, ...searchTags]);
  return `        <li data-search="${haystack}">
          <a href="${esc(item.url || "#")}">${esc(title)}</a>
          <p class="entry-meta">${esc(item.kind || "Reference")}</p>
          <p>${esc(item.description || "Description pending.")}</p>
          ${tags.length ? `<div class="tag-row">${tagList(tags, options.home ? { hrefBase: "library.html" } : { target: "library-filter" })}</div>` : ""}
        </li>`;
}

function articleItem(article) {
  const summary = article.paragraphs.find((paragraph) => paragraph && paragraph.trim()) || "Article note pending.";
  const tags = displayTags(article.tags || []);
  const search = searchText([article.title, article.published_at, article.updated_at, article.source_file, article.source_url, ...tags, ...article.paragraphs]);
  const href = article.detail_url || article.source_url || "#";
  return `        <li data-search="${search}">
          <a href="${esc(href)}">${esc(article.title)}</a>
          <p class="entry-meta">Published ${esc(article.published_at)} - Updated ${esc(article.updated_at)}</p>
          <p>${esc(summary.length > 280 ? `${summary.slice(0, 277)}...` : summary)}</p>
          ${tags.length ? `<div class="tag-row">${tagList(tags, { target: "articles-filter" })}</div>` : ""}
        </li>`;
}

function filterScript(kind) {
  const inputId = `${kind}-filter`;
  const listId = `${kind}-list`;
  const summaryId = `${kind}-filter-summary`;
  return `  <script>
    const input = document.getElementById('${inputId}');
    const summary = document.getElementById('${summaryId}');
    const items = Array.from(document.querySelectorAll('#${listId} li'));

    function filterList() {
      const q = input.value.trim().toLowerCase();
      let visible = 0;
      items.forEach((item) => {
        const haystack = ((item.dataset.search || '') + ' ' + item.innerText.toLowerCase());
        const match = !q || haystack.includes(q);
        item.style.display = match ? '' : 'none';
        if (match) visible += 1;
      });
      summary.textContent = q ? \`Showing \${visible} matching entr\${visible === 1 ? 'y' : 'ies'}.\` : 'Showing all ${kind} entries.';
    }

    const initialQuery = new URLSearchParams(window.location.search).get('q');
    if (initialQuery) input.value = initialQuery;
    input.addEventListener('input', filterList);
    document.querySelectorAll('[data-filter-target]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = document.getElementById(button.dataset.filterTarget);
        if (!target) return;
        target.value = button.dataset.filterValue || '';
        target.dispatchEvent(new Event('input'));
        target.focus();
        button.closest('dialog')?.close();
      });
    });
    document.querySelectorAll('[data-tag-modal-open]').forEach((button) => {
      button.addEventListener('click', () => {
        const modal = document.getElementById(button.dataset.tagModalOpen);
        if (modal?.showModal) modal.showModal();
      });
    });
    document.querySelectorAll('[data-tag-modal-close]').forEach((button) => {
      button.addEventListener('click', () => {
        document.getElementById(button.dataset.tagModalClose)?.close();
      });
    });
    document.querySelectorAll('dialog.tag-modal').forEach((modal) => {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.close();
      });
    });
    filterList();
  </script>
`;
}

function lazyXEmbedScript() {
  return `  <script>
    let xWidgetsLoading = false;
    let xWidgetsLoaded = false;

    function loadXWidgets() {
      if (xWidgetsLoaded) {
        window.twttr?.widgets?.load();
        return;
      }
      if (xWidgetsLoading) return;
      xWidgetsLoading = true;
      const script = document.createElement('script');
      script.src = 'https://platform.twitter.com/widgets.js';
      script.async = true;
      script.charset = 'utf-8';
      script.onload = () => {
        xWidgetsLoaded = true;
        window.twttr?.widgets?.load();
      };
      document.body.appendChild(script);
    }

    const embeds = Array.from(document.querySelectorAll('.lazy-x-embed[data-x-url]'));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const block = entry.target;
        observer.unobserve(block);
        const url = block.dataset.xUrl;
        block.innerHTML = '<blockquote class="twitter-tweet" data-dnt="true"><a href="' + url.replace('https://x.com/', 'https://twitter.com/') + '"></a></blockquote>';
        loadXWidgets();
      });
    }, { rootMargin: '280px 0px' });

    embeds.forEach((embed) => observer.observe(embed));
  </script>
`;
}

function articleDetailBody(article) {
  const meta = `Published ${esc(article.published_at)} - Updated ${esc(article.updated_at)}`;
  const sourceLink = article.source_url
    ? `<p class="entry-meta"><a href="${esc(article.source_url)}" target="_blank" rel="noopener noreferrer">Open original source</a></p>`
    : "";
  const body = article.legacy_html
    ? article.legacy_html
    : article.paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("\n");

  return `    <article class="article-detail">
      <header class="hero">
        <div class="hero-heading">
          <p class="eyebrow">Article</p>
          <h1>${esc(article.title)}</h1>
          <p class="article-meta">${esc(meta)}</p>
          <div class="tag-row">${tagList(article.tags)}</div>
          ${sourceLink}
        </div>
      </header>

      <section class="article-body legacy-article-body">
${body}
      </section>

      <footer class="footer"><p><a href="../articles.html">Back to Articles</a></p></footer>
    </article>`;
}

const latestWire = publicWireEntries.slice(0, 4).map((item) => wireItem(item, { home: true })).join("\n") || "        <li><p>No wire entries yet.</p></li>";
const latestLibrary = library.items.slice(0, 4).map((item) => libraryItem(item, { home: true })).join("\n") || "        <li><p>No library entries yet.</p></li>";

const indexHtml = layout({
  title: siteName,
  active: "Home",
  body: `    <section class="hero">
      <div class="hero-grid">
        <div class="hero-heading">
          <p class="eyebrow">Personal reference desk</p>
          <h1>${esc(siteName)}</h1>
          <p class="lead">${esc(config.siteDeck || "A compact hub for wire captures, follow-up article notes, and durable references.")}</p>
        </div>
        <aside class="hero-aside status-panel">
          <p class="eyebrow">Status</p>
${statusCards([
  ["Updated", now.toISOString().slice(0, 10)],
  ["Wire entries", String(publicWireEntries.length)],
  ["Articles", String(ARTICLES.length)],
  ["Library items", String(library.items.length)]
])}
        </aside>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Recent wire</h2><p>Latest captured signals before they become judged notes.</p></div>
      <ul class="compact-list" id="home-wire-list">
${latestWire}
      </ul>
    </section>

    <section class="section">
      <div class="section-head"><h2>Reference shelf</h2><p>Durable items promoted from the wire lane and editorial notes.</p></div>
      <ul class="compact-list">
${latestLibrary}
      </ul>
    </section>

    <footer class="footer"><p><a href="news.html">Wire</a> is the raw lane. <a href="articles.html">Articles</a> is the judged lane. <a href="library.html">Library</a> is the reference lane.</p></footer>`
});

const wireHtml = layout({
  title: `${siteName} Wire`,
  active: "Wire",
  searchId: "wire-filter",
  searchPlaceholder: "Filter wire list",
  body: `    <section class="hero">
      <div class="hero-grid">
        <div class="hero-heading">
          <h1>${esc(siteName)} Wire</h1>
          <p class="lead">Raw source captures stay link-first and summary-first. Full post text is not copied into the public page.</p>
        </div>
        <aside class="hero-aside status-panel">
          <p class="eyebrow">Quick filters</p>
${tagFilterPanel({
  items: publicWireEntries,
  target: "wire-filter",
  modalId: "wire-tag-modal",
  quickLimit: 14,
  getTags: (item) => [...(item.content_kinds || []), ...(item.domains || []), ...(item.tags || [])],
  getDate: (item) => item.posted_at || item.collected_at
})}
        </aside>
      </div>
    </section>

    <section class="section">
      <p class="search-summary" id="wire-filter-summary">Showing all wire entries.</p>
      <ul class="compact-list" id="wire-list">
${publicWireEntries.map(wireItem).join("\n") || "        <li><p>No wire entries yet.</p></li>"}
      </ul>
    </section>

    <footer class="footer"><p><a href="articles.html">Articles</a> is where selected wire entries become judged notes. <a href="library.html">Library</a> is the durable reference shelf.</p></footer>`,
  script: filterScript("wire")
});

const articlesHtml = layout({
  title: `${siteName} Articles`,
  active: "Articles",
  searchId: "articles-filter",
  searchPlaceholder: "Filter articles",
  body: `    <section class="hero">
      <div class="hero-grid">
        <div class="hero-heading">
          <h1>${esc(siteName)} Articles</h1>
          <p class="lead">Patterns, comparisons, and production notes developed from the wire lane.</p>
        </div>
        <aside class="hero-aside status-panel">
          <p class="eyebrow">Quick filters</p>
${tagFilterPanel({
  items: ARTICLES,
  target: "articles-filter",
  modalId: "articles-tag-modal",
  quickLimit: 12,
  getTags: (item) => item.tags || [],
  getDate: (item) => item.updated_at || item.published_at
})}
        </aside>
      </div>
    </section>

    <section class="section">
      <p class="search-summary" id="articles-filter-summary">Showing all articles entries.</p>
      <ul class="compact-list" id="articles-list">
${ARTICLES.map(articleItem).join("\n")}
      </ul>
    </section>

    <footer class="footer"><p><a href="news.html">Wire</a> keeps the source pool available while this lane develops.</p></footer>`,
  script: filterScript("articles")
});

const libraryHtml = layout({
  title: `${siteName} Library`,
  active: "Library",
  searchId: "library-filter",
  searchPlaceholder: "Filter library list",
  body: `    <section class="hero">
      <div class="hero-grid">
        <div class="hero-heading">
          <h1>${esc(siteName)} Library</h1>
          <p class="lead">A flat reference list for books, films, software, plugins, workflows, tutorials, and recurring source material.</p>
        </div>
        <aside class="hero-aside status-panel">
          <p class="eyebrow">Quick filters</p>
${tagFilterPanel({
  items: library.items,
  target: "library-filter",
  modalId: "library-tag-modal",
  quickLimit: 10,
  getTags: (item) => item.tags || []
})}
        </aside>
      </div>
    </section>

    <section class="section">
      <p class="search-summary" id="library-filter-summary">Showing all library entries.</p>
      <ul class="compact-list" id="library-list">
${library.items.map(libraryItem).join("\n") || "        <li><p>No library entries yet.</p></li>"}
      </ul>
    </section>

    <footer class="footer"><p><a href="news.html">Wire</a> is the source lane. <a href="articles.html">Articles</a> is the judged lane.</p></footer>`,
  script: filterScript("library")
});

const aboutHtml = layout({
  title: `About ${siteName}`,
  active: "About",
  body: `    <section class="hero">
      <div class="hero-grid">
        <div class="hero-heading">
          <h1>About ${esc(siteName)}</h1>
          <p class="lead">This site is a personal knowledge hub built from append-only captures. It keeps raw links, synthesis candidates, and durable references in separate lanes.</p>
        </div>
        <aside class="hero-aside status-panel">
          <p class="eyebrow">Policy</p>
${statusCards([
  ["Raw source", config.sourcePolicy?.primaryWireSource || "x_likes"],
  ["Original links", config.sourcePolicy?.keepOriginalLinks ? "kept" : "review"],
  ["Public wire", "summary-only"],
  ["Ranking text", "metadata only"]
])}
        </aside>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Operating model</h2><p>Wire is a first-pass capture lane. Articles and Library are built through follow-up review.</p></div>
      <ul class="compact-list">
        <li><a href="news.html">Wire</a><p>Original links and public summaries remain visible for later judgement.</p></li>
        <li><a href="articles.html">Articles</a><p>Synthesis notes and judged writing are separated from raw capture.</p></li>
        <li><a href="library.html">Library</a><p>Durable books, films, tools, workflows, tutorials, and references are kept in a flat shelf.</p></li>
      </ul>
    </section>

    <footer class="footer"><p>The site style follows Autograph Hub. The topic model remains specific to Knowledge Hub.</p></footer>`
});

const articleDir = path.join("public", "articles");
fs.rmSync(articleDir, { recursive: true, force: true });
fs.mkdirSync(articleDir, { recursive: true });

for (const article of ARTICLES) {
  const detailHtml = layout({
    title: `${article.title} - ${siteName}`,
    active: "Articles",
    basePath: "../",
    lang: article.legacy_html ? "ja" : "en",
    body: articleDetailBody(article),
    script: article.legacy_html ? lazyXEmbedScript() : ""
  });
  fs.writeFileSync(path.join(articleDir, `${article.slug}.html`), detailHtml, "utf8");
}

fs.writeFileSync(path.join("public", "index.html"), indexHtml, "utf8");
fs.writeFileSync(path.join("public", "wire.html"), wireHtml, "utf8");
fs.writeFileSync(path.join("public", "news.html"), wireHtml, "utf8");
fs.writeFileSync(path.join("public", "wire-v2.html"), wireHtml, "utf8");
fs.writeFileSync(path.join("public", "wire-app.html"), wireHtml, "utf8");
fs.writeFileSync(path.join("public", "articles.html"), articlesHtml, "utf8");
fs.writeFileSync(path.join("public", "library.html"), libraryHtml, "utf8");
fs.writeFileSync(path.join("public", "offers.html"), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=library.html">
  <link rel="canonical" href="library.html">
  <title>Library moved</title>
</head>
<body>
  <p>Library moved to <a href="library.html">library.html</a>.</p>
</body>
</html>`, "utf8");
fs.writeFileSync(path.join("public", "about.html"), aboutHtml, "utf8");

writeJson("public/wire.json", {
  generated_at: new Date().toISOString(),
  policy: {
    full_text_copied: false,
    original_link_required: true,
    embed_x_posts: publicWirePolicy.embedXPosts === true
  },
  entries: publicWireEntries
});
writeJson("public/library.json", library);
writeJson("public/tag-taxonomy.json", tagTaxonomy);

const safeWireMarkdown = [
  "# Knowledge Hub Wire",
  "",
  `Generated: ${new Date().toISOString()}`,
  "Source: public summary layer",
  `Count: ${publicWireEntries.length}`,
  "",
  "Public summary archive. Full post text is not copied into this file.",
  "",
  ...publicWireEntries.map((item) => [
    `## ${item.title || item.author_handle || "Unknown source"}`,
    "",
    `- Source: ${item.author_handle || "unknown"}`,
    `- URL: ${item.url || ""}`,
    `- Posted: ${item.posted_at || "unknown"}`,
    `- Collected: ${item.collected_at || "unknown"}`,
    `- Tags: ${[...(item.content_kinds || []), ...(item.domains || []), ...(item.tags || [])].filter((tag) => tag && tag !== "unknown").join(", ") || "none"}`,
    "",
    item.summary || "Editorial note pending.",
    ""
  ].join("\n"))
].join("\n");

const safeWireNdjson = publicWireEntries
  .map((item) => JSON.stringify(item))
  .join("\n");

const tagTaxonomyMarkdown = [
  "# Knowledge Hub Tag Taxonomy",
  "",
  ...(tagTaxonomy.tags || []).map((item) => [
    `## ${item.tag}`,
    "",
    item.definition || "Definition pending.",
    ""
  ].join("\n"))
].join("\n") || "# Knowledge Hub Tag Taxonomy\n\nNo tags defined yet.\n";

fs.writeFileSync(path.join("public", "wire.md"), safeWireMarkdown, "utf8");
fs.writeFileSync(path.join("public", "wire.ndjson"), safeWireNdjson, "utf8");
fs.writeFileSync(path.join("public", "tag-taxonomy.md"), tagTaxonomyMarkdown, "utf8");
fs.writeFileSync(path.join("public", "llms.txt"), [
  "# Knowledge Hub",
  "",
  "Machine-readable resources:",
  "- wire.md",
  "- wire.json",
  "- wire.ndjson",
  "- tag-taxonomy.md",
  "- tag-taxonomy.json",
  "- articles.html",
  "- library.html",
  ""
].join("\n"), "utf8");

console.log(`Built ${siteName} static site into public/.`);
console.log(`Public Wire entries: ${publicWireEntries.length}`);
console.log(`Library entries: ${library.items.length}`);
console.log(`X embed enabled: ${publicWirePolicy.embedXPosts === true}`);
