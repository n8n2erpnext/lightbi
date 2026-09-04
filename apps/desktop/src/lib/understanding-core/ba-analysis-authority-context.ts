import type { CanonicalConsumerBuildResultV1 } from './canonical-consumer-boundary';
import type { DomainAnalysisModeV1, DomainInferenceSourceV1 } from './domain-inference-contracts';
import type { GovernedMetricStateV1 } from './governed-domain-metric-contracts';
import type { GovernedRuntimePreflightV1 } from './governed-runtime-contracts';

export const BA_ANALYSIS_AUTHORITY_CONTEXT_VERSION = 'lightbi.ba-analysis-authority-context.v1' as const;

export type BAAnalysisAuthorityContextV1 = {
  schemaVersion: typeof BA_ANALYSIS_AUTHORITY_CONTEXT_VERSION;
  artifactIdentity: string;
  datasetStateIdentity: string;
  sourceFingerprint: string;
  domain: {
    primaryDomain: string | null;
    primaryDomainSource: DomainInferenceSourceV1 | null;
    officialSupport: { packId: string; state: string; productionActive: boolean };
    analysisMode: DomainAnalysisModeV1;
    semanticConcepts: {
      confirmed: number;
      probable: number;
      microBrainRecovered: number;
      ambiguous: number;
      unknown: number;
      unresolved: number;
    };
    evidenceConflicts: number;
    evidence: Array<{
      domainId: string;
      source: DomainInferenceSourceV1;
      canonicalSignalIds: string[];
      physicalColumns: string[];
      reasonCodes: string[];
    }>;
  };
  authorization: {
    metric: null | {
      metricId: string;
      metricVersion: string;
      preflightState: GovernedMetricStateV1;
      preflightIdentity: string;
      runtimeState: GovernedRuntimePreflightV1['state'] | 'not_evaluated';
      runtimeExecutionAllowed: boolean;
      decisionUseAuthorized: false;
      selectedBindings: Array<{
        requirementId: string;
        semanticId: string;
        physicalColumn: string;
        semanticState: 'confirmed' | 'probable';
      }>;
      blockerCodes: string[];
      limitationCodes: string[];
      evidenceReferences: string[];
    };
    formula: {
      state: 'not_independently_authorized';
      decisionUseAuthorized: false;
      reason: string;
    };
  };
  limitations: string[];
  evidenceReferences: string[];
  decisionUseAuthorized: false;
};

export type BAAnalysisAuthorityContextInputV1 = {
  actionCandidateId?: string | null;
  metricId?: string | null;
  runtimePreflight?: GovernedRuntimePreflightV1 | null;
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

export function createBAAnalysisAuthorityContext(
  artifact: CanonicalConsumerBuildResultV1 | null | undefined,
  input: BAAnalysisAuthorityContextInputV1 = {},
): BAAnalysisAuthorityContextV1 | null {
  if (!artifact || artifact.status !== 'valid') return null;

  const actionMetricId = input.actionCandidateId
    ? artifact.questionGeneration.actionCandidates.find((item) => item.actionCandidateId === input.actionCandidateId)?.metricId ?? null
    : null;
  const requestedMetricId = input.runtimePreflight?.metricId ?? input.metricId ?? actionMetricId;
  const metric = requestedMetricId
    ? artifact.metricPreflight.metrics.find((item) => item.metricId === requestedMetricId) ?? null
    : null;
  const runtimeMatchesMetric = Boolean(
    metric
    && input.runtimePreflight
    && input.runtimePreflight.metricId === metric.metricId,
  );

  const domainEvidence = artifact.domainInference.domains.map((item) => ({
    domainId: item.domainId,
    source: item.source,
    canonicalSignalIds: [...item.canonicalSignalIds],
    physicalColumns: [...item.physicalColumns],
    reasonCodes: [...item.reasonCodes],
  }));
  const metricEvidenceReferences = metric
    ? unique(metric.evidence.flatMap((item) => [item.evidenceId, ...item.references]))
    : [];
  const runtimeEvidenceReferences = runtimeMatchesMetric && input.runtimePreflight
    ? unique([
        input.runtimePreflight.identity,
        ...input.runtimePreflight.evidence.flatMap((item) => [item.evidenceId, ...item.references]),
        ...input.runtimePreflight.restrictions.flatMap((item) => [item.code, ...item.references]),
      ])
    : [];
  const domainEvidenceReferences = unique(domainEvidence.flatMap((item) => [
    `domain:${item.domainId}`,
    ...item.canonicalSignalIds.map((id) => `semantic:${id}`),
    ...item.physicalColumns.map((column) => `column:${column}`),
    ...item.reasonCodes.map((code) => `domain-reason:${code}`),
  ]));

  const formulaReason = 'No independent formula-authorization contract exists in the canonical artifact; formulas cannot inherit authority from Micro Brain or domain inference.';
  const limitations = unique([
    ...artifact.domainInference.limitations,
    ...(metric?.limitations.map((item) => item.code) ?? []),
    ...(runtimeMatchesMetric && input.runtimePreflight
      ? input.runtimePreflight.restrictions.map((item) => `${item.code}: ${item.reason}`)
      : []),
    formulaReason,
  ]);

  return {
    schemaVersion: BA_ANALYSIS_AUTHORITY_CONTEXT_VERSION,
    artifactIdentity: artifact.identity,
    datasetStateIdentity: artifact.datasetStateIdentity,
    sourceFingerprint: artifact.sourceFingerprint,
    domain: {
      primaryDomain: artifact.domainInference.primaryDomain,
      primaryDomainSource: artifact.domainInference.primaryDomainSource,
      officialSupport: { ...artifact.domainInference.officialSupport },
      analysisMode: artifact.domainInference.analysisMode,
      semanticConcepts: { ...artifact.domainInference.semanticConcepts },
      evidenceConflicts: artifact.domainInference.evidenceConflicts,
      evidence: domainEvidence,
    },
    authorization: {
      metric: metric ? {
        metricId: metric.metricId,
        metricVersion: metric.metricVersion,
        preflightState: metric.state,
        preflightIdentity: artifact.metricPreflight.identity,
        runtimeState: runtimeMatchesMetric && input.runtimePreflight ? input.runtimePreflight.state : 'not_evaluated',
        runtimeExecutionAllowed: Boolean(runtimeMatchesMetric && input.runtimePreflight?.executionAllowed),
        decisionUseAuthorized: false,
        selectedBindings: metric.selectedBindings.map((binding) => ({
          requirementId: binding.requirementId,
          semanticId: binding.semanticId,
          physicalColumn: binding.physicalColumn,
          semanticState: binding.semanticState,
        })),
        blockerCodes: unique(metric.blockers.map((item) => item.code)),
        limitationCodes: unique(metric.limitations.map((item) => item.code)),
        evidenceReferences: unique([...metricEvidenceReferences, ...runtimeEvidenceReferences]),
      } : null,
      formula: {
        state: 'not_independently_authorized',
        decisionUseAuthorized: false,
        reason: formulaReason,
      },
    },
    limitations,
    evidenceReferences: unique([
      artifact.identity,
      artifact.metricPreflight.identity,
      ...domainEvidenceReferences,
      ...metricEvidenceReferences,
      ...runtimeEvidenceReferences,
    ]),
    decisionUseAuthorized: false,
  };
}
