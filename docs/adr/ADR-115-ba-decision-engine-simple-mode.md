# ADR-115: BA Decision Engine for Simple Mode

## Status
Accepted

## Context
LightBI Simple mode has moved beyond raw data intake. It can already identify what kind of dataset the user is looking at, suggest likely analysis angles, and compute an initial readiness/trust score. This covers the first two BA questions:

1. What data am I looking at?
2. How much should I trust this data?

The next product goal is to make Simple mode behave like a small BA team for SME workflows. It must not stop at charts or tables. It must explain what matters, why it matters, and what the decision maker should check next.

LightBI must support both flows:

- Clean standardized ERP exports: ERP -> DA -> BA -> BI/decision maker.
- Dirty or semi-structured data: file/link/database -> LightBI DA+BA -> decision maker or downstream BI tools.

Advanced mode remains the DA/pro workspace. Simple mode becomes the BA decision workspace. Advanced results must be able to flow back into Simple mode for charting and decision briefing after filtering, editing, joining, importing, or querying.

## Decision
Introduce the **BA Decision Engine** as the Simple mode orchestration layer:

```text
Data Understanding
-> Data Trust Scoring
-> Insight Mining
-> Chart Recommendation
-> Decision Briefing
-> Action Suggestions
```

The engine is deterministic first. LLMs may later rewrite or enrich wording, but they must not invent facts or evidence. All BA statements must be traceable to structured rows, profiles, runtime results, and confidence signals.

## Core Outputs

```typescript
type BADecisionBrief = {
  dataTrustScore: number;
  decisionReadinessScore: number;
  executiveSummary: string;
  insights: BAInsight[];
  recommendedCharts: BAChartRecommendation[];
  decisionSuggestions: BADecisionSuggestion[];
  caveats: string[];
};
```

```typescript
type BAInsight = {
  id: string;
  type:
    | "top_concentration"
    | "bottom_group"
    | "trend"
    | "outlier"
    | "distribution"
    | "data_quality"
    | "coverage";
  title: string;
  statement: string;
  severity: "positive" | "neutral" | "warning" | "critical";
  confidence: number;
  evidence: string[];
  chartHint: "bar" | "line" | "scatter" | "table";
};
```

## Required BA Questions
Simple mode is considered product-ready for BA when it consistently answers:

1. **What data am I looking at?**
   - Dataset type, grain, domains, key fields, time fields, dimensions, measures.
2. **How much should I trust it?**
   - Data trust score, dirty-data caveats, type consistency, completeness, duplicate/key risk, coverage.
3. **What insights are worth noticing?**
   - Top/bottom, trend, concentration, distribution, anomaly, coverage, and decision-impact insights.
4. **What should I decide or check next?**
   - Decision suggestions, safe next questions, chart recommendations, and risk warnings.

## Implementation Phases

### Phase BA-1: Deterministic Insight Mining
- Mine top/bottom categories from executed preview results.
- Detect concentration/Pareto risk.
- Detect trend direction when a time field and numeric measure exist.
- Detect missing/empty groups and sample coverage caveats.
- Produce structured insight JSON before rendering text.

### Phase BA-2: Chart Recommendations Per Insight
- Every insight should carry a chart hint.
- The Investigation page should show information and chart together, not one replacing the other.
- Table previews should still generate an automatic distribution chart when a useful categorical field exists.

### Phase BA-3: Decision Briefing
- Render Executive Summary, Key Insights, Decision Suggestions, and Caveats.
- Keep wording deterministic and evidence-bound.
- Make the decision maker aware of both business signal and data risk.

### Phase BA-4: Separate Scores
- Keep **Data Trust Score** for data reliability.
- Add **Decision Readiness Score** for whether the data is sufficient to make a business decision.
- A clean dataset can still have low decision readiness if important decision fields are missing.

### Phase BA-5: Advanced -> Simple Loop
- Advanced mode can export as it already does.
- Advanced result buffers should also support "Analyze in Simple" / "Create Decision Brief".
- The result becomes a temporary Simple dataset/session and flows through the same BA Decision Engine.

## Current Baseline Assessment
As of this ADR, LightBI is approximately:

- Data Understanding: **70-80%**
- Data Trust Scoring: **55-65%**
- Insight Mining: **25-35%**
- Chart Recommendation: **45-55%**
- Decision Briefing: **10-20%**
- Advanced -> Simple Loop: **0-15%**

The next highest-leverage work is Phase BA-1 and BA-3: add deterministic insight and decision brief generation to the existing Investigation execution path.

## Rules
- Do not make Simple mode a dashboard builder.
- Do not make Simple mode depend on real LLM availability.
- Do not show a chart without explaining what the user should learn from it.
- Do not show a score without explaining why the score is high or low.
- Keep Advanced mode as the DA/pro workbench and Simple mode as the BA decision workspace.

## Consequences
This ADR changes the Simple mode product target from "guided chart preview" to "BA decision workspace." Chart rendering remains important, but it is subordinate to evidence-backed insight and decision support.
