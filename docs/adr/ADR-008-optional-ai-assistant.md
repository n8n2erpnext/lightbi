# ADR-008 Optional AI Assistant

Status:
Proposed

Context:
AI can significantly lower the friction of creating dashboards and analyzing data, but relying strictly on cloud AI models compromises privacy, vendor independence, and offline capabilities.

Decision:
AI is strictly optional.

Without API keys:
LightBI remains fully functional. Core tools work exactly as expected without any degradation.

With API keys:
AI may assist with:
* column classification
* dataset cleanup suggestions
* chart suggestions
* insight generation
* recipe generation

Important Rule:
AI suggests.
User approves.
Rust Core executes.
AI is never the source of truth or allowed to autonomously mutate data without explicit approval.

Consequences:
* Vendor independence is maintained.
* Offline-first philosophy is fully preserved.
* Deterministic execution remains intact, as AI only generates configuration/recipes for the core to execute.
