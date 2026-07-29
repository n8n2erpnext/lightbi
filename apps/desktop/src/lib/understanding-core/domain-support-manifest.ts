export type DomainPackSupportLevel =
  | "mvp_supported"
  | "conditional"
  | "detect_only"
  | "advertised_only";

/**
 * Domain-pack identities are deliberately open. The core must never require a
 * source edit when a separately validated domain pack is introduced.
 */
export type DomainPackIdV1 = string;

export type SupportedDatasetGrain =
  | "transaction"
  | "event"
  | "snapshot"
  | "master_data"
  | "summary";

export type DomainActivationRule = {
  id: string;
  requiredSignalIds: readonly string[];
  optionalSignalIds?: readonly string[];
  allowedGrains: readonly SupportedDatasetGrain[];
  minimumSemanticConfidence?: number;
  requiredRelationshipKinds?: readonly string[];
  blockedByQualityIssueKinds?: readonly string[];
};

export type DecisionSupportRule = {
  actionId: string;
  requiredSignalIds: readonly string[];
  requiredRelationshipKinds?: readonly string[];
  allowedGrains: readonly SupportedDatasetGrain[];
  minimumMappingPrecision: number;
  minimumExecutionReadiness: number;
};

export type DomainSupportManifest = {
  id: DomainPackIdV1;
  version: string;
  label: string;
  supportLevel: DomainPackSupportLevel;
  supportedArchetypes: readonly string[];
  supportedGrains: readonly SupportedDatasetGrain[];
  coreSignals: readonly string[];
  optionalSignals: readonly string[];
  forbiddenAssumptions: readonly string[];
  playbookIds: readonly string[];
  executableActionIds: readonly string[];
  activationRules: readonly DomainActivationRule[];
  decisionSupportRules: readonly DecisionSupportRule[];
  acceptanceCorpusIds: readonly string[];
  minimumMappingPrecision: number;
  minimumActionSuccessRate: number;
};

/**
 * Phase 0 truth freeze: no domain pack is asserted as product-supported until
 * Phase 1 corpus evidence and the later activation/runtime gates exist.
 */
export const DOMAIN_SUPPORT_MANIFEST = [] as const satisfies readonly DomainSupportManifest[];

import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import type { GovernedDomainPackManifestV1 } from "./governed-domain-metric-contracts";

