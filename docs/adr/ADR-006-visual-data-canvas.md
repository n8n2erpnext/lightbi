# ADR-006 Visual Data Canvas

Status:
Proposed

Context:
Many SME users understand visual workflows and data pipelines significantly better than they understand raw SQL. Forcing users to write SQL queries to prepare data acts as a massive barrier to entry.

Decision:
Introduce a future Visual Data Canvas.
The canvas represents dataset transformations visually.

Examples of workflow nodes:
Source → Filter → Join → Aggregate → Compare → Output Dataset

Important:
The canvas is NOT an automation engine (like n8n).
The canvas generates dataset recipes.
The Rust Core executes these recipes.

Consequences:
* Lower learning curve for non-technical users.
* Better SME adoption due to intuitive visual interfaces.
* No SQL required to perform complex data joins or aggregations.
