import * as XLSX from 'xlsx';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCleanDataHandoff, createPowerBiWorkbook } from './clean-data-handoff';
import * as materializer from './full-file-runtime-materializer';
import type { AdvancedWorkspaceSource } from '../stores/advanced-source-store';

const rawRows = [
  { 'Order ID': ' A-1 ', 'Customer Name': '  An ', Notes: '   ' },
  { 'Order ID': 'A-2', 'Customer Name': 'Binh', Notes: null },
];

function source(): AdvancedWorkspaceSource {
  const file = new File(['not used'], 'orders.csv', { type: 'text/csv' });
  return {
    id: 'file:orders', name: 'orders.csv', sourceType: 'csv', sourceKind: 'local_file',
    tables: [{
      id: '0:data', name: 'data', rowCount: 2,
      columns: ['Order ID', 'Customer Name', 'Notes'], profiles: {}, file,
    }],
    registeredAt: '2026-08-08T00:00:00.000Z',
  };
}

describe('clean data handoff', () => {
  beforeEach(() => {
    vi.spyOn(materializer, 'materializeRuntimeDatasetSource').mockResolvedValue({
      jsonText: JSON.stringify(rawRows), rowCount: rawRows.length,
    });
  });

  it('creates a new traceable copy without mutating raw rows', async () => {
    const input = source();
    const original = JSON.parse(JSON.stringify(rawRows));
    const result = await createCleanDataHandoff(input, input.tables[0]);

    expect(rawRows).toEqual(original);
    expect(result.artifact.schemaVersion).toBe('lightbi.clean-data-handoff.v1');
    expect(result.artifact.source.sourcePreserved).toBe(true);
    expect(result.artifact.output.originalRowsMutated).toBe(false);
    expect(result.cleanRows).toEqual([
      { order_id: 'A-1', customer_name: 'An', notes: null },
      { order_id: 'A-2', customer_name: 'Binh', notes: null },
    ]);
    expect(result.artifact.lineage.map(item => [item.sourceColumn, item.outputColumn])).toEqual([
      ['Order ID', 'order_id'], ['Customer Name', 'customer_name'], ['Notes', 'notes'],
    ]);
    expect(result.artifact.auditTrail).toEqual(expect.arrayContaining([
      expect.objectContaining({ operation: 'trim_text', column: 'order_id', affectedValues: 1 }),
      expect.objectContaining({ operation: 'blank_to_null', column: 'notes', affectedValues: 1 }),
    ]));
  });

  it('exports the Power BI workbook contract with all required sheets', async () => {
    const input = source();
    const result = await createCleanDataHandoff(input, input.tables[0]);
    const workbook = XLSX.read(createPowerBiWorkbook(result), { type: 'array' });
    expect(workbook.SheetNames).toEqual(['Clean Data', 'Data Dictionary', 'Transformation Audit', 'Handoff Manifest']);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Clean Data'])).toHaveLength(2);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets['Data Dictionary'])).toHaveLength(3);
  });
});
