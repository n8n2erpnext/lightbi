# ADR 087: Signal Taxonomy

## Status
Accepted

## Context
With the introduction of the Business Signal Registry (ADR-085) and Canonicalization (ADR-086), LightBI requires a formalized taxonomy of valid Business Signals to ensure consistency across the detection and question generation layers.

## Decision
We define the **V1 Signal Taxonomy**, categorized by broad business domains. All generated `BusinessSignal` objects must conform to an ID defined within this taxonomy.

### V1 Signal Families

#### Operations
- `driver`: Entity responsible for transport/execution.
- `route`: Geographic or logistical path.
- `shipment`: The physical item or package being moved.
- `delivery_status`: State of the logistical journey.
- `sla`: Service Level Agreement limits or deadlines.
- `warehouse`: Storage or dispatch facility.

#### Revenue
- `customer`: Purchasing entity.
- `order`: Transactional purchase record.
- `revenue`: Monetary income value.
- `margin`: Profitability metric.
- `discount`: Reduction in price.

#### Inventory
- `sku`: Stock Keeping Unit identifier.
- `product`: The item being sold/stored.
- `inventory`: Current stock count.
- `supplier`: Origin of the goods.
- `stock_movement`: Flow of goods (inbound/outbound).

#### Customer
- `segment`: Categorization of customers.
- `retention`: Likelihood of returning/churning.
- `satisfaction`: Metric of customer happiness (NPS, Rating).

#### Performance
- `target`: The goal to be achieved.
- `achievement`: The actual completion metric.
- `utilization`: Resource usage efficiency.
- `productivity`: Output per unit of input.

## Extension Rules
1. **Additive Only:** New signals can be added to the taxonomy as new use cases emerge. Existing signals should not be deleted to prevent breaking legacy Business Views.
2. **Orthogonality:** New signals should not heavily overlap with existing signals (e.g., do not add `client` if `customer` already exists).
3. **Generalization:** Prefer generalized concepts over hyper-specific industry terms unless building an industry-specific plugin.
