export function createPreviewRows(rows: any[], columns: string[], limit: number = 1000): Record<string, unknown>[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  
  const cappedRows = rows.slice(0, limit);
  
  return cappedRows.map(row => {
    const obj: Record<string, unknown> = {};
    if (Array.isArray(row)) {
      // Normalize array row using columns
      columns.forEach((col, idx) => {
        if (col) obj[col] = row[idx];
      });
    } else if (typeof row === 'object' && row !== null) {
      // Shallow clone to prevent mutation
      Object.assign(obj, row);
    }
    return obj;
  });
}
