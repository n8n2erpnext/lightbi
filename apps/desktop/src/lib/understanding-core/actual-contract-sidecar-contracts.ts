import type {BackendPreviewInput} from "../backend-preview-executor";
import type {CreateBADecisionBriefInput} from "../ba-decision-engine";
import type {CreateChartPreviewInput} from "../chart-preview-model";
import type {DuckDBPreviewResult} from "../duckdb-preview-sandbox";
import type {RuntimePlanPreview} from "../runtime-planner-preview";
import type {SafeSqlPreview} from "../safe-sql-preview";

export const ACTUAL_CONTRACT_SIDECAR_VERSION="lightbi.actual-contract-projection-sidecar.v1" as const;
export const ACTUAL_CONTRACT_SIDECAR_POLICY_VERSION="lightbi.actual-contract-sidecar-policy.v1" as const;

export type SidecarIntegrityStateV1="valid"|"missing_canonical_envelope"|"missing_projection"|"source_hash_mismatch"|"plan_identity_mismatch"|"sql_identity_mismatch"|"ambiguous_binding"|"stale_result"|"missing_lineage"|"privacy_violation"|"unsupported_contract";
export type SidecarIntegrityV1={state:SidecarIntegrityStateV1;failClosed:boolean;reasons:string[]};
export type RuntimePlanBindingV1={incomingFingerprint:string;enhancedFingerprint:string;incomingPlanId:string;enhancedPlanId:string;operator:"SUM"|"COUNT"|"AVG"|"NONE";origin:string;insertions:Array<{operationIndex:number;measure:string;before:"SUM"|"COUNT"|"AVG"|"NONE";after:"SUM"|"COUNT"|"AVG"}>;planMutated:false;correspondenceEstablished:boolean};
export type SqlPreviewBindingV1={fingerprint:string|null;sourcePlanId:string;status:SafeSqlPreview["status"];dialect:SafeSqlPreview["dialect"];operatorObserved:"SUM"|"COUNT"|"AVG"|"NONE";structuralSummary:{referencedColumns:string[];hasGroupBy:boolean;hasLimit:boolean;hasParameters:boolean};sqlCapturedExactlyByHarness:true;sqlTextRetained:false;sqlMutated:false;consistentWithEnhancedPlan:boolean};
export type PreviewRequestBindingV1={contract:"BackendPreviewInput";fingerprint:string;actualFields:Array<keyof BackendPreviewInput>;submitted:false;canCarry:{sourceIdentity:false;planIdentity:true;sqlIdentity:true;aggregationOrigin:false;restrictions:false;metricReference:false;canonicalEnvelopeIdentity:false;lineage:false;useEligibility:false}};
export type PreviewResultBindingV1={contract:"DuckDBPreviewResult";actualFields:Array<keyof DuckDBPreviewResult>;availableForSafeInvocation:false;association:"deterministic_sidecar_only";missingFields:string[]};
export type ConsumerBindingV1={consumer:"chart"|"KPI_card"|"BA"|"narrative"|"recommendation";contract:string;actualFields:string[];classification:"sidecar_association_possible_without_contract_change"|"requires_explicit_contract_migration"|"ambiguous_binding"|"unsupported_consumer"|"unavailable_for_safe_test";bindingMechanism:string;restrictionVisibility:false;metricEvidenceVisibility:false;eligibilityEnforcementCapability:false;authorityEscalationRisk:true};
export type SidecarLineageBindingV1={bindingIdentity:string;canonicalEnvelopeIdentity:string;phase5B5LineageIdentity:string;restrictionSetIdentity:string;sourceHash:string;physicalColumn:string;metricReferenceState:string};
export type SidecarPolicyV1={schemaVersion:typeof ACTUAL_CONTRACT_SIDECAR_POLICY_VERSION;requiredIdentityParts:string[];forbiddenBindingStrategies:string[];forbiddenEffects:string[];privacyRules:string[]};
export type Phase5B5ProjectionReferenceV1={sourceArtifactIdentity:string;plan:{lineage:{identity:string;sourceHash:{algorithm:"sha256";value:string};physicalColumn:string;origin:{origin:string};metricReference:unknown};restrictions:{schemaVersion:string;identity:string;restrictions:Array<{code:string;reason:string;governedIdentity:string}>;absenceIsPermission:false};governance:{requiredEvidence:unknown};useEligibility:{chartDecisionEligible:false;BAConclusionEligible:false;narrativeEligible:false;recommendationEligible:false;automaticAlertEligible:false;persistedMetricEligible:false;executionAuthorized:false;[key:string]:unknown}}};
export type Phase5ACanonicalEnvelopeReferenceV1={envelopeIdentity:string;capabilities:unknown[];trustDimensions:unknown[];blockers:unknown[];limitations:unknown[];debt:unknown[];remediation:unknown[];restrictions:unknown[];summaryPercentage:null;productionWiring:{executed:false}};
export type Phase4CReadinessReferenceV1={identity:unknown;capabilities:unknown[];trustDimensions:unknown[];blockers:unknown[];limitations:unknown[];debt:unknown[];requiredRemediation:unknown[];presentationProjection:{summaryPercentage:null;productionWiring:{executed:false};[key:string]:unknown};productionWiring:{executed:false}};

export type ActualContractProjectionSidecarV1={
 schemaVersion:typeof ACTUAL_CONTRACT_SIDECAR_VERSION;
 lineage:SidecarLineageBindingV1;
 canonicalReferences:{
  envelope:Phase5ACanonicalEnvelopeReferenceV1;
  readiness:Phase4CReadinessReferenceV1;
 };
 plan:RuntimePlanBindingV1;
 sqlPreview:SqlPreviewBindingV1;
 request:PreviewRequestBindingV1;
 result:PreviewResultBindingV1;
 consumers:ConsumerBindingV1[];
 aggregation:{operator:RuntimePlanBindingV1["operator"];origin:string};
 restrictions:Phase5B5ProjectionReferenceV1["plan"]["restrictions"];
 requirements:Phase5B5ProjectionReferenceV1["plan"]["governance"]["requiredEvidence"];
 metricReference:Phase5B5ProjectionReferenceV1["plan"]["lineage"]["metricReference"];
 intendedDownstreamEligibility:Phase5B5ProjectionReferenceV1["plan"]["useEligibility"];
 integrity:SidecarIntegrityV1;
 shadowOnly:true;objectMutated:false;sqlMutated:false;approvalGranted:false;executionAuthorized:false;productionWiring:{executed:false};
};

export type ActualContractCaptureV1={incomingPlan:RuntimePlanPreview;enhancedPlan:RuntimePlanPreview;safeSqlPreview:SafeSqlPreview;actualSqlText:string|null;requestShape:Pick<BackendPreviewInput,"runtimePlan"|"safeSqlPreview"|"rows"|"limit">;resultContractFields:Array<keyof DuckDBPreviewResult>;chartInputFields:Array<keyof CreateChartPreviewInput>;BAInputFields:Array<keyof CreateBADecisionBriefInput>;queryExecuted:false;persistenceUsed:false;telemetryUsed:false};
