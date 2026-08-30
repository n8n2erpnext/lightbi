import * as XLSX from 'xlsx';
import type { AdvancedSourceTable, AdvancedWorkspaceSource } from '../stores/advanced-source-store';
import { materializeRuntimeDatasetSource } from './full-file-runtime-materializer';
import { validateCanonicalSourceBoundary, type CanonicalSourceBoundaryV1 } from './understanding-core/canonical-source-boundary';

export const CLEAN_DATA_HANDOFF_VERSION = 'lightbi.clean-data-handoff.v1' as const;

export type CleanDataLineageV1 = {
  sourceColumn: string;
  outputColumn: string;
  physicalType: string;
  semanticConcept: string | null;
  semanticState: string;
  nullable: boolean;
  qualityIssues: string[];
  transformations: Array<'canonical_name' | 'trim_text' | 'blank_to_null' | 'preserve_value'>;
};

export type CleanDataAuditEntryV1 = {
  operation: 'canonical_name' | 'trim_text' | 'blank_to_null';
  column: string;
  affectedValues: number;
};

export type CleanDataHandoffArtifactV1 = {
  schemaVersion: typeof CLEAN_DATA_HANDOFF_VERSION;
  artifactId: string;
  createdAt: string;
  source: {
    sourceId: string;
    sourceName: string;
    sourceFingerprint: string | null;
    sourceRows: number;
    sourceColumns: number;
    sourcePreserved: true;
  };
  grain: {
    structuralForm: string;
    identityBasis: string;
    temporalMode: string;
    aggregationForm: string;
    readiness: string;
  };
  lineage: CleanDataLineageV1[];
  candidateKeys: string[];
  qualityCaveats: string[];
  auditTrail: CleanDataAuditEntryV1[];
  output: {
    rowCount: number;
    columnCount: number;
    powerBiReady: true;
    originalRowsMutated: false;
  };
};

export type CleanDataHandoffResultV1 = {
  artifact: CleanDataHandoffArtifactV1;
  cleanRows: Record<string, unknown>[];
};

function normalizedColumnName(value: string): string {
  const normalized = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return normalized || 'unnamed_field';
}

function uniqueOutputNames(candidates: string[]): string[] {
  const counts = new Map<string, number>();
  return candidates.map(candidate => {
    const next = (counts.get(candidate) ?? 0) + 1;
    counts.set(candidate, next);
    return next === 1 ? candidate : `${candidate}_${next}`;
  });
}

function lookupValue(row: Record<string, unknown>, sourceColumn: string): unknown {
  if (Object.prototype.hasOwnProperty.call(row, sourceColumn)) return row[sourceColumn];
  const normalized = sourceColumn.trim().toLowerCase();
  return row[normalized];
}

