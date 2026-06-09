# ADR-072: Insight Contract

## Status
Accepted

## Context
A major failing of traditional BI is presenting users with a raw table or a chart and expecting them to interpret the business meaning. A query result consisting of rows, columns, and measures is not an insight. 

In LightBI, an **Insight** is a business statement supported by evidence, attached to a confidence score, and fully traceable back to the user's question and the generated query contract.

## Decision
We formalize the separation between a Query Result and an Insight through the **Insight Contract**.

### Output Definition
```typescript
type InsightContract = {
  id: string;
  questionId: string;
  businessViewId: string;
  resultContractId: string;
  statement: string;
  confidence: BusinessConfidenceResult;
  evidence: InsightEvidence[];
  caveats: string[];
};
```

### Contract Requirements
An Insight must include:
- **Statement:** A clear, natural-language business conclusion.
- **Evidence:** Data points or statistical backing that support the statement.
- **Confidence:** A `BusinessConfidenceResult` evaluating the trustworthiness of the insight.
- **Caveats:** Known limitations, missing data warnings, or relationship risks.
- **Traceability:** IDs linking back to the original question, the view, and the validated result contract.

### Examples
**Bad Example (Just a Result):**
> "Route A: 25% delay"

**Good Example (An Insight):**
> "Route A appears to have the highest delay rate in the selected period, based on 12,000 delivery records. Confidence: 87%. Caveat: 18% of records have missing driver data."

## Rules
- Insight generation is slated for a future phase.
- **No AI is required for the MVP.** Initial implementations will be strictly rule-based insights.
- If AI is later introduced to help rewrite or summarize insight wording, it must **never invent evidence**. It must strictly base its output on the structured evidence provided by the Insight Contract.

## Rationale
By defining what an insight is structurally, we shift the product's focus from "query execution" to "knowledge extraction." The Insight Contract guarantees that any text presented to the user has deterministic data evidence, a stated confidence level, and explicit caveats, thereby preventing AI hallucinations or misleading data interpretations.
