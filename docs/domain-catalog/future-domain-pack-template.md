# Future Domain Pack Template

This template explains how to expand LightBI into an entirely new vertical (e.g., Medical, Hospitality, Manufacturing) without rewriting core execution engines.

## Rule of Expansion
Adding a new domain in V1.1 (e.g., Medical) should *never* require rewriting:
- Business Signal Detector
- Perspective Generator
- Question Planner
- Runtime
- Confidence Engine

You only add:
- A new `domain-catalog/<domain>.md` file
- Signal aliases (in the detector registry)
- Business View definitions (in the view registry)
- Question templates (in the question registry)
- Unit tests to verify generation

---

## Example: Medical Domain

### Concepts
- patient
- doctor
- diagnosis
- appointment
- treatment
- medication
- department

### Intent Families
- Patient Flow
- Department Performance
- Treatment Outcome
- Appointment Analysis
- Medication Usage

### Question Templates
- Which departments receive the most patients?
- How long do patients wait before treatment?
- Which treatments have the highest success rate?
- Which medications are prescribed most frequently?

### Business Views
- Patient Flow Analysis
- Treatment Outcome Monitoring
- Department Efficiency
