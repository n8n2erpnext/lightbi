import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import type { DatasetFamily } from './batch-inspection';
import { createBusinessFusionOverview, createBusinessFusionVirtualDataset } from './business-fusion-overview';
import type { SourceInspectionResult, SourceType } from './source-preflight';
import { createUnderstandingCoreInputFromSource } from './understanding-core/source-input';
import { createUnderstandingCoreResult } from './understanding-core/question-engine';
import { adaptCoreToUnderstandingNext } from './understanding-core/next-adapter';

function readRows(path: string): Record<string, unknown>[] {
  const workbook = XLSX.readFile(path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null }).map(row => {
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key.replace(/^\uFEFF/, ''), value])
    );
  });
}

function createFamily(id: string, name: string, files: Array<{ name: string; path: string; sourceType: SourceType }>): DatasetFamily {
  const parsed = files.map(item => {
    const rows = readRows(item.path);
    const columns = Object.keys(rows[0] ?? {});
    const result: SourceInspectionResult = {
      status: 'accessible',
      sourceType: item.sourceType,
      label: item.name,
      normalizedUrl: item.path,
      metadata: {
        name: item.name,
        rows_count: rows.length,
        columns,
        preview_rows: rows.slice(0, 100),
        analysis_rows: rows
      }
    };

    return {
      file: new File([''], item.name),
      result,
      rows,
      columns
    };
  });

  return {
    id,
    name,
    schemaFingerprint: id,
    totalRows: parsed.reduce((sum, item) => sum + item.rows.length, 0),
    columns: parsed[0]?.columns ?? [],
    profiles: {},
    files: parsed.map(({ file, result }) => ({ file, result }))
  };
}

