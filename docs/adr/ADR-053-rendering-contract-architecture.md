# ADR-053 Rendering Contract Architecture

Status:
Accepted

Context:
If the frontend UI imports backend ORM structures, modifying the backend database schema breaks the UI. The frontend should only consume data in a structured, guaranteed shape designed exclusively for rendering.

Decision:
We establish the **Rendering Contract Architecture**.
- The backend maps internal domain models (like `ChartDefinition` or `DashboardWidget`) into UI-safe Payloads (`ChartPayload`, `DashboardPayload`).
- These payloads strip away execution metadata, secrets, or non-visual configuration.
- The payload structs are the singular source of truth for the frontend boundary.

Consequences:
- Rule: Backend -> Rendering Contract -> Frontend.
- This creates an unbreakable API contract. We can completely rewrite the backend planner or execution engine without touching a single line of React/Vue code, because the API payload remains identical.
