import type {AggregationIntentBoundaryArtifactV1,AggregationResultRestrictionV1} from "./aggregation-intent-contracts";
import {deterministicPolicySha256} from "./contextual-evidence-policy";
import {AGGREGATION_PROJECTION_CONTRACT_VERSION,type AggregationBAProjectionV1,type AggregationChartProjectionV1,type AggregationGovernanceContextV1,type AggregationLineageEnvelopeV1,type AggregationMetricReferenceV1,type AggregationPlanProjectionV1,type AggregationProjectionInputV1,type AggregationProjectionIntegrityV1,type AggregationProjectionRestrictionCodeV1,type AggregationRestrictionProjectionArtifactV1,type AggregationRestrictionSetV1,type AggregationRestrictionV1,type AggregationResultProjectionV1,type AggregationSqlPreviewProjectionV1,type AggregationUseEligibilityV1} from "./aggregation-restriction-projection-contracts";
import {AGGREGATION_PROJECTION_POLICY,aggregationProjectionPolicyHash} from "./aggregation-restriction-projection-policy";

const mandatory:AggregationResultRestrictionV1[]=[
 {code:"NOT_BUSINESS_VERIFIED",reason:"No approved metric establishes business correctness."},
 {code:"NOT_ELIGIBLE_FOR_BA_CONCLUSION",reason:"Restricted projection cannot support a BA conclusion."},
 {code:"NOT_ELIGIBLE_FOR_NARRATIVE_CLAIM",reason:"Restricted projection cannot support a narrative claim."},
 {code:"NOT_ELIGIBLE_FOR_AUTOMATIC_ALERT",reason:"Restricted projection cannot trigger an automatic alert."},
 {code:"NOT_ELIGIBLE_FOR_PERSISTED_METRIC",reason:"Restricted projection cannot become a persisted metric."}
];
const chartRestriction:{code:AggregationProjectionRestrictionCodeV1;reason:string}={code:"NOT_ELIGIBLE_FOR_CHART_DECISION_USE",reason:"Mechanical chart rendering does not establish decision authority."};
const noMetric:AggregationMetricReferenceV1={state:"no_metric",metricId:null,version:null,approved:false,synthetic:false};
const useEligibility=():AggregationUseEligibilityV1=>({allowed:["mechanical_preview","exploratory_display"],prohibited:["decision_chart","KPI_card","BA_evidence","BA_conclusion","narrative","recommendation","automatic_alert","persisted_metric"],chartDecisionEligible:false,BAConclusionEligible:false,narrativeEligible:false,recommendationEligible:false,automaticAlertEligible:false,persistedMetricEligible:false,executionAuthorized:false});

const clone=<T>(value:T):T=>structuredClone(value);
const restrictionIdentity=(code:string)=>`aggregation-restriction:${code}`;
export function createRestrictionSet(values:Array<{code:AggregationProjectionRestrictionCodeV1;reason:string}>):AggregationRestrictionSetV1{
 const byIdentity=new Map<string,AggregationRestrictionV1>();
 for(const value of values){const governedIdentity=restrictionIdentity(value.code);if(!byIdentity.has(governedIdentity))byIdentity.set(governedIdentity,{code:value.code as AggregationProjectionRestrictionCodeV1,reason:value.reason,governedIdentity});}
 const restrictions=[...byIdentity.values()].sort((a,b)=>a.governedIdentity.localeCompare(b.governedIdentity));
 return{schemaVersion:"lightbi.aggregation-restriction-set.v1",identity:deterministicPolicySha256(restrictions.map(x=>({code:x.code,governedIdentity:x.governedIdentity}))),restrictions,absenceIsPermission:false};
}
const originTrace=(origin:AggregationIntentBoundaryArtifactV1["intent"]["origin"]):AggregationLineageEnvelopeV1["origin"]=>({origin,automatic:origin==="automatic_legacy_default",explicit:origin==="explicit_user_selection",recommended:origin==="planner_recommendation",imported:origin==="imported_query_or_configuration",metricGoverned:origin==="governed_metric_contract",unknown:origin==="unknown"});
const canonicalString=(values:string[])=>[...new Set(values)].sort();
const metricIdentity=(metric:AggregationMetricReferenceV1)=>metric.state==="no_metric"?"no_metric":`${metric.state}:${metric.metricId}:${metric.version??"unversioned"}:${metric.approved}`;

