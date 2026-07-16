import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "../semantic-registry";
import { aggregateContextualEvidence } from "./contextual-evidence-aggregator";
import type { CandidateAbsenceDebtV1, EvidenceFamily } from "./contextual-evidence-contracts";
import { profilePhysicalSource } from "./profiler";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";

const ROOT = path.resolve(__dirname, "../../../../..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "sample-corpus/manifest.json"), "utf8")) as { groundTruthFiles: Array<{ path: string }> };
type Sample = { id: string; sources: Array<{ path: string; sheet: string; sha256: string }>;
  recognition: { requiredMappings: Array<{ physicalColumn: string; canonicalSignal: string }>; expectedAmbiguousMappings: Array<{ physicalColumn: string; candidateSignals: string[] }> } };
const documents = manifest.groundTruthFiles.map((entry) => JSON.parse(fs.readFileSync(path.join(ROOT, entry.path), "utf8")) as { samples: Sample[]; aliasCollisionCases?: Array<{ normalizedAlias: string; candidateSignals: string[] }> });
const samples = documents.flatMap((document) => document.samples);

function sourceArtifacts(source: Sample["sources"][number]) {
  const bytes = fs.readFileSync(path.join(ROOT, source.path));
  expect(crypto.createHash("sha256").update(bytes).digest("hex")).toBe(source.sha256);
  const workbook = XLSX.read(bytes, { raw: true });
  const sheet = workbook.Sheets[source.sheet] ?? workbook.Sheets[workbook.SheetNames[0]];
  const physical = profilePhysicalSource({ schemaVersion: "lightbi.physical-source-input.v1", source: { sourceId: `${source.path}#${source.sheet}`, kind: "local_file", label: source.path, hash: { algorithm: "sha256", value: source.sha256 } }, rawRows: XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "", blankrows: true }) });
  return { physical, candidate: generateSemanticCandidateArtifact(physical) };
}

