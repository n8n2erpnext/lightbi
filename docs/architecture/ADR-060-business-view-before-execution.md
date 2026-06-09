# ADR-060: Business View Before Execution

## Status
Accepted

## Context
When an automated system discovers relationships across datasets, there is a temptation to immediately join the data and execute analytical queries. However, blindly executing joins can lead to severe performance issues, logical errors (e.g., many-to-many duplication), and user confusion if the automated context doesn't match the user's business intent.

## Decision
LightBI must present `BusinessViewCandidate`s and their `SuggestedQuestions` to the user *before* any runtime execution or data materialization occurs. The user must approve or explicitly choose a business perspective before a query plan is built and run.

## Philosophy
This preserves LightBI's core product philosophy:
`Data → Understanding → Perspective → Question → Plan → Execution`

## Non-Goals
- Business Views do **not** calculate metrics.
- Business Views do **not** create physical joins or tables.
- Business Views do **not** emit SQL.

## Rationale
By forcing the selection of a Business View first, we ensure that the system only attempts to construct query plans (via `VirtualDatasetPlan`) that align with a validated business domain. It allows the system to surface risks (like missing domains or low-confidence relationships) early, preventing unexpected compute costs and incorrect insights.
