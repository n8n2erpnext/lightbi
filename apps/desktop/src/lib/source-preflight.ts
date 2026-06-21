/**
 * Source Preflight Module
 *
 * Architecture boundary rule:
 *   URL → SourceCandidate → runSourcePreflight → SourceInspectionResult
 *
 * Only SourceInspectionResult.status === "accessible" may lead to a dataset.
 * A URL alone NEVER creates a dataset, capability detection, or suggestions.
 */

import type { ColumnProfile } from './column-profiler';

export type SourceType =
  | "google_sheets"
  | "m365_excel"
  | "csv_url"
  | "excel_url"
  | "local_csv"
  | "local_xlsx"
  | "local_xls"
  | "local_txt"
  | "local_tsv"
  | "local_json"
  | "postgresql"
  | "mysql"
  | "mariadb"
  | "mongodb_atlas"
  | "sqlite";

export type SourceCandidate = {
  sourceType: SourceType;
  label: string;
  rawUrl: string;
  normalizedUrl: string;
  file?: File;
};

export type SourceInspectionResult =
  | {
      status: "accessible";
      sourceType: SourceType;
      label: string;
      normalizedUrl: string;
      metadata: {
        name: string;
        rows_count?: number;
        columns?: string[];
        preview_rows?: any[];
        semantic_rows?: any[];
        semantic_sample?: {
          strategy: "full" | "matrix_sample";
          source_row_count: number;
          sample_row_count: number;
          row_indexes?: number[];
        };
        analysis_rows?: any[];
        analysis_row_scope?: "full" | "not_retained";
        profiles?: Record<string, ColumnProfile>;
        is_workbook?: boolean;
        sheets?: Record<string, {
          rows_count: number;
          columns: string[];
          preview_rows: any[];
          semantic_rows?: any[];
          semantic_sample?: {
            strategy: "full" | "matrix_sample";
            source_row_count: number;
            sample_row_count: number;
            row_indexes?: number[];
          };
          analysis_rows?: any[];
          analysis_row_scope?: "full" | "not_retained";
          profiles?: Record<string, ColumnProfile>;
        }>;
        default_sheet?: string;
        sheet_count?: number;
        sheet_names?: string[];
        detected_delimiter?: string;
        detected_fields?: string[];
      };
      file?: File;
    }
  | {
      status: "invalid_format";
      sourceType?: SourceType;
      message: string;
      expectedFormat?: string;
    }
  | {
      status: "access_denied";
      sourceType: SourceType;
      label: string;
      message: string;
    }
  | {
      status: "not_found";
      sourceType: SourceType;
      label: string;
      message: string;
    }
  | {
      status: "no_data";
      sourceType: SourceType;
      label: string;
      message: string;
    }
  | {
      status: "unsupported";
      message: string;
    };

/**
 * Normalize a URL by ensuring it has https:// prefix.
 */
function normalizeUrl(raw: string): string {
  const lower = raw.toLowerCase();
  if (!lower.startsWith("http://") && !lower.startsWith("https://")) {
    return `https://${raw}`;
  }
  return raw;
}

/**
 * Create a SourceCandidate from raw user input.
 *
 * Returns SourceCandidate if valid format is recognized.
 * Returns SourceInspectionResult (invalid_format / unsupported) if not.
 *
 * Google Sheets valid format:
 *   https://docs.google.com/spreadsheets/d/{non-empty-sheet-id}/...
 *   docs.google.com/spreadsheets/d/{non-empty-sheet-id}/...
 *
 * Invalid:
 *   https://docs.google.com/spreadsheets/d/          ← empty sheet id
 *   https://docs.google.com/spreadsheets/            ← no /d/ segment
 *   https://google.com/spreadsheets/d/abc            ← wrong subdomain
 *   https://ai.google.com/spreadsheets/d/abc         ← wrong subdomain
 *   https://drive.google.com/spreadsheets/d/abc      ← wrong subdomain
 */
