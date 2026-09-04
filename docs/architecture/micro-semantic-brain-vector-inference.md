# Micro Semantic Brain and Vector Inference Architecture

Status: owner-approved design; not implemented
Date: 2026-09-04
Scope: local semantic knowledge corpus, vector retrieval, evidence bridge, unsupported-domain inference, and UI provenance
Supersedes: none
Superseded by: none
Primary sources: ../adr/ADR-124-micro-semantic-brain-vector-inference.md, phase-3a-semantic-candidate-evidence-verification.md, phase-3b1-contextual-evidence-aggregation.md, phase-3b2a-semantic-resolution-shadow.md, phase-0-semantic-support-audit.md, ../project-book/LIGHTBI_PROJECT_BOOK.md

## Purpose

Define an implementation-grade Micro Semantic Brain that broadens LightBI's ability to understand unfamiliar schemas and long-tail domains while preserving deterministic evidence, abstention, canonical vocabulary, grain safety, metric correctness, and local-first operation.

This document owns the proposed brain knowledge contract and retrieval algorithm. It does not claim that the runtime has already implemented them.

## Product Decision

LightBI will use two complementary understanding layers:

```text
Micro Semantic Brain
  broad business knowledge + semantic interpolation + relations + negative knowledge
  -> candidate hypotheses / inferred domain affinity

Canonical Semantic Registry
  canonical IDs + aliases + roles + compatible types + support metadata
  -> normalization and stable product vocabulary
```

The Micro Brain expands **recall**. The registry preserves **canonical identity**. Neither one grants metric or execution authority.

## Authority Chain

The target chain is deliberately asymmetric:

```text
raw source
  -> physical profiler
  -> lexical registry candidates
  -> Micro Brain retrieval candidates
  -> candidate/evidence merge
  -> contextual evidence aggregation
  -> conservative semantic resolver
  -> grain resolution
  -> relationship resolution
  -> readiness / M1-M2-M3 / aggregation safety
  -> domain support classification
  -> metric preflight
  -> analysis / Focus / Deep BA / BA Step 2
```

A later stage may restrict an earlier hypothesis. An earlier stage may never grant a later authority.

The required durable distinction is:

- `retrieval_similarity`: how near a query is to indexed knowledge;
- `semantic_resolution_state`: what the evidence resolver can safely conclude;
- `domain_support_state`: what LightBI officially supports;
- `analysis_authorization`: what calculations/claims are allowed.

These values must not be collapsed into one percentage.

## Brain Source Corpus

V1 source budget is approximately **10 MB of curated text/structured knowledge**. This is a design budget, not a requirement that every release reach exactly 10 MB.

The corpus must be authored as typed knowledge cards, not arbitrary prose chunks. One concept may have a definition card, relation card, positive-example cards, negative-example cards, and formula/evidence cards.

Proposed source tree:

```text
micro-brain/
  schema/
  core/
    concepts/
    relations/
    negative-knowledge/
    evidence-rules/
    units-and-measures/
  domains/
    commerce/
    finance/
    logistics/
    inventory/
    operations/
    long-tail/
  fixtures/
  compiled/        # generated; not hand-edited
```

The corpus is versioned independently from the canonical semantic registry. A brain release must record source-corpus version, compiler version, index version, and content hash.

## Knowledge Card Contract

Minimum conceptual shape:

```yaml
id: concept.cod_amount
kind: measure
labels: [COD Amount, Cash on Delivery, tiền thu hộ]
canonical_signal: cod_amount       # optional bridge
semantic_family: money
related_domains: [parcel_logistics, ecommerce]
definition: Value collected from the consignee on behalf of another party.
positive_clues: [cod, thu ho, cash on delivery]
negative_clues: [not carrier revenue by default, not freight fee]
compatible_types: [number, currency]
relations:
  - [cod_amount, collected_on_behalf_of, merchant]
  - [cod_amount, distinct_from, freight_fee]
required_evidence: [monetary_shape, shipment_or_order_context]
analysis_class: descriptive_or_canonical_bridge
```

