import { getCanonicalPerspectiveDisplay } from '../components/analysis/CanonicalPerspectiveSelector';

export function deriveHomeWorkspacePresentation(input: {
  currentDataset: any;
  datasetUnderstandingNext: any;
  canonicalOverlayRebuildState: string;
  canonicalArtifact: any;
  canonicalPresentation: any;
  language: any;
  t: (value: string) => string;
}) {
  const { currentDataset, datasetUnderstandingNext, canonicalOverlayRebuildState, canonicalArtifact, canonicalPresentation, language, t } = input;
  const isPerspectiveCollection = currentDataset?.sourceType === 'canonical_perspective_collection';
  const collectionRoleCount = isPerspectiveCollection
    ? new Set((currentDataset.sourceFiles ?? []).map((source: any) => source.role).filter(Boolean)).size
    : 0;
  const collectionPeriodCount = isPerspectiveCollection
    ? new Set((currentDataset.analysisRows ?? []).map((row: any) => row.reporting_period).filter(Boolean)).size
    : 0;
  const activePerspectiveLabel = currentDataset?.canonicalPerspectiveId
    ? getCanonicalPerspectiveDisplay(
      currentDataset.canonicalPerspectiveId,
      currentDataset.canonicalPerspectiveId.replaceAll('_', ' '),
      '',
      language,
    ).label
    : null;
  const executableActionCount = datasetUnderstandingNext?.availableActions?.filter((action: any) => action.executionScope !== 'not_supported').length ?? 0;
  const canonicalDatasetState = isPerspectiveCollection
    ? { label: t('Analysis ready'), className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
    : canonicalOverlayRebuildState === 'pending'
      ? { label: t('Rebuilding'), className: 'border-blue-200 bg-blue-50 text-blue-700' }
      : !canonicalArtifact || canonicalArtifact.status !== 'valid'
        ? { label: canonicalArtifact ? t('Needs review') : t('Inspecting'), className: 'border-amber-200 bg-amber-50 text-amber-800' }
        : (canonicalPresentation?.counts.ready ?? 0) > 0 || executableActionCount > 0
          ? { label: t('Ready'), className: 'border-emerald-200 bg-emerald-50 text-emerald-700' }
          : (canonicalPresentation?.counts.needs_mapping_review ?? 0) > 0 || (canonicalPresentation?.counts.needs_user_evidence ?? 0) > 0
            ? { label: t('Needs review'), className: 'border-amber-200 bg-amber-50 text-amber-800' }
            : (canonicalPresentation?.counts.blocked_safety ?? 0) > 0
              ? { label: t('Safety blocked'), className: 'border-red-200 bg-red-50 text-red-700' }
              : (canonicalPresentation?.counts.unsupported_mvp ?? 0) > 0
                ? { label: t('Not supported yet'), className: 'border-gray-200 bg-gray-50 text-gray-700' }
                : { label: t('Inspected'), className: 'border-gray-200 bg-gray-50 text-gray-700' };

  return { isPerspectiveCollection, collectionRoleCount, collectionPeriodCount, activePerspectiveLabel, canonicalDatasetState };
}
