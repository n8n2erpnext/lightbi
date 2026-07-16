import type { CanonicalMetricSourceV1, DomainActivationArtifactV1, GovernedMetricPreflightV1, GovernedMetricStateV1 } from "./governed-domain-metric-contracts";

export const GOVERNED_QUESTION_ACTION_CONTRACT_VERSION = "lightbi.governed-question-action-contract.v1" as const;
export const QUESTION_ACTION_GENERATION_VERSION = "lightbi.question-action-generation.v1" as const;
export const QUESTION_ACTION_POLICY_VERSION = "lightbi.question-action-policy.v1" as const;

export type GovernedQuestionIntentV1 = "trend" | "ranking" | "summary" | "point_in_time" | "status_breakdown";
export type GovernedActionKindV1 = "trend_candidate" | "ranking_candidate" | "count_candidate" | "snapshot_candidate" | "status_breakdown_candidate";
export type GovernedTimeRequirementV1 = "not_required" | "event_or_period" | "point_in_time_as_of" | "compatible_period";

export type QuestionActionBlockerV1 = {
  code: string;
  severity: "material" | "critical";
  source: "policy" | "integrity" | "domain_activation" | "metric_preflight" | "dimension" | "time_basis" | "runtime_preflight";
  references: string[];
};

export type QuestionActionEvidenceV1 = {
  evidenceId: string;
  kind: "canonical_source" | "domain_manifest" | "domain_activation" | "metric_definition" | "metric_preflight" | "semantic_dimension" | "grain_time" | "question_policy";
  references: string[];
  provenance: "canonical_artifact" | "governed_manifest" | "governed_metric_catalog" | "governed_preflight" | "governed_question_policy";
};

export type QuestionActionLimitationV1 = {
  code: string;
  references: string[];
};

export type GovernedDimensionBindingV1 = {
  semanticId: string;
  sourceColumnIndex: number;
  semanticState: "confirmed" | "probable";
};

export type GovernedTimeBasisV1 = {
  requirement: GovernedTimeRequirementV1;
  metricTimeBehavior: "transaction_flow" | "period_flow" | "point_in_time_snapshot" | "interval" | "timeless" | "unknown";
  resolvedSemanticId: string | null;
  sourceColumnIndex: number | null;
  canonicalTemporalMode: string;
};

export type QuestionActionCommonV1 = {
  contractVersion: typeof GOVERNED_QUESTION_ACTION_CONTRACT_VERSION;
  version: "1.0.0";
  domainPackId: "commerce_distribution_mvp";
  metricId: string;
  title: string;
  businessPurpose: string;
  requiredDimensions: string[];
  resolvedDimensions: GovernedDimensionBindingV1[];
  timeBasis: GovernedTimeBasisV1;
  metricPreflightState: GovernedMetricStateV1;
  blockers: QuestionActionBlockerV1[];
  limitations: QuestionActionLimitationV1[];
  remediation: string[];
  evidence: QuestionActionEvidenceV1[];
  prohibitedUses: string[];
  runtimeActionCreated: false;
  runtimeActionAuthorized: false;
  executionPerformed: false;
  productionWiring: { executed: false };
};

export type GovernedQuestionCandidateV1 = QuestionActionCommonV1 & {
  questionId: string;
  governedIdentity: string;
  intent: GovernedQuestionIntentV1;
  questionState: GovernedMetricStateV1;
  metricDefinitionAvailable: boolean;
  meaningfulBusinessLens: boolean;
  actionCandidateId: string | null;
  advertisedAsDefault: boolean;
  rank: number | null;
};

export type GovernedActionCandidateV1 = QuestionActionCommonV1 & {
  actionCandidateId: string;
  questionId: string;
  actionKind: GovernedActionKindV1;
  actionCandidateState: "available" | "conditional" | "blocked";
  preflightRequirementsSatisfied: boolean;
  executable: false;
};

export type QuestionFamilyPolicyV1 = {
  questionId: string;
  version: "1.0.0";
  domainPackId: "commerce_distribution_mvp";
  metricId: string;
  title: string;
  businessPurpose: string;
  intent: GovernedQuestionIntentV1;
  actionKind: GovernedActionKindV1;
  requiredDimensionGroups: readonly (readonly string[])[];
  timeRequirement: GovernedTimeRequirementV1;
  sourceComplexity: "source_local" | "relationship_dependent";
  priority: number;
  prohibitedUses: readonly string[];
};

export type QuestionActionPolicyV1 = {
  schemaVersion: typeof QUESTION_ACTION_POLICY_VERSION;
  contractVersion: typeof GOVERNED_QUESTION_ACTION_CONTRACT_VERSION;
  domainPackId: "commerce_distribution_mvp";
  maxDefaultQuestions: 5;
  statePreference: readonly GovernedMetricStateV1[];
  questionFamilies: readonly QuestionFamilyPolicyV1[];
  rules: readonly { ruleId: string; description: string }[];
  forbiddenInference: readonly string[];
};

export type QuestionActionGenerationInputV1 = {
  schemaVersion: "lightbi.question-action-generation-input.v1";
  canonicalSource: CanonicalMetricSourceV1;
  domainActivation: DomainActivationArtifactV1;
  metricPreflight: GovernedMetricPreflightV1;
  expectedQuestionPolicyHash: string;
};

export type QuestionActionGenerationV1 = {
  schemaVersion: typeof QUESTION_ACTION_GENERATION_VERSION;
  contractVersion: typeof GOVERNED_QUESTION_ACTION_CONTRACT_VERSION;
  domainPackId: "commerce_distribution_mvp";
  domainPackVersion: string;
  manifestPolicyHash: string;
  metricPolicyHash: string;
  questionPolicyVersion: typeof QUESTION_ACTION_POLICY_VERSION;
  questionPolicyHash: string;
  identity: string;
  canonicalSourceReference: string;
  domainActivationReference: string;
  metricPreflightReference: string;
  defaultQuestions: GovernedQuestionCandidateV1[];
  candidateQuestions: GovernedQuestionCandidateV1[];
  blockedQuestions: GovernedQuestionCandidateV1[];
  actionCandidates: GovernedActionCandidateV1[];
  blockers: QuestionActionBlockerV1[];
  limitations: QuestionActionLimitationV1[];
  evidence: QuestionActionEvidenceV1[];
  defaultQuestionLimit: 5;
  deterministicRanking: true;
  metricResultsProduced: false;
  runtimeActionCreated: false;
  runtimeActionAuthorized: false;
  executionPerformed: false;
  decisionUseAuthorized: false;
  productionWiring: { executed: false };
};
