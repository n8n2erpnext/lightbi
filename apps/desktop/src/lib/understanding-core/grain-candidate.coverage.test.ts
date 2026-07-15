import {describe,expect,it} from "vitest";
import {SEMANTIC_SIGNAL_REGISTRY_V1} from "../semantic-registry";
import {aggregateContextualEvidence} from "./contextual-evidence-aggregator";
import {generateGrainCandidateArtifact} from "./grain-candidate-engine";
import {profilePhysicalSource} from "./profiler";
import {generateSemanticCandidateArtifact} from "./semantic-candidate-engine";
import {resolveSemanticShadow} from "./semantic-resolver";

function grain(rows:unknown[][],semanticIds:string[]=[]){const physical=profilePhysicalSource({schemaVersion:"lightbi.physical-source-input.v1",source:{sourceId:"grain-coverage",kind:"unknown",label:"grain-coverage",hash:{algorithm:"sha256",value:"coverage"}},rawRows:rows}),candidate=generateSemanticCandidateArtifact(physical,{registry:SEMANTIC_SIGNAL_REGISTRY_V1.filter((item)=>semanticIds.includes(item.canonicalId))}),contextual=aggregateContextualEvidence(physical,candidate),resolution=resolveSemanticShadow(physical,candidate,contextual);return generateGrainCandidateArtifact(physical,resolution,rows);}

describe("Phase 4A1.1 universal primitive completeness",()=>{
  it("creates limited unresolved physical identity hypotheses without semantic invention",()=>{const result=grain([["opaque_alpha"],["PX-001"],["PX-002"],["PX-003"]]),role=result.columnRoles[0],identity=result.rowIdentityCandidates[0];expect(role.identityEvidenceLevel).toBe("unresolved_physical");expect(role.semanticCandidateId).toBeNull();expect(role.semanticAlternativeCandidateIds).toEqual([]);expect(identity.identityEvidenceLevel).toBe("unresolved_physical");expect(identity.businessIdentityProven).toBe(false);expect(identity.limitations.join(" ")).toMatch(/unresolved/i);expect(result.finalGrainResolution.executed).toBe(false);});
  it.each([
    ["row number",[["opaque"],[1],[2],[3]],[]],
    ["generated index",[["__index__"],["IDX-001"],["IDX-002"],["IDX-003"]],[]],
    ["UUID trace",[["opaque"],["a886d124-31d9-4a9a-a3e2-000000000001"],["a886d124-31d9-4a9a-a3e2-000000000002"]],[]],
    ["monetary amount",[["opaque"],[101.25],[202.5],[303.75]],[]],
    ["unit price",[["unit_price"],[11],[12],[13]],["unit_price"]],
    ["quantity",[["quantity"],[1],[2],[3]],["quantity"]],
    ["percentage",[["margin_pct"],[.1],[.2],[.3]],["margin_pct"]],
    ["rating",[["rating_score"],[3],[4],[5]],["rating_score"]],
    ["timestamp",[["opaque"],["2026-01-01T10:00:00Z"],["2026-01-02T10:00:00Z"]],[]],
    ["phone",[["opaque"],["+84901234567"],["+84901234568"]],[]],
    ["free text",[["opaque"],["Detailed alpha description"],["Detailed beta description"]],[]],
    ["formula output",[["opaque"],["=A1+B1"],["=A2+B2"]],[]],
    ["sparse mixed code",[["opaque"],["PX-001"],[2],[""]],[]],
    ["floating measurement",[["opaque"],[1.125],[2.25],[3.5]],[]]
  ])("does not promote unique %s to business identity",(_label,rows,ids)=>{const result=grain(rows as unknown[][],ids as string[]);expect(result.rowIdentityCandidates).toHaveLength(0);expect(result.columnRoles[0].identityEligible).toBe(false);});
  it("exposes domain-neutral entity, item, temporal, parent-line, snapshot and mapping primitives",()=>{const entity=grain([["opaque_a"],["EN-001"],["EN-002"]]);expect(entity.rowIdentityCandidates[0].identityEvidenceLevel).toBe("unresolved_physical");const item=grain([["opaque_b"],["IT-001"],["IT-002"]]);expect(item.rowIdentityCandidates[0].identityEvidenceLevel).toBe("unresolved_physical");const temporal=grain([["opaque_time"],["2026-01-01"],["2026-01-02"]]);expect(temporal.temporalBehaviors[0].role).toBe("unresolved_temporal_basis");expect(temporal.grainCandidates.map((candidate)=>candidate.rowUnitClass)).not.toContain("event_record");const line=grain([["opaque_parent","opaque_child"],["PA-001","CH-001"],["PA-001","CH-002"],["PA-002","CH-003"]]);expect(line.parentIdentityCandidates[0].identityEvidenceLevel).toBe("unresolved_physical");expect(line.grainCandidates.map((candidate)=>candidate.rowUnitClass)).toContain("line_record");const snapshot=grain([["opaque_entity","time_period","balance"],["EN-001","2026-01-01",10],["EN-002","2026-01-01",20]],["time_period","balance"]);expect(snapshot.grainCandidates.map((candidate)=>candidate.rowUnitClass)).toContain("snapshot_record");const mapping=grain([["opaque_left","opaque_right"],["LF-001","RT-001"],["LF-002","RT-002"]]);expect(mapping.grainCandidates.map((candidate)=>candidate.rowUnitClass)).toContain("mapping_record");});
  it("reports deterministic composite pruning and scoped structural limitations",()=>{const result=grain([["opaque_a","opaque_b"],["AA-001","BB-001"],["AA-002","BB-002"]]);expect(result.diagnostics.compositeSearch.deterministicOrder).toBe("source_column_index");expect(result.diagnostics.compositeSearch.widthTwoEvaluated).toBe(1);expect(result.diagnostics.compositeSearch.widthThreeEvaluated).toBe(0);expect(result.diagnostics.compositeSearch.skippedByGlobalBound).toBe(0);expect(result.diagnostics.compositeSearch.uniqueCombinations).toEqual([["opaque_a","opaque_b"]]);expect(result.limitations.every((item)=>["source","candidate","evidence","governance"].includes(item.scope))).toBe(true);});
});
