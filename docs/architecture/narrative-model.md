# Analytical Narrative Model

The Analytical Narrative Model prevents AI hallucinations by ensuring that the core meaning of data is derived deterministically using math, not language models.

## The Narrative Structure
An `InsightNarrative` contains:
1. `observation_text`: The human-readable fact (e.g., "Revenue grew by 5%").
2. `supporting_metrics`: The exact numerical proofs `{ "growth_pct": 0.05, "revenue_start": 1000, "revenue_end": 1050 }`.
3. `confidence`: A float representing the mathematical significance of the observation.
4. `source_references`: Pointers back to the exact dataset columns, ensuring full traceability.

## The Validator
Before a narrative is saved to the Registry, the `InsightValidator` intercepts it. 
If the `confidence` is below the threshold (e.g. 0.60), or if `supporting_metrics` are missing, the narrative is destroyed. LightBI will not present dubious or unsupported claims to a user.
