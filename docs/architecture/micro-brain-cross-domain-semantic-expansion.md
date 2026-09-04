# Micro Brain Cross-Domain Semantic Expansion Direction

Status: canonical design direction; future semantic expansion, not current Road-to-1.0 critical path
Date: 2026-09-04
Scope: strategic rationale for Micro Brain, learning lifecycle, cross-domain ontology, corpus growth, domain expansion, and promotion rules
Supersedes: none
Superseded by: none
Primary sources: ./micro-semantic-brain-vector-inference.md, ../adr/ADR-124-micro-semantic-brain-vector-inference.md, ../project-book/LIGHTBI_PROJECT_BOOK.md
Conversation provenance: owner-approved `LIGHTBI_MICRO_BRAIN_CONVERSATION_HANDOFF_2026-09-04.md`, generated outside the repo and distilled here; implementation status reconciled against current repo truth.

## Purpose

Record the owner-approved reason Micro Brain exists and the durable direction for expanding LightBI semantic breadth after MB V1. This document is intentionally about **why and where to grow the semantic system**, not about changing current metric/runtime authority.

The source discussion was consolidated outside the repository on 2026-09-04 so another session would not dirty an active worktree. This document distills that owner-approved rationale into the canonical library while preserving current repo truth: MB V1 has already completed source acceptance through MB-7; this future expansion does not reopen MB-7 or bypass the current Road-to-1.0 sequence.

## Why Micro Brain exists

A finite dictionary can never enumerate every header, abbreviation, mixed-language label, internal code, or industry-specific term that appears in real business data.

The problem is not merely missing aliases. Real datasets may contain:

- local abbreviations unknown outside one company;
- different names for the same broad role across industries;
- identical surface words with different analytical meaning;
- weak or opaque headers whose meaning is only visible from type, values, siblings, grain, time behavior, or arithmetic structure;
- schemas that use generic letters such as `A`, `B`, `C`, or internal numeric codes and rely on a separate company dictionary.

Micro Brain exists so LightBI does not become a never-ending alias-patching system.

The durable hierarchy is:

```text
Dictionary / Semantic Registry
  -> exact and known lexical recognition + canonical identity

Micro Brain
  -> semantic recall, interpolation, relations, negative knowledge, open concepts

Evidence Resolver
  -> truth / abstention decision

Domain Support
  -> official product assurance

Metric Runtime
  -> calculation and execution authorization
```

A broader semantic hypothesis never substitutes for later evidence or execution authority.

## Pathological-schema motivation

Consider an inventory-like source whose columns are only:

```text
A  B  C  D  E  F  G
```

and whose rows make a structural relation look like:

```text
G ~= D + E - F
```

LightBI may hypothesize that the fields resemble opening quantity, inbound quantity, outbound quantity, and closing quantity. It must not silently promote that structural resemblance into confirmed semantics when the source does not provide enough evidence.

Correct behavior is evidence-bound language such as:

> A group of fields appears structurally consistent with an inventory-flow relationship, but source semantics are insufficient to confirm the exact field meanings.

Such adversarial or opaque schemas are valuable Micro Brain stress tests because they measure generalization and abstention rather than memorized aliases.

## V1 machine-learning interpretation

Micro Brain V1 is a lightweight local machine-learning retrieval and latent-semantic model. It is not a neural network and does not use gradient descent, epochs, backpropagation, GPU training, or remote inference.

Its learned dense space is produced by:

```text
validated knowledge cards
  -> TF-IDF feature matrix
  -> SVD / LSA
  -> local latent semantic projection
```

Sparse retrieval is compiled in parallel with BM25, and runtime retrieval fuses sparse and dense rankings with reciprocal-rank fusion.

The current accepted V1 implementation uses the deterministic local architecture described in `micro-semantic-brain-vector-inference.md`. The owner-approved interpretation of "train Micro Brain" is therefore:

> curate and validate reusable knowledge, rebuild the sparse/dense index, then pass regression, counterfactual, determinism, safety, and performance gates.

It is not model-weight transfer from GPT and it is not uncontrolled online learning from user files.

