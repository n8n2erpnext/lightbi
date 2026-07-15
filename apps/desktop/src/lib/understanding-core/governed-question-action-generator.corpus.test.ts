import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "../semantic-registry";
import { activateCommerceDistributionDomain } from "./commerce-distribution-domain-pack";
import { questionActionPolicyHash } from "./commerce-distribution-question-policy";
import { aggregateContextualEvidence } from "./contextual-evidence-aggregator";
import { generateGovernedCommerceQuestionsAndActions } from "./governed-question-action-generator";
import type { CanonicalMetricSourceV1, GovernedMetricStateV1 } from "./governed-domain-metric-contracts";
import { preflightGovernedMetrics } from "./governed-metric-preflight";
import { governedMetricPolicyHash } from "./governed-metric-policy";
import { generateGrainCandidateArtifact } from "./grain-candidate-engine";
import { resolveGrainSignatureShadow } from "./grain-resolver";
import { profilePhysicalSource } from "./profiler";
import { buildUnderstandingReadiness } from "./readiness-engine";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { resolveSemanticShadow } from "./semantic-resolver";

type Group = "golden" | "holdout" | "adversarial" | "multi_file";
type SourceTruth = { path: string; sheet: string; required: boolean; sha256: string };
type SampleTruth = { id: string; group: Group; provenance: { tuningUse: "allowed" | "forbidden" }; sources: SourceTruth[]; verifiedMetricAnswers: Record<string, number> };

const ROOT = path.resolve(__dirname, "../../../../..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "sample-corpus/manifest.json"), "utf8")) as { groundTruthFiles: Array<{ path: string }>; groups: Record<Group, { tuningAllowed: boolean }> };
const samples = manifest.groundTruthFiles.flatMap((entry) => (JSON.parse(fs.readFileSync(path.join(ROOT, entry.path), "utf8")) as { samples: SampleTruth[] }).samples);
const cache = new Map<string, CanonicalMetricSourceV1>();
const stateOrder: Record<GovernedMetricStateV1, number> = { ready: 0, conditionally_ready: 1, blocked: 2, unknown: 3, unsupported: 4, not_applicable: 5 };

function canonical(source: SourceTruth): CanonicalMetricSourceV1 {
  const key = `${source.path}#${source.sheet}`;
  const prior = cache.get(key);
  if (prior) return prior;
  const file = path.join(ROOT, source.path);
  if (!fs.existsSync(file)) throw new Error(`PHASE_5M2_REQUIRED_SOURCE_MISSING:${source.path}`);
  const actual = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  if (actual !== source.sha256) throw new Error(`PHASE_5M2_SOURCE_HASH_DRIFT:${source.path}`);
  const workbook = XLSX.readFile(file, { raw: true });
  const sheet = workbook.Sheets[source.sheet] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`PHASE_5M2_REQUIRED_SHEET_MISSING:${source.path}#${source.sheet}`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true, blankrows: true });
  const physical = profilePhysicalSource({ schemaVersion: "lightbi.physical-source-input.v1", source: { sourceId: key, kind: "local_file", label: path.basename(source.path), sheet: source.sheet, hash: { algorithm: "sha256", value: source.sha256 } }, rawRows: rows });
  const semanticCandidate = generateSemanticCandidateArtifact(physical, { registry: SEMANTIC_SIGNAL_REGISTRY_V1 });
  const semantic = resolveSemanticShadow(physical, semanticCandidate, aggregateContextualEvidence(physical, semanticCandidate));
  const grainCandidate = generateGrainCandidateArtifact(physical, semantic, rows);
  const grain = resolveGrainSignatureShadow(grainCandidate, { sourceId: grainCandidate.sourceId, sourceHash: grainCandidate.sourceHash });
  const readiness = buildUnderstandingReadiness({ scope: "source", physical, semantic, grain });
  const result = { physical, semantic, grain, readiness };
  cache.set(key, result);
  return result;
}

describe("Phase 5M2 acceptance corpus question/action governance", () => {
  it("evaluates all corpus groups without tuning from validation-only cases", () => {
    expect(samples).toHaveLength(30);
    const observed = new Set<string>();
    for (const sample of samples) {
      expect(sample.provenance.tuningUse).toBe(manifest.groups[sample.group].tuningAllowed ? "allowed" : "forbidden");
      for (const source of sample.sources) {
        const canonicalSource = canonical(source);
        const evaluationContext = { group: sample.group, tuningUse: sample.provenance.tuningUse } as const;
        const activation = activateCommerceDistributionDomain({ schemaVersion: "lightbi.domain-activation-input.v1", sources: [canonicalSource], evaluationContext });
        const metricPreflight = preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources: [canonicalSource], evaluationContext, expectedPolicyHash: governedMetricPolicyHash() });
        const result = generateGovernedCommerceQuestionsAndActions({ schemaVersion: "lightbi.question-action-generation-input.v1", canonicalSource, domainActivation: activation, metricPreflight, expectedQuestionPolicyHash: questionActionPolicyHash() });
        observed.add(sample.id);
        expect(result.defaultQuestions.length, `${sample.id}:${source.sheet}`).toBeLessThanOrEqual(5);
        expect(result.defaultQuestions.every((item) => ["ready", "conditionally_ready"].includes(item.questionState) && item.blockers.length === 0)).toBe(true);
        expect(new Set(result.candidateQuestions.map((item) => item.governedIdentity)).size).toBe(result.candidateQuestions.length);
        for (const question of result.candidateQuestions) {
          expect(stateOrder[question.questionState], `${sample.id}:${question.questionId}`).toBeGreaterThanOrEqual(stateOrder[question.metricPreflightState]);
          expect(question.runtimeActionCreated).toBe(false);
          expect(question.runtimeActionAuthorized).toBe(false);
          expect(question.executionPerformed).toBe(false);
        }
        for (const action of result.actionCandidates) {
          expect(["ready", "conditionally_ready"]).toContain(action.metricPreflightState);
          expect(action.executable).toBe(false);
          expect(action.runtimeActionCreated).toBe(false);
          expect(action.runtimeActionAuthorized).toBe(false);
          expect(action.executionPerformed).toBe(false);
        }
        expect(result.productionWiring.executed).toBe(false);
        expect(result.metricResultsProduced).toBe(false);
        expect(JSON.stringify(result)).not.toContain(source.path);
        for (const verified of Object.values(sample.verifiedMetricAnswers)) expect(JSON.stringify(result)).not.toContain(`\"result\":${verified}`);
      }
    }
    expect(observed.size).toBe(30);
  }, 180_000);
});