Required fields are `id`, `kind`, `labels`, `definition`, `positive_clues`, `negative_clues`, `relations`, and `analysis_class`. `canonical_signal` is optional because long-tail concepts may not yet have a registry entry.

Knowledge must include both positive and negative semantics. A corpus that only says “what resembles X” is incomplete for LightBI because safe abstention also needs “what X is not.”

## Knowledge Authoring Rules

The first Brain corpus will be synthesized from general business concepts, the existing semantic registry/domain catalog, governed formulas and blockers, and reusable patterns observed during LightBI corpus evaluation.

Each card must describe a reusable concept rather than memorize an expected test answer. File-specific labels, one-off numeric outcomes, and fixture identity are not semantic proof.

Formulas must state required grain, units, time basis, inputs, blockers, and known confusion cases. Knowledge promotion follows `draft -> validated -> indexed`.

Validation includes schema checks, canonical-bridge checks, duplicate relation checks, contradiction checks, and counterexample coverage.

## Semantic Chunking

Do not split the source corpus into arbitrary fixed token windows. Compile typed sections into semantic retrieval units:

- concept definition;
- terminology and aliases;
- positive clues and examples;
- negative/confusion knowledge;
- relations;
- formula and evidence requirements.

Every retrieval unit retains its parent knowledge-card ID so retrieved fragments remain explainable and can be deduplicated back to one concept.

## Vector Algorithm V1 — Design Choice

V1 uses a deterministic hybrid index rather than a generative model. The dense vector is learned from the curated Brain corpus itself using latent semantic analysis (LSA), while sparse retrieval preserves exact business terminology.

The compiler builds two views of every retrieval unit:

1. **Sparse view** — normalized word tokens, business abbreviations, character 3–5 grams, and typed metadata tags.
2. **Dense view** — a low-dimensional LSA projection of the sparse TF-IDF representation.

This gives semantic interpolation without making a remote embedding service or LLM an authority.

### Normalization

Apply the same broad surface normalization principles already used by `normalizeSemanticSurface`: Unicode normalization, case folding, Vietnamese diacritic-insensitive companion forms, separator/camel-case splitting, whitespace collapse, and stable tokenization.

Preserve both accented and normalized Vietnamese forms in features where useful. Do not destroy source text stored for explanations.

Add typed tags such as `type:number`, `role:identifier_like`, `shape:categorical`, `unit:currency_candidate`, and `family:money` only when those tags come from actual profiler/knowledge evidence.

### Compile-Time Sparse Matrix

For retrieval unit `d` and feature `t`, build a TF-IDF value using a versioned tokenizer and IDF policy. BM25 statistics are compiled in parallel for sparse ranking.

```text
X = TFIDF(retrieval_units x features)
```

Feature vocabulary includes normalized words, selected bigrams, character n-grams, ontology relation labels, and typed semantic tags. Stop-word handling must be language-aware and conservative because short business terms can be meaningful.

### Dense Latent Projection

Compute truncated singular-value decomposition over the corpus matrix:

```text
X ~= U_k * S_k * V_k^T
```

The initial design target is `k = 256`, subject to benchmark tuning. Store the right projection `V_k` plus normalized document vectors. A query sparse vector `q` becomes:

```text
z_q = normalize(q * V_k)
```

Dense retrieval uses cosine similarity against normalized document vectors. The dimension is a compiled-index parameter, not a product semantic contract; it may change when corpus benchmarks justify a new index version.

### Hybrid Retrieval and Fusion

Run both sparse BM25 retrieval and dense cosine retrieval. Merge ranked lists with reciprocal-rank fusion rather than pretending the two raw scores share one confidence scale:

```text
RRF(c) = 1 / (k0 + rank_sparse(c))
       + 1 / (k0 + rank_dense(c))
```

Use a versioned constant such as `k0 = 60` as an initial retrieval parameter, then validate it against the governed corpus. RRF is only a retrieval ordering mechanism.

After fusion, deduplicate retrieval units by parent concept. Preserve the strongest positive and negative units separately so a concept cannot hide its own contradiction evidence.

Structural compatibility is applied after retrieval as evidence/filter logic, not multiplied into a fake universal confidence score. Type mismatch, measure-vs-identifier conflict, unit conflict, and negative relation matches remain explicit conflict evidence.

