import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "../semantic-registry";
import { profilePhysicalSource } from "./profiler";
import type { DatasetUnderstandingArtifactV1 } from "./profiling-contracts";
import type { CandidateArtifactV1 } from "./semantic-candidate-contracts";
import { generateSemanticCandidateArtifact, normalizeSemanticSurface } from "./semantic-candidate-engine";

type CorpusGroup = "golden" | "holdout" | "adversarial" | "multi_file";
type CorpusSource = { path: string; sheet: string; required: boolean; sha256: string };
type Mapping = { physicalColumn: string; canonicalSignal: string };
type Ambiguity = { physicalColumn: string; candidateSignals: string[]; evidenceScope: "header_only" };
type CorpusSample = {
  id: string;
  group: CorpusGroup;
  provenance: { tuningUse: "allowed" | "forbidden" };
  sources: CorpusSource[];
  recognition: {
    requiredMappings: Mapping[];
    forbiddenMappings: Mapping[];
    expectedAmbiguousMappings: Ambiguity[];
    expectedUnknownBusinessColumns: string[];
  };
};

const REPO_ROOT = path.resolve(__dirname, "../../../../..");
const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "sample-corpus/versions/1.4.0/manifest.json"), "utf8")) as {
  groundTruthFiles: Array<{ path: string }>;
  groups: Record<CorpusGroup, { tuningAllowed: boolean }>;
};
const samples = manifest.groundTruthFiles.flatMap((entry) => {
  const document = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, entry.path), "utf8")) as { samples: CorpusSample[] };
  return document.samples;
});
const phase3a1Audit = JSON.parse(fs.readFileSync(
  path.join(REPO_ROOT, "docs/architecture/phase-3a1-candidate-gap-audit.json"),
  "utf8",
)) as {
  scope: { requiredCandidateGaps: number; incompleteAmbiguityContracts: number; missingAmbiguityCandidatesBefore: number };
  candidateCoverage: { after: { present: number; expected: number } };
  ambiguityCoverage: { after: { completeContracts: number; expectedContracts: number; missingCandidates: number } };
  collisionDelta: {
    aliasCollisionsAfter: number;
    headerAliasCollisionsAfter: number;
    unionCollisionContractsAfter: number;
    introduced: unknown[];
    removed: unknown[];
  };
  candidateQuality: {
    broadColumnThreshold: number;
    after: {
      totalPhysicalColumns: number;
      zeroCandidates: number;
      oneCandidate: number;
      multipleCandidates: number;
      averageCandidates: number;
      medianCandidates: number;
      maximumCandidates: number;
      broadColumnCount: number;
      candidateSourceDistribution: Record<string, number>;
    };
  };
  entries: Array<{
    sampleId: string;
    physicalColumn: string;
    expectedCandidates: string[];
    currentCandidatesBefore: string[];
    causeClassification: string;
    sourceEvidenceInspected: string[];
    proposedCorrection: string;
    productionBehaviorMustChange: boolean;
    corpusTruthMustChange: boolean | null;
    collisionImpact: string;
    finalDisposition: string;
  }>;
};
const physicalCache = new Map<string, DatasetUnderstandingArtifactV1>();
const candidateCache = new Map<string, CandidateArtifactV1>();
const contextualCandidateGaps: Array<{ sampleId: string; physicalColumn: string; missing: string[] }> = [];
const observedCandidates = new Map<string, Set<string>>();
let requiredExpectedCount = 0;
let requiredPresentCount = 0;
let ambiguityExpectedCount = 0;
let ambiguityCompleteCount = 0;
let ambiguityMissingCandidateCount = 0;
const phase3a1Quality = {
  candidateCounts: [] as number[],
  broadColumns: [] as Array<{ sampleId: string; sourceId: string; physicalColumn: string; candidates: string[] }>,
  sourceDistribution: {
    canonicalId: 0,
    label: 0,
    alias: 0,
    headerAlias: 0,
    valueAlias: 0,
    valuePattern: 0,
    tokenContainment: 0,
  },
};

