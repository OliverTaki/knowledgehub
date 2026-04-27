import { readJsonl, writeJson } from "./lib/jsonl.mjs";

const raw = readJsonl("data/raw/x_likes.jsonl");

function publicSummary() {
  return "要約未作成。元リンクを参照してください。";
}

const entries = raw.map((item) => ({
  id: `x_${item.status_id}`,
  source: item.source || "x_like",
  url: item.url,
  original_url: item.url,
  collected_at: item.collected_at || "",
  posted_at: item.posted_at || "",
  author_handle: item.author_handle || "",
  title: "Source note for later classification",
  summary: publicSummary(),
  public_summary: publicSummary(),
  post_kind: "unknown",
  content_kinds: ["reference"],
  domains: ["uncategorized"],
  tags: ["needs-review", "reference", "wire"],
  library_refs: [],
  article_refs: [],
  context: {
    needs_context_review: true,
    needs_reply_parent_review: true,
    needs_followup_research: true,
    notes: ["raw_text_is_kept_only_in_data_raw_x_likes_jsonl"]
  },
  policy: {
    keep_original_link: true,
    append_only: true,
    full_text_copied: false,
    public_safe: true
  }
}));

writeJson("data/processed/wire.json", {
  generated_at: new Date().toISOString(),
  count: entries.length,
  policy: {
    full_text_copied: false,
    original_link_required: true,
    note: "Processed Wire is public-safe. Raw X text remains only in data/raw/x_likes.jsonl."
  },
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

console.log(`Built public-safe wire with ${entries.length} entries.`);
