import type { QueryCellValue } from '@lightbi/core-types';
import type { AdvancedQueryResult } from './advanced-api';
import type { AdvancedMutationRow } from './advanced-api';

export type AdvancedCellEdit = {
  rowIndex: number;
  columnIndex: number;
  oldValue: QueryCellValue;
  newValue: QueryCellValue;
};

export type AdvancedEditState = {
  changes: Record<string, AdvancedCellEdit>;
  undo: AdvancedCellEdit[];
  redo: AdvancedCellEdit[];
};

export const EMPTY_ADVANCED_EDIT_STATE: AdvancedEditState = { changes: {}, undo: [], redo: [] };

export function advancedEditKey(rowIndex: number, columnIndex: number): string {
  return `${rowIndex}:${columnIndex}`;
}

export function recordAdvancedCellEdit(state: AdvancedEditState, edit: AdvancedCellEdit): AdvancedEditState {
  if (Object.is(edit.oldValue, edit.newValue)) return state;
  const key = advancedEditKey(edit.rowIndex, edit.columnIndex);
  const original = state.changes[key]?.oldValue ?? edit.oldValue;
  const changes = { ...state.changes };
  if (Object.is(original, edit.newValue)) delete changes[key];
  else changes[key] = { ...edit, oldValue: original };
  return { changes, undo: [...state.undo, edit], redo: [] };
}

export function undoAdvancedCellEdit(state: AdvancedEditState): AdvancedEditState {
  const edit = state.undo.at(-1);
  if (!edit) return state;
  const key = advancedEditKey(edit.rowIndex, edit.columnIndex);
  const changes = { ...state.changes };
  const original = changes[key]?.oldValue ?? edit.oldValue;
  if (Object.is(original, edit.oldValue)) delete changes[key];
  else changes[key] = { ...edit, oldValue: original, newValue: edit.oldValue };
  return { changes, undo: state.undo.slice(0, -1), redo: [...state.redo, edit] };
}

export function redoAdvancedCellEdit(state: AdvancedEditState): AdvancedEditState {
  const edit = state.redo.at(-1);
  if (!edit) return state;
  const replayed = recordAdvancedCellEdit({ ...state, redo: [] }, edit);
  return { ...replayed, redo: state.redo.slice(0, -1) };
}

export function applyAdvancedEdits(result: AdvancedQueryResult, state: AdvancedEditState): AdvancedQueryResult {
  if (Object.keys(state.changes).length === 0) return result;
  const rows = result.rows.map(row => [...row]);
  for (const edit of Object.values(state.changes)) {
    if (rows[edit.rowIndex] && edit.columnIndex < rows[edit.rowIndex].length) rows[edit.rowIndex][edit.columnIndex] = edit.newValue;
  }
  return { ...result, rows };
}

export function projectAdvancedColumns(result: AdvancedQueryResult, hiddenColumns: string[]): AdvancedQueryResult {
  if (hiddenColumns.length === 0) return result;
  const hidden = new Set(hiddenColumns);
  const indexes = result.columns.flatMap((column, index) => hidden.has(column.id) ? [] : [index]);
  return {
    ...result,
    columns: indexes.map(index => result.columns[index]),
    rows: result.rows.map(row => indexes.map(index => row[index] ?? null)),
  };
}

export function buildAdvancedMutationRows(result: AdvancedQueryResult, state: AdvancedEditState, primaryKeys: string[]): AdvancedMutationRow[] {
  if (primaryKeys.length === 0) throw new Error('A primary key is required for source commit.');
  const columnIndexes = new Map(result.columns.map((column, index) => [column.name, index]));
  for (const key of primaryKeys) if (!columnIndexes.has(key)) throw new Error(`Primary-key column ${key} is missing from the result.`);
  const grouped = new Map<number, AdvancedMutationRow>();
  for (const edit of Object.values(state.changes)) {
    const column = result.columns[edit.columnIndex];
    if (!column) throw new Error('An edited column is no longer present in the result.');
    let mutation = grouped.get(edit.rowIndex);
    if (!mutation) {
      const row = result.rows[edit.rowIndex];
      if (!row) throw new Error('An edited row is no longer present in the result.');
      mutation = { key: {}, changes: {}, expected: {} };
      for (const key of primaryKeys) mutation.key[key] = row[columnIndexes.get(key)!] ?? null;
      grouped.set(edit.rowIndex, mutation);
    }
    mutation.changes[column.name] = edit.newValue;
    mutation.expected[column.name] = edit.oldValue;
  }
  return [...grouped.entries()].sort(([left], [right]) => left - right).map(([, mutation]) => mutation);
}
