import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import { GOVERNED_METRIC_DEFINITIONS_V1 } from "./governed-metric-policy";
import type { GovernedColumnBindingV1, GovernedMetricQueryPlanV1, GovernedRuntimePreflightV1 } from "./governed-runtime-contracts";
import { governedRuntimePreflightIdentity } from "./governed-runtime-preflight";
import { GOVERNED_RUNTIME_POLICY_V1, governedRuntimePolicyHash } from "./governed-runtime-policy";

const TABLE = "__LIGHTBI_PREVIEW_TABLE__" as const;

function quoteIdentifier(value: string): string { return `"${value.toLowerCase().replace(/"/g, '""')}"`; }
function quoteAlias(value: string): string { return `"${value.replace(/"/g, '""')}"`; }
function uniqueBindings(values: GovernedColumnBindingV1[]): GovernedColumnBindingV1[] {
  const map = new Map<string, GovernedColumnBindingV1>();
  for (const value of values) map.set(`${value.sourceColumnIndex}:${value.semanticId}`, value);
  return [...map.values()].sort((a, b) => a.semanticId.localeCompare(b.semanticId) || a.sourceColumnIndex - b.sourceColumnIndex);
}

export type GovernedMetricQueryPlanningResultV1 =
  | { state: "planned"; plan: GovernedMetricQueryPlanV1; blockers: [] }
  | { state: "blocked"; plan: null; blockers: string[] };

export function governedMetricQueryPlanIdentity(plan: Omit<GovernedMetricQueryPlanV1, "planId">): string {
  return `metric-plan:${deterministicPolicySha256(plan)}`;
}

