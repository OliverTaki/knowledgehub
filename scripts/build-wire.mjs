import { readJson, readJsonl, writeJson } from "./lib/jsonl.mjs";

const raw = readJsonl("data/raw/x_likes.jsonl");
const legacyBloggerWire = readJson("data/legacy-blogger-wire.json", { entries: [] });

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
      words: ["FXTags", "fxtags.com"],
      title: "FXTags effects reference source",
      summary: "A visual-effects reference source to revisit when a production task needs searchable examples of impact, distortion, emission, residue, or environmental behavior."
    },
    {
      words: ["ColorfulEcho", "afterimage", "echo", "AEプラグイン"],
      title: "ColorfulEcho After Effects plugin note",
      summary: "An After Effects plugin source for color-assigned echo afterimages, useful for residual motion, color-separated trails, and repeatable motion-design treatments."
    },
    {
      words: ["TexturingXYZ", "Softwrap"],
      title: "TexturingXYZ and Blender Softwrap workflow note",
      summary: "A surface-production source connecting TexturingXYZ assets with Blender Softwrap, useful for tracking reusable custom model and skin-detail workflows."
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

function uniqueTags(values) {
  return [...new Set(values.filter(Boolean))];
}

function classifyWireEntry(item, inferred) {
  const text = cleanWireText(item);
  const haystack = `${text} ${inferred.title || ""} ${item.url || ""}`.toLowerCase();
  const rules = [
    {
      words: ["whisper", "transcription", "voice", "audio"],
      domains: ["audio"],
      tags: ["audio", "local-ai", "workflow"]
    },
    {
      words: ["materialx", "filament", "rendering", "look-development"],
      domains: ["visual-systems"],
      tags: ["rendering", "materialx", "pipeline"]
    },
    {
      words: ["midjourney", "seedance", "ai video", "image-to-video"],
      domains: ["visual-systems"],
      tags: ["ai-video", "visual-reference", "motion-design"]
    },
    {
      words: ["ocr", "olmocr", "layout extraction", "document"],
      domains: ["knowledge-workflows"],
      tags: ["document-ai", "ocr", "archive"]
    },
    {
      words: ["houdini", "node viewer", "node"],
      domains: ["creative-tools"],
      tags: ["houdini", "nodes", "workflow"]
    },
    {
      words: ["fxtags", "colorfulecho", "after effects", "afterimage", "texturingxyz", "softwrap"],
      domains: ["creative-tools"],
      tags: ["vfx", "motion-design", "workflow"]
    },
    {
      words: ["tarkovsky", "polaroid", "possession", "mussorgsky", "film", "cinema"],
      domains: ["culture-references"],
      tags: ["film", "visual-reference", "criticism"]
    },
    {
      words: ["3dgs", "gaussian", "nerf", "reconstruction", "splatting"],
      domains: ["visual-systems"],
      tags: ["spatial-capture", "3dgs", "research"]
    },
    {
      words: ["blender", "maya", "houdini", "vfx", "compositing"],
      domains: ["creative-tools"],
      tags: ["vfx", "3d", "workflow"]
    },
    {
      words: ["claude code", "codex", "github", "agent", "agents", "cli", "mcp"],
      domains: ["creative-tools"],
      tags: ["agents", "ai-coding", "workflow"]
    },
    {
      words: ["notebooklm", "obsidian", "gemini", "knowledge", "learning"],
      domains: ["knowledge-workflows"],
      tags: ["learning", "knowledge-map", "reference"]
    },
    {
      words: ["book", "literature", "dazai", "library"],
      domains: ["culture-references"],
      tags: ["books", "literature", "archive"]
    }
  ];

  const matched = rules.find((rule) => rule.words.some((word) => haystack.includes(word)));
  if (!matched) {
    return {
      domains: ["staging"],
      tags: ["needs-review", "reference", "wire"]
    };
  }

  return {
    domains: matched.domains,
    tags: uniqueTags(["reference", "wire", ...matched.tags])
  };
}

const curatedWireOverrides = new Map([
  ["2050355373052223585", {
    title: "xAI custom voices production-audio note",
    summary: "A source-linked AI voice workflow reference for custom voice creation, voice agents, scratch dialogue, temporary narration, and production-audio experimentation.",
    domains: ["audio"],
    tags: ["reference", "wire", "voice-ai", "audio", "api", "workflow", "production-audio"],
    library_refs: ["xAI custom voices"],
    article_refs: ["articles/ai-voice-tools-production-infrastructure.html"]
  }],
  ["2050352914783473948", {
    title: "Blender AI policy and Development Fund governance note",
    summary: "A Blender governance source on converting Anthropic's Development Fund role into a one-time donation and clarifying AI boundaries around human-driven open-source creation.",
    domains: ["creative-tools"],
    tags: ["reference", "wire", "blender", "ai", "open-source", "workflow", "ethics"],
    library_refs: ["Blender AI and Development Fund policy update"],
    article_refs: ["articles/blender-ai-policy-needs-governance-context.html"]
  }],
  ["2050425099006902502", {
    title: "Rothheim joint movement-reference note",
    summary: "A robotics articulation source useful for studying constrained rotation, balance correction, recovery movement, and animation-reference crossover.",
    domains: ["visual-systems"],
    tags: ["reference", "wire", "robotics", "movement-reference", "mechanical-motion", "embodied-ai", "animation-reference"],
    library_refs: ["Rothheim joint"],
    article_refs: ["articles/embodied-robotics-references-movement-archives.html"]
  }],
  ["2050428545873379735", {
    title: "Danny Yount work archive reference",
    summary: "A title-design and motion-graphics archive source worth preserving for editorial pacing, typography rhythm, visual timing, and cinematic design reference.",
    domains: ["culture-references"],
    tags: ["reference", "wire", "visual-reference", "motion-graphics", "title-design", "editorial-design", "research"],
    library_refs: ["Danny Yount work archive"],
    article_refs: ["articles/reference-archives-preserve-why-source-mattered.html"]
  }],
  ["2050421910585143485", {
    title: "Blender tension-map wrinkle workflow note",
    summary: "A Blender tutorial source on using baked wrinkle normals and Geometry Nodes tension information to drive lightweight deformation-aware surface detail.",
    domains: ["creative-tools"],
    tags: ["reference", "wire", "blender", "geometry-nodes", "texturing", "workflow", "animation-reference"],
    library_refs: [],
    article_refs: ["articles/reference-archives-preserve-why-source-mattered.html"]
  }],
  ["2050419203811983424", {
    title: "C.S. Lewis vivisection essay reference",
    summary: "An Archive.org reading lead for a short C.S. Lewis essay on vivisection, useful for literature, ethics, criticism, and interpretation references.",
    domains: ["culture-references"],
    tags: ["reference", "wire", "literature", "criticism", "books", "archive", "ethics"],
    library_refs: ["C.S. Lewis vivisection essay reference"],
    article_refs: ["articles/reference-archives-preserve-why-source-mattered.html"]
  }],
  ["2047962268755996871", {
    title: "Cavalry Japanese tutorial source note",
    summary: "A Cavalry learning-resource source pointing to Japanese tutorial material for procedural 2D animation and motion-design onboarding.",
    domains: ["creative-tools"],
    tags: ["reference", "wire", "cavalry", "motion-design", "tutorial", "browser-tools", "workflow"],
    library_refs: ["Cavalry"],
    article_refs: ["articles/browser-creative-tools-production-surfaces.html"]
  }],
  ["2047722380148224067", {
    title: "Graphite browser vector editor note",
    summary: "A design-tool source on Graphite as a browser-accessible vector and procedural graphics editor, useful for tracking lightweight alternatives to heavier 2D tools.",
    domains: ["creative-tools"],
    tags: ["reference", "wire", "graphite", "design-tools", "vector-graphics", "browser-tools", "open-source"],
    library_refs: ["Graphite"],
    article_refs: ["articles/browser-creative-tools-production-surfaces.html"]
  }],
  ["2047725811638190584", {
    title: "City Roads map-ornament tool note",
    summary: "A browser visual-reference source for turning city road networks into printable linework, useful for map ornament, urban-form study, and graphic texture ideas.",
    domains: ["visual-systems"],
    tags: ["reference", "wire", "maps", "visual-reference", "browser-tools", "generative-art", "archive"],
    library_refs: ["City Roads"],
    article_refs: ["articles/browser-creative-tools-production-surfaces.html"]
  }],
  ["2048220519108116694", {
    title: "Dead End opening-shot practical-effects reference",
    summary: "A film-reference source on the 1937 Dead End opening shot, useful for studying miniature effects, forced perspective, camera scale, and urban set illusion.",
    domains: ["culture-references"],
    tags: ["reference", "wire", "film", "cinematography", "visual-reference", "practical-effects", "production-design"],
    library_refs: [],
    article_refs: ["articles/film-camera-references-need-behavior-notes.html"]
  }],
  ["2047857297398067685", {
    title: "Brian De Palma camera-movement reference",
    summary: "A cinematography source saved for studying how camera movement can become a director-specific behavior rather than only a shot example.",
    domains: ["culture-references"],
    tags: ["reference", "wire", "film", "cinematography", "camera-movement", "visual-reference"],
    library_refs: [],
    article_refs: ["articles/film-camera-references-need-behavior-notes.html"]
  }],
  ["1969074516711149857", {
    title: "David Fincher artificial lens-flare compilation",
    summary: "A film-look reference collecting artificial lens-flare examples, useful for separating optical-effect taste, compositing intent, and invisible polish from generic cinematography notes.",
    domains: ["culture-references"],
    tags: ["reference", "wire", "film", "cinematography", "visual-effects", "visual-reference"],
    library_refs: [],
    article_refs: ["articles/film-camera-references-need-behavior-notes.html"]
  }],
  ["2047928510346592724", {
    title: "Night on Bald Mountain animation staging reference",
    summary: "A visual and music reference for studying ominous staging, character animation, silhouette, and dense atmospheric detail in a classic animation sequence.",
    domains: ["culture-references"],
    tags: ["reference", "wire", "animation", "film", "visual-reference", "music", "staging"],
    library_refs: [],
    article_refs: ["articles/film-camera-references-need-behavior-notes.html"]
  }],
  ["2048117117271040359", {
    title: "Little Nemo pilot animation scene reference",
    summary: "An animation-reference source for a striking Little Nemo pilot scene, useful when filing expressive timing, staging, and hand-drawn motion examples.",
    domains: ["culture-references"],
    tags: ["reference", "wire", "animation", "film", "visual-reference", "motion-design"],
    library_refs: [],
    article_refs: ["articles/film-camera-references-need-behavior-notes.html"]
  }],
  ["2049865575074255119", {
    library_refs: ["FXTags"],
    article_refs: ["articles/effects-references-production-decisions.html"]
  }],
  ["2049842824066257348", {
    library_refs: ["ColorfulEcho"],
    article_refs: ["articles/effects-references-production-decisions.html"]
  }],
  ["2049949634324316186", {
    library_refs: ["TexturingXYZ", "Blender Softwrap"],
    article_refs: ["articles/effects-references-production-decisions.html"]
  }],
  ["2050136956411977776", {
    library_refs: ["Houdini Node Viewer"],
    article_refs: ["articles/effects-references-production-decisions.html"]
  }],
  ["2046183266630414366", {
    title: "Typographic Posters archive reference",
    summary: "A design-reference source pointing to Typographic Posters as a large typographic and graphic poster archive, useful for layout rhythm, poster composition, and typography research.",
    domains: ["culture-references"],
    tags: ["reference", "wire", "typography", "poster-design", "visual-reference", "archive", "design-research"],
    library_refs: ["Typographic Posters"],
    article_refs: ["articles/reference-surfaces-need-retrieval-roles.html"]
  }],
  ["2046512166560202943", {
    title: "mesh3d Experiments creative-coding reference",
    summary: "A WebGL and Three.js reference source for small interactive experiments, shader sketches, and browser-native 3D ideas that may not appear as full websites.",
    domains: ["visual-systems"],
    tags: ["reference", "wire", "three-js", "webgl", "creative-coding", "browser-tools", "visual-reference"],
    library_refs: ["mesh3d Experiments"],
    article_refs: ["articles/reference-surfaces-need-retrieval-roles.html"]
  }],
  ["2046404122593870033", {
    title: "SideFX Refining Karma Renders tutorial note",
    summary: "A Houdini Karma learning source for diagnosing noisy renders, using AOV/LPE inspection, and turning render cleanup into a repeatable look-development checklist.",
    domains: ["creative-tools"],
    tags: ["reference", "wire", "houdini", "karma-renderer", "rendering", "tutorial", "lookdev"],
    library_refs: ["Refining Karma Renders"],
    article_refs: ["articles/reference-surfaces-need-retrieval-roles.html"]
  }],
  ["2047358941508616699", {
    title: "Fields of The World global field-boundary dataset",
    summary: "A geospatial dataset source on global agricultural field-boundary mapping, useful for AI, remote-sensing, map data, and large-scale earth-observation references.",
    domains: ["knowledge-workflows"],
    tags: ["reference", "wire", "geospatial", "dataset", "remote-sensing", "machine-learning", "agriculture"],
    library_refs: ["Global Fields of The World"],
    article_refs: ["articles/reference-surfaces-need-retrieval-roles.html"]
  }],
  ["2047816268804452440", {
    title: "Insta360 3DGS consumer-capture note",
    summary: "A spatial-capture source connecting 360 camera capture with 3D Gaussian splatting as a way to preserve and revisit moments, useful for filing consumer capture separately from reconstruction method.",
    domains: ["visual-systems"],
    tags: ["reference", "wire", "spatial-capture", "3dgs", "360-capture", "visual-reference", "workflow"],
    library_refs: ["Spatial capture use-case labels"],
    article_refs: ["articles/spatial-capture-source-notes-need-use-case-labels.html"]
  }],
  ["2047907181253562568", {
    title: "360 drone sensor-capture 3DGS note",
    summary: "A spatial-capture source framing a 360-degree drone as a sensor-collection surface for Gaussian splats, useful for separating capture hardware from downstream reconstruction technique.",
    domains: ["visual-systems"],
    tags: ["reference", "wire", "spatial-capture", "3dgs", "360-capture", "drone", "workflow"],
    library_refs: ["Spatial capture use-case labels"],
    article_refs: ["articles/spatial-capture-source-notes-need-use-case-labels.html"]
  }],
  ["2047600333656826132", {
    title: "Vista4D novel-view video reconstruction note",
    summary: "A computer-vision source on re-shooting monocular video from alternate camera angles, useful for tracking view synthesis and camera-path reconstruction separately from general spatial capture.",
    domains: ["visual-systems"],
    tags: ["reference", "wire", "spatial-capture", "reconstruction", "computer-vision", "view-synthesis", "research"],
    library_refs: ["Spatial capture use-case labels"],
    article_refs: ["articles/spatial-capture-source-notes-need-use-case-labels.html"]
  }],
  ["2047303939444425164", {
    title: "Gaussian splatting e-commerce capture note",
    summary: "A 3DGS workflow source about difficult product capture and simpler e-commerce presentation, useful for filing spatial capture by production use case rather than only by rendering method.",
    domains: ["visual-systems"],
    tags: ["reference", "wire", "spatial-capture", "3dgs", "ecommerce", "product-capture", "workflow"],
    library_refs: ["Spatial capture use-case labels"],
    article_refs: ["articles/spatial-capture-source-notes-need-use-case-labels.html"]
  }],
  ["2046876069991428524", {
    title: "Face Anything 4D face reconstruction note",
    summary: "A 4D reconstruction source on dense face tracking and shared canonical face space, useful for filing facial reconstruction separately from broader spatial-capture references.",
    domains: ["visual-systems"],
    tags: ["reference", "wire", "spatial-capture", "reconstruction", "computer-vision", "face-tracking", "research"],
    library_refs: ["Spatial capture use-case labels"],
    article_refs: ["articles/spatial-capture-source-notes-need-use-case-labels.html"]
  }],
  ["2046601322439315903", {
    title: "Depth Anything V2 realtime WebGPU depth note",
    summary: "A realtime-depth source describing local depth extraction with WebGPU and Three.js, useful for browser-native spatial previews and depth-estimation workflow tracking.",
    domains: ["visual-systems"],
    tags: ["reference", "wire", "spatial-capture", "depth-estimation", "webgpu", "three-js", "workflow"],
    library_refs: ["Spatial capture use-case labels"],
    article_refs: ["articles/spatial-capture-source-notes-need-use-case-labels.html"]
  }]
]);

const xEntries = raw.map((item) => {
  const inferred = inferWireTopic(item);
  const classification = classifyWireEntry(item, inferred);
  const override = curatedWireOverrides.get(item.status_id) || {};
  return {
    id: `x_${item.status_id}`,
    source: item.source || "x_like",
    url: item.url,
    original_url: item.url,
    collected_at: item.collected_at || "",
    posted_at: item.posted_at || "",
    author_handle: item.author_handle || "",
    title: override.title || inferred.title,
    summary: override.summary || inferred.summary,
    public_summary: override.summary || inferred.summary,
    post_kind: "unknown",
    content_kinds: ["reference"],
    domains: override.domains || classification.domains,
    tags: override.tags || classification.tags,
    library_refs: override.library_refs || [],
    article_refs: override.article_refs || [],
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

const seenUrls = new Set(xEntries.map((entry) => entry.url).filter(Boolean));
const legacyEntries = (legacyBloggerWire.entries || [])
  .filter((entry) => entry?.url && !seenUrls.has(entry.url))
  .map((entry) => ({
    ...entry,
    content_kinds: Array.isArray(entry.content_kinds) ? entry.content_kinds : ["reference"],
    domains: Array.isArray(entry.domains) ? entry.domains : ["legacy-blogger"],
    tags: Array.isArray(entry.tags) ? entry.tags : ["wire", "legacy-blogger", "source-note"],
    context: {
      needs_context_review: false,
      needs_reply_parent_review: false,
      needs_followup_research: true,
      notes: ["generated_from_legacy_blogger_json_manifest"]
    },
    policy: {
      keep_original_link: true,
      append_only: true,
      full_text_copied: false,
      public_safe: true
    }
  }));

const entries = [...xEntries, ...legacyEntries];

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

const existingLibrarySeed = readJson("data/processed/library_seed.json", { items: [] });
const librarySeed = {
  generated_at: existingLibrarySeed.generated_at || new Date().toISOString(),
  policy: {
    flat_hierarchy: true,
    multi_tag_filtering: true,
    ranking_copy_policy: "Do not copy ranking text. Store ranking source and position as metadata."
  },
  items: Array.isArray(existingLibrarySeed.items) ? existingLibrarySeed.items : []
};

writeJson("data/processed/library_seed.json", librarySeed);

console.log(`Built public-safe wire with ${entries.length} entries.`);
