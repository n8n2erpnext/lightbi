import {describe,expect,it} from "vitest";
import type {AggregationIntentInputV1} from "./aggregation-intent-contracts";
import {evaluateAggregationIntentBoundary} from "./aggregation-intent-boundary";
import type {AggregationProjectionInputV1} from "./aggregation-restriction-projection-contracts";
import {addDownstreamRestrictions,createRestrictionSet,projectAggregationRestrictions,validateDownstreamProjection} from "./aggregation-restriction-projection";
import {AGGREGATION_PROJECTION_POLICY,aggregationProjectionPolicyHash} from "./aggregation-restriction-projection-policy";

const probes=["automatic_sum_origin","explicit_sum_origin","explicit_avg_uncertified","explicit_count_scoped","no_aggregation_absent","planner_not_selected","imported_unverified","unknown_origin_closed","missing_restriction","restriction_removal","restriction_deduplication","stricter_restriction","sql_success","execution_success","non_empty_result","chart_not_BA","KPI_rejected","BA_without_metric","narrative_rejected","alert_rejected","persistence_rejected","ack_preserves","high_trust_preserves","repeated_parent","snapshot_time","non_additive","missing_measure_role","missing_grain","no_metric","invalid_metric","source_hash_mismatch","policy_hash_mismatch","lineage_mismatch","raw_sensitive_injection","timestamp_path_environment","input_order_shuffle","duplicate_evidence","no_production_import","no_plan_mutation","no_sql_mutation","no_operation_approval","no_runtime_migration"] as const;
const base=(overrides:Partial<AggregationIntentInputV1>={}):AggregationIntentInputV1=>({identity:{sourceIdentity:"sha256:source",sourceHash:{algorithm:"sha256",value:"a".repeat(64)},physicalColumnIndex:1,physicalColumn:"amount"},physicalOperatorSupported:true,intent:{operator:"SUM",origin:"automatic_legacy_default",explicit:false,countSemantics:null,requestedUse:["execution_authority","chart_display_use","BA_decision_use"]},acknowledgement:null,canonical:{envelopeValid:true,capabilityStates:{numeric_aggregation_ready:"blocked",measure_role_assessment_ready:"blocked"},measurePresent:true,measureRole:"unknown",grainState:"unknown",repeatedParentRisk:false,snapshotRisk:false,trustRatio:null},metricEvidence:null,...overrides});
const projection=(input=base(),extra:Omit<Partial<AggregationProjectionInputV1>,"artifact">={})=>projectAggregationRestrictions({artifact:evaluateAggregationIntentBoundary(input),...extra});

