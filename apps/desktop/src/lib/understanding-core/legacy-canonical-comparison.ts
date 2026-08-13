import crypto from "node:crypto";
import type { CanonicalRuntimeEnvelopeV1 } from "./canonical-runtime-contracts";
import { runtimeAdapterPolicyHash } from "./canonical-runtime-adapter-policy";
import {
  LEGACY_CANONICAL_COMPARISON_VERSION,
  type ComparisonDivergenceV1,
  type ComparisonDispositionV1,
  type ComparisonSeverityV1,
  type LegacyCanonicalComparisonArtifactV1,
  type LegacyObservationV1,
} from "./legacy-canonical-comparison-contracts";
import { COMPARISON_MAPPINGS, LEGACY_CANONICAL_COMPARISON_POLICY, comparisonPolicyHash } from "./legacy-canonical-comparison-policy";

function canonicalJson(value:unknown):string{if(value===null||typeof value!=="object")return JSON.stringify(value);if(Array.isArray(value))return`[${value.map(canonicalJson).join(",")}]`;return`{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`}
const digest=(value:unknown)=>crypto.createHash("sha256").update(canonicalJson(value)).digest("hex");
const severityRank:Record<ComparisonSeverityV1,number>={informational:0,caution:1,material:2,critical:3};

function validateEnvelope(envelope:CanonicalRuntimeEnvelopeV1){
  if(envelope.canonicalDecisionAuthority||envelope.canonicalOperationAuthority||envelope.productionWiring.executed)throw new Error("COMPARISON_CANONICAL_AUTHORITY_LEAK");
  if(envelope.provenance.adapterPolicyHash!==runtimeAdapterPolicyHash())throw new Error("COMPARISON_ADAPTER_POLICY_MISMATCH");
  if(envelope.summaryPercentage!==null||!envelope.restrictions.some(r=>r.code==="SHADOW_ONLY"))throw new Error("COMPARISON_INVALID_CANONICAL_ENVELOPE");
}

