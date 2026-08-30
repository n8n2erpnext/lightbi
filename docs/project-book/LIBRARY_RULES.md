# LightBI Documentation Library Rules

> **Nội quy thư viện — mandatory documentation governance for humans and AI agents.**
>
> The library exists to preserve project truth, provenance, and retrieval speed. Treat it like a maintained engineering system, not a dumping ground for notes.

## 1. Golden rule

Before creating, moving, renaming, or deleting any documentation, **read this file and the Project Book entry point first**.

An agent must never create a new Markdown or JSON document merely because it is convenient. First determine:

1. whether the information already exists;
2. whether an existing canonical document should be updated instead;
3. what authority level the new information has;
4. which shelf owns that document type;
5. what source bookmarks and provenance it must carry.

If any of those answers are unclear, do not invent a new location. Search the library first.

## 2. Required reading order

A new AI agent entering LightBI must begin at [`README.md`](./README.md), then read:

1. [`LIBRARY_RULES.md`](./LIBRARY_RULES.md) — how to behave in the library;
2. [`LIGHTBI_PROJECT_BOOK.md`](./LIGHTBI_PROJECT_BOOK.md) — docs-derived project model and current source precedence;
3. [`DOCUMENT_LIBRARY_MAP.md`](./DOCUMENT_LIBRARY_MAP.md) — shelf map and retrieval routes;
4. [`SOURCE_CATALOG.md`](./SOURCE_CATALOG.md) — exact source lookup when verification is needed;
5. [`LIGHTBI_WORKLOG.md`](./LIGHTBI_WORKLOG.md) — historical evolution and work chronology when context is required.

## 3. How to look something up

Do not grep the whole repository blindly and treat the first match as truth. Use this retrieval order:

### A. Need the current project model
Start with `LIGHTBI_PROJECT_BOOK.md`. Follow its bookmarks to the original source before making a high-impact claim.

### B. Need to know where a document class lives
Use `DOCUMENT_LIBRARY_MAP.md` and the shelf-level `README.md` files.

### C. Know a filename or historical name
Use `SOURCE_CATALOG.md`, `PATH_MIGRATION_INDEX.md`, or `history/LEGACY_ROOT_INDEX.md`.

### D. Need machine retrieval
Use `source_catalog.json` and its path, category, title/schema metadata, size, and SHA-256 fields.

### E. Need to understand why something changed
Read `LIGHTBI_WORKLOG.md`, then the referenced ADR, phase record, audit, verification, or handoff.

### F. Need to verify code truth
Documentation alone is insufficient. Use `LIGHTBI_CODE_MAP.md`, `LIGHTBI_GIT_HISTORY_MAP.md`, `LIGHTBI_CI_CD_MAP.md`, and `LIGHTBI_CONTROL_PLANE_MAP.md` as the Project Truth companions, then inspect the exact current source/tests for the scoped change.

Never promote a historical handoff, old roadmap, audit observation, or draft pricing document into current truth without checking precedence and date.

## 4. Source authority and truth labels

Every document must be understood as one of these authority classes:

- **Canonical/current** — intended to describe the present contract or architecture.
- **Decision record** — records why a choice was made; may later be superseded.
- **Verification/evidence** — proves a specific state at a specific time; does not automatically define current architecture.
- **Worklog/progress** — chronology, implementation notes, or checkpoints.
- **Handoff/agent plan** — operational continuity for a task or session; never current truth by default.
- **Draft/proposal** — unapproved direction, pricing, design, or future architecture.
- **Historical/superseded** — preserved for provenance but not authoritative for current behavior.
- **Machine evidence** — JSON or generated evidence consumed by tests/scripts; path may be part of the contract.

When a document contains information from more than one class, state the distinction explicitly inside the document.

Do not silently convert a proposal into a decision, an audit into a contract, or a conversation-derived design into implementation truth.

When authority is uncertain, use conservative wording such as `design direction`, `historical evidence`, `working hypothesis`, or `requires code/Git verification`.

## 5. When to create a new document

Create a new document only when at least one is true:

- a durable engineering decision needs its own identity;
- a phase or release requires a durable closure/evidence record;
- a new canonical contract cannot be expressed cleanly by updating an existing owner document;
- an external source needs a provenance register entry;
- a substantial audit or verification must remain independently reproducible;
- a long-running workstream needs a handoff or plan that should not pollute canonical documentation.

Do **not** create a new document for:

- a one-line status update that belongs in an existing worklog;
- a temporary scratch note that can stay outside the durable library;
- duplicated summaries of documents that already have a canonical owner;
- generated test output that should remain machine evidence;
- arbitrary `FINAL`, `FINAL2`, `NEW`, `LATEST`, or `TEMP` variants.

