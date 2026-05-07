# Knowledge Hub Agent Rules

This repository may be edited by multiple AI agents. Follow these rules before creating or revising Articles.

## Required Reading

- `docs/private/content-flow.md`
- `docs/article-guidelines.md`
- `scripts/build-site.mjs`
- `data/legacy-blogger-articles.json`
- `data/legacy-blogger-source-notes.json`
- `data/processed/wire.json`
- `data/processed/library_seed.json`

## Editorial Lanes

- Wire is the source lane. Keep it broad, link-first, and non-duplicative.
- Articles are the synthesis lane. They must explain why a cluster of sources matters.
- Library is the durable reference lane. Add or improve Library entries when an Article reveals a reusable tool, concept, workflow, book, film, dataset, or reference.

## Article Rules

- Read `docs/article-guidelines.md` before writing.
- Do not create filler Articles.
- Treat legacy Blogger/source-note material as Wire-grade research input, not as the density target for new Articles.
- New Articles should be denser than the old Blogger-style notes: more synthesis, clearer editorial judgment, and stronger explanation of why the source cluster matters.
- Do not invent dates, authors, quotes, claims, source context, adoption signals, or technical behavior.
- Use existing Wire, legacy Blogger notes, or durable external sources as evidence.
- Preserve the original source link when a source exists.
- Keep tags canonical and aligned with visible card tags and Quick filter behavior.
- If an Article creates a durable reusable reference, update Library too.

## Validation

Before committing user-visible content changes:

- Run `npm run build`.
- Run `npm run validate`.
- Check generated Article links and tag/filter behavior when relevant.
- Commit only clear improvements.
