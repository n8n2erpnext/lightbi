# ADR-070: Business Confidence Engine

## Status
Accepted

## Context
Query execution alone does not guarantee a trustworthy or meaningful answer. In many BI tools, queries execute successfully and return charts, but the underlying data might be missing 40% of its keys, or the joined relationship may have severe cardinality issues. 

LightBI must not only answer a question; it must explicitly estimate how trustworthy that answer is. **Business Confidence Score** is a first-class product feature that will act as a trust layer between the generated results and the user.

## Decision
We introduce the **Business Confidence Engine** as a core architectural layer (slated for Phase T).
The Engine computes confidence based on multiple signals rather than result rows alone.

### Output Definition
```typescript
type BusinessConfidenceResult = {
  score: number; // 0-100
  level: "LOW" | "MEDIUM" | "HIGH";
  signals: ConfidenceSignal[];
  explanation: string[];
};
```

### Evaluation Rules
- **LOW:** `< 60`
- **MEDIUM:** `60 - 84`
- **HIGH:** `>= 85`

### Confidence Sources
The score is an aggregation of multiple trust signals:

**A. Data Quality Confidence**
- Null ratio
- Missing values
- Duplicate keys
- Invalid values
- Outliers

**B. Relationship Confidence**
- Relationship score (from Discovery Engine)
- Cardinality risk (many-to-many penalties)
- Overlap evidence
- User-confirmed relationships vs auto-suggested

**C. Business View Confidence**
- Domain coverage
- Number of connected datasets
- Strength of supporting relationships
- Fit between the selected Business View and the user's question

**D. Expected Result Match**
- Expected dimensions vs actual output dimensions
- Expected measures vs actual output measures
- Expected shape vs actual output shape

**E. Coverage Confidence**
- Percentage of rows, datasets, or keys covered by the analysis
- Missing relationship coverage
- Partial source coverage

## Rules
- The Business Confidence Engine must run **after** the Preview Runtime and Result Validator.
- It must **not** replace the Result Validator (Result Validation ensures structural correctness; Confidence Engine assesses trustworthiness).
- It aggregates trust signals into a user-facing confidence score.

## Rationale
By formally decoupling structural validation from trust analysis, we can provide users with nuanced insights like "We successfully answered your question, but you should know that 30% of the dataset is missing values for this dimension, reducing confidence to 65%."
