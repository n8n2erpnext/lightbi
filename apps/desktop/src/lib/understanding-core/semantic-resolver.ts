import type { DatasetUnderstandingArtifactV1 } from "./profiling-contracts";
import type { CandidateArtifactV1 } from "./semantic-candidate-contracts";
import type { CandidateAbsenceDebtV1, CandidateEvidenceProfileV1, ContextualEvidenceArtifactV1 } from "./contextual-evidence-contracts";
import { CONTEXTUAL_EVIDENCE_POLICY_VERSION } from "./contextual-evidence-contracts";
import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import { EVIDENCE_FAMILY_BY_TYPE } from "./contextual-evidence-policy";
import { SEMANTIC_RESOLUTION_ARTIFACT_VERSION, SEMANTIC_RESOLUTION_POLICY_VERSION, type CandidateResolutionTraceV1, type ColumnSemanticResolutionV1, type EvidenceDependencyKind, type LexicalEvidenceClass, type ResolutionDebtV1, type ResolutionLimitationV1, type SemanticResolutionArtifactV1, type SemanticResolutionState } from "./semantic-resolution-contracts";
import { LEXICAL_CLASS_ORDER, SEMANTIC_RESOLUTION_POLICY, semanticResolutionPolicyHash } from "./semantic-resolution-policy";

