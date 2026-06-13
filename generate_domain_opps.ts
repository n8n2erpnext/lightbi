function generateDomainOpportunities(
  signals: BusinessSignal[],
  has: (id: string) => boolean,
  timeSignals: BusinessSignal[],
  measureSignals: BusinessSignal[],
  dimensionSignals: BusinessSignal[]
): { available: AvailableAnalysisItem[]; unavailable: UnavailableAnalysisItem[] } {
  const available: AvailableAnalysisItem[] = [];
  const unavailable: UnavailableAnalysisItem[] = [];
  let capId = 1;
  let domainMatched = false;

  if (has('shipment') || has('route') || has('driver')) {
    domainMatched = true;
    if (has('route') && has('shipment')) available.push({ id: `opp_${capId++}`, label: "Shipment activity by route", basedOnSignals: ['shipment', 'route'], source: 'signals', actionType: 'group_by', dimensions: ['route'], measures: ['shipment'] });
    if (has('driver') && has('shipment')) available.push({ id: `opp_${capId++}`, label: "Shipment activity by driver", basedOnSignals: ['shipment', 'driver'], source: 'signals', actionType: 'group_by', dimensions: ['driver'], measures: ['shipment'] });
    if (has('report_date') && has('shipment')) available.push({ id: `opp_${capId++}`, label: "Activity over report date", basedOnSignals: ['shipment', 'report_date'], source: 'signals', actionType: 'trend', dimensions: ['report_date'], measures: ['shipment'] });
    if (has('satisfaction') && has('route')) available.push({ id: `opp_${capId++}`, label: "Satisfaction by route", basedOnSignals: ['satisfaction', 'route'], source: 'signals', actionType: 'group_by', dimensions: ['route'], measures: ['satisfaction'] });
    if (has('satisfaction') && has('driver')) available.push({ id: `opp_${capId++}`, label: "Satisfaction by driver", basedOnSignals: ['satisfaction', 'driver'], source: 'signals', actionType: 'group_by', dimensions: ['driver'], measures: ['satisfaction'] });
    
    if (!has('sla')) unavailable.push({ id: 'ua_sla', label: 'SLA breach analysis', missingSignals: ['sla'], reason: 'Missing SLA data' });
    if (!has('delivery_status')) unavailable.push({ id: 'ua_delivery_status', label: 'Delivery status transition analysis', missingSignals: ['delivery_status'], reason: 'Missing delivery status' });
    if (!has('sla') || !has('delivery_status')) unavailable.push({ id: 'ua_late', label: 'Late delivery rate', missingSignals: ['sla', 'delivery_status'], reason: 'Missing SLA and delivery status' });
  }

  if (has('sku') || has('stock_age') || has('inventory') || has('stock_qty')) {
    domainMatched = true;
    if (has('stock_age') && has('sku')) available.push({ id: `opp_${capId++}`, label: "Stock aging profile by SKU", basedOnSignals: ['stock_age', 'sku'], source: 'signals', actionType: 'distribution', dimensions: ['sku'], measures: ['stock_age'] });
    if (has('stock_age') && has('warehouse')) available.push({ id: `opp_${capId++}`, label: "Average aging by warehouse", basedOnSignals: ['stock_age', 'warehouse'], source: 'signals', actionType: 'group_by', dimensions: ['warehouse'], measures: ['stock_age'] });
    if (has('stock_qty') && has('sku')) available.push({ id: `opp_${capId++}`, label: "Inventory level by SKU", basedOnSignals: ['stock_qty', 'sku'], source: 'signals', actionType: 'group_by', dimensions: ['sku'], measures: ['stock_qty'] });
    if (has('inventory') && has('warehouse')) available.push({ id: `opp_${capId++}`, label: "Inventory by warehouse", basedOnSignals: ['inventory', 'warehouse'], source: 'signals', actionType: 'group_by', dimensions: ['warehouse'], measures: ['inventory'] });
    if (has('inbound') && has('outbound')) available.push({ id: `opp_${capId++}`, label: "Inbound vs outbound movement", basedOnSignals: ['inbound', 'outbound'], source: 'signals', actionType: 'relationship', dimensions: ['sku'], measures: ['inbound', 'outbound'] });

    if (!has('stock_status')) unavailable.push({ id: 'ua_stock_status', label: 'Inventory status analysis', missingSignals: ['stock_status'], reason: 'Missing inventory status column' });
  }

  if (has('revenue') || has('cost') || has('profit') || has('margin')) {
    domainMatched = true;
    if (has('revenue') && has('cost')) available.push({ id: `opp_${capId++}`, label: "Revenue vs cost breakdown", basedOnSignals: ['revenue', 'cost'], source: 'signals', actionType: 'relationship', dimensions: [], measures: ['revenue', 'cost'] });
    if (has('profit') && has('margin')) available.push({ id: `opp_${capId++}`, label: "Profit distribution", basedOnSignals: ['profit', 'margin'], source: 'signals', actionType: 'distribution', dimensions: [], measures: ['profit'] });
    if (has('revenue') && timeSignals.length > 0) available.push({ id: `opp_${capId++}`, label: `Revenue over ${timeSignals[0].label}`, basedOnSignals: ['revenue', timeSignals[0].canonicalId], source: 'signals', actionType: 'trend', dimensions: [timeSignals[0].canonicalId], measures: ['revenue'] });
    if (has('expense') && has('budget')) available.push({ id: `opp_${capId++}`, label: "Expense vs budget", basedOnSignals: ['expense', 'budget'], source: 'signals', actionType: 'relationship', dimensions: [], measures: ['expense', 'budget'] });
    
    if (!has('cost')) unavailable.push({ id: 'ua_cost', label: 'Cost breakdown analysis', missingSignals: ['cost'], reason: 'Missing cost data' });
  }

  if (has('sales') || has('order') || has('revenue')) {
    domainMatched = true;
    if (has('sales') && has('branch')) available.push({ id: `opp_${capId++}`, label: "Sales by branch", basedOnSignals: ['sales', 'branch'], source: 'signals', actionType: 'group_by', dimensions: ['branch'], measures: ['sales'] });
    if (has('revenue') && has('salesperson')) available.push({ id: `opp_${capId++}`, label: "Revenue by salesperson", basedOnSignals: ['revenue', 'salesperson'], source: 'signals', actionType: 'group_by', dimensions: ['salesperson'], measures: ['revenue'] });
    if (has('order') && timeSignals.length > 0) available.push({ id: `opp_${capId++}`, label: "Order volume over time", basedOnSignals: ['order', timeSignals[0].canonicalId], source: 'signals', actionType: 'trend', dimensions: [timeSignals[0].canonicalId], measures: ['order'] });
    if (has('discount') && has('revenue')) available.push({ id: `opp_${capId++}`, label: "Discount impact on revenue", basedOnSignals: ['discount', 'revenue'], source: 'signals', actionType: 'relationship', dimensions: [], measures: ['discount', 'revenue'] });

    if (!has('customer')) unavailable.push({ id: 'ua_customer', label: 'Customer cohort analysis', missingSignals: ['customer'], reason: 'Missing customer identifier' });
  }

  if (has('customer') || has('segment') || has('retention')) {
    domainMatched = true;
    if (has('retention') && has('segment')) available.push({ id: `opp_${capId++}`, label: "Retention rate by segment", basedOnSignals: ['retention', 'segment'], source: 'signals', actionType: 'group_by', dimensions: ['segment'], measures: ['retention'] });
    if (has('order_count') && has('segment')) available.push({ id: `opp_${capId++}`, label: "Order frequency by segment", basedOnSignals: ['order_count', 'segment'], source: 'signals', actionType: 'group_by', dimensions: ['segment'], measures: ['order_count'] });
    if (has('contribution') && has('segment')) available.push({ id: `opp_${capId++}`, label: "Revenue contribution by segment", basedOnSignals: ['contribution', 'segment'], source: 'signals', actionType: 'group_by', dimensions: ['segment'], measures: ['contribution'] });
    if (has('last_purchase') && has('segment')) available.push({ id: `opp_${capId++}`, label: "Recency distribution by segment", basedOnSignals: ['last_purchase', 'segment'], source: 'signals', actionType: 'distribution', dimensions: ['segment'], measures: ['last_purchase'] });

    if (!has('last_purchase')) unavailable.push({ id: 'ua_recency', label: 'Recency analysis', missingSignals: ['last_purchase'], reason: 'Missing last purchase date' });
  }

  if (has('kpi') || has('target') || has('achievement') || has('actual')) {
    domainMatched = true;
    if (has('target') && has('achievement')) available.push({ id: `opp_${capId++}`, label: "Target vs achievement by KPI", basedOnSignals: ['target', 'achievement', 'kpi'], source: 'signals', actionType: 'relationship', dimensions: ['kpi'], measures: ['target', 'achievement'] });
    if (has('actual') && has('department')) available.push({ id: `opp_${capId++}`, label: "Actual performance by department", basedOnSignals: ['actual', 'department'], source: 'signals', actionType: 'group_by', dimensions: ['department'], measures: ['actual'] });
    if (has('efficiency') && has('department')) available.push({ id: `opp_${capId++}`, label: "Efficiency by department", basedOnSignals: ['efficiency', 'department'], source: 'signals', actionType: 'group_by', dimensions: ['department'], measures: ['efficiency'] });
    if (has('performance_gap') && has('kpi')) available.push({ id: `opp_${capId++}`, label: "Performance gap distribution", basedOnSignals: ['performance_gap', 'kpi'], source: 'signals', actionType: 'distribution', dimensions: ['kpi'], measures: ['performance_gap'] });

    if (!has('target')) unavailable.push({ id: 'ua_target', label: 'Target vs actual comparison', missingSignals: ['target'], reason: 'Missing target data' });
  }

  if (!domainMatched || (domainMatched && available.length === 0)) {
    let hasPromotedDist = false;
    for (const dim of dimensionSignals) {
      if (capId > 8) break;
      if (!hasPromotedDist) {
        available.push({ id: `gen_aa_${capId++}`, label: `${dim.label} distribution`, basedOnSignals: [dim.canonicalId], source: 'signals', actionType: 'distribution', dimensions: [dim.canonicalId], measures: ['record_count'] });
        hasPromotedDist = true;
      }
    }
    let hasPromotedTrend = false;
    let hasPromotedGroupBy = false;
    for (const measure of measureSignals) {
      for (const time of timeSignals) {
        if (capId > 16) break;
        if (!hasPromotedTrend) {
          available.push({ id: `gen_aa_${capId++}`, label: `${measure.label} over ${time.label}`, basedOnSignals: [measure.canonicalId, time.canonicalId], source: 'signals', actionType: 'trend', dimensions: [time.canonicalId], measures: [measure.canonicalId] });
          hasPromotedTrend = true;
        }
      }
      for (const dim of dimensionSignals) {
        if (capId > 24) break;
        if (!hasPromotedGroupBy) {
          available.push({ id: `gen_aa_${capId++}`, label: `${measure.label} by ${dim.label}`, basedOnSignals: [measure.canonicalId, dim.canonicalId], source: 'signals', actionType: 'group_by', dimensions: [dim.canonicalId], measures: [measure.canonicalId] });
          hasPromotedGroupBy = true;
        }
      }
    }

    if (signals.length > 0 && measureSignals.length === 0) unavailable.push({ id: 'gen_ua_1', label: 'Quantitative breakdown analysis', missingSignals: ['(any measure)'], reason: 'Dataset lacks quantitative measure signals to aggregate.' });
    if (signals.length > 0 && timeSignals.length === 0) unavailable.push({ id: 'gen_ua_2', label: 'Trend over time analysis', missingSignals: ['(any time dimension)'], reason: 'Dataset lacks time-based signals for trend analysis.' });
  }

  return { available, unavailable };
}
