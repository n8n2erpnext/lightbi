import * as XLSX from 'xlsx';
import type { SourceCandidate, SourceInspectionResult } from './source-preflight';
import { profileColumns } from './column-profiler';
import { createUnderstandingSample, type SemanticSample } from './semantic-sampler';
import { profilePhysicalSource } from './understanding-core/profiler';
import { PHYSICAL_PROFILE_SCHEMA_VERSION } from './understanding-core/profiling-contracts';
import type { CanonicalFullFileProfileV1 } from './understanding-core/canonical-source-boundary';
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from './semantic-registry';
import { generateSemanticCandidateArtifact } from './understanding-core/semantic-candidate-engine';
import { aggregateContextualEvidence } from './understanding-core/contextual-evidence-aggregator';
import { resolveSemanticShadow } from './understanding-core/semantic-resolver';
import { getBuiltInMicroBrainIndex } from './understanding-core/micro-brain/built-in-index';
import { generateGrainCandidateArtifact } from './understanding-core/grain-candidate-engine';
import { resolveGrainSignatureShadow } from './understanding-core/grain-resolver';
import { browserSha256 } from './browser-sha256';
import { parseDelimitedRows } from './physical-column-names';

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

async function fileSha256(file: File, bytes?: ArrayBuffer): Promise<string> {
  return browserSha256(bytes ?? await file.arrayBuffer());
}

function createCanonicalFullFileProfile(args: {
  file: File;
  fingerprint: string;
  sheetName?: string;
  rawRows: readonly (readonly unknown[])[];
  sourceRowCount: number;
  maxHeaderScanRows?: number;
}): CanonicalFullFileProfileV1 & { fullFileUnderstanding: import('./understanding-core/canonical-source-boundary').CanonicalSourceBoundaryV1['fullFileUnderstanding'] } {
  const sourceId = `local:${args.fingerprint}:${args.sheetName ?? 'data'}`;
  const inspectionGeneration = `inspection:${args.fingerprint}`;
  const profileGeneration = `profile:${args.fingerprint}:${args.sheetName ?? 'data'}:${PHYSICAL_PROFILE_SCHEMA_VERSION}`;
  const artifact = profilePhysicalSource({
    schemaVersion: 'lightbi.physical-source-input.v1',
    source: {
      sourceId,
      kind: 'local_file',
      label: args.file.name,
      sheet: args.sheetName,
      hash: { algorithm: 'sha256', value: args.fingerprint },
    },
    rawRows: args.rawRows,
    maxHeaderScanRows: args.maxHeaderScanRows,
  });
  const candidates = generateSemanticCandidateArtifact(artifact, { registry: SEMANTIC_SIGNAL_REGISTRY_V1, microBrain: { index: getBuiltInMicroBrainIndex(), mode: 'selective' } });
  const semantic = resolveSemanticShadow(artifact, candidates, aggregateContextualEvidence(artifact, candidates));
  const grainCandidates = generateGrainCandidateArtifact(artifact, semantic, args.rawRows);
  const grain = resolveGrainSignatureShadow(grainCandidates, { sourceId, sourceHash: grainCandidates.sourceHash });
  return {
    scope: 'full_file',
    datasetId: args.file.name,
    sourceId,
    sourceFingerprint: args.fingerprint,
    sourceRowCount: args.sourceRowCount,
    inspectionGeneration,
    profileGeneration,
    profilerVersion: PHYSICAL_PROFILE_SCHEMA_VERSION,
    artifact,
    fullFileUnderstanding: { semantic, grain },
  };
}

/**
 * Inspect a local file using real parsing.
 * Uses SheetJS for Excel, native Text API for CSV/TXT/TSV, and native JSON parser.
 */
