import type { MultiSourceDraftV1, MultiSourceReviewSourceV1 } from "../components/analysis/CanonicalMultiSourceReview";
import type { DatasetFamily } from "./batch-inspection";
import { projectCanonicalSourceCandidates, type GovernedBundleCandidateV1 } from "./canonical-source-candidate-projection";
import type { SourceInspectionResult } from "./source-preflight";
import { createLocalCanonicalSourceBoundary } from "./home-source-boundary";
import { getOrBuildCanonicalConsumerArtifact } from "./understanding-core/canonical-consumer-boundary";
import type { BusinessFusionOverview } from "./business-fusion-overview";

export type PendingLocalFileBatch = {
  files: File[];
  status: "reading" | "ready" | "error";
  results: (SourceInspectionResult | null)[];
  families: DatasetFamily[];
  selectedFamilyId: string | null;
  isRestored?: boolean;
  step: "family_selection";
  businessOverview?: BusinessFusionOverview | null;
};

export function projectPendingMultiSourceReviewSources(
  pending: PendingLocalFileBatch | null,
): MultiSourceReviewSourceV1[] {
  if (!pending || pending.status !== "ready") return [];
  return pending.files.flatMap((file, index) => {
    const result = pending.results[index];
    if (!result || result.status !== "accessible") return [];
    const metadata = result.metadata;
    const selected = metadata.is_workbook && metadata.default_sheet && metadata.sheets
      ? metadata.sheets[metadata.default_sheet]
      : metadata;
    const boundary = createLocalCanonicalSourceBoundary({
      datasetId: file.name,
      columns: selected.columns ?? [],
      semanticRows: selected.semantic_rows ?? [],
      semanticSample: selected.semantic_sample,
      profile: selected.canonical_full_file_profile,
      file,
      sheetName: metadata.is_workbook ? metadata.default_sheet : undefined,
    });
    const artifact = boundary ? getOrBuildCanonicalConsumerArtifact({
      datasetId: boundary.datasetId,
      sourceKind: "local_file",
      sourceLabel: file.name,
      columns: boundary.semanticSample.columns,
      rows: boundary.semanticSample.rows,
      sourceRowCount: boundary.sourceRowCount,
      sheet: metadata.is_workbook ? metadata.default_sheet : undefined,
      sourceBoundary: boundary,
    }) : null;
    return [{
      key: `${index}:${file.name}`,
      name: file.name,
      rowCount: selected.rows_count ?? 0,
      columns: selected.columns ?? [],
      candidates: artifact ? projectCanonicalSourceCandidates(artifact) : null,
    }];
  });
}

export function selectGovernedBundleDrafts(
  current: Record<string, MultiSourceDraftV1>,
  bundle: GovernedBundleCandidateV1,
): Record<string, MultiSourceDraftV1> {
  const selectedKeys = new Set(bundle.sourceKeys);
  return Object.fromEntries(Object.entries(current).map(([key, value]) => [
    key,
    { ...value, selected: selectedKeys.has(key) },
  ]));
}

export function findPendingSourceFamily(
  pending: PendingLocalFileBatch | null,
  sourceName: string,
): DatasetFamily | undefined {
  return pending?.families.find((family) => family.files.some((entry) => entry.file.name === sourceName));
}
