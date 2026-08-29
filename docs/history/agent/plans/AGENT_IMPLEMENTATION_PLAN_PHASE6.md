# ROADMAP-MVP-V1 Phase 6: AI Semantic Briefing Contract (Implementation Plan)

## Next Smallest Valuable Step
The next step is to create the **AI Semantic Briefing Contract**. This provides a local-first, structured context payload for an AI assistant to read *before* it executes commands or interprets raw data, ensuring the AI relies on our deterministic understanding core rather than hallucinating from scratch.

## Target Mode
**AI Mode**. 
(It fulfills the architectural requirement from ADR-110 that "AI reads understanding first" and "AI does not become the source of truth".)

## Touched Files
- `apps/desktop/src/lib/ai-briefing-contract.ts` (New file for the type definition and generator function)
- `apps/desktop/src/lib/ai-briefing-contract.test.ts` (New file for verification)

## Derivation from the Shared Understanding Core
The artifact will be a synchronous, deterministic derivative of `DatasetUnderstanding` with a focus on steering agent behavior safely:
- **`keySemanticFields`**: Derived from `detectedConcepts`. Filters down to the most confident/important fields (measures, dimensions, time) so the AI knows what analytical levers exist.
- **`grain`**: Extracted directly from `understanding.grainHint`.
- **`readinessSummary`**: Derived from `understanding.readiness.tier`, warning the AI if it is looking at an `exploratory_only` dataset.
- **`caveats`**: Combines `understanding.caveats` and `understanding.readiness.caveats` as critical instructions for the AI to factor into any generated SQL/code.
- **`safeActionHints`**: Derived from `understanding.opportunities`. Provides the AI with a pre-vetted list of meaningful analysis paths to prioritize over generic exploration.

## Scope Management (Tight & Practical)
- **No LLM Calls**: This phase only builds the TypeScript contract and the data transformation logic. It does *not* wire up an actual LLM client or prompt execution.
- **No Agent Orchestration**: We are only building the payload the agent *will* read.
- **No UI Changes**: The output is purely a structural contract verified via unit tests.
- **Reusability**: Uses the exact same shared `DatasetUnderstanding` input object as Standard Mode and Advanced Mode, preventing architecture divergence.

## Verification
- Unit tests will prove that `caveats` and `readinessSummary` are prominently surfaced.
- Unit tests will verify that `safeActionHints` correctly extract the top opportunities.
- Typecheck and full test suite run to ensure zero regressions.