describe('business fusion overview', () => {
  it('combines sales, accounting, and logistics reports into one cross-domain BA overview', () => {
    const families: DatasetFamily[] = [
      createFamily('sales_reports', 'Sales ERP Reports', [
        { name: 'Sales_ERP_May_2026.xlsx', path: '../../sample data/Sales_ERP_May_2026.xlsx', sourceType: 'local_xlsx' },
        { name: 'Sales_ERP_June_2026.xlsx', path: '../../sample data/Sales_ERP_June_2026.xlsx', sourceType: 'local_xlsx' }
      ]),
      createFamily('accounting_reports', 'Accounting ERP Reports', [
        { name: 'Accounting_ERP_May_2026.csv', path: '../../sample data/Accounting_ERP_May_2026.csv', sourceType: 'local_csv' },
        { name: 'Accounting_ERP_June_2026.csv', path: '../../sample data/Accounting_ERP_June_2026.csv', sourceType: 'local_csv' }
      ]),
      createFamily('logistics_reports', 'Logistics ERP Reports', [
        { name: 'Logistics_ERP_May_2026.csv', path: '../../sample data/Logistics_ERP_May_2026.csv', sourceType: 'local_csv' },
        { name: 'Logistics_ERP_June_2026.csv', path: '../../sample data/Logistics_ERP_June_2026.csv', sourceType: 'local_csv' }
      ])
    ];

    const overview = createBusinessFusionOverview(families);

    expect(overview).not.toBeNull();
    expect(overview?.periodLabels).toEqual(['2026-05', '2026-06']);
    expect(overview?.sources.map(source => source.role)).toEqual(expect.arrayContaining(['sales', 'accounting', 'logistics']));
    expect(overview?.objectKeys.map(match => match.key)).toEqual(expect.arrayContaining(['order', 'sku', 'product', 'category', 'store']));
    expect(overview?.metrics.map(metric => metric.metricId)).toEqual(expect.arrayContaining(['revenue', 'profit', 'quantity', 'delivery_fee']));
    expect(overview?.topGrowthDrivers.length).toBeGreaterThan(0);
    expect(overview?.topGrowthDrivers.length).toBeLessThanOrEqual(10);
    expect(overview?.topDeclineDrivers.length).toBeGreaterThan(0);
    expect(overview?.topDeclineDrivers.length).toBeLessThanOrEqual(10);
    expect(overview?.topProfitDrivers.length).toBeGreaterThan(0);
    expect(overview?.topProfitDrivers.length).toBeLessThanOrEqual(10);
    expect(overview?.topProfitDrivers[0]?.currentValue).toBeGreaterThanOrEqual(overview?.topProfitDrivers[1]?.currentValue ?? 0);
    expect(overview?.crossChecks.length).toBeGreaterThan(0);
    expect(overview?.reconciliationChecks.length).toBeGreaterThan(0);
    expect(overview?.narrativeSections.map(section => section.id)).toEqual(expect.arrayContaining([
      'executive_answer',
      'where_changed',
      'profitability_answer',
      'operations_answer',
      'decision_caveat'
    ]));
    expect(overview?.narrativeSections.find(section => section.id === 'where_changed')?.bullets.join(' ')).toContain('Growth #1');
    expect(overview?.narrativeSections.find(section => section.id === 'where_changed')?.bullets.join(' ')).toContain('Decline #1');
    expect(overview?.narrativeSections.find(section => section.id === 'profitability_answer')?.bullets.join(' ')).toContain('Profit #1');
    expect((overview?.riskSignals.length ?? 0) + (overview?.crossChecks.length ?? 0)).toBeGreaterThan(0);
    expect(overview?.caveats.join(' ')).not.toContain('Profit field was not detected');
    expect(overview?.readinessScore).toBeGreaterThanOrEqual(75);

    const fusionDataset = createBusinessFusionVirtualDataset(families);
    expect(fusionDataset).not.toBeNull();
    expect(fusionDataset?.objectKey?.key).toBeTruthy();
    expect(fusionDataset?.columns).toEqual(expect.arrayContaining([
      'period',
      'fusion_row_id',
      'object_key',
      'sales_revenue',
      'accounting_revenue',
      'gross_profit',
      'logistics_quantity',
      'delivery_fee',
      'revenue_gap',
      'profit_margin',
      'product',
      'store',
      'payment',
      'carrier',
      'status',
      'delivery_status',
      'invoice_total',
      'ar_debit',
      'total_cost',
      'discount_amount'
    ]));
    expect(fusionDataset?.rows.length).toBeGreaterThan(0);
    expect(new Set(fusionDataset?.rows.map(row => row.period))).toEqual(new Set(['2026-05', '2026-06']));
    expect(fusionDataset?.rows.some(row => Number(row.accounting_revenue) > 0 && Number(row.gross_profit) > 0)).toBe(true);
    expect(fusionDataset?.rows.some(row => Number(row.logistics_quantity) > 0)).toBe(true);
    expect(fusionDataset?.rows.some(row => String(row.product ?? '').trim() !== '')).toBe(true);
    expect(fusionDataset?.rows.some(row => String(row.store ?? '').trim() !== '')).toBe(true);
    expect(fusionDataset?.rows.some(row => String(row.payment ?? '').trim() !== '')).toBe(true);
    expect(fusionDataset?.rows.some(row => String(row.carrier ?? '').trim() !== '')).toBe(true);
    expect(fusionDataset?.rows.some(row => String(row.delivery_status ?? '').trim() !== '')).toBe(true);
    expect(fusionDataset?.rows.some(row => Number(row.invoice_total) > 0 && Number(row.ar_debit) > 0)).toBe(true);
    const evidenceRow = fusionDataset?.rows.find(row => {
      const rowId = String(row.fusion_row_id ?? '');
      return (fusionDataset?.evidenceBundles[rowId]?.rows.length ?? 0) > 1;
    });
    expect(evidenceRow).toBeTruthy();
    const evidenceBundle = fusionDataset?.evidenceBundles[String(evidenceRow?.fusion_row_id ?? '')];
    expect(evidenceBundle?.rows.map(row => row.role)).toEqual(expect.arrayContaining(['sales', 'accounting', 'logistics']));
    expect(evidenceBundle?.rows.every(row => row.period === evidenceBundle.period)).toBe(true);

    const coreInput = createUnderstandingCoreInputFromSource({
      kind: 'local_file',
      fileNames: families.flatMap(family => family.files.map(item => item.file.name)),
      label: fusionDataset!.name,
      columns: fusionDataset!.understandingColumns,
      rows: fusionDataset!.understandingRows,
      columnProfiles: fusionDataset!.understandingProfiles,
      sourceRowCount: fusionDataset!.understandingSourceRowCount
    });
    const understanding = adaptCoreToUnderstandingNext(createUnderstandingCoreResult(coreInput));
    const readyLabels = understanding.availableActions.map(action => action.label);

    expect(understanding.availableActions.length).toBeGreaterThan(2);
    expect(readyLabels).toEqual(expect.arrayContaining([
      'Money over time',
      'Profit or margin performance',
      'Money by location',
      'Stock movement and quantity flow',
      'Value by item',
      'Payment profitability and receivable mix',
      'Carrier cost impact',
      'Delivery completion mix'
    ]));
  });
});
