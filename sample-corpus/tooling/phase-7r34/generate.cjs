#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '../../..');
const XLSX = require(path.join(ROOT, 'node_modules/.pnpm/xlsx@0.18.5/node_modules/xlsx/xlsx.js'));
const SCENARIO_PATH = path.join(__dirname, 'scenario-contract.json');
const POLICY_PATH = path.join(__dirname, 'evidence-policy.json');
const ANCHORS_PATH = path.join(__dirname, 'authentic-anchors.json');
const scenario = JSON.parse(fs.readFileSync(SCENARIO_PATH, 'utf8'));
const policy = JSON.parse(fs.readFileSync(POLICY_PATH, 'utf8'));
const anchorInventory = JSON.parse(fs.readFileSync(ANCHORS_PATH, 'utf8'));

const outputArg = process.argv.indexOf('--output');
const OUTPUT = outputArg >= 0 ? path.resolve(process.argv[outputArg + 1]) : path.join(ROOT, 'sample-corpus/versions/1.3.0');
const DERIVED = path.join(OUTPUT, 'derived');
const shaBuffer = value => crypto.createHash('sha256').update(value).digest('hex');
const shaFile = file => shaBuffer(fs.readFileSync(file));
const stableJson = value => JSON.stringify(value, null, 2) + '\n';
const fail = message => { throw new Error(message); };
const asNumber = value => {
  const number = Number(value);
  if (!Number.isFinite(number)) fail(`Expected finite number, received ${value}`);
  return number;
};

function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += ch;
  }
  if (field.length || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows.filter((values, index) => index === 0 || values.some(value => value !== ''));
}

function readCsv(relativePath) {
  const rows = parseCsv(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
  const headers = rows[0];
  return {
    headers,
    rows: rows.slice(1).map((values, index) => ({
      ...Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ''])),
      __sourceRowNumber: index + 2
    }))
  };
}

function repositoryPathFor(logicalPath) {
  const anchor = anchorInventory.anchors.find(item => item.path === logicalPath);
  if (!anchor) fail(`Missing anchor contract for ${logicalPath}`);
  return anchor.repositoryPath;
}

function readXlsx(relativePath, sheetName) {
  const workbook = XLSX.readFile(path.join(ROOT, relativePath), { raw: true, cellDates: false });
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: true, defval: '' });
  return rows.map((row, index) => ({ ...row, __sourceRowNumber: index + 2 }));
}

