# ADR-034 Analytical Intent Model

Status:
Accepted

Context:
To build Recipes without using SQL, we must break down analytics into discrete intents. "Show me my top 5 customers by revenue" requires a formal categorization so validators and planners know what to expect.

Decision:
We establish the **Analytical Intent Model**.
A Recipe payload is composed of explicit Intents:
- **Aggregation Intent:** (SUM Revenue, AVG Margin)
- **Ranking Intent:** (Top 10 Products, Bottom 5 Regions)
- **Comparison Intent:** (Month vs Month, Year vs Year)
- **Trend Intent:** (Revenue Trend)
- **Distribution Intent:** (Revenue by Region)

Consequences:
- The UI builds "Intents", not queries.
- The `RecipeValidator` can strictly enforce consistency (e.g., rejecting an Aggregation Intent that references a column not present in the allowed Semantic Scope).