export function planGovernedMetricQuery(preflight: GovernedRuntimePreflightV1): GovernedMetricQueryPlanningResultV1 {
  if (!preflight.planningAllowed || !preflight.executionAllowed || !preflight.action || !["executable", "conditionally_executable"].includes(preflight.state)) return { state: "blocked", plan: null, blockers: ["runtime_preflight_does_not_allow_planning"] };
  if (preflight.runtimePolicyHash !== governedRuntimePolicyHash()) return { state: "blocked", plan: null, blockers: ["runtime_policy_hash_mismatch"] };
  const action = preflight.action;
  if (governedRuntimePreflightIdentity(preflight.state as "executable" | "conditionally_executable", action, preflight.runtimePolicyHash) !== preflight.identity) return { state: "blocked", plan: null, blockers: ["runtime_preflight_identity_mismatch"] };
  const definition = GOVERNED_METRIC_DEFINITIONS_V1.find((item) => item.metricId === action.metricId && item.version === action.metricVersion);
  if (!definition) return { state: "blocked", plan: null, blockers: ["governed_metric_definition_missing"] };
  const governedOperator = (GOVERNED_RUNTIME_POLICY_V1.operators as Readonly<Record<string, GovernedMetricQueryPlanV1["operator"]>>)[action.metricId];
  if (!governedOperator || governedOperator !== action.operator) return { state: "blocked", plan: null, blockers: ["operator_differs_from_governed_metric_definition"] };
  if ((definition.aggregationOperator === "sum" && !["governed_sum", "governed_point_in_time_snapshot_sum"].includes(action.operator)) || (definition.aggregationOperator === "count_governed_identity" && action.operator !== "governed_identity_count") || (definition.aggregationOperator === "derive_subtraction" && action.operator !== "governed_revenue_minus_cost")) return { state: "blocked", plan: null, blockers: ["unsupported_metric_operator_combination"] };
  if (action.metricBindings.length !== definition.requirements.length) return { state: "blocked", plan: null, blockers: ["metric_binding_count_mismatch"] };
  if (action.operator === "governed_point_in_time_snapshot_sum" && !action.asOfBasis) return { state: "blocked", plan: null, blockers: ["snapshot_as_of_basis_missing"] };
  if (action.operator !== "governed_point_in_time_snapshot_sum" && action.asOfBasis) return { state: "blocked", plan: null, blockers: ["as_of_basis_not_permitted_for_metric"] };

  const grouping = uniqueBindings([...action.groupingBindings, ...(action.timeBinding ? [action.timeBinding] : [])]);
  const selectDimensions = grouping.map((binding) => `${quoteIdentifier(binding.physicalColumn)} AS ${quoteAlias(binding.semanticId)}`);
  let metricExpression: string;
  if (action.operator === "governed_sum" || action.operator === "governed_point_in_time_snapshot_sum") {
    metricExpression = `SUM(CAST(${quoteIdentifier(action.metricBindings[0].physicalColumn)} AS DOUBLE))`;
  } else if (action.operator === "governed_identity_count") {
    metricExpression = `CAST(COUNT(DISTINCT CAST(${quoteIdentifier(action.metricBindings[0].physicalColumn)} AS VARCHAR)) AS BIGINT)`;
  } else if (action.operator === "governed_revenue_minus_cost") {
    const revenue = action.metricBindings.find((item) => item.requirementId === "gross_profit_revenue");
    const cost = action.metricBindings.find((item) => item.requirementId === "gross_profit_cost");
    if (!revenue || !cost) return { state: "blocked", plan: null, blockers: ["gross_profit_component_binding_missing"] };
    metricExpression = `SUM(CAST(${quoteIdentifier(revenue.physicalColumn)} AS DOUBLE) - CAST(${quoteIdentifier(cost.physicalColumn)} AS DOUBLE))`;
  } else return { state: "blocked", plan: null, blockers: ["unsupported_governed_operator"] };

  const parameters: Array<string | number | boolean> = [];
  const predicates: string[] = [];
  for (const filter of action.filters) {
    const binding = grouping.find((item) => item.semanticId === filter.semanticId && item.sourceColumnIndex === filter.sourceColumnIndex);
    if (!binding || filter.operator !== "equals") return { state: "blocked", plan: null, blockers: ["unsupported_or_unbound_structured_filter"] };
    predicates.push(`${quoteIdentifier(binding.physicalColumn)} = ?`);
    parameters.push(filter.value);
  }
  if (action.asOfBasis?.kind === "column_value") {
    const binding = action.timeBinding ?? action.groupingBindings.find((item) => item.sourceColumnIndex === action.asOfBasis!.sourceColumnIndex && item.semanticId === action.asOfBasis!.semanticId);
    if (!binding) return { state: "blocked", plan: null, blockers: ["as_of_column_not_bound"] };
    predicates.push(`${quoteIdentifier(binding.physicalColumn)} = ?`);
    parameters.push(action.asOfBasis.value);
  }
  const select = [...selectDimensions, `${metricExpression} AS ${quoteAlias(action.metricId)}`].join(", ");
  const groupBy = grouping.length ? `\nGROUP BY ${grouping.map((item) => quoteIdentifier(item.physicalColumn)).join(", ")}` : "";
  const orderBy = grouping.length ? `\nORDER BY ${grouping.map((item) => quoteIdentifier(item.physicalColumn)).join(", ")}` : "";
  const where = predicates.length ? `\nWHERE ${predicates.join(" AND ")}` : "";
  const limit = grouping.length ? "\nLIMIT 100" : "";
  const sql = `SELECT ${select}\nFROM ${TABLE}${where}${groupBy}${orderBy}${limit};`;
  const base: Omit<GovernedMetricQueryPlanV1, "planId"> = {
    schemaVersion: "lightbi.governed-metric-query-plan.v1", runtimePreflightIdentity: preflight.identity, actionId: action.actionId, metricId: action.metricId, metricVersion: action.metricVersion,
    sourceReference: action.sourceReference, dialect: "duckdb", tableIdentity: TABLE, operator: action.operator, metricBindings: action.metricBindings.map((item) => ({ ...item })),
    groupingBindings: action.groupingBindings.map((item) => ({ ...item })), timeBinding: action.timeBinding ? { ...action.timeBinding } : null, asOfBasis: action.asOfBasis ? { ...action.asOfBasis } : null,
    filters: action.filters.map((item) => ({ ...item })), sql, parameters, resultColumns: [...grouping.map((item) => item.semanticId), action.metricId], restrictions: action.restrictions.map((item) => ({ ...item, references: [...item.references] })),
    evidence: action.evidence.map((item) => ({ ...item, references: [...item.references] })), deterministic: true, decisionUseAuthorized: false, productionWiring: { executed: false },
  };
  return { state: "planned", plan: { ...base, planId: governedMetricQueryPlanIdentity(base) }, blockers: [] };
}
