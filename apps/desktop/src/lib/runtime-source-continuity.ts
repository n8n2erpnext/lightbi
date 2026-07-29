import type { RuntimeDatasetSource } from './runtime-dataset-source';
import type { CanonicalConsumerBuildResultV1 } from './understanding-core/canonical-consumer-boundary';
import type { CanonicalMultiSourceDatasetV1 } from './understanding-core/canonical-multisource-boundary';
import { sourceBindingsMatch } from './understanding-core/canonical-source-boundary';

export type RuntimeSourceContinuity = {
  state: 'available' | 'reselection_required';
  available: boolean;
  blockers: string[];
  runtimeSource?: RuntimeDatasetSource;
  requiredSourceIds: string[];
};

export function evaluateRuntimeSourceContinuity(args: {
  artifact: CanonicalConsumerBuildResultV1 | null;
  runtimeSource?: RuntimeDatasetSource;
  multiSourceDataset?: CanonicalMultiSourceDatasetV1;
  actionCandidateId?: string;
}): RuntimeSourceContinuity {
  if (args.multiSourceDataset) {
    const actionAnalysis = args.actionCandidateId
      ? args.multiSourceDataset.analyses.find((analysis) => analysis.actionCandidateId === args.actionCandidateId)
      : undefined;
    const applicableAnalyses = actionAnalysis ? [actionAnalysis] : args.multiSourceDataset.analyses;
    const requiredSourceIds = applicableAnalyses
      .filter((analysis) => analysis.state === 'ready')
      .flatMap((analysis) => analysis.requiredSourceIds);
    const required = [...new Set(requiredSourceIds.length
      ? requiredSourceIds
      : args.multiSourceDataset.orderedSourceMemberships.filter((member) => member.required).map((member) => member.sourceId))];
    const missing = required.filter((sourceId) => {
      const member = args.multiSourceDataset!.orderedSourceMemberships.find((candidate) => candidate.sourceId === sourceId);
      return !member
        || member.runtimeSource.files.length === 0
        || !sourceBindingsMatch(member.boundary, member.runtimeSource);
    });
    const metricSourceId = applicableAnalyses.find((analysis) => analysis.state === 'ready')?.metricSourceId;
    const metricMember = args.multiSourceDataset.orderedSourceMemberships.find((member) => member.sourceId === metricSourceId);
    return {
      state: missing.length ? 'reselection_required' : 'available',
      available: missing.length === 0 && required.length > 0,
      blockers: missing.map((sourceId) => `canonical_runtime_source_unavailable:${sourceId}`),
      runtimeSource: missing.length ? undefined : metricMember?.runtimeSource,
      requiredSourceIds: required,
    };
  }

  const boundary = args.artifact?.sourceBoundary;
  const available = Boolean(
    args.artifact?.status === 'valid'
    && boundary
    && args.runtimeSource?.files.length
    && sourceBindingsMatch(boundary, args.runtimeSource),
  );
  return {
    state: available ? 'available' : 'reselection_required',
    available,
    blockers: available ? [] : ['canonical_full_file_runtime_source_required'],
    runtimeSource: available ? args.runtimeSource : undefined,
    requiredSourceIds: boundary ? [boundary.sourceId] : [],
  };
}
