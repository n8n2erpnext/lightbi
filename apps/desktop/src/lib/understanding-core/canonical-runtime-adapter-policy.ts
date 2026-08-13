import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import {
  RUNTIME_ADAPTER_POLICY_VERSION,
  type RuntimeAdapterPolicyV1,
} from "./canonical-runtime-contracts";

export const RUNTIME_ADAPTER_POLICY: RuntimeAdapterPolicyV1 = {
  schemaVersion: RUNTIME_ADAPTER_POLICY_VERSION,
  restrictions: [
    "DO_NOT_EXECUTE_JOIN",
    "DO_NOT_EXECUTE_APPEND",
    "DO_NOT_EXECUTE_COMPARE",
    "DO_NOT_EXECUTE_RECONCILIATION",
    "DO_NOT_AGGREGATE_MEASURES",
    "DO_NOT_ACTIVATE_DOMAIN",
    "DO_NOT_GENERATE_DOMAIN_METRICS",
    "DO_NOT_OVERRIDE_LEGACY_RUNTIME",
    "SHADOW_ONLY",
  ],
  forbiddenProjection: [
    "global_ready_flag",
    "summary_percentage",
    "state_reinterpretation",
    "operation_approval",
    "operation_execution",
    "aggregation_approval",
    "domain_activation",
    "legacy_fallback",
    "raw_values",
    "local_paths",
  ],
  governanceGates: {
    readinessValidationCoverageCompleteForShadowComparison: true,
    readinessValidationCoverageCompleteForAuthorityMigration: false,
  },
};

export const runtimeAdapterPolicyHash = (value: unknown = RUNTIME_ADAPTER_POLICY) =>
  deterministicPolicySha256(value);