const COMMERCE_CONCEPTS = [
  {
    conceptId: "commercial_transaction",
    supportState: "conditional",
    requiredSemanticSignals: ["order", "sales_order", "billing_document"],
    requiredGrainStates: ["confirmed", "probable"],
    requiredRelationshipStates: [],
    requiredPhysicalEvidence: ["full_file_profile", "non_technical_column"],
    requiredReadinessCapabilities: ["physical_profile_ready", "semantic_labeling_ready", "grain_interpretation_ready"],
    blockers: ["governed_identity_required_for_count"],
    limitations: ["source_local_only"],
    remediation: ["confirm_transaction_identity"],
    evidenceProvenance: ["canonical_physical", "canonical_semantic", "canonical_grain", "canonical_readiness"],
    tuningProvenance: ["contract", "synthetic", "golden_tuning"],
  },
  {
    conceptId: "order_line",
    supportState: "conditional",
    requiredSemanticSignals: ["order", "product", "quantity"],
    requiredGrainStates: ["confirmed", "probable"],
    requiredRelationshipStates: [],
    requiredPhysicalEvidence: ["full_file_profile", "parent_repetition_evidence"],
    requiredReadinessCapabilities: ["grain_interpretation_ready", "parent_child_structure_ready"],
    blockers: ["repeated_parent_totals_must_be_resolved"],
    limitations: ["line_identity_may_require_confirmation"],
    remediation: ["confirm_line_and_parent_keys"],
    evidenceProvenance: ["canonical_grain"],
    tuningProvenance: ["contract", "synthetic", "golden_tuning"],
  },
  {
    conceptId: "product_item",
    supportState: "active",
    requiredSemanticSignals: ["product", "sku"],
    requiredGrainStates: ["confirmed", "probable", "ambiguous"],
    requiredRelationshipStates: [],
    requiredPhysicalEvidence: ["full_file_profile", "dimension_role"],
    requiredReadinessCapabilities: ["semantic_grouping_filtering_ready"],
    blockers: [],
    limitations: ["grouping_only_without_metric_preflight"],
    remediation: [],
    evidenceProvenance: ["canonical_semantic", "canonical_grain"],
    tuningProvenance: ["contract", "synthetic", "golden_tuning"],
  },
  {
    conceptId: "sales_revenue_amount",
    supportState: "conditional",
    requiredSemanticSignals: ["revenue", "net_revenue", "invoice_total"],
    requiredGrainStates: ["confirmed", "probable"],
    requiredRelationshipStates: [],
    requiredPhysicalEvidence: ["full_file_numeric_profile", "measure_role"],
    requiredReadinessCapabilities: ["measure_role_assessment_ready", "repeated_measure_protection_ready"],
    blockers: ["unit_price_rate_balance_not_revenue", "currency_conflict", "repeated_document_total"],
    limitations: ["metric_specific_authorization_only"],
    remediation: ["confirm_currency", "resolve_repeated_totals"],
    evidenceProvenance: ["canonical_physical", "canonical_semantic", "canonical_grain"],
    tuningProvenance: ["contract", "synthetic", "golden_tuning"],
  },
  {
    conceptId: "quantity_flow",
    supportState: "conditional",
    requiredSemanticSignals: ["quantity", "sold_qty"],
    requiredGrainStates: ["confirmed", "probable"],
    requiredRelationshipStates: [],
    requiredPhysicalEvidence: ["full_file_numeric_profile", "measure_role"],
    requiredReadinessCapabilities: ["measure_role_assessment_ready"],
    blockers: ["snapshot_quantity_not_flow", "incompatible_uom"],
    limitations: ["uom_may_require_confirmation"],
    remediation: ["confirm_unit_of_measure"],
    evidenceProvenance: ["canonical_physical", "canonical_semantic", "canonical_grain"],
    tuningProvenance: ["contract", "synthetic", "golden_tuning"],
  },
  {
    conceptId: "inventory_snapshot",
    supportState: "conditional",
    requiredSemanticSignals: ["inventory", "stock_qty"],
    requiredGrainStates: ["confirmed", "probable"],
    requiredRelationshipStates: [],
    requiredPhysicalEvidence: ["full_file_numeric_profile", "as_of_time_basis"],
    requiredReadinessCapabilities: ["grain_interpretation_ready", "temporal_analysis_ready"],
    blockers: ["snapshot_time_basis_required", "cross_time_sum_prohibited"],
    limitations: ["semi_additive_only"],
    remediation: ["provide_as_of_time", "select_single_snapshot_basis"],
    evidenceProvenance: ["canonical_semantic", "canonical_grain"],
    tuningProvenance: ["contract", "synthetic", "golden_tuning"],
  },
  {
    conceptId: "delivery_event",
    supportState: "conditional",
    requiredSemanticSignals: ["shipment"],
    requiredGrainStates: ["confirmed", "probable"],
    requiredRelationshipStates: [],
    requiredPhysicalEvidence: ["full_file_profile", "event_or_document_identity"],
    requiredReadinessCapabilities: ["row_identity_ready", "descriptive_counting_ready"],
    blockers: ["delivery_identity_required"],
    limitations: ["delivery_lines_are_not_deliveries"],
    remediation: ["confirm_delivery_identity"],
    evidenceProvenance: ["canonical_semantic", "canonical_grain"],
    tuningProvenance: ["contract", "synthetic", "golden_tuning"],
  },
  {
    conceptId: "trip_event",
    supportState: "conditional",
    requiredSemanticSignals: ["trip"],
    requiredGrainStates: ["confirmed", "probable", "unknown"],
    requiredRelationshipStates: [],
    requiredPhysicalEvidence: ["full_file_profile", "user_confirmed_document_identity"],
    requiredReadinessCapabilities: ["physical_profile_ready", "descriptive_counting_ready"],
    blockers: ["trip_identity_confirmation_required"],
    limitations: ["source_local_only", "distinct_trip_identity_only"],
    remediation: ["confirm_document_identity"],
    evidenceProvenance: ["canonical_physical", "canonical_semantic", "source_bound_user_confirmation"],
    tuningProvenance: ["contract", "synthetic", "golden_tuning"],
  },
  {
    conceptId: "quality_performance_measure",
    supportState: "conditional",
    requiredSemanticSignals: ["quality_score"],
    requiredGrainStates: ["confirmed", "probable", "ambiguous"],
    requiredRelationshipStates: [],
    requiredPhysicalEvidence: ["full_file_numeric_profile", "atomic_entity_identity"],
    requiredReadinessCapabilities: ["physical_profile_ready", "semantic_labeling_ready", "measure_role_assessment_ready"],
    blockers: ["atomic_evaluated_entity_identity_required"],
    limitations: ["descriptive_performance_only", "no_causality_or_appraisal_validity_claim"],
    remediation: ["confirm_employee_identity_and_score_meaning"],
    evidenceProvenance: ["canonical_physical", "canonical_semantic", "canonical_grain"],
    tuningProvenance: ["contract", "synthetic", "golden_tuning"],
  },
  {
    conceptId: "cost_amount",
    supportState: "detect_only",
    requiredSemanticSignals: ["cost", "total_cost"],
    requiredGrainStates: ["confirmed", "probable"],
    requiredRelationshipStates: ["compatible_grain_and_time"],
    requiredPhysicalEvidence: ["full_file_numeric_profile", "measure_role"],
    requiredReadinessCapabilities: ["measure_role_assessment_ready"],
    blockers: ["revenue_cost_reconciliation_not_proven"],
    limitations: ["gross_profit_remains_conditional_or_blocked"],
    remediation: ["prove_revenue_cost_compatibility"],
    evidenceProvenance: ["canonical_semantic", "canonical_grain", "canonical_relationship_when_cross_source"],
    tuningProvenance: ["contract", "synthetic", "golden_tuning", "multi_file_evaluation_only"],
  },
  {
    conceptId: "currency_and_uom",
    supportState: "detect_only",
    requiredSemanticSignals: ["currency", "uom"],
    requiredGrainStates: ["confirmed", "probable", "ambiguous", "unknown"],
    requiredRelationshipStates: [],
    requiredPhysicalEvidence: ["full_file_profile"],
    requiredReadinessCapabilities: ["semantic_labeling_ready"],
    blockers: ["incompatible_currency_or_uom_blocks_affected_metric"],
    limitations: ["absence_is_not_compatibility_proof"],
    remediation: ["confirm_currency_or_uom"],
    evidenceProvenance: ["canonical_physical", "canonical_semantic"],
    tuningProvenance: ["contract", "synthetic", "golden_tuning"],
  },
] as const satisfies GovernedDomainPackManifestV1["concepts"];

