# ADR 055: Business Key Detection Engine

## Status
**ACCEPTED**

## Context
In order to automatically discover relationships across disparate datasets, LightBI cannot rely on users to manually specify primary and foreign keys. Many operational files do not explicitly declare keys. We need a heuristic-driven engine to identify which columns represent "Business Keys" (e.g., Order ID, Shipment ID, SKU) across multiple uploaded files.

## Decision
We will introduce a new first-class architecture component: the **Business Key Detector**.

Its responsibilities include:

1. **Column Name Analysis**:
   - Detect known identifier patterns using NLP and string matching (e.g., `Mã đơn hàng`, `Mã phiếu gửi`, `SKU`, `Product ID`, `Customer ID`).
   - Standardize naming conventions internally to increase match confidence across different files.

2. **Data Profile Analysis**:
   - Leverage data profiling metrics rather than treating high-cardinality fields as useless dead-ends.
   - Use **Distinct Count**, **Null Ratio**, and **Value Patterns** (e.g., regex matching for UUIDs or sequential IDs).
   - A high distinct count with a low null ratio strongly suggests a Primary Key or a Join Key candidate.

3. **Cross-Dataset Matching**:
   - Compare the profile and values of keys across datasets.
   - Example: If Dataset A has `Mã đơn hàng` and Dataset B has `Order ID`, and their underlying value formats and overlap percentage are high, the engine scores this as a `Possible Relationship` with a calculated `Confidence %`.

## Consequences
- The Semantic Engine will no longer discard high-cardinality ID fields but actively profile them for join potential.
- We must compute data profiles (distinct values, intersection counts) during the intake phase to support cross-dataset matching.
