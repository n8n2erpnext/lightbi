import {deterministicPolicySha256} from "./contextual-evidence-policy";
import {ACTUAL_CONTRACT_SIDECAR_POLICY_VERSION,type SidecarPolicyV1} from "./actual-contract-sidecar-contracts";

export const ACTUAL_CONTRACT_SIDECAR_POLICY:SidecarPolicyV1={
 schemaVersion:ACTUAL_CONTRACT_SIDECAR_POLICY_VERSION,
 requiredIdentityParts:["source_hash","incoming_plan_fingerprint","enhanced_plan_fingerprint","sql_fingerprint","canonical_envelope_identity","phase_5b5_lineage_identity","restriction_set_identity"],
 forbiddenBindingStrategies:["array_position","current_time","sql_text_only","source_identity_only","object_memory_address"],
 forbiddenEffects:["production_import","production_object_mutation","sql_mutation","query_execution","persistence","telemetry","feature_flag","authority_migration","metric_approval","barrel_export"],
 privacyRules:["retain_only_sql_fingerprint","retain_only_governed_structural_summary","do_not_persist_rows","do_not_persist_raw_literals"]
};
export const actualContractSidecarPolicyHash=()=>deterministicPolicySha256(ACTUAL_CONTRACT_SIDECAR_POLICY);