export async function inspectLocalFile(
  candidate: SourceCandidate,
  options: { signal?: AbortSignal; selectedSheetNames?: string[]; workbookManifestOnly?: boolean } = {}
): Promise<SourceInspectionResult> {
  options.signal?.throwIfAborted();
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
    if (file.size < 1024) {
      const smallFileText = await file.text();
      if (smallFileText.startsWith("version https://git-lfs.github.com/spec/v1")) {
        return {
          status: "invalid_format",
          sourceType: candidate.sourceType,
          label: file.name,
          message: "This is a Git LFS placeholder, not the actual data file. Download or restore the original file, then import it again.",
        };
      }
    }
    if (candidate.sourceType === "local_xlsx" || candidate.sourceType === "local_xls") {
      return await inspectExcel(file, candidate, options.signal, options.selectedSheetNames, options.workbookManifestOnly);
    }

    if (candidate.sourceType === "local_csv" || candidate.sourceType === "local_tsv" || candidate.sourceType === "local_txt") {
      return await inspectDelimitedText(file, candidate, options.signal);
    }
    
    if (candidate.sourceType === "local_json") {
      return await inspectJson(file, candidate, options.signal);
    }

    return {
      status: "unsupported",
      message: "Unsupported local file type."
    };
  } catch (err: any) {
    if (options.signal?.aborted || err?.name === "AbortError") throw err;
    console.error("Local file inspection error:", err);
    const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
    const parser = candidate.sourceType === "local_xlsx" || candidate.sourceType === "local_xls"
      ? "sheetjs"
      : candidate.sourceType === "local_json"
        ? "json"
        : candidate.sourceType === "local_csv" || candidate.sourceType === "local_tsv" || candidate.sourceType === "local_txt"
          ? "delimited_text"
          : "unknown";
    return {
      status: "invalid_format",
      sourceType: candidate.sourceType,
      label: file.name,
      message: `Failed to parse file: ${err.message}`,
      diagnostic: {
        fileName: file.name,
        extension,
        mimeType: file.type || "application/octet-stream",
        byteSize: file.size,
        fileObjectAvailable: true,
        parser,
        workerRequestId: null,
        exceptionName: err instanceof Error ? err.name : "Error",
        exceptionMessage: err instanceof Error ? err.message : String(err),
        exceptionStack: err instanceof Error ? err.stack : undefined,
      },
    };
  }
}

type WorkbookSheetSummary = NonNullable<Extract<SourceInspectionResult, { status: "accessible" }>["metadata"]["sheets"]>[string];

function material(value: unknown): boolean {
  return value !== null && value !== undefined && (typeof value !== "string" || value.trim() !== "");
}

function summarizeWorkbookSheet(rows: unknown[][], worksheet?: XLSX.WorkSheet): WorkbookSheetSummary {
  if (rows.length === 0) {
    return {
      rows_count: 0,
      columns: [],
      preview_rows: [],
      preview_matrix: [],
      inspection_state: "summary",
      suitability: "empty",
      suitability_reasons: ["No populated cells were found."],
      used_row_count: 0,
      used_column_count: 0,
    };
  }
  const widths = rows.map(row => row.reduce<number>((last, value, index) => material(value) ? index + 1 : last, 0));
  const usedColumnCount = Math.max(0, ...widths);
  const populatedRows = rows.filter(row => row.some(material));
  const denseRows = populatedRows.filter(row => row.filter(material).length >= 2);
  const density = populatedRows.length ? denseRows.length / populatedRows.length : 0;
  const materialValues = populatedRows.flat().filter(material);
  const numericRatio = materialValues.filter(value => typeof value === 'number').length / Math.max(1, materialValues.length);
  const mergeCount = worksheet?.['!merges']?.length ?? 0;
  const layoutEvidence = mergeCount >= 5 && numericRatio < 0.25;
  const suitability = layoutEvidence || usedColumnCount < 2 || populatedRows.length < 3 || density < 0.35
    ? "layout_or_sparse"
    : usedColumnCount > 80
      ? "complex_table"
      : "tabular";
  const reasons = suitability === "layout_or_sparse"
    ? [layoutEvidence ? "The sheet uses many merged presentation regions and does not look like one analytical table." : "The sheet is sparse or appears to be a layout rather than one rectangular table."]
    : suitability === "complex_table"
      ? ["The sheet is wide or uses a complex header and will be inspected independently."]
      : ["The sheet contains a populated rectangular data region."];
  return {
    rows_count: Math.max(0, populatedRows.length - 1),
    columns: [],
    preview_rows: [],
    preview_matrix: populatedRows.slice(0, 8).map(row => row.slice(0, Math.min(12, usedColumnCount))),
    inspection_state: "summary",
    suitability,
    suitability_reasons: reasons,
    used_row_count: populatedRows.length,
    used_column_count: usedColumnCount,
  };
}

