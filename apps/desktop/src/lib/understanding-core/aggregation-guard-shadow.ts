import {AGGREGATION_GUARD_SHADOW_VERSION,type AggregationGuardDispositionV1,type AggregationGuardEvidenceCodeV1,type AggregationGuardInputV1,type AggregationGuardShadowArtifactV1} from "./aggregation-guard-shadow-contracts";

const req=(...codes:AggregationGuardEvidenceCodeV1[])=>[...new Set(codes)].map(code=>({code,present:false as const}));
export function simulateAggregationGuard(input:AggregationGuardInputV1):AggregationGuardShadowArtifactV1{
 const c=input.canonical,i=input.intent;let disposition:AggregationGuardDispositionV1="observe_only_no_conflict";const evidence:AggregationGuardEvidenceCodeV1[]=[];
 if(!c.envelopeValid){disposition="invalid_canonical_envelope";evidence.push("REQUIRE_VALID_CANONICAL_ENVELOPE");}
 else if(!c.measurePresent||c.measureRole==="none"){disposition="no_measure_not_applicable";}
 else if(i.origin==="none"||i.operator==="NONE"){disposition="physical_operator_only";}
 else if(c.repeatedParentRisk){disposition="repeated_total_protection_required";evidence.push("REQUIRE_REPEATED_TOTAL_HANDLING","REQUIRE_GRAIN_CONFIRMATION");}
 else if(c.snapshotRisk||c.measureRole==="balance"){disposition="snapshot_time_rule_required";evidence.push("REQUIRE_SNAPSHOT_TIME_RULE","REQUIRE_AGGREGATION_RULE");}
 else if(["percentage","rate","average","unit_price"].includes(c.measureRole)){disposition="non_additive_measure_rule_required";evidence.push("REQUIRE_NON_ADDITIVE_FORMULA","REQUIRE_METRIC_DEFINITION");}
 else if(c.grainState!=="confirmed"){disposition="grain_confirmation_required";evidence.push("REQUIRE_GRAIN_CONFIRMATION");}
 else if(c.measureRole==="unknown"||c.capabilityStates.measure_role_assessment_ready!=="ready"){disposition="metric_semantics_required";evidence.push("REQUIRE_MEASURE_ROLE","REQUIRE_METRIC_DEFINITION","REQUIRE_DOMAIN_METRIC_PACK");}
 else if(i.origin==="automatic_default"&&i.operator==="SUM"&&c.capabilityStates.numeric_aggregation_ready!=="ready"){disposition="automatic_sum_would_be_blocked";evidence.push("REQUIRE_AGGREGATION_RULE","REQUIRE_METRIC_DEFINITION");}
 else if(i.explicit){disposition="explicit_aggregation_requires_confirmation";evidence.push("REQUIRE_EXPLICIT_USER_CONFIRMATION","REQUIRE_AGGREGATION_RULE");}
 else if(i.origin==="unknown"||i.operator==="UNKNOWN"){disposition="unsupported_or_unknown";evidence.push("REQUIRE_AGGREGATION_RULE");}
 return{schemaVersion:AGGREGATION_GUARD_SHADOW_VERSION,identity:{sourceIdentity:input.sourceIdentity,sourceHash:input.sourceHash,physicalColumnIndex:input.physicalColumnIndex,physicalColumn:input.physicalColumn},legacyNumericHealth:input.legacyNumericHealth,incomingIntent:i,canonicalRestriction:c,disposition,reasons:[{code:disposition,message:`Shadow disposition: ${disposition}; no runtime authority is granted.`}],requiredEvidence:req(...evidence),authority:input.authority,existingLegacyOutputPreserved:true,shadowOnly:true,planMutated:false,sqlChanged:false,approvalGranted:false,executionAuthorized:false,migrationImpact:{canonicalAuthorityMigrationEligible:false,productionWiring:{executed:false}}};
}
