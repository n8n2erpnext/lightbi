import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { createAnalysisWorkbookPlan, createExcelAnalysisWorkbook } from './analysis-workbook';

const evidence = [
  { sourceName: 'sales-2026-05.xlsx', role: 'sales', period: '2026-05', sourceRowCount: 2, rows: [{ OrderID: 'A-1', Revenue: 100 }, { OrderID: 'A-2', Revenue: 120 }] },
  { sourceName: 'accounting-2026-05.xlsx', role: 'accounting', period: '2026-05', sourceRowCount: 2, rows: [{ OrderID: 'A-1', Cost: 60 }, { OrderID: 'A-2', Cost: 70 }] },
];

describe('Excel Analysis Workbook', () => {
  it('packages governed metric results while keeping multi-source evidence separate', () => {
    const plan = createAnalysisWorkbookPlan({
      title: 'Profitability', perspectiveId: 'profitability', sourceCount: 2,
      summaryRows: [{ reporting_period: '2026-05', gross_profit: 90 }],
      evidenceSources: evidence,
      selectedScope: { period: '2026-05', metricId: 'gross_profit' },
      findings: ['Gross profit is positive.'], caveats: ['Correlation is not causation.'],
      notes: ['Metric rows come from the governed LightBI result.'], createdAt: '2026-08-30T00:00:00.000Z',
    });

    expect(plan.combinationPolicy).toBe('governed_metric_results_only');
    expect(plan.tables.filter(table => table.kind === 'evidence')).toHaveLength(2);
    expect(plan.tables.some(table => /combined raw/i.test(table.title))).toBe(false);

    const workbook = XLSX.read(createExcelAnalysisWorkbook(plan), { type: 'array' });
    expect(workbook.SheetNames).toEqual([
      'Analysis Overview', 'Analysis Summary', 'Evidence sales 2026-05', 'Evidence accounting 2026-05', 'Source Lineage', 'Decision Notes',
    ]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Analysis Summary'])).toEqual([{ reporting_period: '2026-05', gross_profit: 90 }]);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Evidence sales 2026-05'])).toHaveLength(2);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Evidence accounting 2026-05'])).toHaveLength(2);
    const overview = XLSX.utils.sheet_to_json<Array<string | number>>(workbook.Sheets['Analysis Overview'], { header: 1 });
    expect(overview).toContainEqual(['Combination policy', 'governed_metric_results_only']);
    expect(overview).toContainEqual(['Raw multi-source join', 'Prohibited']);
  });

  it('uses single-source policy without inventing a multi-source restriction', () => {
    const plan = createAnalysisWorkbookPlan({
      title: 'Sales snapshot', perspectiveId: 'revenue', sourceCount: 1,
      summaryRows: [{ reporting_period: '2026-06', sales_revenue: 250 }],
      evidenceSources: [evidence[0]], createdAt: '2026-08-30T00:00:00.000Z',
    });
    expect(plan.combinationPolicy).toBe('single_source');
    const workbook = XLSX.read(createExcelAnalysisWorkbook(plan), { type: 'array' });
    const overview = XLSX.utils.sheet_to_json<Array<string | number>>(workbook.Sheets['Analysis Overview'], { header: 1 });
    expect(overview).toContainEqual(['Raw multi-source join', 'Not applicable']);
  });
});
