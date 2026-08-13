import { describe, expect, it } from "vitest";
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "../semantic-registry";
import { aggregateContextualEvidence } from "./contextual-evidence-aggregator";
import { canonicalResolutionJson, SEMANTIC_RESOLUTION_POLICY, semanticResolutionPolicyHash } from "./semantic-resolution-policy";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { resolveSemanticShadow } from "./semantic-resolver";
import { profilePhysicalSource } from "./profiler";

function artifacts(rows: unknown[][] = [["OrderID", "Status", "__PowerAppsId__"], ["ORD-1", "Delivered", "a886d124-31d9-4a9a-a3e2-000000000001"], ["ORD-2", "Pending", "a886d124-31d9-4a9a-a3e2-000000000002"]]) {
  const physical=profilePhysicalSource({schemaVersion:"lightbi.physical-source-input.v1",source:{sourceId:"resolution",kind:"unknown",label:"resolution",hash:{algorithm:"sha256",value:"abc"}},rawRows:rows});
  const candidate=generateSemanticCandidateArtifact(physical); const contextual=aggregateContextualEvidence(physical,candidate); return {physical,candidate,contextual};
}
describe("Phase 3B2A deterministic semantic shadow resolution",()=>{
  it("covers every physical column, preserves candidates/evidence/order, and stays production isolated",()=>{
    const {physical,candidate,contextual}=artifacts();const result=resolveSemanticShadow(physical,candidate,contextual);
    expect(result.coverage.resolvedColumnCount).toBe(physical.sourceProfile.columns.length);
    expect(result.candidatePreservationProof.inputCandidateCount).toBe(result.candidatePreservationProof.outputCandidateTraceCount);
    result.columns.forEach((column,index)=>expect(column.candidateTraces.map((x)=>x.candidateId)).toEqual(candidate.observations[index].candidateSet.candidates.map((x)=>x.candidateId)));
    expect(result.productionWiring.executed).toBe(false);expect(result.columns.find((x)=>x.physicalColumn==="__PowerAppsId__")?.finalState).toBe("technical");
  });
  it("abstains for opaque, containment-only, value-only, generic collision, and candidate absence",()=>{
    const opaque=artifacts([["y"],["yes"],["no"]]);const opaqueResult=resolveSemanticShadow(opaque.physical,opaque.candidate,opaque.contextual).columns[0];
    expect(["unknown","ambiguous"]).toContain(opaqueResult.finalState);expect(["confirmed","probable"]).not.toContain(opaqueResult.finalState);
    const collision=artifacts([["Status"],["Open"],["Closed"]]);expect(["unknown","ambiguous"]).toContain(resolveSemanticShadow(collision.physical,collision.candidate,collision.contextual).columns[0].finalState);
    const debtContext=aggregateContextualEvidence(opaque.physical,opaque.candidate,[{physicalColumn:"y",candidateId:"missing_alternative",reasonCode:"required_candidate_absent"}]);
    expect(resolveSemanticShadow(opaque.physical,opaque.candidate,debtContext).columns[0].finalState).not.toBe("confirmed");
  });
  it("resolves a collision only when independent context leaves exactly one viable candidate",()=>{
    const contextual=artifacts([
      ["OrderID","OrderDate","Product","Payment"],
      ["ORD-1","2026-05-01","Widget A","Cash"],
      ["ORD-2","2026-05-02","Widget B","Card"],
    ]);
    const resolved=resolveSemanticShadow(contextual.physical,contextual.candidate,contextual.contextual);
    for(const [physicalColumn,candidateId] of [["OrderID","order"],["OrderDate","time_period"],["Product","product"],["Payment","payment_method"]] as const){
      const column=resolved.columns.find((item)=>item.physicalColumn===physicalColumn)!;
      expect(["confirmed","probable"]).toContain(column.finalState);
      expect(column.selectedCandidateId).toBe(candidateId);
    }

    const headerOnly=artifacts([["Status"],["Open"],["Closed"]]);
    const collision=resolveSemanticShadow(headerOnly.physical,headerOnly.candidate,headerOnly.contextual).columns[0];
    expect(["ambiguous","unknown"]).toContain(collision.finalState);
    expect(collision.selectedCandidateId).toBeNull();
  });
  it("uses a rule lattice and emits no aggregate score or total ranking",()=>{
    const {physical,candidate,contextual}=artifacts();const json=JSON.stringify(resolveSemanticShadow(physical,candidate,contextual));
    expect(json).not.toMatch(/aggregateConfidence|candidateScore|weightedScore|totalRank/);expect(json).toContain("ruleIds");
  });
  it("is byte-stable under evidence order and duplicate changes",()=>{
    const {physical,candidate,contextual}=artifacts();const baseline=resolveSemanticShadow(physical,candidate,contextual);const changed=structuredClone(candidate);
    changed.observations.forEach((o)=>o.candidateSet.candidates.forEach((c)=>{c.evidence.reverse();if(c.evidence[0])c.evidence.push({...c.evidence[0],evidenceId:`${c.evidence[0].evidenceId}:dup`});}));
    const rebuilt=aggregateContextualEvidence(physical,changed);expect(canonicalResolutionJson(resolveSemanticShadow(physical,changed,rebuilt))).toBe(canonicalResolutionJson(baseline));
  });
  it("does not count representative-only physical or value evidence as independent support",()=>{
    const {physical}=artifacts([["order"],["ORD-1"],["ORD-2"]]);
    const candidate=generateSemanticCandidateArtifact(physical,{registry:SEMANTIC_SIGNAL_REGISTRY_V1.filter((item)=>item.canonicalId==="order")});
    const baseline=resolveSemanticShadow(physical,candidate,aggregateContextualEvidence(physical,candidate)).columns[0];
    const representative=structuredClone(candidate);
    representative.observations[0].candidateSet.candidates.forEach((item)=>item.evidence.forEach((evidence)=>{if(evidence.source==="source_profile"||["value_alias","value_pattern"].includes(evidence.type))evidence.source="representative_evidence";}));
    const mutated=resolveSemanticShadow(physical,representative,aggregateContextualEvidence(physical,representative)).columns[0];
    expect(["confirmed","probable"]).toContain(baseline.finalState);
    expect(["unknown","ambiguous"]).toContain(mutated.finalState);
    expect(mutated.candidateTraces.flatMap((trace)=>trace.independence.independentSupportFamilies)).not.toContain("value_semantics");
  });
  it("uses a canonical SHA-256 policy identity",()=>{
    expect(semanticResolutionPolicyHash()).toBe("064e6861cc208e7d35074d9b872e0d4a11dfacdbc850e6d017c24f32462d6ad3");expect(semanticResolutionPolicyHash()).toMatch(/^[a-f0-9]{64}$/);expect(semanticResolutionPolicyHash({a:1,b:2})).toBe(semanticResolutionPolicyHash({b:2,a:1}));expect(semanticResolutionPolicyHash({...SEMANTIC_RESOLUTION_POLICY,forbiddenInference:[...SEMANTIC_RESOLUTION_POLICY.forbiddenInference,"mutation"]})).not.toBe(semanticResolutionPolicyHash());
  });
  it("fails closed on artifact identity, policy, columns, and candidate preservation",()=>{
    const {physical,candidate,contextual}=artifacts();expect(()=>resolveSemanticShadow(physical,{...candidate,sourceId:"other"},contextual)).toThrow("ARTIFACT_MISMATCH");
    expect(()=>resolveSemanticShadow(physical,candidate,{...contextual,aggregationPolicyHash:"bad"})).toThrow("ARTIFACT_MISMATCH");
    const columns=structuredClone(contextual);columns.observations[0].sourceColumnIndex=99;expect(()=>resolveSemanticShadow(physical,candidate,columns)).toThrow("COLUMN_IDENTITY_MISMATCH");
    const missing=structuredClone(contextual);missing.observations[0].candidateProfiles.pop();expect(()=>resolveSemanticShadow(physical,candidate,missing)).toThrow("CANDIDATE_PRESERVATION_MISMATCH");
  });
});
