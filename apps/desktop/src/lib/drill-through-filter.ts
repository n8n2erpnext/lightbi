export type DrillThroughFilterOperator = 'equals' | 'contains' | 'not_equals';

export interface DrillThroughFilter {
  id: string;
  column: string;
  operator: DrillThroughFilterOperator;
  value: string;
}

export interface IndexedDrillThroughRow {
  index: number;
  row: Record<string, unknown>;
}

function comparableValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().toLocaleLowerCase();
  return String(value).trim().toLocaleLowerCase();
}

export function rowMatchesDrillThroughFilters(
  row: Record<string, unknown>,
  filters: DrillThroughFilter[],
): boolean {
  return filters.every(filter => {
    const actual = comparableValue(row[filter.column]);
    const expected = comparableValue(filter.value);
    if (filter.operator === 'contains') return actual.includes(expected);
    if (filter.operator === 'not_equals') return actual !== expected;
    return actual === expected;
  });
}

export function filterDrillThroughRows(
  rows: Record<string, unknown>[],
  filters: DrillThroughFilter[],
): IndexedDrillThroughRow[] {
  return rows
    .map((row, index) => ({ row, index }))
    .filter(entry => rowMatchesDrillThroughFilters(entry.row, filters));
}

export function getDrillThroughFilterSuggestions(
  rows: Record<string, unknown>[],
  column: string,
  limit = 100,
): string[] {
  const values = new Map<string, string>();
  for (const row of rows) {
    const display = row[column] === null || row[column] === undefined ? '' : String(row[column]).trim();
    if (!display) continue;
    const comparable = display.toLocaleLowerCase();
    if (!values.has(comparable)) values.set(comparable, display);
    if (values.size >= limit) break;
  }
  return [...values.values()].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}
