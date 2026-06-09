import * as XLSX from 'xlsx';
import type { SourceCandidate, SourceInspectionResult } from './source-preflight';
import { profileColumns } from './column-profiler';

/**
 * Inspect a local file using real parsing.
 * Uses SheetJS for Excel, native Text API for CSV/TXT/TSV, and native JSON parser.
 */
export async function inspectLocalFile(candidate: SourceCandidate): Promise<SourceInspectionResult> {
  const file = candidate.file;
  if (!file) {
    return {
      status: "not_found",
      sourceType: candidate.sourceType,
      label: candidate.label,
      message: "No file object found."
    };
  }

  try {
    if (candidate.sourceType === "local_xlsx" || candidate.sourceType === "local_xls") {
      return await inspectExcel(file, candidate);
    }
    
    if (candidate.sourceType === "local_csv" || candidate.sourceType === "local_tsv" || candidate.sourceType === "local_txt") {
      return await inspectDelimitedText(file, candidate);
    }
    
    if (candidate.sourceType === "local_json") {
      return await inspectJson(file, candidate);
    }

    return {
      status: "unsupported",
      message: "Unsupported local file type."
    };
  } catch (err: any) {
    console.error("Local file inspection error:", err);
    return {
      status: "invalid_format",
      sourceType: candidate.sourceType,
      message: `Failed to parse file: ${err.message}`
    };
  }
}

async function inspectExcel(file: File, candidate: SourceCandidate): Promise<SourceInspectionResult> {
  const buffer = await file.arrayBuffer();
  // Read workbook without cell dates to prevent parsing issues, keep it fast.
  const workbook = XLSX.read(buffer, { type: "array" });
  
  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error("Workbook has no sheets.");
  }

  const sheetsData: Record<string, any> = {};

  for (const sheetName of sheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    // sheet_to_json with header: 1 returns array of arrays
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    
    if (rows.length === 0) {
      sheetsData[sheetName] = {
        rows_count: 0,
        columns: [],
        preview_rows: []
      };
      continue;
    }

    const headerRow = rows[0] || [];
    const columns = headerRow.map((col: any) => String(col).trim()).filter(Boolean);
    const dataRows = rows.slice(1).filter(r => r.length > 0);
    
    // Create all objects for profiling
    const allObjects = dataRows.map(rowArray => {
      const obj: Record<string, any> = {};
      columns.forEach((col, idx) => {
        obj[col] = rowArray[idx];
      });
      return obj;
    });

    const previewObjects = allObjects.slice(0, 10);
    const profiles = profileColumns(columns, allObjects, dataRows.length);

    sheetsData[sheetName] = {
      rows_count: dataRows.length,
      columns,
      preview_rows: previewObjects,
      profiles
    };
  }

  // Use the default sheet's profiles at the top level
  const defaultSheet = sheetNames[0];
  const defaultProfiles = sheetsData[defaultSheet]?.profiles || {};

  return {
    status: "accessible",
    sourceType: candidate.sourceType,
    label: candidate.label,
    normalizedUrl: candidate.normalizedUrl,
    metadata: {
      name: file.name,
      is_workbook: true,
      sheet_count: sheetNames.length,
      sheet_names: sheetNames,
      default_sheet: defaultSheet,
      sheets: sheetsData,
      profiles: defaultProfiles
    },
    file
  };
}

async function inspectDelimitedText(file: File, candidate: SourceCandidate): Promise<SourceInspectionResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    throw new Error("File is empty.");
  }

  // Detect delimiter based on the first line
  const firstLine = lines[0];
  let delimiter = ",";
  if (candidate.sourceType === "local_tsv") delimiter = "\t";
  else if (candidate.sourceType === "local_csv") delimiter = ",";
  else {
    // Basic detection for txt
    const counts = {
      ",": (firstLine.match(/,/g) || []).length,
      "\t": (firstLine.match(/\t/g) || []).length,
      ";": (firstLine.match(/;/g) || []).length,
      "|": (firstLine.match(/\|/g) || []).length
    };
    // Get highest count
    delimiter = Object.keys(counts).reduce((a, b) => counts[a as keyof typeof counts] > counts[b as keyof typeof counts] ? a : b);
  }

  const columns = firstLine.split(delimiter).map(c => c.trim()).filter(Boolean);
  const dataLines = lines.slice(1);
  
  const allObjects = dataLines.map(line => {
    const values = line.split(delimiter);
    const obj: Record<string, string> = {};
    columns.forEach((col, idx) => {
      obj[col] = values[idx]?.trim();
    });
    return obj;
  });

  const preview_rows = allObjects.slice(0, 10);
  const profiles = profileColumns(columns, allObjects, dataLines.length);

  return {
    status: "accessible",
    sourceType: candidate.sourceType,
    label: candidate.label,
    normalizedUrl: candidate.normalizedUrl,
    metadata: {
      name: file.name,
      rows_count: dataLines.length,
      columns,
      preview_rows,
      detected_delimiter: delimiter === "\t" ? "tab" : delimiter,
      profiles
    },
    file
  };
}

async function inspectJson(file: File, candidate: SourceCandidate): Promise<SourceInspectionResult> {
  const text = await file.text();
  const json = JSON.parse(text);

  let dataArray: any[] = [];

  if (Array.isArray(json)) {
    dataArray = json;
  } else if (typeof json === "object" && json !== null) {
    // Find the first array field
    const arrayKey = Object.keys(json).find(key => Array.isArray(json[key]));
    if (arrayKey) {
      dataArray = json[arrayKey];
    } else {
      throw new Error("JSON must be an array of objects or contain an array field.");
    }
  } else {
    throw new Error("Invalid JSON structure.");
  }

  if (dataArray.length === 0) {
    throw new Error("JSON array is empty.");
  }

  const firstObj = dataArray.find(item => typeof item === "object" && item !== null) || {};
  const columns = Object.keys(firstObj);

  return {
    status: "accessible",
    sourceType: candidate.sourceType,
    label: candidate.label,
    normalizedUrl: candidate.normalizedUrl,
    metadata: {
      name: file.name,
      rows_count: dataArray.length,
      columns,
      preview_rows: dataArray.slice(0, 10),
      detected_fields: columns,
      profiles: profileColumns(columns, dataArray, dataArray.length)
    },
    file
  };
}
