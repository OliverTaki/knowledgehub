import { readJsonl, writeJson } from "./lib/jsonl.mjs";

const raw = readJsonl("data/raw/x_likes.jsonl");

const entries = raw.map((item) => ({
  id: `x_${item.status_id}`,
  source: item.source || "x_like",
  url: item.url,
  original_url: item.url,
  collected_at: item.collected_at || "",
  posted_at: item.posted_at || "",
  author_handle: item.author_handle || "",
  text: item.text || "",
  media: item.media || [],
  related_status_urls: item.related_status_urls || [],
  post_kind: "unknown",
  content_kinds: ["unknown"],
  domains: ["unknown"],
  tags: [],
  library_refs: [],
  article_refs: [],
  context: {
    needs_context_review: true,
    needs_reply_parent_review: true,
    needs_followup_research: true,
    notes: []
  },
  policy: {
    keep_original_link: true,
    append_only: true
  }
}));

writeJson("data/processed/wire.json", {
  generated_at: new Date().toISOString(),
  count: entries.length,
  entries
});

writeJson("content/wire/index.json", entries);

const librarySeed = {
  generated_at: new Date().toISOString(),
  policy: {
    flat_hierarchy: true,
    multi_tag_filtering: true,
    ranking_copy_policy: "Do not copy ranking text. Store ranking source and position as metadata."
  },
  items: []
};

writeJson("data/processed/library_seed.json", librarySeed);

console.log(`Built wire with ${entries.length} entries.`);