## 6. Naming rules

Names must communicate document type, subject, and when relevant phase/date.

Preferred patterns:

- ADR: `ADR-NNN-short-decision-title.md`
- phase record: `phase-X[-subphase]-short-purpose.md`
- audit: `AUDIT-short-scope.md`
- verification: `VERIFICATION-short-scope[-YYYY-MM-DD].md`
- handoff: `AGENT_HANDOFF_<SCOPE>[_PHASE].md`
- plan: `AGENT_PLAN_<SCOPE>[_PHASE].md`
- release evidence: `<CHANNEL>_RELEASE_<VERSION>_<PURPOSE>.md`
- dated operational record: `<PURPOSE>_YYYY-MM-DD.md`

Use stable, descriptive words. Prefer lowercase kebab-case for architecture/phase filenames and existing uppercase conventions for legacy agent/audit families.

Never reuse an ADR number. Before assigning one, inspect `docs/adr/README.md`. Historical numbering anomalies must be preserved, not repeated.

Avoid filenames that depend on subjective freshness: `latest`, `new`, `final-final`, `fixed2`, `copy`, `backup`.

## 7. Shelf placement rules

Place a document according to its **function**, not according to which agent created it.

| Document type | Shelf |
| --- | --- |
| Project onboarding, truth map, governance, catalogs | `docs/project-book/` |
| Current architecture models/contracts and phase evidence | `docs/architecture/` |
| Architecture Decision Records | `docs/adr/` |
| Domain knowledge catalogs | `docs/domain-catalog/` |
| Plugin/provider SDK documentation | `docs/plugin-sdk/` |
| Product/commercial drafts or contracts | `docs/product/` |
| Release checklist/evidence | `docs/release/` |
| Durable design baseline | `docs/design/` |
| Agent handoff/plan/walkthrough | `docs/history/agent/` in the matching subtype |
| Historical audit | `docs/history/audits/` |
| Historical verification | `docs/history/verifications/` |
| Progress/changelog chronology | `docs/history/progress/` or `docs/history/changelog/` |
| Superseded roadmap/memory | `docs/history/project-memory/` |
| Reports/probes/stress results | `docs/history/reports/` |
| Historical sample evidence | `docs/history/sample-evidence/` |

Repository root is **not a documentation shelf**. Do not add new project Markdown to root unless a build/tool contract explicitly requires that exact path.

Do not move `docs/architecture/*.json` or other machine evidence merely for aesthetics. First prove no code, test, script, workflow, or manifest consumes the path.

## 8. Minimum document structure

A durable engineering document should make its status and provenance obvious near the top.

Recommended header:

```text
# <Title>

Status: canonical | decision | draft | verification | historical
Date: YYYY-MM-DD
Scope: <what this document owns>
Supersedes: <path or none>
Superseded by: <path or none>
Primary sources: <relative links>
```

Then prefer this structure when applicable:

1. **Purpose / question** — why the document exists.
2. **Context** — only the context required to interpret it.
3. **Decision / contract / finding** — the durable content.
4. **Non-goals / boundaries** — what it must not be interpreted to mean.
5. **Evidence** — tests, code paths, data, commit/PR, audit artifacts.
6. **Current status** — implemented, partial, blocked, superseded, historical.
7. **Source bookmarks** — relative links to original supporting material.
8. **Follow-up** — only durable unresolved work, not casual TODO noise.

A reader should not need the authoring chat session to know what the document means.

## 9. Writing style rules

Write for a future engineer or AI that has **zero conversation context**.

- State facts separately from inference and future design.
- Preserve LightBI terminology exactly where a canonical term exists.
- Do not rewrite uncertainty into certainty for readability.
- Do not claim implementation without code, Git, test, or runtime evidence.
- Do not claim a feature is unsupported merely because one historical document lacks it.
- Avoid marketing language inside engineering evidence.
- Prefer precise paths, symbols, phases, versions, and dates over vague phrases like `recently` or `the new flow`.
- Record important numeric evidence with unit and source.
- If a document is superseded, mark it; do not erase the old reasoning.

Summaries may simplify wording, but they must preserve the original source's authority level and constraints.

## 10. Bookmark rules

Every durable claim that depends on another document should have a relative repository link when practical.

Prefer:

`[ADR-122](../adr/ADR-122-canonical-understanding-pipeline.md)`

Avoid absolute machine paths such as `/home/ubuntu/...` or `C:\Users\...` for repository-owned targets.