Initial design bound: return at most 8 parent concepts per physical column into the Brain candidate stage. The exact bound is benchmark-controlled and may be lower after recall evaluation.

A low-similarity query is allowed to produce no Brain candidate. Candidate quantity is not a success metric.

## Runtime Query Signature

For each physical column, build one explainable semantic query from evidence already available to `understanding-core`:

```text
header tokens
+ inferred physical type candidates
+ numeric/date/string/categorical shape tags
+ uniqueness/cardinality tags
+ bounded representative categorical values
+ sibling header surfaces / already-resolved sibling concepts
+ collection-level semantic context when provenance is independent
```

Do not inject file names, corpus IDs, expected answers, or hidden customer-specific dictionaries into the query.

Representative values are bounded witnesses. They must retain the same limitation already enforced by Phase 3A: a sample is not full-column truth.

The query builder must emit its normalized text/features as provenance so a user-facing evidence inspector can explain why knowledge was retrieved.

## Candidate Bridge

Brain retrieval can produce three proposed origins:

- `micro_brain_registry_bridge` — retrieved concept explicitly maps to an existing canonical registry signal;
- `micro_brain_open_concept` — valid Brain concept exists but no canonical signal exists yet;
- `micro_brain_relation_only` — retrieval contributes relation/negative evidence but does not create a column concept.

Proposed contract additions must be versioned rather than silently mutating Phase 3A V1 semantics. Candidate provenance needs fields equivalent to:

```typescript
type SemanticCandidateOrigin =
  | "semantic_registry"
  | "micro_brain_registry_bridge"
  | "micro_brain_open_concept";

type BrainRetrievalProvenance = {
  brainVersion: string;
  indexVersion: string;
  conceptId: string;
  retrievalSimilarity: number;
  sparseRank: number | null;
  denseRank: number | null;
  fusedRank: number;
  queryEvidenceRefs: string[];
};
```

Proposed evidence additions are `brain_vector_retrieval`, `brain_relation_support`, and `brain_negative_conflict`, with `source: micro_brain`. Their exact names are implementation proposals until the contract phase freezes them.

A Brain retrieval evidence record is weak candidate-recall evidence. It is not an independent full-file physical family and must not satisfy current probable/confirmed requirements by itself.

An open concept cannot be rewritten to the nearest canonical signal merely to make downstream code convenient. Canonicalization requires an explicit bridge declared in validated knowledge or a later registry promotion.

## Inferred Domain Model

Brain concepts may declare one or more domain affinities. Domain inference operates on **resolved or evidence-bearing concepts**, not raw vector hits alone.

Proposed inference steps:

1. collect Brain/canonical concepts that survived basic structural conflict checks;
2. group their declared domain affinities;
3. require multiple independent concepts for a strong domain label when possible;
4. preserve competing domain hypotheses instead of forcing one label;
5. compare inferred domain IDs against the official `DomainPackRegistry` / support manifest;
6. emit inference state and official-support state separately.

A domain affinity may use deterministic evidence accumulation or rank voting, but its numeric score must be labeled affinity, not support confidence. Official support is determined only by the support manifest and its acceptance requirements.

Example:

```text
Concept evidence: pond, stocking date, feed quantity, mortality, harvest weight
Inferred domain: aquaculture_operations
Inference state: inferred
Official domain pack: none
Analysis mode: evidence_bound_inferred_domain
```

The absence of an official pack therefore does not erase understanding; it changes the assurance and allowable analysis contract.

## Analysis Modes and Authorization

The UI/runtime must distinguish at least these analysis classes:

| Mode | Semantic source | Domain support | Allowed behavior |
| --- | --- | --- | --- |
| `governed_supported` | canonical resolved concepts | supported/conditional pack with gates passed | governed metrics/actions allowed by existing preflight |
| `canonical_detect_only` | canonical resolved concepts | detect-only/insufficient pack | recognition and safe descriptive analysis; no unsupported domain claims |
| `evidence_bound_inferred_domain` | Brain + canonical/open concepts | no official pack | safe descriptive/grouped analysis after generic grain/aggregation checks; inferred formulas only when every requirement is explicit and status remains inferred |
| `unknown_or_ambiguous` | insufficient/conflicting evidence | any | explain uncertainty, show evidence, avoid semantic calculation |