## Foundation provenance

The initial dense precision foundation was distilled from GPT-5.6 Sol business knowledge into structured knowledge cards. Sol is not present at runtime; its role was knowledge synthesis, not weight transfer.

Conceptually:

```text
GPT-5.6 Sol
  -> structured symbolic business knowledge
  -> validated knowledge cards
  -> TF-IDF + SVD/LSA + BM25
  -> Micro Brain index
```

At runtime:

```text
Sol       absent
Internet  absent
API key   absent
MB        operational locally
```

Registry augmentation and LightBI contracts complement the synthesized precision cards. Generated dictionary expansion must not be allowed to rotate/dilute the dense semantic space merely to achieve nominal vocabulary coverage.

## Learning from real data: evidence, not self-training

Production semantic truth must never self-update directly from a user's dataset or a single user correction.

Forbidden pattern:

```text
one user dataset
  -> one interpretation/correction
  -> automatic production Brain mutation
```

That design is vulnerable to accidental semantic poisoning, customer-specific terminology leakage, and false generalization.

The preferred lifecycle is:

```text
real dataset / user correction / unresolved case / counterfactual failure
  -> sanitized learning evidence
  -> reusable concept candidate
  -> offline review and validation
  -> draft knowledge change
  -> validated corpus batch
  -> rebuild index
  -> golden + holdout + counterfactual tests
  -> grain/formula/negative-knowledge safety gates
  -> performance benchmark
  -> signed Intelligence Pack or future app release
```

Raw customer values are not required for most semantic learning. A sanitized evidence packet can retain the normalized header, physical type, value shape, neighboring canonical concepts, candidate concept, resolver state, and explicit user feedback while omitting names, phone numbers, transaction IDs, or other source records.

Sample datasets primarily serve as:

- adversarial tests;
- knowledge-gap discovery;
- regression tests;
- counterfactual tests;
- held-out terminology tests.

The core owner rule remains: **Có bằng chứng thì nói có. Thiếu bằng chứng thì nói thiếu.**

## Negative knowledge is first-class

Semantic breadth is unsafe without explicit confusion knowledge. The Brain must know not only what a concept resembles but what it must not be confused with.

High-value examples include:

```text
cash receipt      != revenue
bank inflow       != revenue
invoice total     != net revenue
unit price        != revenue
inventory value   != COGS
stock on hand     != stock movement
COD amount        != revenue
COD amount        != freight fee
ETA               != actual completion time
accounts payable  != expense
debit             != expense
credit            != revenue
```

Broadening recall must never weaken these distinctions or abstention behavior.

## Guarded formulas remain evidence-bound

Formula knowledge is not a shortcut to metric authority. A reusable formula card carries required inputs, grain, units, time basis, blockers, and confusion cases.

For example:

```text
Gross Profit = Revenue - COGS
```

is only safe when relevant grain, currency, period, relationship, and repeated-parent-total constraints are satisfied. Formula retrieval may suggest a hypothesis; governed metric/runtime layers remain the execution authority.

## The 10 MB target is a guardrail, not a ceiling

The original approximately 10 MB source-knowledge target was selected as a conservative engineering guardrail for normal personal computers. It is not a permanent product ceiling.

As semantic breadth grows, runtime cost should not be forced to scale linearly with total knowledge. Future optimization directions include:

- core + optional domain packs;
- domain shards and lazy loading;
- sparse-first routing;
- hot/cold semantic tiers;
- memory mapping or compact binary storage;
- vector quantization where quality gates permit it;
- hierarchical retrieval;
- loading only relevant semantic neighborhoods after broad domain/context detection.

The long-term objective is **modular knowledge growth with bounded local runtime cost**.

## Cross-domain ontology is the next semantic problem

The same broad business role has different language across industries. These terms should share higher-level relations while remaining distinct concepts.

Example party/service-recipient family:

```text
party / service recipient
  |- commerce     -> customer / buyer
  |- healthcare   -> patient
  |- hospitality  -> guest / staying guest
  |- education    -> student
  |- banking      -> account holder / customer
  |- insurance    -> policyholder / claimant
  |- SaaS         -> subscriber / user / account
  `- real estate  -> tenant
