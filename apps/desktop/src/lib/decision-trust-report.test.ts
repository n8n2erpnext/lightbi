/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import type { DatasetFamily } from './batch-inspection';
import type { ColumnProfile } from './column-profiler';
import type { SourceInspectionResult } from './source-preflight';
import { createDecisionTrustReport } from './decision-trust-report';

type AccessibleInspection = Extract<SourceInspectionResult, { status: 'accessible' }>;

function profile(overrides: Partial<ColumnProfile> = {}): ColumnProfile {
  return {
    name: overrides.name ?? 'column',
    dataType: overrides.dataType ?? 'string',
    distinctCount: overrides.distinctCount ?? 100,
    nullPercent: overrides.nullPercent ?? 0,
    topValues: overrides.topValues ?? [],
    topValueCounts: overrides.topValueCounts,
    nonEmptyCount: overrides.nonEmptyCount,
    dominanceRatio: overrides.dominanceRatio,
    profiledRowCount: overrides.profiledRowCount ?? 100,
    profilingScope: overrides.profilingScope ?? 'full',
    isIdentifier: overrides.isIdentifier ?? false,
    isCategorical: overrides.isCategorical ?? false,
  };
}

function accessibleWorkbook(metadata: AccessibleInspection['metadata']): SourceInspectionResult {
  return {
    status: 'accessible',
    sourceType: 'local_xlsx',
    label: 'report.xlsx',
    normalizedUrl: 'local://report.xlsx',
    metadata,
    file: new File([''], 'report.xlsx'),
  };
}

function family(overrides: Partial<DatasetFamily> = {}): DatasetFamily {
  const columns = overrides.columns ?? ['id', 'quantity'];
  const profiles = overrides.profiles ?? {
    id: profile({ name: 'id', distinctCount: 100, isIdentifier: true }),
    quantity: profile({ name: 'quantity', dataType: 'number', distinctCount: 20 }),
  };

  return {
    id: overrides.id ?? 'family_1',
    name: overrides.name ?? 'Inventory report',
    schemaFingerprint: overrides.schemaFingerprint ?? columns.join('|'),
    files: overrides.files ?? [],
    totalRows: overrides.totalRows ?? 100,
    columns,
    profiles,
  };
}

describe('decision trust report', () => {
  it('turns missing business data into a visible trust issue and score penalty', () => {
    const report = createDecisionTrustReport(family({
      columns: ['receipt_id', 'inbound_qty'],
      profiles: {
        receipt_id: profile({ name: 'receipt_id', distinctCount: 100, isIdentifier: true }),
        inbound_qty: profile({ name: 'inbound_qty', dataType: 'number', nullPercent: 15, distinctCount: 40 }),
      },
    }));

    expect(report.score).toBeLessThan(100);
    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'missing_data',
        percent: 15,
        detail: expect.stringContaining('15%'),
      }),
    ]));
    expect(report.recommendation).toContain('caveats');
  });

  it('counts workbook sheets that are empty or use a different structure', () => {
    const result = accessibleWorkbook({
      name: 'report.xlsx',
      is_workbook: true,
      default_sheet: 'Good',
      sheet_count: 3,
      sheet_names: ['Good', 'Wrong', 'Empty'],
      rows_count: 100,
      columns: ['id', 'quantity'],
      profiles: {},
      sheets: {
        Good: { rows_count: 100, columns: ['id', 'quantity'], preview_rows: [], profiles: {} },
        Wrong: { rows_count: 25, columns: ['doc_no', 'amount'], preview_rows: [], profiles: {} },
        Empty: { rows_count: 0, columns: [], preview_rows: [], profiles: {} },
      },
    });

    const report = createDecisionTrustReport(family({
      files: [{ file: new File([''], 'report.xlsx'), result }],
      columns: ['id', 'quantity'],
    }));

    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'sheet_format_mismatch',
        count: 2,
        evidence: expect.arrayContaining(['report.xlsx / Wrong', 'report.xlsx / Empty']),
      }),
    ]));
  });

  it('estimates duplicate key rows from identifier cardinality', () => {
    const report = createDecisionTrustReport(family({
      totalRows: 100,
      columns: ['ma_nhap_kho', 'quantity'],
      profiles: {
        ma_nhap_kho: profile({ name: 'ma_nhap_kho', distinctCount: 95, isIdentifier: true }),
        quantity: profile({ name: 'quantity', dataType: 'number', distinctCount: 20 }),
      },
    }));

    expect(report.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'duplicate_key_rows',
        count: 5,
        percent: 5,
      }),
    ]));
  });

  it('marks heavily flawed data as exploratory only so users do not decide too early', () => {
    const result = accessibleWorkbook({
      name: 'dirty.xlsx',
      is_workbook: true,
      default_sheet: 'Main',
      sheet_count: 4,
      sheet_names: ['Main', 'Wrong1', 'Wrong2', 'Empty'],
      rows_count: 100,
      columns: ['id', 'inbound_qty'],
      profiles: {},
      sheets: {
        Main: { rows_count: 100, columns: ['id', 'inbound_qty'], preview_rows: [], profiles: {} },
        Wrong1: { rows_count: 30, columns: ['x'], preview_rows: [], profiles: {} },
        Wrong2: { rows_count: 25, columns: ['y'], preview_rows: [], profiles: {} },
        Empty: { rows_count: 0, columns: [], preview_rows: [], profiles: {} },
      },
    });

    const report = createDecisionTrustReport(family({
      totalRows: 100,
      columns: ['id', 'inbound_qty'],
      files: [{ file: new File([''], 'dirty.xlsx'), result }],
      profiles: {
        id: profile({ name: 'id', distinctCount: 70, isIdentifier: true }),
        inbound_qty: profile({ name: 'inbound_qty', dataType: 'number', nullPercent: 45, distinctCount: 35 }),
      },
    }));

    expect(report.tier).toBe('exploratory_only');
    expect(report.recommendation).toContain('Do not make an important decision');
  });
});