describe("Phase 5B5 lossless aggregation restriction projection",()=>{
 it("enumerates all 42 mandatory probes",()=>expect(probes).toHaveLength(42));
 it("preserves all aggregation origins without granting authority",()=>{
  const cases=[
   ["automatic_legacy_default","SUM",false],["explicit_user_selection","SUM",true],["explicit_user_selection","AVG",true],["explicit_user_selection","COUNT",true],["none","NONE",false],["planner_recommendation","SUM",false],["imported_query_or_configuration","SUM",true]
  ] as const;
  for(const [origin,operator,explicit] of cases){const p=projection(base({intent:{operator,origin,explicit,countSemantics:operator==="COUNT"?"count_rows":null,requestedUse:[]}}));expect(p.plan.observedAggregation).toEqual({operator,origin});expect(p.plan.lineage.countSemantics).toBe(operator==="COUNT"?"count_rows":null);expect(p.plan.approvalGranted).toBe(false);expect(p.plan.executionAuthorized).toBe(false);expect(p.BA.useEligibility.BAConclusionEligible).toBe(false);}
 });
 it("fails closed for unknown origin and invalid metric references",()=>{
  expect(projection(base({intent:{operator:"SUM",origin:"unknown",explicit:false,countSemantics:null,requestedUse:[]}})).plan.integrity.state).toBe("aggregation_origin_unknown");
  const p=projection(base(),{metricReference:{state:"approved_metric_reference",metricId:"metric",version:"1",approved:true,synthetic:true,approvalEvidenceId:"synthetic"}});
  expect(p.plan.integrity.state).toBe("metric_reference_invalid");expect(p.BA.useEligibility.BAConclusionEligible).toBe(false);
 });
 it("enforces monotonic, deduplicated restriction sets",()=>{
  const p=projection();
  const duplicate=createRestrictionSet([...p.plan.restrictions.restrictions,...p.plan.restrictions.restrictions]);
  expect(duplicate.identity).toBe(p.plan.restrictions.identity);expect(duplicate.restrictions).toHaveLength(p.plan.restrictions.restrictions.length);
  const removed=structuredClone(p.sqlPreview);removed.restrictions.restrictions.pop();
  expect(validateDownstreamProjection(p.plan,removed).reasons.some(x=>x.startsWith("restriction_removed"))).toBe(true);
  const stricter=addDownstreamRestrictions(p.sqlPreview,[{code:"REQUIRES_AGGREGATION_RULE",reason:"A governed rule is required."}]);
  expect(validateDownstreamProjection(p.plan,stricter).state).toBe("valid");
 });
 it("does not turn SQL, execution, rows, chart or trust into correctness",()=>{
  const p=projection(base({canonical:{...base().canonical,trustRatio:1}}),{sqlText:"SELECT SUM(amount)",sqlStatus:"observed_ready",executionObservation:{status:"success_observed",rowPresence:"non_empty_observed",provenance:"shadow-observation"}});
  expect(p.sqlPreview.sqlTextSufficientForAuthorityReconstruction).toBe(false);expect(p.result.executionStatus).toBe("success_observed");expect(p.result.rowPresence).toBe("non_empty_observed");expect(p.chart.KPIUseEligible).toBe(false);expect(p.BA.compatibility).toContain("BA_INELIGIBLE");expect(p.BA.compatibility).toContain("NARRATIVE_INELIGIBLE");expect(p.BA.compatibility).toContain("ALERT_INELIGIBLE");expect(p.BA.compatibility).toContain("PERSISTED_METRIC_INELIGIBLE");
 });
 it("preserves acknowledgement while retaining every business restriction",()=>{
  const p=projection(base({intent:{operator:"SUM",origin:"explicit_user_selection",explicit:true,countSemantics:null,requestedUse:[]},acknowledgement:{acknowledgementId:"redacted",present:true,scope:"single_exploratory_calculation",containsRawSensitiveValues:false,userIntentKnown:true,exploratoryExecutionConsent:true,businessCorrectnessEstablished:false}}));
  expect(p.plan.governance.acknowledgementState).toBe("present_exploratory_only");expect(p.plan.restrictions.restrictions.map(x=>x.code)).toEqual(expect.arrayContaining(AGGREGATION_PROJECTION_POLICY.requiredRestrictions));expect(p.BA.useEligibility.BAConclusionEligible).toBe(false);
 });
 it("retains repeated-parent, snapshot, non-additive, measure-role and grain requirements",()=>{
  const p=projection(base({canonical:{...base().canonical,measureRole:"rate",repeatedParentRisk:true,snapshotRisk:true}}));const codes=p.plan.restrictions.restrictions.map(x=>x.code);
  expect(codes).toEqual(expect.arrayContaining(["REQUIRES_REPEATED_TOTAL_RULE","REQUIRES_SNAPSHOT_TIME_RULE","REQUIRES_NON_ADDITIVE_FORMULA","REQUIRES_GRAIN_CONFIRMATION","REQUIRES_METRIC_DEFINITION"]));expect(p.plan.lineage.metricReference.state).toBe("no_metric");
 });
 it("detects source, policy and lineage tampering",()=>{
  const p=projection();
  const source=structuredClone(p.sqlPreview);source.lineage.sourceHash.value="b".repeat(64);expect(validateDownstreamProjection(p.plan,source).state).toBe("source_hash_mismatch");
  const policy=structuredClone(p.sqlPreview);policy.lineage.upstreamPolicyIdentities.projectionPolicyHash="bad";expect(validateDownstreamProjection(p.plan,policy).state).toBe("policy_mismatch");
  const lineage=structuredClone(p.sqlPreview);lineage.lineage.operator="AVG";expect(validateDownstreamProjection(p.plan,lineage).reasons).toContain("lineage_mismatch");
 });
 it("rejects raw sensitive, timestamp, path and environment injection",()=>{
  expect(projection(base(),{rawIncomingPlan:{rawSensitiveValue:"secret"}}).plan.integrity.state).toBe("privacy_violation");
  for(const value of ["2026-07-13T01:02:03Z","/home/user/data.csv","process.env.SECRET"]){expect(projection(base(),{rawIncomingPlan:{note:value}}).plan.integrity.state).toBe("privacy_violation");}
 });
 it("is deterministic under input order and duplicate evidence",()=>{
  const a=projection(base(),{groupingDimensions:["store","product","store"],filterSemantics:["b=2","a=1"]});const b=projection(base(),{groupingDimensions:["product","store"],filterSemantics:["a=1","b=2"]});
  expect(a.plan.lineage.identity).toBe(b.plan.lineage.identity);expect(a.plan.restrictions.identity).toBe(b.plan.restrictions.identity);
 });
 it("does not mutate plans, SQL, approval or migration state",()=>{
  const plan={id:"raw",logicalOperations:[{type:"group_by",measureAggregations:{amount:"SUM"}}]},before=JSON.stringify(plan),sql="SELECT SUM(amount)";
  const p=projection(base(),{rawIncomingPlan:plan,sqlText:sql});
  expect(JSON.stringify(plan)).toBe(before);expect(p.plan.rawIncomingPlan).not.toBe(plan);expect(p.plan.planMutated).toBe(false);expect(p.sqlPreview.sqlChanged).toBe(false);expect(p.sqlPreview.sqlFingerprint).toBeTruthy();expect(p.operationApproval.executed).toBe(false);expect(p.metricApproval.executed).toBe(false);expect(p.canonicalAuthorityMigrationEligible).toBe(false);expect(p.productionWiring.executed).toBe(false);
 });
 it("keeps the projection policy deterministic and import-isolated by contract",()=>{expect(aggregationProjectionPolicyHash({b:2,a:1})).toBe(aggregationProjectionPolicyHash({a:1,b:2}));expect(AGGREGATION_PROJECTION_POLICY.forbiddenEffects).toContain("export_from_barrel")});
});
