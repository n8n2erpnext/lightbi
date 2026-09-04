import { describe, expect, it } from 'vitest';
import type { CanonicalConsumerArtifactV1 } from './canonical-consumer-boundary';
import { createBAAnalysisAuthorityContext } from './ba-analysis-authority-context';
import type { GovernedRuntimePreflightV1 } from './governed-runtime-contracts';

function artifact(): CanonicalConsumerArtifactV1 {
  return {
    status: 'valid',
    schemaVersion: 'lightbi.canonical-consumer-artifact.v1',
    identity: 'canonical:healthcare', datasetStateIdentity: 'dataset-state:healthcare', sourceFingerprint: 'source:healthcare',
    overlayIdentity: null, overlayValidation: {} as CanonicalConsumerArtifactV1['overlayValidation'],
    canonicalSource: {} as CanonicalConsumerArtifactV1['canonicalSource'],
    domainActivation: { packId: 'commerce_distribution_mvp', state: 'unsupported' } as CanonicalConsumerArtifactV1['domainActivation'],
    domainInference: {
      schemaVersion: 'lightbi.domain-inference-artifact.v1',
      primaryDomain: 'healthcare', primaryDomainSource: 'micro_brain_relation',
      domains: [{ domainId: 'healthcare', source: 'micro_brain_relation', evidenceRank: 4, canonicalSignalIds: ['patient', 'appointment'], physicalColumns: ['Patient ID', 'Appointment ID'], reasonCodes: ['brain_relation:healthcare'] }],
      semanticConcepts: { confirmed: 0, probable: 2, microBrainRecovered: 2, ambiguous: 0, unknown: 2, unresolved: 2 },
      evidenceConflicts: 0,
      officialSupport: { packId: 'commerce_distribution_mvp', state: 'unsupported', productionActive: false },
      analysisMode: 'evidence_bound_inferred_domain',
      limitations: ['Retrieval rank is not semantic confidence.'],
    },
    metricPreflight: {
      schemaVersion: 'lightbi.governed-metric-preflight.v1', domainPackId: 'commerce_distribution_mvp', policyVersion: 'lightbi.governed-metric-policy.v1', policyHash: 'policy', identity: 'preflight:healthcare', sourceReferences: ['source:healthcare'], tuningAllowed: false,
      metrics: [{
        metricId: 'source_record_count', metricVersion: '1.0.0', state: 'conditionally_ready', metricDefinitionAvailable: true,
        semanticRequirementsSatisfied: true, grainCompatible: true, operatorValid: true, timeCompatible: true, unitCompatible: null, currencyCompatible: null, duplicateHandlingSatisfied: true, relationshipRequirementsSatisfied: true,
        selectedBindings: [], selectedIdentityCandidateId: null, currencyEvidenceIds: [], inventorySnapshotEvidenceIds: [],
        evidence: [{ evidenceId: 'policy:source_record_count', kind: 'policy', references: ['source_record_count'], provenance: 'governed_policy' }],
        blockers: [], limitations: [{ code: 'descriptive_only', references: [] }], remediation: [],
        metricDefinitionAvailableFlag: true, metricPreflightExecuted: true, runtimeActionCreated: false, runtimeActionAuthorized: false, metricExecutionExecuted: false, decisionUseAuthorized: false, result: null, productionWiring: { executed: false },
      }],
      blockers: [], limitations: [], metricResultsProduced: false, runtimeActionCreated: false, runtimeActionAuthorized: false, metricExecutionExecuted: false, decisionUseAuthorized: false, productionWiring: { executed: false },
    },
    questionGeneration: { actionCandidates: [{ actionCandidateId: 'action:count', metricId: 'source_record_count' }] } as CanonicalConsumerArtifactV1['questionGeneration'],
    blockers: [], caveats: [], provenance: { datasetStateIdentity: 'dataset-state:healthcare', sourceFingerprint: 'source:healthcare', buildOrdinal: 1, cacheStatus: 'built', legacyDetectorInvoked: false }, decisionUseAuthorized: false,
  };
}

function runtime(): GovernedRuntimePreflightV1 {
  return {
    schemaVersion: 'lightbi.governed-runtime-preflight.v1', identity: 'runtime:count', state: 'conditionally_executable', domainPackId: 'commerce_distribution_mvp', sourceReference: 'source:healthcare', actionCandidateId: 'action:count', metricId: 'source_record_count', metricVersion: '1.0.0', runtimePolicyHash: 'runtime-policy', metricPolicyHash: 'metric-policy', questionPolicyHash: 'question-policy', planningAllowed: true, executionAllowed: true, action: null, blockers: [], restrictions: [{ code: 'DECISION_USE_PROHIBITED', severity: 'critical', reason: 'Preview only.', references: ['source:healthcare'], decisionUseBlocked: true }], evidence: [{ evidenceId: 'runtime:evidence', kind: 'runtime_policy', references: ['source:healthcare'], provenance: 'governed_policy' }], runtimeActionCreated: false, runtimeActionAuthorized: false, executionPerformed: false, decisionUseAuthorized: false, productionWiring: { executed: false },
  };
}

describe('BA analysis authority context', () => {
  it('preserves inferred-domain support and metric/runtime authority without inventing confidence', () => {
    const context = createBAAnalysisAuthorityContext(artifact(), { actionCandidateId: 'action:count', runtimePreflight: runtime() })!;
    expect(context.domain).toMatchObject({ primaryDomain: 'healthcare', primaryDomainSource: 'micro_brain_relation', analysisMode: 'evidence_bound_inferred_domain', officialSupport: { productionActive: false } });
    expect(context.authorization.metric).toMatchObject({ metricId: 'source_record_count', preflightState: 'conditionally_ready', runtimeState: 'conditionally_executable', runtimeExecutionAllowed: true, decisionUseAuthorized: false });
    expect(context.authorization.formula).toMatchObject({ state: 'not_independently_authorized', decisionUseAuthorized: false });
    expect(context.evidenceReferences).toContain('semantic:patient');
    expect(JSON.stringify(context)).not.toMatch(/retrievalSimilarity|similarity|confidenceScore|evidenceRank/);
  });

  it('does not turn a missing metric match into authorization', () => {
    const context = createBAAnalysisAuthorityContext(artifact(), { metricId: 'invented_metric' })!;
    expect(context.authorization.metric).toBeNull();
    expect(context.authorization.formula.state).toBe('not_independently_authorized');
    expect(context.decisionUseAuthorized).toBe(false);
  });
});
