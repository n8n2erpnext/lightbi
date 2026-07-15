import {deterministicPolicySha256} from "./contextual-evidence-policy";
import {AGGREGATION_PROJECTION_POLICY_VERSION,type AggregationProjectionPolicyV1} from "./aggregation-restriction-projection-contracts";

export const AGGREGATION_PROJECTION_POLICY:AggregationProjectionPolicyV1={
 schemaVersion:AGGREGATION_PROJECTION_POLICY_VERSION,
 requiredRestrictions:["NOT_BUSINESS_VERIFIED","NOT_ELIGIBLE_FOR_CHART_DECISION_USE","NOT_ELIGIBLE_FOR_BA_CONCLUSION","NOT_ELIGIBLE_FOR_NARRATIVE_CLAIM","NOT_ELIGIBLE_FOR_AUTOMATIC_ALERT","NOT_ELIGIBLE_FOR_PERSISTED_METRIC"],
 restrictionRules:["restrictions are monotonic downstream","duplicates are deduplicated by governed identity","stricter downstream restrictions are allowed","absence is not permission","acknowledgement cannot remove correctness restrictions"],
 lineageFields:["source hash","physical column","operator","origin","grouping dimensions","filter semantics","time basis","metric reference","restriction set","upstream policies"],
 privacyForbidden:["raw sensitive values","current timestamps","filesystem paths","locale","environment values","UI component IDs","corpus IDs","expected answers"],
 authorityRules:["displayability is not BA eligibility","query success is not correctness","chart construction cannot establish metric authority","BA consumption cannot establish metric authority","approved metric state requires actual approval evidence"],
 forbiddenEffects:["mutate_plan","change_sql","execute_query","approve_operation","approve_metric","collect_acknowledgement","wire_production","emit_user_output","export_from_barrel"]
};
export const aggregationProjectionPolicyHash=(value:unknown=AGGREGATION_PROJECTION_POLICY)=>deterministicPolicySha256(value);
