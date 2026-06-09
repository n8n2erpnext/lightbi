# LightBI Phase 17 - Recipe Foundation & Analytical Intent Model

**Date:** 2026-06-01

## New Architectural Decisions
- **ADR-033 (Recipe Architecture)**: Established the Recipe as the canonical, execution-agnostic representation of operations. Banned recipes from holding SQL or runtime logic. The rule is strictly `QuestionContext -> Recipe -> Planner`.
- **ADR-034 (Analytical Intent Model)**: Formalized the vocabulary used to build recipes. Defined explicit intents like `AggregationIntent`, `RankingIntent`, and `ComparisonIntent` to structure analytical requests perfectly.

## Rust Implementation (`lightbi-recipe`)
- Created `crates/lightbi-recipe` to govern the translation of intent into structure.
- Modeled the `AnalyticalIntent` enums and the `Recipe` struct.
- Built the `RecipeRegistry` for secure in-memory lookup.
- Built the `RecipeValidator` which acts as the ultimate gatekeeper, guaranteeing that malformed recipes (or those violating the Perspective Scope) are rejected before execution planning begins.

## Extensibility & Persistence
- Authored `migrations/20260601060000_recipe_foundation.sql`. We dropped the old Phase 11 JSON mockup and replaced it with a normalized schema (`recipes`, `recipe_intents`, `recipe_dependencies`).
- Merged the `RecipeRegistry` and `RecipeValidator` directly into `ProjectContext`.