function stableArtifactId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `clean:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export async function createCleanDataHandoff(
  source: AdvancedWorkspaceSource,
  table: AdvancedSourceTable,
  signal?: AbortSignal,
): Promise<CleanDataHandoffResultV1> {
  const boundary = source.canonicalSourceBoundary;
  if (boundary) {
    const validation = validateCanonicalSourceBoundary(boundary);
    if (!validation.valid) throw new Error(`CLEAN_HANDOFF_SOURCE_INVALID:${validation.blockers.join(',')}`);
  }
  const runtimeSource = boundary?.runtimeSource ?? {
    kind: 'local_files' as const,
    files: [{ file: table.file, sheetName: table.sheetName }],
    sourceRowCount: table.rowCount,
  };
  const materialized = await materializeRuntimeDatasetSource(runtimeSource, signal, boundary?.runtimeSource.binding);
  const rows = JSON.parse(materialized.jsonText) as Record<string, unknown>[];
  const physicalProfiles = boundary?.fullFileProfile.artifact.sourceProfile.columns ?? [];
  const semanticColumns = boundary?.fullFileUnderstanding.semantic.columns ?? [];
  const sourceColumns = physicalProfiles.length
    ? physicalProfiles.map(column => column.physicalColumnName)
    : table.columns;
  const outputNames = uniqueOutputNames(sourceColumns.map((column, index) => {
    const semantic = semanticColumns.find(item => item.sourceColumnIndex === index || item.physicalColumn === column);
    return normalizedColumnName(semantic?.selectedCandidateId || column);
  }));
  const auditCounts = new Map<string, number>();
  const cleanRows = rows.map(row => Object.fromEntries(sourceColumns.map((column, index) => {
    const outputColumn = outputNames[index];
    const original = lookupValue(row, column);
    let value = original;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== value) auditCounts.set(`trim_text:${outputColumn}`, (auditCounts.get(`trim_text:${outputColumn}`) ?? 0) + 1);
      value = trimmed;
      if (trimmed === '') {
        auditCounts.set(`blank_to_null:${outputColumn}`, (auditCounts.get(`blank_to_null:${outputColumn}`) ?? 0) + 1);
        value = null;
      }
    }
    if (outputColumn !== column) auditCounts.set(`canonical_name:${outputColumn}`, rows.length);
    return [outputColumn, value];
  })));
  const lineage: CleanDataLineageV1[] = sourceColumns.map((column, index) => {
    const profile = physicalProfiles[index];
    const semantic = semanticColumns.find(item => item.sourceColumnIndex === index || item.physicalColumn === column);
    const physicalType = profile?.physicalTypeCandidates[0]?.type ?? table.profiles[column]?.dataType ?? 'unknown';
    const transformations: CleanDataLineageV1['transformations'] = ['preserve_value', 'trim_text', 'blank_to_null'];
    if (outputNames[index] !== column) transformations.unshift('canonical_name');
    return {
      sourceColumn: column,
      outputColumn: outputNames[index],
      physicalType,
      semanticConcept: semantic?.selectedCandidateId ?? null,
      semanticState: semantic?.finalState ?? 'unknown',
      nullable: (profile?.nullCount ?? Math.round((table.profiles[column]?.nullPercent ?? 0) * table.rowCount / 100)) > 0,
      qualityIssues: [...new Set(profile?.issues.map(issue => issue.code) ?? [])].sort(),
      transformations,
    };
  });
  const grain = boundary?.fullFileUnderstanding.grain;
  const qualityCaveats = [...new Set([
    ...(boundary?.fullFileProfile.artifact.sourceProfile.issues.map(issue => issue.code) ?? []),
    ...(boundary?.fullFileProfile.artifact.limitations ?? []),
    ...(grain?.limitations.map(item => item.code) ?? []),
  ])].sort();
  const candidateKeys = lineage.filter((_, index) => physicalProfiles[index]?.uniqueness.isUnique === true).map(item => item.outputColumn);
  const auditTrail: CleanDataAuditEntryV1[] = [...auditCounts.entries()].map(([key, affectedValues]) => {
    const separator = key.indexOf(':');
    return { operation: key.slice(0, separator) as CleanDataAuditEntryV1['operation'], column: key.slice(separator + 1), affectedValues };
  }).sort((left, right) => left.column.localeCompare(right.column) || left.operation.localeCompare(right.operation));
  const fingerprint = boundary?.sourceFingerprint ?? null;
  const artifactSeed = JSON.stringify({ source: source.id, table: table.id, fingerprint, lineage, rows: rows.length });
  return {
    artifact: {
      schemaVersion: CLEAN_DATA_HANDOFF_VERSION,
      artifactId: stableArtifactId(artifactSeed),
      createdAt: new Date().toISOString(),
      source: { sourceId: source.id, sourceName: source.name, sourceFingerprint: fingerprint, sourceRows: rows.length, sourceColumns: sourceColumns.length, sourcePreserved: true },
      grain: {
        structuralForm: grain?.signature.structuralForm.value ?? 'unknown',
        identityBasis: grain?.signature.identityBasis.value ?? 'unknown',
        temporalMode: grain?.signature.temporalMode.value ?? 'unresolved',
        aggregationForm: grain?.signature.aggregationForm.value ?? 'unresolved',
        readiness: grain?.overallReadiness ?? 'fully_unresolved',
      },
      lineage,
      candidateKeys,
      qualityCaveats,
      auditTrail,
      output: { rowCount: cleanRows.length, columnCount: lineage.length, powerBiReady: true, originalRowsMutated: false },
    },
    cleanRows,
  };
}


export async function createCleanDataHandoffFromCanonicalBoundary(
  boundary: CanonicalSourceBoundaryV1,
  sourceName = boundary.datasetId,
  signal?: AbortSignal,
): Promise<CleanDataHandoffResultV1> {
  const validation = validateCanonicalSourceBoundary(boundary);
  if (!validation.valid) throw new Error(`CLEAN_HANDOFF_SOURCE_INVALID:${validation.blockers.join(',')}`);
  const runtimeFile = boundary.runtimeSource.files[0];
  if (!runtimeFile) throw new Error('CLEAN_HANDOFF_RUNTIME_FILE_REQUIRED');
  const columns = boundary.fullFileProfile.artifact.sourceProfile.columns.map(column => column.physicalColumnName);
  const table: AdvancedSourceTable = {
    id: 'canonical:full-file',
    name: sourceName,
    rowCount: boundary.sourceRowCount,
    columns,
    profiles: {},
    file: runtimeFile.file,
    sheetName: runtimeFile.sheetName,
  };
  const source: AdvancedWorkspaceSource = {
    id: boundary.sourceId,
    name: sourceName,
    sourceType: 'canonical_source',
    sourceKind: 'local_file',
    tables: [table],
    semanticSample: {
      strategy: boundary.semanticSample.strategy,
      sourceRowCount: boundary.sourceRowCount,
      sampleRowCount: boundary.semanticSample.rows.length,
    },
    canonicalSourceBoundary: boundary,
    registeredAt: new Date().toISOString(),
  };
  return createCleanDataHandoff(source, table, signal);
}

export function createPowerBiWorkbook(result: CleanDataHandoffResultV1): ArrayBuffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(result.cleanRows), 'Clean Data');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(result.artifact.lineage.map(item => ({
    'Raw column': item.sourceColumn,
    'Clean column': item.outputColumn,
    'Physical type': item.physicalType,
    'Canonical concept': item.semanticConcept ?? '',
    'Semantic state': item.semanticState,
    'Nullable': item.nullable ? 'Yes' : 'No',
    'Transformations': item.transformations.join(', '),
    'Quality issues': item.qualityIssues.join(', '),
  }))), 'Data Dictionary');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(result.artifact.auditTrail), 'Transformation Audit');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['LightBI Clean Data Handoff', result.artifact.schemaVersion],
    ['Artifact ID', result.artifact.artifactId],
    ['Source', result.artifact.source.sourceName],
    ['Source fingerprint', result.artifact.source.sourceFingerprint ?? 'Unavailable'],
    ['Source preserved', 'Yes'],
    ['Rows', result.artifact.output.rowCount],
    ['Columns', result.artifact.output.columnCount],
    ['Grain', result.artifact.grain.structuralForm],
    ['Identity basis', result.artifact.grain.identityBasis],
    ['Temporal mode', result.artifact.grain.temporalMode],
    ['Candidate keys', result.artifact.candidateKeys.join(', ')],
    ['Quality caveats', result.artifact.qualityCaveats.join(', ')],
  ]), 'Handoff Manifest');
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx', compression: true }) as ArrayBuffer;
}

export function downloadPowerBiWorkbook(result: CleanDataHandoffResultV1): void {
  const buffer = createPowerBiWorkbook(result);
  const stem = result.artifact.source.sourceName.replace(/[^a-z0-9_-]+/gi, '_') || 'lightbi-clean-data';
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${stem}-PowerBI-ready.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export interface CleanDataSaveResult {
  fileName: string;
  locationLabel: string;
  usedSaveAs: boolean;
}

type SaveFileHandle = { name: string; createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> };
type SavePickerWindow = Window & { showSaveFilePicker?: (options: Record<string, unknown>) => Promise<SaveFileHandle> };

/**
 * Lets desktop-capable browsers choose a name and destination. Browsers that do
 * not expose the File System Access API keep the existing safe Downloads fallback.
 */
export async function savePowerBiWorkbook(result: CleanDataHandoffResultV1): Promise<CleanDataSaveResult> {
  const buffer = createPowerBiWorkbook(result);
  const stem = result.artifact.source.sourceName.replace(/[^a-z0-9_-]+/gi, '_') || 'lightbi-clean-data';
  const defaultName = `${stem}-PowerBI-ready.xlsx`;
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const picker = (window as SavePickerWindow).showSaveFilePicker;

  if (picker) {
    try {
      const handle = await picker({
        suggestedName: defaultName,
        types: [{ description: 'Excel workbook', accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob); await writable.close();
      return { fileName: handle.name, locationLabel: handle.name, usedSaveAs: true };
    } catch (cause) {
      if (!(cause instanceof DOMException) || cause.name !== 'AbortError') throw cause;
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = defaultName; anchor.click();
  URL.revokeObjectURL(url);
  return { fileName: defaultName, locationLabel: `Downloads/${defaultName}`, usedSaveAs: false };
}