Historical external/local artifacts may retain their original absolute path as evidence, but they must be classified as historical link debt if the target is no longer in the repository.

Never fabricate a replacement target just to make a link checker green.

## 11. Rules for moving or renaming documents

A documentation move is a migration, not a cosmetic filesystem operation.

Before moving:

1. identify exact-path consumers outside documentation;
2. identify links that point to the document;
3. identify relative links inside the document whose base directory will change;
4. check for filename/ADR collisions;
5. create an old-path → new-path migration record.

After moving:

1. rewrite affected links using resolved old targets, not blind string replacement;
2. update shelf indexes and entry points;
3. update `PATH_MIGRATION_INDEX.md` or the relevant legacy index;
4. regenerate the source catalog/checksums;
5. run link integrity checks;
6. separate pre-existing historical debt from new breakage;
7. run `git diff --check`;
8. commit the migration separately from product/code changes.

Never move machine-consumed evidence until code/CI consumers have been audited.

## 12. Rules after writing a new document

Writing the file is only half the task. Before declaring documentation work complete, the author must:

- place it on the correct shelf;
- add it to the shelf index when the shelf has one;
- add a bookmark from an entry point if it changes onboarding or governance;
- update Project Book/Worklog only if the new information materially changes project understanding;
- refresh `SOURCE_CATALOG.md` and `source_catalog.json` when the new source is inside catalog scope; `docs/project-book/` governance/book files are intentionally excluded from the self-referential source catalog and must instead be linked from the Project Book entry point/library map;
- verify all new relative links;
- ensure no accidental root-level document was created;
- keep unrelated code or work-in-progress out of the documentation commit.

## 13. Worklog and handoff discipline

Do not create a new log file for every session.

Use `LIGHTBI_WORKLOG.md` for durable project-level chronology that changes how future readers understand the project.

Use `docs/history/agent/handoffs/` only when another agent genuinely needs a bounded handoff containing:

- objective;
- starting state;
- changes made;
- verification performed;
- unresolved blockers;
- exact next action;
- relevant source/code bookmarks.

A handoff must not masquerade as canonical architecture. Once its task is completed, keep it as historical provenance; update the canonical owner instead of continually editing the old handoff.

Temporary command output, debugging transcripts, generated logs, and one-off scratch reasoning should not become permanent Markdown unless they provide durable evidence.

## 14. Forbidden library behavior

The following are documentation hygiene violations:

- dropping Markdown files in repository root without a path contract;
- creating duplicate `summary`, `final`, `latest`, or `backup` documents;
- mixing product code changes into a documentation-reorganization commit;
- renaming historical ADRs to make numbering prettier;
- deleting superseded documents that still explain provenance;
- moving evidence JSON because the folder looks untidy;
- rewriting historical claims to match current architecture;
- using an old handoff as current truth without verification;
- adding undocumented absolute paths when a relative repository link exists;
- leaving new documents absent from indexes/catalogs after the work is declared complete.

## 15. Shelf decision tree for AI agents

Before saving a new document, ask in this order:

```text
Is this project onboarding/governance/catalog material?
  yes → docs/project-book/

Is it a durable architecture decision?
  yes → docs/adr/

Is it a current architecture/model/contract or governed phase evidence?
  yes → docs/architecture/

Is it domain/plugin/product/release/design owned?
  yes → matching dedicated shelf

Is it a handoff, audit, verification, progress record, report, old roadmap, or superseded evidence?
  yes → matching docs/history/ shelf

Still unclear?
  → do not invent a new shelf; consult DOCUMENT_LIBRARY_MAP.md and existing nearest owner.
```

If two shelves seem plausible, choose the shelf of the document's **long-term authority**, not the task that happened to create it.

## 16. Final AI librarian checklist

Before finishing any documentation task, explicitly verify:

- [ ] I read the library rules and entry point.
- [ ] I searched for an existing owner before creating a file.
- [ ] The document's authority/status is clear.
- [ ] The filename follows the library convention.
- [ ] The file is on the correct shelf.
- [ ] Source claims have bookmarks/provenance where needed.
- [ ] I did not convert historical evidence into current truth.
- [ ] I did not move path-sensitive machine evidence without consumer audit.
- [ ] Entry points, indexes, and catalogs are updated according to their scope.
- [ ] New links resolve, or historical debt is explicitly classified.
- [ ] `git diff --check` passes.
- [ ] Documentation changes are isolated from unrelated code changes.

**A clean library is part of LightBI's engineering integrity. Future AI agents are expected to leave it easier to understand than they found it.**