```

The correct design is **not** `patient = customer` or `student = customer`. The higher-level family supports transfer learning while domain context preserves the specific meaning.

The same principle applies to many other semantic families: resource, provider, obligation, reservation, entitlement, balance, flow, capacity, asset, inventory item, service unit, and event.

## Same surface idea, different analytical structure

A major purpose of the ontology is preventing broad vocabulary from collapsing distinct analytical structures.

Example:

```text
available hotel rooms
  -> capacity availability
  -> room / room-night service capacity
  -> time-bound availability

water bottles in hotel stock
  -> physical inventory
  -> SKU / UOM
  -> stock-on-hand and movement
```

Both represent "something available", but one is service capacity and the other is physical inventory.

The higher-level family should therefore look more like:

```text
availability
  |- capacity availability
  |    -> room / seat / appointment / machine slot
  `- physical stock availability
       -> medicine / bottle / material / product
```

## Pharmaceutical specialization

A generic `product` concept can specialize into a pharmaceutical product / drug / medicine, but medicine inventory adds semantics that ordinary SKU inventory may not carry:

- batch / lot;
- expiry date;
- active ingredient;
- dosage form;
- strength;
- storage temperature;
- recall status.

`100 bottles of water` and `100 medicine boxes, 60 expiring next week` may share a stock quantity while requiring very different analysis. Context changes analytical meaning, not merely the display label.

## Banking specialization

Banking is a high-value finance specialization because naïve finance mappings are dangerous.

Typical concepts include account, opening balance, debit, credit, closing balance, transaction date, and value date.

Required negative knowledge includes:

```text
credit              != revenue
debit               != expense
deposit             != revenue
withdrawal          != expense
loan disbursement   != revenue
principal repayment != income
account balance     != cash flow
```

Banking may remain a finance specialization rather than a completely independent top-level domain, provided its vocabulary and confusion rules are explicit.

## Why science primitives matter

Adding chemistry, physics, and biology primitives does not mean turning LightBI into scientific-analysis software. Broad scientific concepts strengthen semantic coverage in manufacturing QC, pharmaceutical labs, food testing, environmental monitoring, IoT, agriculture, and healthcare.

Useful transferable primitives include:

```text
measurement
sample / specimen
experiment / observation
concentration
temperature / pressure
mass / volume / rate
reaction / condition
control / replicate
uncertainty
```

The value is semantic breadth and transfer, not official support for every scientific workflow.

## Expansion scope

The next major semantic initiative is named **LightBI Cross-Domain Semantic Expansion**.

Priority breadth:

```text
Existing six business domains

+ Hospitality
  - hotel
  - resort

+ Healthcare / life science
  - hospital / clinical
  - pharmaceutical

+ Agriculture
  - crop / cultivation
  - livestock
  - aquaculture

+ Manufacturing
  - production
  - quality
  - maintenance

+ Banking / financial-services specialization

+ Science primitives
  - chemistry
  - physics
  - biology
```

This is a semantic breadth target, not a commitment that every listed area immediately becomes an officially supported LightBI domain pack.

## Universal primitives before industry count

The objective is not to advertise "100 supported industries". The objective is to build enough reusable semantic structure that an unfamiliar industry can still be partially understood.

Strengthen universal primitives such as:

```text
party
service recipient
provider
asset
resource
capacity
inventory item
service
event
transaction
location
money
obligation
availability
consumption
reservation
balance
flow
snapshot
entitlement
```

With sufficient breadth, an unknown fitness/gym dataset can map `member` toward service recipient/subscriber, `check-in` toward attendance/event, `trainer` toward provider/employee, and `class capacity` toward service capacity without pretending that a fitness domain pack already exists.

Likewise, aviation terms such as passenger, booking, seat, fare, and load factor can be related to service recipient, reservation, capacity unit, service price, and utilization while the domain remains officially unsupported.

## Domain research deliverables

Vocabulary research is only the surface layer. Each domain batch should include:

