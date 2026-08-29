# ADR-120: Context-Aware Semantic Dictionary and Evidence Engine

## Status
Accepted - Phase 29 V1 implemented

## Context

Business Brain V1 made Simple Mode more BA-like, but recent sample and product review exposed a deeper data-understanding risk:

```text
Data contains business meaning
-> header is unclear, generic, translated, or wrong
-> detector relies too heavily on header aliases
-> valid business evidence becomes invisible downstream
```

This is the same class of issue behind payment-method, delivery-status, carrier, and logistics-cost questions. The product problem is not one missing alias. It is that LightBI must understand column and cell context instead of trusting headers alone.

LightBI currently has several overlapping knowledge sources:

- `domain-knowledge-catalog.ts`
- `domain-ba-playbooks.ts`
- `business-signal-detector.ts`
- `understanding-core/ontology.ts`
- `understanding-next/signal-detector.ts`
- `semantic-coverage.ts`
- `home-guidance.ts`

These sources are useful, but they are not yet one semantic dictionary. Some advertise future domains while runtime support is only complete for the current core domain set.

## Current Domain Boundary

Runtime-supported BA domains:

1. `operations`
2. `revenue`
3. `inventory`
4. `customer`
5. `performance`
6. `finance`

Legacy or partial profiler domains:

- `logistics_delivery`
- `sales_revenue`
- `finance_accounting`
- `hr_attendance`
- `education`
- `support`

Advertised or future guidance groups include retail, accounting, IT/service, HR, sales, manufacturing, marketing, ecommerce, healthcare, real estate, nonprofit, and others. These must not be represented as fully supported BA domains until they have dictionary entries, playbooks, tests, and executable actions.

## Decision

Introduce a **Context-Aware Semantic Dictionary** and **Semantic Evidence Engine** below Business Brain and above raw column profiling.

The engine must score every candidate signal using multiple evidence types:

```text
header evidence
value evidence
shape evidence
neighbor evidence
cross-file evidence
user mapping evidence
```

V1 starts with header, value, shape, neighbor, and cross-file support evidence. Neighbor and cross-file evidence are supporting signals; they must not create a mapping by themselves without enough direct column evidence.

## Non-Negotiable Rules

1. Do not rely on header aliases alone.
2. Do not hardcode sample file names, month labels, or customer-specific values.
3. If values clearly contradict the header, mark the field as `partial` or `conflicting`; do not silently trust the header.
4. If a populated field looks business-like but cannot be mapped safely, surface it as `unknown_business_like`.
5. A dictionary entry must declare its domain status:
   - `supported`
   - `partial`
   - `advertised_only`
6. A supported BA angle may only be generated from supported or explicitly partial signals with enough evidence.
7. AI mode may only reason from LightBI's semantic evidence, KPI evidence, and caveats. It must not invent missing mappings.

## Dictionary Contract

```typescript
type SemanticDictionaryEntry = {
  canonicalId: string;
  label: string;
  domains: string[];
  semanticFamily: string;
  role: "time" | "dimension" | "measure" | "status" | "identifier";
  coverageStatus: "supported" | "partial" | "advertised_only";
  headerAliases: string[];
  valueAliases: string[];
  valuePatterns: RegExp[];
  compatibleTypes: string[];
};
```

## Evidence Contract

```typescript
type SemanticEvidenceCandidate = {
  canonicalId: string;
  confidence: number;
  evidenceTypes: Array<"header" | "value" | "shape" | "neighbor" | "cross_file" | "user_mapping">;
  reasons: string[];
};
```

## Phase 29 Acceptance

- A column with header `Type` and values `Tiền mặt`, `Trả góp`, `Chuyển khoản` maps to `payment_method`.
- A column with generic header and values `Đã giao`, `Hoàn tất`, `Giao lại` maps to delivery/fulfillment status.
- A column with generic header and carrier-like values maps to `carrier`.
- If header and values imply different signals, coverage marks the column as partial/conflicting.
- Unknown populated business fields remain visible in semantic coverage.
- Neighbor columns can disambiguate generic status-like fields when the local profile clearly points to delivery or inventory context.
- Cross-file context can strengthen a candidate when other imported files already expose compatible business signals, but weak generic values must remain unmapped.
- Existing Simple and Advanced behavior remains stable.

## Consequences

This phase turns LightBI from a header matcher into a context-aware business understanding layer. It does not make arbitrary data interpretation perfect, but it changes the product guarantee:

```text
No populated business-like signal should disappear silently.
```
