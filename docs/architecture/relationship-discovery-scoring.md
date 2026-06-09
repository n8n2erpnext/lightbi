# Relationship Discovery Scoring

## 1. Problem
Traditional BI requires users to manually choose join keys, build relationships, and construct star schemas or models before analysis can begin. This is a massive barrier for non-technical users. 

LightBI flips this paradigm. LightBI must automatically detect and suggest relationships between disparate files uploaded to the workspace.

## 2. Input
The Relationship Discovery engine operates on an array of inspected datasets. For each dataset, the engine receives:
- **columns**: Normalized list of column names
- **semantic fields**: Detected semantic tags (e.g., metric, dimension, id, date, status)
- **column profiles**: In-depth statistics per column
  - **distinct counts**: Absolute number of unique values
  - **null percent**: Percentage of empty/missing records
  - **top values**: Frequency-based top string/number values
  - **data types**: Guessed type (string, integer, float, boolean, date)
  - **examples**: Raw sample rows for direct overlap checks
- **source file metadata**: File names, sizes, original domains

## 3. Candidate Key Detection
A column becomes a valid candidate for relationship discovery if it matches specific signals.

**Signals for Candidate Keys:**
- **Semantic Tag**: Must be a recognized domain identifier such as `shipment`, `order`, `product`, `invoice`, `tracking`, `customer`, or `supplier`.
- **Semantic Type**: Categorized as an `identifier`.
- **High Distinct Ratio**: Identifiers typically have high cardinality (many unique values).
- **Low Null Ratio**: Core business keys are rarely null.
- **Stable String Pattern**: The values follow a consistent format (e.g., UUIDs, specific prefix codes like `INV-`, `TRK-`).
- **Name Similarity**: High similarity to known key aliases (e.g., `Mã đơn hàng`, `Order ID`).

## 4. Cross-Dataset Relationship Scoring
To determine if two columns form a valid relationship, we compute a weighted score from 0 to 100.

**Weight Distribution:**
- **Semantic Tag Match (30 points)**: Both columns share the same business entity tag (e.g., `shipment`).
- **Column Name Similarity (20 points)**: Levenshtein or token-based similarity between column names.
- **Data Type Compatibility (10 points)**: Both are strings, or both are integers.
- **Distinct/Null Profile Compatibility (15 points)**: Similar non-null patterns or compatible cardinality ratios indicating primary-foreign key structures.
- **Value Pattern Similarity (15 points)**: Regex patterns or string length distributions match (e.g., both are 10-char alphanumeric).
- **Sample Value Overlap (10 points)**: Actual data values intersect between the samples of the two datasets.

**Score Interpretation:**
- `>= 85`: **Strong relationship** (High confidence)
- `70-84`: **Likely relationship** (Moderate confidence)
- `50-69`: **Possible relationship**, needs explicit user confirmation
- `< 50`: **Ignore** (Not related)

## 5. Avoid False Positives
To prevent nonsensical joins, the engine explicitly rejects or downgrades matches based on the following criteria:
- **Date Fields**: Do not join on dates unless explicitly modeling a calendar dimension.
- **Status Fields**: Joining on "Delivered" or "Pending" creates massive cartesian products.
- **Low-Cardinality Categories**: Do not join on "Region = North" or "Gender = Male".
- **Free-Text Description Fields**: Long strings or comments are not keys.
- **High Null Ratios**: Columns with > 50% nulls are poor join keys.
- **Generic Names**: Names like "Code" or "ID" are ignored unless the data profile and value pattern provide overwhelming evidence.

## 6. Relationship Cardinality
Once a relationship is scored, we estimate its cardinality based on distinct ratios and duplicate counts in the samples.
- `one_to_one`: Both sides have ~100% distinct ratio.
- `one_to_many`: Left side is highly distinct, right side has repeating values.
- `many_to_one`: Left side has repeating values, right side is highly distinct.
- `many_to_many`: Both sides have significant duplicate keys.
- `unknown`: Sample size too small or data too sparse to determine.

## 7. Dataset Collection Creation
- **Creation Condition**: If two or more dataset families have at least one valid relationship scoring `>= threshold (50)`, they are grouped into a **Dataset Collection**.
- **Isolation**: If files do not meet the minimum threshold for any relationship, they remain as independent datasets within the workspace.

## 8. Business View Generator
Using the detected relationships forming a connected `RelationshipGraph` (the source of truth), LightBI proposes virtual dataset views (`BusinessViewCandidate`) that bridge domains. 
- **RelationshipGraph** remains the source of truth.
- `BusinessViewCandidate` is derived exclusively from graph connected components, never from pairwise lists.
- **Business views do not compute metrics** (no actual SQL execution yet).
- **Business views only indicate analysis opportunities** via generated `suggestedQuestions` and rule-based insights.
- **Virtual Dataset materialization** remains a future milestone (Phase H).

## 9. User Confirmation UX
The engine must not silently create joins and obfuscate the data model. The UI must transparently present discoveries.

**UI Presentation Example:**
```text
Relationship detected:
Dataset A.Mã đơn hàng ↔ Dataset B.Mã đơn hàng
Confidence: 92%

Reason:
- same semantic tag: shipment
- similar value pattern
- high overlap in sample values

Actions:
[Use relationship]
[Edit]
[Ignore]
```

## 10. Output Types
The Relationship Discovery Engine will implement the following TypeScript models:

```typescript
type KeyCandidate = {
  columnName: string;
  datasetId: string;
  semanticTag: string;
  distinctRatio: number;
  nullRatio: number;
};

type RelationshipEvidence = {
  semanticMatchScore: number;
  nameSimilarityScore: number;
  dataTypeScore: number;
  profileScore: number;
  patternScore: number;
  overlapScore: number;
};

type RelationshipCardinality = "one_to_one" | "one_to_many" | "many_to_one" | "many_to_many" | "unknown";

type RelationshipCandidate = {
  leftDatasetId: string;
  rightDatasetId: string;
  leftKey: KeyCandidate;
  rightKey: KeyCandidate;
  evidence: RelationshipEvidence;
  totalScore: number;
  cardinality: RelationshipCardinality;
};

type DatasetCollectionCandidate = {
  collectionId: string;
  datasetIds: string[];
  relationships: RelationshipCandidate[];
};

type BusinessViewSuggestion = {
  viewId: string;
  name: string;
  description: string;
  underlyingCollectionId: string;
  requiredRelationships: string[]; // IDs of relationships used
};
```

## 11. MVP Scope
The MVP for Relationship Discovery is strictly bounded to the following capabilities:
- Works entirely in the **frontend** using inspected profiles and preview/sample rows.
- **Does not execute physical joins.**
- **Does not run SQL or DuckDB.**
- Only generates relationship candidates and presents UI suggestions.
- Does not create physical merged data files.
- Does not require LLMs/AI. It relies on the deterministic scoring model defined above.

## 12. Future Scope
Post-MVP expansions include:
- Backend validation using the full dataset (not just preview samples).
- DuckDB relationship testing (executing trial joins to measure exact overlap).
- AI explanation layer (LLM interpreting why a join makes business sense).
- User-corrected relationship memory (remembering manual overrides for future uploads).
- Saved semantic models persisted to the backend.
