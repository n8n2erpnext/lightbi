import type { PersistedProjectSourceFile } from './project-source-file-api';
import type { SourceInspectionResult } from './source-preflight';
import type { WorkspaceSessionRecord } from './workspace-session-api';
import { parseCanonicalUserOverlay } from './understanding-core/canonical-user-overlay';

const WORKSPACE_SESSION_ROW_LIMIT = 250;

function limitSessionRows(rows: unknown): unknown[] {
  return Array.isArray(rows) ? rows.slice(0, WORKSPACE_SESSION_ROW_LIMIT) : [];
}

function compactSemanticSample(sample: any) {
  if (!sample || typeof sample !== 'object') return sample;
  return { strategy: sample.strategy, sourceRowCount: Number(sample.sourceRowCount) || 0, sampleRowCount: Number(sample.sampleRowCount) || 0 };
}

export function createWorkspaceSessionSnapshot(dataset: any) {
  const analysisRows = limitSessionRows(dataset.analysisRows);
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    rowRetentionLimit: WORKSPACE_SESSION_ROW_LIMIT,
    currentDataset: {
      status: 'ready', file_name: dataset.file_name, rows_count: dataset.rows_count,
      columns: Array.isArray(dataset.columns) ? dataset.columns : [], profiles: dataset.profiles || {},
      sourceType: dataset.sourceType, normalizedUrl: dataset.normalizedUrl, sourceFiles: dataset.sourceFiles || [],
      selected_sheet: dataset.selected_sheet ?? null, semanticSample: compactSemanticSample(dataset.semanticSample),
      analysisRowScope: dataset.analysisRows?.length > WORKSPACE_SESSION_ROW_LIMIT ? 'retained_sample' : dataset.analysisRowScope,
      semanticRows: limitSessionRows(dataset.semanticRows), analysisRows, previewRows: limitSessionRows(dataset.previewRows).slice(0, 100),
      understandingColumns: dataset.understandingColumns, understandingRows: limitSessionRows(dataset.understandingRows),
      understandingProfiles: dataset.understandingProfiles, understandingSourceRowCount: dataset.understandingSourceRowCount,
      selectedBusinessView: dataset.selectedBusinessView, businessFusionOverview: dataset.businessFusionOverview,
      objectKey: dataset.objectKey, canonicalUserOverlay: parseCanonicalUserOverlay(dataset.canonicalUserOverlay),
      canonicalMultiSourcePersistence: dataset.canonicalMultiSourceDataset ? {
        schemaVersion: dataset.canonicalMultiSourceDataset.schemaVersion,
        multiSourceDatasetId: dataset.canonicalMultiSourceDataset.multiSourceDatasetId,
        identity: dataset.canonicalMultiSourceDataset.identity,
        stateGeneration: dataset.canonicalMultiSourceDataset.stateGeneration,
        relationshipArtifactId: dataset.canonicalMultiSourceDataset.relationshipArtifactId,
        relationshipState: dataset.canonicalMultiSourceDataset.relationship.validationState,
        memberships: dataset.canonicalMultiSourceDataset.orderedSourceMemberships.map((member: any) => ({
          sourceId: member.sourceId, sourceFingerprint: member.sourceFingerprint,
          inspectionGeneration: member.inspectionGeneration, profileGeneration: member.profileGeneration,
          sourceRole: member.sourceRole, required: member.required, overlay: member.overlay,
        })),
        executableRestored: false,
        reselectionRequiredWhenRuntimeFilesUnavailable: true,
      } : undefined,
    },
  };
}

export function persistedFilesFromSession(session: WorkspaceSessionRecord): PersistedProjectSourceFile[] {
  const fromSummary = (Array.isArray(session.sourceSummary) ? session.sourceSummary : []).map((item: any) => item?.persistedFile).filter(Boolean) as PersistedProjectSourceFile[];
  if (fromSummary.length > 0) return fromSummary;
  const snapshotFiles = (session.snapshot as any)?.currentDataset?.sourceFiles;
  return (Array.isArray(snapshotFiles) ? snapshotFiles : []).map((item: any) => item?.persistedFile).filter(Boolean) as PersistedProjectSourceFile[];
}

export function attachPersistedFile(result: SourceInspectionResult, persistedFile: PersistedProjectSourceFile | null): SourceInspectionResult {
  if (result.status !== 'accessible' || !persistedFile) return result;
  return { ...result, metadata: { ...result.metadata, persisted_file: persistedFile } };
}

export function attachPersistedPrimarySource(dataset: any, persistedFile: PersistedProjectSourceFile) {
  const existing = Array.isArray(dataset?.sourceFiles) ? dataset.sourceFiles : [];
  const sourceFiles = existing.length > 0
    ? existing.map((source: any, index: number) => index === 0 || source?.name === persistedFile.originalName
      ? { ...source, persistedFile }
      : source)
    : [{ name: persistedFile.originalName, rows: Number(dataset?.rows_count) || 0, columns: Array.isArray(dataset?.columns) ? dataset.columns.length : 0, persistedFile }];
  return { ...dataset, sourceFiles };
}
