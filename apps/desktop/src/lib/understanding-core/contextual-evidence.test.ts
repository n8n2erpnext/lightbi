import { describe, expect, it } from "vitest";
import { profilePhysicalSource } from "./profiler";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { aggregateContextualEvidence } from "./contextual-evidence-aggregator";
import { canonicalJson, CONTEXTUAL_EVIDENCE_POLICY, deterministicPolicyHash, deterministicPolicySha256 } from "./contextual-evidence-policy";

function artifacts() {
  const physical = profilePhysicalSource({ schemaVersion: "lightbi.physical-source-input.v1", source: { sourceId: "stable-source", kind: "local_file", label: "source", hash: { algorithm: "sha256", value: "abc" } }, rawRows: [["Status", "Amount"], ["Delivered", 10], ["Pending", 20]] });
  return { physical, candidate: generateSemanticCandidateArtifact(physical) };
}
describe("Phase 3B1 contextual evidence aggregation", () => {
  it("preserves observations, states, candidates, ordering, and unresolved boundary", () => {
    const { physical, candidate } = artifacts();
    const result = aggregateContextualEvidence(physical, candidate, [{ physicalColumn: "Missing", candidateId: "shipment", reasonCode: "acceptance_gap" }]);
    expect(result.coverage.observationCount).toBe(candidate.observations.length);
    expect(result.observations.map((item) => item.state)).toEqual(candidate.observations.map((item) => item.state));
    for (let index = 0; index < result.observations.length; index += 1) {
      expect(result.observations[index].candidateProfiles.map((item) => item.candidateId)).toEqual(candidate.observations[index].candidateSet.candidates.map((item) => item.candidateId));
      expect(result.observations[index].resolution.executed).toBe(false);
    }
    expect(result.candidateAbsenceDebt).toHaveLength(1);
    expect(JSON.stringify(result)).not.toMatch(/"(?:winner|rank|finalMapping|confirmed|probable|rejected|aggregateConfidence)"/);
  });
  it("is byte-stable under evidence shuffling and duplicate insertion", () => {
    const { physical, candidate } = artifacts();
    const baseline = aggregateContextualEvidence(physical, candidate);
    const changed = structuredClone(candidate);
    for (const observation of changed.observations) for (const item of observation.candidateSet.candidates) {
      item.evidence.reverse();
      if (item.evidence[0]) item.evidence.push({ ...item.evidence[0], evidenceId: `${item.evidence[0].evidenceId}:duplicate` });
    }
    expect(canonicalJson(aggregateContextualEvidence(physical, changed))).toBe(canonicalJson(baseline));
  });
  it("keeps family assessments neutral and bounded without totals", () => {
    const { physical, candidate } = artifacts();
    const result = aggregateContextualEvidence(physical, candidate);
    for (const profile of result.observations.flatMap((item) => item.candidateProfiles)) {
      expect(profile.familyAssessments).toHaveLength(6);
      expect(profile.familyAssessments.every((item) => item.magnitude >= 0 && item.magnitude <= 1)).toBe(true);
      expect(profile).not.toHaveProperty("score");
    }
  });
  it("changes policy hash when rules change", () => {
    expect(deterministicPolicyHash()).not.toBe(deterministicPolicyHash({ ...CONTEXTUAL_EVIDENCE_POLICY, rules: [...CONTEXTUAL_EVIDENCE_POLICY.rules, "changed"] }));
    expect(deterministicPolicySha256()).toMatch(/^[a-f0-9]{64}$/);
    expect(deterministicPolicySha256()).toBe("5abf964930277f0005bb877a80106d404acc601400753d25c933cec59380aa7a");
    expect(deterministicPolicySha256({ a: 1, b: 2 })).toBe(deterministicPolicySha256({ b: 2, a: 1 }));
    expect(deterministicPolicySha256({ a: 1 })).not.toBe(deterministicPolicySha256({ a: 2 }));
  });
  it("adds only declared candidate-relative sibling support", () => {
    const physical = profilePhysicalSource({ schemaVersion: "lightbi.physical-source-input.v1", source: { sourceId: "relations", kind: "unknown", label: "relations" }, rawRows: [["Quantity", "Unit"], [10, "kg"]] });
    const candidate = generateSemanticCandidateArtifact(physical);
    const result = aggregateContextualEvidence(physical, candidate);
    const quantity = result.observations.find((item) => item.physicalColumn === "Quantity")?.candidateProfiles.find((item) => item.candidateId === "quantity");
    expect(quantity?.contextRelations.some((item) => item.relationType === "quantity_uom" && item.direction === "support")).toBe(true);
    expect(quantity?.familyAssessments.find((item) => item.family === "sibling_context")?.assessment).toBe("supports");
  });
  it("fails closed on source, hash, version, and column mismatch", () => {
    const { physical, candidate } = artifacts();
    expect(() => aggregateContextualEvidence(physical, { ...candidate, sourceId: "other" })).toThrow("ARTIFACT_MISMATCH");
    expect(() => aggregateContextualEvidence(physical, { ...candidate, sourceHash: { algorithm: "sha256", value: "other" } })).toThrow("ARTIFACT_MISMATCH");
    expect(() => aggregateContextualEvidence(physical, { ...candidate, profileSchemaVersion: "other" })).toThrow("ARTIFACT_MISMATCH");
    const columns = structuredClone(candidate); columns.observations[0].sourceColumnIndex = 99;
    expect(() => aggregateContextualEvidence(physical, columns)).toThrow("COLUMN_IDENTITY_MISMATCH");
  });
});
