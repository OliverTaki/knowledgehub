import { readJsonl, writeJson } from "./lib/jsonl.mjs";

const raw = readJsonl("data/raw/x_likes.jsonl");

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

  const compact = text.replace(/https?:\/\/\S+/g, "").replace(/[|｜].*$/g, "").trim();
  const phrase = compact.length > 0 ? compact.slice(0, 72).replace(/[。、,.]?\s*$/, "") : "";
  const source = item.author_handle || "unknown source";
  return {
    title: phrase ? `Source note from ${source}: ${phrase}${compact.length > 72 ? "..." : ""}` : `Source note from ${source}`,
    summary: "A saved Wire source queued for editorial review. Use the original link to decide whether it should become an article note, a library entry, or remain as raw context."
  };
}

const entries = raw.map((item) => {
  const inferred = inferWireTopic(item);
  return {
    id: `x_${item.status_id}`,
    source: item.source || "x_like",
    url: item.url,
    original_url: item.url,
    collected_at: item.collected_at || "",
    posted_at: item.posted_at || "",
    author_handle: item.author_handle || "",
    title: inferred.title,
    summary: inferred.summary,
    public_summary: inferred.summary,
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
  };
});

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