- terminology and abbreviations;
- concept hierarchy;
- semantic families;
- cross-domain relations;
- explicit distinctions / negative knowledge;
- identifiers and grain;
- measures and units;
- statuses and events;
- temporal semantics;
- guarded formulas and blockers;
- representative counterfactuals.

Do not reduce the initiative to "add more aliases".

## Promotion boundaries

Not every understood concept belongs in the canonical registry or an official domain pack.

Use the layers deliberately:

```text
Canonical Semantic Registry
  -> stable official concepts and normalization vocabulary

Micro Brain open concept
  -> understood/retrievable concept not yet officially normalized

Domain Support Pack
  -> officially supported product capability and assurance
```

Promotion into the registry should require stable reusable meaning. Promotion into a domain pack requires product-level support, evidence, metric/runtime contracts, and acceptance beyond mere semantic retrieval.

## Batch retuning policy

Do not rebuild/release the Brain for every few new words. Prefer meaningful corpus batches that materially improve one semantic neighborhood or cross-domain family.

After a meaningful expansion batch, run at least:

```text
held-out terminology
cross-domain ambiguity
domain-swap counterfactuals
negative-knowledge probes
open-concept behavior
grain safety
formula safety
deterministic rebuild
no-network/local-only verification
performance benchmark
release-authoritative regression
```

A semantic expansion fails if it increases recall by weakening abstention, collapsing distinct domain semantics, creating metric authority, or materially regressing existing canonical behavior.

## Relationship to Intelligence Pack updates

Future validated knowledge/index changes are suitable candidates for the planned data-only Intelligence Pack lifecycle. This does not grant permission for arbitrary executable algorithm updates through the same path.

The semantic lifecycle is therefore intended to become:

```text
curated validated corpus batch
  -> deterministic rebuild
  -> acceptance gates
  -> signed/versioned Intelligence Pack
  -> compatibility check
  -> staged load
  -> atomic activation / rollback
```

The exact Intelligence Pack signing/root contract is owned by `road-to-1-0-trust-release-contract.md` and must remain distinct from runtime request signing.

## Non-goals and safety boundaries

This direction does not:

- reopen or weaken MB-7 acceptance;
- change the current Road-to-1.0 critical path;
- mark the proposed expansion domains as production-active;
- allow raw user datasets to self-train production semantic truth;
- turn retrieval similarity into semantic confidence;
- allow open concepts to authorize metrics, joins, formulas, or decision use;
- require every niche to receive a dedicated dictionary or domain pack;
- freeze the Brain to a permanent 10 MB ceiling;
- require a neural embedding model.

A future neural or alternative embedding backend may replace/supplement LSA only when local benchmarks prove a meaningful quality gain without changing the authority hierarchy.

## Current sequencing

As of the 2026-09-04 successor state, MB V1 source acceptance is complete through MB-7 at product commit `a1f6ee8`. The current Road-to-1.0 critical path remains multi-file UX parity / Focus Subject, Intelligence Pack/update trust, Signed Transport integration, and packaged Windows/UAT + integrated release acceptance.

Cross-Domain Semantic Expansion is a durable future semantic lane. It may be researched or prepared independently, but it must not displace the current 1.0 critical path unless the owner explicitly changes sequencing.

## One-sentence philosophy

> Build enough explicit semantic structure that LightBI can reason about unfamiliar data, but never let semantic similarity become a substitute for evidence.

## Source bookmarks

- [`micro-semantic-brain-vector-inference.md`](./micro-semantic-brain-vector-inference.md) — implemented MB V1 architecture, authority chain, current acceptance state.
- [`../adr/ADR-124-micro-semantic-brain-vector-inference.md`](../adr/ADR-124-micro-semantic-brain-vector-inference.md) — durable architecture decision.
- [`road-to-1-0-trust-release-contract.md`](./road-to-1-0-trust-release-contract.md) — Intelligence Pack/update trust boundary.
- [`../project-book/LIGHTBI_PROJECT_BOOK.md`](../project-book/LIGHTBI_PROJECT_BOOK.md) — current project truth and semantic direction summary.
