# ADR 085: Business Signal Registry

## Status
Accepted

## Context
The recent architectural audit (`AUDIT-perspective-business-view-question.md`) identified a critical flaw: LightBI was generating questions directly from raw dataset fields, while treating Perspectives and Business Views strictly as UI filters. This contradicts the core LightBI philosophy which requires semantic understanding to drive questioning.

To fix this, we need a canonical semantic layer that sits above raw data but below the analytical layers (Perspective/View/Question). This layer must isolate all downstream systems from the variability of raw dataset columns.

## Decision
We introduce the **Business Signal Registry** as a first-class architectural component.

1. **Foundational Unit:** The `BusinessSignal` becomes the fundamental semantic unit of LightBI. 
2. **Source of Truth:** The Signal Registry is the sole source of truth for semantic understanding in the application.
3. **Producer-Consumer Contract:**
   - **Detectors** (Regex, NLP, Embeddings, AI) are strictly *producers*. Their only job is to emit `BusinessSignal` records into the registry.
   - **Analytical Layers** (Perspectives, Business Views, Questions, Insights, Confidence) are strictly *consumers*. They read from the Signal Registry.
4. **Hard Prohibition:** The Question Engine, Perspective Generator, and Business View Generator must **never** consume or read raw column names or dataset profiles directly. They must operate exclusively on `BusinessSignal` objects.

## Consequences
- **Positive:** Perfect isolation between data ingestion and analytical intent. If a column name changes from `Tài xế` to `Delivery Agent`, only the detector needs to update; the downstream Question Engine remains untouched.
- **Positive:** Enables multi-detector strategies (e.g., combining Regex detectors with LLM detectors) without changing how Business Views work.
- **Negative:** Adds architectural overhead and forces an immediate rewrite of the question generation pipeline to migrate away from dataset column dependency.