async function inspectExcel(
  file: File,
  candidate: SourceCandidate,
  signal?: AbortSignal,
  selectedSheetNames?: string[],
  workbookManifestOnly = false,
): Promise<SourceInspectionResult> {
  const buffer = await file.arrayBuffer();
  const fingerprint = await fileSha256(file, buffer);
  signal?.throwIfAborted();
  // Read workbook without cell dates to prevent parsing issues, keep it fast.
  const workbook = XLSX.read(buffer, { type: "array" });
  
  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error("Workbook has no sheets.");
  }

  const sheetsData: Record<string, WorkbookSheetSummary> = {};
  const requestedSheets = selectedSheetNames?.filter(name => sheetNames.includes(name));
  const manifestOnly = workbookManifestOnly && sheetNames.length > 1 && !requestedSheets?.length;

  for (const sheetName of sheetNames) {
    signal?.throwIfAborted();
    const worksheet = workbook.Sheets[sheetName];
    if (requestedSheets?.length && !requestedSheets.includes(sheetName)) {
      const range = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null;
      sheetsData[sheetName] = {
        rows_count: range ? Math.max(0, range.e.r - range.s.r) : 0,
        columns: [],
        preview_rows: [],
        preview_matrix: [],
        inspection_state: 'summary',
        suitability: range && range.e.c - range.s.c + 1 >= 2 ? 'complex_table' : 'layout_or_sparse',
        suitability_reasons: ['This sheet was not selected for full inspection.'],
        used_row_count: range ? range.e.r - range.s.r + 1 : 0,
        used_column_count: range ? range.e.c - range.s.c + 1 : 0,
      };
      continue;
    }
    // Explicit workbook selection must preserve physical worksheet row positions.
    // The selected header index is handed to the full-file runtime parser later, so
    // removing blank rows here would turn that physical index into a compressed one.
    // Legacy consumers keep the established SheetJS surface so their frozen corpus
    // fingerprints remain stable.
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, requestedSheets?.length || manifestOnly
      ? { header: 1, defval: null, raw: true, blankrows: true }
      : { header: 1 });
    const summary = summarizeWorkbookSheet(rows, worksheet);

    if (manifestOnly) {
      sheetsData[sheetName] = summary;
      continue;
    }

    if (rows.length === 0) {
      sheetsData[sheetName] = summary;
      continue;
    }
    let provisionalProfile;
    try {
      provisionalProfile = createCanonicalFullFileProfile({
        file,
        fingerprint,
        sheetName,
        rawRows: rows,
        sourceRowCount: Math.max(0, rows.length - 1),
      });
    } catch (error) {
      sheetsData[sheetName] = {
        ...summary,
        inspection_state: "profile_error",
        profile_error: error instanceof Error ? error.message : String(error),
      };
      continue;
    }
    const physical = provisionalProfile.artifact.sourceProfile;
    const headerIndex = physical.header.selectedHeaderRowIndex;
    const columns = physical.header.physicalColumnNames;
    const dataRows = headerIndex === null
      ? []
      : rows
          .slice(headerIndex + 1)
          .filter(row => row.some(value => value !== null && value !== undefined && String(value).trim() !== ""));
    const canonicalFullFileProfile = {
      ...provisionalProfile,
      sourceRowCount: physical.dataRegion.rowCount,
    };
    
    // Create all objects for profiling
    const allObjects = dataRows.map(rowArray => {
      const obj: Record<string, any> = {};
      columns.forEach((col, idx) => {
        obj[col] = rowArray[idx];
      });
      return obj;
    });

    const previewObjects = createRepresentativeRows(allObjects, 1000);
    const semanticSample = createUnderstandingSample(allObjects, {
      seed: sampleSeed(`${file.name}:${sheetName}`, columns, allObjects.length)
    });
    const profiles = profileColumns(columns, semanticSample.rows, dataRows.length);
    const retainedAnalysisRows = retainAnalysisRows(allObjects);

    sheetsData[sheetName] = {
      ...summary,
      rows_count: dataRows.length,
      columns,
      preview_rows: previewObjects,
      semantic_rows: semanticSample.rows,
      semantic_sample: semanticSampleMetadata(semanticSample),
      analysis_rows: retainedAnalysisRows,
      analysis_row_scope: retainedAnalysisRows ? "full" : "not_retained",
      canonical_full_file_profile: canonicalFullFileProfile,
      profiles,
      inspection_state: "profiled",
    };
  }

  const profiledSheetNames = sheetNames.filter(name => sheetsData[name]?.inspection_state === "profiled");
  // A multi-sheet workbook is a manifest until the user explicitly chooses one or more sheets.
  const defaultSheet = profiledSheetNames[0];
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
      requires_sheet_selection: manifestOnly,
      selected_sheet_names: profiledSheetNames,
      sheets: sheetsData,
      profiles: defaultProfiles
    },
    file
  };
}

