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
import { GOVERNED_METRIC_DEFINITIONS_V1, governedMetricPolicyHash } from "./governed-metric-policy";
import { generateGovernedCommerceQuestionsAndActions } from "./governed-question-action-generator";
import { generateGrainCandidateArtifact } from "./grain-candidate-engine";
import { resolveGrainSignatureShadow } from "./grain-resolver";
import { profilePhysicalSource } from "./profiler";
import { buildUnderstandingReadiness } from "./readiness-engine";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { resolveSemanticShadow } from "./semantic-resolver";

type SourceTruth = { path: string; sheet: string; required: boolean; sha256: string };
type AccountingTruth = {
  id: string;
  group: "golden" | "holdout";
  provenance: { tuningUse: "allowed" | "forbidden"; sourceSystem: string };
  sources: SourceTruth[];
  verifiedMetricAnswers: Record<string, number>;
};

const ROOT = path.resolve(__dirname, "../../../../..");
const financeTruth = JSON.parse(fs.readFileSync(path.join(ROOT, "sample-corpus/versions/1.4.0/ground-truth/finance-accounting.json"), "utf8")) as {
  corpusVersion: string;
  samples: AccountingTruth[];
};
const accountingCases = financeTruth.samples.filter((sample) => ["fin.accounting_may_2026", "fin.accounting_june_2026"].includes(sample.id));

function rowsFromRegion(rawRows: unknown[][], source: CanonicalMetricSourceV1): Record<string, unknown>[] {
  const first = source.physical.sourceProfile.dataRegion.firstSourceRowIndex;
  const last = source.physical.sourceProfile.dataRegion.lastSourceRowIndex;
  const columns = source.physical.sourceProfile.header.physicalColumnNames;
  if (first === null || last === null || columns.length === 0) return [];
  return rawRows.slice(first, last + 1)
    .filter((row) => row.some((value) => value !== "" && value !== null && value !== undefined))
    .map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? null])));
}

function load(source: SourceTruth) {
  const file = path.join(ROOT, source.path);
  const bytes = fs.readFileSync(file);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(source.sha256);
  const workbook = XLSX.read(bytes, { raw: true });
  const sheet = workbook.Sheets[source.sheet] ?? workbook.Sheets[workbook.SheetNames[0]];
  expect(sheet).toBeTruthy();
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "", blankrows: true });
  const sourceId = `${source.path}#${source.sheet}`;
  const physical = profilePhysicalSource({
    schemaVersion: "lightbi.physical-source-input.v1",
    source: { sourceId, kind: "local_file", label: path.basename(source.path), path: source.path, sheet: source.sheet, hash: { algorithm: "sha256", value: source.sha256 } },
    rawRows,
  });
  const candidates = generateSemanticCandidateArtifact(physical, { registry: SEMANTIC_SIGNAL_REGISTRY_V1 });
  const semantic = resolveSemanticShadow(physical, candidates, aggregateContextualEvidence(physical, candidates));
  const grainCandidate = generateGrainCandidateArtifact(physical, semantic, rawRows);
  const grain = resolveGrainSignatureShadow(grainCandidate, { sourceId: grainCandidate.sourceId, sourceHash: grainCandidate.sourceHash });
  const readiness = buildUnderstandingReadiness({ scope: "source", physical, semantic, grain });
  const canonicalSource: CanonicalMetricSourceV1 = { physical, semantic, grain, readiness };
  return { canonicalSource, rows: rowsFromRegion(rawRows, canonicalSource) };
}

