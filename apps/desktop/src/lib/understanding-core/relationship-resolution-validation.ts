import type {CandidateKeyPairV1,RelationshipCandidateArtifactV1} from "./relationship-candidate-contracts";
import type {RelationshipResolutionArtifactV1,RelationshipSignatureV1} from "./relationship-resolution-contracts";
import {relationshipResolutionPolicyHash} from "./relationship-resolution-policy";

export type RelationshipValidationDisposition="valid_confirmed_extract_observation"|"valid_probable"|"should_be_ambiguous"|"should_be_unknown"|"materially_blocked"|"expectation_requires_review"|"generic_policy_defect"|"upstream_candidate_debt"|"insufficient_evaluation_evidence";
export type RelationshipValidationResultV1={schemaVersion:"lightbi.relationship-resolution-validation.v1";policyHash:string;valid:true;pairs:Array<{pairId:string;nonUnknownAxes:string[];confirmedCandidateCardinality:string[];pairCardinalityState:"ambiguous"|"unknown";safetyApproved:false;executionAuthorized:false;dispositions:RelationshipValidationDisposition[]}>;preservation:{candidates:true;keyPairOccurrences:true;risks:true;debt:true};joinSafety:{executed:false};operationExecution:{executed:false};productionWiring:{executed:false}};

const debtId=(d:{physicalColumn:string;candidateId:string;reasonCode:string})=>`${d.physicalColumn}|${d.candidateId}|${d.reasonCode}`;
function assertObservationScope(key:CandidateKeyPairV1,observation:RelationshipSignatureV1["observedCardinality"]["observations"][number]){
  const expected={keyPairId:key.candidateId,alternatives:key.cardinalityAlternatives,matchedDistinct:key.overlap.matchedDistinct,leftUnmatchedDistinct:key.overlap.leftUnmatchedDistinct,rightUnmatchedDistinct:key.overlap.rightUnmatchedDistinct,leftNulls:key.overlap.leftNulls,rightNulls:key.overlap.rightNulls,leftDuplicateRows:key.overlap.leftDuplicateRows,rightDuplicateRows:key.overlap.rightDuplicateRows,leftMaxFrequency:key.overlap.leftMaxFrequency,rightMaxFrequency:key.overlap.rightMaxFrequency,leftOverlapRatio:key.overlap.leftOverlapRatio,rightOverlapRatio:key.overlap.rightOverlapRatio,possibleFanout:key.overlap.possibleFanout};
  for(const [name,value] of Object.entries(expected))if(JSON.stringify(observation[name as keyof typeof observation])!==JSON.stringify(value))throw new Error(`RELATIONSHIP_CARDINALITY_SCOPE_MISMATCH:${name}`);
}
function validatePair(candidate:RelationshipCandidateArtifactV1["pairs"][number],resolved:RelationshipSignatureV1){
  const keys=[...new Map(candidate.candidates.flatMap(c=>c.keyPairAlternatives).map(k=>[k.candidateId,k])).values()],observations=resolved.observedCardinality.candidateScopedObservedCardinality;
  if(new Set(observations.map(o=>o.keyPairId)).size!==observations.length)throw new Error("RELATIONSHIP_CARDINALITY_DUPLICATE_SCOPE");
  if(observations.length!==keys.length)throw new Error("RELATIONSHIP_CARDINALITY_ORPHAN_OR_MISSING");
  for(const observation of observations){const key=keys.find(k=>k.candidateId===observation.keyPairId);if(!key)throw new Error("RELATIONSHIP_CARDINALITY_WRONG_KEY");assertObservationScope(key,observation);}
  for(const sourceCandidate of candidate.candidates){const trace=resolved.candidateTraces.find(t=>t.candidateId===sourceCandidate.candidateId);if(!trace)throw new Error("RELATIONSHIP_CANDIDATE_TRACE_MISSING");if(JSON.stringify(sourceCandidate.debt.map(debtId))!==JSON.stringify(trace.debt))throw new Error("RELATIONSHIP_DEBT_NOT_PRESERVED");}
  const summary=resolved.observedCardinality.pairLevelCardinalitySummary;
  if(summary.selectedKeyPairId!==null||summary.state===("confirmed" as never)||resolved.observedCardinality.businessCardinalityEstablished||resolved.observedCardinality.joinAuthorized)throw new Error("RELATIONSHIP_PAIR_CARDINALITY_FALSE_CERTAINTY");
  if(resolved.operationCompatibility.safetyApproved||resolved.operationCompatibility.executionAuthorized)throw new Error("RELATIONSHIP_OPERATION_FALSE_APPROVAL");
  const inputRisks=[...new Set(candidate.candidates.flatMap(c=>c.duplication.risks))].sort(),outputRisks=[...resolved.risks.risks].sort();
  if(JSON.stringify(inputRisks)!==JSON.stringify(outputRisks)||resolved.risks.canceledRisks.length)throw new Error("RELATIONSHIP_RISK_NOT_PRESERVED");
  const nonUnknownAxes=(["meaning","keyBasis","observedCardinality","temporalAlignment","schemaRelationship","operationCompatibility"] as const).filter(axis=>resolved[axis].state!=="unknown"&&resolved[axis].state!=="unsupported_input");
  return{pairId:resolved.pairId,nonUnknownAxes,confirmedCandidateCardinality:observations.filter(o=>o.state==="confirmed").map(o=>o.keyPairId),pairCardinalityState:summary.state,safetyApproved:false as const,executionAuthorized:false as const,dispositions:[...(observations.some(o=>o.state==="confirmed")?["valid_confirmed_extract_observation" as const]:[]),...(resolved.operationCompatibility.value==="materially_blocked"?["materially_blocked" as const]:[]),...(nonUnknownAxes.length?["valid_probable" as const]:["should_be_unknown" as const])]};
}
export function validateRelationshipResolution(candidate:RelationshipCandidateArtifactV1,resolution:RelationshipResolutionArtifactV1):RelationshipValidationResultV1{
  if(resolution.resolutionPolicyHash!==relationshipResolutionPolicyHash()||candidate.bundle.bundleId!==resolution.bundle.bundleId||candidate.pairs.length!==resolution.pairs.length)throw new Error("RELATIONSHIP_VALIDATION_UPSTREAM_MISMATCH");
  if(resolution.joinSafety.executed||resolution.operationExecution.executed||resolution.productionWiring.executed)throw new Error("RELATIONSHIP_VALIDATION_NOT_ISOLATED");
  const pairs=candidate.pairs.map(pair=>{const resolved=resolution.pairs.find(p=>p.pairId===pair.pairId);if(!resolved)throw new Error("RELATIONSHIP_VALIDATION_PAIR_MISSING");return validatePair(pair,resolved)});
  if(!resolution.candidatePreservationProof.complete)throw new Error("RELATIONSHIP_VALIDATION_CANDIDATE_LOSS");
  return{schemaVersion:"lightbi.relationship-resolution-validation.v1",policyHash:relationshipResolutionPolicyHash(),valid:true,pairs,preservation:{candidates:true,keyPairOccurrences:true,risks:true,debt:true},joinSafety:{executed:false},operationExecution:{executed:false},productionWiring:{executed:false}};
}