`evidence_bound_inferred_domain` is not a backdoor around metric governance. A familiar formula found in Brain knowledge may be shown as an inferred calculation only when required fields, units, time basis, and grain are established; it must not be presented as an officially governed LightBI KPI until promoted through the governed metric/domain process.

Focus, Deep BA, and BA Step 2 must receive the analysis mode and provenance. Narrative formatting cannot strip the inference label.

## User-Facing Understanding State

The Understanding surface should make operation visible instead of hiding it behind an “AI” badge. Proposed compact state:

```text
Understanding
Domain             Aquaculture Operations
Domain source      Semantic inference
Official support   Not yet supported
Semantic concepts  12 resolved / 4 inferred / 2 unresolved
Evidence conflicts 1
Analysis mode      Evidence-bound inference
```

For an unsupported inferred domain, baseline disclosure is:

> **Domain này chưa được LightBI hỗ trợ chính thức.** Phân tích dưới đây được thực hiện bằng mô hình nội suy ngữ nghĩa dựa trên cấu trúc và bằng chứng có trong dữ liệu. Những phép tính không đủ bằng chứng hoặc không vượt qua kiểm tra an toàn sẽ không được sử dụng.

An evidence drawer should expose:

- source header and physical profile facts;
- retrieved Brain concept and retrieval provenance;
- canonical registry bridge when present;
- supporting and conflicting evidence;
- semantic resolution state;
- domain support state;
- grain/aggregation restrictions that affect analysis.

The user does not need to understand vector mathematics to understand why LightBI reached a conclusion.

## Negative Knowledge Examples

High-value Brain rules include distinctions such as:

```text
COD amount != carrier revenue by default
stock value != COGS by default
bank inflow != revenue by default
invoice total != line revenue when repeated at line grain
unit price != revenue
inventory snapshot quantity is semi-additive across time
```

These rules should normally contribute conflict/blocker evidence rather than silently delete a candidate.

## Local Runtime and Size Budget

The 10 MB figure refers to curated source knowledge, not final compiled footprint. Compiled TF-IDF vocabulary, BM25 statistics, LSA projection, vectors, metadata, and relation tables will be larger.

Initial engineering budgets, to be measured rather than assumed:

- source Brain corpus: approximately 10 MB for V1 target maturity;
- compiled index: target <= 64 MB before compression, unless benchmark evidence justifies more;
- no network dependency for retrieval;
- memory-map or lazy-load compiled structures where platform/runtime permits;
- precompute all Brain document vectors at build time;
- runtime only vectorizes the current dataset/query signatures.

Latency and memory limits must be benchmarked on a declared low-end reference machine before production cutover. No performance number is called achieved until measured.

## Determinism and Index Identity

Given the same source corpus, tokenizer version, feature policy, SVD seed/solver settings, numeric precision, and compiler version, the compiled artifact must have a stable logical identity.

The compiler manifest records:

```text
brain_source_version
brain_source_hash
compiler_version
tokenizer_policy_version
vector_algorithm_version
latent_dimension
index_hash
```

Any change that can alter retrieval results increments a version or hash and is visible in evaluation artifacts.

## Evaluation Gates

Before any production authority change, evaluate at least:

- candidate recall gained on terminology absent from current aliases;
- precision/abstention regression on existing canonical corpus;
- all known alias-collision cases;
- negative-knowledge probes such as COD-versus-revenue and snapshot-versus-flow;
- domain-swap counterfactuals where identical headers have different contextual meaning;
- open-concept behavior for unsupported domains;
- deterministic repeatability of compiled indexes and retrieval outputs;
- runtime memory, cold-load, and per-column query cost.

A Brain release fails if it increases semantic coverage by silently promoting unsupported calculations or materially weakens abstention.

## Real-Data Learning Evidence Pipeline — 2026-09-04

