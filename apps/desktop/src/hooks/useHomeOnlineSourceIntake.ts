import { useCallback } from 'react';
import { createPreviewRows } from '../lib/data-intake-preview-rows';
import { createLocalCanonicalSourceBoundary, familyFromInspectionResult } from '../lib/home-source-boundary';
import { createDecisionTrustReport } from '../lib/decision-trust-report';
import type { SourceInspectionResult } from '../lib/source-preflight';
import { createWorkspaceUnderstandingState } from '../lib/workspace-understanding-state';
import { advancedSourceId, type AdvancedWorkspaceSource } from '../stores/advanced-source-store';
import { uploadProjectSourceFile } from '../lib/project-source-file-api';

interface HomeOnlineSourceIntakeDependencies {
  registerAdvancedSource: (source: AdvancedWorkspaceSource) => void;
  setCurrentDataset: (value: any) => void;
  setWorkspaceState: (value: any) => void;
  setDecisionTrustReport: (value: any) => void;
  resetAnalysis: () => void;
}

export function useHomeOnlineSourceIntake(deps: HomeOnlineSourceIntakeDependencies) {
  return useCallback(async (inspectionResult: SourceInspectionResult) => {
    if (inspectionResult.status !== 'accessible') return;
    const md = inspectionResult.metadata;
    let rows = md.rows_count || 0;
    let columns = md.columns || [];
    let profiles = md.profiles || {};
    let rawPreviewRows = md.preview_rows || [];
    let rawSemanticRows = md.semantic_rows || rawPreviewRows;
    let rawAnalysisRows = md.analysis_rows || [];
    const sheetNames: string[] = md.sheet_names || [];
    if (md.is_workbook && md.default_sheet && md.sheets) {
      const sheet = md.sheets[md.default_sheet];
      if (sheet) {
        rows = sheet.rows_count || 0;
        columns = sheet.columns || [];
        profiles = sheet.profiles || {};
        rawPreviewRows = sheet.preview_rows || [];
        rawSemanticRows = sheet.semantic_rows || rawPreviewRows;
        rawAnalysisRows = sheet.analysis_rows || [];
      }
    }
    const sourceLabel = md.name || inspectionResult.label;
    const persistedFile = inspectionResult.file ? await uploadProjectSourceFile(inspectionResult.file) : null;
    const selectedSemanticSample = md.is_workbook && md.default_sheet && md.sheets ? md.sheets[md.default_sheet]?.semantic_sample : md.semantic_sample;
    const selectedCanonicalProfile = md.is_workbook && md.default_sheet && md.sheets ? md.sheets[md.default_sheet]?.canonical_full_file_profile : md.canonical_full_file_profile;
    const canonicalSourceBoundary = createLocalCanonicalSourceBoundary({
      datasetId: sourceLabel, columns, semanticRows: rawSemanticRows, semanticSample: selectedSemanticSample,
      profile: selectedCanonicalProfile, file: inspectionResult.file, sheetName: md.default_sheet,
    });
    if (inspectionResult.file) {
      deps.registerAdvancedSource({
        id: advancedSourceId(inspectionResult.sourceType, sourceLabel), name: sourceLabel,
        sourceType: inspectionResult.sourceType, sourceKind: 'online_link', normalizedUrl: inspectionResult.normalizedUrl,
        tables: md.is_workbook && md.sheets
          ? Object.entries(md.sheets).map(([sheetName, sheet]: [string, any]) => ({ id: `0:${sheetName}`, name: sheetName, rowCount: sheet.rows_count, columns: sheet.columns, profiles: sheet.profiles || {}, file: inspectionResult.file!, sheetName }))
          : [{ id: '0:data', name: 'data', rowCount: rows, columns, profiles, file: inspectionResult.file }],
        semanticSample: selectedSemanticSample ? { strategy: selectedSemanticSample.strategy, sourceRowCount: selectedSemanticSample.source_row_count, sampleRowCount: selectedSemanticSample.sample_row_count } : undefined,
        registeredAt: new Date().toISOString(),
      });
    }
    deps.setCurrentDataset({
      status: 'ready', file_name: sourceLabel, rows_count: rows, columns, profiles,
      sourceType: inspectionResult.sourceType, normalizedUrl: inspectionResult.normalizedUrl,
      sourceFiles: [{ name: sourceLabel, rows, columns: columns.length, fingerprint: `${inspectionResult.sourceType}:${columns.join('|')}`, url: inspectionResult.normalizedUrl, sheetNames, persistedFile }],
      selected_sheet: md.default_sheet || null, file_reference: inspectionResult.file || null,
      runtimeDatasetSource: canonicalSourceBoundary?.runtimeSource ?? (inspectionResult.file ? { kind: 'local_files', files: [{ file: inspectionResult.file, sheetName: md.default_sheet }], sourceRowCount: rows } : undefined),
      canonicalSourceBoundary,
      semanticSample: selectedSemanticSample ? { strategy: selectedSemanticSample.strategy, sourceRowCount: selectedSemanticSample.source_row_count, sampleRowCount: selectedSemanticSample.sample_row_count } : undefined,
      analysisRowScope: md.is_workbook && md.default_sheet && md.sheets ? md.sheets[md.default_sheet]?.analysis_row_scope : md.analysis_row_scope,
      semanticRows: rawSemanticRows, analysisRows: rawAnalysisRows, previewRows: createPreviewRows(rawPreviewRows, columns),
    });
    deps.setWorkspaceState(createWorkspaceUnderstandingState({ type: 'dataset', datasetId: sourceLabel }));
    const trustFamily = familyFromInspectionResult(inspectionResult, sourceLabel);
    deps.setDecisionTrustReport(trustFamily ? createDecisionTrustReport(trustFamily) : null);
    deps.resetAnalysis();
  }, [deps]);
}