export function compareLegacyAndCanonicalForTest(legacy:LegacyObservationV1,envelope:CanonicalRuntimeEnvelopeV1):LegacyCanonicalComparisonArtifactV1{
  validateEnvelope(envelope);
  if(/(?:\/home\/|\\Users\\|\/tmp\/)/i.test(JSON.stringify(legacy.raw)))throw new Error("COMPARISON_PRIVACY_VIOLATION");
  const mappings=COMPARISON_MAPPINGS.filter(m=>m.legacyModuleId===legacy.moduleId&&m.legacyField===legacy.outputField);
  if(new Set(mappings.map(m=>m.mappingId)).size!==mappings.length)throw new Error("COMPARISON_DUPLICATE_MAPPING");
  const divergences:ComparisonDivergenceV1[]=[],agreements:ComparisonDivergenceV1[]=[];
  if(!legacy.available){divergences.push({class:"unsupported_comparison",severity:"material",mappingId:"none",evidence:["legacy_observation_unavailable"]});}
  for(const mapping of mappings){
    if(!mapping.validScopes.includes(envelope.artifactScope)){divergences.push({class:"scope_semantics_mismatch",severity:"material",mappingId:mapping.mappingId,evidence:[envelope.artifactScope]});continue;}
    const capabilities=mapping.canonicalCapabilities.map(id=>envelope.capabilities.find(c=>c.capabilityId===id)).filter(Boolean)!;
    if(mapping.comparisonType==="structurally_incomparable"||mapping.comparisonType==="partially_comparable")divergences.push({class:"numeric_score_not_comparable",severity:"caution",mappingId:mapping.mappingId,evidence:["legacy_scalar_preserved","canonical_dimensions_preserved"]});
    if(mapping.mappingId==="MAP-NUMERIC-SUM-SAFETY"){
      const allows=legacy.decisions.isSafeForSum===true,blocked=capabilities.some(c=>c!.state==="blocked");
      (allows&&blocked?divergences:agreements).push({class:allows&&blocked?"safety_conflict":"agreement_same_restriction",severity:allows&&blocked?"critical":"informational",mappingId:mapping.mappingId,evidence:[`legacy_allows:${allows}`,`canonical_blocked:${blocked}`]});
    }
    if(mapping.mappingId==="MAP-PLAN-STATUS"){
      const allows=["ready","approved","execute"].includes(String(legacy.category??legacy.decisions.status));
      const prohibited=envelope.restrictions.some(r=>r.code==="DO_NOT_EXECUTE_JOIN"||r.code==="DO_NOT_EXECUTE_APPEND");
      if(allows&&prohibited)divergences.push({class:"authority_conflict",severity:"critical",mappingId:mapping.mappingId,evidence:["legacy_planning_allows","canonical_operation_prohibited"]});
    }
    if(mapping.mappingId==="MAP-DOMAIN-METRIC"){
      const allows=legacy.decisions.available===true,unsupported=capabilities.some(c=>c!.state==="unsupported");
      if(allows&&unsupported)divergences.push({class:"safety_conflict",severity:"critical",mappingId:mapping.mappingId,evidence:["legacy_domain_metric_available","canonical_domain_unsupported"]});
      else agreements.push({class:"agreement_same_availability",severity:"informational",mappingId:mapping.mappingId,evidence:[`legacy_available:${allows}`,`canonical_unsupported:${unsupported}`]});
    }
    if((legacy.numericScore??0)>=85&&capabilities.some(c=>c!.state==="blocked"||c!.state==="conditionally_ready"))divergences.push({class:"legacy_overstates_readiness",severity:"material",mappingId:mapping.mappingId,evidence:["legacy_high_numeric_score","canonical_not_ready"]});
  }
  if(!mappings.length&&legacy.available)divergences.push({class:"canonical_missing_legacy_concept",severity:"informational",mappingId:"none",evidence:[legacy.moduleId,legacy.outputField]});
  const severity=[...divergences,...agreements].reduce<ComparisonSeverityV1>((max,item)=>severityRank[item.severity]>severityRank[max]?item.severity:max,"informational");
  const disposition:ComparisonDispositionV1=!legacy.available?"blocked_by_missing_legacy_observation":severity==="critical"?"critical_safety_migration_gate":divergences.some(d=>d.class==="scope_semantics_mismatch")?"requires_scope_review":divergences.length?"requires_legacy_contract_review":"no_action_information_only";
  const subject={scope:envelope.artifactScope,sourceHashes:envelope.provenance.sourceHashes.map(s=>s.hash),subjectIdentity:digest({scope:envelope.artifactScope,hashes:envelope.provenance.sourceHashes.map(s=>s.hash)})};
  const withoutIdentity={contractVersion:LEGACY_CANONICAL_COMPARISON_VERSION,subject,legacy:structuredClone(legacy),canonical:{envelopeIdentity:envelope.envelopeIdentity,capabilities:structuredClone(envelope.capabilities),trustDimensions:structuredClone(envelope.trustDimensions),restrictions:structuredClone(envelope.restrictions),authority:structuredClone(envelope.authority)},comparisonPolicyVersion:LEGACY_CANONICAL_COMPARISON_POLICY.schemaVersion,comparisonPolicyHash:comparisonPolicyHash(),mappingRationale:mappings.map(m=>m.rationale),result:{mappingIds:mappings.map(m=>m.mappingId).sort(),comparableDimensions:mappings.filter(m=>m.comparisonType==="directly_comparable"||m.comparisonType==="authority_only_comparable").flatMap(m=>m.canonicalCapabilities).sort(),incomparableDimensions:mappings.filter(m=>m.comparisonType==="structurally_incomparable"||m.comparisonType==="partially_comparable").flatMap(m=>m.canonicalCapabilities).sort(),agreements,divergences,severity,limitations:!legacy.deterministic?["legacy_environment_sensitive"]:[],migrationImplications:severity==="critical"?["blocks_phase_5c_authority_migration"]:[],disposition},authority:{legacyAuthority:legacy.authority,canonicalAuthority:"none" as const,legacyAuthorityChanged:false as const,canonicalAuthorityChanged:false as const},limitations:!legacy.deterministic?[{code:"legacy_environment_sensitive",references:[legacy.observationId]}]:[],debt:[{code:"phase_4c2_executable_coverage_incomplete",blocksPhase5C:true}],comparisonExecuted:true as const,legacyAuthorityChanged:false as const,canonicalAuthorityChanged:false as const,operationApproval:{executed:false as const},productionWiring:{executed:false as const}};
  return{...withoutIdentity,comparisonIdentity:`sha256:${digest(withoutIdentity)}`};
}
