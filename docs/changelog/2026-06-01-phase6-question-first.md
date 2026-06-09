# Development Log: Phase 6 - Question First Analytics

**Date:** 2026-06-01
**Phase:** Phase 6 Question First Analytics Architecture

## Summary
Defined the user experience flow for LightBI. Traditional BI forces technical data modeling onto users from day one. LightBI introduces a "Question First" approach, mapping user intent directly to Data Recipes.

## Architecture Decisions
- **ADR-011 (Question First Analytics):** Formalized the interaction pipeline: `Question -> Suggested Data -> Recipe -> Dataset -> Chart -> Dashboard`. This dramatically lowers the barrier to entry for SME users.
- **ADR-012 (Virtual Dataset First):** Mandated that datasets exist merely as virtual abstractions of recipes by default. Materialization to disk/DB is strictly optional to avoid storage bloat and improve rapid iteration.

## Schema Additions
- Added `UserQuestion` schema to `@lightbi/core-types` alongside categories such as `RevenueAnalysis`, `InventoryAnalysis`, etc.
- No execution logic was built. The architecture strictly dictates that intent flows to recipes, and recipes flow to the execution engine.

## Future AI Implications
AI functions seamlessly in this architecture as an "Intent Interpreter." AI suggests the recipes and charts based on the Question, but it holds no execution power. The Rust Core remains the only entity capable of deterministic execution.
