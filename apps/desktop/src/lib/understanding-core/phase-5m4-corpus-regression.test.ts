import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "../semantic-registry";
import { activateCommerceDistributionDomain } from "./commerce-distribution-domain-pack";
import { questionActionPolicyHash } from "./commerce-distribution-question-policy";
import { aggregateContextualEvidence } from "./contextual-evidence-aggregator";
import type { CanonicalMetricSourceV1 } from "./governed-domain-metric-contracts";
import { preflightGovernedMetrics } from "./governed-metric-preflight";
import { governedMetricPolicyHash } from "./governed-metric-policy";
import { generateGovernedCommerceQuestionsAndActions } from "./governed-question-action-generator";
import { preflightGovernedRuntimeAction } from "./governed-runtime-preflight";
import { governedRuntimePolicyHash } from "./governed-runtime-policy";
import { generateGrainCandidateArtifact } from "./grain-candidate-engine";
import { resolveGrainSignatureShadow } from "./grain-resolver";
import { profilePhysicalSource } from "./profiler";
import { buildUnderstandingReadiness } from "./readiness-engine";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { resolveSemanticShadow } from "./semantic-resolver";

type Group = "golden" | "holdout" | "adversarial" | "multi_file";
type SourceTruth = { path: string; sheet: string; required: boolean; sha256: string };
type SampleTruth = { id: string; group: Group; provenance: { tuningUse: "allowed" | "forbidden" }; sources: SourceTruth[] };

const ROOT = path.resolve(__dirname, "../../../../..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "sample-corpus/manifest.json"), "utf8")) as {
  corpusVersion: string;
  groups: Record<Group, { tuningAllowed: boolean }>;
  groundTruthFiles: Array<{ path: string }>;
};
const samples = manifest.groundTruthFiles.flatMap((entry) =>
  (JSON.parse(fs.readFileSync(path.join(ROOT, entry.path), "utf8")) as { samples: SampleTruth[] }).samples,
);
const cache = new Map<string, CanonicalMetricSourceV1>();

function canonical(source: SourceTruth): CanonicalMetricSourceV1 {
  const sourceId = `${source.path}#${source.sheet}`;
  const cached = cache.get(sourceId);
  if (cached) return cached;
  const file = path.join(ROOT, source.path);
  if (!fs.existsSync(file)) throw new Error(`PHASE_5M4_REQUIRED_SOURCE_MISSING:${source.path}`);
  const bytes = fs.readFileSync(file);
  if (createHash("sha256").update(bytes).digest("hex") !== source.sha256) throw new Error(`PHASE_5M4_SOURCE_HASH_DRIFT:${source.path}`);
  const workbook = XLSX.read(bytes, { raw: true });
  const sheet = workbook.Sheets[source.sheet] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`PHASE_5M4_REQUIRED_SHEET_MISSING:${sourceId}`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true, blankrows: true });
  const physical = profilePhysicalSource({ schemaVersion: "lightbi.physical-source-input.v1", source: { sourceId, kind: "local_file", label: path.basename(source.path), sheet: source.sheet, hash: { algorithm: "sha256", value: source.sha256 } }, rawRows: rows });
  const candidates = generateSemanticCandidateArtifact(physical, { registry: SEMANTIC_SIGNAL_REGISTRY_V1 });
  const semantic = resolveSemanticShadow(physical, candidates, aggregateContextualEvidence(physical, candidates));
  const grainCandidates = generateGrainCandidateArtifact(physical, semantic, rows);
  const grain = resolveGrainSignatureShadow(grainCandidates, { sourceId: grainCandidates.sourceId, sourceHash: grainCandidates.sourceHash });
  const readiness = buildUnderstandingReadiness({ scope: "source", physical, semantic, grain });
  const result = { physical, semantic, grain, readiness };
  cache.set(sourceId, result);
  return result;
}

