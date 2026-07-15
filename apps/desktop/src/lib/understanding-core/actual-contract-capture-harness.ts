import {enhancePlanWithGuardedSum} from "../guarded-sum-bridge";
import type {RuntimePlanPreview} from "../runtime-planner-preview";
import {createSafeSqlPreview} from "../safe-sql-preview";
import {deterministicPolicySha256} from "./contextual-evidence-policy";
import {ACTUAL_CONTRACT_SIDECAR_VERSION,type ActualContractCaptureV1,type ActualContractProjectionSidecarV1,type ConsumerBindingV1,type Phase4CReadinessReferenceV1,type Phase5ACanonicalEnvelopeReferenceV1,type Phase5B5ProjectionReferenceV1,type RuntimePlanBindingV1,type SidecarIntegrityV1} from "./actual-contract-sidecar-contracts";

const clone=<T>(value:T):T=>structuredClone(value);
const fingerprint=(value:unknown)=>deterministicPolicySha256(value);
const aggregationMap=(plan:RuntimePlanPreview)=>plan.logicalOperations.flatMap((op,index)=>op.type==="group_by"||op.type==="trend"?op.measures.map(measure=>({index,measure,operator:op.measureAggregations?.[measure]??"NONE" as const})):[]);
const observedOperator=(plan:RuntimePlanPreview):RuntimePlanBindingV1["operator"]=>{
 const values=aggregationMap(plan).map(x=>x.operator).filter(x=>x!=="NONE");
 return values[0]??"NONE";
};

export function captureActualRuntimeContracts(plan:RuntimePlanPreview,rows:Record<string,unknown>[]):ActualContractCaptureV1{
 const incomingPlan=clone(plan),enhancedPlan=enhancePlanWithGuardedSum(plan,rows),safeSqlPreview=createSafeSqlPreview(enhancedPlan);
 return{incomingPlan,enhancedPlan:clone(enhancedPlan),safeSqlPreview:clone(safeSqlPreview),actualSqlText:safeSqlPreview.sql,requestShape:{runtimePlan:clone(plan),safeSqlPreview:clone(safeSqlPreview),rows:clone(rows),limit:100},resultContractFields:["id","sourceSqlPreviewId","status","columns","rows","rowCount","maxRows","warnings","blockedReasons","errorMessage","executionScope","resultBuffer","source"],chartInputFields:["previewResult","runtimePlan","analysisLabel"],BAInputFields:["datasetId","previewResult","chartModel","aiBriefing","runtimeIntent"],queryExecuted:false,persistenceUsed:false,telemetryUsed:false};
}

const consumers=():ConsumerBindingV1[]=>[
 {consumer:"chart",contract:"CreateChartPreviewInput",actualFields:["previewResult","runtimePlan","analysisLabel"],classification:"sidecar_association_possible_without_contract_change",bindingMechanism:"bindingIdentity outside production object",restrictionVisibility:false,metricEvidenceVisibility:false,eligibilityEnforcementCapability:false,authorityEscalationRisk:true},
 {consumer:"KPI_card",contract:"no dedicated governed input contract",actualFields:[],classification:"requires_explicit_contract_migration",bindingMechanism:"none",restrictionVisibility:false,metricEvidenceVisibility:false,eligibilityEnforcementCapability:false,authorityEscalationRisk:true},
 {consumer:"BA",contract:"CreateBADecisionBriefInput",actualFields:["datasetId","previewResult","chartModel","aiBriefing","runtimeIntent"],classification:"requires_explicit_contract_migration",bindingMechanism:"bindingIdentity outside production object",restrictionVisibility:false,metricEvidenceVisibility:false,eligibilityEnforcementCapability:false,authorityEscalationRisk:true},
 {consumer:"narrative",contract:"no isolated governed input contract",actualFields:[],classification:"requires_explicit_contract_migration",bindingMechanism:"none",restrictionVisibility:false,metricEvidenceVisibility:false,eligibilityEnforcementCapability:false,authorityEscalationRisk:true},
 {consumer:"recommendation",contract:"BADecisionBrief decisionSuggestions",actualFields:["decisionSuggestions"],classification:"requires_explicit_contract_migration",bindingMechanism:"none",restrictionVisibility:false,metricEvidenceVisibility:false,eligibilityEnforcementCapability:false,authorityEscalationRisk:true}
];

