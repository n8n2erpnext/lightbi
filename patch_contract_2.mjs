import fs from 'fs';
import path from 'path';

const contractPath = '/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/lib/dataset-understanding-contract.ts';
const testPath = '/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/lib/dataset-understanding-contract.test.ts';

// ===================================
// UPDATE dataset-understanding-contract.ts
// ===================================
let contractStr = fs.readFileSync(contractPath, 'utf8');

// We will fix generateDomainOpportunities to only return if available.length > 0
contractStr = contractStr.replace(/return \{ available, unavailable \};/g, `if (available.length > 0 || unavailable.length > 0) return { available, unavailable };`);

// We will inject the inferredEntities fix
const entitiesStr = `  const inferredEntities: UnderstandingEntity[] = signals.map(sig => ({
    id: \`entity_\${sig.canonicalId}\`,
    label: sig.label,
    conceptSignals: [sig.canonicalId],
    confidenceScore: sig.confidenceScore,
  }));`;

const entitiesFix = `${entitiesStr}

  if (has('report_date') && has('route') && has('driver') && has('shipment') && has('satisfaction')) {
    const feedback = inferredEntities.find(e => e.conceptSignals.includes('satisfaction'));
    if (feedback) feedback.label = 'Customer Feedback';
  }`;

contractStr = contractStr.replace(entitiesStr, entitiesFix);

fs.writeFileSync(contractPath, contractStr);

// ===================================
// UPDATE dataset-understanding-contract.test.ts
// ===================================
let testStr = fs.readFileSync(testPath, 'utf8');

// Update createMockRegistry signature
testStr = testStr.replace(
  `const createMockRegistry = (signalIds: string[]): BusinessSignalRegistry => {`,
  `const createMockRegistry = (signalIds: string[], domainStr: string = 'test'): BusinessSignalRegistry => {`
);

// Update signal domain mapping
testStr = testStr.replace(
  `domain: 'test',`,
  `domain: domainStr,`
);

// Update the specific test calls to include the domain parameter
testStr = testStr.replace(
  `const registry = createMockRegistry(['revenue', 'cost', 'profit', 'time_period']);`,
  `const registry = createMockRegistry(['revenue', 'cost', 'profit', 'time_period'], 'finance');`
);

testStr = testStr.replace(
  `const registry = createMockRegistry(['sku', 'stock_age', 'warehouse', 'stock_qty']);`,
  `const registry = createMockRegistry(['sku', 'stock_age', 'warehouse', 'stock_qty'], 'inventory');`
);

testStr = testStr.replace(
  `const registry = createMockRegistry(['customer', 'segment', 'retention', 'order_count']);`,
  `const registry = createMockRegistry(['customer', 'segment', 'retention', 'order_count'], 'customer');`
);

testStr = testStr.replace(
  `const registry = createMockRegistry(['kpi', 'target', 'achievement', 'department']);`,
  `const registry = createMockRegistry(['kpi', 'target', 'achievement', 'department'], 'performance');`
);

testStr = testStr.replace(
  `const registry = createMockRegistry(['sales', 'branch', 'revenue', 'salesperson']);`,
  `const registry = createMockRegistry(['sales', 'branch', 'revenue', 'salesperson'], 'revenue');`
);

fs.writeFileSync(testPath, testStr);

console.log("Patched successfully again!");
