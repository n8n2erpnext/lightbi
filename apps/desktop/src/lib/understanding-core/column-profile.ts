import type { ColumnHealth } from "./contracts";

export function normalizeHeader(value: string): string {
  return value
    .replace(/[_./-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function stringifyCell(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function isNumeric(value: string): boolean {
  if (!value) return false;
  const normalized = value.replace(/,/g, "");
  return normalized !== "" && Number.isFinite(Number(normalized));
}

function isDateLike(value: string): boolean {
  if (!value) return false;
  if (/^\d{1,2}[:]\d{2}\s+\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(value)) return true;
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}$/.test(value)) return true;
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(value)) return true;
  const n = Number(value);
  return Number.isFinite(n) && n >= 36526 && n <= 51544;
}

export function profileColumn(rows: Record<string, unknown>[], column: string): ColumnHealth {
  const values = rows.map(row => stringifyCell(row[column])).filter(Boolean);
  const nonEmptyCount = values.length;
  const counts = new Map<string, number>();
  let numeric = 0;
  let date = 0;

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
    if (isNumeric(value)) numeric += 1;
    if (isDateLike(value)) date += 1;
  }

  const topValues = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([value, count]) => ({ value, count }));

  const distinctCount = counts.size;
  const topCount = topValues[0]?.count ?? 0;
  const dominanceRatio = nonEmptyCount > 0 ? topCount / nonEmptyCount : undefined;

  let inferredType: ColumnHealth["inferredType"] = "empty";
  if (nonEmptyCount > 0) {
    const numericRate = numeric / nonEmptyCount;
    const dateRate = date / nonEmptyCount;
    if (dateRate >= 0.8) inferredType = "date";
    else if (numericRate >= 0.8) inferredType = "number";
    else if (numericRate > 0.1 || dateRate > 0.1) inferredType = "mixed";
    else inferredType = "string";
  }

  return { inferredType, nonEmptyCount, distinctCount, dominanceRatio, topValues };
}
