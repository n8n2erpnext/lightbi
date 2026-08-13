import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFileSourceCandidate } from './source-preflight';
import { inspectLocalFile } from './local-file-inspector';
import { createSingleSourceBAOverview } from './single-source-ba-overview';

const root = join(process.cwd(), '../..');
const samples = [
  { relativePath: 'sample-corpus/anchors/1.3.0/Logistics_ERP_June_2026.csv', mode: 'operations', minimumBreakdowns: 2, minimumFindings: 2 },
  { relativePath: 'sample data/Amazon_1-level_46-MB_minified.json', mode: 'commercial', minimumBreakdowns: 2, minimumFindings: 2 },
  { relativePath: 'sample data/bcctnhapTTKT_19122024.xlsx', mode: 'operations', minimumBreakdowns: 2, minimumFindings: 2 },
  { relativePath: 'sample data/bank-additional-full.xlsx', mode: 'customer', minimumBreakdowns: 4, minimumFindings: 3, action: { id: 'universal:customer:outcome', opportunityName: 'Which customer segments achieve the desired outcome?', dimensions: ['customer', 'segment', 'channel'], measures: ['outcome_rate'] } },
  { relativePath: 'sample data/DATA_XUAT.xlsx', mode: 'operations', minimumBreakdowns: 2, minimumFindings: 2, action: { id: 'universal:operations:service-level', opportunityName: 'Which routes and service groups meet the operational deadline?', dimensions: ['route', 'service', 'status'], measures: ['on_time_rate'] } },
  { relativePath: 'sample data/BHX_PHIEUXUAT.xlsx', mode: 'commercial', minimumBreakdowns: 2, minimumFindings: 2, action: { id: 'universal:finance:value', opportunityName: 'How does transaction value vary by warehouse and employee?', dimensions: ['warehouse', 'employee'], measures: ['revenue'] } },
] as const;

describe.each(samples)('sample-data BA overview: $relativePath', sample => {
  const absolutePath = join(root, sample.relativePath);
  it.skipIf(!existsSync(absolutePath))('produces a rich domain brief from representative rows', async () => {
    const name = sample.relativePath.split('/').at(-1)!;
    const file = new File([readFileSync(absolutePath)], name);
    const candidate = createFileSourceCandidate(file);
    expect('rawUrl' in candidate).toBe(true);
    if (!('rawUrl' in candidate)) return;
    const inspected = await inspectLocalFile(candidate);
    expect(inspected.status).toBe('accessible');
    if (inspected.status !== 'accessible') return;
    const metadata = inspected.metadata;
    const selected = metadata.is_workbook && metadata.default_sheet && metadata.sheets
      ? metadata.sheets[metadata.default_sheet]
      : metadata;
    const rows = selected.semantic_rows ?? [];
    const overview = createSingleSourceBAOverview(rows, { sourceRowCount: selected.rows_count, analysisAction: 'action' in sample ? sample.action : undefined });
    expect(overview, JSON.stringify({ columns: selected.columns, rowKeys: [...new Set(rows.flatMap(row => Object.keys(row)))].slice(0, 80) })).not.toBeNull();
    expect(overview?.mode).toBe(sample.mode);
    expect(overview?.kpis.length).toBeGreaterThanOrEqual(2);
    expect(overview?.breakdowns.length).toBeGreaterThanOrEqual(sample.minimumBreakdowns);
    expect(overview?.findings.length).toBeGreaterThanOrEqual(sample.minimumFindings);
    expect(overview?.recommendedActions.length).toBeGreaterThanOrEqual(3);
    expect(overview?.limitations.length).toBeGreaterThanOrEqual(1);
  }, 120_000);
});
