import { describe, expect, it } from "vitest";
import { aggregateContextualEvidence } from "../contextual-evidence-aggregator";
import { profilePhysicalSource } from "../profiler";
import { generateSemanticCandidateArtifact } from "../semantic-candidate-engine";
import { resolveSemanticShadow } from "../semantic-resolver";
import { getBuiltInMicroBrainIndex } from "./built-in-index";
import { augmentCandidateArtifactWithMicroBrain } from "./evidence-bridge";

function physicalFor(header: string, values: unknown[]) {
  return profilePhysicalSource({
    schemaVersion: "lightbi.physical-source-input.v1",
    source: { sourceId: `mb:counterfactual:${header}`, kind: "local_file", label: "counterfactual" },
    rawRows: [[header], ...values.map((value) => [value])],
  });
}

function candidatesFor(physical: ReturnType<typeof physicalFor>) {
  return generateSemanticCandidateArtifact(physical, {
    microBrain: { index: getBuiltInMicroBrainIndex(), mode: "all" },
  });
}

function resolve(physical: ReturnType<typeof physicalFor>, candidates: ReturnType<typeof candidatesFor>) {
  return resolveSemanticShadow(physical, candidates, aggregateContextualEvidence(physical, candidates));
}

describe("Micro Brain resolver counterfactual gates", () => {
  it("does not resolve a time candidate when dual retrieval consensus is removed", () => {
    const physical = physicalFor("thời gian dự kiến đến", ["2026-09-04", "2026-09-05"]);
    const candidates = candidatesFor(physical);
    const eta = candidates.observations[0].candidateSet.candidates.find((candidate) => candidate.candidateId === "eta");
    expect(eta).toBeDefined();
    for (const evidence of eta?.evidence ?? []) {
      if (evidence.type === "micro_brain_retrieval") evidence.explanationCode = "micro_brain_retrieval_candidate";
    }
    const semantic = resolve(physical, candidates);
    const result = semantic.columns[0];
    expect(result.selectedCandidateId).not.toBe("eta");
    expect(["probable", "confirmed"]).not.toContain(result.finalState);
  });

  it("does not resolve a retrieved time candidate when the full-file type conflicts", () => {
    const physical = physicalFor("thời gian dự kiến đến", [1, 2, 3, 4]);
    const candidates = candidatesFor(physical);
    const eta = candidates.observations[0].candidateSet.candidates.find((candidate) => candidate.candidateId === "eta");
    expect(eta).toBeDefined();
    expect(eta?.conflictEvidence.some((evidence) => evidence.type === "physical_type_conflict")).toBe(true);
    const semantic = resolve(physical, candidates);
    const result = semantic.columns[0];
    expect(result.selectedCandidateId).not.toBe("eta");
    expect(["probable", "confirmed"]).not.toContain(result.finalState);
  });

  it("does not let a monetary measure self-resolve even when recovered from an empty candidate set", () => {
    const physical = physicalFor("customer balance still owed at month end", [100_000, 250_000, 175_000]);
    const baseline = generateSemanticCandidateArtifact(physical);
    const empty = structuredClone(baseline);
    empty.observations[0].state = "no_candidate";
    empty.observations[0].candidateSet.candidates = [];
    const candidates = augmentCandidateArtifactWithMicroBrain(physical, empty, getBuiltInMicroBrainIndex(), { mode: "all" });
    const receivable = candidates.observations[0].candidateSet.candidates.find((candidate) => candidate.candidateId === "receivable");
    expect(receivable).toBeDefined();
    expect(receivable?.evidence.some((evidence) => evidence.type === "numeric_shape")).toBe(true);
    const semantic = resolve(physical, candidates);
    const trace = semantic.columns[0].candidateTraces.find((item) => item.candidateId === "receivable");
    expect(trace?.lexicalClass).toBe("semantic_retrieval");
    expect(semantic.columns[0].selectedCandidateId).not.toBe("receivable");
    expect(["probable", "confirmed"]).not.toContain(semantic.columns[0].finalState);
  });
});
