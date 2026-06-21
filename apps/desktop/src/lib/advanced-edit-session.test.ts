import { describe, expect, it } from 'vitest';
import { applyAdvancedEdits, buildAdvancedMutationRows, EMPTY_ADVANCED_EDIT_STATE, projectAdvancedColumns, recordAdvancedCellEdit, redoAdvancedCellEdit, undoAdvancedCellEdit } from './advanced-edit-session';

describe('advanced edit session', () => {
  const result = {
    runId: 'run', columns: [{ id: 'name', name: 'name', logicalType: 'string' as const }], rows: [['A']],
    page: { offset: 0, limit: 100, hasMore: false }, truncated: false, warnings: [], executionMs: 1,
  };

  it('keeps pending edits outside the base result and supports undo/redo', () => {
    const changed = recordAdvancedCellEdit(EMPTY_ADVANCED_EDIT_STATE, { rowIndex: 0, columnIndex: 0, oldValue: 'A', newValue: 'B' });
    expect(result.rows[0][0]).toBe('A');
    expect(applyAdvancedEdits(result, changed).rows[0][0]).toBe('B');
    const undone = undoAdvancedCellEdit(changed);
    expect(applyAdvancedEdits(result, undone).rows[0][0]).toBe('A');
    expect(applyAdvancedEdits(result, redoAdvancedCellEdit(undone)).rows[0][0]).toBe('B');
  });

  it('collapses a cell back to its original value', () => {
    const changed = recordAdvancedCellEdit(EMPTY_ADVANCED_EDIT_STATE, { rowIndex: 0, columnIndex: 0, oldValue: 'A', newValue: 'B' });
    const restored = recordAdvancedCellEdit(changed, { rowIndex: 0, columnIndex: 0, oldValue: 'B', newValue: 'A' });
    expect(restored.changes).toEqual({});
  });

  it('projects hidden columns without changing the source matrix', () => {
    const twoColumns = { ...result, columns: [...result.columns, { id: 'amount', name: 'amount', logicalType: 'number' as const }], rows: [['A', 12]] };
    const projected = projectAdvancedColumns(twoColumns, ['name']);
    expect(projected.columns.map(column => column.name)).toEqual(['amount']);
    expect(projected.rows).toEqual([[12]]);
    expect(twoColumns.rows).toEqual([['A', 12]]);
  });

  it('groups edits by row with primary-key and expected values', () => {
    const source = { ...result, columns: [{ id: 'id', name: 'id', logicalType: 'number' as const }, { id: 'name', name: 'name', logicalType: 'string' as const }], rows: [[7, 'A']] };
    const state = recordAdvancedCellEdit(EMPTY_ADVANCED_EDIT_STATE, { rowIndex: 0, columnIndex: 1, oldValue: 'A', newValue: 'B' });
    expect(buildAdvancedMutationRows(source, state, ['id'])).toEqual([{ key: { id: 7 }, changes: { name: 'B' }, expected: { name: 'A' } }]);
  });
});
