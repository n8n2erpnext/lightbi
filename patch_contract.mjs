import fs from 'fs';
import path from 'path';

const contractPath = '/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/lib/dataset-understanding-contract.ts';
const testPath = '/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/lib/dataset-understanding-contract.test.ts';
const coverageTestPath = '/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/lib/dataset-understanding-domain-coverage.test.ts';

let contractStr = fs.readFileSync(contractPath, 'utf8');

// 1. Inject helpers at top
const helpers = `
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

  if (has('shipment') || has('route') || has('driver')) {
    if (has('route') && has('shipment')) available.push({ id: \`opp_\${capId++}\`, label: "Shipment activity by route", basedOnSignals: ['shipment', 'route'], source: 'signals', actionType: 'group_by', dimensions: ['route'], measures: ['shipment'] });
    if (has('driver') && has('shipment')) available.push({ id: \`opp_\${capId++}\`, label: "Shipment activity by driver", basedOnSignals: ['shipment', 'driver'], source: 'signals', actionType: 'group_by', dimensions: ['driver'], measures: ['shipment'] });
    if (has('report_date') && has('shipment')) available.push({ id: \`opp_\${capId++}\`, label: "Shipment trend over time", basedOnSignals: ['shipment', 'report_date'], source: 'signals', actionType: 'trend', dimensions: ['report_date'], measures: ['shipment'] });
    if (has('satisfaction') && has('route')) available.push({ id: \`opp_\${capId++}\`, label: "Satisfaction score by route", basedOnSignals: ['satisfaction', 'route'], source: 'signals', actionType: 'group_by', dimensions: ['route'], measures: ['satisfaction'] });
    
    if (!has('sla')) unavailable.push({ id: 'ua_sla', label: 'SLA breach analysis', missingSignals: ['sla'], reason: 'Missing SLA data' });
    if (!has('delivery_status')) unavailable.push({ id: 'ua_delivery_status', label: 'Delivery status analysis', missingSignals: ['delivery_status'], reason: 'Missing delivery status' });
    return { available, unavailable };
  }

  if (has('sku') || has('stock_age') || has('inventory') || has('stock_qty')) {
    if (has('stock_age') && has('sku')) available.push({ id: \`opp_\${capId++}\`, label: "Stock aging profile by SKU", basedOnSignals: ['stock_age', 'sku'], source: 'signals', actionType: 'distribution', dimensions: ['sku'], measures: ['stock_age'] });
    if (has('stock_age') && has('warehouse')) available.push({ id: \`opp_\${capId++}\`, label: "Average aging by warehouse", basedOnSignals: ['stock_age', 'warehouse'], source: 'signals', actionType: 'group_by', dimensions: ['warehouse'], measures: ['stock_age'] });
    if (has('stock_qty') && has('sku')) available.push({ id: \`opp_\${capId++}\`, label: "Inventory level by SKU", basedOnSignals: ['stock_qty', 'sku'], source: 'signals', actionType: 'group_by', dimensions: ['sku'], measures: ['stock_qty'] });
    if (has('inventory') && has('warehouse')) available.push({ id: \`opp_\${capId++}\`, label: "Inventory by warehouse", basedOnSignals: ['inventory', 'warehouse'], source: 'signals', actionType: 'group_by', dimensions: ['warehouse'], measures: ['inventory'] });
    if (has('inbound') && has('outbound')) available.push({ id: \`opp_\${capId++}\`, label: "Inbound vs outbound movement", basedOnSignals: ['inbound', 'outbound'], source: 'signals', actionType: 'relationship', dimensions: ['sku'], measures: ['inbound', 'outbound'] });

    if (!has('stock_status')) unavailable.push({ id: 'ua_stock_status', label: 'Inventory status analysis', missingSignals: ['stock_status'], reason: 'Missing inventory status column' });
    return { available, unavailable };
  }

  if (has('revenue') || has('cost') || has('profit') || has('margin')) {
    if (has('revenue') && has('cost')) available.push({ id: \`opp_\${capId++}\`, label: "Revenue vs cost breakdown", basedOnSignals: ['revenue', 'cost'], source: 'signals', actionType: 'relationship', dimensions: [], measures: ['revenue', 'cost'] });
    if (has('profit') && has('margin')) available.push({ id: \`opp_\${capId++}\`, label: "Profit distribution", basedOnSignals: ['profit', 'margin'], source: 'signals', actionType: 'distribution', dimensions: [], measures: ['profit'] });
    if (has('revenue') && timeSignals.length > 0) available.push({ id: \`opp_\${capId++}\`, label: \`Revenue over \${timeSignals[0].label}\`, basedOnSignals: ['revenue', timeSignals[0].canonicalId], source: 'signals', actionType: 'trend', dimensions: [timeSignals[0].canonicalId], measures: ['revenue'] });
    if (has('expense') && has('budget')) available.push({ id: \`opp_\${capId++}\`, label: "Expense vs budget", basedOnSignals: ['expense', 'budget'], source: 'signals', actionType: 'relationship', dimensions: [], measures: ['expense', 'budget'] });
    
    if (!has('cost')) unavailable.push({ id: 'ua_cost', label: 'Cost breakdown analysis', missingSignals: ['cost'], reason: 'Missing cost data' });
    return { available, unavailable };
  }

  if (has('sales') || has('order') || has('revenue')) {
    if (has('sales') && has('branch')) available.push({ id: \`opp_\${capId++}\`, label: "Sales by branch", basedOnSignals: ['sales', 'branch'], source: 'signals', actionType: 'group_by', dimensions: ['branch'], measures: ['sales'] });
    if (has('revenue') && has('salesperson')) available.push({ id: \`opp_\${capId++}\`, label: "Revenue by salesperson", basedOnSignals: ['revenue', 'salesperson'], source: 'signals', actionType: 'group_by', dimensions: ['salesperson'], measures: ['revenue'] });
    if (has('order') && timeSignals.length > 0) available.push({ id: \`opp_\${capId++}\`, label: "Order volume over time", basedOnSignals: ['order', timeSignals[0].canonicalId], source: 'signals', actionType: 'trend', dimensions: [timeSignals[0].canonicalId], measures: ['order'] });
    if (has('discount') && has('revenue')) available.push({ id: \`opp_\${capId++}\`, label: "Discount impact on revenue", basedOnSignals: ['discount', 'revenue'], source: 'signals', actionType: 'relationship', dimensions: [], measures: ['discount', 'revenue'] });

    if (!has('customer')) unavailable.push({ id: 'ua_customer', label: 'Customer cohort analysis', missingSignals: ['customer'], reason: 'Missing customer identifier' });
    return { available, unavailable };
  }

  if (has('customer') || has('segment') || has('retention')) {
    if (has('retention') && has('segment')) available.push({ id: \`opp_\${capId++}\`, label: "Retention rate by segment", basedOnSignals: ['retention', 'segment'], source: 'signals', actionType: 'group_by', dimensions: ['segment'], measures: ['retention'] });
    if (has('order_count') && has('segment')) available.push({ id: \`opp_\${capId++}\`, label: "Order frequency by segment", basedOnSignals: ['order_count', 'segment'], source: 'signals', actionType: 'group_by', dimensions: ['segment'], measures: ['order_count'] });
    if (has('contribution') && has('segment')) available.push({ id: \`opp_\${capId++}\`, label: "Revenue contribution by segment", basedOnSignals: ['contribution', 'segment'], source: 'signals', actionType: 'group_by', dimensions: ['segment'], measures: ['contribution'] });
    if (has('last_purchase') && has('segment')) available.push({ id: \`opp_\${capId++}\`, label: "Recency distribution by segment", basedOnSignals: ['last_purchase', 'segment'], source: 'signals', actionType: 'distribution', dimensions: ['segment'], measures: ['last_purchase'] });

    if (!has('last_purchase')) unavailable.push({ id: 'ua_recency', label: 'Recency analysis', missingSignals: ['last_purchase'], reason: 'Missing last purchase date' });
    return { available, unavailable };
  }

  if (has('kpi') || has('target') || has('achievement') || has('actual')) {
    if (has('target') && has('achievement')) available.push({ id: \`opp_\${capId++}\`, label: "Target vs achievement by KPI", basedOnSignals: ['target', 'achievement', 'kpi'], source: 'signals', actionType: 'relationship', dimensions: ['kpi'], measures: ['target', 'achievement'] });
    if (has('actual') && has('department')) available.push({ id: \`opp_\${capId++}\`, label: "Actual performance by department", basedOnSignals: ['actual', 'department'], source: 'signals', actionType: 'group_by', dimensions: ['department'], measures: ['actual'] });
    if (has('efficiency') && has('department')) available.push({ id: \`opp_\${capId++}\`, label: "Efficiency by department", basedOnSignals: ['efficiency', 'department'], source: 'signals', actionType: 'group_by', dimensions: ['department'], measures: ['efficiency'] });
    if (has('performance_gap') && has('kpi')) available.push({ id: \`opp_\${capId++}\`, label: "Performance gap distribution", basedOnSignals: ['performance_gap', 'kpi'], source: 'signals', actionType: 'distribution', dimensions: ['kpi'], measures: ['performance_gap'] });

    if (!has('target')) unavailable.push({ id: 'ua_target', label: 'Target vs actual comparison', missingSignals: ['target'], reason: 'Missing target data' });
    return { available, unavailable };
  }

  let hasPromotedDist = false;
  for (const dim of dimensionSignals) {
    if (capId > 8) break;
    if (!hasPromotedDist) {
      available.push({ id: \`gen_aa_\${capId++}\`, label: \`\${dim.label} distribution\`, basedOnSignals: [dim.canonicalId], source: 'signals', actionType: 'distribution', dimensions: [dim.canonicalId], measures: ['record_count'] });
      hasPromotedDist = true;
    }
  }
  let hasPromotedTrend = false;
  let hasPromotedGroupBy = false;
  for (const measure of measureSignals) {
    for (const time of timeSignals) {
      if (capId > 16) break;
      if (!hasPromotedTrend) {
        available.push({ id: \`gen_aa_\${capId++}\`, label: \`\${measure.label} over \${time.label}\`, basedOnSignals: [measure.canonicalId, time.canonicalId], source: 'signals', actionType: 'trend', dimensions: [time.canonicalId], measures: [measure.canonicalId] });
        hasPromotedTrend = true;
      }
    }
    for (const dim of dimensionSignals) {
      if (capId > 24) break;
      if (!hasPromotedGroupBy) {
        available.push({ id: \`gen_aa_\${capId++}\`, label: \`\${measure.label} by \${dim.label}\`, basedOnSignals: [measure.canonicalId, dim.canonicalId], source: 'signals', actionType: 'group_by', dimensions: [dim.canonicalId], measures: [measure.canonicalId] });
        hasPromotedGroupBy = true;
      }
    }
  }

  if (signals.length > 0 && measureSignals.length === 0) unavailable.push({ id: 'gen_ua_1', label: 'Quantitative breakdown analysis', missingSignals: ['(any measure)'], reason: 'Dataset lacks quantitative measure signals to aggregate.' });
  if (signals.length > 0 && timeSignals.length === 0) unavailable.push({ id: 'gen_ua_2', label: 'Trend over time analysis', missingSignals: ['(any time dimension)'], reason: 'Dataset lacks time-based signals for trend analysis.' });

  return { available, unavailable };
}

function generateNarrative(
  status: DatasetUnderstandingStatus,
  signals: BusinessSignal[],
  availableCount: number,
  has: (id: string) => boolean
): string {
  if (status === "insufficient") return "Insufficient data to understand this dataset.";

  const domainCounts: Record<string, number> = {};
  for (const s of signals) {
    domainCounts[s.domain] = (domainCounts[s.domain] || 0) + 1;
  }
  let dominantDomain = "unknown";
  let maxCount = 0;
  for (const [d, count] of Object.entries(domainCounts)) {
    if (count > maxCount) { maxCount = count; dominantDomain = d; }
  }

  if (dominantDomain === 'operations') return \`This appears to be an operations or delivery dataset. \${availableCount} analysis paths identified.\`;
  if (dominantDomain === 'inventory') return \`This appears to be an inventory dataset. \${availableCount} analysis paths identified.\`;
  if (dominantDomain === 'finance') return \`This appears to be a finance or P&L dataset. \${availableCount} analysis paths identified.\`;
  if (dominantDomain === 'revenue') return \`This appears to be a sales or revenue dataset. \${availableCount} analysis paths identified.\`;
  if (dominantDomain === 'customer') return \`This appears to be a customer analytics dataset. \${availableCount} analysis paths identified.\`;
  if (dominantDomain === 'performance') return \`This appears to be a performance or KPI dataset. \${availableCount} analysis paths identified.\`;

  return \`Detected \${signals.length} business concepts across \${availableCount} analysis paths.\`;
}
`;

