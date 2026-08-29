# LightBI UI/UX Audit Report

**Date**: June 2026
**Subject**: Home Understanding Flow & Investigation Preview Fallback
**Context**: Post-MVP v1 architecture alignment and trust evaluation.

## 1. Strengths: Home Understanding Flow
- **Visual Baseline**: The Home understanding UI currently provides a decent visual baseline, presenting the user with clear entry points into the dataset analysis.
- **Structural Integrity**: It accurately reflects the `DatasetUnderstanding` output.

## 2. Weaknesses: Investigation Flow & Execution Trust
- **Hidden Degraded Execution**: The Investigation preview currently relies on `js_sandbox_fallback` rather than the active backend preview.
- **Trust Issue**: This is a critical trust and transparency problem. A fallback execution implies that the robust DuckDB engine (DU-8) is either bypassed or failed, resulting in a potentially slower, more constrained, or functionally divergent execution. Because this fallback state is not visually prominent to the user, they might assume they are receiving full backend capabilities. If a user makes a business decision assuming robust backend validation when it was actually a degraded frontend sandbox fallback, their trust in the system is broken.

## 3. Next Highest-Value UI Fixes
To resolve these architectural mismatches in the user experience, the next 2 highest-value UI fixes are:

1. **Make Readiness Prominent on Home**
   The underlying `DecisionReadinessTier` logic is solid, but the UI must visually scream if a dataset is capped at `exploratory_only`. Users must know immediately upon viewing the Home card whether the dataset passes health checks for decision support.
2. **Make Fallback/Degraded Execution Visually Obvious in Investigation**
   When the Investigation flow executes via `js_sandbox_fallback`, the UI must clearly display a warning or degraded-mode indicator. Users need explicit feedback that their query is running in a constrained sandbox rather than the robust backend pipeline.
