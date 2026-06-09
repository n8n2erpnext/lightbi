# Development Log: Phase 7 - Question Template Engine

**Date:** 2026-06-01
**Phase:** Phase 7 Question Template Engine Architecture

## Summary
Defined the Question Template Engine to formally implement the "Question First" UX introduced in Phase 6. By mapping questions to templates, LightBI can deterministically guide users from business intent to dataset recipes without strictly requiring an AI integration.

## Architecture Decisions
- **ADR-013 (Question Template Engine):** Decided that predefined questions act as reusable templates. This guarantees deterministic behavior and significantly speeds up user onboarding.
- **ADR-014 (Insight Generation Model):** Established that Insights are derived fundamentally from Questions, rather than just charts. The chart is relegated to a visual representation, while the "Insight" is recognized as the actual product value.

## Schema Decisions
- Added the `QuestionTemplate` schema to `@lightbi/core-types`, storing fields for `recommendedSources`, `recommendedRecipeOperations`, and `suggestedQuestions`.
- Expanded `QuestionCategory` to formally support `MarketingPerformance` alongside existing domains like `TargetVsActual` and `InventoryAnalysis`.

## Implementation Rule
No execution logic, DuckDB connections, or AI API integration was implemented. This phase exclusively defines the architectural roadmap.
