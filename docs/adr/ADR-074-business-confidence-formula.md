# ADR-074: Business Confidence Formula Design

## Status
Accepted

## Context
LightBI is not a traditional BI tool that blindly executes queries and returns results. Instead, it must follow a strict validation pipeline:
`Question → Expected Result → Query Plan → Preview Result → Result Validation → Business Confidence → Insight`

Before introducing a DuckDB preview runtime, we must establish a stable formula for evaluating the trustworthiness of a result. This ensures that runtime outputs are immediately scored for trust rather than treated as unquestioned raw tables.

## Decision
We establish the official Business Confidence Formula to combine signals from data quality, relationship definitions, and validation contracts.

### 1. Business Confidence Score
The Business Confidence Score is a **0-100 score** estimating whether the generated answer is trustworthy as a business answer.

It is **NOT**:
- A metric for query success or SQL validity.
- A guarantee of chart render success.
- Based on the raw number of returned rows.

It **IS**:
- A holistic trust score derived from data quality, relationship quality, result validation, coverage, and business context alignment.

### 2. Formula V1
The default weighting for Business Confidence is:

```
Business Confidence =
    Dataset Health Score        * 0.25
  + Relationship Quality Score  * 0.25
  + Result Validation Score     * 0.25
  + Coverage Score              * 0.15
  + Business View Match Score   * 0.10
```
Total = 100%

### 3. Confidence Levels
- **LOW**: 0 - 59
- **MEDIUM**: 60 - 84
- **HIGH**: 85 - 100

### 4. Signal Definitions

#### A. Dataset Health Score
- **Source**: Dataset Health Engine.
- **Use**: Evaluates completeness, consistency, uniqueness, and keyQuality.
- **Multi-dataset**: Use a weighted average (default equal weight for MVP; future enhancement may weight by row contribution or source importance).

#### B. Relationship Quality Score
- **Source**: RelationshipGraph / RelationshipEdge confidence.
- **Use**: Evaluates relationship score, user confirmation status, cardinality risk, and overlap evidence.
  - *Note*: Rejected relationships must force blocking upstream and should not reach confidence scoring.
- **Suggested V1 Scoring**:
  - Confirmed relationship: +10 bonus (capped at 100)
  - Suggested relationship: No bonus
  - `many_to_many` risk: -15 penalty
  - LOW confidence relationship: -20 penalty
  - Average across supporting relationships.

#### C. Result Validation Score
- **Source**: Result Validator Contract.
- **Use**: Evaluates dimension match, measure match, shape match, expected output match, and business view alignment.
- **Constraint**: If no runtime result exists yet, the Result Validation Score is unavailable. The Business Confidence Engine should return **provisional** confidence.

#### D. Coverage Score
- **Source**: Future runtime/result metadata.
- **Use**: Evaluates the percentage of expected keys/rows covered, missing relationship coverage, missing dimension coverage, and partial source coverage.
- **Constraint**: If no runtime exists, use provisional confidence mode.

#### E. Business View Match Score
- **Source**: BusinessViewCandidate + QuestionSuggestion + ExpectedResultContract.
- **Use**: Evaluates whether question domains match business view domains, whether expected dimensions/measures fit the selected view, and whether the business view confidence is HIGH/MEDIUM/LOW.

### 5. Provisional vs Final Confidence
We define two modes for confidence scoring:

```typescript
type BusinessConfidenceMode = "provisional" | "final";
```

- **Provisional Confidence**:
  - Available *before* DuckDB runtime.
  - Uses Dataset Health, Relationship Quality, and Business View Match.
  - Does NOT pretend to validate actual results.
  - Must show caveat: *"Runtime result has not been validated yet."*

- **Final Confidence**:
  - Available *after* Preview Runtime + Result Validator.
  - Includes the Result Validation Score and Coverage Score.

### 6. Formula Behavior When Signals are Missing
- **Missing Result Validation**: Compute provisional score using available weights normalized to 100. Mark mode as `"provisional"`.
- **Missing Coverage**: Exclude coverage from provisional score and add a caveat.
- **Missing Dataset Health**: Warn and reduce confidence level by one tier if possible.
- **Missing Relationship Quality (for multi-dataset)**: Confidence cannot be HIGH.

### 7. Output Contract
The future output structure is defined as:

```typescript
export type ConfidenceSignal = {
  id: string;
  label: string;
  score: number;
  weight: number;
  source:
    | "dataset_health"
    | "relationship_graph"
    | "result_validator"
    | "coverage"
    | "business_view";
  explanation: string;
};

export type BusinessConfidenceResult = {
  id: string;
  mode: BusinessConfidenceMode;
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  signals: ConfidenceSignal[];
  caveats: string[];
  explanation: string[];
};
```

### 8. Product Copy Principles
**LightBI Should Say**:
- "High confidence"
- "Medium confidence"
- "Low confidence"
- "This result may be incomplete because..."
- "Runtime result has not been validated yet."

**LightBI Should NOT Say**:
- "Correct"
- "Guaranteed"
- "100% accurate"
- "AI verified"

### 9. Architecture Rule
DuckDB Preview Runtime must **NOT** be considered complete until:
- Result Validator exists.
- Business Confidence Engine can produce final confidence.
- Preview runtime output can be validated against ExpectedResultContract.

### 10. Next Phases
Recommended order:
1. **Phase T**: Business Confidence Engine MVP
2. **Phase S**: DuckDB Preview Runtime
3. **Phase R.6**: Result Validator integration refinement (if needed)
4. **Phase U**: Insight Contract Implementation

Reasoning: The Business Confidence Engine should exist before the DuckDB runtime so that runtime results immediately flow into trust scoring instead of becoming untrusted raw tables.
