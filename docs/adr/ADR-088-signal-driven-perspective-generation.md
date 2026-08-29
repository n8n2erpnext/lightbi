# ADR 088: Signal-Driven Perspective Generation

## Status
Accepted

## Context
Previously, Perspectives in LightBI were hardcoded into the frontend UI (`Home.tsx`). All 5 perspectives (Operations, Revenue, Inventory, Customer, Performance) were always visible to the user regardless of what data they uploaded. The UI merely acted as a cosmetic filter for a globally generated pool of dataset questions.

This violated LightBI's semantic philosophy, causing users to be presented with analytical paths (e.g. "Operations") that were impossible to execute because the dataset contained no operational evidence.

## Decision
We enforce **Signal-Driven Perspective Generation**.

1. **Derived from Registry:** Perspectives are strictly interpreted outputs that consume the `BusinessSignalRegistry`.
2. **Evidence-Based Rendering:** A Perspective cannot be generated or proposed unless it possesses at least one valid, supporting `BusinessSignal` (e.g., `driver`, `sku`).
3. **No Hardcoded UI Fallback:** The always-visible global list of hardcoded perspectives is abolished. The predefined list now acts exclusively as an internal semantic mapping dictionary (`PERSPECTIVE_DEFINITIONS`).
4. **No Fallback Perspectives:** If a dataset maps to exactly zero known signals, zero perspectives are generated.

## Consequences
- **Positive:** Users are never presented with empty or hallucinated analytical paths. The system guides them only towards what is possible.
- **Positive:** Perspectives are now ranked dynamically based on semantic signal confidence and evidence density.
- **Negative:** Rebuilding the core UI will be necessary to adapt to a dynamically injected array of `PerspectiveCandidate` objects rather than a static map.
