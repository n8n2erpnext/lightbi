# LightBI Phase 19 - Question Template Foundation

**Date:** 2026-06-01

## New Architectural Decisions
- **ADR-037 (Question Template Architecture)**: Solidified the primary anti-hallucination guardrail for LightBI. Questions are never passed to an LLM to generate SQL or Recipes. They are resolved against predefined `QuestionTemplates`.
- **ADR-038 (Question Classification Model)**: Offloaded the parsing logic into a discrete `QuestionClassifier` responsible for scoring confidence, extracting entities, and producing a `TemplateCandidate`.

## Rust Implementation (`lightbi-question`)
- Created `crates/lightbi-question` to serve as the application's natural language abstraction layer.
- Modeled `QuestionTemplate`, `TemplateParameter`, and `TemplateCandidate`.
- Authored the `QuestionClassifier` (mocked for future LLM / NLP implementation).
- Authored the `TemplateResolver` which applies a strict confidence threshold (`> 0.75`) before allowing a candidate to proceed to Recipe generation.
- Authored the `QuestionTemplateRegistry` to store validated templates.

## Extensibility & Persistence
- Authored `migrations/20260601080000_question_template_foundation.sql` replacing the old unstructured `questions` table with `question_templates`, `template_parameters`, and `template_versions`.
- Attached the `QuestionTemplateRegistry`, `QuestionClassifier`, and `TemplateResolver` to the `ProjectContext`.
