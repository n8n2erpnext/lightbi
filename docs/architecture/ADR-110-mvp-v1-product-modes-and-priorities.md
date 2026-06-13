# ADR 110: MVP v1 Product Modes and Priorities

## 1. Context
LightBI has now converged on a clearer product identity:

- It is a **Business Understanding Layer**, not a classic dashboard builder.
- It must serve more than one audience.
- It must remain aligned with the local-first architecture.

Recent product clarification established three intended usage modes:

1. **Standard Mode**
   For domain users and SMEs who need understanding, visualization, and decision support.
2. **Advanced Mode**
   For Data Analysts who need fast semantic classification and raw-data preparation.
3. **AI Mode**
   For local-first AI assistants that need a semantic briefing layer before executing user intent.

The risk is that these modes could accidentally become three separate products, which would slow MVP delivery and fragment the architecture.

We need a strict MVP v1 prioritization rule that keeps the scope small while preserving the long-term product direction.

## 2. Decision

### 2.1 One core understanding engine, multiple outputs
LightBI MVP v1 will not build three independent mode-specific architectures.

Instead, MVP v1 will build and harden **one shared Dataset Understanding core**, and expose different outputs for different audiences.

Core shape:

`Raw Data -> Business Signals -> Dataset Understanding -> Mode-specific outputs`

This is the only acceptable architecture for MVP v1.

### 2.2 Standard Mode is the primary MVP path
MVP v1 is optimized first for **Standard Mode**.

This means MVP v1 must prioritize:

- understanding-first UX
- covered-domain semantic interpretation
- one-click analysis opportunities
- investigation preview and chart output
- decision-readiness guidance based on data quality / trust thresholds

For MVP v1, the primary product success question is:

`Can a normal domain user upload raw data, understand it quickly, and know whether it is trustworthy enough to support a decision?`

### 2.3 Advanced Mode is a structured secondary output of the same core
Advanced Mode is in scope for MVP v1 only where it reuses the same understanding core.

Allowed MVP v1 Advanced outputs:

- canonical field-role classification
- dimension / measure / time / status labeling
- semantic lineage from raw column to canonical concept
- caveats and quality issues relevant to data preparation
- lightweight clean-data handoff artifact

Not allowed for MVP v1:

- building a full no-code ETL platform
- building a full data wrangling IDE
- replacing dbt / Python / notebook workflows entirely

Advanced Mode in MVP v1 is a **semantic acceleration layer**, not a full transformation system.

### 2.4 AI Mode is a support layer, not a separate primary path
AI Mode remains in scope only as a **local-first support layer** on top of the shared understanding core.

Its MVP v1 responsibility is limited to:

- reading key columns and semantic roles quickly
- reading grain / readiness / caveats before action
- reducing blind execution by AI agents

AI Mode must not become:

- the source of truth
- a cloud-dependent interpretation path
- an excuse to bypass deterministic understanding contracts

Rule:

`AI reads LightBI understanding before acting.`

Not:

`AI invents understanding on top of raw data by itself.`

### 2.5 Local-first remains non-negotiable
All three modes must remain aligned with ADR-002.

Therefore:

- basic understanding must not require cloud AI
- semantic interpretation should remain local whenever feasible
- AI Mode must prefer local semantic briefing before any remote reasoning
- raw datasets should not need to leave the local environment just to obtain structural understanding

### 2.6 MVP v1 implementation priority order
When tradeoffs occur, prioritize in this exact order:

1. **Protect the Understanding Core**
   Signals, understanding contract, readiness logic, and execution lineage must remain correct.
2. **Complete the Standard Mode path**
   Raw data -> understanding -> analysis opportunity -> investigation -> answer.
3. **Add lightweight Advanced outputs**
   Only when they are direct structured outputs of the same core.
4. **Add AI Mode integration**
   Only as a local-first semantic briefing layer on top of the same core.

If a proposed feature weakens this order, it is not MVP v1 work.

## 3. Required MVP v1 Outputs

### 3.1 Standard Mode outputs
- What LightBI Found
- analysis opportunities
- investigation result / preview
- visible trust / readiness guidance

### 3.2 Advanced Mode outputs
- semantic field-role classification
- raw-to-canonical mapping
- caveats relevant to cleaning
- lightweight clean-data handoff artifact

### 3.3 AI Mode outputs
- semantic keys briefing
- dataset grain hint
- trust / readiness summary
- caveat summary before action

## 4. Explicit Non-Goals for MVP v1

- No attempt to become a full general-purpose BI replacement.
- No attempt to become a full ETL or notebook replacement.
- No cloud-dependent AI path for basic understanding.
- No divergence into separate Standard / Advanced / AI pipelines.
- No feature work that bypasses the shared Dataset Understanding core.

## 5. Consequences

### Positive
- MVP stays fast because all modes reuse one architectural core.
- Product identity stays coherent.
- Standard Mode can ship first without painting Advanced or AI Mode into a corner.
- Advanced and AI capabilities become outputs of understanding, not side systems.

### Negative
- Some attractive advanced features must wait until after MVP v1.
- AI Mode will initially feel narrower than a general AI analyst.
- Advanced Mode will initially accelerate preparation, not fully automate all cleaning.

## 6. Final Rule
For MVP v1, every new feature must answer this question before implementation:

`Does this strengthen the shared Dataset Understanding core or one of its direct outputs?`

If the answer is no, it should not enter MVP v1.
