export type RowLike = Record<string, unknown>;

export function selectFirstNonEmptyRows(
  ...rowSets: Array<RowLike[] | undefined | null>
): RowLike[] {
  return rowSets.find(rows => Array.isArray(rows) && rows.length > 0) ?? [];
}
