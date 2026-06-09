# LightBI Phase 23 - Insight Foundation & Analytical Narrative Model

**Date:** 2026-06-01

## New Architectural Decisions
- **ADR-045 (Insight Architecture)**: Defined Insights as first-class analytical assets. They answer "What does it mean?" completely independently of Charts answering "What happened?".
- **ADR-046 (Analytical Narrative Model)**: Established deterministic narratives. We explicitly rejected the idea of feeding raw data directly to an LLM to generate business insights. Instead, Insights are generated using mathematical models, creating a structured `InsightNarrative` that contains irrefutable supporting metrics.

## Rust Implementation (`lightbi-insight`)
- Created `crates/lightbi-insight` to house the meaning-extraction layer.
- Modeled `Insight` and `InsightType` (`Observation`, `Trend`, `Anomaly`, `Comparison`, `Recommendation`).
- Authored the `InsightNarrative` structure ensuring that every observation carries its numerical proof (`supporting_metrics`) and lineage (`source_references`).
- Authored the `InsightValidator` which acts as a strict guardrail, discarding any narrative with a low confidence score.
- Authored the `InsightRegistry` to cache generated insights.

## Extensibility & Persistence
- Authored `migrations/20260601120000_insight_foundation.sql` establishing the SQLite tables: `insights`, `insight_metrics`, and `insight_versions`.
- Securely injected the `InsightRegistry` and `InsightValidator` into the `ProjectContext`.
