import type { CapabilityIdV1, CapabilityReadinessStateV1, UnderstandingReadinessArtifactV1 } from "./readiness-contracts";
import type { DatasetUnderstandingArtifactV1 } from "./profiling-contracts";
import type { GrainResolutionArtifactV1, GrainAxisState, StructuralRowForm, TemporalMode } from "./grain-resolution-contracts";
import type { RelationshipResolutionArtifactV1 } from "./relationship-resolution-contracts";
import type { SemanticResolutionArtifactV1, SemanticResolutionState } from "./semantic-resolution-contracts";

export const GOVERNED_DOMAIN_METRIC_CONTRACT_VERSION = "lightbi.governed-domain-metric-contract.v1" as const;
export const DOMAIN_ACTIVATION_ARTIFACT_VERSION = "lightbi.domain-activation.v1" as const;
export const GOVERNED_METRIC_PREFLIGHT_VERSION = "lightbi.governed-metric-preflight.v1" as const;

export type DomainConceptSupportStateV1 = "active" | "conditional" | "detect_only" | "blocked" | "unsupported";
export type GovernedMetricStateV1 = CapabilityReadinessStateV1;
export type MetricAdditivityV1 = "additive" | "semi_additive" | "non_additive" | "descriptive_count_only" | "unknown";
export type MetricTimeBehaviorV1 = "transaction_flow" | "period_flow" | "point_in_time_snapshot" | "interval" | "timeless" | "unknown";
export type MetricAggregationOperatorV1 = "sum" | "average" | "count_governed_identity" | "count_source_rows" | "derive_subtraction";
export type MetricTuningProvenanceV1 = "contract" | "synthetic" | "golden_tuning" | "holdout_evaluation_only" | "adversarial_evaluation_only" | "multi_file_evaluation_only";

export type GovernedMetricBlockerV1 = { code: string; severity: "material" | "critical"; references: string[] };
export type GovernedMetricLimitationV1 = { code: string; references: string[] };
export type GovernedMetricRemediationV1 = { code: string; parameters: Record<string, string | number | boolean> };
export type GovernedMetricEvidenceV1 = {
  evidenceId: string;
  kind: "physical" | "semantic" | "grain" | "relationship" | "readiness" | "policy" | "currency" | "inventory_snapshot" | "document_identity" | "line_measure";
  references: string[];
  provenance: "full_file" | "canonical_resolution" | "canonical_readiness" | "governed_policy" | "source_bound_contract";
};

export type CanonicalSourceCurrencyEvidenceV1 = {
  schemaVersion: "lightbi.canonical-source-currency-evidence.v1";
  evidenceId: string;
  sourceId: string;
  sourceHash: { algorithm: "sha256"; value: string };
  currency: string;
  provenance: {
    kind: "declared_scenario_metadata" | "declared_source_metadata" | "user_confirmed";
    reference: string;
    referenceHash: { algorithm: "sha256"; value: string };
  };
  scope: "selected_columns" | "all_money_measures";
  applicableMonetaryColumns: string[];
  reportingPeriod: string;
  inferred: false;
  attachedAt: "canonical_source";
};

export type CanonicalSourceInventorySnapshotEvidenceV1 = {
  schemaVersion: "lightbi.canonical-source-inventory-snapshot-evidence.v1";
  evidenceId: string;
  sourceId: string;
  sourceHash: { algorithm: "sha256"; value: string };
  provenance: {
    kind: "declared_scenario_metadata" | "declared_source_metadata" | "user_confirmed";
    reference: string;
    referenceHash: { algorithm: "sha256"; value: string };
  };
  scope: "one_item_warehouse_as_of_snapshot";
  quantity: { physicalColumn: string; semanticId: "stock_qty" | "inventory" };
  itemIdentity: { physicalColumn: string; semanticId: "sku" };
  warehouseIdentity: { physicalColumn: string; semanticId: "warehouse" };
  asOf: { physicalColumn: string; semanticId: "time_period"; value: string };
  unit: { physicalColumn: string; semanticId: "uom"; value: string };
  inferred: false;
  attachedAt: "canonical_source";
};

export type CanonicalSourceDocumentIdentityEvidenceV1 = {
  schemaVersion: "lightbi.canonical-source-document-identity-evidence.v1";
  evidenceId: string;
  sourceId: string;
  sourceHash: { algorithm: "sha256"; value: string };
  provenance: {
    kind: "user_confirmed";
    reference: string;
    referenceHash: { algorithm: "sha256"; value: string };
  };
  physicalColumn: string;
  semanticId: string;
  inferred: false;
  attachedAt: "canonical_source";
};

