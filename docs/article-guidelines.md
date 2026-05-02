# Knowledge Hub Article Guidelines

These guidelines are for Codex, other AI agents, and human editors writing Knowledge Hub Articles.

## Purpose

An Article is not a repost and not a summary card. It is the synthesis layer between Wire and Library.

Good Articles do at least one of these:

- Explain why several Wire items point to the same pattern.
- Turn a useful source into a practical production note.
- Compare tools, workflows, references, or visual ideas.
- Preserve context from old Blogger notes in a cleaner Knowledge Hub form.
- Promote a repeated topic into a reusable Library reference.

Do not create an Article just because a source exists.

## Source Requirements

Every Article should be grounded in at least one real source:

- a Wire entry from `data/processed/wire.json`
- a legacy source note from `data/legacy-blogger-source-notes.json`
- a curated legacy Article from `data/legacy-blogger-articles.json`
- a durable external reference such as official docs, a project page, a paper, a tutorial, or a primary media page

Rules:

- Keep original URLs.
- Do not invent source dates.
- Do not invent quotes.
- Do not claim a tool supports a feature unless the source says it or the Article clearly labels it as an inference.
- Separate observed facts from editorial interpretation.
- If the source is a social post, do not treat likes, reposts, or hype as proof of adoption.

## Article Shape

Use a compact editorial structure:

- Clear title.
- Short summary paragraph that says what the Article is about.
- Two to five focused sections.
- Concrete source references or source links.
- Tags that match the actual subject matter.

Preferred Article types:

- Pattern note
- Workflow note
- Tool comparison
- Visual reference note
- Source cluster
- Library promotion note
- Practical checklist
- Caveated forecast

Avoid:

- generic SEO explainers
- thin summaries of one weak post
- rankings without evidence
- unsupported trend claims
- long copied passages from sources
- vague praise such as "game-changing" or "revolutionary"

## Writing Style

The site should feel like a practical knowledge desk, not a marketing blog.

- Be specific.
- Keep paragraphs short.
- Explain usefulness, not excitement.
- Name uncertainty when it exists.
- Prefer "this is useful because..." over hype.
- Use Japanese when it helps the user understand the context, especially for editorial explanation.
- Do not translate shared site chrome or navigation unless explicitly asked.

## Tags

Tags are retrieval tools, not decoration.

- Use lower-case slug style where possible.
- Keep existing canonical tags when a close match exists.
- Do not add structural tags such as `wire`, `source-note`, `legacy-blogger`, `unknown`, or `needs-review` as visible Article tags.
- Avoid near-duplicates caused by capitalization, singular/plural, or spelling variants.
- New tags should be useful in filters and should describe a real retrieval category.

Before adding a tag, ask:

- Would someone filter by this tag later?
- Does it group more than one likely item?
- Is there already a better existing tag?

## Library Coupling

When an Article identifies a durable entity, update Library too.

Good Library candidates:

- official tool or project pages
- canonical documentation
- recurring workflows
- durable tutorials
- books and films used as visual or conceptual references
- datasets, APIs, standards, and papers
- creator/project pages that will be referenced repeatedly

Do not add:

- weak SEO pages
- generic homepages when a better specific page exists
- duplicate references
- one-off social posts unless they are the canonical source for an important artifact

## Wire Coupling

If an Article comes from Wire:

- Keep Wire broad and source-first.
- Improve the Wire summary or tags if they are placeholders and the source context is now clearer.
- Do not remove Wire entries just because they were promoted to an Article.
- Do not duplicate the same source URL into a new Wire entry.

## Legacy Blogger Notes

Legacy Blogger material can be used as research context.

- `post_points` are useful because they often contain prior Grok/context analysis.
- Preserve the source URL when available.
- Rewrite into Knowledge Hub style instead of copying old templates.
- Do not keep old Blogger layout assumptions.

## Article Quality Checklist

Before committing an Article:

- The Article has a clear reason to exist.
- All factual claims are supported by a source or clearly marked as interpretation.
- Source links are present and not fabricated.
- Tags are useful and canonical.
- No placeholder text remains.
- If the Article introduces a durable reference, Library was updated or a reason was noted.
- `npm run build` succeeds.
- `npm run validate` succeeds.
- Generated Article links work.
- Search, card tags, Quick filters, and All tags modal behavior remain intact.

## Commit Standard

Commit only clear user-visible improvements.

Good commit messages:

- `site: add article guideline`
- `site: promote wire cluster to article`
- `site: improve article sources`
- `site: update library references`

Do not commit timestamp-only churn or generated noise without content value.
