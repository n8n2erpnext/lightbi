# Reset Decision: BVQ Pipeline

## Statement
The BVQ (Business View & Questions) pipeline was highly successful in establishing a mathematically pure, strict, hallucination-free pathway for deriving analytical questions. However, attempting to force this strict pipeline to act as the *primary product path* for user interaction was a mistake. 

The strictness caused completely valid SME datasets to render as "empty states" (0 Views, 0 Questions) simply because they lacked the advanced columns required to satisfy rigid Business View templates.

## Decision
The BVQ pipeline components will be kept, as they are exceptionally useful for generating strict, safe derived outputs. However, they are being fundamentally repositioned within the architecture.

**Old Pipeline Concept:**
`Signals → Perspectives → Business Views → Questions`

**New Pipeline Concept:**
`Signals → Dataset Understanding → Optional Perspectives → Optional Business Views → Optional Questions`

### Key Repositioning Details

- **Keep:** `Business Signal Detector`, `Domain Knowledge Catalog`, `Perspective Candidate Generator`, `Business View Candidate Generator`, `Question Plan Generator`, `Question Suggestion Renderer`.
- **Change:** These components will no longer act as the gatekeepers of user success. 

**No more "Questions = product success".**

Product success is now defined purely by:
*"Can LightBI explain what this data appears to represent?"*

If a dataset yields 5 valid signals but fails to form a complete Business View, LightBI will now triumphantly report its understanding of those 5 signals and their potential, rather than silently failing to produce questions.
