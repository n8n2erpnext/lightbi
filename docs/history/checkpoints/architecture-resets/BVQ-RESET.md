# BVQ RESET: Architecture Analysis

## 1. What user value existed before BVQ?
Before the BVQ refactor, the system delivered immediate "magic" and high interactivity. By utilizing greedy heuristic mapping (`semantic-fields.ts`) and direct question generation (`question-suggestions.ts`), the system instantly provided users with a rich list of suggested questions the moment they uploaded a dataset. Even if the data was messy, sparse, or missing core components, the user was greeted with actionable starting points to explore their data. It felt smart, highly responsive, and immediately valuable.

## 2. What user value exists now?
Currently, the system offers 100% architectural purity, deterministic traceability, and total elimination of "hallucinations". The engine acts as an uncompromising gatekeeper: a question is ONLY suggested if it mathematically satisfies a predefined Business View, which in turn ONLY activates if it strictly matches predefined aliases in the Domain Catalog. The system guarantees that any suggested question is perfectly answerable.

## 3. What functionality was lost?
The system completely lost its **Graceful Degradation** and **Exploratory Guidance**. 
Because questions were strictly gated behind rigid Business Views, a dataset that is 90% complete (e.g., having 2 out of 3 required signals) triggers **0 Views** and subsequently **0 Questions**. The Home screen went from displaying a dozen helpful starting questions to a completely empty state. The strictness eradicated the system's ability to help users explore common, imperfect SME datasets.

## 4. Which BVQ phases caused the loss?
- **BVQ-7 (Home Wiring Cleanup):** Deleting `question-suggestions.ts` and bypassing UI heuristics forced the frontend to rely exclusively on the strict pipeline, resulting in the "0 Questions" empty state.
- **BVQ-3 & BVQ-4 (The Gatekeepers):** Introducing the `BusinessViewCandidateGenerator` and enforcing `minimumRequiredMatches` created rigid chokepoints. If a View failed to meet its threshold, it silently killed all downstream Question generation.
- **BVQ-1 & BVQ-2 (Strict Detector):** Moving from greedy regex/substring matching to strict exact-array alias matching caused the system to become entirely blind to slight lexical variations (e.g., failing to recognize "Tên lái xe" because only "tai xe" was listed).

## 5. Which assumptions were wrong?
- **Assumption 1: "Questions must belong to Business Views."** 
  We assumed a question should only be generated if a formal Business Concept (like "Logistics Journey") is fully satisfied. In reality, a user wants to ask simple questions (e.g., "Count shipments by route") even if their data doesn't qualify for a complex "Journey" dashboard.
- **Assumption 2: "SME Data is complete."** 
  We designed `DOMAIN_KNOWLEDGE_CATALOG_V1` assuming datasets would contain 3-4 cohesive signals (`driver` + `route` + `delivery_status`). Real SME data is often sparse (just `route` + `shipment`).
- **Assumption 3: "Strictness equals better UX."** 
  We assumed that preventing "false positive" questions was paramount. However, in an exploratory BI tool, suggesting a slightly flawed question is infinitely better than displaying a blank screen. Over-engineering for purity killed the user experience.

## 6. If starting today from a blank page, how should Guided Investigation work?
If rebuilt from scratch, Guided Investigation must adopt a **Progressive Enhancement** architecture:

1. **Decouple Questions from Views:** 
   Questions should be generated directly from *Available Signals*, NOT gated behind *Business Views*. If the system detects a `route` (dimension) and `shipment` (identifier), it should immediately generate basic questions ("Show shipments by route"), regardless of whether a formal Business View is unlocked.
2. **Smarter, Fuzzy Detection:** 
   The detector should use LLM-assisted or fuzzy semantic matching (like embedding similarity or smarter regex) rather than fragile, hardcoded exact-alias arrays. It must be resilient to messy column names.
3. **Levels of Understanding:**
   - **Level 1 (Data-Driven):** Generic questions based purely on data types ("What is the distribution of [Categorical Column]?"). *Always guarantees >0 questions.*
   - **Level 2 (Signal-Driven):** Semantic questions based on single signals ("Show me all [Drivers]").
   - **Level 3 (View-Driven):** When enough signals combine to form a recognized pattern (e.g., Driver + SLA), *then* unlock Advanced Dashboards and deep analytical question plans.
4. **No Dead Ends:**
   The UI must never render 0 Questions. The pipeline must gracefully fall back from Level 3 → Level 2 → Level 1, ensuring the user is always guided.
