# Milestone 8: Business Confidence & Trust Layer

## Purpose
Define how LightBI evaluates whether an answer is trustworthy. This milestone introduces the architecture required to prevent the system from blindly executing queries and presenting results without context or confidence estimation.

## Planned Phases
- **Phase R:** Result Validator Contract (COMPLETED)
- **Phase R.5:** Business Confidence Formula Design (COMPLETED)
- **Phase R.6:** Confidence Signal Registry (COMPLETED)
- **Phase T.1:** Dataset Health Engine MVP (COMPLETED)
- **Phase T.2:** Business Confidence Engine MVP (COMPLETED)
- **Phase T.3:** Trust Layer Wiring Review & Cleanup (COMPLETED)
  - *DuckDB runtime remains deferred until Trust Layer is fully verified*
- **Phase S:** DuckDB Preview Runtime (COMPLETED)
- **Phase R.7:** Result Validator Integration (COMPLETED)
- **Phase UX-1:** Data Quality vs Business Confidence Separation (COMPLETED)
- **Phase UX-2:** Explore → Investigate → Ask Navigation (COMPLETED)
- **Phase UX-3:** Learn From Data, Not Explore Dataset (COMPLETED)
- **Phase UX-4:** Perspective Before Questions (COMPLETED)
- **Phase UX-5:** Business View Layer (COMPLETED)
- **Phase U:** Insight Contract Implementation
- **Phase V:** Full Runtime Readiness

## Architecture Rules
- **Validation First:** The Result Validator must run *before* Business Confidence can be computed. We must know the result matches the structural contract before we assess its business value.
- **Safe Previews:** The Preview Runtime must be strictly limited and safe, running in a sandbox.
- **Trust Before Execution:** Full Runtime must not happen before the Confidence Engine exists.
- **Traceable Insights:** Any generated insight must be deterministic and fully traceable to evidence; it must not be a hallucination.
