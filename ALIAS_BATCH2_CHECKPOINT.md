# Alias Batch 2 Checkpoint

1. **What Batch 2 improved**
   Successfully extracted core signals from structural variants like `sku_code`, `inbound_qty`, `outbound_qty`, `revenue_total`, and `cost_total` by stripping safe affixes based on their signal type.

2. **What Batch 2 did not improve**
   Semantic taxonomy gaps. Specialized modifiers like `net`, `pct`, `misc` (e.g., `profit_net`, `margin_pct`) remain unmapped because the dictionary itself lacks these concepts.

3. **What was blocked correctly by guardrails**
   Type-Aware Guardrails correctly blocked `order_date` from mapping to `order` (measure), and `shipment_no` from mapping to `shipment` (measure) since `no` is restricted to dimensions.

4. **What still requires taxonomy expansion**
   Industry-specific domains (Finance, SaaS, Healthcare) require deliberate vocabulary expansion to cover specific business views instead of relying on structural stripping.

5. **Recommended next phase**
   `Taxonomy Expansion Phase 1`
