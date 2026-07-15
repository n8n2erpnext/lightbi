import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "../semantic-registry";
import { aggregateContextualEvidence } from "./contextual-evidence-aggregator";
import { generateGrainCandidateArtifact } from "./grain-candidate-engine";
import { resolveGrainSignatureShadow } from "./grain-resolver";
import type { CanonicalMetricSourceV1, MetricGroundTruthExpectationV1 } from "./governed-domain-metric-contracts";
import { preflightGovernedMetrics } from "./governed-metric-preflight";
import { governedMetricPolicyHash } from "./governed-metric-policy";
import { profilePhysicalSource } from "./profiler";
import { buildUnderstandingReadiness } from "./readiness-engine";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { resolveSemanticShadow } from "./semantic-resolver";

type Group = "golden" | "holdout" | "adversarial" | "multi_file";
type SourceTruth = { path: string; sheet: string; required: boolean; sha256: string };
type SampleTruth = { id: string; group: Group; provenance: { tuningUse: "allowed" | "forbidden" }; sources: SourceTruth[]; dataset: { expectedGrain: string }; verifiedMetricAnswers: Record<string, number> };

const ROOT = path.resolve(__dirname, "../../../../..");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "sample-corpus/manifest.json"), "utf8")) as { groundTruthFiles: Array<{ path: string }>; groups: Record<Group, { tuningAllowed: boolean }> };
const samples = manifest.groundTruthFiles.flatMap((entry) => (JSON.parse(fs.readFileSync(path.join(ROOT, entry.path), "utf8")) as { samples: SampleTruth[] }).samples);
const cache = new Map<string, CanonicalMetricSourceV1>();

function load(source: SourceTruth): { rows: unknown[][]; label: string } {
  const file = path.join(ROOT, source.path);
  if (!fs.existsSync(file)) throw new Error(`PHASE_5M1_REQUIRED_SOURCE_MISSING:${source.path}`);
  const actual = createHash("sha256").update(fs.readFileSync(file)).digest("hex");
  if (actual !== source.sha256) throw new Error(`PHASE_5M1_SOURCE_HASH_DRIFT:${source.path}`);
  const workbook = XLSX.readFile(file, { raw: true });
  const sheet = workbook.Sheets[source.sheet] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`PHASE_5M1_REQUIRED_SHEET_MISSING:${source.path}#${source.sheet}`);
  return { rows: XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true, blankrows: true }), label: path.basename(source.path) };
}

function canonical(source: SourceTruth): CanonicalMetricSourceV1 {
  const key = `${source.path}#${source.sheet}`;
  const prior = cache.get(key);
  if (prior) return prior;
  const loaded = load(source);
  const physical = profilePhysicalSource({ schemaVersion: "lightbi.physical-source-input.v1", source: { sourceId: key, kind: "local_file", label: loaded.label, sheet: source.sheet, hash: { algorithm: "sha256", value: source.sha256 } }, rawRows: loaded.rows });
  const candidate = generateSemanticCandidateArtifact(physical, { registry: SEMANTIC_SIGNAL_REGISTRY_V1 });
  const contextual = aggregateContextualEvidence(physical, candidate);
  const semantic = resolveSemanticShadow(physical, candidate, contextual);
  const grainCandidate = generateGrainCandidateArtifact(physical, semantic, loaded.rows);
  const grain = resolveGrainSignatureShadow(grainCandidate, { sourceId: grainCandidate.sourceId, sourceHash: grainCandidate.sourceHash });
  const readiness = buildUnderstandingReadiness({ scope: "source", physical, semantic, grain });
  const result = { physical, semantic, grain, readiness };
  cache.set(key, result);
  return result;
}

const keyMatchers: Record<string, RegExp> = {
  sales_revenue: /(^|_)(sales_)?(net_)?revenue_sum$/,
  quantity_sold: /(^|_)(sales_)?quantity_sum$/,
  transaction_count: /(^|_)(order|transaction)_count$/,
  inventory_on_hand: /(stock(_quantity|_qty)?|inventory_on_hand|ending_stock).*sum$/,
  delivery_count: /(shipment|delivery)_count$/,
  gross_profit: /gross_profit_sum$/,
};

function expectation(sample: SampleTruth, metricId: string): MetricGroundTruthExpectationV1 {
  const entry = Object.entries(sample.verifiedMetricAnswers).find(([key]) => keyMatchers[metricId]?.test(key));
  const applicable = Boolean(entry);
  const tuningProvenance = sample.group === "golden" ? "golden_tuning" : sample.group === "holdout" ? "holdout_evaluation_only" : sample.group === "adversarial" ? "adversarial_evaluation_only" : "multi_file_evaluation_only";
  return {
    caseId: sample.id,
    group: sample.group,
    metricId,
    applicable,
    allowedPreflightStates: applicable ? ["ready", "conditionally_ready", "blocked"] : ["conditionally_ready", "blocked", "unknown", "unsupported", "not_applicable"],
    forbiddenPreflightStates: applicable ? ["unknown", "unsupported", "not_applicable"] : ["ready"],
    requiredBlockers: sample.group === "multi_file" && applicable ? ["cross_source_metric_requires_governed_relationship"] : [],
    verifiedValue: entry?.[1] ?? null,
    grainExpectation: sample.dataset.expectedGrain,
    currencyOrUnitExpectation: "preserve_explicit_or_remain_conditional",
    tuningProvenance,
  };
}

describe("Phase 5M1 metric preflight acceptance corpus governance", () => {
  it("keeps all thirty cases stable and validation groups tuning-forbidden", () => {
    expect(samples).toHaveLength(30);
    for (const sample of samples) expect(sample.provenance.tuningUse).toBe(manifest.groups[sample.group].tuningAllowed ? "allowed" : "forbidden");
  });

  for (const group of ["golden", "holdout", "adversarial", "multi_file"] as const) {
    it(`evaluates ${group} without using it outside its tuning policy`, () => {
      for (const sample of samples.filter((item) => item.group === group)) {
        const result = preflightGovernedMetrics({
          schemaVersion: "lightbi.governed-metric-preflight-input.v1",
          sources: sample.sources.map(canonical),
          evaluationContext: { group, tuningUse: sample.provenance.tuningUse },
          expectedPolicyHash: governedMetricPolicyHash(),
        });
        for (const item of result.metrics) {
          const truth = expectation(sample, item.metricId);
          expect(truth.allowedPreflightStates, `${sample.id}:${item.metricId}`).toContain(item.state);
          expect(truth.forbiddenPreflightStates, `${sample.id}:${item.metricId}`).not.toContain(item.state);
          for (const required of truth.requiredBlockers) expect(item.blockers.map((entry) => entry.code), `${sample.id}:${item.metricId}`).toContain(required);
          expect(item.result).toBeNull();
          expect(item.metricExecutionExecuted).toBe(false);
        }
        expect(result.tuningAllowed).toBe(group === "golden");
      }
    }, 120_000);
  }

  it("preserves every verified metric answer without manufacturing results", () => {
    const expectations = samples.flatMap((sample) => Object.keys(keyMatchers).map((metricId) => expectation(sample, metricId)));
    expect(expectations.filter((item) => item.verifiedValue !== null).length).toBeGreaterThan(0);
    for (const truth of expectations) {
      const source = samples.find((sample) => sample.id === truth.caseId)!;
      const matchingValue = Object.entries(source.verifiedMetricAnswers).find(([key]) => keyMatchers[truth.metricId]?.test(key))?.[1] ?? null;
      expect(truth.verifiedValue).toBe(matchingValue);
    }
  });
});
