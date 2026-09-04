import { describe, expect, it } from "vitest";
import { aggregateContextualEvidence } from "../contextual-evidence-aggregator";
import { profilePhysicalSource } from "../profiler";
import { generateSemanticCandidateArtifact } from "../semantic-candidate-engine";
import { resolveSemanticShadow } from "../semantic-resolver";
import { getBuiltInMicroBrainIndex } from "./built-in-index";

function physicalFor(rows: unknown[][]) {
  return profilePhysicalSource({
    schemaVersion: "lightbi.physical-source-input.v1",
    source: { sourceId: "micro-brain:bridge:test", kind: "local_file", label: "bridge-test" },
    rawRows: rows,
  });
}

function resolve(
  physical: ReturnType<typeof physicalFor>,
  microBrain: boolean,
  mode: "selective" | "all" = "selective",
) {
  const candidates = generateSemanticCandidateArtifact(physical, microBrain ? {
    microBrain: { index: getBuiltInMicroBrainIndex(), mode },
  } : {});
  const semantic = resolveSemanticShadow(physical, candidates, aggregateContextualEvidence(physical, candidates));
  return { candidates, semantic };
}

describe("Micro Brain candidate evidence bridge", () => {
  it("does not expand an existing candidate set with a new non-time semantic alternative", () => {
    const physical = physicalFor([
      ["customer balance still owed at month end"],
      [100_000],
      [250_000],
    ]);
    const baseline = resolve(physical, false);
    const bridged = resolve(physical, true, "all");
    const baselineIds = baseline.candidates.observations[0].candidateSet.candidates.map((candidate) => candidate.candidateId);
    const bridgedIds = bridged.candidates.observations[0].candidateSet.candidates.map((candidate) => candidate.candidateId);
    expect(baselineIds).not.toContain("receivable");
    expect(bridgedIds).not.toContain("receivable");
    expect(bridgedIds).toEqual(baselineIds);
    expect(bridged.candidates.microBrainBridge).toMatchObject({ mode: "all", retrievalOnly: true, queryCount: 1 });
    expect(bridged.semantic.columns.map((column) => [column.finalState, column.selectedCandidateId]))
      .toEqual(baseline.semantic.columns.map((column) => [column.finalState, column.selectedCandidateId]));
  });

  it("does not promote an existing exact candidate by counting MB as independent confidence", () => {
    const physical = physicalFor([
      ["revenue", "currency"],
      [100_000, "VND"],
      [200_000, "VND"],
    ]);
    const baseline = resolve(physical, false);
    const bridged = resolve(physical, true);
    expect(bridged.semantic.columns.map((column) => [column.finalState, column.selectedCandidateId]))
      .toEqual(baseline.semantic.columns.map((column) => [column.finalState, column.selectedCandidateId]));
  });

  it("keeps open concepts open instead of inventing canonical IDs", () => {
    const physical = physicalFor([
      ["buffer inventory against supplier variability"],
      [120],
      [140],
    ]);
    const first = resolve(physical, true);
    const second = resolve(physical, true);
    const ids = first.candidates.observations[0].candidateSet.candidates.map((candidate) => candidate.candidateId);
    expect(ids).not.toContain("safety_stock");
    expect(first.candidates.microBrainBridge?.openConceptHitCount).toBeGreaterThan(0);
    expect(first.candidates).toEqual(second.candidates);
  });
});