export function createSourceCandidate(
  input: string
): SourceCandidate | SourceInspectionResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { status: "invalid_format", message: "Empty input." };
  }

  const normalized = normalizeUrl(trimmed);
  const lower = normalized.toLowerCase();

  // ─── Google Sheets ────────────────────────────────────────────────────────
  // Must be exactly docs.google.com (not google.com, drive.google.com, ai.google.com, etc.)
  if (lower.includes("google.com/spreadsheets")) {
    const isValidSubdomain =
      lower.startsWith("https://docs.google.com/spreadsheets") ||
      lower.startsWith("http://docs.google.com/spreadsheets");

    if (!isValidSubdomain) {
      return {
        status: "unsupported",
        message:
          "Only links from docs.google.com/spreadsheets are supported. Links from google.com, drive.google.com, or ai.google.com are not valid Google Sheets URLs.",
      };
    }

    // Must have /d/{sheet_id} where sheet_id is non-empty
    const spreadsheetIdMatch = normalized.match(
      /\/spreadsheets\/d\/([^/?#]+)/i
    );
    const sheetId = spreadsheetIdMatch?.[1] ?? "";

    if (!sheetId) {
      return {
        status: "invalid_format",
        sourceType: "google_sheets",
        message: "This Google Sheets URL is missing a sheet ID.",
        expectedFormat:
          "https://docs.google.com/spreadsheets/d/{sheet_id}/...",
      };
    }

    return {
      sourceType: "google_sheets",
      label: "Google Sheets",
      rawUrl: trimmed,
      normalizedUrl: normalized,
    };
  }

  // ─── Microsoft 365 Excel ─────────────────────────────────────────────────
  if (
    lower.includes("sharepoint.com") ||
    lower.includes("1drv.ms") ||
    lower.includes("onedrive.live.com") ||
    lower.includes("office.com")
  ) {
    return {
      sourceType: "m365_excel",
      label: "Microsoft 365 Excel",
      rawUrl: trimmed,
      normalizedUrl: normalized,
    };
  }

  // ─── CSV URL ──────────────────────────────────────────────────────────────
  if (lower.includes(".csv")) {
    try {
      const urlObj = new URL(normalized);
      if (urlObj.pathname.endsWith(".csv")) {
        return {
          sourceType: "csv_url",
          label: "CSV URL",
          rawUrl: trimmed,
          normalizedUrl: normalized,
        };
      }
    } catch {
      // fall through to unsupported
    }
  }

  // ─── Excel URL ────────────────────────────────────────────────────────────
  if (lower.includes(".xlsx") || lower.includes(".xls")) {
    try {
      const urlObj = new URL(normalized);
      if (
        urlObj.pathname.endsWith(".xlsx") ||
        urlObj.pathname.endsWith(".xls")
      ) {
        return {
          sourceType: "excel_url",
          label: "Excel URL",
          rawUrl: trimmed,
          normalizedUrl: normalized,
        };
      }
    } catch {
      // fall through
    }
  }

  return {
    status: "unsupported",
    message:
      "This link is not a recognized data source. Supported: Google Sheets, Microsoft 365 Excel, CSV URL, Excel URL.",
  };
}

/**
 * Run source preflight against a SourceCandidate.
 *
 * NOTE: This is a mock implementation until real connector backend is ready.
 *
 * Mock rules for Google Sheets (deterministic, honest):
 *   - URL contains "public-demo"  → accessible (mock metadata)
 *   - URL contains "private" or "denied" → access_denied
 *   - URL contains "empty"        → no_data
 *   - Everything else             → not_found
 *
 * A real-looking URL like /d/17bc.../ will return not_found.
 * Frontend cannot know real access. Only connector can.
 */
export async function runSourcePreflight(
  candidate: SourceCandidate
): Promise<SourceInspectionResult> {
  const url = candidate.normalizedUrl.toLowerCase();

  if (candidate.sourceType === "google_sheets") {
    if (url.includes("public-demo")) {
      return {
        status: "accessible",
        sourceType: "google_sheets",
        label: "Google Sheets",
        normalizedUrl: candidate.normalizedUrl,
        metadata: {
          name: "Public Demo Dataset",
          rows_count: 1240,
          columns: ["date", "product", "revenue", "quantity", "branch"],
        },
      };
    }

    if (url.includes("private") || url.includes("denied")) {
      return {
        status: "access_denied",
        sourceType: "google_sheets",
        label: "Google Sheets",
        message:
          "This Google Sheet is private or sharing is disabled. Make sure the sheet is shared with 'Anyone with the link'.",
      };
    }

    if (url.includes("empty")) {
      return {
        status: "no_data",
        sourceType: "google_sheets",
        label: "Google Sheets",
        message:
          "This Google Sheet appears to be empty or has no readable data rows.",
      };
    }

    // All other Google Sheets URLs → not_found
    // This is intentional: frontend cannot validate real access.
    return {
      status: "not_found",
      sourceType: "google_sheets",
      label: "Google Sheets",
      message:
        "Could not access this Google Sheet. It may not exist, may have been deleted, or the URL may be incorrect.",
    };
  }

  if (candidate.sourceType === "csv_url") {
    if (url.includes("public-demo")) {
      return {
        status: "accessible",
        sourceType: "csv_url",
        label: "CSV URL",
        normalizedUrl: candidate.normalizedUrl,
        metadata: {
          name: "Public Demo CSV",
          rows_count: 500,
          columns: ["id", "name", "value", "category"],
        },
      };
    }
    return {
      status: "not_found",
      sourceType: "csv_url",
      label: "CSV URL",
      message:
        "Could not access this CSV file. The URL may be invalid or the file may be private.",
    };
  }

  if (candidate.sourceType === "m365_excel") {
    if (url.includes("public-demo")) {
      return {
        status: "accessible",
        sourceType: "m365_excel",
        label: "Microsoft 365 Excel",
        normalizedUrl: candidate.normalizedUrl,
        metadata: {
          name: "Public Demo Excel",
          rows_count: 800,
          columns: ["month", "sales", "cost", "profit"],
        },
      };
    }
    return {
      status: "not_found",
      sourceType: "m365_excel",
      label: "Microsoft 365 Excel",
      message:
        "Could not access this Microsoft 365 Excel file. Make sure it is shared publicly.",
    };
  }

  if (candidate.sourceType === "excel_url") {
    if (url.includes("public-demo")) {
      return {
        status: "accessible",
        sourceType: "excel_url",
        label: "Excel URL",
        normalizedUrl: candidate.normalizedUrl,
        metadata: {
          name: "Public Demo Excel File",
          rows_count: 320,
          columns: ["sku", "stock", "price"],
        },
      };
    }
    return {
      status: "not_found",
      sourceType: "excel_url",
      label: "Excel URL",
      message:
        "Could not access this Excel file. The URL may be invalid or require authentication.",
    };
  }


  return {
    status: "unsupported",
    message: "This source type is not yet supported by the preflight system.",
  };
}

/**
 * Create a SourceCandidate from a local File object.
 */
export function createFileSourceCandidate(
  file: File
): SourceCandidate | SourceInspectionResult {
  const name = file.name.toLowerCase();
  let sourceType: SourceType | null = null;
  let label = "";

  if (name.endsWith(".csv")) {
    sourceType = "local_csv";
    label = "Local CSV";
  } else if (name.endsWith(".xlsx")) {
    sourceType = "local_xlsx";
    label = "Local Excel (XLSX)";
  } else if (name.endsWith(".xls")) {
    sourceType = "local_xls";
    label = "Local Excel (XLS)";
  } else if (name.endsWith(".txt")) {
    sourceType = "local_txt";
    label = "Local Text (TXT)";
  } else if (name.endsWith(".tsv")) {
    sourceType = "local_tsv";
    label = "Local TSV";
  } else if (name.endsWith(".json")) {
    sourceType = "local_json";
    label = "Local JSON";
  }

  if (!sourceType) {
    return {
      status: "unsupported",
      message: "Unsupported file type. Supported: CSV, Excel, TXT, TSV, JSON.",
    };
  }

  return {
    sourceType,
    label,
    rawUrl: file.name,
    normalizedUrl: `file://${file.name}`,
    file,
  };
}