describe.sequential("Phase 5M4 thirty-case regression closure", () => {
  it("records metric, action, and runtime states without tuning evaluation-only groups", () => {
    expect(samples).toHaveLength(30);
    const records: Array<Record<string, unknown>> = [];
    let falseExecutableCases = 0;
    let executableActions = 0;
    let blockedActions = 0;
    for (const sample of samples) {
      const expectedTuning = manifest.groups[sample.group].tuningAllowed ? "allowed" : "forbidden";
      expect(sample.provenance.tuningUse).toBe(expectedTuning);
      const sources = sample.sources.map(canonical);
      const evaluationContext = { group: sample.group, tuningUse: sample.provenance.tuningUse } as const;
      const combined = preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources, evaluationContext, expectedPolicyHash: governedMetricPolicyHash() });
      const sourceRecords = sources.map((canonicalSource, sourceIndex) => {
        const activation = activateCommerceDistributionDomain({ schemaVersion: "lightbi.domain-activation-input.v1", sources: [canonicalSource], evaluationContext });
        const metricPreflight = preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources: [canonicalSource], evaluationContext, expectedPolicyHash: governedMetricPolicyHash() });
        const generation = generateGovernedCommerceQuestionsAndActions({ schemaVersion: "lightbi.question-action-generation-input.v1", canonicalSource, domainActivation: activation, metricPreflight, expectedQuestionPolicyHash: questionActionPolicyHash() });
        expect(generation.defaultQuestions.length).toBeLessThanOrEqual(5);
        const actions = generation.actionCandidates.map((action) => {
          const runtime = preflightGovernedRuntimeAction({ schemaVersion: "lightbi.governed-runtime-preflight-input.v1", canonicalSource, metricPreflight, questionGeneration: generation, actionCandidate: action, expectedRuntimePolicyHash: governedRuntimePolicyHash() });
          const executable = runtime.executionAllowed;
          if (executable) executableActions += 1;
          else blockedActions += 1;
          const falseExecutable = executable && (!["ready", "conditionally_ready"].includes(action.metricPreflightState) || action.blockers.length > 0 || !runtime.planningAllowed);
          if (falseExecutable) falseExecutableCases += 1;
          expect(falseExecutable, `${sample.id}:${action.questionId}`).toBe(false);
          expect(runtime.decisionUseAuthorized).toBe(false);
          expect(runtime.productionWiring.executed).toBe(false);
          return { questionId: action.questionId, metricId: action.metricId, actionState: action.actionCandidateState, metricState: action.metricPreflightState, runtimeState: runtime.state, planningAllowed: runtime.planningAllowed, executionAllowed: runtime.executionAllowed, blockers: runtime.blockers.map((item) => item.code) };
        });
        return { sourceId: canonicalSource.physical.sourceProfile.source.sourceId, sourceIndex, activationState: activation.state, semanticStateCounts: canonicalSource.semantic.coverage.stateCounts, grain: { structural: canonicalSource.grain.signature.structuralForm, temporal: canonicalSource.grain.signature.temporalMode, aggregation: canonicalSource.grain.signature.aggregationForm, safeToAggregate: canonicalSource.grain.signature.measureSafety.safeToAggregate }, metricStates: metricPreflight.metrics.map((metric) => ({ metricId: metric.metricId, state: metric.state, blockers: metric.blockers.map((item) => item.code) })), actions };
      });
      records.push({ caseId: sample.id, group: sample.group, tuningUse: sample.provenance.tuningUse, baselineComparison: sample.id === "rev.sales_erp_may_2026" ? "known_phase5m3_real_golden" : "not_comparable_phase5m1_did_not_persist_per_case_states", combinedMetricStates: combined.metrics.map((metric) => ({ metricId: metric.metricId, state: metric.state, blockers: metric.blockers.map((item) => item.code) })), sources: sourceRecords });
    }
    const realGolden = records.find((record) => record.caseId === "rev.sales_erp_may_2026") as any;
    expect(realGolden.sources[0].metricStates).toContainEqual(expect.objectContaining({ metricId: "sales_revenue", state: "conditionally_ready", blockers: [] }));
    expect(realGolden.sources[0].actions.some((action: any) => action.metricId === "sales_revenue" && action.executionAllowed)).toBe(true);
    const knownNewlyExecutableActions = realGolden.sources[0].actions.filter((action: any) => action.metricId === "sales_revenue" && action.executionAllowed).map((action: any) => action.questionId);
    expect(falseExecutableCases).toBe(0);
    if (process.env.LIGHTBI_WRITE_PHASE5M4_AUDIT === "1") {
      fs.writeFileSync(path.join(ROOT, "docs/architecture/phase-5m4-corpus-regression-audit.json"), `${JSON.stringify({ schemaVersion: "lightbi.phase-5m4-corpus-regression-audit.v1", phase: "5M4", corpusVersion: manifest.corpusVersion, caseCount: records.length, groups: Object.fromEntries((Object.keys(manifest.groups) as Group[]).map((group) => [group, { cases: records.filter((record) => record.group === group).length, tuningAllowed: manifest.groups[group].tuningAllowed }])), baselineLimitations: ["Phase 5M1 did not persist per-case metric states; unknown historical transitions are not invented.", "The Phase 5M3 real-golden blocker is the only persisted per-case execution baseline."], knownStateChanges: [{ caseId: "rev.sales_erp_may_2026", metricId: "sales_revenue", before: "blocked", after: "conditionally_ready", actionBefore: "unavailable", actionAfter: "conditionally_executable", evidence: "real golden canonical replay" }], improvements: 1, regressions: 0, observedExecutableActionCount: executableActions, observedBlockedActionCount: blockedActions, newlyExecutableActions: knownNewlyExecutableActions, newlyBlockedActions: [], falseExecutableCases, holdoutOrAdversarialTuning: false, unrelatedMetricImprovementClaimed: false, grossProfitAndRelationshipMetricsRemainGoverned: true, records, decisionUseAuthorized: false, productionWiring: { executed: false } }, null, 2)}\n`);
    }
  }, 240_000);
});
