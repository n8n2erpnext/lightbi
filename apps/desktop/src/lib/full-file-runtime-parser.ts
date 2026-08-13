import * as XLSX from "xlsx";
import { parseDelimitedRows, uniquePhysicalColumnNames } from "./physical-column-names";

export type RuntimeFilePayload = {
  name: string;
  buffer: ArrayBuffer;
  sheetName?: string;
  headerRowIndex?: number;
  physicalColumnCount?: number;
};

export type MaterializedRuntimeData = {
  jsonText: string;
  rowCount: number;
};

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value])
  );
}

function hasMaterialValue(row: Record<string, unknown>): boolean {
  return Object.values(row).some(value =>
    value !== null
    && value !== undefined
    && (typeof value !== "string" || value.trim() !== "")
  );
}

function parseJsonPayload(payload: RuntimeFilePayload): Record<string, unknown>[] {
  const text = new TextDecoder().decode(payload.buffer);
  const parsed = JSON.parse(text);
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows.filter(row => row && typeof row === "object" && !Array.isArray(row));
}

function coerceDelimitedValue(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const number = Number(trimmed);
    if (Number.isFinite(number)) return number;
  }
  return trimmed;
}

function parseDelimitedPayload(payload: RuntimeFilePayload, delimiter: string): Record<string, unknown>[] {
  const text = new TextDecoder("utf-8").decode(payload.buffer).replace(/^\uFEFF/, "");
  const matrix = parseDelimitedRows(text, delimiter);
  if (matrix.length === 0) return [];
  const columns = uniquePhysicalColumnNames(matrix[0]);
  if (columns.length === 0) return [];
  return matrix.slice(1).map(values => {
    const row: Record<string, unknown> = {};
    columns.forEach((column, index) => {
      row[column] = coerceDelimitedValue(values[index] ?? "");
    });
    return row;
  });
}

function parseTabularPayload(payload: RuntimeFilePayload): Record<string, unknown>[] {
  const lowerName = payload.name.toLowerCase();
  if (lowerName.endsWith(".csv")) return parseDelimitedPayload(payload, ",");
  if (lowerName.endsWith(".tsv") || lowerName.endsWith(".txt")) return parseDelimitedPayload(payload, "\t");

  const workbook = XLSX.read(payload.buffer, { type: "array" });
  const sheetName = payload.sheetName && workbook.Sheets[payload.sheetName]
    ? payload.sheetName
    : workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const usedRange = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null;
  const runtimeRange = payload.physicalColumnCount && usedRange
    ? {
      s: { r: payload.headerRowIndex ?? usedRange.s.r, c: usedRange.s.c },
      e: { r: usedRange.e.r, c: usedRange.s.c + payload.physicalColumnCount - 1 },
    }
    : payload.headerRowIndex;
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
    range: runtimeRange,
  });
}

export function materializeRuntimeFilePayloads(
  payloads: RuntimeFilePayload[]
): MaterializedRuntimeData {
  const rows = payloads.flatMap(payload => {
    const parsed = payload.name.toLowerCase().endsWith(".json")
      ? parseJsonPayload(payload)
      : parseTabularPayload(payload);
    return parsed.filter(hasMaterialValue).map(normalizeRow);
  });

  return {
    jsonText: JSON.stringify(rows),
    rowCount: rows.length
  };
}
