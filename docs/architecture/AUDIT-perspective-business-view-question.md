# Architecture Audit: Perspective -> Business View -> Question

## Current Architecture vs Intended Flow

**Intended Architecture:**
`Dataset -> Business Signal Detection -> Perspective Candidates -> Business View Candidates -> Question Planning -> Questions`

**Actual Current Architecture:**
The current implementation runs two completely isolated, parallel pipelines that are forcefully stitched together in the UI layer.
1. **Pipeline A (Data):** `Dataset -> Semantic Fields -> Questions`
2. **Pipeline B (UI):** `Hardcoded Perspectives -> Hardcoded Business Views`

The intended causal chain is broken. Perspective and Business View do **not** generate questions. The dataset generates questions, and the UI attempts to retroactively filter them based on user selection.

---

## Step 1: Trace the Real Flow

1. **Dataset Profiling Flow**
   - `Dataset` is uploaded via `useDatasetUpload()`.
   - Returns `currentDataset.profiles`.
   - Passed to `mapSemanticFields(profiles)` (in `apps/desktop/src/lib/semantic-fields.ts`).
2. **Perspective Detection Flow**
   - Does not exist programmatically.
   - 5 Perspectives are hardcoded directly into the UI state in `apps/desktop/src/pages/Home.tsx` (lines 801-807).
3. **Business View Detection Flow**
   - Does not exist programmatically.
   - Business Views are hardcoded inside `PerspectiveBusinessViewMap` in `apps/desktop/src/pages/Home.tsx` (lines 194-212).
4. **Question Generation Flow**
   - Runs unconditionally alongside dataset load.
   - `mapSemanticFields` -> `generateQuestionSuggestions(mapping)` (in `apps/desktop/src/lib/question-suggestions.ts`).
   - Uses hardcoded regex templates against column names.
   - Returns `semanticSuggestions` containing raw, un-perspectived questions.
5. **Question Filtering Flow (The UI Illusion)**
   - Inside `Home.tsx` (lines 1082-1087), `semanticSuggestions` is filtered using a simple string-match against the selected Business View's `evidence` words.
   - **Fatal Fallback:** `if (activeQuestions.length === 0) activeQuestions = semanticSuggestions;`
   - Bypasses the filter if zero keywords match, rendering the original dataset questions regardless of the chosen Perspective.

---

## Step 2: Dependency Verification

### Perspective
- **Does it influence Business View generation?** No. It only acts as an object key to fetch hardcoded views from `PerspectiveBusinessViewMap`.
- **Does it influence Question generation?** No. Questions are generated before a perspective is even selected.
- **Role:** Purely a UI filtering layer.

### Business View
- **Does it influence Question generation/selection?** No. `generateQuestionSuggestions` does not accept a `BusinessView` argument.
- **Does it influence Question ranking?** No. Questions are ranked by semantic column confidence.
- **Role:** Purely cosmetic UI grouping. Its `title` and `evidence` array are used as strings to filter the pre-generated dataset questions.

---

## Step 3: Dataset Reality Check

**Given Dataset:**
Columns: `SKU`, `Warehouse`, `Stock Qty`, `Age Days`

**Actual Behavior (Current Implementation):**
1. **Perspective Candidates:** All 5 hardcoded perspectives (`Operations`, `Revenue`, `Inventory`, `Customer`, `Performance`) appear in the UI. The engine did not "detect" them; they are just buttons.
2. **Business Views:** If the user clicks `Operations`, the UI shows `Logistics Journey`, `Driver Performance`, and `Delivery SLA`—even though the dataset has zero operations data.
3. **Generated Questions:** `generateQuestionSuggestions` detects `{quantity}` and `{warehouse}` semantic tags. It outputs: "What is the Stock Qty distribution across Warehouses?".
4. **The UI Leak:** If the user selects `Operations` -> `Driver Performance`, the UI filter fails to find "Driver" in the generated questions. The fatal fallback triggers. The UI renders "What is the Stock Qty distribution across Warehouses?" underneath the "Driver Performance" header.

---

## Step 4: Hardcoded Catalog Detection

1. **Perspective Options:**
   - **File:** `apps/desktop/src/pages/Home.tsx` (lines 801-807)
   - **Implementation:** Hardcoded array of objects `[{ id: "operations", name: "Operations", ... }, ...]`.
2. **Business View Options:**
   - **File:** `apps/desktop/src/pages/Home.tsx` (lines 194-212)
   - **Implementation:** Hardcoded dictionary `PerspectiveBusinessViewMap`.
3. **Question Templates:**
   - **File:** `apps/desktop/src/lib/question-suggestions.ts` (lines 19-90)
   - **Implementation:** Hardcoded `TEMPLATES` array mapping `{semantic_tag}` to raw strings.

---

## Step 5: Architecture Gap Analysis

**Can an Inventory dataset still produce Driver Performance views?**
**YES.** Views are hardcoded UI constants. Because `Home.tsx` explicitly renders the 5 global perspectives for *any* dataset, clicking "Operations" will always reveal "Driver Performance", regardless of the underlying columns.

**Can Business Views exist without supporting evidence?**
**YES.** Because the views are statically mapped in the frontend state, they exist independently of the dataset's `SemanticMapping`. A user can select "Logistics Journey" on a purely financial dataset.

**Can Questions be generated without using the selected Business View?**
**YES.** Questions are currently generated by `generateQuestionSuggestions(mapping)`, which takes exactly zero business context arguments. All questions are pre-generated from columns before the user interacts with the Perspective layer.

### Conclusion
The architecture is fundamentally inverted. To align with the `Perspective -> Business View -> Question` philosophy, the generation of Business Views must become an algorithmic detection process based on data signals, and Questions must be dynamically templated/planned *using* the selected Business View object, rather than relying on global template matching and cosmetic UI filters.
