import * as XLSX from "xlsx";

export type RuntimeFilePayload = {
  name: string;
  buffer: ArrayBuffer;
  sheetName?: string;
  headerRowIndex?: number;
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

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values.map(value => value.trim());
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
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];
  const columns = parseDelimitedLine(lines[0], delimiter).map(column => column.trim()).filter(Boolean);
  if (columns.length === 0) return [];
  return lines.slice(1).map(line => {
    const values = parseDelimitedLine(line, delimiter);
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
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    defval: null,
    raw: true,
    range: payload.headerRowIndex,
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
