import fs from "node:fs";
import path from "node:path";
import { readJson } from "./lib/jsonl.mjs";

const config = readJson("config/site.config.json", { siteName: "Knowledge Hub" });
const librarySource = readJson("data/processed/library_seed.json", { items: [] });
const siteName = config.siteName || "Knowledge Hub";
const now = new Date();

fs.mkdirSync("public", { recursive: true });
fs.mkdirSync("public/library", { recursive: true });

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(value, fallback = "library-entry") {
  const slug = String(value || fallback)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
  return slug || fallback;
}

function itemSlug(item) {
  return item.slug || slugify(item.title);
}

function itemHref(item, basePath = "") {
  return `${basePath}library/${itemSlug(item)}.html`;
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

function layout({ title, active = "Library", body, script = "", basePath = "" }) {
  const search = basePath
    ? '<div class="topbar-search topbar-search--placeholder" aria-hidden="true"></div>'
    : `<div class="topbar-search">
        <label class="visually-hidden" for="library-filter">Filter library concepts</label><input id="library-filter" class="search-input" type="search" placeholder="Filter library concepts">
      </div>`;

  return `<!doctype html>
<html lang="en">
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

function displayTags(tags = []) {
  return [...new Set((tags || []).filter(Boolean))];
}

function tagRow(tags = [], { target = "", hrefBase = "" } = {}) {
  const visible = displayTags(tags);
  if (!visible.length) return "";
  return `<div class="tag-row">${visible.map((tag) => {
    if (hrefBase) return `<a class="tag tag-link" href="${esc(hrefBase)}?q=${encodeURIComponent(tag)}">${esc(tag)}</a>`;
    if (target) return `<button class="tag tag-filter-button" type="button" data-filter-target="${esc(target)}" data-filter-value="${esc(tag)}">${esc(tag)}</button>`;
    return `<span class="tag">${esc(tag)}</span>`;
  }).join("")}</div>`;
}

function allTags(items) {
  const counts = new Map();
  for (const item of items) {
    for (const tag of displayTags(item.tags)) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

function quickFilterPanel(items) {
  const tags = allTags(items);
  if (!tags.length) return '<p class="entry-meta">No filters yet.</p>';
  const quick = tags.slice(0, 14);
  return `<div class="quick-filter-panel">
            <div class="tag-row">
${quick.map(({ tag }) => `              <button class="tag-button" type="button" data-filter-target="library-filter" data-filter-value="${esc(tag)}">${esc(tag)}</button>`).join("\n")}
            </div>
            <button class="all-tags-button" type="button" data-tag-modal-open="library-tag-modal">All tags</button>
          </div>
          <dialog class="tag-modal" id="library-tag-modal">
            <div class="tag-modal-inner">
              <div class="tag-modal-header">
                <div>
                  <p class="eyebrow">All tags</p>
                  <p class="entry-meta">${esc(tags.length)} tags available.</p>
                </div>
                <button class="modal-close" type="button" data-tag-modal-close="library-tag-modal">Close</button>
              </div>
              <div class="tag-modal-list">
${tags.map(({ tag, count }) => `                <button class="tag-button tag-modal-tag" type="button" data-filter-target="library-filter" data-filter-value="${esc(tag)}">${esc(tag)} ${count}</button>`).join("\n")}
              </div>
            </div>
          </dialog>`;
}

function libraryListItem(item) {
  const tags = displayTags(item.tags);
  const search = esc([item.title, item.kind, item.description, ...(item.tags || [])].filter(Boolean).join(" ").toLowerCase());
  return `        <li data-search="${search}">
          <a href="${esc(itemHref(item))}">${esc(item.title || "Untitled library concept")}</a>
          <p class="entry-meta">${esc(item.kind || "Library / Concept")}</p>
          <p>${esc(item.description || "Description pending.")}</p>
          ${tagRow(tags, { target: "library-filter" })}
        </li>`;
}

function articleRefs(refs = []) {
  const visible = refs.filter((ref) => ref && ref.title);
  if (!visible.length) return "";
  return `<section class="section">
        <div class="section-head"><h2>Related Articles</h2><p>Article notes that feed this Library concept.</p></div>
        <ul class="compact-list">
${visible.map((ref) => `          <li><a href="${esc(ref.href || "#")}">${esc(ref.title)}</a>${ref.note ? `<p>${esc(ref.note)}</p>` : ""}</li>`).join("\n")}
        </ul>
      </section>`;
}

function sourceRefs(refs = []) {
  const visible = refs.filter((ref) => ref && ref.title);
  if (!visible.length) return "";
  return `<section class="section">
        <div class="section-head"><h2>Sources</h2><p>External source references kept below the concept, not as the concept itself.</p></div>
        <ul class="compact-list">
${visible.map((ref) => `          <li><a href="${esc(ref.href || "#")}" target="_blank" rel="noopener noreferrer">${esc(ref.title)}</a>${ref.note ? `<p>${esc(ref.note)}</p>` : ""}</li>`).join("\n")}
        </ul>
      </section>`;
}

function sectionBlocks(sections = []) {
  return sections
    .filter((section) => section && (section.heading || section.body))
    .map((section) => `<section class="section">
        <div class="section-head"><h2>${esc(section.heading || "Note")}</h2><p>${esc(section.body || "")}</p></div>
      </section>`)
    .join("\n");
}

function recommendationGroups(groups = []) {
  const visible = groups.filter((group) => group && group.title && Array.isArray(group.items) && group.items.length);
  if (!visible.length) return "";
  return `<section class="section">
        <div class="section-head"><h2>Recommendation Map</h2><p>Grouped books, films, or references that should accumulate into one reusable shelf.</p></div>
        <div class="learning-path">
${visible.map((group) => `          <div class="learning-step">
            <strong>${esc(group.title)}</strong>
            <ul class="compact-list">
${group.items.map((item) => `              <li><p>${esc(item)}</p></li>`).join("\n")}
            </ul>
          </div>`).join("\n")}
        </div>
      </section>`;
}

function detailPage(item) {
  const tags = displayTags(item.tags);
  const body = `    <article class="article-detail">
      <header class="hero">
        <div class="hero-heading">
          <p class="eyebrow">${esc(item.kind || "Library / Concept")}</p>
          <h1>${esc(item.title || "Untitled library concept")}</h1>
          <p class="lead">${esc(item.description || "Description pending.")}</p>
          ${tagRow(tags)}
        </div>
      </header>

      ${sectionBlocks(item.sections || [])}
      ${recommendationGroups(item.recommendation_groups || [])}
      ${articleRefs(item.article_refs || [])}
      ${sourceRefs(item.source_refs || [])}

      <footer class="footer"><p><a href="../library.html">Back to Library</a></p></footer>
    </article>`;
  return layout({ title: `${item.title || "Library"} - ${siteName}`, active: "Library", body, basePath: "../" });
}

function filterScript() {
  return `  <script>
    const input = document.getElementById('library-filter');
    const summary = document.getElementById('library-filter-summary');
    const items = Array.from(document.querySelectorAll('#library-list li'));
    function filterList() {
      const params = new URLSearchParams(window.location.search);
      const urlQuery = params.get('q') || '';
      if (urlQuery && !input.value) input.value = urlQuery;
      const q = input.value.trim().toLowerCase();
      let visible = 0;
      items.forEach((item) => {
        const haystack = ((item.dataset.search || '') + ' ' + item.innerText.toLowerCase());
        const match = !q || haystack.includes(q);
        item.style.display = match ? '' : 'none';
        if (match) visible += 1;
      });
      summary.textContent = q ? \`Showing \${visible} matching concept\${visible === 1 ? '' : 's'}.\` : 'Showing all library concepts.';
    }
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

const items = Array.isArray(librarySource.items) ? librarySource.items : [];
const libraryHtml = layout({
  title: `${siteName} Library`,
  active: "Library",
  body: `    <section class="hero">
      <div class="hero-grid">
        <div class="hero-heading">
          <h1>${esc(siteName)} Library</h1>
          <p class="lead">Concept-level wiki pages distilled from Articles. Library is where repeated notes become reusable knowledge, grouped references, and book/film recommendation maps.</p>
        </div>
        <aside class="hero-aside status-panel">
          <p class="eyebrow">Quick filters</p>
${quickFilterPanel(items)}
        </aside>
      </div>
    </section>

    <section class="section">
      <p class="search-summary" id="library-filter-summary">Showing all library concepts.</p>
      <ul class="compact-list" id="library-list">
${items.map(libraryListItem).join("\n") || "        <li><p>No library concepts yet.</p></li>"}
      </ul>
    </section>

    <footer class="footer"><p>Library entries are concept pages. External links and raw source material remain secondary to the summarized idea.</p></footer>`,
  script: filterScript()
});

fs.writeFileSync("public/library.html", libraryHtml);
fs.writeFileSync("public/offers.html", `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=library.html">
  <link rel="canonical" href="library.html">
  <title>Redirecting to Knowledge Hub Library</title>
</head>
<body>
  <p><a href="library.html">Library has moved to library.html.</a></p>
</body>
</html>
`);

for (const item of items) {
  fs.writeFileSync(path.join("public", "library", `${itemSlug(item)}.html`), detailPage(item));
}

console.log(`Generated ${items.length} library concept pages at ${now.toISOString()}.`);
