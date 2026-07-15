import type { CanonicalMetricSourceV1, GovernedMetricPreflightV1 } from "./governed-domain-metric-contracts";
import type { GovernedActionCandidateV1, QuestionActionGenerationV1 } from "./governed-question-action-contracts";

export const GOVERNED_RUNTIME_CONTRACT_VERSION = "lightbi.governed-runtime-contract.v1" as const;
export const GOVERNED_RUNTIME_POLICY_VERSION = "lightbi.governed-runtime-policy.v1" as const;

export type GovernedRuntimeStateV1 = "executable" | "conditionally_executable" | "blocked" | "unavailable" | "invalid";
export type GovernedMetricOperatorV1 = "governed_sum" | "governed_identity_count" | "governed_point_in_time_snapshot_sum" | "governed_revenue_minus_cost";

export type GovernedExecutionRestrictionV1 = {
  code: string;
  severity: "caution" | "material" | "critical";
  reason: string;
  references: string[];
  decisionUseBlocked: true;
};

export type GovernedExecutionEvidenceV1 = {
  evidenceId: string;
  kind: "metric_definition" | "metric_preflight" | "canonical_binding" | "grain" | "time" | "relationship" | "runtime_policy" | "duckdb_execution";
  references: string[];
  provenance: "governed_policy" | "canonical_artifact" | "governed_preflight" | "local_duckdb";
};

export type GovernedRuntimeBlockerV1 = {
  code: string;
  severity: "material" | "critical";
  source: "integrity" | "action" | "metric" | "binding" | "grain" | "dimension" | "time" | "unit_currency" | "duplicate" | "relationship" | "execution";
  references: string[];
};

export type GovernedColumnBindingV1 = {
  requirementId: string;
  role: "measure" | "identity" | "dimension" | "time";
  semanticId: string;
  sourceColumnIndex: number;
  physicalColumn: string;
  semanticState: "confirmed" | "probable";
};

export type GovernedAsOfBasisV1 = {
  kind: "source_snapshot" | "column_value";
  sourceColumnIndex: number | null;
  semanticId: string | null;
  value: string;
};

export type GovernedStructuredFilterV1 = {
  semanticId: string;
  sourceColumnIndex: number;
  operator: "equals";
  value: string | number | boolean;
};

export type GovernedRuntimeActionV1 = {
  schemaVersion: typeof GOVERNED_RUNTIME_CONTRACT_VERSION;
  actionId: string;
  sourceActionCandidateId: string;
  questionId: string;
  domainPackId: "commerce_distribution_mvp";
  metricId: string;
  metricVersion: string;
  sourceReference: string;
  operator: GovernedMetricOperatorV1;
  metricBindings: GovernedColumnBindingV1[];
  groupingBindings: GovernedColumnBindingV1[];
  timeBinding: GovernedColumnBindingV1 | null;
  asOfBasis: GovernedAsOfBasisV1 | null;
  filters: GovernedStructuredFilterV1[];
  restrictions: GovernedExecutionRestrictionV1[];
  evidence: GovernedExecutionEvidenceV1[];
  runtimeActionCreated: true;
  runtimeActionAuthorized: true;
  executionPerformed: false;
  decisionUseAuthorized: false;
  productionWiring: { executed: false };
};

export type GovernedRuntimePreflightInputV1 = {
  schemaVersion: "lightbi.governed-runtime-preflight-input.v1";
  canonicalSource: CanonicalMetricSourceV1;
  metricPreflight: GovernedMetricPreflightV1;
  questionGeneration: QuestionActionGenerationV1;
  actionCandidate: GovernedActionCandidateV1 | null;
  expectedRuntimePolicyHash: string;
  asOfBasis?: GovernedAsOfBasisV1 | null;
  filters?: GovernedStructuredFilterV1[];
};

