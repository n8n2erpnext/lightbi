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
  const candidates = generateSemanticCandidateArtifact(artifact, { registry: SEMANTIC_SIGNAL_REGISTRY_V1 });
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
  options: { signal?: AbortSignal } = {}
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
      return await inspectExcel(file, candidate, options.signal);
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

async function inspectExcel(file: File, candidate: SourceCandidate, signal?: AbortSignal): Promise<SourceInspectionResult> {
  const buffer = await file.arrayBuffer();
  const fingerprint = await fileSha256(file, buffer);
  signal?.throwIfAborted();
  // Read workbook without cell dates to prevent parsing issues, keep it fast.
  const workbook = XLSX.read(buffer, { type: "array" });
  
  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    throw new Error("Workbook has no sheets.");
  }

  const sheetsData: Record<string, any> = {};

  for (const sheetName of sheetNames) {
    signal?.throwIfAborted();
    const worksheet = workbook.Sheets[sheetName];
    // sheet_to_json with header: 1 returns array of arrays
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    
    if (rows.length === 0) {
      sheetsData[sheetName] = {
        rows_count: 0,
        columns: [],
        preview_rows: [],
        semantic_rows: [],
        semantic_sample: {
          strategy: "full",
          source_row_count: 0,
          sample_row_count: 0,
          row_indexes: []
        },
        analysis_rows: [],
        analysis_row_scope: "full"
      };
      continue;
    }

    const provisionalProfile = createCanonicalFullFileProfile({
      file,
      fingerprint,
      sheetName,
      rawRows: rows,
      sourceRowCount: Math.max(0, rows.length - 1),
    });
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
      rows_count: dataRows.length,
      columns,
      preview_rows: previewObjects,
      semantic_rows: semanticSample.rows,
      semantic_sample: semanticSampleMetadata(semanticSample),
      analysis_rows: retainedAnalysisRows,
      analysis_row_scope: retainedAnalysisRows ? "full" : "not_retained",
      canonical_full_file_profile: canonicalFullFileProfile,
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
