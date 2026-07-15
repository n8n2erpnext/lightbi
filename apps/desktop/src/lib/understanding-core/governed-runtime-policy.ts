import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import type { GovernedRuntimePolicyV1 } from "./governed-runtime-contracts";

export const GOVERNED_RUNTIME_POLICY_V1 = {
  schemaVersion: "lightbi.governed-runtime-policy.v1",
  contractVersion: "lightbi.governed-runtime-contract.v1",
  domainPackId: "commerce_distribution_mvp",
  metricIds: ["sales_revenue", "quantity_sold", "transaction_count", "inventory_on_hand", "delivery_count", "gross_profit"],
  operators: {
    sales_revenue: "governed_sum",
    quantity_sold: "governed_sum",
    transaction_count: "governed_identity_count",
    inventory_on_hand: "governed_point_in_time_snapshot_sum",
    delivery_count: "governed_identity_count",
    gross_profit: "governed_revenue_minus_cost",
  },
  conditionallyExecutableMetricIds: ["sales_revenue", "quantity_sold", "transaction_count", "inventory_on_hand", "delivery_count"],
  rules: [
    { ruleId: "runtime.metric_definition_authority.v1", description: "The governed metric definition, not question text or numeric health, selects the operator." },
    { ruleId: "runtime.exact_canonical_binding.v1", description: "Every metric, identity, dimension, and time column must match one selected probable or confirmed canonical binding." },
    { ruleId: "runtime.no_fallback.v1", description: "Unsupported or blocked aggregation never falls back to SUM, COUNT, or row count." },
    { ruleId: "runtime.snapshot_as_of.v1", description: "Inventory is executable only at one governed as-of basis and never across time." },
    { ruleId: "runtime.profit_compatibility.v1", description: "Gross profit requires compatible revenue, cost, grain, time, currency, duplicate, and relationship evidence." },
    { ruleId: "runtime.restrictions_monotonic.v1", description: "Conditional and decision-use restrictions are retained through planning and execution." },
    { ruleId: "runtime.execution_not_decision_authority.v1", description: "Successful DuckDB execution cannot authorize BA, narrative, recommendation, alert, or decision use." },
  ],
  forbiddenBehavior: [
    "legacy_isSafeForSum_authorization",
    "automatic_sum",
    "automatic_count_fallback",
    "free_form_question_to_sql",
    "ungoverned_count_distinct",
    "snapshot_sum_across_time",
    "blocked_metric_promotion",
    "restriction_removal",
    "production_or_ui_wiring",
  ],
} as const satisfies GovernedRuntimePolicyV1;

export function governedRuntimePolicyHash(value: unknown = GOVERNED_RUNTIME_POLICY_V1): string {
  return deterministicPolicySha256(value);
}