describe.sequential("Phase 3B1 governed corpus evidence aggregation", () => {
  it("preserves all candidates across 30 cases and carries all 14 governed absence debts", () => {
    const cache = new Map<string, ReturnType<typeof sourceArtifacts>>();
    const familyCounts: Record<EvidenceFamily, number> = { lexical_identity: 0, physical_compatibility: 0, value_semantics: 0, cardinality_role: 0, sibling_context: 0, structural_integrity: 0 };
    const emptyAssessmentCounts = (): Record<string, number> => ({ supports: 0, conflicts: 0, mixed: 0, neutral: 0, unavailable: 0 });
    const assessmentCounts: Record<EvidenceFamily, Record<string, number>> = {
      lexical_identity: emptyAssessmentCounts(),
      physical_compatibility: emptyAssessmentCounts(),
      value_semantics: emptyAssessmentCounts(),
      cardinality_role: emptyAssessmentCounts(),
      sibling_context: emptyAssessmentCounts(),
      structural_integrity: emptyAssessmentCounts(),
    };
    const relationDistribution: Record<string, number> = {};
    const mandatoryColumns = new Set(["Status", "DeliveryStatus", "Khách hàng", "Đơn vị tính", "CHARGE", "y", "campaign", "Event", "Xếp hạng", "UnitCost", "Sub-Category", "Country Name", "Mã phiếu xuất", "Mã phiếu gửi", "Mã Phiếu Gửi", "Thời gian dự kiến đến", "MSNV Quản lý", "Đánh giá"]);
    const observedMandatoryColumns = new Set<string>();
    let observations = 0, profiles = 0, unresolvedConflicts = 0, representativeOnly = 0, oneFamily = 0, twoFamilies = 0, broadOccurrences = 0, contextOnly = 0, contextWithLexical = 0, contextWithPhysical = 0;
    const debts: CandidateAbsenceDebtV1[] = [];
    for (const sample of samples) {
      const artifacts = sample.sources.map((source) => {
        const key = `${source.path}#${source.sheet}`;
        if (!cache.has(key)) cache.set(key, sourceArtifacts(source));
        return cache.get(key)!;
      });
      const candidates = (column: string) => new Set(artifacts.flatMap(({ candidate }) => candidate.observations.filter((item) => item.physicalColumn === column).flatMap((item) => item.candidateSet.candidates.map((entry) => entry.candidateId))));
      for (const mapping of sample.recognition.requiredMappings) if (!candidates(mapping.physicalColumn).has(mapping.canonicalSignal)) debts.push({ physicalColumn: `${sample.id}:${mapping.physicalColumn}`, candidateId: mapping.canonicalSignal, reasonCode: "required_candidate_absent" });
      for (const mapping of sample.recognition.expectedAmbiguousMappings) for (const id of mapping.candidateSignals) if (!candidates(mapping.physicalColumn).has(id)) debts.push({ physicalColumn: `${sample.id}:${mapping.physicalColumn}`, candidateId: id, reasonCode: "contextual_candidate_absent" });
      for (const { physical, candidate } of artifacts) {
        const result = aggregateContextualEvidence(physical, candidate);
        observations += result.observations.length;
        result.observations.forEach((item) => { if (mandatoryColumns.has(item.physicalColumn)) observedMandatoryColumns.add(item.physicalColumn); });
        broadOccurrences += candidate.observations.filter((item) => item.candidateSet.candidates.length >= 5).length;
        expect(result.observations.map((item) => item.candidateProfiles.map((profile) => profile.candidateId)))
          .toEqual(candidate.observations.map((item) => item.candidateSet.candidates.map((entry) => entry.candidateId)));
        for (const profile of result.observations.flatMap((item) => item.candidateProfiles)) {
          profiles += 1;
          profile.familyAssessments.forEach((family) => { assessmentCounts[family.family][family.assessment] += 1; if (family.assessment !== "unavailable") familyCounts[family.family] += 1; });
          if (profile.conflictSummary.unresolvedConflictCodes.length) unresolvedConflicts += 1;
          if (profile.provenance.representativeOnly) representativeOnly += 1;
          if (profile.independentSupportFamilyCount === 1) oneFamily += 1;
          if (profile.independentSupportFamilyCount >= 2) twoFamilies += 1;
          for (const relation of profile.contextRelations) relationDistribution[relation.relationType] = (relationDistribution[relation.relationType] ?? 0) + 1;
          expect(profile.contextRelations.every((relation) => relation.direction === "support")).toBe(true);
          const supported = new Set(profile.familyAssessments.filter((item) => item.assessment === "supports" || item.assessment === "mixed").map((item) => item.family));
          if (supported.has("sibling_context")) {
            if (supported.size === 1) contextOnly += 1;
            if (supported.has("lexical_identity")) contextWithLexical += 1;
            if (supported.has("physical_compatibility")) contextWithPhysical += 1;
          }
        }
      }
    }
    expect(samples).toHaveLength(30);
    expect(debts.filter((item) => item.reasonCode === "required_candidate_absent")).toHaveLength(2);
    expect(debts.filter((item) => item.reasonCode === "contextual_candidate_absent")).toHaveLength(10);
    expect(observations).toBeGreaterThan(0); expect(profiles).toBeGreaterThan(0);
    expect(Object.values(familyCounts).every((count) => count > 0)).toBe(true);
    expect(broadOccurrences).toBe(18);
    expect(observedMandatoryColumns).toEqual(mandatoryColumns);
    expect({ unresolvedConflicts, representativeOnly, oneFamily, twoFamilies }).toBeDefined();
  }, 120_000);

  it("preserves every candidate in all 84 header-only collision contracts", () => {
    const cases = documents.flatMap((document) => document.aliasCollisionCases ?? []);
    expect(cases).toHaveLength(84);
    for (const collision of cases) {
      const physical = profilePhysicalSource({ schemaVersion: "lightbi.physical-source-input.v1", source: { sourceId: `collision:${collision.normalizedAlias}`, kind: "unknown", label: "collision" }, rawRows: [[collision.normalizedAlias], [collision.normalizedAlias]] });
      const candidate = generateSemanticCandidateArtifact(physical, { registry: SEMANTIC_SIGNAL_REGISTRY_V1 });
      const result = aggregateContextualEvidence(physical, candidate);
      const ids = result.observations[0].candidateProfiles.map((profile) => profile.candidateId);
      for (const expected of collision.candidateSignals) expect(ids, collision.normalizedAlias).toContain(expected);
      expect(result.observations[0].resolution.executed).toBe(false);
      expect(JSON.stringify(result)).not.toMatch(/"(?:winner|rank|finalMapping|confirmed|probable|rejected)"/);
    }
  });
});
