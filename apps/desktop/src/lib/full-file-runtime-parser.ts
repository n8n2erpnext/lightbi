import * as XLSX from "xlsx";

export type RuntimeFilePayload = {
  name: string;
  buffer: ArrayBuffer;
  sheetName?: string;
};

export type MaterializedRuntimeData = {
  jsonText: string;
  rowCount: number;
};

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key.toLowerCase(), value])
  );
}

function parseJsonPayload(payload: RuntimeFilePayload): Record<string, unknown>[] {
  const text = new TextDecoder().decode(payload.buffer);
  const parsed = JSON.parse(text);
  const rows = Array.isArray(parsed) ? parsed : [parsed];
  return rows.filter(row => row && typeof row === "object" && !Array.isArray(row));
}

function parseTabularPayload(payload: RuntimeFilePayload): Record<string, unknown>[] {
  const workbook = XLSX.read(payload.buffer, { type: "array" });
  const sheetName = payload.sheetName && workbook.Sheets[payload.sheetName]
    ? payload.sheetName
    : workbook.SheetNames[0];
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    defval: null,
    raw: true
  });
}

export function materializeRuntimeFilePayloads(
  payloads: RuntimeFilePayload[]
): MaterializedRuntimeData {
  const rows = payloads.flatMap(payload => {
    const parsed = payload.name.toLowerCase().endsWith(".json")
      ? parseJsonPayload(payload)
      : parseTabularPayload(payload);
    return parsed.map(normalizeRow);
  });

  return {
    jsonText: JSON.stringify(rows),
    rowCount: rows.length
  };
}
