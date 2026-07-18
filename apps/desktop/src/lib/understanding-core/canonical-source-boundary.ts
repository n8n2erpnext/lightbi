import type { RuntimeDatasetSource, RuntimeSourceBindingV1 } from "../runtime-dataset-source";
import type { DatasetUnderstandingArtifactV1 } from "./profiling-contracts";
import type { SemanticResolutionArtifactV1 } from "./semantic-resolution-contracts";
import type { GrainResolutionArtifactV1 } from "./grain-resolution-contracts";

export const CANONICAL_SOURCE_BOUNDARY_VERSION = "lightbi.canonical-source-boundary.v1" as const;

export type CanonicalSemanticSampleV1 = {
  scope: "semantic_sample";
  columns: string[];
  rows: Record<string, unknown>[];
  sourceRowCount: number;
  rowIndexes?: number[];
  strategy: "full" | "matrix_sample" | "stratified_matrix";
};

export type CanonicalFullFileProfileV1 = RuntimeSourceBindingV1 & {
  scope: "full_file";
  sourceRowCount: number;
  profilerVersion: string;
  artifact: DatasetUnderstandingArtifactV1;
};

export type CanonicalSourceBoundaryV1 = {
  schemaVersion: typeof CANONICAL_SOURCE_BOUNDARY_VERSION;
  datasetId: string;
  sourceId: string;
  sourceFingerprint: string;
  sourceRowCount: number;
  inspectionGeneration: string;
  profileGeneration: string;
  semanticSample: CanonicalSemanticSampleV1;
  fullFileProfile: CanonicalFullFileProfileV1;
  fullFileUnderstanding: {
    semantic: SemanticResolutionArtifactV1;
    grain: GrainResolutionArtifactV1;
  };
  runtimeSource: RuntimeDatasetSource;
};

export type CanonicalSourceBoundaryValidationV1 = {
  valid: boolean;
  blockers: string[];
  evidence: string[];
  remediation: string[];
};

export function createCanonicalSourceBoundary(args: {
  datasetId: string;
  columns: string[];
  semanticRows: Record<string, unknown>[];
  semanticSample: { strategy: "full" | "matrix_sample" | "stratified_matrix"; sourceRowCount: number; rowIndexes?: number[] };
  fullFileProfile: CanonicalFullFileProfileV1;
  fullFileUnderstanding: CanonicalSourceBoundaryV1["fullFileUnderstanding"];
  runtimeFiles: RuntimeDatasetSource["files"];
}): CanonicalSourceBoundaryV1 {
  const profile = { ...args.fullFileProfile, datasetId: args.datasetId };
  const binding: RuntimeSourceBindingV1 = {
    datasetId: args.datasetId,
    sourceId: profile.sourceId,
    sourceFingerprint: profile.sourceFingerprint,
    inspectionGeneration: profile.inspectionGeneration,
    profileGeneration: profile.profileGeneration,
  };
  return {
    schemaVersion: CANONICAL_SOURCE_BOUNDARY_VERSION,
    ...binding,
    sourceRowCount: profile.sourceRowCount,
    semanticSample: {
      scope: "semantic_sample",
      columns: args.columns,
      rows: args.semanticRows,
      sourceRowCount: args.semanticSample.sourceRowCount,
      rowIndexes: args.semanticSample.rowIndexes,
      strategy: args.semanticSample.strategy,
    },
    fullFileProfile: profile,
    fullFileUnderstanding: args.fullFileUnderstanding,
    runtimeSource: { kind: "local_files", files: args.runtimeFiles, sourceRowCount: profile.sourceRowCount, binding },
  };
}

function sameBinding(
  expected: Pick<CanonicalSourceBoundaryV1, "datasetId" | "sourceId" | "sourceFingerprint" | "inspectionGeneration" | "profileGeneration">,
  actual: RuntimeSourceBindingV1 | undefined,
): boolean {
  return Boolean(actual)
    && actual!.datasetId === expected.datasetId
    && actual!.sourceId === expected.sourceId
    && actual!.sourceFingerprint === expected.sourceFingerprint
    && actual!.inspectionGeneration === expected.inspectionGeneration
    && actual!.profileGeneration === expected.profileGeneration;
}

