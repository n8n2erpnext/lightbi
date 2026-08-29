# Live Trace Audit: Delivery Performance Reports

**Phase:** BVQ-9B & BVQ-8D
**Target:** Trace the exact execution path of a known dataset through the Guided Investigation Pipeline to pinpoint the drop in views and questions, then verify the patch.
**Status:** Audit & Patch Complete.

## 1. Dataset Columns Entering Pipeline
The following columns entered the `runGuidedInvestigationPipeline()`:
- `Ngày báo cáo`
- `Tuyến xe`
- `Tên lái xe`
- `Đánh giá`
- `Mã tài kiện`

---

## 2. BEFORE PATCH (BVQ-9B)

### Detected Signals: 2
- `route` (from "Tuyến xe")
- `satisfaction` (from "Đánh giá")

### Generated Perspectives: 2
- `operations` (Triggered by the `route` signal)
- `customer` (Triggered by the `satisfaction` signal)

### Business Views Evaluated (And Rejected)
*All views were rejected because they could not meet the strict `minimumRequiredMatches` thresholds.*
- **`logistics_journey`:** 1 of 3 required signals.
- **`driver_performance`:** 0 of 2 required signals.
- **`delivery_sla`:** 1 of 2 required signals.
- **`route_performance`:** 1 of 2 required signals.
- **`warehouse_flow`:** 0 of 2 required signals.

**Why UI Showed: Views=0, Questions=0**
- Views = 0 because no evaluated Business View met its threshold.
- Questions = 0 because without Views, no questions can be generated.

**Root Cause:**
Taxonomy was missing granular Vietnamese aliases. `Tên lái xe` (driver) and `Mã tài kiện` (shipment) were GREEN concepts but lacked these specific lexical mappings.

---

## 3. AFTER PATCH (BVQ-8D)

### Detected Signals: 5
- `report_date` (from "Ngày báo cáo")
- `route` (from "Tuyến xe")
- `driver` (from "Tên lái xe")
- `satisfaction` (from "Đánh giá")
- `shipment` (from "Mã tài kiện")

### Generated Perspectives: 2
- `operations`
- `customer`

### Business Views Recovered: 0
Although we recovered `driver` and `shipment`, the dataset **still strictly lacks** `delivery_status`, `sla`, or `warehouse`.
Because the Architecture forbids lowering `minimumRequiredMatches` or softening Business View rules, the Engine rightfully holds its ground and returns 0 Views.

**Exact missing signals blocking Operations Views:**
- `logistics_journey`: Missing `delivery_status`
- `driver_performance`: Missing `sla`
- `delivery_sla`: Missing `sla`
- `route_performance`: Missing `delivery_status`
- `warehouse_flow`: Missing `warehouse`

### Questions Recovered: 0
Because Business Views were strictly (and correctly) gated, 0 Questions were instantiated.

## 4. Conclusion
The BVQ-8D patch successfully recovered the missing semantic signals (`report_date`, `driver`, `shipment`) for the `Delivery Performance Reports` dataset. The detector now perfectly understands all 5 columns.

However, the architecture correctly enforces that "Understanding columns is not enough; the columns must form a complete business concept." Because the dataset lacks `delivery_status` or `sla`, it is impossible to form a complete Logistics Journey or Driver Performance view. 

The Engine's strictness is fully validated.
