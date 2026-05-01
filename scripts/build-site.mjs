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

const ARTICLES = [
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

const library = {
  ...librarySource,
  items: Array.isArray(librarySource.items) && librarySource.items.length > 0 ? librarySource.items : DEFAULT_LIBRARY_ITEMS
};
const tagTaxonomy = readJson("data/tag-taxonomy.json", { tags: [] });

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

function publicSummary(item) {
  return firstNonEmpty(
    item.public_summary,
    item.summary_ja,
    item.summary,
    item.context_summary,
    item.context?.summary
  ) || publicWirePolicy.summaryFallback || "Editorial note pending. Follow the source link for the original post.";
}

function publicWireEntry(item) {
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

function tagList(tags = []) {
  return tags.filter(Boolean).map((tag) => `<span class="tag">${esc(tag)}</span>`).join("");
}

function nav(active) {
  const links = [
    ["index.html", "Home"],
    ["news.html", "Wire"],
    ["articles.html", "Articles"],
    ["offers.html", "Library"],
    ["about.html", "About"]
  ];
  return links
    .map(([href, label]) => `<a${active === label ? ' class="active"' : ""} href="${href}">${label}</a>`)
    .join("\n          ");
}

function layout({ title, active, searchId = "", searchPlaceholder = "", body, script = "" }) {
  const search = searchId
    ? `<div class="topbar-search">
        <label class="visually-hidden" for="${esc(searchId)}">${esc(searchPlaceholder)}</label>
        <input id="${esc(searchId)}" class="search-input" type="search" placeholder="${esc(searchPlaceholder)}">
      </div>`
    : '<div class="topbar-search topbar-search--placeholder" aria-hidden="true"></div>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="styles.css">
  <link rel="stylesheet" href="desk.css">
</head>
<body>
  <header class="topbar">
    <div class="topbar-inner">
      <a class="brand" href="index.html"><span class="brand-mark"></span> ${esc(siteName)}</a>
      ${search}
      <div class="topbar-actions">
        <nav class="topnav">
          ${nav(active)}
        </nav>
        <div class="language-toggle" role="group" aria-label="Display language">
          <button class="language-button" type="button" aria-pressed="true">EN</button>
          <button class="language-button" type="button" aria-pressed="false">JP</button>
        </div>
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

function wireItem(item) {
  const tags = [...(item.content_kinds || []), ...(item.domains || []), ...(item.tags || [])].filter((tag) => tag && tag !== "unknown");
  const title = firstNonEmpty(item.summary, item.author_handle, item.url, "Untitled wire entry");
  const shortTitle = title.length > 112 ? `${title.slice(0, 109)}...` : title;
  const meta = [entryDate(item), item.author_handle, item.post_kind].filter(Boolean).join(" - ");
  const haystack = searchText([title, item.summary, item.author_handle, item.url, item.post_kind, ...tags]);
  return `        <li data-search="${haystack}">
          <a href="${esc(item.url || "#")}" target="_blank" rel="noopener noreferrer">${esc(shortTitle)}</a>
          <p class="entry-meta">${esc(meta || "Metadata pending")}</p>
          <p>${esc(item.summary || "Editorial note pending.")}</p>
          ${tags.length ? `<div class="tag-row">${tagList(tags)}</div>` : ""}
        </li>`;
}

function libraryItem(item) {
  const tags = [...(item.tags || []), ...(item.aliases || []), item.kind].filter(Boolean);
  const title = item.title || "Untitled library item";
  const haystack = searchText([title, item.kind, item.description, ...tags]);
  return `        <li data-search="${haystack}">
          <a href="${esc(item.url || "#")}">${esc(title)}</a>
          <p class="entry-meta">${esc(item.kind || "Reference")}</p>
          <p>${esc(item.description || "Description pending.")}</p>
          ${item.tags?.length ? `<div class="tag-row">${tagList(item.tags)}</div>` : ""}
        </li>`;
}

function articleItem(article) {
  const search = searchText([article.title, article.published_at, article.updated_at, ...article.tags, ...article.paragraphs]);
  return `        <li data-search="${search}">
          <a href="#">${esc(article.title)}</a>
          <p class="entry-meta">Published ${esc(article.published_at)} - Updated ${esc(article.updated_at)}</p>
          ${article.paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("\n          ")}
          <div class="tag-row">${tagList(article.tags)}</div>
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

    input.addEventListener('input', filterList);
    document.querySelectorAll('[data-filter-target]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = document.getElementById(button.dataset.filterTarget);
        if (!target) return;
        target.value = button.dataset.filterValue || '';
        target.dispatchEvent(new Event('input'));
        target.focus();
      });
    });
  </script>
`;
}

const latestWire = publicWireEntries.slice(0, 4).map(wireItem).join("\n") || "        <li><p>No wire entries yet.</p></li>";
const latestLibrary = library.items.slice(0, 4).map(libraryItem).join("\n") || "        <li><p>No library entries yet.</p></li>";

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

    <footer class="footer"><p><a href="news.html">Wire</a> is the raw lane. <a href="articles.html">Articles</a> is the judged lane. <a href="offers.html">Library</a> is the reference lane.</p></footer>`
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
          <div class="tag-row">
            <button class="tag-button" type="button" data-filter-target="wire-filter" data-filter-value="ai_tools">AI tools</button>
            <button class="tag-button" type="button" data-filter-target="wire-filter" data-filter-value="software">Software</button>
            <button class="tag-button" type="button" data-filter-target="wire-filter" data-filter-value="workflow">Workflow</button>
            <button class="tag-button" type="button" data-filter-target="wire-filter" data-filter-value="books">Books</button>
            <button class="tag-button" type="button" data-filter-target="wire-filter" data-filter-value="motion_design">Motion</button>
          </div>
        </aside>
      </div>
    </section>

    <section class="section">
      <p class="search-summary" id="wire-filter-summary">Showing all wire entries.</p>
      <ul class="compact-list" id="wire-list">
${publicWireEntries.map(wireItem).join("\n") || "        <li><p>No wire entries yet.</p></li>"}
      </ul>
    </section>

    <footer class="footer"><p><a href="articles.html">Articles</a> is where selected wire entries become judged notes. <a href="offers.html">Library</a> is the durable reference shelf.</p></footer>`,
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
          <p class="eyebrow">Status</p>
${statusCards([
  ["Published", String(ARTICLES.length)],
  ["Source lane", "Wire"],
  ["Mode", "summary-first"],
  ["Next", "promote notes"]
])}
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
          <div class="tag-row">
            <button class="tag-button" type="button" data-filter-target="library-filter" data-filter-value="book">Books</button>
            <button class="tag-button" type="button" data-filter-target="library-filter" data-filter-value="film">Films</button>
            <button class="tag-button" type="button" data-filter-target="library-filter" data-filter-value="software">Software</button>
            <button class="tag-button" type="button" data-filter-target="library-filter" data-filter-value="workflow">Workflow</button>
            <button class="tag-button" type="button" data-filter-target="library-filter" data-filter-value="rendering">Rendering</button>
          </div>
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
        <li><a href="offers.html">Library</a><p>Durable books, films, tools, workflows, tutorials, and references are kept in a flat shelf.</p></li>
      </ul>
    </section>

    <footer class="footer"><p>The site style follows Autograph Hub. The topic model remains specific to Knowledge Hub.</p></footer>`
});

fs.writeFileSync(path.join("public", "index.html"), indexHtml, "utf8");
fs.writeFileSync(path.join("public", "wire.html"), wireHtml, "utf8");
fs.writeFileSync(path.join("public", "news.html"), wireHtml, "utf8");
fs.writeFileSync(path.join("public", "wire-v2.html"), wireHtml, "utf8");
fs.writeFileSync(path.join("public", "wire-app.html"), wireHtml, "utf8");
fs.writeFileSync(path.join("public", "articles.html"), articlesHtml, "utf8");
fs.writeFileSync(path.join("public", "library.html"), libraryHtml, "utf8");
fs.writeFileSync(path.join("public", "offers.html"), libraryHtml, "utf8");
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
    `## ${item.author_handle || "Unknown source"} - ${item.id || "untitled"}`,
    "",
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
  "- offers.html",
  ""
].join("\n"), "utf8");

console.log(`Built ${siteName} static site into public/.`);
console.log(`Public Wire entries: ${publicWireEntries.length}`);
console.log(`Library entries: ${library.items.length}`);
console.log(`X embed enabled: ${publicWirePolicy.embedXPosts === true}`);
