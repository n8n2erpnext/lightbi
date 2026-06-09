# ADR-071: Dataset Health Model

## Status
Accepted

## Context
Various components of LightBI—including Relationship Discovery, the Business View Generator, the Result Validator, and the future Business Confidence Engine—need a standardized way to assess the quality of underlying datasets. Without a unified model, each component might implement divergent logic for identifying "bad data."

## Decision
We define a reusable trust model called **Dataset Health** for individual datasets and dataset groups.

### Output Definition
```typescript
type DatasetHealth = {
  datasetId: string;
  completeness: number; // e.g. 0-100 metric based on nulls/missing values
  consistency: number;  // e.g. type stability and format stability
  uniqueness: number;   // e.g. duplicate key rate
  freshness?: number;   // optional; only for data with timestamps
  keyQuality: number;   // e.g. candidate key strength
  warnings: DatasetHealthWarning[];
};
```

### Health Dimensions
- **Completeness:** Analyzes null ratios and missing values across columns.
- **Consistency:** Measures type stability (e.g., text vs numeric values in the same column) and format stability (e.g., varying date formats).
- **Uniqueness:** Assesses the rate of duplicate keys and records.
- **Freshness:** Optional dimension evaluating how recent the data is, applicable only to datasets with identifiable timestamp fields.
- **Key Quality:** Measures the strength of candidate business keys and their suitability for joining.

### Usage
Dataset Health is designed to be consumed by:
- Business Confidence Engine
- Relationship Discovery
- Business View Generator
- Result Validator
- Future data cleaning suggestion systems

## Rules
- Dataset Health **does not** clean data automatically.
- Dataset Health **does not** modify user files.
- Dataset Health is **strictly diagnostic**.

## Rationale
A unified health model standardizes how "good" a dataset is across the entire pipeline. It prevents redundant calculations and ensures that the final Business Confidence Score is built on top of a well-understood, diagnostic foundation.
