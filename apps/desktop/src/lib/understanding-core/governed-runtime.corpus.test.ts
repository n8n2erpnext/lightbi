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
import { preflightGovernedMetrics } from "./governed-metric-preflight";
import { governedMetricPolicyHash } from "./governed-metric-policy";
import { preflightGovernedRuntimeAction } from "./governed-runtime-preflight";
import { governedRuntimePolicyHash } from "./governed-runtime-policy";
import { generateGrainCandidateArtifact } from "./grain-candidate-engine";
import { resolveGrainSignatureShadow } from "./grain-resolver";
import { profilePhysicalSource } from "./profiler";
import { buildUnderstandingReadiness } from "./readiness-engine";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { resolveSemanticShadow } from "./semantic-resolver";

const ROOT = path.resolve(__dirname, "../../../../..");

describe("Phase 5M3 real-corpus runtime eligibility", () => {
  it("evaluates the verified May sales source without inventing an executable result", () => {
    const truth = JSON.parse(fs.readFileSync(path.join(ROOT, "sample-corpus/ground-truth/revenue-sales.json"), "utf8")).samples.find((item: any) => item.id === "rev.sales_erp_may_2026");
    const source = truth.sources[0];
    const file = path.join(ROOT, source.path);
    expect(fs.existsSync(file)).toBe(true);
    expect(createHash("sha256").update(fs.readFileSync(file)).digest("hex")).toBe(source.sha256);
    const workbook = XLSX.readFile(file, { raw: true });
    const sheet = workbook.Sheets[source.sheet];
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true, blankrows: true });
    const physical = profilePhysicalSource({ schemaVersion: "lightbi.physical-source-input.v1", source: { sourceId: `${source.path}#${source.sheet}`, kind: "local_file", label: path.basename(source.path), sheet: source.sheet, hash: { algorithm: "sha256", value: source.sha256 } }, rawRows });
    const candidates = generateSemanticCandidateArtifact(physical, { registry: SEMANTIC_SIGNAL_REGISTRY_V1 });
    const semantic = resolveSemanticShadow(physical, candidates, aggregateContextualEvidence(physical, candidates));
    const grainCandidates = generateGrainCandidateArtifact(physical, semantic, rawRows);
    const grain = resolveGrainSignatureShadow(grainCandidates, { sourceId: grainCandidates.sourceId, sourceHash: grainCandidates.sourceHash });
    const readiness = buildUnderstandingReadiness({ scope: "source", physical, semantic, grain });
    const canonicalSource = { physical, semantic, grain, readiness };
    const context = { group: "golden", tuningUse: "allowed" } as const;
    const metricPreflight = preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources: [canonicalSource], metricIds: ["sales_revenue"], evaluationContext: context, expectedPolicyHash: governedMetricPolicyHash() });
    const activation = activateCommerceDistributionDomain({ schemaVersion: "lightbi.domain-activation-input.v1", sources: [canonicalSource], evaluationContext: context });
    const generation = generateGovernedCommerceQuestionsAndActions({ schemaVersion: "lightbi.question-action-generation-input.v1", canonicalSource, domainActivation: activation, metricPreflight, expectedQuestionPolicyHash: questionActionPolicyHash() });
    const action = generation.actionCandidates.find((item) => item.questionId === "commerce.sales_revenue.over_time") ?? null;
    const runtime = preflightGovernedRuntimeAction({ schemaVersion: "lightbi.governed-runtime-preflight-input.v1", canonicalSource, metricPreflight, questionGeneration: generation, actionCandidate: action, expectedRuntimePolicyHash: governedRuntimePolicyHash() });
    expect(truth.verifiedMetricAnswers.revenue_sum).toBe(22973896244);
    expect(runtime.decisionUseAuthorized).toBe(false);
    expect(runtime.productionWiring.executed).toBe(false);
    if (action === null) {
      expect(metricPreflight.metrics[0].state).not.toBe("ready");
      expect(runtime.state).toBe("unavailable");
      expect(runtime.executionPerformed).toBe(false);
    } else {
      expect(["executable", "conditionally_executable", "blocked"]).toContain(runtime.state);
      if (runtime.state === "blocked") expect(runtime.blockers.length).toBeGreaterThan(0);
    }
  }, 60000);
});