const GOVERNED_MANIFEST_BODY = {
  schemaVersion: "lightbi.governed-domain-support-manifest.v1",
  packId: "commerce_distribution_mvp",
  version: "1.0.0",
  label: "Commerce and distribution",
  packStatus: "conditional",
  concepts: COMMERCE_CONCEPTS,
  governedMetricIds: ["sales_revenue", "quantity_sold", "transaction_count", "inventory_on_hand", "delivery_count", "trip_count", "average_quality_score", "gross_profit"],
  activationRequirements: [
    "full_file_canonical_physical_profile",
    "probable_or_confirmed_canonical_semantics",
    "compatible_source_local_grain",
    "metric_specific_measure_role",
    "canonical_readiness_without_critical_upstream_blocker",
  ],
  blockers: ["aliases_alone_never_activate", "numeric_parsing_never_establishes_measure", "cross_source_metrics_require_governed_relationship"],
  limitations: ["production_runtime_unwired", "questions_and_actions_out_of_scope", "legacy_phase0_manifest_retained_for_frozen_readiness_v2"],
  corpusEvidence: ["synthetic_metric_contracts", "golden_source_local", "holdout_evaluation_only", "adversarial_evaluation_only", "multi_file_evaluation_only"],
  productionActive: false,
} as const;

export const GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1 = [{
  ...GOVERNED_MANIFEST_BODY,
  lastValidatedPolicyIdentity: deterministicPolicySha256(GOVERNED_MANIFEST_BODY),
}] as const satisfies readonly GovernedDomainPackManifestV1[];