async function inspectDelimitedText(file: File, candidate: SourceCandidate, signal?: AbortSignal): Promise<SourceInspectionResult> {
  const text = await file.text();
  const fingerprint = await fileSha256(file);
  signal?.throwIfAborted();
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

  const matrix = parseDelimitedRows(text.replace(/^\uFEFF/, ''), delimiter);
  const rawDataRows = matrix.slice(1);
  const canonicalFullFileProfile = createCanonicalFullFileProfile({
    file,
    fingerprint,
    rawRows: matrix,
    sourceRowCount: rawDataRows.length,
    maxHeaderScanRows: 1,
  });
  const columns = canonicalFullFileProfile.artifact.sourceProfile.header.physicalColumnNames;
  const allObjects = rawDataRows.map(values => {
    const obj: Record<string, string> = {};
    columns.forEach((col, idx) => {
      obj[col] = values[idx]?.trim() ?? '';
    });
    return obj;
  });

  const preview_rows = createRepresentativeRows(allObjects, 1000);
  const semanticSample = createUnderstandingSample(allObjects, {
    seed: sampleSeed(file.name, columns, allObjects.length)
  });
  const profiles = profileColumns(columns, semanticSample.rows, rawDataRows.length);
  const retainedAnalysisRows = retainAnalysisRows(allObjects);

  return {
    status: "accessible",
    sourceType: candidate.sourceType,
    label: candidate.label,
    normalizedUrl: candidate.normalizedUrl,
    metadata: {
      name: file.name,
      rows_count: rawDataRows.length,
      columns,
      preview_rows,
      semantic_rows: semanticSample.rows,
      semantic_sample: semanticSampleMetadata(semanticSample),
      analysis_rows: retainedAnalysisRows,
      analysis_row_scope: retainedAnalysisRows ? "full" : "not_retained",
      canonical_full_file_profile: canonicalFullFileProfile,
      detected_delimiter: delimiter === "\t" ? "tab" : delimiter,
      profiles
    },
    file
  };
}

async function inspectJson(file: File, candidate: SourceCandidate, signal?: AbortSignal): Promise<SourceInspectionResult> {
  const text = await file.text();
  const fingerprint = await fileSha256(file);
  signal?.throwIfAborted();
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
  const semanticSample = createUnderstandingSample(dataArray, {
    seed: sampleSeed(file.name, columns, dataArray.length)
  });
  const retainedAnalysisRows = retainAnalysisRows(dataArray);
  const canonicalFullFileProfile = createCanonicalFullFileProfile({
    file,
    fingerprint,
    rawRows: [columns, ...dataArray.map(row => columns.map(column => row?.[column]))],
    sourceRowCount: dataArray.length,
  });

  return {
    status: "accessible",
    sourceType: candidate.sourceType,
    label: candidate.label,
    normalizedUrl: candidate.normalizedUrl,
    metadata: {
      name: file.name,
      rows_count: dataArray.length,
      columns,
      preview_rows: createRepresentativeRows(dataArray, 1000),
      semantic_rows: semanticSample.rows,
      semantic_sample: semanticSampleMetadata(semanticSample),
      analysis_rows: retainedAnalysisRows,
      analysis_row_scope: retainedAnalysisRows ? "full" : "not_retained",
      canonical_full_file_profile: canonicalFullFileProfile,
      detected_fields: columns,
      profiles: profileColumns(columns, semanticSample.rows, dataArray.length)
    },
    file
  };
}
