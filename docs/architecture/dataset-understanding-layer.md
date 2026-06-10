# Dataset Understanding Layer

## Overview
LightBI is a Business Understanding Layer that sits between raw data and downstream analytics. The primary goal of LightBI is to achieve structured comprehension of a dataset.

This comprehension is stratified into distinct levels. The system must generate and present this understanding to the user *before* attempting to generate derived outputs like Business Views or Suggested Questions.

## Architecture Levels

### Level 0: Dataset Profile
The foundational physical characteristics of the dataset.
- Row count
- Column count
- Data types (String, Numeric, Date, Boolean)
- Data quality (Null percentages, distinct counts)
- Candidate keys

### Level 1: Business Concepts
The raw semantic translation of physical columns into canonical signals via the `BusinessSignalDetector`.
- Detected signals
- Canonical concepts (e.g., `driver`, `revenue`, `route`)
- Aliases matched (e.g., "Tên lái xe" → `driver`)
- Confidence scores

### Level 2: Business Entities
Inferred real-world actors and objects derived from the detected concepts.
**Examples:**
- `Driver`, `Route`, `Shipment`
- `Customer`, `Product`, `Order`, `SKU`
- `Branch`, `Salesperson`, `Supplier`

### Level 3: Business Workflow / Shape
The inferred sequence or lifecycle of events within the dataset.
**Examples:**
- *For delivery datasets:* `Driver` → `Route` → `Shipment` → `Customer Feedback`
- *For sales datasets:* `Branch / Salesperson` → `Order` → `Revenue` → `Discount`
- *For inventory datasets:* `Supplier` → `Product / SKU` → `Warehouse` → `Stock Movement`

### Level 4: Relationship Hints
Analytical potential based on the shape of the data.
- Possible entity links
- Possible dimensions (e.g., cut by `route`, `driver`)
- Possible measures (e.g., count of `shipment`, average `satisfaction`)
- Possible time fields (e.g., trend over `report_date`)

### Level 5: Understanding Narrative
A human-readable synthesis explaining exactly what the engine comprehends, including its limitations.

*Example Narrative:*
> "LightBI believes this dataset describes delivery performance activity. It contains drivers, routes, shipments, reporting dates, and feedback ratings. However, it does not contain delivery status or SLA fields, so advanced SLA views are unavailable."

### Level 6: Optional Derived Outputs
Artifacts that are strictly downstream from Understanding. If these cannot be generated, the Understanding (Levels 0-5) still holds immense value.
- Perspectives
- Business Views
- Questions
- Runtime Plans
- Charts
- Insights

**Important:** Derived outputs must *never* replace or gate the presentation of Understanding.

---

## Required Example: Delivery Performance Reports

**Input Concepts:**
`report_date`, `route`, `driver`, `shipment`, `satisfaction`

**Expected Understanding Output:**

- **Dataset appears to describe:** Delivery operations / delivery performance activity
- **Detected entities:**
  - Driver
  - Route
  - Shipment
  - Feedback / Satisfaction
  - Report Date
- **Possible workflow:** `Driver` → `Route` → `Shipment` → `Satisfaction`
- **Available analysis:**
  - shipment count by route
  - shipment count by driver
  - satisfaction by route
  - satisfaction by driver
  - activity over report date
- **Unavailable advanced analysis:**
  - SLA breach analysis
  - delivery status transition analysis
  - late delivery rate
  *(because missing: `sla`, `delivery_status`)*

This output represents a **100% successful understanding result**, despite yielding 0 formal Business Views and 0 Suggested Questions.