const exactTypes = new Set(["canonical_header_exact", "header_alias_exact", "alias_exact"]);
const fullFileFamilies = new Set(["physical_compatibility", "cardinality_role"]);
const materialIssues = new Set(SEMANTIC_RESOLUTION_POLICY.materialStructuralIssues);
function lexicalClass(profile: CandidateEvidenceProfileV1): LexicalEvidenceClass {
  const evidence = [...profile.supportingEvidence, ...profile.neutralEvidence];
  if (evidence.some((e) => e.type === "canonical_header_exact")) return "canonical_id_exact";
  if (evidence.some((e) => e.type === "header_alias_exact" && e.explanationCode === "header_matches_registry_label")) return "canonical_label_exact";
  if (evidence.some((e) => e.type === "header_alias_exact")) return "header_alias_exact";
  if (evidence.some((e) => e.type === "alias_exact")) return "alias_exact";
  if (evidence.some((e) => e.type === "alias_token_containment")) return "token_containment";
  if (evidence.some((e) => e.type === "value_alias" || e.type === "value_pattern")) return "value_only";
  return "none";
}
function lexicalStrength(value: LexicalEvidenceClass) { return LEXICAL_CLASS_ORDER.indexOf(value); }
function references(profile: CandidateEvidenceProfileV1) { return [...new Set([...profile.supportingEvidence, ...profile.conflictingEvidence, ...profile.neutralEvidence].map((e) => e.evidenceId))].sort(); }
function debtFor(column: string, debt: CandidateAbsenceDebtV1[]): ResolutionDebtV1[] {
  return debt.filter((item) => item.physicalColumn === column || item.physicalColumn.endsWith(`:${column}`)).map((item) => ({ ...item, effect: "blocks_confirmation" as const })).sort((a,b)=>`${a.physicalColumn}|${a.candidateId}`.localeCompare(`${b.physicalColumn}|${b.candidateId}`));
}
function relationIndependence(profile: CandidateEvidenceProfileV1, contextual: ContextualEvidenceArtifactV1) {
  const correlated: Array<{ evidenceReference: string; dependency: EvidenceDependencyKind; dependsOn: string[] }> = [];
  const independentContext = new Set<string>();
  const seenRelations = new Set<string>();
  for (const relation of profile.contextRelations) {
    if (seenRelations.has(relation.relationType)) { correlated.push({ evidenceReference: relation.relationEvidenceId, dependency: "repeated_relation_class", dependsOn: [] }); continue; }
    seenRelations.add(relation.relationType);
    const sibling = contextual.observations.find((o) => o.physicalColumn === relation.siblingColumn)?.candidateProfiles.find((p) => p.candidateId === relation.siblingCandidateId);
    const currentNonContext = profile.familyAssessments.some((f) => f.family !== "lexical_identity" && f.family !== "sibling_context" && f.assessment === "supports");
    const siblingNonContext = sibling?.familyAssessments.some((f) => f.family !== "lexical_identity" && f.family !== "sibling_context" && f.assessment === "supports") ?? false;
    const siblingOnlyLexical = sibling != null && !siblingNonContext;
    const sharedCollision = profile.neutralEvidence.some((e) => e.type === "alias_collision") && sibling?.neutralEvidence.some((e) => e.type === "alias_collision");
    if (sharedCollision) correlated.push({ evidenceReference: relation.relationEvidenceId, dependency: "shared_collision_surface", dependsOn: sibling ? references(sibling) : [] });
    else if (!currentNonContext && !siblingNonContext) correlated.push({ evidenceReference: relation.relationEvidenceId, dependency: "mutual_sibling_support", dependsOn: sibling ? references(sibling) : [] });
    else if (siblingOnlyLexical) correlated.push({ evidenceReference: relation.relationEvidenceId, dependency: "lexical_sibling_reuse", dependsOn: sibling ? references(sibling) : [] });
    else independentContext.add("sibling_context");
  }
  return { correlated, independentContext: [...independentContext].sort() };
}
function trace(profile: CandidateEvidenceProfileV1, contextual: ContextualEvidenceArtifactV1): CandidateResolutionTraceV1 {
  const lexical = lexicalClass(profile);
  const relation = relationIndependence(profile, contextual);
  const independentFamilies = profile.familyAssessments.filter((family) => {
    if (family.assessment !== "supports" || family.family === "sibling_context" || family.family === "value_semantics") return false;
    return profile.supportingEvidence.some((evidence) => EVIDENCE_FAMILY_BY_TYPE[evidence.type] === family.family && evidence.source !== "representative_evidence");
  }).map((f) => f.family);
  const conflicts = [...new Set([...profile.conflictSummary.unresolvedConflictCodes, ...profile.structuralAndParsingLimitations.filter((x) => materialIssues.has(x))])].sort();
  const nonLexical = independentFamilies.filter((f) => f !== "lexical_identity");
  const weak = ["token_containment", "value_only", "none"].includes(lexical);
  const disposition = conflicts.length ? "materially_conflicted" : weak || nonLexical.length === 0 ? (relation.independentContext.length && weak ? "correlated_evidence_only" : "insufficient_evidence") : "viable";
  const all = [...profile.supportingEvidence, ...profile.conflictingEvidence, ...profile.neutralEvidence];
  const correlatedHeader = all.filter((e) => exactTypes.has(e.type) || e.type === "alias_token_containment").slice(1).map((e) => ({ evidenceReference: e.evidenceId, dependency: "same_header_surface" as const, dependsOn: [all.find((x) => exactTypes.has(x.type) || x.type === "alias_token_containment")?.evidenceId ?? ""] }));
  const representative = all.filter((e) => e.source === "representative_evidence");
  const correlatedRepresentative = representative.slice(1).map((e) => ({ evidenceReference: e.evidenceId, dependency: "same_representative_sample" as const, dependsOn: [representative[0]?.evidenceId ?? ""] }));
  const correlated = [...correlatedHeader, ...correlatedRepresentative, ...relation.correlated].sort((a,b)=>a.evidenceReference.localeCompare(b.evidenceReference));
  const correlatedRefs = new Set(correlated.map((x) => x.evidenceReference));
  return { candidateId: profile.candidateId, disposition, lexicalClass: lexical, completeEvidenceProfile: profile,
    independence: { independentEvidenceReferences: references(profile).filter((id) => !correlatedRefs.has(id)), correlatedEvidence: correlated, independentSupportFamilies: [...new Set(independentFamilies)].sort(), independentContextFamilies: relation.independentContext },
    dominance: { dominatedBy: null, dominates: [], comparable: false, ruleIds: [] }, materialConflictCodes: conflicts,
    ruleIds: conflicts.length ? ["R-MATERIAL-CONFLICT"] : disposition === "viable" ? [] : ["R-WEAK-ONLY"], evidenceReferences: references(profile), limitations: [...new Set(profile.structuralAndParsingLimitations)].sort() };
}
function applyDominance(traces: CandidateResolutionTraceV1[]) {
  const support = (t: CandidateResolutionTraceV1) => new Set(t.independence.independentSupportFamilies.filter((f) => f !== "sibling_context"));
  for (const left of traces) for (const right of traces) {
    if (left === right || left.disposition !== "viable" || right.disposition !== "viable") continue;
    const a=support(left), b=support(right); const strict=[...b].every((x)=>a.has(x)) && [...a].some((x)=>!b.has(x));
    if (strict && left.materialConflictCodes.length <= right.materialConflictCodes.length && lexicalStrength(left.lexicalClass) <= lexicalStrength(right.lexicalClass)) {
      left.dominance.dominates.push(right.candidateId); left.dominance.comparable=true; left.dominance.ruleIds=["R-DOMINANCE"];
      right.dominance={ dominatedBy:left.candidateId, dominates:right.dominance.dominates, comparable:true, ruleIds:["R-DOMINANCE"] }; right.disposition="dominated"; right.ruleIds.push("R-DOMINANCE");
    }
  }
}
function resolveColumn(index: number, physical: DatasetUnderstandingArtifactV1, candidate: CandidateArtifactV1, contextual: ContextualEvidenceArtifactV1): ColumnSemanticResolutionV1 {
  const observation=candidate.observations[index], context=contextual.observations[index], column=physical.sourceProfile.columns[index];
  const traces=context.candidateProfiles.map((p)=>trace(p,contextual)); applyDominance(traces);
  const debt=debtFor(observation.physicalColumn, contextual.candidateAbsenceDebt),viable=traces.filter((t)=>t.disposition==="viable"),collisionAlternatives=traces.filter((item)=>item!==viable[0]),collisionCanResolve=viable.length===1&&(viable[0].independence.independentContextFamilies.length>0||collisionAlternatives.every((item)=>item.disposition==="materially_conflicted"||item.disposition==="dominated")||collisionAlternatives.every((item)=>item.disposition==="insufficient_evidence"&&["token_containment","value_only","none"].includes(item.lexicalClass)));
  let finalState: SemanticResolutionState="unknown", selectedCandidateId:string|null=null, rules:string[]=["R-NO-CANDIDATE"];
  if(observation.state==="technical_candidate"){finalState="technical";rules=["R-TECHNICAL"];}
  else if(observation.state==="unsupported_input"){finalState="unsupported_input";rules=["R-UNSUPPORTED"];}
  else {
    if(debt.length){ finalState=viable.length ? "ambiguous" : "unknown"; rules=["R-DEBT",viable.length?"R-AMBIGUOUS":"R-NO-CANDIDATE"]; debt.forEach((d)=>d.effect=viable.length?"forces_ambiguity":"forces_unknown"); }
    else if(observation.candidateSet.hasAliasCollision&&traces.length>1&&!collisionCanResolve){finalState="ambiguous";rules=["R-AMBIGUOUS"];}
    else if(viable.length>1){finalState="ambiguous";rules=["R-AMBIGUOUS"];}
    else if(viable.length===1){const winner=viable[0];const beyond=winner.independence.independentSupportFamilies.filter((f)=>f!=="lexical_identity");const hasFull=beyond.some((f)=>fullFileFamilies.has(f));const exact=["canonical_id_exact","canonical_label_exact","header_alias_exact","alias_exact"].includes(winner.lexicalClass);const highImpact=column.issues.some((i)=>i.severity==="error"||materialIssues.has(i.code));
      if(exact&&beyond.length>=2&&hasFull&&!highImpact){finalState="confirmed";rules=["R-CONFIRMED"];}
      else if(exact&&beyond.length>=1&&!highImpact){finalState="probable";rules=["R-PROBABLE"];}
      else{finalState="unknown";rules=["R-WEAK-ONLY"];}
      if(finalState==="confirmed"||finalState==="probable"){selectedCandidateId=winner.candidateId;winner.disposition="selected";winner.ruleIds.push(...rules);}
    } else if(traces.filter((t)=>t.disposition==="materially_conflicted").length){rules=["R-MATERIAL-CONFLICT"];}
    else rules=["R-WEAK-ONLY"];
  }
  const limitations:ResolutionLimitationV1[]=[...new Set([...observation.limitations,...context.limitations,...column.limitations])].sort().map((code)=>({code,severity:materialIssues.has(code)?"material":"info",explanation:code,evidenceReferences:[]}));
  return {sourceColumnIndex:observation.sourceColumnIndex,physicalColumn:observation.physicalColumn,inputState:observation.state,finalState,selectedCandidateId,candidateTraces:traces,columnEvidence:observation.columnEvidence,ruleIds:rules,limitations,debt};
}
export function resolveSemanticShadow(physical: DatasetUnderstandingArtifactV1,candidate: CandidateArtifactV1,contextual: ContextualEvidenceArtifactV1):SemanticResolutionArtifactV1{
  const expectedAggregationHash=deterministicPolicySha256();
  if(physical.sourceProfile.source.sourceId!==candidate.sourceId||candidate.sourceId!==contextual.sourceId||JSON.stringify(physical.provenance.sourceHash)!==JSON.stringify(candidate.sourceHash)||JSON.stringify(candidate.sourceHash)!==JSON.stringify(contextual.sourceHash)||candidate.schemaVersion!==contextual.candidateArtifactVersion||physical.schemaVersion!==contextual.physicalArtifactVersion||candidate.registryVersion!==contextual.registryVersion||contextual.aggregationPolicyVersion!==CONTEXTUAL_EVIDENCE_POLICY_VERSION||contextual.aggregationPolicyHash!==expectedAggregationHash) throw new Error("SEMANTIC_RESOLUTION_ARTIFACT_MISMATCH");
  if(physical.sourceProfile.columns.length!==candidate.observations.length||candidate.observations.length!==contextual.observations.length)throw new Error("SEMANTIC_RESOLUTION_COLUMN_COVERAGE_MISMATCH");
  for(let i=0;i<candidate.observations.length;i++){const p=physical.sourceProfile.columns[i],c=candidate.observations[i],x=contextual.observations[i];if(p.sourceColumnIndex!==c.sourceColumnIndex||c.sourceColumnIndex!==x.sourceColumnIndex||p.physicalColumnName!==c.physicalColumn||c.physicalColumn!==x.physicalColumn)throw new Error("SEMANTIC_RESOLUTION_COLUMN_IDENTITY_MISMATCH");if(c.candidateSet.candidates.map((v)=>v.candidateId).join("|")!==x.candidateProfiles.map((v)=>v.candidateId).join("|"))throw new Error("SEMANTIC_RESOLUTION_CANDIDATE_PRESERVATION_MISMATCH");}
  const columns=candidate.observations.map((_,i)=>resolveColumn(i,physical,candidate,contextual));const states:Record<SemanticResolutionState,number>={confirmed:0,probable:0,ambiguous:0,unknown:0,technical:0,unsupported_input:0};columns.forEach((c)=>states[c.finalState]++);
  const count=candidate.observations.reduce((n,o)=>n+o.candidateSet.candidates.length,0),out=columns.reduce((n,c)=>n+c.candidateTraces.length,0);
  const affectedDebt=new Map(columns.flatMap((c)=>c.debt).map((d)=>[`${d.physicalColumn}|${d.candidateId}|${d.reasonCode}`,d]));
  const carriedDebt=contextual.candidateAbsenceDebt.map((d)=>affectedDebt.get(`${d.physicalColumn}|${d.candidateId}|${d.reasonCode}`)??{...d,effect:"blocks_confirmation" as const});
  return {schemaVersion:SEMANTIC_RESOLUTION_ARTIFACT_VERSION,sourceId:candidate.sourceId,sourceHash:candidate.sourceHash,physicalArtifactVersion:physical.schemaVersion,candidateArtifactVersion:candidate.schemaVersion,contextualEvidenceArtifactVersion:contextual.schemaVersion,registryVersion:candidate.registryVersion,aggregationPolicyVersion:contextual.aggregationPolicyVersion,aggregationPolicyHash:contextual.aggregationPolicyHash,resolutionPolicyVersion:SEMANTIC_RESOLUTION_POLICY_VERSION,resolutionPolicyHash:semanticResolutionPolicyHash(),columns,coverage:{physicalColumnCount:physical.sourceProfile.columns.length,resolvedColumnCount:columns.length,preservedCandidateCount:out,stateCounts:states},candidatePreservationProof:{inputCandidateCount:count,outputCandidateTraceCount:out,orderPreserved:true,evidenceProfilesPreserved:true},candidateAbsenceDebt:carriedDebt,limitations:[{code:"shadow_only",severity:"info",explanation:"No production consumer is wired to this artifact.",evidenceReferences:[]},{code:"no_domain_or_grain_inference",severity:"info",explanation:"Resolution does not infer domains, grain, relationships, metrics, or actions.",evidenceReferences:[]}],productionWiring:{executed:false}};
}
