import { describe, expect, it } from 'vitest';
import { createUnderstandingCoreResult } from './question-engine';

describe('semantic capability matrix', () => {
  it('treats healthcare as context and only opens capabilities backed by fields', () => {
    const survey = createUnderstandingCoreResult({
      sourceKind: 'database_table',
      sourceLabel: 'generic-source',
      columns: ['Patient ID', 'Facility ID', 'Survey Score', 'Response Rate'],
      rows: [
        { 'Patient ID': 'P-1', 'Facility ID': 'F-1', 'Survey Score': 4, 'Response Rate': 0.8 },
        { 'Patient ID': 'P-2', 'Facility ID': 'F-1', 'Survey Score': 3, 'Response Rate': 0.7 },
      ],
    });
    expect(survey.capabilityMatrix.contexts[0]?.context).toBe('healthcare');
    expect(survey.capabilityMatrix.capabilities.find((item) => item.capability === 'revenue')?.state).not.toBe('ready');
    expect(survey.capabilityMatrix.capabilities.find((item) => item.capability === 'inventory')?.state).not.toBe('ready');
    expect(survey.capabilityMatrix.capabilities.find((item) => item.capability === 'performance')?.state).toBe('ready');
  });

  it('allows customer, inventory, and revenue to intersect inside healthcare evidence', () => {
    const rows = [
      { patient_id: 'P-1', medicine: 'Drug A', stock_qty: 20, invoice_total: 100 },
      { patient_id: 'P-2', medicine: 'Drug B', stock_qty: 10, invoice_total: 150 },
    ];
    const database = createUnderstandingCoreResult({
      sourceKind: 'database_table', sourceLabel: 'generic-source', columns: Object.keys(rows[0]), rows,
    });
    const local = createUnderstandingCoreResult({
      sourceKind: 'local_file', sourceLabel: 'generic-source', columns: Object.keys(rows[0]), rows,
    });
    expect(database.capabilityMatrix.contexts[0]?.context).toBe('healthcare');
    expect(database.capabilityMatrix.capabilities
      .filter((item) => item.state === 'ready')
      .map((item) => item.capability))
      .toEqual(expect.arrayContaining(['inventory', 'revenue', 'finance']));
    expect(database.capabilityMatrix.capabilities.find((item) => item.capability === 'customer')?.state)
      .toBe('evidence_only');
    expect(local.capabilityMatrix).toEqual(database.capabilityMatrix);
  });
});