export function validateCanonicalSourceBoundary(boundary: CanonicalSourceBoundaryV1): CanonicalSourceBoundaryValidationV1 {
  const blockers: string[] = [];
  const profile = boundary.fullFileProfile;
  const physical = profile?.artifact?.sourceProfile;

  if (!boundary.datasetId.trim() || !boundary.sourceId.trim()) blockers.push("source_identity_required");
  if (!boundary.sourceFingerprint.trim()) blockers.push("source_fingerprint_required");
  if (!boundary.inspectionGeneration.trim()) blockers.push("inspection_generation_required");
  if (!boundary.profileGeneration.trim()) blockers.push("profile_generation_required");
  if (!boundary.semanticSample.rows.length) blockers.push("semantic_sample_required");
  if (boundary.semanticSample.scope !== "semantic_sample") blockers.push("semantic_sample_scope_invalid");
  if (boundary.semanticSample.sourceRowCount !== boundary.sourceRowCount) blockers.push("semantic_sample_source_row_count_mismatch");
  if (!physical) blockers.push("full_file_profile_required");
  if (physical?.profilingScope !== "full") blockers.push("full_file_profile_scope_required");
  if (profile?.scope !== "full_file") blockers.push("full_file_profile_scope_required");
  if (physical?.source.sourceId !== boundary.sourceId || profile?.sourceId !== boundary.sourceId) blockers.push("source_profile_identity_mismatch");
  if (physical?.source.hash?.value !== boundary.sourceFingerprint || profile?.sourceFingerprint !== boundary.sourceFingerprint) blockers.push("source_profile_fingerprint_mismatch");
  if (physical && (profile.sourceRowCount !== boundary.sourceRowCount || physical.dataRegion.rowCount !== boundary.sourceRowCount)) blockers.push("source_profile_row_count_mismatch");
  if (profile?.datasetId !== boundary.datasetId) blockers.push("source_profile_dataset_mismatch");
  if (profile?.inspectionGeneration !== boundary.inspectionGeneration) blockers.push("stale_inspection_generation");
  if (profile?.profileGeneration !== boundary.profileGeneration) blockers.push("stale_profile_generation");
  if (boundary.fullFileUnderstanding?.semantic.sourceId !== boundary.sourceId || boundary.fullFileUnderstanding?.grain.sourceId !== boundary.sourceId) blockers.push("full_file_understanding_identity_mismatch");
  if (boundary.fullFileUnderstanding?.semantic.sourceHash?.value !== boundary.sourceFingerprint || boundary.fullFileUnderstanding?.grain.sourceHash?.value !== boundary.sourceFingerprint) blockers.push("full_file_understanding_fingerprint_mismatch");
  if (!boundary.runtimeSource?.files?.length) blockers.push("runtime_source_required");
  if (boundary.runtimeSource?.sourceRowCount !== boundary.sourceRowCount) blockers.push("runtime_source_row_count_mismatch");
  if (!sameBinding(boundary, boundary.runtimeSource?.binding)) blockers.push("runtime_source_binding_mismatch");

  return {
    valid: blockers.length === 0,
    blockers: [...new Set(blockers)].sort(),
    evidence: [
      `semantic_sample_rows:${boundary.semanticSample.rows.length}`,
      `declared_source_rows:${boundary.sourceRowCount}`,
      `profile_scope:${physical?.profilingScope ?? "unknown"}`,
      `runtime_files:${boundary.runtimeSource?.files?.length ?? 0}`,
    ],
    remediation: blockers.length ? ["Re-inspect the current source and preserve its verified full-file profile and runtime reference."] : [],
  };
}

export function sourceBindingsMatch(
  boundary: CanonicalSourceBoundaryV1,
  runtimeSource: RuntimeDatasetSource | undefined,
): boolean {
  return Boolean(runtimeSource)
    && runtimeSource!.sourceRowCount === boundary.sourceRowCount
    && sameBinding(boundary, runtimeSource!.binding);
}