// Insert helpers before export function createDatasetUnderstanding
contractStr = contractStr.replace('export function createDatasetUnderstanding', helpers + '\nexport function createDatasetUnderstanding');

// 2. Replace the structural logic in createDatasetUnderstanding
// Find from "if (has('report_date') && has('route')" down to "if (signals.length > 0 && timeSignals.length === 0)"
const startStr = `  // Maintain Delivery Performance backwards compatibility for strict tests\n  if (has('report_date') && has('route') && has('driver') && has('shipment') && has('satisfaction')) {`;
const endStr = `// Generate Narrative`;

const startIndex = contractStr.indexOf(startStr);
const endIndex = contractStr.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.log("Failed to find replacement block bounds");
  process.exit(1);
}

const replacement = `  const domainOpps = generateDomainOpportunities(signals, has, timeSignals, measureSignals, dimensionSignals);
  availableAnalysis.push(...domainOpps.available);
  unavailableAnalysis.push(...domainOpps.unavailable);

  `;

contractStr = contractStr.slice(0, startIndex) + replacement + contractStr.slice(endIndex);

// 3. Replace narrative generation
const navStartStr = `// Generate Narrative\n  let narrative = "";\n  if (status === "insufficient") {\n    narrative = "Insufficient data to understand this dataset.";\n  } else if (has('report_date') && has('route') && has('driver') && has('shipment') && has('satisfaction')) {\n    narrative = "This dataset appears to describe delivery operations activity, but advanced SLA/status analysis is unavailable.";\n  } else {\n    narrative = \`Detected \${signals.length} business concepts. Generated \${availableAnalysis.length} structural models.\`;\n  }`;

