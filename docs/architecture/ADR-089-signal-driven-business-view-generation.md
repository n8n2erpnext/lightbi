# ADR 089: Signal-Driven Business View Generation

## Status
Accepted

## Context
In previous implementations, `Business View` was a hardcoded UI sub-menu beneath `Perspective`. If a user selected the "Operations" Perspective, they were blindly offered "Logistics Journey", "Delivery SLA", and "Driver Performance" Business Views. 

This led to the "Fatal Fallback" bug, where a user could select "Logistics Journey" on an Inventory dataset. Because no logistics questions existed, the system fell back to rendering raw Inventory questions under a Logistics title.

A Perspective represents a broad domain of analysis (e.g., Operations). A Business View represents a specific analytical workflow (e.g., Logistics Journey). A Perspective alone is mathematically insufficient to prove that a specific Business View is possible.

## Decision
We enforce **Signal-Driven Business View Generation**.

1. **Composite Requirement:** A Business View is an interpretation candidate generated only when a `PerspectiveCandidate` is combined with specific `BusinessSignal` evidence from the `BusinessSignalRegistry`.
2. **Registry-Driven Architecture:** All valid Business Views are registered in a strict definition map (`BUSINESS_VIEW_REGISTRY`).
3. **Minimum Evidence Thresholds:** Every registered Business View defines required signals and a `minimumMatch` threshold. For example, `Logistics Journey` requires `driver`, `route`, and `delivery_status` (minimumMatch: 3). If `delivery_status` is missing, the view cannot be generated.
4. **No Fallback Rule:** If a dataset yields a Perspective but lacks the specific signals required for any registered Business View, zero Business Views are generated. There are no generic "default" views.

## Consequences
- **Positive:** Guarantees that every Business View presented to the user is actually analytically viable given their dataset.
- **Positive:** Prevents the "Fatal Fallback" cross-domain question contamination bug.
- **Negative:** Datasets missing a single critical column (e.g., missing `delivery_status`) will fail to generate complex views like `Logistics Journey`, dropping the user into a lower-tier view or providing no view at all, forcing them to fix their dataset.