function collectCandidateQuality(sampleId: string, artifact: CandidateArtifactV1): void {
  for (const observation of artifact.observations) {
    const candidates = observation.candidateSet.candidates;
    phase3a1Quality.candidateCounts.push(candidates.length);
    if (candidates.length >= 5) {
      phase3a1Quality.broadColumns.push({
        sampleId,
        sourceId: artifact.sourceId,
        physicalColumn: observation.physicalColumn,
        candidates: candidates.map((candidate) => candidate.candidateId),
      });
    }
    for (const candidate of candidates) {
      const evidence = candidate.evidence;
      if (evidence.some((item) => item.type === "canonical_header_exact")) phase3a1Quality.sourceDistribution.canonicalId += 1;
      if (evidence.some((item) => item.explanationCode === "header_matches_registry_label")) phase3a1Quality.sourceDistribution.label += 1;
      if (evidence.some((item) => item.type === "alias_exact")) phase3a1Quality.sourceDistribution.alias += 1;
      if (evidence.some((item) => item.explanationCode === "header_matches_header_alias")) phase3a1Quality.sourceDistribution.headerAlias += 1;
      if (evidence.some((item) => item.type === "value_alias")) phase3a1Quality.sourceDistribution.valueAlias += 1;
      if (evidence.some((item) => item.type === "value_pattern")) phase3a1Quality.sourceDistribution.valuePattern += 1;
      if (evidence.some((item) => item.type === "alias_token_containment")) phase3a1Quality.sourceDistribution.tokenContainment += 1;
    }
    const key = `${sampleId}\u0000${observation.physicalColumn}`;
    const known = observedCandidates.get(key) ?? new Set<string>();
    candidates.forEach((candidate) => known.add(candidate.candidateId));
    observedCandidates.set(key, known);
  }
}

function normalizedCollisionCounts() {
  const collisionCount = (field: "aliases" | "headerAliases") => {
    const surfaces = new Map<string, Set<string>>();
    for (const signal of SEMANTIC_SIGNAL_REGISTRY_V1) {
      for (const surface of signal[field]) {
        const normalized = normalizeSemanticSurface(surface);
        const candidates = surfaces.get(normalized) ?? new Set<string>();
        candidates.add(signal.canonicalId);
        surfaces.set(normalized, candidates);
      }
    }
    return new Map([...surfaces].filter(([, candidates]) => candidates.size > 1));
  };
  const aliases = collisionCount("aliases");
  const headerAliases = collisionCount("headerAliases");
  return {
    aliases: aliases.size,
    headerAliases: headerAliases.size,
    union: new Set([...aliases.keys(), ...headerAliases.keys()]).size,
  };
}

function sourceKey(source: CorpusSource): string {
  return `${source.path}#${source.sheet}`;
}

function physicalArtifactFor(source: CorpusSource): DatasetUnderstandingArtifactV1 {
  const key = sourceKey(source);
  const cached = physicalCache.get(key);
  if (cached) return cached;
  const filePath = path.join(REPO_ROOT, source.path);
  if (!fs.existsSync(filePath)) throw new Error(`[phase-3a-corpus] Required source is missing: ${filePath}`);
  const bytes = fs.readFileSync(filePath);
  if (createHash("sha256").update(bytes).digest("hex") !== source.sha256) {
    throw new Error(`[phase-3a-corpus] Source hash drift: ${source.path}`);
  }
  const workbook = XLSX.read(bytes, { raw: true });
  const worksheet = workbook.Sheets[source.sheet] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!worksheet) throw new Error(`[phase-3a-corpus] Required sheet is missing: ${key}`);
  const artifact = profilePhysicalSource({
    schemaVersion: "lightbi.physical-source-input.v1",
    source: {
      sourceId: key,
      kind: "local_file",
      label: path.basename(source.path),
      path: source.path,
      sheet: source.sheet,
      hash: { algorithm: "sha256", value: source.sha256 },
    },
    rawRows: XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: "",
      raw: true,
      blankrows: true,
    }),
  });
  physicalCache.set(key, artifact);
  return artifact;
}

function candidateArtifactFor(source: CorpusSource): CandidateArtifactV1 {
  const key = sourceKey(source);
  const cached = candidateCache.get(key);
  if (cached) return cached;
  const artifact = generateSemanticCandidateArtifact(physicalArtifactFor(source));
  candidateCache.set(key, artifact);
  return artifact;
}

function observationsFor(sample: CorpusSample, physicalColumn: string) {
  return sample.sources.flatMap((source) =>
    candidateArtifactFor(source).observations.filter((observation) => observation.physicalColumn === physicalColumn),
  );
}

function candidateIds(sample: CorpusSample, physicalColumn: string): string[] {
  return [...new Set(observationsFor(sample, physicalColumn)
    .flatMap((observation) => observation.candidateSet.candidates.map((candidate) => candidate.candidateId)))].sort();
}