contractStr = contractStr.replace(navStartStr, `// Generate Narrative\n  const narrative = generateNarrative(status, signals, availableAnalysis.length, has);`);

fs.writeFileSync(contractPath, contractStr);

// ===================================
// UPDATE dataset-understanding-contract.test.ts
// ===================================
let testStr = fs.readFileSync(testPath, 'utf8');

const newTests = `
  it('Finance dataset generates finance-aware opportunities', () => {
    const registry = createMockRegistry(['revenue', 'cost', 'profit', 'time_period']);
    const du = createDatasetUnderstanding({ signalRegistry: registry, datasetName: 'Finance', rowCount: 100, columnCount: 5, status: 'understood' });
    expect(du.availableAnalysis.some(a => a.label.includes('Revenue') || a.label.includes('cost') || a.label.includes('Profit') || a.label.includes('Expense'))).toBe(true);
    expect(du.narrative.includes('finance')).toBe(true);
  });

  it('Inventory dataset generates inventory-aware opportunities', () => {
    const registry = createMockRegistry(['sku', 'stock_age', 'warehouse', 'stock_qty']);
    const du = createDatasetUnderstanding({ signalRegistry: registry, datasetName: 'Inventory', rowCount: 100, columnCount: 5, status: 'understood' });
    expect(du.availableAnalysis.some(a => a.label === 'Stock aging profile by SKU')).toBe(true);
    expect(du.narrative.includes('inventory')).toBe(true);
  });

  it('Customer dataset generates customer-aware opportunities', () => {
    const registry = createMockRegistry(['customer', 'segment', 'retention', 'order_count']);
    const du = createDatasetUnderstanding({ signalRegistry: registry, datasetName: 'Customer', rowCount: 100, columnCount: 5, status: 'understood' });
    expect(du.availableAnalysis.some(a => a.dimensions.includes('segment'))).toBe(true);
    expect(du.narrative.includes('customer')).toBe(true);
  });

  it('Performance dataset generates KPI-aware opportunities', () => {
    const registry = createMockRegistry(['kpi', 'target', 'achievement', 'department']);
    const du = createDatasetUnderstanding({ signalRegistry: registry, datasetName: 'Performance', rowCount: 100, columnCount: 5, status: 'understood' });
    expect(du.availableAnalysis.some(a => a.label === 'Target vs achievement by KPI')).toBe(true);
  });

  it('Revenue/Sales dataset generates sales-aware opportunities', () => {
    const registry = createMockRegistry(['sales', 'branch', 'revenue', 'salesperson']);
    const du = createDatasetUnderstanding({ signalRegistry: registry, datasetName: 'Sales', rowCount: 100, columnCount: 5, status: 'understood' });
    expect(du.availableAnalysis.some(a => a.dimensions.includes('branch') && a.measures.includes('sales'))).toBe(true);
  });
`;

testStr = testStr.replace('});\n\n// Add missing type for implicit export', newTests + '});\n\n// Add missing type for implicit export');

if (!testStr.includes('Finance dataset generates finance-aware')) {
   // if the replace above failed due to exact string match, let's inject before last describe end
   const lastIndex = testStr.lastIndexOf('});');
   testStr = testStr.substring(0, lastIndex) + newTests + testStr.substring(lastIndex);
}

fs.writeFileSync(testPath, testStr);

// ===================================
// UPDATE dataset-understanding-domain-coverage.test.ts
// ===================================
let covStr = fs.readFileSync(coverageTestPath, 'utf8');
covStr = covStr.replace(`expect(du.availableAnalysis.length).toBeGreaterThan(0);`, `expect(du.availableAnalysis.length).toBeGreaterThan(0);\n    expect(du.availableAnalysis.some(a => a.label === 'Stock aging profile by SKU')).toBe(true);`);
fs.writeFileSync(coverageTestPath, covStr);

console.log("Patched successfully!");
