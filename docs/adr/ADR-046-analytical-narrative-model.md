# ADR-046 Analytical Narrative Model

Status:
Accepted

Context:
"AI Generation" is often unpredictable. We need a way to describe analytical meaning with absolute mathematical certainty, without relying on an LLM to hallucinate the text.

Decision:
We establish the **Analytical Narrative Model**.
- Narratives are structured objects containing an `Observation`, `Supporting Metrics`, and `Confidence`.
- Supported Types: `Observation`, `Trend`, `Comparison`, `Anomaly`, `Recommendation`.
- The narratives are derived deterministically. E.g., if Metric A > Metric B, the `Comparison Insight` deterministically yields "Metric A outperformed Metric B by X%".

Consequences:
- We can provide "Smart Narratives" that explain data perfectly every time.
- If we later choose to pass these structured deterministic narratives to an LLM to rewrite them into a conversational tone, the LLM is restricted to rewriting the exact provided facts, eliminating hallucination of the math itself.