export type CanonicalSourceLineMeasureEvidenceV1 = {
  schemaVersion: "lightbi.canonical-source-line-measure-evidence.v1";
  evidenceId: string;
  sourceId: string;
  sourceHash: { algorithm: "sha256"; value: string };
  provenance: {
    kind: "user_confirmed";
    reference: string;
    referenceHash: { algorithm: "sha256"; value: string };
  };
  physicalColumn: string;
  semanticId: string;
  rowIdentityPhysicalColumn: string;
  inferred: false;
  attachedAt: "canonical_source";
};

export type GovernedMetricSelectedBindingV1 = {
  requirementId: string;
  semanticId: string;
  sourceReference: string;
  sourceColumnIndex: number;
  physicalColumn: string;
  semanticState: Extract<SemanticResolutionState, "confirmed" | "probable">;
};

export type GovernedMetricRequirementV1 = {
  requirementId: string;
  semanticSignals: readonly string[];
  semanticMode: "any" | "all";
  allowedSemanticStates: readonly SemanticResolutionState[];
  allowedStructuralForms: readonly StructuralRowForm[];
  minimumGrainState: Extract<GrainAxisState, "confirmed" | "probable">;
  allowedTemporalModes: readonly TemporalMode[];
  requiredReadinessCapabilities: readonly CapabilityIdV1[];
  relationshipRequired: boolean;
};

export type GovernedMetricDefinitionV1 = {
  schemaVersion: typeof GOVERNED_DOMAIN_METRIC_CONTRACT_VERSION;
  metricId: string;
  version: string;
  domainPackId: "commerce_distribution_mvp";
  businessName: string;
  semanticMeaning: string;
  measureRole: "flow_amount" | "flow_quantity" | "entity_count" | "source_record_count" | "snapshot_balance" | "derived_amount" | "average_score";
  aggregationOperator: MetricAggregationOperatorV1;
  requirements: readonly GovernedMetricRequirementV1[];
  groupingDimensions: readonly string[];
  timeBehavior: MetricTimeBehaviorV1;
  additivity: MetricAdditivityV1;
  duplicateHandling: string;
  repeatedParentHandling: string;
  snapshotHandling: string;
  nullHandling: string;
  unitBehavior: string;
  currencyBehavior: string;
  requiredRelationships: readonly string[];
  requiredReadinessCapabilities: readonly CapabilityIdV1[];
  prohibitedEvidenceStates: readonly string[];
  outputType: "amount" | "quantity" | "count" | "score";
  limitations: readonly string[];
  provenance: readonly string[];
  approvalState: "governed_definition";
  executionAuthorization: false;
};

export type GovernedMetricPolicyV1 = {
  schemaVersion: "lightbi.governed-metric-policy.v1";
  contractVersion: typeof GOVERNED_DOMAIN_METRIC_CONTRACT_VERSION;
  domainPackId: "commerce_distribution_mvp";
  metricOrder: readonly string[];
  rules: readonly { ruleId: string; description: string }[];
  forbiddenInference: readonly string[];
};

export type DomainConceptDefinitionV1 = {
  conceptId: string;
  supportState: DomainConceptSupportStateV1;
  requiredSemanticSignals: readonly string[];
  requiredGrainStates: readonly GrainAxisState[];
  requiredRelationshipStates: readonly string[];
  requiredPhysicalEvidence: readonly string[];
  requiredReadinessCapabilities: readonly CapabilityIdV1[];
  blockers: readonly string[];
  limitations: readonly string[];
  remediation: readonly string[];
  evidenceProvenance: readonly string[];
  tuningProvenance: readonly MetricTuningProvenanceV1[];
};

export type GovernedDomainPackManifestV1 = {
  schemaVersion: "lightbi.governed-domain-support-manifest.v1";
  packId: "commerce_distribution_mvp";
  version: string;
  label: string;
  packStatus: "conditional";
  concepts: readonly DomainConceptDefinitionV1[];
  governedMetricIds: readonly string[];
  activationRequirements: readonly string[];
  blockers: readonly string[];
  limitations: readonly string[];
  corpusEvidence: readonly string[];
  lastValidatedPolicyIdentity: string;
  productionActive: false;
};

export type CanonicalMetricSourceV1 = {
  physical: DatasetUnderstandingArtifactV1;
  semantic: SemanticResolutionArtifactV1;
  grain: GrainResolutionArtifactV1;
  readiness: UnderstandingReadinessArtifactV1;
  sourceEvidence?: {
    currency: CanonicalSourceCurrencyEvidenceV1[];
    inventorySnapshots?: CanonicalSourceInventorySnapshotEvidenceV1[];
    documentIdentities?: CanonicalSourceDocumentIdentityEvidenceV1[];
    lineMeasures?: CanonicalSourceLineMeasureEvidenceV1[];
  };
};

