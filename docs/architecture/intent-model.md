# Analytical Intent Model

The Analytical Intent model is the vocabulary of the Recipe Engine. It breaks down complex queries into discrete, standardized operations.

## Supported Intents

1. **Aggregation Intent**: Calculates summary metrics (e.g., SUM of Revenue).
2. **Ranking Intent**: Limits results by ordering (e.g., Top 10 Customers).
3. **Comparison Intent**: Compares periods or categories (e.g., 2026 vs 2025).
4. **Trend Intent**: Analyzes data over a time granularity (e.g., Revenue by Month).
5. **Distribution Intent**: Analyzes how a metric is split across a dimension (e.g., Sales by Region).

## The Enforcement Boundary
When a Question Context is transformed into a Recipe, the `RecipeValidator` enforces that the requested Intents do not violate the active `Perspective` scope. If a user asks for a `Distribution Intent` on "Employee Salaries", but their Perspective does not grant access to the HR Semantic Scope, the Recipe Validator terminates the request before the Planner ever sees it.
