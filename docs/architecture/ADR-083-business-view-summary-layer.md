# ADR 083: Business View Summary Layer

## Status
Accepted

## Context
In previous phases, we updated the flow to `Perspective -> Business View -> Questions`. However, users were jumping directly from a Business View selection into generated questions without understanding why the view exists, what evidence created it, or what business process LightBI believes it discovered. This violated the core LightBI principle: `Understand First, Question Later`.

Questions should be a consequence of understanding, not a starting point.

## Decision
We establish the **Business View Summary Layer** as a mandatory understanding step. 

The new UI and architectural hierarchy is:
`Data -> Trust -> Perspective -> Business View -> Business View Summary -> Questions -> Insight`

1. **Mandatory Summary Component**: Before users can interact with generated questions, they must read the `BusinessViewSummaryCard`.
2. **Business Vocabulary Only**: The summary must avoid technical BI profiling, SQL concepts, schema details, or raw column statistics. It must be written strictly in business terms.
3. **Core Elements**:
   - **Purpose**: Why this view exists.
   - **Detected Business Evidence**: Which business entities were found.
   - **Business Relationships**: How entities connect.
   - **Coverage**: How many datasets/keys are involved.
   - **LightBI Belief**: A plain-English explanation of the business process LightBI believes it has identified.
4. **Visual Hierarchy**: The summary layer visually dominates the Questions section, enforcing that understanding is the primary artifact and questions are secondary.

## Consequences
- **Positive**: Forces the user to adopt a business-first mindset.
- **Positive**: Prevents treating LightBI like a traditional BI database explorer.
- **Positive**: Builds trust by explaining *why* LightBI thinks a certain way before asking for a query.
- **Negative**: Adds visual weight to the workflow, requiring more scrolling to reach actionable questions.
