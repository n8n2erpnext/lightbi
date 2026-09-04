# ADR-124: Micro Semantic Brain for Evidence-Bound Vector Inference

Status: accepted design direction; implementation not started
Date: 2026-09-04
Scope: semantic candidate recall, long-tail domain inference, evidence provenance, and support disclosure
Supersedes: none
Superseded by: none
Primary sources: ../architecture/phase-3a-semantic-candidate-evidence-verification.md, ../architecture/phase-3b1-contextual-evidence-aggregation.md, ../architecture/phase-3b2a-semantic-resolution-shadow.md, ../architecture/phase-0-semantic-support-audit.md, ../project-book/LIGHTBI_PROJECT_BOOK.md

## Context

LightBI already has a deterministic canonical semantic registry and a conservative evidence resolver. The current registry contains hundreds of canonical signals and many aliases, but Phase 3A intentionally remains lexical: it does not perform embeddings, ontology expansion, or semantic interpolation.

That boundary protects trust but limits recall when a source uses unfamiliar terminology, abbreviations, translated business language, or a domain that has no official LightBI domain pack.

The owner-approved direction is to add a small local semantic knowledge layer, initially budgeted around 10 MB of curated source knowledge, without turning LightBI's understanding authority into a generative-AI dependency.

## Decision

Add a **Micro Semantic Brain** before canonical semantic resolution. It is a local retrieval and inference subsystem, not an AI authority and not a replacement for `semantic-registry.ts`.

The semantic path becomes:

```text
physical profile + representative evidence
  -> canonical lexical candidate generation
  -> Micro Brain semantic retrieval / relation expansion
  -> merged candidate + conflict evidence
  -> existing contextual evidence aggregation
  -> conservative semantic resolution
  -> grain / relationship / readiness gates
  -> domain-support classification
  -> governed or explicitly inferred analysis
```

## Two Authorities, Two Jobs

1. **Micro Brain** asks: “What business concept could this evidence mean?” It broadens recall and may infer an unsupported domain.
2. **Canonical Registry** asks: “If this is a LightBI-recognized concept, what canonical ID and contract represent it?” It remains the normalization authority.
3. **Domain Support Manifest** asks: “What level of product assurance is officially supported?” It remains separate from recognition.
4. **Metric/runtime gates** ask: “May this fact be calculated or used for a decision?” They remain separate from all three.

Official domain support therefore determines assurance, not raw semantic capability. Lack of an official pack must not force LightBI to ignore evidence it can explain; it also must not silently upgrade inferred semantics into supported metrics.

## Vector Retrieval Rule

Vector similarity is **retrieval similarity**, never semantic confidence. A vector hit may add a candidate or relation clue, but it cannot by itself create `probable`, `confirmed`, metric authorization, relationship authorization, or decision-use authorization.

The initial vector implementation must be deterministic and local. The preferred V1 is a hybrid sparse/dense index compiled from curated knowledge: normalized tokens and character n-grams for lexical robustness, TF-IDF/BM25-style sparse retrieval, and an offline latent semantic projection such as truncated SVD/LSA for dense cosine retrieval. A future neural embedding model may be evaluated only as an optional replacement retrieval backend after deterministic V1 has a measured baseline.

## Unsupported-Domain Behavior

When evidence supports a domain that has no official pack, LightBI may expose an inferred domain and perform evidence-bounded analysis that independently passes generic grain/aggregation safety. The UI must disclose that the domain is not officially supported and that the analysis was produced through semantic inference.

Required Vietnamese disclosure baseline:

> Domain này chưa được LightBI hỗ trợ chính thức. Phân tích dưới đây được thực hiện bằng mô hình nội suy ngữ nghĩa dựa trên cấu trúc và bằng chứng có trong dữ liệu; các phép tính chỉ được sử dụng khi vượt qua kiểm tra dữ liệu và an toàn tổng hợp.

## Non-Negotiable Invariants

- The Micro Brain is local-first and does not require an online LLM or vector service.
- Raw user data is not uploaded for semantic retrieval.
- Retrieval similarity is provenance, not truth and not confidence.
- Vector-only evidence cannot authorize a metric.
- A retrieved concept that bridges to an existing canonical signal must still pass independent physical/context evidence rules.
- A retrieved concept with no canonical registry bridge remains an open inferred concept; it cannot impersonate a supported canonical signal.
- Negative knowledge and contradiction evidence are first-class. For example, COD collected value is not revenue by default; inventory value is not COGS by default.
- File names, corpus IDs, customer names, and expected test answers must not become production semantic rules.
- Unknown and ambiguous remain valid outcomes.
- Grain, relationship, M1/M2/M3, metric preflight, and execution restrictions remain downstream authorities and cannot be bypassed.
- Focus, Deep BA, and BA Step 2 must consume provenance/support state rather than silently promoting `inferred` to `supported`.

## Consequences

The current 321-signal registry becomes the canonical vocabulary layer rather than the maximum boundary of semantic recall. Brain knowledge can grow independently from the canonical vocabulary and official domain packs.

A long-tail domain can therefore be recognized and described before it is officially supported. Officialization remains a separate process requiring canonical mappings, domain contracts, negative rules, corpus evidence, metric correctness, and acceptance gates.

The knowledge corpus becomes a product asset with versioned source text, compiled index identity, deterministic retrieval behavior, and regression evidence.

## Current Status

Design accepted on 2026-09-04. No product code, runtime wiring, support enum, metric authority, or production behavior is changed by this ADR. Implementation must begin in shadow mode on a clean product worktree.

## Source Bookmarks

- [`../architecture/micro-semantic-brain-vector-inference.md`](../architecture/micro-semantic-brain-vector-inference.md) — implementation-grade architecture and algorithm contract.
- [`../architecture/phase-3a-semantic-candidate-evidence-verification.md`](../architecture/phase-3a-semantic-candidate-evidence-verification.md) — current candidate boundary and explicit no-embeddings limitation.
- [`../architecture/phase-3b1-contextual-evidence-aggregation.md`](../architecture/phase-3b1-contextual-evidence-aggregation.md) — evidence-family independence and anti-double-counting rules.
- [`../architecture/phase-3b2a-semantic-resolution-shadow.md`](../architecture/phase-3b2a-semantic-resolution-shadow.md) — conservative resolver and abstention lattice.
- [`../architecture/phase-0-semantic-support-audit.md`](../architecture/phase-0-semantic-support-audit.md) — recognition versus product-support boundary.
- [`../project-book/LIGHTBI_PROJECT_BOOK.md`](../project-book/LIGHTBI_PROJECT_BOOK.md) — canonical product architecture and trust invariants.

## Follow-up

Implement the staged plan in [`../history/agent/plans/AGENT_IMPLEMENTATION_PLAN_MICRO_SEMANTIC_BRAIN_V1_2026-09-04.md`](../history/agent/plans/AGENT_IMPLEMENTATION_PLAN_MICRO_SEMANTIC_BRAIN_V1_2026-09-04.md). The first implementation gate is contract and corpus construction, not production wiring.
