import { getOrBuildCanonicalConsumerArtifact } from './understanding-core/canonical-consumer-boundary';
import type { CanonicalMultiSourceDatasetV1 } from './understanding-core/canonical-multisource-boundary';
import { parseCanonicalUserOverlay } from './understanding-core/canonical-user-overlay';

type HomeDataset = Record<string, any> | null | undefined;

export function buildHomeCanonicalArtifact(
  currentDataset: HomeDataset,
  canonicalRows: Record<string, unknown>[],
) {
  if (currentDataset?.status !== 'ready' || !Array.isArray(currentDataset.columns)) return null;

  const periodWorkspace = currentDataset.canonicalPeriodPartitionWorkspace;
  if (periodWorkspace?.periodMembers?.length) {
    return periodWorkspace.periodMembers[0].artifact ?? null;
  }

  const multiSourceDataset = currentDataset.canonicalMultiSourceDataset as CanonicalMultiSourceDatasetV1 | undefined;
  if (multiSourceDataset) {
    const metricSourceId = multiSourceDataset.analyses.find((item) => item.metricSourceId)?.metricSourceId;
    const metricSource = multiSourceDataset.orderedSourceMemberships.find((item) => item.sourceId === metricSourceId);
    return metricSource?.artifact ?? null;
  }

  const sourceType = String(currentDataset.sourceType || 'unknown');
  const sourceKind = ['postgresql', 'mysql', 'mariadb', 'sqlserver', 'mongodb_atlas', 'sqlite'].includes(sourceType)
    ? 'database_table'
    : ['google_sheets', 'm365_excel', 'csv_url', 'excel_url'].includes(sourceType)
      ? 'online_file'
      : ['local_xlsx', 'local_csv', 'local_json', 'local_file'].includes(sourceType)
        ? 'local_file'
        : sourceType === 'api_response'
          ? 'api_response'
          : 'unknown';

  return getOrBuildCanonicalConsumerArtifact({
    datasetId: currentDataset.file_name || 'dataset',
    sourceLabel: currentDataset.file_name || 'dataset',
    sourceKind,
    columns: currentDataset.understandingColumns ?? currentDataset.columns,
    rows: canonicalRows,
    sourceRowCount: Number(currentDataset.understandingSourceRowCount ?? currentDataset.rows_count ?? canonicalRows.length),
    sheet: currentDataset.selected_sheet ?? undefined,
    sourceBoundary: currentDataset.canonicalSourceBoundary,
    userOverlay: parseCanonicalUserOverlay(currentDataset.canonicalUserOverlay) ?? undefined,
  });
}
