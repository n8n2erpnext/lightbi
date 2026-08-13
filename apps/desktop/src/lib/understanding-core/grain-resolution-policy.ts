import {deterministicPolicySha256} from "./contextual-evidence-policy";
import {GRAIN_RESOLUTION_POLICY_VERSION,type GrainResolutionPolicyV1} from "./grain-resolution-contracts";
export const GRAIN_RESOLUTION_POLICY:GrainResolutionPolicyV1={schemaVersion:GRAIN_RESOLUTION_POLICY_VERSION,rules:[
{ruleId:"GR-AXIS-COMPOSITION",axis:"governance",description:"Resolve structural, identity, parent, temporal, aggregation, and safety axes independently."},
{ruleId:"GR-NO-CANDIDATE-VOTE",axis:"governance",description:"Candidate quantity and absence of conflict are never support."},
{ruleId:"GR-EVIDENCE-INDEPENDENCE",axis:"governance",description:"Duplicate and shared derivation facts remain correlated and cannot increase certainty."},
{ruleId:"GR-STRUCT-LINE",axis:"structural_form",description:"Line requires granular row identity, repeated parent, child variation, and no material structural contradiction."},
{ruleId:"GR-STRUCT-ENTITY",axis:"structural_form",description:"Entity requires stable one-row-per-identity evidence without a stronger same-axis structure."},
{ruleId:"GR-STRUCT-DOCUMENT",axis:"structural_form",description:"Document remains viable from identity plus measures but requires independent document structure for resolution."},
{ruleId:"GR-STRUCT-MAPPING",axis:"structural_form",description:"Mapping requires two identity dimensions and governed pair behavior."},
{ruleId:"GR-STRUCT-AGGREGATE",axis:"structural_form",description:"No key alone is insufficient; aggregate requires grouping or reporting-period evidence."},
{ruleId:"GR-STRUCT-MIXED",axis:"structural_form",description:"Mixed requires material incompatible physical structures, not semantic ambiguity."},
{ruleId:"GR-IDENTITY-EXACT",axis:"identity_basis",description:"Confirmed identity requires exact full-file coverage, stable resolved semantic evidence, and no incomparable key."},
{ruleId:"GR-IDENTITY-LIMITED",axis:"identity_basis",description:"Ambiguous semantic or unresolved physical identity is capped at probable."},
{ruleId:"GR-PARENT-MECHANICAL",axis:"parent_basis",description:"Parent requires repetition, granular child identity, child variation, and clean structure."},
{ruleId:"GR-TEMPORAL-EVENT",axis:"temporal_mode",description:"Event requires resolved event time plus independent row activity evidence."},
{ruleId:"GR-TEMPORAL-SNAPSHOT",axis:"temporal_mode",description:"Snapshot requires identity plus period/state repetition evidence."},
{ruleId:"GR-TEMPORAL-INTERVAL",axis:"temporal_mode",description:"Interval requires compatible start and end evidence."},
{ruleId:"GR-TEMPORAL-UNRESOLVED",axis:"temporal_mode",description:"Unresolved physical dates remain unresolved and do not raise structural certainty."},
{ruleId:"GR-AGGREGATION-RISK",axis:"aggregation_form",description:"Resolve structural aggregation risk only; never declare metric additivity."},
{ruleId:"GR-DEBT-PRESERVATION",axis:"governance",description:"Candidate debt and all candidate alternatives remain visible."}
],materialStructuralCodes:["source_empty","header_not_found","mixed_type","duplicate_header","inconsistent_row_width","formula_error"],forbiddenInference:["domain_role","final_metric_additivity","cross_source_relationship","join_key","foreign_key","production_wiring","question","action","ba_output","total_grain_score","winner_take_all_grain"]};
export const grainResolutionPolicyHash=(value:unknown=GRAIN_RESOLUTION_POLICY)=>deterministicPolicySha256(value);
