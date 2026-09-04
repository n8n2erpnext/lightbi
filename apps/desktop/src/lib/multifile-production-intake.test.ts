import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { classifyDatasetFamilies } from './batch-inspection';
import { createBusinessFusionOverview, createBusinessFusionVirtualDataset } from './business-fusion-overview';
import { createWorkbookSheetSelectionBatch, expandWorkbookSheetSelection, inspectLocalFileBatch } from './workbook-sheet-intake';

vi.mock('./project-source-file-api', () => ({ uploadProjectSourceFile: vi.fn(async () => null) }));

const ROOT = path.resolve(process.cwd(), '../..');
const NAMES = [
  'Sales_ERP_May_2026.xlsx', 'Sales_ERP_June_2026.xlsx',
  'Accounting_ERP_May_2026.csv', 'Accounting_ERP_June_2026.csv',
  'Logistics_ERP_May_2026.csv', 'Logistics_ERP_June_2026.csv',
] as const;

function localFile(name: string): File {
  const bytes = fs.readFileSync(path.join(ROOT, 'sample data', name));
  const type = name.endsWith('.csv') ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  return new File([bytes], name, { type });
}

describe('multi-file production intake', () => {
  it('takes the six real ERP files through Home intake, family classification and fusion without inventing cross-domain facts', async () => {
    const controller = new AbortController();
    let files = NAMES.map(localFile);
    let results = await inspectLocalFileBatch(files, controller.signal);
    expect(results.every((result) => result.status === 'accessible')).toBe(true);

    const workbookSelection = createWorkbookSheetSelectionBatch(files, results);
    if (workbookSelection) {
      const expanded = await expandWorkbookSheetSelection(workbookSelection, false, controller.signal);
      files = expanded.files;
      results = expanded.results;
    }

    const families = classifyDatasetFamilies(files.map((file, index) => ({ file, result: results[index] })), 'strict');
    expect(families).toHaveLength(3);
    expect(families.map((family) => family.files.length).sort()).toEqual([2, 2, 2]);
    expect(families.reduce((sum, family) => sum + family.totalRows, 0)).toBeGreaterThan(0);

    const overview = createBusinessFusionOverview(families);
    expect(overview).not.toBeNull();
    expect(overview?.periodLabels).toEqual(['2026-05', '2026-06']);
    expect(new Set(overview?.sources.map((source) => source.role))).toEqual(new Set(['sales', 'accounting', 'logistics']));
    expect(overview?.metrics.some((metric) => metric.metricId === 'revenue')).toBe(true);
    expect(overview?.metrics.some((metric) => metric.metricId === 'profit')).toBe(true);
    expect(overview?.metrics.some((metric) => metric.metricId === 'delivery_fee')).toBe(true);

    const fused = createBusinessFusionVirtualDataset(families);
    expect(fused).not.toBeNull();
    expect(fused?.rows.length).toBeGreaterThan(0);
    expect(fused?.evidenceBundles && Object.keys(fused.evidenceBundles).length).toBe(fused?.rows.length);
    expect(fused?.overview.caveats.join(' ')).not.toMatch(/profit field was not detected/i);
  }, 120_000);
});