Micro Brain V1 is not an online self-training neural model. Real-world improvement is governed as a corpus-and-evidence lifecycle, not as automatic learning from customer rows.

Approved evidence sources are curated repository/sample corpora; unresolved or ambiguous semantic cases; counterfactual/negative failures; and explicit user corrections that can be reduced to sanitized semantic evidence. Raw customer datasets are local-first and are not uploaded for training by default. An opt-in learning packet may contain normalized header shape, physical type/value-shape summaries, neighboring semantic concepts, candidate/resolution state and explicit correction outcome, but must exclude raw business rows, direct identifiers and customer-specific values unless a later privacy contract explicitly authorizes them.

Feedback never mutates the active Brain immediately. Promotion remains `collect -> sanitize -> review -> candidate knowledge change -> draft -> validated -> indexed -> golden/holdout/counterfactual gates -> performance/safety benchmark -> signed Intelligence Pack`. A malicious or mistaken correction therefore cannot poison the active index by itself.

A later tiny learned ranker (for example logistic regression, boosted trees or a small local MLP) may be evaluated once enough governed examples exist. Its authority is still candidate ranking only. It may not create canonical truth, metric authority, official domain support, formula authority or decision-use authority.

## Evolution Boundary

V1 intentionally favors transparent LSA/BM25 retrieval. A later local neural embedding model may replace or supplement the dense backend only if a benchmark proves meaningful recall/precision benefit within acceptable local resource cost.

Such a backend change does not change the authority model: embedding similarity remains retrieval evidence, not final semantic truth.

## Current Status

Architecture approved and **MB-7 successor-source acceptance is complete** on `codex/r1-roadmap-integration` at `a1f6ee8` (`test(understanding): close micro brain v1 acceptance`). MB-5 domain-inference/support separation remains `8a4a5e4`; MB-6 shared BA authority propagation is `94fa40c`; the Signed Transport proof primitive remains independent ancestor `a8d55ee`. The foundation/shadow line begins at `96fa58e`, the conservative evidence bridge landed at `f32d88d`, and registry alignment at `d4fa6e5`.

MB-7 machine evidence is `apps/desktop/src/lib/understanding-core/micro-brain/baseline/mb7-acceptance.v1.json`. On the shared ARM Neoverse-N1 VPS, active-core MB OFF p50 is ~9.558 s and selective MB p50 ~10.208 s across 30 governed samples / 19 sources / 379 columns: +650 ms / +6.80%. Selective retrieval runs 243 queries per pass with p50 ~2.25 ms, p95 ~2.94 ms and p99 ~3.35 ms. The only active semantic differences are three TTKT `Thời gian dự kiến đến` recoveries from `unknown` to evidence-bound `probable eta`; confirmed regressions are zero. The compiled index is 6,605,467 bytes (~1,866,404 bytes gzip9), deterministic byte SHA-256 `6415fddef704732e0d2e08936aaed729278f4a9c759b30a4daacb1c7ab7d8ec0`. Isolated raw JSON read+parse is ~128 ms; recorded heap delta is ~13.2 MB and RSS delta ~47 MB, with the RSS number treated as allocator/runtime-inclusive process evidence rather than a guaranteed application delta.

The complete release-authoritative `test:release-1.0` suite passes, including production build and governed product regression (11 files / 40 tests). MB-specific determinism/retrieval/counterfactual gates pass 14 files / 41 tests; current oracle/runtime acceptance passes 3 files / 6 tests; Playwright MB-5 + MB-6 passes 2/2. The Micro Brain runtime path has no network dependency and remains below the 64 MB index budget.

This closes MB V1 **source acceptance and cutover review**, not Production deployment. Production services, production domain packs, metric/formula/decision authority and stable release runtime remain unchanged. The Road-to-1.0 main map now owns remaining product UX parity, updater/security integration and packaged release acceptance.

Implementation sequencing is governed by [`../history/agent/plans/AGENT_IMPLEMENTATION_PLAN_MICRO_SEMANTIC_BRAIN_V1_2026-09-04.md`](../history/agent/plans/AGENT_IMPLEMENTATION_PLAN_MICRO_SEMANTIC_BRAIN_V1_2026-09-04.md).
