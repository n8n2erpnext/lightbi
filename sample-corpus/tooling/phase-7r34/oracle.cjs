#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '../../..');
const XLSX = require(path.join(ROOT, 'node_modules/.pnpm/xlsx@0.18.5/node_modules/xlsx/xlsx.js'));
const scenario = JSON.parse(fs.readFileSync(path.join(__dirname, 'scenario-contract.json'), 'utf8'));
const anchorInventory = JSON.parse(fs.readFileSync(path.join(__dirname, 'authentic-anchors.json'), 'utf8'));
const corpusArg = process.argv.indexOf('--corpus-dir');
const outputArg = process.argv.indexOf('--output');
const CORPUS = corpusArg >= 0 ? path.resolve(process.argv[corpusArg + 1]) : path.join(ROOT, 'sample-corpus/versions/1.3.0');
const shaFile = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const number = value => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Non-numeric oracle value: ${value}`);
  return parsed;
};

function csvRows(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const matrix = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell.replace(/\r$/, '')); matrix.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); matrix.push(row); }
  const headers = matrix.shift();
  return matrix.filter(values => values.some(Boolean)).map((values, index) => ({ ...Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ''])), __rowNumber: index + 2 }));
}

const repositoryPathFor = logicalPath => {
  const anchor = anchorInventory.anchors.find(item => item.path === logicalPath);
  if (!anchor) throw new Error(`Missing anchor contract for ${logicalPath}`);
  return path.join(ROOT, anchor.repositoryPath);
};
function salesRows(month) {
  const workbook = XLSX.readFile(repositoryPathFor(`sample data/Sales_ERP_${month}_2026.xlsx`), { raw: true, cellDates: false });
  return XLSX.utils.sheet_to_json(workbook.Sheets.Sales, { raw: true, defval: '' });
}
const sourceCsv = (type, month) => csvRows(repositoryPathFor(`sample data/${type}_ERP_${month}_2026.csv`));
const derivedCsv = name => csvRows(path.join(CORPUS, 'derived', name));
const unique = (rows, field) => new Set(rows.map(row => String(row[field])).filter(Boolean));
const sum = (rows, field) => rows.reduce((total, row) => total + number(row[field]), 0);
const duplicateCount = (rows, key) => rows.length - new Set(rows.map(key)).size;
const aggregate = (rows, key, value) => {
  const map = new Map();
  for (const row of rows) map.set(key(row), (map.get(key(row)) || 0) + value(row));
  return map;
};
const sortedObject = map => Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));

function periodOracle(periodId, month) {
  const sales = salesRows(month);
  const logistics = sourceCsv('Logistics', month);
  const authenticAccounting = sourceCsv('Accounting', month);
  const derivedAccounting = derivedCsv(`derived-accounting-${month.toLowerCase()}-vnd.csv`);
  const movements = derivedCsv(`derived-inventory-movements-${month.toLowerCase()}.csv`);
  const snapshots = derivedCsv(`derived-inventory-snapshot-${month.toLowerCase()}.csv`);
  const salesByOrder = new Map(sales.map(row => [String(row.OrderID), row]));
  const logisticsByOrder = new Map(logistics.map(row => [String(row.OrderID), row]));
  const accountingByOrder = new Map(authenticAccounting.map(row => [String(row.OrderID), row]));
  const derivedAccountingByOrder = new Map(derivedAccounting.map(row => [String(row.OrderID), row]));
  const issues = movements.filter(row => row.MovementType === 'sales_issue');
  const issuesByOrder = new Map(issues.map(row => [String(row.SourceOrderID), row]));
  const orderSetExact = [logisticsByOrder, accountingByOrder, derivedAccountingByOrder, issuesByOrder].every(map => map.size === salesByOrder.size && [...salesByOrder.keys()].every(key => map.has(key)));
  let preservedAccountingRows = 0, issueRowsReconciled = 0;
  for (const [orderId, sale] of salesByOrder) {
    const sourceAccounting = accountingByOrder.get(orderId), derived = derivedAccountingByOrder.get(orderId), issue = issuesByOrder.get(orderId), shipment = logisticsByOrder.get(orderId);
    const accountingFields = ['OrderID','InvoiceDate','Revenue_Credit','COGS_Debit','NetRevenue','InvoiceTotal','TotalCost','GrossProfit'];
    if (sourceAccounting && derived && accountingFields.every(field => String(sourceAccounting[field]) === String(derived[field]))) preservedAccountingRows += 1;
    if (issue && shipment && number(issue.QuantityDelta) === -number(sale.Qty) && issue.SourceShipmentID === shipment.ShipmentID && issue.ItemID === shipment.SKU && issue.WarehouseID === shipment.Warehouse) issueRowsReconciled += 1;
  }
  const snapshotKey = row => `${row.ItemID}\u001f${row.WarehouseID}\u001f${row.AsOfDate}`;
  const movementKey = row => `${row.ItemID}\u001f${row.WarehouseID}`;
  const movementBalances = aggregate(movements, movementKey, row => number(row.QuantityDelta));
  let equationMatches = 0, movementMatches = 0, nonnegative = 0;
  for (const row of snapshots) {
    const equation = number(row.OpeningQuantity) + number(row.ReceivedQuantity) + number(row.CustomerReturnQuantity) - number(row.SoldQuantity) - number(row.SupplierReturnQuantity) - number(row.DamageAdjustmentQuantity);
    if (equation === number(row.QuantityOnHand)) equationMatches += 1;
    if (movementBalances.get(movementKey(row)) === number(row.QuantityOnHand)) movementMatches += 1;
    if (number(row.QuantityOnHand) >= 0) nonnegative += 1;
  }
  const perItem = aggregate(snapshots, row => row.ItemID, row => number(row.QuantityOnHand));
  const itemWarehouseInventoryBalances = snapshots.map(row => ({
    itemId: String(row.ItemID),
    warehouseId: String(row.WarehouseID),
    asOfDate: String(row.AsOfDate),
    uom: String(row.UOM),
    quantityOnHand: number(row.QuantityOnHand)
  })).sort((left, right) => `${left.itemId}\u001f${left.warehouseId}\u001f${left.asOfDate}`.localeCompare(`${right.itemId}\u001f${right.warehouseId}\u001f${right.asOfDate}`));
  return {
    periodId,
    metrics: {
      revenue: sum(sales, 'Revenue'),
      grossProfit: derivedAccounting.reduce((total, row) => total + number(row.Revenue_Credit) - number(row.COGS_Debit), 0),
      deliveryCount: unique(logistics, 'ShipmentID').size,
      inventoryOnHand: sum(snapshots, 'QuantityOnHand'),
      perItemInventoryBalances: sortedObject(perItem),
      itemWarehouseInventoryBalances
    },
    identities: {
      salesRows: sales.length,
      uniqueOrders: unique(sales, 'OrderID').size,
      uniqueShipments: unique(logistics, 'ShipmentID').size,
      duplicateSalesOrders: duplicateCount(sales, row => row.OrderID),
      duplicateShipments: duplicateCount(logistics, row => row.ShipmentID),
      duplicateAccountingOrders: duplicateCount(authenticAccounting, row => row.OrderID),
      duplicateDerivedAccountingOrders: duplicateCount(derivedAccounting, row => row.OrderID),
      duplicateInventoryIssues: duplicateCount(issues, row => row.SourceOrderID),
      duplicateSnapshotKeys: duplicateCount(snapshots, snapshotKey)
    },
    relationships: {
      orderSetExact,
      preservedAccountingRows,
      issueRowsReconciled,
      expectedRows: sales.length
    },
    inventory: {
      movementRows: movements.length,
      salesIssueRows: issues.length,
      snapshotRows: snapshots.length,
      equationMatches,
      movementBalanceMatches: movementMatches,
      nonnegativeRows: nonnegative,
      asOfValues: [...unique(snapshots, 'AsOfDate')].sort(),
      currencyValues: [...unique(derivedAccounting, 'ScenarioCurrency')].sort(),
      uomValues: [...unique([...movements, ...snapshots], 'UOM')].sort()
    },
    hashes: {
      derivedAccounting: shaFile(path.join(CORPUS, 'derived', `derived-accounting-${month.toLowerCase()}-vnd.csv`)),
      inventoryMovements: shaFile(path.join(CORPUS, 'derived', `derived-inventory-movements-${month.toLowerCase()}.csv`)),
      inventorySnapshot: shaFile(path.join(CORPUS, 'derived', `derived-inventory-snapshot-${month.toLowerCase()}.csv`))
    }
  };
}

function main() {
  const may = periodOracle('2026-05', 'May'), june = periodOracle('2026-06', 'June');
  const maySnapshots = derivedCsv('derived-inventory-snapshot-may.csv');
  const juneSnapshots = derivedCsv('derived-inventory-snapshot-june.csv');
  const juneMovements = derivedCsv('derived-inventory-movements-june.csv');
  const mayByKey = new Map(maySnapshots.map(row => [`${row.ItemID}\u001f${row.WarehouseID}`, row]));
  const juneOpenings = new Map(juneMovements.filter(row => row.MovementType === 'opening_balance').map(row => [`${row.ItemID}\u001f${row.WarehouseID}`, row]));
  let continuityMatches = 0;
  for (const [key, row] of mayByKey) if (number(juneOpenings.get(key)?.QuantityDelta) === number(row.QuantityOnHand)) continuityMatches += 1;
  const result = {
    schemaVersion:'lightbi.phase7r34-independent-oracle-results.v1',
    scenarioId:scenario.scenarioId,
    oracle:{path:'sample-corpus/tooling/phase-7r34/oracle.cjs',sha256:shaFile(__filename),importsLightBI:false,readsExpectedManifestValues:false},
    periods:{may,june},
    crossPeriod:{maySnapshotPairs:mayByKey.size,juneOpeningContinuityMatches:continuityMatches,allMayPairsCarriedForward:continuityMatches===mayByKey.size},
    consistency:{currencyExpected:scenario.scenarioCurrency,currencyConsistent:[may,june].every(item=>item.inventory.currencyValues.length===1&&item.inventory.currencyValues[0]===scenario.scenarioCurrency),uomExpected:scenario.baseUom,uomConsistent:[may,june].every(item=>item.inventory.uomValues.length===1&&item.inventory.uomValues[0]===scenario.baseUom),allRelationshipsExact:[may,june].every(item=>item.relationships.orderSetExact&&item.relationships.preservedAccountingRows===item.relationships.expectedRows&&item.relationships.issueRowsReconciled===item.relationships.expectedRows),allInventoryEquationsExact:[may,june].every(item=>item.inventory.equationMatches===item.inventory.snapshotRows&&item.inventory.movementBalanceMatches===item.inventory.snapshotRows&&item.inventory.nonnegativeRows===item.inventory.snapshotRows)},
    manifestSha256:shaFile(path.join(CORPUS,'corpus-manifest.json')),
    corpusDirectoryHash:crypto.createHash('sha256').update(['corpus-manifest.json','cross-file-relationship-manifest.json','generation-provenance.json',...fs.readdirSync(path.join(CORPUS,'derived')).sort().map(name=>`derived/${name}`)].map(relative=>`${relative}:${shaFile(path.join(CORPUS,relative))}`).join('\n')).digest('hex')
  };
  const text = JSON.stringify(result, null, 2) + '\n';
  if (outputArg >= 0) fs.writeFileSync(path.resolve(process.argv[outputArg + 1]), text);
  else process.stdout.write(text);
}

main();