function privacyReasons(value:unknown):string[]{
 const serialized=JSON.stringify(value);
 const rules:[RegExp,string][]=[[/\/(?:home|Users|var|tmp|etc)\//,"filesystem_path"],[/[A-Za-z]:\\(?:Users|Windows|Program Files)\\/,"filesystem_path"],[/\b(?:process\.env|NODE_ENV|HOME=|USER=|PWD=)/,"environment_value"],[/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\b/,"timestamp"],[/\b(?:corpusId|expectedAnswer|uiComponentId|rawSensitiveValue)s?\b/i,"forbidden_field"]];
 return rules.filter(([pattern])=>pattern.test(serialized)).map(([,reason])=>reason);
}
function integrityFor(input:{lineage:AggregationLineageEnvelopeV1;restrictions:AggregationRestrictionSetV1;rawIncomingPlan:unknown}):AggregationProjectionIntegrityV1{
 const reasons:string[]=[];
 if(!input.lineage.sourceIdentity||!input.lineage.physicalColumn||!input.lineage.sourceHash.value)reasons.push("incomplete_lineage");
 if(!/^[a-f0-9]{64}$/i.test(input.lineage.sourceHash.value))reasons.push("source_hash_mismatch");
 if(input.lineage.origin.unknown)reasons.push("aggregation_origin_unknown");
 for(const code of AGGREGATION_PROJECTION_POLICY.requiredRestrictions)if(!input.restrictions.restrictions.some(x=>x.code===code))reasons.push(`missing_restriction:${code}`);
 if(input.lineage.metricReference.state==="approved_metric_reference"&&(!input.lineage.metricReference.approvalEvidenceId||input.lineage.metricReference.synthetic))reasons.push("metric_reference_invalid");
 reasons.push(...privacyReasons({lineage:input.lineage,rawIncomingPlan:input.rawIncomingPlan}).map(x=>`privacy_violation:${x}`));
 const state:AggregationProjectionIntegrityV1["state"]=reasons.some(x=>x.startsWith("privacy_violation"))?"privacy_violation":reasons.some(x=>x.startsWith("missing_restriction"))?"missing_restrictions":reasons.includes("source_hash_mismatch")?"source_hash_mismatch":reasons.includes("aggregation_origin_unknown")?"aggregation_origin_unknown":reasons.includes("metric_reference_invalid")?"metric_reference_invalid":reasons.includes("incomplete_lineage")?"incomplete_lineage":"valid";
 return{state,failClosed:state!=="valid",reasons};
}

export function validateDownstreamProjection(upstream:{lineage:AggregationLineageEnvelopeV1;restrictions:AggregationRestrictionSetV1;useEligibility:AggregationUseEligibilityV1},downstream:{lineage:AggregationLineageEnvelopeV1;restrictions:AggregationRestrictionSetV1;useEligibility:AggregationUseEligibilityV1}):AggregationProjectionIntegrityV1{
 const reasons:string[]=[];
 const lineageComparable=(value:AggregationLineageEnvelopeV1)=>{const {identity:_,restrictionSetIdentity:__,...rest}=value;return rest;};
 if(JSON.stringify(lineageComparable(upstream.lineage))!==JSON.stringify(lineageComparable(downstream.lineage)))reasons.push("lineage_mismatch");
 if(upstream.restrictions.identity===downstream.restrictions.identity&&upstream.lineage.identity!==downstream.lineage.identity)reasons.push("lineage_mismatch");
 if(upstream.lineage.sourceHash.value!==downstream.lineage.sourceHash.value)reasons.push("source_hash_mismatch");
 if(upstream.lineage.origin.origin!==downstream.lineage.origin.origin)reasons.push("aggregation_origin_changed");
 if(upstream.lineage.upstreamPolicyIdentities.projectionPolicyHash!==downstream.lineage.upstreamPolicyIdentities.projectionPolicyHash)reasons.push("policy_mismatch");
 const downstreamIds=new Set(downstream.restrictions.restrictions.map(x=>x.governedIdentity));
 for(const item of upstream.restrictions.restrictions)if(!downstreamIds.has(item.governedIdentity))reasons.push(`restriction_removed:${item.code}`);
 if(upstream.lineage.metricReference.state==="no_metric"&&downstream.lineage.metricReference.state==="approved_metric_reference")reasons.push("metric_reference_invalid");
 if(downstream.useEligibility.BAConclusionEligible||downstream.useEligibility.narrativeEligible||downstream.useEligibility.automaticAlertEligible||downstream.useEligibility.persistedMetricEligible)reasons.push("use_boundary_inconsistent");
 const state:AggregationProjectionIntegrityV1["state"]=reasons.some(x=>x==="policy_mismatch")?"policy_mismatch":reasons.some(x=>x==="source_hash_mismatch")?"source_hash_mismatch":reasons.some(x=>x.startsWith("restriction_removed"))?"missing_restrictions":reasons.some(x=>x==="metric_reference_invalid")?"metric_reference_invalid":reasons.some(x=>x==="use_boundary_inconsistent")?"use_boundary_inconsistent":reasons.length?"incomplete_lineage":"valid";
 return{state,failClosed:state!=="valid",reasons};
}

export function addDownstreamRestrictions<T extends {lineage:AggregationLineageEnvelopeV1;restrictions:AggregationRestrictionSetV1;useEligibility:AggregationUseEligibilityV1}>(projection:T,additional:Array<{code:AggregationProjectionRestrictionCodeV1;reason:string}>):T{
 const result=clone(projection),restrictions=createRestrictionSet([...result.restrictions.restrictions,...additional]);
 result.restrictions=restrictions;
 const {identity:_,...lineageSeed}=result.lineage;
 result.lineage={...result.lineage,restrictionSetIdentity:restrictions.identity,identity:deterministicPolicySha256({...lineageSeed,restrictionSetIdentity:restrictions.identity,metricReference:metricIdentity(result.lineage.metricReference)})};
 return result;
}

function governance(artifact:AggregationIntentBoundaryArtifactV1,canonicalCapabilityStates?:Record<string,string>):AggregationGovernanceContextV1{
 const codes=new Set(artifact.restrictions.map(x=>x.code));
 return{canonicalCapabilityStates:clone(canonicalCapabilityStates??{}),canonicalCapabilityStateSource:canonicalCapabilityStates?"provided":"not_retained_by_upstream_contract",measureRoleState:codes.has("REQUIRES_MEASURE_ROLE")?"present_unresolved":"resolved",grainState:codes.has("REQUIRES_GRAIN_CONFIRMATION")?"unknown":"confirmed",repeatedParentRisk:codes.has("REQUIRES_REPEATED_TOTAL_RULE")?"present":"not_established",snapshotRisk:codes.has("REQUIRES_SNAPSHOT_TIME_RULE")?"present":"not_established",nonAdditiveRisk:codes.has("REQUIRES_NON_ADDITIVE_FORMULA")?"present":"not_established",requiredEvidence:clone(artifact.requiredMetricEvidence),acknowledgementState:artifact.exploratoryBoundary.acknowledgement?.present?"present_exploratory_only":"absent"};
}
function common<S extends AggregationPlanProjectionV1["stage"]|AggregationSqlPreviewProjectionV1["stage"]|AggregationResultProjectionV1["stage"]|AggregationChartProjectionV1["stage"]|AggregationBAProjectionV1["stage"]>(stage:S,lineage:AggregationLineageEnvelopeV1,restrictions:AggregationRestrictionSetV1,governanceContext:AggregationGovernanceContextV1,integrity:AggregationProjectionIntegrityV1){
 const limitations=[{code:"PRODUCTION_CONTRACT_NOT_WIRED",message:"Projection is test/development-only.",blocksAuthority:true as const}];
 if(governanceContext.canonicalCapabilityStateSource==="not_retained_by_upstream_contract")limitations.push({code:"UPSTREAM_CAPABILITY_STATES_NOT_RETAINED",message:"Phase 5B4 replay artifact does not carry the original canonical capability-state map.",blocksAuthority:true as const});
 return{schemaVersion:AGGREGATION_PROJECTION_CONTRACT_VERSION,stage,lineage:clone(lineage),restrictions:clone(restrictions),governance:clone(governanceContext),useEligibility:useEligibility(),integrity:clone(integrity),limitations,debt:restrictions.restrictions.map(x=>({code:x.code,stage,severity:x.code.startsWith("NOT_")?"material" as const:"critical" as const,blocksProductionMigration:true as const})),shadowOnly:true as const,approvalGranted:false as const,executionAuthorized:false as const,productionWiring:{executed:false as const}};
}

export function projectAggregationRestrictions(input:AggregationProjectionInputV1):AggregationRestrictionProjectionArtifactV1{
 const artifact=input.artifact,metric=clone(input.metricReference??noMetric);
 const restrictionSet=createRestrictionSet([...artifact.restrictions,...mandatory,chartRestriction,...(input.additionalRestrictions??[])]);
 const lineageSeed={sourceIdentity:artifact.identity.sourceIdentity,sourceHash:artifact.identity.sourceHash,physicalColumnIndex:artifact.identity.physicalColumnIndex,physicalColumn:artifact.identity.physicalColumn,expression:null,operator:artifact.intent.operator,countSemantics:artifact.intent.countSemantics,origin:originTrace(artifact.intent.origin),groupingDimensions:canonicalString(input.groupingDimensions??[]),filterSemantics:canonicalString(input.filterSemantics??[]),timeBasis:input.timeBasis??null,metricReference:metric,restrictionSetIdentity:restrictionSet.identity,upstreamArtifactVersion:artifact.schemaVersion,upstreamPolicyIdentities:{aggregationIntentPolicyVersion:artifact.policyVersion,aggregationIntentPolicyHash:artifact.policyHash,projectionPolicyVersion:AGGREGATION_PROJECTION_POLICY.schemaVersion,projectionPolicyHash:aggregationProjectionPolicyHash()}};
 const lineage:AggregationLineageEnvelopeV1={schemaVersion:"lightbi.aggregation-lineage-envelope.v1",...lineageSeed,identity:deterministicPolicySha256({...lineageSeed,metricReference:metricIdentity(metric)})};
 const integrity=integrityFor({lineage,restrictions:restrictionSet,rawIncomingPlan:input.rawIncomingPlan??null});
 const g=governance(artifact,input.canonicalCapabilityStates),legacyInject=artifact.intent.origin==="automatic_legacy_default"&&artifact.intent.operator!=="NONE";
 const plan:AggregationPlanProjectionV1={...common("plan",lineage,restrictionSet,g,integrity),rawIncomingPlan:clone(input.rawIncomingPlan??null),observedAggregation:{operator:artifact.intent.operator,origin:artifact.intent.origin},intentClassification:artifact.disposition,requiredEvidence:clone(artifact.requiredMetricEvidence),legacyBridgeWouldInjectOperator:legacyInject,futureGovernedBoundaryWouldProhibitInjection:legacyInject,planMutated:false};
 const sqlPreview:AggregationSqlPreviewProjectionV1={...common("sql_preview",lineage,restrictionSet,g,integrity),sqlFingerprint:input.sqlText==null?null:deterministicPolicySha256(input.sqlText),sqlTextRetained:false,syntaxOrGenerationStatus:input.sqlStatus??"not_observed",sqlTextSufficientForAuthorityReconstruction:false,sqlChanged:false};
 const result:AggregationResultProjectionV1={...common("result",lineage,restrictionSet,g,integrity),executionStatus:input.executionObservation?.status??"not_executed",rowPresence:input.executionObservation?.rowPresence??"not_observed",executionProvenance:input.executionObservation?.provenance??null,rowsRetained:false};
 const chart:AggregationChartProjectionV1={...common("chart",lineage,restrictionSet,g,integrity),compatibility:integrity.state==="valid"?"restricted_display_with_warning":"invalid_projection",machineReadableRestrictions:true,KPIUseEligible:false,formattingGrantsAuthority:false};
 const BA:AggregationBAProjectionV1={...common("BA",lineage,restrictionSet,g,integrity),compatibility:["BA_INELIGIBLE","NARRATIVE_INELIGIBLE","ALERT_INELIGIBLE","PERSISTED_METRIC_INELIGIBLE"],rawRowsConvertedToConclusion:false,outputGenerated:false};
 return{schemaVersion:AGGREGATION_PROJECTION_CONTRACT_VERSION,sourceArtifactIdentity:`${artifact.identity.sourceHash.value}|${artifact.identity.physicalColumnIndex}|${artifact.identity.physicalColumn}`,plan,sqlPreview,result,chart,BA,projectionLossCount:0,rawInputPreserved:true,operationApproval:{executed:false},metricApproval:{executed:false},canonicalAuthorityMigrationEligible:false,productionWiring:{executed:false}};
}