export type DomainMetricEvaluationContextV1 = {
  group: "synthetic" | "golden" | "holdout" | "adversarial" | "multi_file" | "production";
  tuningUse: "allowed" | "forbidden";
};

export type DomainActivationInputV1 = {
  schemaVersion: "lightbi.domain-activation-input.v1";
  sources: readonly CanonicalMetricSourceV1[];
  relationship?: RelationshipResolutionArtifactV1;
  evaluationContext: DomainMetricEvaluationContextV1;
};

export type DomainConceptActivationV1 = {
  conceptId: string;
  state: DomainConceptSupportStateV1;
  evidence: GovernedMetricEvidenceV1[];
  blockers: GovernedMetricBlockerV1[];
  limitations: GovernedMetricLimitationV1[];
  remediation: GovernedMetricRemediationV1[];
};

export type DomainActivationArtifactV1 = {
  schemaVersion: typeof DOMAIN_ACTIVATION_ARTIFACT_VERSION;
  packId: "commerce_distribution_mvp";
  packVersion: string;
  manifestPolicyHash: string;
  identity: string;
  state: DomainConceptSupportStateV1;
  concepts: DomainConceptActivationV1[];
  blockers: GovernedMetricBlockerV1[];
  limitations: GovernedMetricLimitationV1[];
  tuningAllowed: boolean;
  canonicalArtifactsModified: false;
  questionGeneration: { executed: false };
  actionGeneration: { executed: false };
  productionWiring: { executed: false };
};

export type GovernedMetricPreflightInputV1 = {
  schemaVersion: "lightbi.governed-metric-preflight-input.v1";
  sources: readonly CanonicalMetricSourceV1[];
  relationship?: RelationshipResolutionArtifactV1;
  metricIds?: readonly string[];
  evaluationContext: DomainMetricEvaluationContextV1;
  expectedPolicyHash: string;
};

export type GovernedMetricPreflightItemV1 = {
  metricId: string;
  metricVersion: string;
  state: GovernedMetricStateV1;
  metricDefinitionAvailable: boolean;
  semanticRequirementsSatisfied: boolean;
  grainCompatible: boolean;
  operatorValid: boolean;
  timeCompatible: boolean;
  unitCompatible: boolean | null;
  currencyCompatible: boolean | null;
  duplicateHandlingSatisfied: boolean;
  relationshipRequirementsSatisfied: boolean;
  selectedBindings: GovernedMetricSelectedBindingV1[];
  selectedIdentityCandidateId: string | null;
  currencyEvidenceIds: string[];
  inventorySnapshotEvidenceIds: string[];
  evidence: GovernedMetricEvidenceV1[];
  blockers: GovernedMetricBlockerV1[];
  limitations: GovernedMetricLimitationV1[];
  remediation: GovernedMetricRemediationV1[];
  metricDefinitionAvailableFlag: true;
  metricPreflightExecuted: true;
  runtimeActionCreated: false;
  runtimeActionAuthorized: false;
  metricExecutionExecuted: false;
  decisionUseAuthorized: false;
  result: null;
  productionWiring: { executed: false };
};

export type GovernedMetricPreflightV1 = {
  schemaVersion: typeof GOVERNED_METRIC_PREFLIGHT_VERSION;
  domainPackId: "commerce_distribution_mvp";
  policyVersion: GovernedMetricPolicyV1["schemaVersion"];
  policyHash: string;
  identity: string;
  sourceReferences: string[];
  tuningAllowed: boolean;
  metrics: GovernedMetricPreflightItemV1[];
  blockers: GovernedMetricBlockerV1[];
  limitations: GovernedMetricLimitationV1[];
  metricResultsProduced: false;
  runtimeActionCreated: false;
  runtimeActionAuthorized: false;
  metricExecutionExecuted: false;
  decisionUseAuthorized: false;
  productionWiring: { executed: false };
};

export type MetricGroundTruthExpectationV1 = {
  caseId: string;
  group: DomainMetricEvaluationContextV1["group"];
  metricId: string;
  applicable: boolean;
  allowedPreflightStates: GovernedMetricStateV1[];
  forbiddenPreflightStates: GovernedMetricStateV1[];
  requiredBlockers: string[];
  verifiedValue: number | null;
  grainExpectation: string;
  currencyOrUnitExpectation: string;
  tuningProvenance: MetricTuningProvenanceV1;
};
