# ADR 097: Dataset Understanding Before Questions

## 1. Context
The BVQ (Business View & Questions) refactor successfully created a technically pure, strict pipeline:
`Signals → Perspectives → Business Views → Question Plans → Question Suggestions`

However, a live test with a common SME dataset ("Delivery Performance Reports" containing `report_date`, `route`, `driver`, `satisfaction`, `shipment`) resulted in 5 accurate Signals but 0 Business Views and 0 Questions. This was due to the strict `minimumRequiredMatches` thresholds that govern Business Views to prevent hallucinations.

The system interpreted this as "no useful output" and presented an empty state.

This highlighted a fundamental product philosophy error: **LightBI is not a question generator, nor is it a dashboard builder. LightBI is a Business Understanding Layer.**

Questions are just one possible output of understanding. When a dataset has signals but fails to meet the strict criteria for a formal Business View, the system must not fail silently. Instead, it must explain what it *does* understand.

## 2. Decisions

1. **Primary Output is Understanding:** LightBI's primary output must be "Business Understanding", not "Questions".
2. **Derived Artifacts:** Questions are optional derived artifacts. They are not the main product path.
3. **Value in Empty States:** A dataset is considered useful and successfully processed even when `Business Views = 0` and `Questions = 0`.
4. **New Core Pipeline Flow:**
   `Dataset → Signals → Dataset Understanding → Optional Perspectives → Optional Business Views → Optional Questions → Optional Runtime`
5. **Understanding Summarization:** The Dataset Understanding Layer must summarize what LightBI knows *before* asking the user to choose a perspective or rendering questions.
6. **Transparent Degradation:** An empty question state is no longer a failure. Instead, LightBI will explain:
   - What concepts it detected.
   - What it believes the dataset represents (the narrative).
   - What is missing (why advanced views weren't unlocked).
   - What can be done next.
7. **Business Views are Advanced:** Business Views should be treated as *advanced* understanding frameworks, not *mandatory* prerequisites for delivering value.
8. **Decoupled Success:** Question Generation must not gate the user's perception of product success. "Understanding" is the success metric.
9. **Runtime Evolution:** In the future, the Runtime engine must be capable of consuming raw Dataset Understanding directly, rather than relying exclusively on pre-baked Question Plans.

## 3. Consequences
This paradigm shift officially deprecates the assumption that "Questions = product success". We retain the strict purity of the BVQ pipeline, but we reposition it as an *Optional Derived Output* pipeline. The immediate next phase of development will focus entirely on formalizing the `Dataset Understanding Contract`.