describe.sequential("Phase 7R3.2 conditional gross-profit eligibility", () => {
  it("defines gross-profit revenue from governed revenue roles and excludes tax-inclusive invoice totals", () => {
    const definition = GOVERNED_METRIC_DEFINITIONS_V1.find((metric) => metric.metricId === "gross_profit")!;
    const revenue = definition.requirements.find((requirement) => requirement.requirementId === "gross_profit_revenue")!;
    expect(definition.version).toBe("1.0.1");
    expect(revenue.semanticSignals).toEqual(["revenue", "net_revenue"]);
    expect(revenue.semanticSignals).not.toContain("invoice_total");
    expect(definition.aggregationOperator).toBe("derive_subtraction");
  });

  it("resolves one accounting revenue/cost pair but remains blocked without governed currency evidence", () => {
    const observations = accountingCases.map((sample) => {
      const loaded = load(sample.sources[0]);
      const evaluationContext = { group: sample.group, tuningUse: sample.provenance.tuningUse } as const;
      const activation = activateCommerceDistributionDomain({ schemaVersion: "lightbi.domain-activation-input.v1", sources: [loaded.canonicalSource], evaluationContext });
      const metricPreflight = preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources: [loaded.canonicalSource], metricIds: ["gross_profit", "inventory_on_hand"], evaluationContext, expectedPolicyHash: governedMetricPolicyHash() });
      const generation = generateGovernedCommerceQuestionsAndActions({ schemaVersion: "lightbi.question-action-generation-input.v1", canonicalSource: loaded.canonicalSource, domainActivation: activation, metricPreflight, expectedQuestionPolicyHash: questionActionPolicyHash() });
      const grossProfit = metricPreflight.metrics.find((metric) => metric.metricId === "gross_profit")!;
      const inventory = metricPreflight.metrics.find((metric) => metric.metricId === "inventory_on_hand")!;
      const question = generation.candidateQuestions.find((item) => item.metricId === "gross_profit")!;
      const selected = loaded.canonicalSource.semantic.columns.filter((column) => column.selectedCandidateId && ["revenue", "net_revenue", "invoice_total", "cost", "total_cost", "currency", "order", "time_period"].includes(column.selectedCandidateId));
      const revenue = selected.filter((column) => ["revenue", "net_revenue"].includes(column.selectedCandidateId!));
      const cost = selected.filter((column) => ["cost", "total_cost"].includes(column.selectedCandidateId!));
      const currency = selected.filter((column) => column.selectedCandidateId === "currency");
      const independentlyCalculated = loaded.rows.reduce((total, row) => total + Number(row.Revenue_Credit) - Number(row.COGS_Debit), 0);

      expect(revenue, sample.id).toHaveLength(1);
      expect(revenue[0].physicalColumn, sample.id).toBe("Revenue_Credit");
      expect(cost, sample.id).toHaveLength(1);
      expect(cost[0].physicalColumn, sample.id).toBe("COGS_Debit");
      expect(currency, sample.id).toHaveLength(0);
      expect(grossProfit.state, sample.id).toBe("conditionally_ready");
      expect(grossProfit.currencyCompatible, sample.id).toBeNull();
      expect(grossProfit.duplicateHandlingSatisfied, sample.id).toBe(true);
      expect(grossProfit.evidence.some((item) => item.evidenceId === "semantic:invoice_total"), sample.id).toBe(false);
      expect(question.questionState, sample.id).toBe("blocked");
      expect(question.blockers.map((item) => item.code), sample.id).toContain("gross_profit_currency_compatibility_not_proved");
      expect(question.blockers.map((item) => item.code), sample.id).not.toContain("runtime_binding_ambiguous:gross_profit_revenue");
      expect(generation.actionCandidates.some((item) => item.metricId === "gross_profit"), sample.id).toBe(false);
      expect(independentlyCalculated, sample.id).toBe(sample.verifiedMetricAnswers.gross_profit_sum);
      expect(inventory.state, sample.id).toBe("blocked");

      return {
        sampleId: sample.id,
        group: sample.group,
        source: sample.sources[0],
        corpusVersion: financeTruth.corpusVersion,
        sourceSystem: sample.provenance.sourceSystem,
        selectedRevenue: revenue.map((column) => ({ physicalColumn: column.physicalColumn, semanticId: column.selectedCandidateId, state: column.finalState })),
        selectedCost: cost.map((column) => ({ physicalColumn: column.physicalColumn, semanticId: column.selectedCandidateId, state: column.finalState })),
        selectedCurrency: [],
        identity: loaded.canonicalSource.grain.signature.identityBasis,
        structure: loaded.canonicalSource.grain.signature.structuralForm,
        temporal: loaded.canonicalSource.grain.signature.temporalMode,
        measureSafety: loaded.canonicalSource.grain.signature.measureSafety.observations.filter((item) => ["Revenue_Credit", "COGS_Debit"].includes(item.physicalColumn)),
        metric: grossProfit,
        question: { state: question.questionState, blockers: question.blockers, limitations: question.limitations },
        actionCount: generation.actionCandidates.filter((item) => item.metricId === "gross_profit").length,
        independentCalculation: { method: "SUM(Revenue_Credit - COGS_Debit)", expected: sample.verifiedMetricAnswers.gross_profit_sum, actual: independentlyCalculated },
        runtimeExecutionAttempted: false,
        inventoryStatus: "authentic_snapshot_and_frozen_truth_unavailable",
      };
    });
    expect(observations).toHaveLength(2);
    fs.writeFileSync("/tmp/phase7r32-gross-profit-observation.json", `${JSON.stringify({ observations }, null, 2)}\n`);
  }, 60_000);
});