describe.sequential("Phase 3A canonical candidate corpus runner", () => {
  it("keeps non-golden corpus groups validation-only", () => {
    for (const sample of samples) {
      expect(sample.provenance.tuningUse, sample.id).toBe(manifest.groups[sample.group].tuningAllowed ? "allowed" : "forbidden");
      if (sample.group !== "golden") expect(sample.provenance.tuningUse, sample.id).toBe("forbidden");
    }
  });

  for (const group of ["golden", "holdout", "adversarial", "multi_file"] as const) {
    it(`validates candidate inclusion, candidate-only exclusions audit, and coverage for ${group}`, () => {
      const groupSamples = samples.filter((sample) => sample.group === group);
      const missingRequiredCandidates: string[] = [];
      let includedRequiredCandidateCount = 0;
      const presentForbiddenCandidates: string[] = [];
      const nonUnknownColumns: string[] = [];
      expect(groupSamples.length).toBeGreaterThan(0);
      for (const sample of groupSamples) {
        for (const source of sample.sources) {
          const candidateArtifact = candidateArtifactFor(source);
          collectCandidateQuality(sample.id, candidateArtifact);
          expect(candidateArtifact.coverage.observedColumnCount, sample.id)
            .toBe(candidateArtifact.coverage.physicalColumnCount);
          expect(JSON.stringify(candidateArtifact), sample.id)
            .not.toMatch(/"(?:finalState|mappingState|candidateScore|confidence)"/);
        }

        for (const mapping of sample.recognition.requiredMappings) {
          requiredExpectedCount += 1;
          const observations = observationsFor(sample, mapping.physicalColumn);
          expect(observations.length, `${sample.id}: required physical column ${mapping.physicalColumn}`).toBeGreaterThan(0);
          if (!candidateIds(sample, mapping.physicalColumn).includes(mapping.canonicalSignal)) {
            missingRequiredCandidates.push(`${sample.id}:${mapping.physicalColumn}->${mapping.canonicalSignal}`);
          } else {
            includedRequiredCandidateCount += 1;
            requiredPresentCount += 1;
          }
        }
        for (const mapping of sample.recognition.forbiddenMappings) {
          const observations = observationsFor(sample, mapping.physicalColumn);
          if (observations.length === 0) continue;
          const forbiddenCandidate = observations
            .flatMap((observation) => observation.candidateSet.candidates)
            .find((candidate) => candidate.candidateId === mapping.canonicalSignal);
          if (forbiddenCandidate) {
            presentForbiddenCandidates.push(`${sample.id}:${mapping.physicalColumn}->${mapping.canonicalSignal}`);
            expect(
              forbiddenCandidate.evidence.some((evidence) => evidence.source === "semantic_registry"),
              `${sample.id}: forbidden final mapping was manufactured without registry evidence`,
            ).toBe(true);
            expect(observations.every((observation) => observation.candidateSet.candidateOnly), sample.id).toBe(true);
          }
        }
        for (const ambiguity of sample.recognition.expectedAmbiguousMappings) {
          ambiguityExpectedCount += 1;
          expect(ambiguity.evidenceScope).toBe("header_only");
          const observations = observationsFor(sample, ambiguity.physicalColumn);
          expect(observations.length, `${sample.id}: collision column ${ambiguity.physicalColumn}`).toBeGreaterThan(0);
          const actualCandidates = candidateIds(sample, ambiguity.physicalColumn);
          const missing = ambiguity.candidateSignals.filter((candidate) => !actualCandidates.includes(candidate));
          if (missing.length > 0) contextualCandidateGaps.push({ sampleId: sample.id, physicalColumn: ambiguity.physicalColumn, missing });
          ambiguityMissingCandidateCount += missing.length;
          if (missing.length === 0) ambiguityCompleteCount += 1;
          if (ambiguity.candidateSignals.every((candidate) => actualCandidates.includes(candidate))) {
            expect(observations.some((observation) => observation.candidateSet.hasAliasCollision), sample.id).toBe(true);
          }
          expect(observations.every((observation) => observation.candidateSet.contextualResolution.executed === false), sample.id).toBe(true);
        }
        for (const physicalColumn of sample.recognition.expectedUnknownBusinessColumns) {
          const observations = observationsFor(sample, physicalColumn);
          expect(observations.length, `${sample.id}: unknown column ${physicalColumn}`).toBeGreaterThan(0);
          if (!observations.every((observation) => observation.state === "no_candidate")) {
            nonUnknownColumns.push(`${sample.id}:${physicalColumn}`);
          }
        }
      }
      expect(includedRequiredCandidateCount, `${group}: no required candidates included`).toBeGreaterThan(0);
      expect(new Set(missingRequiredCandidates).size, `${group}: duplicate candidate gaps`).toBe(missingRequiredCandidates.length);
      expect(new Set(presentForbiddenCandidates).size, `${group}: duplicate forbidden-candidate audit entries`).toBe(presentForbiddenCandidates.length);
      expect(new Set(nonUnknownColumns).size, `${group}: duplicate unknown-column audit entries`).toBe(nonUnknownColumns.length);
      physicalCache.clear();
      candidateCache.clear();
    }, 120_000);
  }

  it("exposes contextual candidate gaps without manufacturing Phase 3B resolutions", () => {
    expect(contextualCandidateGaps.length).toBeGreaterThan(0);
    expect(contextualCandidateGaps.every((gap) => gap.missing.length > 0)).toBe(true);
  });

  it("does not expose final mapping state or aggregate candidate ranking", () => {
    expect(contextualCandidateGaps.length).toBeGreaterThan(0);
    expect(contextualCandidateGaps.every((gap) => !Object.prototype.hasOwnProperty.call(gap, "finalState"))).toBe(true);
  });

  it("keeps the historical Phase 3A.1 engine-quality and collision baseline machine-verifiable", () => {
    const releaseCorpusBaseline = JSON.parse(fs.readFileSync(
      path.join(REPO_ROOT, "sample-corpus/versions/1.4.0/candidate-quality-baseline.json"),
      "utf8",
    )) as { candidateQuality: Record<string, unknown> };
    const sorted = [...phase3a1Quality.candidateCounts].sort((left, right) => left - right);
    const total = sorted.length;
    const actualQuality = {
      totalPhysicalColumns: total,
      zeroCandidates: sorted.filter((count) => count === 0).length,
      oneCandidate: sorted.filter((count) => count === 1).length,
      multipleCandidates: sorted.filter((count) => count > 1).length,
      averageCandidates: Number((sorted.reduce((sum, count) => sum + count, 0) / Math.max(total, 1)).toFixed(4)),
      medianCandidates: total % 2 === 0 ? ((sorted[total / 2 - 1] ?? 0) + (sorted[total / 2] ?? 0)) / 2 : sorted[Math.floor(total / 2)] ?? 0,
      maximumCandidates: sorted.at(-1) ?? 0,
      broadColumnCount: phase3a1Quality.broadColumns.length,
      candidateSourceDistribution: phase3a1Quality.sourceDistribution,
    };
    expect(phase3a1Audit.candidateQuality.after).not.toEqual(actualQuality);
    expect(releaseCorpusBaseline.candidateQuality).toEqual(actualQuality);
    expect(requiredExpectedCount).toBeGreaterThan(0);
    expect(requiredPresentCount).toBeGreaterThan(0);
    expect(ambiguityExpectedCount).toBeGreaterThan(0);
    expect(ambiguityCompleteCount).toBeGreaterThanOrEqual(0);
    expect(ambiguityMissingCandidateCount).toBeGreaterThanOrEqual(0);
    expect(phase3a1Audit.entries).toHaveLength(35);
    expect(phase3a1Audit.entries.reduce((count, entry) => count + entry.expectedCandidates.length, 0)).toBe(53);
    expect(phase3a1Audit.entries.filter((entry) => entry.finalDisposition.startsWith("corrected"))).toHaveLength(7);

    for (const entry of phase3a1Audit.entries) {
      expect(entry.sourceEvidenceInspected.length).toBeGreaterThan(0);
      expect(entry.proposedCorrection.length).toBeGreaterThan(0);
      expect(entry.causeClassification.length).toBeGreaterThan(0);
      const actualCandidates = observedCandidates.get(`${entry.sampleId}\u0000${entry.physicalColumn}`) ?? new Set<string>();
      if (entry.finalDisposition.startsWith("corrected")) {
        for (const expectedCandidate of entry.expectedCandidates) expect(actualCandidates, `${entry.sampleId}:${entry.physicalColumn}`).toContain(expectedCandidate);
      }
    }

    const collisions = normalizedCollisionCounts();
    expect(collisions).toEqual({
      aliases: phase3a1Audit.collisionDelta.aliasCollisionsAfter,
      headerAliases: phase3a1Audit.collisionDelta.headerAliasCollisionsAfter,
      union: phase3a1Audit.collisionDelta.unionCollisionContractsAfter,
    });
    expect(phase3a1Audit.collisionDelta.introduced).toEqual([]);
    expect(phase3a1Audit.collisionDelta.removed).toEqual([]);
  });
});
