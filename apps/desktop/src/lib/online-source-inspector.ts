import * as XLSX from 'xlsx';
import { profileColumns } from './column-profiler';
import type { SourceCandidate, SourceInspectionResult } from './source-preflight';
import { getApiBaseUrl } from './api-base';
import { createSemanticSample, type SemanticSample } from './semantic-sampler';

const FULL_ANALYSIS_ROW_LIMIT = 20_000;

function createRepresentativeRows<T>(rows: T[], limit: number = 1000): T[] {
  if (!Array.isArray(rows) || rows.length <= limit) return rows.slice();
  if (limit <= 0) return [];

  const indexes = new Set<number>();
  for (let i = 0; i < limit; i++) {
    const index = Math.round((i * (rows.length - 1)) / (limit - 1));
    indexes.add(index);
  }

  return [...indexes]
    .sort((a, b) => a - b)
    .map(index => rows[index]);
}

function sampleSeed(label: string, columns: string[], rowCount: number): string {
  return `${label}:${rowCount}:${columns.join("|")}`;
}

function semanticSampleMetadata<T>(sample: SemanticSample<T>) {
  return {
    strategy: sample.strategy,
    source_row_count: sample.sourceRowCount,
    sample_row_count: sample.sampleRowCount,
    row_indexes: sample.rowIndexes
  };
}

function retainAnalysisRows<T>(rows: T[]): T[] | undefined {
  return rows.length <= FULL_ANALYSIS_ROW_LIMIT ? rows : undefined;
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  values.push(current);
  return values.map(value => value.trim());
}

function parseCsv(text: string): { columns: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) throw new Error("Remote CSV is empty.");

  const columns = parseCsvLine(lines[0]).map(column => column.trim()).filter(Boolean);
  if (columns.length === 0) throw new Error("Remote CSV has no headers.");

  const rows = lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    columns.forEach((column, index) => {
      row[column] = values[index] ?? "";
    });
    return row;
  });

  return { columns, rows };
}

