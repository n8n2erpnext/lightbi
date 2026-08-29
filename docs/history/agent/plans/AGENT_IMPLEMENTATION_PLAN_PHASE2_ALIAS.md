# Phase 2: Alias Resolution Implementation Plan

## Goal Description
Improve the robustness of the business signal detector to gracefully handle common structural suffixes and prefixes (e.g., `_amount`, `_name`, `_id`). This directly addresses the "First-Impression Alias Rejection" problem where perfectly clean datasets fail to match signals because their columns use standard database naming conventions rather than exact taxonomy matches.

As explicitly requested, this phase will **strictly** focus on safe suffix/prefix robustness and will **not** include LLM usage, runtime changes, or the cross-domain tiebreaker.

## User Review Required
> [!IMPORTANT]
> The original MVP stabilization memo grouped "Lexical Expansion & Dominance" into a single Phase 2. To honor your explicit request, the "Dominance / Tiebreaker" logic has been deliberately excluded from this plan and deferred to a subsequent phase.

## Proposed Changes

### Target Implementation File
#### [MODIFY] apps/desktop/src/lib/business-signal-detector.ts

1. **Introduce Safe Alias Variants Generation**:
   Instead of just checking if the normalized column name exactly matches the taxonomy, we will strip safe, purely structural affixes to generate variants for matching.
   - **Initial Batch Affixes**: `id`, `name`, `amount`, `value`.
   - Examples: `revenue_amount` -> `revenue`, `driver_name` -> `driver`, `customer_id` -> `customer`.
   - Explicitly excluded for now: `date`, `time`, `code`, `num`, `no` (deferred to prevent false-positive explosions).

2. **Scoring Adjustments**:
   - Exact alias match: `40` points (current behavior).
   - Variant/affix-stripped match: `30` points. This ensures that an exact column match (e.g., `revenue`) always outcompetes a variant match (e.g., `revenue_amount`) if both happen to be present in the dataset.

### Target Test Files
#### [MODIFY] apps/desktop/src/lib/business-signal-detector.test.ts
#### [MODIFY] apps/desktop/src/lib/business-signal-detector.real-vietnamese.test.ts

- We will author new unit tests covering suffix variations against standard expected signals.
- We will actively verify regression protection in `real-vietnamese.test.ts` to ensure English suffix stripping doesn't improperly distort valid Vietnamese terms.

## False Positive Guardrails
To prevent aggressive suffix stripping from overmatching generic columns (e.g., matching a generic `amount` to a specific signal, or stripping `id` from a column like `valid`), the implementation will include:
1. **Directional Stripping**: Only strip these affixes when they occur as distinct lexical boundaries (e.g., `_id`, `-id`, or `<word> id`). Substring replacements inside words are strictly forbidden.
2. **Minimum Length Guard**: Prevent stripping if the resulting base string is too short (e.g., < 3 characters) to reliably map to a complex taxonomy domain.
3. **No Empty Match**: A column completely composed of generic affixes (e.g., `amount_value`) will not be treated as a match for core signals.
4. **Weighted Confidence**: As outlined, variant matches earn lower base confidence (`30` vs `40`), ensuring that the system strongly prefers exact matches when available.

## Verification Plan

### Automated Tests
- Run `npx vitest run business-signal-detector.test.ts`
- Run `npx vitest run business-signal-detector.real-vietnamese.test.ts`
- Ensure tests validating exact vs. variant matches pass, and no existing Vietnamese tests fail.

### Behavioral Verification
- Verify that simulated inputs representing common table schemas correctly extract the required signals despite standard database suffix variations.