const csvCell = value => {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
function writeCsv(file, headers, rows) {
  const content = [headers.map(csvCell).join(','), ...rows.map(row => headers.map(header => csvCell(row[header])).join(','))].join('\n') + '\n';
  fs.writeFileSync(file, content, 'utf8');
}

const indexUnique = (rows, field, label) => {
  const map = new Map();
  for (const row of rows) {
    const key = String(row[field]);
    if (!key) fail(`${label} has blank ${field}`);
    if (map.has(key)) fail(`${label} has duplicate ${field}: ${key}`);
    map.set(key, row);
  }
  return map;
};
const sum = (rows, field) => rows.reduce((total, row) => total + asNumber(row[field]), 0);
const hashInt = value => parseInt(shaBuffer(`${scenario.deterministicGeneratorSeed}|${value}`).slice(0, 12), 16);
const keyOf = row => `${row.SKU}\u001f${row.Warehouse}`;
const sorted = map => [...map.entries()].sort(([a], [b]) => a.localeCompare(b));

function verifyAnchors() {
  for (const anchor of anchorInventory.anchors) {
    const absolute = path.join(ROOT, anchor.repositoryPath);
    if (!fs.existsSync(absolute)) fail(`Missing repository anchor ${anchor.repositoryPath}`);
    const actual = shaFile(absolute);
    if (actual !== anchor.sha256) fail(`Anchor hash mismatch ${anchor.repositoryPath}: ${actual}`);
  }
}

function loadPeriod(periodId) {
  const month = periodId === '2026-05' ? 'May' : 'June';
  const salesPath = `sample data/Sales_ERP_${month}_2026.xlsx`;
  const logisticsPath = `sample data/Logistics_ERP_${month}_2026.csv`;
  const accountingPath = `sample data/Accounting_ERP_${month}_2026.csv`;
  const sales = readXlsx(repositoryPathFor(salesPath), 'Sales');
  const logisticsFile = readCsv(repositoryPathFor(logisticsPath));
  const accountingFile = readCsv(repositoryPathFor(accountingPath));
  const anchors = {
    sales: anchorInventory.anchors.find(anchor => anchor.path === salesPath),
    logistics: anchorInventory.anchors.find(anchor => anchor.path === logisticsPath),
    accounting: anchorInventory.anchors.find(anchor => anchor.path === accountingPath)
  };
  if ([sales, logisticsFile.rows, accountingFile.rows].some(rows => rows.length !== 1500)) fail(`${periodId} anchor row count mismatch`);
  const salesByOrder = indexUnique(sales, 'OrderID', `${periodId} sales`);
  const logisticsByOrder = indexUnique(logisticsFile.rows, 'OrderID', `${periodId} logistics`);
  const accountingByOrder = indexUnique(accountingFile.rows, 'OrderID', `${periodId} accounting`);
  const joined = [];
  for (const [orderId, sale] of salesByOrder) {
    const logistics = logisticsByOrder.get(orderId), accounting = accountingByOrder.get(orderId);
    if (!logistics || !accounting) fail(`${periodId} missing exact OrderID relationship: ${orderId}`);
    if (asNumber(sale.Qty) !== asNumber(logistics.Qty) || asNumber(sale.Qty) !== asNumber(accounting.Qty)) fail(`${periodId} quantity mismatch: ${orderId}`);
    if (asNumber(sale.Revenue) !== asNumber(accounting.Revenue_Credit)) fail(`${periodId} revenue mismatch: ${orderId}`);
    if (String(sale.Product) !== String(logistics.Product) || String(sale.Product) !== String(accounting.Product)) fail(`${periodId} product mismatch: ${orderId}`);
    if (String(logistics.SKU) !== String(accounting.SKU)) fail(`${periodId} SKU mismatch: ${orderId}`);
    joined.push({ orderId, sale, logistics, accounting });
  }
  if (logisticsByOrder.size !== joined.length || accountingByOrder.size !== joined.length) fail(`${periodId} relationship set mismatch`);
  return { periodId, month, salesPath, logisticsPath, accountingPath, sales, logistics: logisticsFile.rows, accounting: accountingFile.rows, accountingHeaders: accountingFile.headers, anchors, joined };
}

function derivedAccounting(period) {
  const extraHeaders = ['ScenarioID', 'LegalEntityID', 'ScenarioCurrency', 'CurrencyScope', 'ReportingTimezone', 'EvidenceType', 'AuthenticSourcePath', 'AuthenticSourceSHA256', 'AuthenticSourceRowNumber', 'GenerationPolicyVersion'];
  const rows = period.accounting.map(row => {
    const clean = { ...row }; delete clean.__sourceRowNumber;
    return {
      ...clean,
      ScenarioID: scenario.scenarioId,
      LegalEntityID: scenario.legalEntityId,
      ScenarioCurrency: scenario.scenarioCurrency,
      CurrencyScope: 'all_declared_accounting_money_columns',
      ReportingTimezone: scenario.reportingTimezone,
      EvidenceType: scenario.evidenceType,
      AuthenticSourcePath: period.accountingPath,
      AuthenticSourceSHA256: period.anchors.accounting.sha256,
      AuthenticSourceRowNumber: row.__sourceRowNumber,
      GenerationPolicyVersion: scenario.generationPolicyVersion
    };
  });
  return { headers: [...period.accountingHeaders, ...extraHeaders], rows };
}

function groupSales(period) {
  const groups = new Map();
  for (const joined of period.joined) {
    const key = keyOf(joined.logistics);
    const existing = groups.get(key) || { SKU: joined.logistics.SKU, Product: joined.sale.Product, Category: joined.sale.Category, Brand: joined.sale.Brand, Warehouse: joined.logistics.Warehouse, sold: 0, orders: [] };
    if (existing.Product !== joined.sale.Product || existing.Category !== joined.sale.Category || existing.Brand !== joined.sale.Brand) fail(`Conflicting item metadata for ${key}`);
    existing.sold += asNumber(joined.sale.Qty);
    existing.orders.push(joined);
    groups.set(key, existing);
  }
  return groups;
}

function inventoryPeriod(period, previousSnapshot) {
  const grouped = groupSales(period);
  const keys = new Set([...grouped.keys(), ...(previousSnapshot ? previousSnapshot.keys() : [])]);
  const movements = [], snapshots = [], snapshotMap = new Map();
  for (const key of [...keys].sort()) {
    const current = grouped.get(key), previous = previousSnapshot?.get(key);
    const base = current || {
      SKU: previous.ItemID,
      Product: previous.Product,
      Category: previous.Category,
      Brand: previous.Brand,
      Warehouse: previous.WarehouseID
    };
    const sold = current?.sold || 0;
    const opening = previous ? previous.QuantityOnHand : sold + scenario.inventoryPolicy.openingBufferMinimum + hashInt(`${period.periodId}|${key}|opening`) % scenario.inventoryPolicy.openingBufferRange;
    const baseReceipt = sold > 0 ? scenario.inventoryPolicy.receiptBaseMinimum + hashInt(`${period.periodId}|${key}|receipt`) % scenario.inventoryPolicy.receiptBaseRange : 0;
    const closingBuffer = scenario.inventoryPolicy.minimumClosingBuffer + hashInt(`${period.periodId}|${key}|closing`) % scenario.inventoryPolicy.minimumClosingBufferRange;
    const received = sold > 0 ? Math.max(baseReceipt, sold - opening + closingBuffer) : 0;
    const customerReturns = scenario.inventoryPolicy.customerReturns;
    const supplierReturns = scenario.inventoryPolicy.supplierReturns;
    const damageAdjustments = scenario.inventoryPolicy.damageAdjustments;
    const closing = opening + received + customerReturns - sold - supplierReturns - damageAdjustments;
    if (closing < 0) fail(`Negative closing stock for ${period.periodId} ${key}`);
    const common = { ScenarioID: scenario.scenarioId, LegalEntityID: scenario.legalEntityId, ReportingPeriod: period.periodId, ItemID: base.SKU, Product: base.Product, Category: base.Category, Brand: base.Brand, WarehouseID: base.Warehouse, UOM: scenario.baseUom, EvidenceType: scenario.evidenceType, GenerationPolicyVersion: scenario.generationPolicyVersion };
    movements.push({ ...common, MovementID: `OPEN-${period.periodId}-${shaBuffer(key).slice(0,16)}`, MovementType: 'opening_balance', PostingDate: period.periodId === '2026-05' ? '2026-05-01' : '2026-06-01', QuantityDelta: opening, SourceOrderID: '', SourceShipmentID: '', AnchorSalesPath: '', AnchorSalesSHA256: '', AnchorSalesRowNumber: '', AnchorLogisticsPath: '', AnchorLogisticsSHA256: '', AnchorLogisticsRowNumber: '', ProvenanceRole: previous ? 'prior_snapshot_carry_forward' : 'scenario_generated_opening' });
    if (received > 0) movements.push({ ...common, MovementID: `RCPT-${period.periodId}-${shaBuffer(key).slice(0,16)}`, MovementType: 'purchase_receipt', PostingDate: period.periodId === '2026-05' ? '2026-05-05' : '2026-06-05', QuantityDelta: received, SourceOrderID: '', SourceShipmentID: '', AnchorSalesPath: '', AnchorSalesSHA256: '', AnchorSalesRowNumber: '', AnchorLogisticsPath: '', AnchorLogisticsSHA256: '', AnchorLogisticsRowNumber: '', ProvenanceRole: 'scenario_generated_replenishment' });
    for (const joined of current?.orders || []) movements.push({ ...common, MovementID: `ISSUE-${period.periodId}-${joined.orderId}`, MovementType: 'sales_issue', PostingDate: String(joined.sale.OrderDate).slice(0,10), QuantityDelta: -asNumber(joined.sale.Qty), SourceOrderID: joined.orderId, SourceShipmentID: joined.logistics.ShipmentID, AnchorSalesPath: period.salesPath, AnchorSalesSHA256: period.anchors.sales.sha256, AnchorSalesRowNumber: joined.sale.__sourceRowNumber, AnchorLogisticsPath: period.logisticsPath, AnchorLogisticsSHA256: period.anchors.logistics.sha256, AnchorLogisticsRowNumber: joined.logistics.__sourceRowNumber, ProvenanceRole: 'authentic_sales_quantity_issue' });
    const snapshot = { ...common, SnapshotID: `SNAP-${period.periodId}-${shaBuffer(key).slice(0,16)}`, AsOfDate: scenario.reportingPeriods.find(item => item.periodId === period.periodId).inventorySnapshotDate, OpeningQuantity: opening, ReceivedQuantity: received, CustomerReturnQuantity: customerReturns, SoldQuantity: sold, SupplierReturnQuantity: supplierReturns, DamageAdjustmentQuantity: damageAdjustments, QuantityOnHand: closing, SnapshotGrain: 'one_row_per_item_warehouse_as_of' };
    snapshots.push(snapshot); snapshotMap.set(key, snapshot);
  }
  const rank = { opening_balance: 0, purchase_receipt: 1, sales_issue: 2 };
  movements.sort((a, b) => rank[a.MovementType] - rank[b.MovementType] || a.ItemID.localeCompare(b.ItemID) || a.WarehouseID.localeCompare(b.WarehouseID) || a.MovementID.localeCompare(b.MovementID));
  snapshots.sort((a, b) => a.ItemID.localeCompare(b.ItemID) || a.WarehouseID.localeCompare(b.WarehouseID));
  return { movements, snapshots, snapshotMap };
}

function aggregatePerItem(snapshots) {
  const totals = new Map();
  for (const row of snapshots) totals.set(row.ItemID, (totals.get(row.ItemID) || 0) + asNumber(row.QuantityOnHand));
  return Object.fromEntries([...totals.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function main() {
  verifyAnchors();
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(DERIVED, { recursive: true });
  const may = loadPeriod('2026-05'), june = loadPeriod('2026-06');
  const accountingMay = derivedAccounting(may), accountingJune = derivedAccounting(june);
  const inventoryMay = inventoryPeriod(may, null), inventoryJune = inventoryPeriod(june, inventoryMay.snapshotMap);
  const movementHeaders = ['ScenarioID','LegalEntityID','MovementID','MovementType','PostingDate','ReportingPeriod','ItemID','Product','Category','Brand','WarehouseID','UOM','QuantityDelta','SourceOrderID','SourceShipmentID','AnchorSalesPath','AnchorSalesSHA256','AnchorSalesRowNumber','AnchorLogisticsPath','AnchorLogisticsSHA256','AnchorLogisticsRowNumber','ProvenanceRole','EvidenceType','GenerationPolicyVersion'];
  const snapshotHeaders = ['ScenarioID','LegalEntityID','SnapshotID','AsOfDate','ReportingPeriod','ItemID','Product','Category','Brand','WarehouseID','UOM','OpeningQuantity','ReceivedQuantity','CustomerReturnQuantity','SoldQuantity','SupplierReturnQuantity','DamageAdjustmentQuantity','QuantityOnHand','SnapshotGrain','EvidenceType','GenerationPolicyVersion'];
  const outputs = [
    ['derived-accounting-may-vnd.csv', accountingMay.headers, accountingMay.rows],
    ['derived-accounting-june-vnd.csv', accountingJune.headers, accountingJune.rows],
    ['derived-inventory-movements-may.csv', movementHeaders, inventoryMay.movements],
    ['derived-inventory-movements-june.csv', movementHeaders, inventoryJune.movements],
    ['derived-inventory-snapshot-may.csv', snapshotHeaders, inventoryMay.snapshots],
    ['derived-inventory-snapshot-june.csv', snapshotHeaders, inventoryJune.snapshots]
  ];
  for (const [name, headers, rows] of outputs) writeCsv(path.join(DERIVED, name), headers, rows);
  const sourceIds = {
    'derived-accounting-may-vnd.csv': 'derived.accounting_may_vnd',
    'derived-accounting-june-vnd.csv': 'derived.accounting_june_vnd',
    'derived-inventory-movements-may.csv': 'derived.inventory_movements_may',
    'derived-inventory-movements-june.csv': 'derived.inventory_movements_june',
    'derived-inventory-snapshot-may.csv': 'derived.inventory_snapshot_may',
    'derived-inventory-snapshot-june.csv': 'derived.inventory_snapshot_june'
  };
  const outputFiles = outputs.map(([name,,rows]) => ({ id: sourceIds[name], path: `derived/${name}`, sha256: shaFile(path.join(DERIVED, name)), rowCount: rows.length, evidenceType: scenario.evidenceType }));
  const truth = {
    may: { revenue: sum(may.sales, 'Revenue'), grossProfit: may.accounting.reduce((total,row)=>total+asNumber(row.Revenue_Credit)-asNumber(row.COGS_Debit),0), deliveryCount: new Set(may.logistics.map(row=>row.ShipmentID)).size, inventoryOnHand: inventoryMay.snapshots.reduce((total,row)=>total+row.QuantityOnHand,0), perItemInventoryBalances: aggregatePerItem(inventoryMay.snapshots) },
    june: { revenue: sum(june.sales, 'Revenue'), grossProfit: june.accounting.reduce((total,row)=>total+asNumber(row.Revenue_Credit)-asNumber(row.COGS_Debit),0), deliveryCount: new Set(june.logistics.map(row=>row.ShipmentID)).size, inventoryOnHand: inventoryJune.snapshots.reduce((total,row)=>total+row.QuantityOnHand,0), perItemInventoryBalances: aggregatePerItem(inventoryJune.snapshots) }
  };
  const relationshipManifest = {
    schemaVersion:'lightbi.phase7r34-cross-file-relationships.v1', scenarioId:scenario.scenarioId,
    relationships:[
      { period:'2026-05', from:'sales_order.OrderID', to:'shipment.OrderID', cardinality:'one_to_one', count:1500, anchorBound:true },
      { period:'2026-05', from:'sales_order.OrderID', to:'accounting_entry.OrderID', cardinality:'one_to_one', count:1500, anchorBound:true },
      { period:'2026-05', from:'sales_order.OrderID', to:'inventory_issue.SourceOrderID', cardinality:'one_to_one', count:1500, anchorBound:true },
      { period:'2026-06', from:'sales_order.OrderID', to:'shipment.OrderID', cardinality:'one_to_one', count:1500, anchorBound:true },
      { period:'2026-06', from:'sales_order.OrderID', to:'accounting_entry.OrderID', cardinality:'one_to_one', count:1500, anchorBound:true },
      { period:'2026-06', from:'sales_order.OrderID', to:'inventory_issue.SourceOrderID', cardinality:'one_to_one', count:1500, anchorBound:true },
      { period:'2026-05', from:'inventory_issue.ItemID+WarehouseID', to:'inventory_snapshot.ItemID+WarehouseID+AsOfDate', cardinality:'many_to_one', snapshotRows:inventoryMay.snapshots.length, anchorOrScenarioEvent:true },
      { period:'2026-06', from:'inventory_issue.ItemID+WarehouseID', to:'inventory_snapshot.ItemID+WarehouseID+AsOfDate', cardinality:'many_to_one', snapshotRows:inventoryJune.snapshots.length, anchorOrScenarioEvent:true },
      { period:'2026-06', from:'may_snapshot.ItemID+WarehouseID', to:'june_opening.ItemID+WarehouseID', cardinality:'one_to_one_for_carry_forward_pairs', count:inventoryMay.snapshots.length, scenarioGenerated:true },
      { period:'both', from:'scenario_contract.scenarioCurrency', to:'derived_accounting.ScenarioCurrency', cardinality:'one_to_many', value:scenario.scenarioCurrency, scenarioGenerated:true }
    ],
    relationshipKeys:{order:'OrderID',shipment:'ShipmentID',item:'ItemID',warehouse:'WarehouseID',period:'ReportingPeriod',snapshot:['ItemID','WarehouseID','AsOfDate'],currency:'ScenarioCurrency'}
  };
  fs.writeFileSync(path.join(OUTPUT,'cross-file-relationship-manifest.json'),stableJson(relationshipManifest));
  const provenance = {
    schemaVersion:'lightbi.phase7r34-generation-provenance.v1', generator:{path:'sample-corpus/tooling/phase-7r34/generate.cjs',version:scenario.generationPolicyVersion,sha256:shaFile(__filename),seed:scenario.deterministicGeneratorSeed},
    evidencePolicy:{path:'sample-corpus/tooling/phase-7r34/evidence-policy.json',sha256:shaFile(POLICY_PATH)},scenarioContract:{path:'sample-corpus/tooling/phase-7r34/scenario-contract.json',sha256:shaFile(SCENARIO_PATH)},anchorInventory:{path:'sample-corpus/tooling/phase-7r34/authentic-anchors.json',sha256:shaFile(ANCHORS_PATH)},
    anchors:anchorInventory.anchors.map(anchor=>({path:anchor.path,repositoryPath:anchor.repositoryPath,sha256:anchor.sha256,rowCount:anchor.rowCount,evidenceType:'repository_frozen_operational_anchor',corpus12SourceSystem:anchor.corpus12SourceSystem})),outputs:outputFiles,
    transformations:{accounting:'Original columns and values preserved; explicit scenario/provenance columns appended.',inventoryIssues:'One issue per authentic sales order using exact sold Qty and OrderID, joined to exact shipment SKU and warehouse.',openingAndReceipts:'Deterministically generated from scenario seed, period and item/warehouse key.',snapshots:'Deterministic ledger equation with explicit as-of date and one row per item/warehouse/as-of.'},externallyObservedTruthClaim:false
  };
  fs.writeFileSync(path.join(OUTPUT,'generation-provenance.json'),stableJson(provenance));
  const cases = [
    {id:'derived.accounting_may_vnd',file:'derived/derived-accounting-may-vnd.csv',expectedGrain:{coarseGrain:'transaction',rowEntity:'accounting_entry',parentEntity:'sales_order',candidateKeys:[['OrderID']]},expectedMappings:{OrderID:'order',InvoiceDate:'time_period',Revenue_Credit:'revenue',COGS_Debit:'total_cost',ScenarioCurrency:'currency'},expectedDomainState:'finance_profitability_candidate',expectedMetricFamily:'gross_profit',frozenMetadata:{currency:'VND',period:'2026-05'},truth:{revenue:truth.may.revenue,grossProfit:truth.may.grossProfit}},
    {id:'derived.accounting_june_vnd',file:'derived/derived-accounting-june-vnd.csv',expectedGrain:{coarseGrain:'transaction',rowEntity:'accounting_entry',parentEntity:'sales_order',candidateKeys:[['OrderID']]},expectedMappings:{OrderID:'order',InvoiceDate:'time_period',Revenue_Credit:'revenue',COGS_Debit:'total_cost',ScenarioCurrency:'currency'},expectedDomainState:'finance_profitability_candidate',expectedMetricFamily:'gross_profit',frozenMetadata:{currency:'VND',period:'2026-06'},truth:{revenue:truth.june.revenue,grossProfit:truth.june.grossProfit}},
    {id:'derived.inventory_movements_may',file:'derived/derived-inventory-movements-may.csv',expectedGrain:{coarseGrain:'event',rowEntity:'inventory_movement',parentEntity:'item_warehouse_period',candidateKeys:[['MovementID']]},expectedMappings:{MovementType:'movement_type',ItemID:'sku',WarehouseID:'warehouse',UOM:'uom',QuantityDelta:'stock_movement',PostingDate:'time_period'},expectedDomainState:'inventory_movement_candidate',expectedMetricFamily:'inventory_movement',frozenMetadata:{uom:'EA',period:'2026-05'}},
    {id:'derived.inventory_movements_june',file:'derived/derived-inventory-movements-june.csv',expectedGrain:{coarseGrain:'event',rowEntity:'inventory_movement',parentEntity:'item_warehouse_period',candidateKeys:[['MovementID']]},expectedMappings:{MovementType:'movement_type',ItemID:'sku',WarehouseID:'warehouse',UOM:'uom',QuantityDelta:'stock_movement',PostingDate:'time_period'},expectedDomainState:'inventory_movement_candidate',expectedMetricFamily:'inventory_movement',frozenMetadata:{uom:'EA',period:'2026-06'}},
    {id:'derived.inventory_snapshot_may',file:'derived/derived-inventory-snapshot-may.csv',expectedGrain:{coarseGrain:'snapshot',rowEntity:'item_warehouse_snapshot',parentEntity:'inventory_snapshot',candidateKeys:[['ItemID','WarehouseID','AsOfDate']]},expectedMappings:{ItemID:'sku',WarehouseID:'warehouse',UOM:'uom',QuantityOnHand:'stock_qty',AsOfDate:'time_period'},expectedDomainState:'inventory_snapshot_candidate',expectedMetricFamily:'inventory_on_hand',frozenMetadata:{uom:'EA',asOfDate:'2026-05-31'},truth:{inventoryOnHand:truth.may.inventoryOnHand,perItemInventoryBalances:truth.may.perItemInventoryBalances}},
    {id:'derived.inventory_snapshot_june',file:'derived/derived-inventory-snapshot-june.csv',expectedGrain:{coarseGrain:'snapshot',rowEntity:'item_warehouse_snapshot',parentEntity:'inventory_snapshot',candidateKeys:[['ItemID','WarehouseID','AsOfDate']]},expectedMappings:{ItemID:'sku',WarehouseID:'warehouse',UOM:'uom',QuantityOnHand:'stock_qty',AsOfDate:'time_period'},expectedDomainState:'inventory_snapshot_candidate',expectedMetricFamily:'inventory_on_hand',frozenMetadata:{uom:'EA',asOfDate:'2026-06-30'},truth:{inventoryOnHand:truth.june.inventoryOnHand,perItemInventoryBalances:truth.june.perItemInventoryBalances}}
  ].map(item=>({...item,evidenceType:scenario.evidenceType,releaseGateEligibility:{mappingPrecision:false,signalRecall:false,ambiguityRate:false,grainDiscovery:false,domainActivation:false,metricArithmetic:true,runtimeGuards:true,crossFileConsistency:true,familyCoverage:true},sha256:outputFiles.find(output=>output.path===item.file).sha256}));
  const baseGroundTruth = ['adversarial-dirty.json','finance-accounting.json','inventory.json','multi-file.json','operations-delivery.json','revenue-sales.json'].map(name=>({path:`sample-corpus/ground-truth/${name}`,sha256:shaFile(path.join(ROOT,'sample-corpus/ground-truth',name))}));
  const inheritedCases = baseGroundTruth.flatMap(file => {
    const groundTruth = JSON.parse(fs.readFileSync(path.join(ROOT, file.path), 'utf8'));
    return groundTruth.samples.map(sample => ({
      id: sample.id,
      group: sample.group,
      corpus12Provenance: sample.provenance,
      sources: sample.sources.map(source => ({
        path: source.path,
        sheet: source.sheet,
        sha256: source.sha256,
        evidenceType: /synthetic|sample/i.test(sample.provenance.sourceSystem)
          ? 'fully_synthetic_fixture'
          : 'authentic_operational_evidence'
      }))
    }));
  }).sort((a, b) => a.id.localeCompare(b.id));
  const manifest = {
    schemaVersion:'lightbi.acceptance-corpus.v1.3',corpusVersion:'1.3.0',scenarioId:scenario.scenarioId,
    inheritance:{baseCorpusVersion:'1.2.0',baseManifestPath:'sample-corpus/manifest.json',baseManifestSha256:shaFile(path.join(ROOT,'sample-corpus/manifest.json')),includeAllOriginalCases:true,baseGroundTruthFiles:baseGroundTruth},
    evidencePolicy:{path:'sample-corpus/tooling/phase-7r34/evidence-policy.json',sha256:shaFile(POLICY_PATH)},scenarioContract:{path:'sample-corpus/tooling/phase-7r34/scenario-contract.json',sha256:shaFile(SCENARIO_PATH)},generator:{path:'sample-corpus/tooling/phase-7r34/generate.cjs',version:scenario.generationPolicyVersion,seed:scenario.deterministicGeneratorSeed,sha256:shaFile(__filename)},
    inheritedCases,
    sources:[...anchorInventory.anchors.map(anchor=>({id:anchor.anchorId,path:anchor.path,repositoryPath:anchor.repositoryPath,sha256:anchor.sha256,evidenceType:'authentic_anchored_semi_synthetic_evidence',role:'immutable_repository_anchor',corpus12SourceSystem:anchor.corpus12SourceSystem})),...outputFiles],derivedCases:cases,expectedRelationships:relationshipManifest.relationships,explicitMetadata:{currency:{value:scenario.scenarioCurrency,basis:'declared_scenario_metadata'},uom:{value:scenario.baseUom,basis:'declared_scenario_metadata'},inventoryAsOf:['2026-05-31','2026-06-30']},independentlyRecalculableTruths:truth,releaseReporting:{separateAuthenticAndSemiSynthetic:true,externallyObservedTruthClaim:false}
  };
  fs.writeFileSync(path.join(OUTPUT,'corpus-manifest.json'),stableJson(manifest));
  const result={output:OUTPUT,manifestSha256:shaFile(path.join(OUTPUT,'corpus-manifest.json')),outputFiles:[...outputFiles,{path:'cross-file-relationship-manifest.json',sha256:shaFile(path.join(OUTPUT,'cross-file-relationship-manifest.json'))},{path:'generation-provenance.json',sha256:shaFile(path.join(OUTPUT,'generation-provenance.json'))},{path:'corpus-manifest.json',sha256:shaFile(path.join(OUTPUT,'corpus-manifest.json'))}],truth};
  process.stdout.write(stableJson(result));
}

main();
