import type { DatasetFamily } from './batch-inspection';
import type { CanonicalSourceBoundaryV1 } from './understanding-core/canonical-source-boundary';
import type { CanonicalUserOverlayV1 } from './understanding-core/canonical-user-overlay';
import { advancedSourceId, type AdvancedWorkspaceSource } from '../stores/advanced-source-store';

export type AdvancedSourceSemanticSample = {
  strategy: string;
  sourceRowCount: number;
  sampleRowCount: number;
};

export function createAdvancedWorkspaceSourceFromFamily(args: {
  family: DatasetFamily;
  sourceName: string;
  semanticSample: AdvancedSourceSemanticSample;
  canonicalSourceBoundary?: CanonicalSourceBoundaryV1;
  canonicalUserOverlay?: CanonicalUserOverlayV1;
  registeredAt?: string;
}): AdvancedWorkspaceSource {
  const first = args.family.files.find(item => item.result.status === 'accessible');
  if (!first || first.result.status !== 'accessible') throw new Error('advanced_source_accessible_file_required');
  const sourceType = first.result.sourceType;
  return {
    id: advancedSourceId(sourceType, args.sourceName),
    name: args.sourceName,
    sourceType,
    sourceKind: 'local_file',
    normalizedUrl: first.result.normalizedUrl,
    tables: args.family.files.flatMap((item, fileIndex) => {
      if (item.result.status !== 'accessible') return [];
      const metadata = item.result.metadata;
      if (metadata.is_workbook && metadata.sheets) {
        return Object.entries(metadata.sheets).map(([sheetName, sheet]) => ({
          id: `${fileIndex}:${sheetName}`,
          name: args.family.files.length > 1 ? `${item.file.name} · ${sheetName}` : sheetName,
          rowCount: sheet.rows_count,
          columns: sheet.columns,
          profiles: sheet.profiles || {},
          file: item.file,
          sheetName,
        }));
      }
      return [{
        id: `${fileIndex}:data`,
        name: args.family.files.length > 1 ? item.file.name : 'data',
        rowCount: metadata.rows_count || 0,
        columns: metadata.columns || [],
        profiles: metadata.profiles || {},
        file: item.file,
      }];
    }),
    semanticSample: args.semanticSample,
    canonicalSourceBoundary: args.canonicalSourceBoundary,
    canonicalUserOverlay: args.canonicalUserOverlay,
    registeredAt: args.registeredAt ?? new Date().toISOString(),
  };
}
