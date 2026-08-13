import type {GrainCandidateArtifactV1,GrainEvidenceV1} from "./grain-candidate-contracts";
import type {AxisResolutionV1,GrainAxis,GrainAxisState,GrainResolutionArtifactV1} from "./grain-resolution-contracts";

export const GRAIN_RESOLUTION_VALIDATION_VERSION="lightbi.grain-resolution-validation.v1" as const;
export type GrainAuditDisposition="valid_confirmed"|"valid_probable"|"should_be_ambiguous"|"should_be_unknown"|"expectation_requires_review"|"generic_policy_defect"|"upstream_candidate_debt"|"insufficient_evaluation_evidence";
export type CrossAxisDependencyV1={fromAxis:GrainAxis;toAxis:GrainAxis;kind:"prerequisite"|"shared_physical_fact";sharedEvidenceFingerprints:string[];countsAsIndependentSupport:false;explanationCode:string};
export type AxisValidationV1={axis:GrainAxis;state:GrainAxisState;value:string;alternatives:string[];candidateTraceIds:string[];governingRuleIds:string[];independentEvidence:string[];correlatedEvidence:AxisResolutionV1<string>["independence"]["correlatedEvidence"];evidenceProvenance:AxisResolutionV1<string>["evidenceProvenance"];semanticDependencies:AxisResolutionV1<string>["semanticDependencies"];semanticResolutionStates:string[];usesUnresolvedPhysicalIdentity:boolean;debtEffects:AxisResolutionV1<string>["debtEffects"];structuralLimitations:string[];conflicts:string[];dominanceResults:Array<{candidateId:string;dominatedBy:string|null;dominates:string[];partialOrderOnly:true}>;allowedStates:GrainAxisState[];forbiddenStates:GrainAxisState[];conforms:boolean;falseCertaintyRisks:string[];disposition:GrainAuditDisposition};
export type GrainValidationV1={schemaVersion:typeof GRAIN_RESOLUTION_VALIDATION_VERSION;axisDecisions:AxisValidationV1[];dependencyGraph:CrossAxisDependencyV1[];forbiddenCertaintyViolations:string[];allMeasuresUnsafe:boolean;candidateOrderPreserved:boolean;productionIsolated:boolean};

const axisEntries=(result:GrainResolutionArtifactV1):Array<[GrainAxis,AxisResolutionV1<string>]>=>([["structural_form",result.signature.structuralForm],["identity_basis",result.signature.identityBasis],["parent_basis",result.signature.parentBasis],["temporal_mode",result.signature.temporalMode],["aggregation_form",result.signature.aggregationForm]] as Array<[GrainAxis,AxisResolutionV1<string>]>);
const allEvidence=(grain:GrainCandidateArtifactV1)=>[...grain.grainCandidates.flatMap((item)=>[...item.supportingEvidence,...item.conflictingEvidence]),...grain.rowIdentityCandidates.flatMap((item)=>item.evidence),...grain.parentIdentityCandidates.flatMap((item)=>item.evidence),...grain.temporalBehaviors.flatMap((item)=>item.evidence),...grain.measureBehaviors.flatMap((item)=>item.evidence)];
const fingerprint=(item:GrainEvidenceV1)=>`${item.family}|${[...item.physicalColumns].sort().join(",")}|${item.provenance}`;
const candidateColumns=(grain:GrainCandidateArtifactV1,candidateIds:string[],kind:"row"|"parent")=>{const candidates=kind==="row"?grain.rowIdentityCandidates:grain.parentIdentityCandidates;return new Set(candidates.filter((item)=>candidateIds.includes(item.candidateId)).flatMap((item)=>item.columns));};
function relevantSemanticDependencies(grain:GrainCandidateArtifactV1,result:GrainResolutionArtifactV1,axisName:GrainAxis,axis:AxisResolutionV1<string>){
  let columns:Set<string>|null=null;
  if(axisName==="identity_basis")columns=candidateColumns(grain,result.signature.identityBasis.selectedCandidateIds,"row");
  else if(axisName==="parent_basis")columns=candidateColumns(grain,result.signature.parentBasis.selectedCandidateIds,"parent");
  else if(axisName==="structural_form"&&["document","entity","line"].includes(result.signature.structuralForm.value)){
    columns=candidateColumns(grain,result.signature.identityBasis.selectedCandidateIds,"row");
    if(result.signature.structuralForm.value==="line")for(const column of candidateColumns(grain,result.signature.parentBasis.selectedCandidateIds,"parent"))columns.add(column);
  }
  return columns?[...axis.semanticDependencies].filter((item)=>columns.has(item.physicalColumn)):axis.semanticDependencies;
}