export type CreateActualSidecarInput={projection:Phase5B5ProjectionReferenceV1|null;canonicalEnvelope:Phase5ACanonicalEnvelopeReferenceV1|null;readiness:Phase4CReadinessReferenceV1|null;sourceHash:string;capture:ActualContractCaptureV1|null};
export function createActualContractSidecar(input:CreateActualSidecarInput):ActualContractProjectionSidecarV1|null{
 if(!input.projection||!input.canonicalEnvelope||!input.readiness||!input.capture)return null;
 const {projection,canonicalEnvelope,readiness,capture}=input,planBefore=JSON.stringify(capture.incomingPlan),sqlBefore=capture.actualSqlText;
 const incoming=aggregationMap(capture.incomingPlan),enhanced=aggregationMap(capture.enhancedPlan);
 const insertions=enhanced.flatMap(after=>{const before=incoming.find(x=>x.index===after.index&&x.measure===after.measure);return before&&before.operator!==after.operator&&after.operator!=="NONE"?[{operationIndex:after.index,measure:after.measure,before:before.operator,after:after.operator as "SUM"|"COUNT"|"AVG"}]:[]});
 const incomingFingerprint=fingerprint(capture.incomingPlan),enhancedFingerprint=fingerprint(capture.enhancedPlan),sqlFingerprint=capture.actualSqlText===null?null:fingerprint(capture.actualSqlText);
 const operator=observedOperator(capture.enhancedPlan),reasons:string[]=[];
 if(projection.plan.lineage.sourceHash.value!==input.sourceHash)reasons.push("source_hash_mismatch");
 if(capture.enhancedPlan.id!==capture.incomingPlan.id||capture.enhancedPlan.sourceIntentId!==capture.incomingPlan.sourceIntentId)reasons.push("plan_identity_mismatch");
 if(capture.safeSqlPreview.sourcePlanId!==capture.enhancedPlan.id)reasons.push("sql_identity_mismatch");
 if(!projection.plan.lineage.identity)reasons.push("missing_lineage");
 const expectedToken=operator==="NONE"?null:`${operator}(`,consistent=expectedToken===null?true:Boolean(capture.actualSqlText?.includes(expectedToken));
 if(!consistent)reasons.push("sql_identity_mismatch");
 const state:SidecarIntegrityV1["state"]=reasons.includes("source_hash_mismatch")?"source_hash_mismatch":reasons.includes("plan_identity_mismatch")?"plan_identity_mismatch":reasons.includes("sql_identity_mismatch")?"sql_identity_mismatch":reasons.includes("missing_lineage")?"missing_lineage":"valid";
 const bindingIdentity=fingerprint({sourceHash:input.sourceHash,incomingFingerprint,enhancedFingerprint,sqlFingerprint,canonicalEnvelopeIdentity:canonicalEnvelope.envelopeIdentity,lineage:projection.plan.lineage.identity,restrictions:projection.plan.restrictions.identity});
 const metricReferenceState=typeof projection.plan.lineage.metricReference==="object"&&projection.plan.lineage.metricReference!==null&&"state" in projection.plan.lineage.metricReference?String((projection.plan.lineage.metricReference as {state:unknown}).state):"unknown";
 const sidecar:ActualContractProjectionSidecarV1={schemaVersion:ACTUAL_CONTRACT_SIDECAR_VERSION,lineage:{bindingIdentity,canonicalEnvelopeIdentity:canonicalEnvelope.envelopeIdentity,phase5B5LineageIdentity:projection.plan.lineage.identity,restrictionSetIdentity:projection.plan.restrictions.identity,sourceHash:input.sourceHash,physicalColumn:projection.plan.lineage.physicalColumn,metricReferenceState},canonicalReferences:{envelope:clone({envelopeIdentity:canonicalEnvelope.envelopeIdentity,capabilities:canonicalEnvelope.capabilities,trustDimensions:canonicalEnvelope.trustDimensions,blockers:canonicalEnvelope.blockers,limitations:canonicalEnvelope.limitations,debt:canonicalEnvelope.debt,remediation:canonicalEnvelope.remediation,restrictions:canonicalEnvelope.restrictions,summaryPercentage:canonicalEnvelope.summaryPercentage,productionWiring:canonicalEnvelope.productionWiring}),readiness:clone({identity:readiness.identity,capabilities:readiness.capabilities,trustDimensions:readiness.trustDimensions,blockers:readiness.blockers,limitations:readiness.limitations,debt:readiness.debt,requiredRemediation:readiness.requiredRemediation,presentationProjection:readiness.presentationProjection,productionWiring:readiness.productionWiring})},plan:{incomingFingerprint,enhancedFingerprint,incomingPlanId:capture.incomingPlan.id,enhancedPlanId:capture.enhancedPlan.id,operator,origin:projection.plan.lineage.origin.origin,insertions,planMutated:false,correspondenceEstablished:!reasons.includes("plan_identity_mismatch")},sqlPreview:{fingerprint:sqlFingerprint,sourcePlanId:capture.safeSqlPreview.sourcePlanId,status:capture.safeSqlPreview.status,dialect:capture.safeSqlPreview.dialect,operatorObserved:operator,structuralSummary:{referencedColumns:[...capture.safeSqlPreview.referencedColumns],hasGroupBy:Boolean(capture.actualSqlText?.includes("GROUP BY")),hasLimit:Boolean(capture.actualSqlText?.includes("LIMIT")),hasParameters:Object.keys(capture.safeSqlPreview.parameters).length>0},sqlCapturedExactlyByHarness:true,sqlTextRetained:false,sqlMutated:false,consistentWithEnhancedPlan:consistent},request:{contract:"BackendPreviewInput",fingerprint:fingerprint({runtimePlan:capture.requestShape.runtimePlan,safeSqlPreviewId:capture.requestShape.safeSqlPreview?.id,limit:capture.requestShape.limit}),actualFields:["runtimePlan","safeSqlPreview","rows","limit"],submitted:false,canCarry:{sourceIdentity:false,planIdentity:true,sqlIdentity:true,aggregationOrigin:false,restrictions:false,metricReference:false,canonicalEnvelopeIdentity:false,lineage:false,useEligibility:false}},result:{contract:"DuckDBPreviewResult",actualFields:capture.resultContractFields,availableForSafeInvocation:false,association:"deterministic_sidecar_only",missingFields:["aggregationOrigin","restrictions","metricReference","canonicalEnvelopeIdentity","lineage","useEligibility"]},consumers:consumers(),aggregation:{operator,origin:projection.plan.lineage.origin.origin},restrictions:clone(projection.plan.restrictions),requirements:clone(projection.plan.governance.requiredEvidence),metricReference:clone(projection.plan.lineage.metricReference),intendedDownstreamEligibility:clone(projection.plan.useEligibility),integrity:{state,failClosed:state!=="valid",reasons},shadowOnly:true,objectMutated:false,sqlMutated:false,approvalGranted:false,executionAuthorized:false,productionWiring:{executed:false}};
 if(JSON.stringify(capture.incomingPlan)!==planBefore||capture.actualSqlText!==sqlBefore)throw new Error("SIDECAR_MUTATION_DETECTED");
 return sidecar;
}

export class ActualSidecarBindingRegistry{
 private readonly bindings=new Map<string,string>();
 register(sidecar:ActualContractProjectionSidecarV1){const request=sidecar.request.fingerprint,existing=this.bindings.get(request);if(existing&&existing!==sidecar.lineage.bindingIdentity)return{state:"ambiguous_binding" as const,bindingIdentity:null};this.bindings.set(request,sidecar.lineage.bindingIdentity);return{state:"bound" as const,bindingIdentity:sidecar.lineage.bindingIdentity};}
 resolve(requestFingerprint:string,bindingIdentity:string){return this.bindings.get(requestFingerprint)===bindingIdentity?{state:"bound" as const,bindingIdentity}:{state:"stale_or_missing" as const,bindingIdentity:null};}
}
