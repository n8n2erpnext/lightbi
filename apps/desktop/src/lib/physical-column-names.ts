export function physicalHeaderCell(value: unknown): string {
  if (value == null) return "";
  const text = String(value);
  const normalized = text.trim();
  return normalized === "" || normalized === '""' ? "" : text;
}

/**
 * Assign stable, lossless physical names to every source column. Blank and
 * duplicate headers remain addressable instead of being dropped/overwritten.
 */
export function uniquePhysicalColumnNames(
  headerRow: readonly unknown[],
  width: number = headerRow.length,
): string[] {
  const assigned = new Set<string>();
  const duplicateCounts = new Map<string, number>();
  return Array.from({ length: width }, (_, columnIndex) => {
    const physical = physicalHeaderCell(headerRow[columnIndex]);
    const base = physical || `__EMPTY_${columnIndex + 1}`;
    const normalizedBase = base.toLocaleLowerCase();
    let occurrence = (duplicateCounts.get(normalizedBase) ?? 0) + 1;
    duplicateCounts.set(normalizedBase, occurrence);
    let candidate = base;
    if (assigned.has(candidate.toLocaleLowerCase())) {
      candidate = `${base}__DUPLICATE_${occurrence}`;
    }
    while (assigned.has(candidate.toLocaleLowerCase())) {
      occurrence += 1;
      candidate = `${base}__DUPLICATE_${occurrence}`;
    }
    assigned.add(candidate.toLocaleLowerCase());
    return candidate;
  });
}

/** Quote-aware delimited parser, including embedded delimiters and newlines. */
export function parseDelimitedRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value.trim());
      if (row.some(cell => cell.length > 0)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value.trim());
  if (row.some(cell => cell.length > 0)) rows.push(row);
  return rows;
}