export function validateGrainResolution(grain:GrainCandidateArtifactV1,result:GrainResolutionArtifactV1):GrainValidationV1{
  const evidenceById=new Map(allEvidence(grain).map((item)=>[item.evidenceId,item])),entries=axisEntries(result),dependencyGraph:CrossAxisDependencyV1[]=[];
  for(let left=0;left<entries.length;left++)for(let right=left+1;right<entries.length;right++){
    const [leftAxis,leftResult]=entries[left],[rightAxis,rightResult]=entries[right],leftFacts=new Set(leftResult.supportingEvidenceReferences.map((id)=>evidenceById.get(id)).filter(Boolean).map((item)=>fingerprint(item!))),rightFacts=new Set(rightResult.supportingEvidenceReferences.map((id)=>evidenceById.get(id)).filter(Boolean).map((item)=>fingerprint(item!))),shared=[...leftFacts].filter((item)=>rightFacts.has(item)).sort();
    if(shared.length)dependencyGraph.push({fromAxis:leftAxis,toAxis:rightAxis,kind:"shared_physical_fact",sharedEvidenceFingerprints:shared,countsAsIndependentSupport:false,explanationCode:"cross_axis_evidence_reuse"});
  }
  if(result.signature.structuralForm.value==="line"){
    dependencyGraph.push({fromAxis:"identity_basis",toAxis:"structural_form",kind:"prerequisite",sharedEvidenceFingerprints:[],countsAsIndependentSupport:false,explanationCode:"line_requires_granular_identity"});
    dependencyGraph.push({fromAxis:"parent_basis",toAxis:"structural_form",kind:"prerequisite",sharedEvidenceFingerprints:[],countsAsIndependentSupport:false,explanationCode:"line_requires_repeated_parent"});
  }
  if(result.signature.structuralForm.value==="entity")dependencyGraph.push({fromAxis:"identity_basis",toAxis:"structural_form",kind:"prerequisite",sharedEvidenceFingerprints:[],countsAsIndependentSupport:false,explanationCode:"entity_requires_identity"});
  if(result.signature.aggregationForm.value==="repeated_parent_values")dependencyGraph.push({fromAxis:"parent_basis",toAxis:"aggregation_form",kind:"prerequisite",sharedEvidenceFingerprints:[],countsAsIndependentSupport:false,explanationCode:"repeated_values_require_parent_context"});
  const violations:string[]=[];
  if(result.signature.identityBasis.state==="confirmed"&&result.signature.identityBasis.value==="unresolved_physical_key")violations.push("confirmed_unresolved_physical_identity");
  if(result.signature.measureSafety.safeToAggregate!==false)violations.push("measure_marked_safe_by_grain");
  const axisDecisions=entries.filter(([,axis])=>axis.state!=="unknown").map(([axisName,axis])=>{
    const semanticDependencies=relevantSemanticDependencies(grain,result,axisName,axis),directFullFile=axis.evidenceProvenance.some((item)=>item.provenance==="full_file_profile"||item.provenance==="full_file_rows"),onlyCorrelated=axis.independence.independentEvidenceReferences.length===0&&axis.supportingEvidenceReferences.length>0,risks:string[]=[];
    if((axis.state==="probable"||axis.state==="confirmed")&&!directFullFile)risks.push("no_direct_mechanical_full_file_basis");
    if((axis.state==="probable"||axis.state==="confirmed")&&onlyCorrelated)risks.push("correlated_evidence_only");
    if(axis.state==="confirmed"&&semanticDependencies.some((item)=>item.state==="ambiguous"||item.state==="unknown"))risks.push("semantic_ambiguity_elevated_to_confirmation");
    if(axis.state==="confirmed"&&axis.debtEffects.some((item)=>item.resolutionEffect!=="retained_only"))risks.push("material_debt_affects_confirmation");
    const traces=result.candidateTraces.filter((item)=>item.axis===axisName),usesUnresolved=axisName==="identity_basis"&&result.signature.identityBasis.value==="unresolved_physical_key"||traces.some((trace)=>trace.semanticDependencies.some((item)=>item.state==="unknown"));
    violations.push(...risks.map((risk)=>`${axisName}:${risk}`));
    const disposition:GrainAuditDisposition=risks.length?"generic_policy_defect":axis.state==="confirmed"?"valid_confirmed":axis.state==="probable"?"valid_probable":"should_be_ambiguous";
    const allowedStates: GrainAxisState[] = ["confirmed","probable","ambiguous","unknown"];
    const forbiddenStates: GrainAxisState[] = ["unsupported_input"];
    return{axis:axisName,state:axis.state,value:axis.value,alternatives:axis.alternatives,candidateTraceIds:traces.map((item)=>item.candidateId),governingRuleIds:axis.governingRuleIds,independentEvidence:axis.independence.independentEvidenceReferences,correlatedEvidence:axis.independence.correlatedEvidence,evidenceProvenance:axis.evidenceProvenance,semanticDependencies,semanticResolutionStates:[...new Set(semanticDependencies.map((item)=>item.state))].sort(),usesUnresolvedPhysicalIdentity:usesUnresolved,debtEffects:axis.debtEffects,structuralLimitations:result.signature.structuralLimitations.map((item)=>item.code),conflicts:axis.conflictingEvidenceReferences,dominanceResults:traces.map((item)=>({candidateId:item.candidateId,...item.dominance})),allowedStates,forbiddenStates,conforms:risks.length===0,falseCertaintyRisks:risks,disposition};
  });
  const forbiddenCertaintyViolations=[...new Set(violations)].sort();
  return{schemaVersion:GRAIN_RESOLUTION_VALIDATION_VERSION,axisDecisions,dependencyGraph,forbiddenCertaintyViolations,allMeasuresUnsafe:result.signature.measureSafety.safeToAggregate===false&&grain.measureBehaviors.every((item)=>item.safeToAggregate===false),candidateOrderPreserved:result.candidateTraces.map((item)=>item.candidateId).join("|")===grain.grainCandidates.map((item)=>item.candidateId).join("|"),productionIsolated:!result.productionWiring.executed&&!result.crossSourceRelationships.executed};
}

export const certaintyRelation=(before:GrainAxisState,after:GrainAxisState):"not_increased"|"increased"|"incomparable"=>{if(before===after)return"not_increased";if((before==="ambiguous"&&after==="unknown")||(before==="unknown"&&after==="ambiguous"))return"incomparable";const high=(state:GrainAxisState)=>state==="confirmed"?2:state==="probable"?1:0;return high(after)>high(before)?"increased":"not_increased";};
