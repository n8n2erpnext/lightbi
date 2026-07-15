import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import type { QuestionActionPolicyV1 } from "./governed-question-action-contracts";

const commonProhibitedUses = [
  "runtime_execution",
  "sql_generation",
  "decision_authorization",
  "forecasting",
] as const;

export const COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1 = {
  schemaVersion: "lightbi.question-action-policy.v1",
  contractVersion: "lightbi.governed-question-action-contract.v1",
  domainPackId: "commerce_distribution_mvp",
  maxDefaultQuestions: 5,
  statePreference: ["ready", "conditionally_ready", "blocked", "unknown", "unsupported", "not_applicable"],
  questionFamilies: [
    { questionId: "commerce.sales_revenue.over_time", version: "1.0.0", domainPackId: "commerce_distribution_mvp", metricId: "sales_revenue", title: "How is sales revenue changing over time?", businessPurpose: "Review governed sales revenue across a compatible event or reporting-period basis.", intent: "trend", actionKind: "trend_candidate", requiredDimensionGroups: [["report_date", "time_period"]], timeRequirement: "event_or_period", sourceComplexity: "source_local", priority: 10, prohibitedUses: [...commonProhibitedUses, "currency_conversion"] },
    { questionId: "commerce.sales_revenue.by_product", version: "1.0.0", domainPackId: "commerce_distribution_mvp", metricId: "sales_revenue", title: "Which products contribute the most sales revenue?", businessPurpose: "Rank governed sales revenue by a compatible product or SKU dimension.", intent: "ranking", actionKind: "ranking_candidate", requiredDimensionGroups: [["product", "sku"]], timeRequirement: "not_required", sourceComplexity: "source_local", priority: 20, prohibitedUses: [...commonProhibitedUses, "profitability_claim"] },
    { questionId: "commerce.quantity_sold.over_time", version: "1.0.0", domainPackId: "commerce_distribution_mvp", metricId: "quantity_sold", title: "How is quantity sold changing over time?", businessPurpose: "Review governed sold quantity across a compatible event or reporting-period basis.", intent: "trend", actionKind: "trend_candidate", requiredDimensionGroups: [["report_date", "time_period"]], timeRequirement: "event_or_period", sourceComplexity: "source_local", priority: 30, prohibitedUses: [...commonProhibitedUses, "inventory_movement_claim", "unit_conversion"] },
    { questionId: "commerce.quantity_sold.by_product", version: "1.0.0", domainPackId: "commerce_distribution_mvp", metricId: "quantity_sold", title: "Which products account for the most quantity sold?", businessPurpose: "Rank governed sold quantity by a compatible product or SKU dimension.", intent: "ranking", actionKind: "ranking_candidate", requiredDimensionGroups: [["product", "sku"]], timeRequirement: "not_required", sourceComplexity: "source_local", priority: 40, prohibitedUses: [...commonProhibitedUses, "inventory_balance_claim", "unit_conversion"] },
    { questionId: "commerce.transaction_count.summary", version: "1.0.0", domainPackId: "commerce_distribution_mvp", metricId: "transaction_count", title: "How many governed commercial transactions are present?", businessPurpose: "Count governed commercial transaction identities without relabeling arbitrary rows as transactions.", intent: "summary", actionKind: "count_candidate", requiredDimensionGroups: [], timeRequirement: "not_required", sourceComplexity: "source_local", priority: 50, prohibitedUses: [...commonProhibitedUses, "row_count_as_transaction_count", "implicit_count_distinct"] },
    { questionId: "commerce.inventory_on_hand.as_of", version: "1.0.0", domainPackId: "commerce_distribution_mvp", metricId: "inventory_on_hand", title: "What inventory is on hand at the available as-of basis?", businessPurpose: "Review a governed point-in-time inventory balance without treating snapshots as movement.", intent: "point_in_time", actionKind: "snapshot_candidate", requiredDimensionGroups: [], timeRequirement: "point_in_time_as_of", sourceComplexity: "source_local", priority: 60, prohibitedUses: [...commonProhibitedUses, "inventory_movement_claim", "sum_across_time", "unit_conversion"] },
    { questionId: "commerce.inventory_on_hand.by_product", version: "1.0.0", domainPackId: "commerce_distribution_mvp", metricId: "inventory_on_hand", title: "Which products hold the most inventory at the as-of basis?", businessPurpose: "Rank a governed point-in-time inventory balance by product or SKU.", intent: "ranking", actionKind: "snapshot_candidate", requiredDimensionGroups: [["product", "sku"]], timeRequirement: "point_in_time_as_of", sourceComplexity: "source_local", priority: 65, prohibitedUses: [...commonProhibitedUses, "inventory_movement_claim", "sum_across_time", "unit_conversion"] },
    { questionId: "commerce.delivery_count.summary", version: "1.0.0", domainPackId: "commerce_distribution_mvp", metricId: "delivery_count", title: "How many governed deliveries are present?", businessPurpose: "Count governed delivery identities without relabeling status rows or line rows as deliveries.", intent: "summary", actionKind: "count_candidate", requiredDimensionGroups: [], timeRequirement: "not_required", sourceComplexity: "source_local", priority: 70, prohibitedUses: [...commonProhibitedUses, "row_count_as_delivery_count", "implicit_count_distinct"] },
    { questionId: "commerce.delivery_count.by_status", version: "1.0.0", domainPackId: "commerce_distribution_mvp", metricId: "delivery_count", title: "How are governed deliveries distributed by status?", businessPurpose: "Break down governed delivery identities by a canonically resolved delivery status.", intent: "status_breakdown", actionKind: "status_breakdown_candidate", requiredDimensionGroups: [["delivery_status"]], timeRequirement: "not_required", sourceComplexity: "source_local", priority: 75, prohibitedUses: [...commonProhibitedUses, "status_row_count_as_delivery_count"] },
    { questionId: "commerce.gross_profit.over_time", version: "1.0.0", domainPackId: "commerce_distribution_mvp", metricId: "gross_profit", title: "How is governed gross profit changing over compatible periods?", businessPurpose: "Review revenue less compatible cost only when the governed gross-profit preflight permits the derivation.", intent: "trend", actionKind: "trend_candidate", requiredDimensionGroups: [["report_date", "time_period"]], timeRequirement: "compatible_period", sourceComplexity: "relationship_dependent", priority: 80, prohibitedUses: [...commonProhibitedUses, "margin_claim", "unreconciled_revenue_cost_subtraction", "currency_conversion"] },
  ],
  rules: [
    { ruleId: "question.metric_only.v1", description: "A question requires a governed Phase 5M1 metric definition and its exact preflight result." },
    { ruleId: "question.no_state_strengthening.v1", description: "Question and action states may preserve or weaken, never strengthen, metric preflight state." },
    { ruleId: "question.canonical_dimensions_only.v1", description: "Required dimensions must be probable or confirmed selected canonical resolutions." },
    { ruleId: "question.blocked_not_default.v1", description: "Blocked, unknown, unsupported, and not-applicable questions are explanation-only." },
    { ruleId: "question.rank_deterministic.v1", description: "Rank by metric state, source complexity, policy priority, and governed identity." },
    { ruleId: "action.candidate_only.v1", description: "Phase 5M2 may describe guarded action candidates but cannot create, authorize, or execute runtime actions." },
  ],
  forbiddenInference: [
    "legacy_playbook_establishes_question",
    "alias_only_establishes_question",
    "filename_or_sample_id_changes_question",
    "blocked_metric_advertised_as_default",
    "unit_price_is_revenue",
    "snapshot_is_inventory_movement",
    "row_count_is_governed_entity_count",
    "missing_time_basis_is_trend",
    "gross_profit_without_compatible_cost",
    "question_authorizes_execution",
  ],
} as const satisfies QuestionActionPolicyV1;

export function questionActionPolicyHash(value: unknown = COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1): string {
  return deterministicPolicySha256(value);
}