function googleSheetsCsvExportUrl(url: string): string {
  const idMatch = url.match(/\/spreadsheets\/d\/([^/?#]+)/i);
  const spreadsheetId = idMatch?.[1];
  if (!spreadsheetId) throw new Error("Google Sheets URL is missing a sheet ID.");

  const gidMatch = url.match(/[?&#]gid=([^&#]+)/i);
  const gid = gidMatch?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${encodeURIComponent(gid)}`;
}

function googleSheetsGvizCsvUrl(url: string): string {
  const idMatch = url.match(/\/spreadsheets\/d\/([^/?#]+)/i);
  const spreadsheetId = idMatch?.[1];
  if (!spreadsheetId) throw new Error("Google Sheets URL is missing a sheet ID.");

  const gidMatch = url.match(/[?&#]gid=([^&#]+)/i);
  const gid = gidMatch?.[1] ?? "0";
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${encodeURIComponent(gid)}`;
}

function filenameFromUrl(url: string, fallback: string): string {
  try {
    const parsed = new URL(url);
    const name = parsed.pathname.split('/').filter(Boolean).pop();
    return name || fallback;
  } catch {
    return fallback;
  }
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("ACCESS_DENIED");
    }
    throw new Error(`FETCH_FAILED_${response.status}`);
  }
  return response.text();
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("ACCESS_DENIED");
    }
    throw new Error(`FETCH_FAILED_${response.status}`);
  }
  return response.arrayBuffer();
}

async function fetchMicrosoftExcelThroughBackend(url: string): Promise<ArrayBuffer> {
  const response = await fetch(`${getApiBaseUrl()}/api/online-source/fetch-excel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    let message = `FETCH_FAILED_${response.status}`;
    try {
      const body = await response.json();
      if (typeof body?.message === "string") message = body.message;
    } catch {
      // keep status-based message
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("ACCESS_DENIED");
    }
    throw new Error(message);
  }

  return response.arrayBuffer();
}

function accessibleTabularResult(
  candidate: SourceCandidate,
  name: string,
  columns: string[],
  rows: Record<string, unknown>[],
  normalizedUrl = candidate.normalizedUrl,
  file?: File
): SourceInspectionResult {
  if (rows.length === 0) {
    return {
      status: "no_data",
      sourceType: candidate.sourceType,
      label: candidate.label,
      message: "This online source has headers but no readable data rows."
    };
  }

  const semanticSample = createSemanticSample(rows, {
    seed: sampleSeed(name, columns, rows.length)
  });
  const retainedAnalysisRows = retainAnalysisRows(rows);

  return {
    status: "accessible",
    sourceType: candidate.sourceType,
    label: candidate.label,
    normalizedUrl,
    metadata: {
      name,
      rows_count: rows.length,
      columns,
      preview_rows: createRepresentativeRows(rows, 1000),
      semantic_rows: semanticSample.rows,
      semantic_sample: semanticSampleMetadata(semanticSample),
      analysis_rows: retainedAnalysisRows,
      analysis_row_scope: retainedAnalysisRows ? "full" : "not_retained",
      profiles: profileColumns(columns, semanticSample.rows, rows.length)
    },
    file
  };
}

async function inspectRemoteCsv(candidate: SourceCandidate, fetchUrl: string, name: string): Promise<SourceInspectionResult> {
  const text = await fetchText(fetchUrl);
  const parsed = parseCsv(text);
  const fileName = name.toLowerCase().endsWith('.csv') ? name : `${name}.csv`;
  return accessibleTabularResult(candidate, name, parsed.columns, parsed.rows, candidate.normalizedUrl, new File([text], fileName, { type: 'text/csv' }));
}

function inspectWorkbookBuffer(
  candidate: SourceCandidate,
  buffer: ArrayBuffer,
  name: string = filenameFromUrl(candidate.normalizedUrl, candidate.label)
): SourceInspectionResult {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) throw new Error("Workbook has no sheets.");

  const sheetsData: Record<string, any> = {};
  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    const headerRow = rawRows[0] || [];
    const columns = headerRow.map((column: unknown) => String(column).trim()).filter(Boolean);
    const dataRows = rawRows.slice(1).filter(row => row.length > 0);
    const objects = dataRows.map(rowArray => {
      const row: Record<string, unknown> = {};
      columns.forEach((column, index) => {
        row[column] = rowArray[index];
      });
      return row;
    });
    const semanticSample = createSemanticSample(objects, {
      seed: sampleSeed(`${name}:${sheetName}`, columns, objects.length)
    });
    const retainedAnalysisRows = retainAnalysisRows(objects);

    sheetsData[sheetName] = {
      rows_count: objects.length,
      columns,
      preview_rows: createRepresentativeRows(objects, 1000),
      semantic_rows: semanticSample.rows,
      semantic_sample: semanticSampleMetadata(semanticSample),
      analysis_rows: retainedAnalysisRows,
      analysis_row_scope: retainedAnalysisRows ? "full" : "not_retained",
      profiles: profileColumns(columns, semanticSample.rows, objects.length)
    };
  }

  const defaultSheet = sheetNames[0];
  return {
    status: "accessible",
    sourceType: candidate.sourceType,
    label: candidate.label,
    normalizedUrl: candidate.normalizedUrl,
    metadata: {
      name,
      is_workbook: true,
      sheet_count: sheetNames.length,
      sheet_names: sheetNames,
      default_sheet: defaultSheet,
      sheets: sheetsData,
      profiles: sheetsData[defaultSheet]?.profiles ?? {}
    },
    file: new File([buffer.slice(0)], name.toLowerCase().endsWith('.xlsx') ? name : `${name}.xlsx`, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
  };
}

async function inspectRemoteExcel(candidate: SourceCandidate): Promise<SourceInspectionResult> {
  const buffer = candidate.sourceType === "m365_excel"
    ? await fetchMicrosoftExcelThroughBackend(candidate.normalizedUrl)
    : await fetchArrayBuffer(candidate.normalizedUrl);
  return inspectWorkbookBuffer(candidate, buffer);
}

export async function inspectOnlineSource(candidate: SourceCandidate): Promise<SourceInspectionResult> {
  try {
    if (candidate.sourceType === "google_sheets") {
      const exportUrl = googleSheetsCsvExportUrl(candidate.normalizedUrl);
      try {
        return await inspectRemoteCsv(candidate, exportUrl, "Google Sheet");
      } catch (error: any) {
        if (error?.message === "ACCESS_DENIED") throw error;
        const gvizUrl = googleSheetsGvizCsvUrl(candidate.normalizedUrl);
        return await inspectRemoteCsv(candidate, gvizUrl, "Google Sheet");
      }
    }

    if (candidate.sourceType === "csv_url") {
      return await inspectRemoteCsv(candidate, candidate.normalizedUrl, filenameFromUrl(candidate.normalizedUrl, "CSV URL"));
    }

    if (candidate.sourceType === "excel_url" || candidate.sourceType === "m365_excel") {
      return await inspectRemoteExcel(candidate);
    }

    return {
      status: "unsupported",
      message: "This online source type is not supported by the online inspector."
    };
  } catch (error: any) {
    if (error?.message === "ACCESS_DENIED") {
      return {
        status: "access_denied",
        sourceType: candidate.sourceType,
        label: candidate.label,
        message: `${candidate.label} requires authentication or is not shared publicly.`
      };
    }

    if (candidate.sourceType === "google_sheets" && /failed to fetch/i.test(error?.message ?? "")) {
      return {
        status: "access_denied",
        sourceType: candidate.sourceType,
        label: candidate.label,
        message: "This Google Sheet is not shared publicly, requires sign-in, or is blocked by browser access rules."
      };
    }

    return {
      status: "not_found",
      sourceType: candidate.sourceType,
      label: candidate.label,
      message: `Could not inspect ${candidate.label}. ${error?.message ?? "Unknown error"}`
    };
  }
}
