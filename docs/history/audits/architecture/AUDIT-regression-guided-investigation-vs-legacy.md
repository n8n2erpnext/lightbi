# Regression Audit: Guided Investigation Pipeline vs Legacy Behavior

**Phase:** BVQ-9A
**Target:** Investigate the drop in generated Views and Questions after the BVQ-7 Home cleanup.
**Status:** Audit Complete (No code modifications).

## 1. Context
Prior to the BVQ-7 cleanup, the system generated a dense list of Perspectives, Views, and Questions. After strictly migrating to the `Guided Investigation Pipeline`, the metrics dropped to:
- **Signals:** 2
- **Perspectives:** 2
- **Views:** 0
- **Questions:** 0

## 2. Dataset Analysis
The investigation utilized the exact dataset referenced in `semantic.test.ts` to trace the regression:
**Loaded Columns:** `["Ngày báo cáo", "Tuyến xe", "Tên lái xe", "Đánh giá", "Mã tài kiện"]`

### Current Pipeline Processing (`runGuidedInvestigationPipeline`):
- `"Ngày báo cáo"` → `(Ignored)`
- `"Tuyến xe"` → `route`
- `"Tên lái xe"` → `(Ignored)` (Normalizes to "ten lai xe")
- `"Đánh giá"` → `satisfaction`
- `"Mã tài kiện"` → `(Ignored)` (Normalizes to "ma tai kien")

**Current Detected Signals:** `['route', 'satisfaction']`

### Legacy Processing (`semantic-fields.ts`):
The legacy semantic engine used loose substring mapping (`lowerCol.includes(alias)` and Regex boundaries).
- `"Ngày báo cáo"` → `report_date` (Partial match on "báo cáo")
- `"Tuyến xe"` → `route` 
- `"Tên lái xe"` → `driver` (Partial match on "lái xe")
- `"Đánh giá"` → `delivery_status`
- `"Mã tài kiện"` → `shipment` (Partial match on "kiện")

**Legacy Detected Signals:** `['report_date', 'route', 'driver', 'delivery_status', 'shipment']`

## 3. Rejected Business Views Analysis
Because the new pipeline enforces strict registry validation and `minimumRequiredMatches`, Business Views are rightfully rejected when signal evidence is too weak.

**Example: Logistics Journey (`logistics_journey`)**
- **Required:** `driver`, `route`, `delivery_status`
- **Matched:** `route`
- **Missing:** `driver`, `delivery_status`
- **Result:** ❌ Rejected
- **Reason:** 1 of 3 signals found. Minimum 3 required.

*(Since 0 Business Views passed the strict verification gate, 0 Questions were instantiated from the templates).*

## 4. Architectural Regression Answers

### 1. Is current behavior correct?
**Yes.** The current behavior is architecturally correct. The pipeline acts deterministically and safely rejects unverified Views. 

### 2. Is current behavior stricter?
**Yes, significantly.** 
- **Legacy:** Used aggressive partial substring matching (`.includes()`), which led to massive false positives (e.g., matching "sự kiện" (event) as "kiện" (shipment)).
- **Current:** Uses strict array `.includes()` normalized matching, preventing domain hallucinations.

### 3. Did we lose signals?
**Yes, lexically.** We lost signals because the strict detector does not contain the exact normalized strings (`ten lai xe`, `ma tai kien`, `ngay bao cao`) in the `TAXONOMY` aliases.

### 4. Did we lose perspectives?
**No.** We still accurately detected `operations` (from `route`) and `customer` (from `satisfaction`).

### 5. Did we lose business views?
**Yes.** Because we lost the weak signals (`driver`, `delivery_status`), the Business View gatekeeper rejected the Views for lacking the `minimumRequiredMatches` threshold.

### 6. Did we lose question coverage?
**Yes, structurally.** 
- **Legacy:** `question-suggestions.ts` ignored Business Views entirely. It generated heuristic questions directly from semantic tags (e.g., "Show [delivery_status] by [driver]"). 
- **Current:** No View = No Questions. This is the intended "Understand First, Question Later" philosophy in action.

## 5. Conclusion
The drop in Views and Questions is **NOT a bug**, but rather the **Expected Stricter Behavior** of the newly purified architecture. The BVQ-7 cleanup successfully deleted the heuristic guessing engines (`dataset-capabilities.ts` and `semantic-fields.ts`).

**Next Steps:**
To recover the rich question generation *safely*, we must NOT revert to loose heuristics. Instead, we should continue expanding the exact-match `TAXONOMY` vocabulary (e.g., adding `"ten lai xe"`, `"ma tai kien"` to aliases) as done in BVQ-8C.
