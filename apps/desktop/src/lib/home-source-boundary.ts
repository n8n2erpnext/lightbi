import type { DatasetFamily } from './batch-inspection';
import type { SourceInspectionResult } from './source-preflight';
import { createCanonicalSourceBoundary, type CanonicalFullFileProfileV1, type CanonicalSourceBoundaryV1 } from './understanding-core/canonical-source-boundary';

export function createLocalCanonicalSourceBoundary(args: {
  datasetId: string;
  columns: string[];
  semanticRows: Record<string, unknown>[];
  semanticSample?: { strategy: 'full' | 'matrix_sample'; source_row_count: number; sample_row_count: number; row_indexes?: number[] };
  profile?: CanonicalFullFileProfileV1 & { fullFileUnderstanding: CanonicalSourceBoundaryV1['fullFileUnderstanding'] };
  file?: File;
  sheetName?: string;
}): CanonicalSourceBoundaryV1 | undefined {
  if (!args.profile || !args.file || !args.semanticRows.length || !args.semanticSample) return undefined;
  return createCanonicalSourceBoundary({
    datasetId: args.datasetId,
    columns: args.columns,
    semanticRows: args.semanticRows,
    semanticSample: { strategy: args.semanticSample.strategy, sourceRowCount: args.semanticSample.source_row_count, rowIndexes: args.semanticSample.row_indexes },
    fullFileProfile: args.profile,
    fullFileUnderstanding: args.profile.fullFileUnderstanding,
    runtimeFiles: [{
      file: args.file,
      sheetName: args.sheetName,
      headerRowIndex: args.profile.artifact.sourceProfile.header.selectedHeaderRowIndex ?? undefined,
    }],
  });
}

export function familyFromInspectionResult(inspectionResult: SourceInspectionResult, fallbackName: string): DatasetFamily | null {
  if (inspectionResult.status !== 'accessible') return null;
  const metadata = inspectionResult.metadata;
  const defaultSheet = metadata.is_workbook && metadata.default_sheet && metadata.sheets ? metadata.sheets[metadata.default_sheet] : null;
  const columns = defaultSheet?.columns ?? metadata.columns ?? [];
  const file = inspectionResult.file ?? new File([], fallbackName);
  return {
    id: `source_${fallbackName}`.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
    name: fallbackName,
    schemaFingerprint: columns.map(column => column.trim().toLocaleLowerCase()).join('|'),
    files: [{ file, result: inspectionResult }],
    totalRows: defaultSheet?.rows_count ?? metadata.rows_count ?? 0,
    columns,
    profiles: defaultSheet?.profiles ?? metadata.profiles ?? {},
  };
}