export type GovernedRuntimePreflightV1 = {
  schemaVersion: "lightbi.governed-runtime-preflight.v1";
  identity: string;
  state: GovernedRuntimeStateV1;
  domainPackId: "commerce_distribution_mvp";
  sourceReference: string;
  actionCandidateId: string | null;
  metricId: string | null;
  metricVersion: string | null;
  runtimePolicyHash: string;
  metricPolicyHash: string;
  questionPolicyHash: string;
  planningAllowed: boolean;
  executionAllowed: boolean;
  action: GovernedRuntimeActionV1 | null;
  blockers: GovernedRuntimeBlockerV1[];
  restrictions: GovernedExecutionRestrictionV1[];
  evidence: GovernedExecutionEvidenceV1[];
  runtimeActionCreated: boolean;
  runtimeActionAuthorized: boolean;
  executionPerformed: false;
  decisionUseAuthorized: false;
  productionWiring: { executed: false };
};

export type GovernedMetricQueryPlanV1 = {
  schemaVersion: "lightbi.governed-metric-query-plan.v1";
  planId: string;
  runtimePreflightIdentity: string;
  actionId: string;
  metricId: string;
  metricVersion: string;
  sourceReference: string;
  dialect: "duckdb";
  tableIdentity: "__LIGHTBI_PREVIEW_TABLE__";
  operator: GovernedMetricOperatorV1;
  metricBindings: GovernedColumnBindingV1[];
  groupingBindings: GovernedColumnBindingV1[];
  timeBinding: GovernedColumnBindingV1 | null;
  asOfBasis: GovernedAsOfBasisV1 | null;
  filters: GovernedStructuredFilterV1[];
  sql: string;
  parameters: Array<string | number | boolean>;
  resultColumns: string[];
  restrictions: GovernedExecutionRestrictionV1[];
  evidence: GovernedExecutionEvidenceV1[];
  deterministic: true;
  decisionUseAuthorized: false;
  productionWiring: { executed: false };
};

export type GovernedGroundTruthReferenceV1 =
  | { state: "verified"; value: number; tolerance: number; provenance: string }
  | { state: "unavailable"; value: null; tolerance: null; provenance: string };

export type GovernedMetricExecutionRequestV1 = {
  schemaVersion: "lightbi.governed-metric-execution-request.v1";
  requestId: string;
  plan: GovernedMetricQueryPlanV1;
  rows: Record<string, unknown>[];
  groundTruth: GovernedGroundTruthReferenceV1;
};

export type GovernedMetricExecutionResultV1 = {
  schemaVersion: "lightbi.governed-metric-execution-result.v1";
  resultId: string;
  requestId: string;
  actionId: string;
  metricId: string;
  metricVersion: string;
  sourceReference: string;
  queryPlanIdentity: string;
  operator: GovernedMetricOperatorV1;
  dimensions: string[];
  timeBasis: GovernedAsOfBasisV1 | GovernedColumnBindingV1 | null;
  status: "executed" | "failed" | "blocked";
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  resultShape: "summary" | "grouped" | "trend";
  groundTruthComparison: { state: "exact_match" | "within_tolerance" | "mismatch" | "unavailable"; expected: number | null; actual: number | null; tolerance: number | null };
  evidence: GovernedExecutionEvidenceV1[];
  restrictions: GovernedExecutionRestrictionV1[];
  limitations: string[];
  error: string | null;
  runtimeActionCreated: true;
  runtimeActionAuthorized: true;
  executionPerformed: boolean;
  decisionUseAuthorized: false;
  productionWiring: { executed: false };
};

export type GovernedRuntimePolicyV1 = {
  schemaVersion: typeof GOVERNED_RUNTIME_POLICY_VERSION;
  contractVersion: typeof GOVERNED_RUNTIME_CONTRACT_VERSION;
  domainPackId: "commerce_distribution_mvp";
  metricIds: readonly string[];
  operators: Readonly<Record<string, GovernedMetricOperatorV1>>;
  conditionallyExecutableMetricIds: readonly string[];
  rules: readonly { ruleId: string; description: string }[];
  forbiddenBehavior: readonly string[];
};

export type GovernedDuckDBBoundaryResultV1 = {
  engine: "duckdb";
  status: "executed" | "failed";
  columns: string[];
  rows: Record<string, unknown>[];
  error: string | null;
  executionScope: "controlled_rows" | "full_file";
};

export interface GovernedDuckDBBoundaryV1 {
  execute(plan: GovernedMetricQueryPlanV1, rows: Record<string, unknown>[]): Promise<GovernedDuckDBBoundaryResultV1>;
}
