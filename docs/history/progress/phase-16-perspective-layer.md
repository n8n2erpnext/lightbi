# LightBI Phase 16 - Perspective Layer & Question Context Foundation

**Date:** 2026-06-01

## New Architectural Decisions
- **ADR-031 (Perspective Resolution Model)**: Established that a Question cannot exist in a vacuum. It must be resolved into a `Perspective` (e.g., Sales Manager, CEO) before any data operations occur.
- **ADR-032 (Question Context Model)**: Banned the system from passing raw user strings into planners or AI engines. Instead, the `ContextResolver` compiles a strict `QuestionContext` governing exactly which datasets and semantic fields are legally accessible for that query.

## Rust Implementation (`lightbi-perspective`)
- Created `crates/lightbi-perspective` separating user intent from mechanical execution.
- Modeled the `Perspective` struct defining `PerspectiveType` (`Business`, `Role`, `Custom`).
- Modeled the `QuestionContext` which binds the parsed `business_intent` to the active `perspective`, `dataset_scope`, and `semantic_scope`.
- Authored the `PerspectiveRegistry` for in-memory governance and the `ContextResolver` to generate valid contexts safely.

## Extensibility & Persistence
- Authored `migrations/20260601050000_perspective_foundation.sql`. We dropped the old Phase 11 JSON-payload mockup table and replaced it with a strict, normalized schema containing `perspectives`, `perspective_dataset_links`, and `perspective_semantic_links`.
- Re-wired `ProjectContext` to permanently inject the `PerspectiveRegistry` and `ContextResolver`.
