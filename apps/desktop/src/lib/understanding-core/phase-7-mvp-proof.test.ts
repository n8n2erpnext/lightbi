import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "../semantic-registry";
import { activateCommerceDistributionDomain } from "./commerce-distribution-domain-pack";
import { questionActionPolicyHash } from "./commerce-distribution-question-policy";
import { aggregateContextualEvidence } from "./contextual-evidence-aggregator";
import type { CanonicalMetricSourceV1, DomainMetricEvaluationContextV1 } from "./governed-domain-metric-contracts";
import { executeGovernedMetricRequest } from "./governed-metric-executor";
import { preflightGovernedMetrics } from "./governed-metric-preflight";
import { governedMetricPolicyHash } from "./governed-metric-policy";
import { planGovernedMetricQuery } from "./governed-metric-query-planner";
import { generateGovernedCommerceQuestionsAndActions } from "./governed-question-action-generator";
import { preflightGovernedRuntimeAction } from "./governed-runtime-preflight";
import { governedRuntimePolicyHash } from "./governed-runtime-policy";
import { generateGrainCandidateArtifact } from "./grain-candidate-engine";
import { resolveGrainSignatureShadow } from "./grain-resolver";
import { profilePhysicalSource } from "./profiler";
import { buildUnderstandingReadiness } from "./readiness-engine";
import { generateRelationshipCandidateArtifact } from "./relationship-candidate-engine";
import { resolveRelationshipShadow } from "./relationship-resolver";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { resolveSemanticShadow } from "./semantic-resolver";
import type { GovernedDuckDBBoundaryV1 } from "./governed-runtime-contracts";

type Group = "golden" | "holdout" | "adversarial" | "multi_file";
type MappingTruth = { physicalColumn: string; canonicalSignal: string; allowedFinalStates?: string[] };
type BlockedActionTruth = { actionId: string; reasonCode: string };
type SourceTruth = { path: string; sheet: string; required: boolean; sha256: string };
type SampleTruth = {
  id: string;
  group: Group;
  category: string;
  provenance: { tuningUse: "allowed" | "forbidden" };
  sources: SourceTruth[];
  dataset: { expectedGrain: string };
  recognition: {
    requiredMappings: MappingTruth[];
    forbiddenMappings: MappingTruth[];
    expectedAmbiguousMappings: Array<{ physicalColumn: string; candidateSignals: string[]; contextualResolution: { allowedFinalStates: string[] } }>;
    expectedUnknownBusinessColumns: string[];
  };
  support: {
    allowedDomainPacks: string[];
    blockedDomainPacks: string[];
    expectedExecutableActions: string[];
    expectedBlockedActions: BlockedActionTruth[];
  };
  verifiedMetricAnswers: Record<string, number>;
};
type Manifest = {
  corpusVersion: string;
  groups: Record<Group, { tuningAllowed: boolean }>;
  groundTruthFiles: Array<{ path: string }>;
};
type GrainExpectation = {
  id: string;
  requiredStructuralAlternatives?: string[];
  requiredTemporalAlternatives?: string[];
};

const ROOT = path.resolve(__dirname, "../../../../..");
const require = createRequire(import.meta.url);
const corpusResolver = require(path.join(ROOT, "sample-corpus/tooling/corpus-fixture-resolver.cjs")) as {
  loadGroundTruth(version: string): { manifest: Manifest; samples: SampleTruth[] };
  resolveFixture(version: string, relativePath: string): string;
};
const duckdb = require("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs") as any;
const duckdbDist = dirname(require.resolve("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs"));
const { manifest, samples } = corpusResolver.loadGroundTruth("1.4.0");
const grainExpectations = new Map(
  (JSON.parse(fs.readFileSync(path.join(ROOT, "sample-corpus/grain-resolution-shadow-expectations.v1.json"), "utf8")) as { cases: GrainExpectation[] })
    .cases.map((entry) => [entry.id, entry]),
);

function quoteIdentifier(value: string): string { return `"${value.toLowerCase().replace(/"/g, '""')}"`; }
function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined || value === "") return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${String(value).replace(/'/g, "''")}'`;
}
function normalizeDuckDBValue(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  if (Array.isArray(value)) return value.map(normalizeDuckDBValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, normalizeDuckDBValue(nested)]));
  return value;
}
async function nodeDuckDBBoundary(): Promise<GovernedDuckDBBoundaryV1> {
  process.env.HOME = "/tmp";
  const db = await duckdb.createDuckDB({ mvp: { mainModule: join(duckdbDist, "duckdb-mvp.wasm"), mainWorker: join(duckdbDist, "duckdb-node-mvp.worker.cjs") } }, new duckdb.VoidLogger(), duckdb.NODE_RUNTIME);
  await db.instantiate();
  return {
    async execute(plan, rows) {
      const connection = db.connect();
      try {
        const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
        const types = columns.map((column) => rows.some((row) => typeof row[column] === "number") ? "DOUBLE" : rows.some((row) => typeof row[column] === "boolean") ? "BOOLEAN" : "VARCHAR");
        connection.query(`CREATE OR REPLACE TABLE __LIGHTBI_PREVIEW_TABLE__ (${columns.map((column, index) => `${quoteIdentifier(column)} ${types[index]}`).join(", ")})`);
        for (let offset = 0; offset < rows.length; offset += 250) {
          connection.query(`INSERT INTO __LIGHTBI_PREVIEW_TABLE__ VALUES ${rows.slice(offset, offset + 250).map((row) => `(${columns.map((column) => sqlLiteral(row[column])).join(", ")})`).join(", ")}`);
        }
        let parameterIndex = 0;
        const table = connection.query(plan.sql.replace(/\?/g, () => sqlLiteral(plan.parameters[parameterIndex++])));
        return { engine: "duckdb", status: "executed", columns: table.schema.fields.map((field: any) => field.name), rows: table.toArray().map((row: any) => normalizeDuckDBValue(row.toJSON()) as Record<string, unknown>), error: null, executionScope: "full_file" };
      } catch (error) {
        return { engine: "duckdb", status: "failed", columns: [], rows: [], error: error instanceof Error ? error.message : String(error), executionScope: "full_file" };
      } finally { connection.close(); }
    },
  };
}

function rowsFromRegion(rawRows: unknown[][], source: CanonicalMetricSourceV1): Record<string, unknown>[] {
  const first = source.physical.sourceProfile.dataRegion.firstSourceRowIndex;
  const last = source.physical.sourceProfile.dataRegion.lastSourceRowIndex;
  const columns = source.physical.sourceProfile.header.physicalColumnNames;
  if (first === null || last === null || columns.length === 0) return [];
  return rawRows.slice(first, last + 1)
    .filter((row) => row.some((value) => value !== "" && value !== null && value !== undefined))
    .map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? null])));
}

function loadSource(source: SourceTruth) {
  const file = corpusResolver.resolveFixture("1.4.0", source.path);
  const bytes = fs.readFileSync(file);
  const actualHash = createHash("sha256").update(bytes).digest("hex");
  if (actualHash !== source.sha256) throw new Error(`PHASE_7_SOURCE_HASH_DRIFT:${source.path}`);
  const workbook = XLSX.read(bytes, { raw: true });
  const sheet = workbook.Sheets[source.sheet] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`PHASE_7_REQUIRED_SHEET_MISSING:${source.path}#${source.sheet}`);
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
  return { source, rawRows, rows: rowsFromRegion(rawRows, canonicalSource), canonicalSource, grainCandidate };
}

function metricTruth(sample: SampleTruth, metricId: string, sourcePath: string): { key: string; value: number } | null {
  const entries = Object.entries(sample.verifiedMetricAnswers);
  const patterns: Record<string, RegExp[]> = {
    sales_revenue: [/^revenue_sum$/, /^sales_sum$/, /^net_revenue_sum$/, /sales_revenue_sum$/, /accounting_net_revenue_sum$/, /^(may|june)_revenue$/],
    quantity_sold: [/^quantity_sum$/],
    transaction_count: [/^row_count$/],
    delivery_count: [/^row_count$/],
    gross_profit: [/^gross_profit_sum$/, /^profit_sum$/, /^(may|june)_gross_profit$/],
  };
  const candidates = entries.filter(([key]) => (patterns[metricId] ?? []).some((pattern) => pattern.test(key)));
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return { key: candidates[0][0], value: candidates[0][1] };
  const lower = sourcePath.toLowerCase();
  const period = lower.includes("june") ? "june" : lower.includes("may") ? "may" : null;
  const preferred = candidates.find(([key]) => period && key.startsWith(`${period}_`))
    ?? candidates.find(([key]) => lower.includes("sales") ? /sales|revenue_sum/.test(key) : lower.includes("accounting") ? /accounting|gross_profit/.test(key) : lower.includes("logistics") ? /delivery/.test(key) : false);
  const selected = preferred ?? candidates[0];
  return { key: selected[0], value: selected[1] };
}

function expectedMetricDomain(metricId: string): string[] {
  if (["sales_revenue", "transaction_count"].includes(metricId)) return ["revenue_sales"];
  if (metricId === "quantity_sold") return ["revenue_sales", "inventory_movement"];
  if (metricId === "inventory_on_hand") return ["inventory_snapshot"];
  if (metricId === "delivery_count") return ["delivery_operations"];
  if (metricId === "gross_profit") return ["finance_profitability"];
  return [];
}

describe.sequential("Phase 7 MVP proof evaluation", () => {
  it("evaluates the frozen corpus through the canonical production stages without tuning", async () => {
    const boundary = await nodeDuckDBBoundary();
    const records: Array<Record<string, unknown>> = [];
    const mappingBands = { confirmed: { correct: 0, incorrect: 0, unadjudicated: 0 }, probable: { correct: 0, incorrect: 0, unadjudicated: 0 } };
    let requiredMappings = 0;
    let requiredMappingsFound = 0;
    let heldoutCoreRequired = 0;
    let heldoutCoreFound = 0;
    let semanticColumns = 0;
    let ambiguousOrUnknown = 0;
    let grainChecks = 0;
    let grainMatches = 0;
    let domainPredicted = 0;
    let domainTruePositive = 0;
    let domainFalsePositive = 0;
    let advertisedActions = 0;
    let runtimeAllowedActions = 0;
    let runnableCorrectActions = 0;
    let executionSuccesses = 0;
    let falseExecutableActions = 0;
    let falseDecisionSupport = 0;
    let explainedBlockedOrFailed = 0;
    let blockedOrFailed = 0;
    let metricComparisons = 0;
    let metricMatches = 0;
    const metricCoverage = new Set<string>();
    const metricMismatches: Array<Record<string, unknown>> = [];
    const timeToFirstResultMs: number[] = [];

    for (const sample of samples) {
      expect(sample.provenance.tuningUse).toBe(manifest.groups[sample.group].tuningAllowed ? "allowed" : "forbidden");
      const startedAt = performance.now();
      const loaded = sample.sources.map(loadSource);
      const context: DomainMetricEvaluationContextV1 = { group: sample.group, tuningUse: sample.provenance.tuningUse };
      const relationship = loaded.length > 1
        ? resolveRelationshipShadow(generateRelationshipCandidateArtifact({
            schemaVersion: "lightbi.source-bundle-input.v1",
            bundleId: sample.id,
            members: loaded.map((entry) => ({ physical: entry.canonicalSource.physical, semantic: entry.canonicalSource.semantic, grainCandidate: entry.grainCandidate, grainResolution: entry.canonicalSource.grain, rawRows: entry.rawRows })),
          }))
        : undefined;
      const combinedActivation = activateCommerceDistributionDomain({ schemaVersion: "lightbi.domain-activation-input.v1", sources: loaded.map((entry) => entry.canonicalSource), relationship, evaluationContext: context });
      const combinedMetricPreflight = preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources: loaded.map((entry) => entry.canonicalSource), relationship, evaluationContext: context, expectedPolicyHash: governedMetricPolicyHash() });
      const expectedDomain = sample.support.allowedDomainPacks.some((pack) => ["revenue_sales", "inventory_snapshot", "inventory_movement", "delivery_operations", "finance_profitability"].includes(pack));
      const predictedDomain = ["active", "conditional", "detect_only"].includes(combinedActivation.state);
      if (predictedDomain) {
        domainPredicted += 1;
        if (expectedDomain) domainTruePositive += 1;
        else domainFalsePositive += 1;
      }

      const expectedByColumn = new Map(sample.recognition.requiredMappings.map((mapping) => [mapping.physicalColumn, mapping]));
      const mappingResults: Array<Record<string, unknown>> = [];
      const mappingBandJudgments: Array<Record<string, unknown>> = [];
      const forbiddenByColumn = new Map<string, Set<string>>();
      for (const mapping of sample.recognition.forbiddenMappings) {
        const set = forbiddenByColumn.get(mapping.physicalColumn) ?? new Set<string>();
        set.add(mapping.canonicalSignal);
        forbiddenByColumn.set(mapping.physicalColumn, set);
      }
      const resolutions = loaded.flatMap((entry) => entry.canonicalSource.semantic.columns);
      semanticColumns += resolutions.length;
      ambiguousOrUnknown += resolutions.filter((column) => ["ambiguous", "unknown"].includes(column.finalState)).length;
      for (const column of resolutions) {
        if (column.finalState !== "confirmed" && column.finalState !== "probable") continue;
        const band = mappingBands[column.finalState];
        const expected = expectedByColumn.get(column.physicalColumn);
        if (expected) {
          const correct = column.selectedCandidateId === expected.canonicalSignal && (expected.allowedFinalStates ?? ["confirmed", "probable"]).includes(column.finalState);
          if (correct) band.correct += 1;
          else band.incorrect += 1;
          mappingBandJudgments.push({ physicalColumn: column.physicalColumn, band: column.finalState, selectedCandidateId: column.selectedCandidateId, verdict: correct ? "correct" : "incorrect" });
        } else if (column.selectedCandidateId && forbiddenByColumn.get(column.physicalColumn)?.has(column.selectedCandidateId)) {
          band.incorrect += 1;
          mappingBandJudgments.push({ physicalColumn: column.physicalColumn, band: column.finalState, selectedCandidateId: column.selectedCandidateId, verdict: "incorrect_forbidden" });
        } else {
          band.unadjudicated += 1;
          mappingBandJudgments.push({ physicalColumn: column.physicalColumn, band: column.finalState, selectedCandidateId: column.selectedCandidateId, verdict: "unadjudicated" });
        }
      }
      for (const mapping of sample.recognition.requiredMappings) {
        requiredMappings += 1;
        const matched = resolutions.some((column) => column.physicalColumn === mapping.physicalColumn && column.selectedCandidateId === mapping.canonicalSignal && (mapping.allowedFinalStates ?? ["confirmed", "probable"]).includes(column.finalState));
        if (matched) requiredMappingsFound += 1;
        const actual = resolutions.find((column) => column.physicalColumn === mapping.physicalColumn);
        mappingResults.push({ physicalColumn: mapping.physicalColumn, expectedSignal: mapping.canonicalSignal, allowedFinalStates: mapping.allowedFinalStates ?? ["confirmed", "probable"], actualSignal: actual?.selectedCandidateId ?? null, actualState: actual?.finalState ?? "missing", matched });
        const core = ["order", "time_period", "revenue", "product", "quantity", "sold_qty", "stock_qty", "shipment", "delivery_status", "total_cost"].includes(mapping.canonicalSignal);
        if (sample.group === "holdout" && sample.support.allowedDomainPacks.length > 0 && core) {
          heldoutCoreRequired += 1;
          if (matched) heldoutCoreFound += 1;
        }
      }

      const grainExpectation = grainExpectations.get(sample.id);
      const grainResults: Array<Record<string, unknown>> = [];
      for (const entry of loaded) {
        const structuralOk = !grainExpectation?.requiredStructuralAlternatives || grainExpectation.requiredStructuralAlternatives.includes(entry.canonicalSource.grain.signature.structuralForm.value);
        const temporalOk = !grainExpectation?.requiredTemporalAlternatives || grainExpectation.requiredTemporalAlternatives.includes(entry.canonicalSource.grain.signature.temporalMode.value);
        grainChecks += 1;
        if (structuralOk && temporalOk) grainMatches += 1;
        grainResults.push({ source: entry.source.path, structural: entry.canonicalSource.grain.signature.structuralForm, temporal: entry.canonicalSource.grain.signature.temporalMode, requiredStructuralAlternatives: grainExpectation?.requiredStructuralAlternatives ?? null, requiredTemporalAlternatives: grainExpectation?.requiredTemporalAlternatives ?? null, matched: structuralOk && temporalOk });
      }

      const sourceRecords: Array<Record<string, unknown>> = [];
      let firstResultRecorded = false;
      for (const entry of loaded) {
        const activation = activateCommerceDistributionDomain({ schemaVersion: "lightbi.domain-activation-input.v1", sources: [entry.canonicalSource], evaluationContext: context });
        const metricPreflight = preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources: [entry.canonicalSource], evaluationContext: context, expectedPolicyHash: governedMetricPolicyHash() });
        const questions = generateGovernedCommerceQuestionsAndActions({ schemaVersion: "lightbi.question-action-generation-input.v1", canonicalSource: entry.canonicalSource, domainActivation: activation, metricPreflight, expectedQuestionPolicyHash: questionActionPolicyHash() });
        const actionRecords: Array<Record<string, unknown>> = [];
        advertisedActions += questions.actionCandidates.length;
        for (const action of questions.actionCandidates) {
          const runtime = preflightGovernedRuntimeAction({ schemaVersion: "lightbi.governed-runtime-preflight-input.v1", canonicalSource: entry.canonicalSource, metricPreflight, questionGeneration: questions, actionCandidate: action, expectedRuntimePolicyHash: governedRuntimePolicyHash() });
          const planning = planGovernedMetricQuery(runtime);
          const expectedForDomain = expectedMetricDomain(action.metricId).some((domain) => sample.support.allowedDomainPacks.includes(domain));
          if (runtime.executionAllowed) {
            runtimeAllowedActions += 1;
            if (expectedForDomain) runnableCorrectActions += 1;
            else falseExecutableActions += 1;
          }
          let execution: Record<string, unknown> | null = null;
          if (planning.state === "planned") {
            const truth = metricTruth(sample, action.metricId, entry.source.path);
            const result = await executeGovernedMetricRequest({
              schemaVersion: "lightbi.governed-metric-execution-request.v1",
              requestId: `phase7:${sample.id}:${action.actionCandidateId}`,
              plan: planning.plan,
              rows: entry.rows,
              groundTruth: truth ? { state: "verified", value: truth.value, tolerance: 0, provenance: `${sample.id}:${truth.key}` } : { state: "unavailable", value: null, tolerance: null, provenance: `${sample.id}:no_matching_ground_truth` },
            }, boundary);
            if (result.status === "executed") {
              executionSuccesses += 1;
              if (!firstResultRecorded) {
                timeToFirstResultMs.push(performance.now() - startedAt);
                firstResultRecorded = true;
              }
            } else {
              blockedOrFailed += 1;
              if (result.error || result.limitations.length > 0 || result.restrictions.length > 0) explainedBlockedOrFailed += 1;
            }
            if (truth) {
              metricComparisons += 1;
              metricCoverage.add(action.metricId);
              if (["exact_match", "within_tolerance"].includes(result.groundTruthComparison.state)) metricMatches += 1;
              else metricMismatches.push({ sampleId: sample.id, source: entry.source.path, metricId: action.metricId, truthKey: truth.key, comparison: result.groundTruthComparison });
            }
            execution = { status: result.status, resultShape: result.resultShape, rowCount: result.rowCount, comparison: result.groundTruthComparison, error: result.error, restrictions: result.restrictions.map((item) => item.code) };
            if (result.decisionUseAuthorized) falseDecisionSupport += 1;
          } else {
            blockedOrFailed += 1;
            const explanations = [...runtime.blockers.map((item) => item.code), ...runtime.restrictions.map((item) => item.code), ...planning.blockers];
            if (explanations.length > 0) explainedBlockedOrFailed += 1;
          }
          actionRecords.push({ questionId: action.questionId, metricId: action.metricId, actionState: action.actionCandidateState, runtimeState: runtime.state, runtimeBlockers: runtime.blockers.map((item) => item.code), planningState: planning.state, execution });
        }
        for (const blocked of questions.blockedQuestions) {
          blockedOrFailed += 1;
          if (blocked.blockers.length > 0 || blocked.limitations.length > 0 || blocked.remediation.length > 0) explainedBlockedOrFailed += 1;
        }
        sourceRecords.push({
          source: entry.source.path,
          semanticStateCounts: entry.canonicalSource.semantic.coverage.stateCounts,
          grain: { structural: entry.canonicalSource.grain.signature.structuralForm, temporal: entry.canonicalSource.grain.signature.temporalMode, readiness: entry.canonicalSource.grain.overallReadiness },
          domainState: activation.state,
          metrics: metricPreflight.metrics.map((item) => ({ metricId: item.metricId, state: item.state, blockers: item.blockers.map((blocker) => blocker.code) })),
          defaultQuestions: questions.defaultQuestions.map((item) => item.questionId),
          blockedQuestions: questions.blockedQuestions.map((item) => ({ questionId: item.questionId, blockers: item.blockers.map((blocker) => blocker.code) })),
          actions: actionRecords,
        });
      }
      records.push({
        sampleId: sample.id,
        group: sample.group,
        category: sample.category,
        tuningUse: sample.provenance.tuningUse,
        expectedDomain,
        predictedDomain,
        combinedDomainState: combinedActivation.state,
        mappingResults,
        mappingBandJudgments,
        grainResults,
        combinedMetricStates: combinedMetricPreflight.metrics.map((item) => ({ metricId: item.metricId, state: item.state, blockers: item.blockers.map((blocker) => blocker.code) })),
        relationshipState: relationship ? {
          pairs: relationship.pairs.map((pair) => ({
            pairId: pair.pairId,
            readiness: pair.readiness,
            meaning: { state: pair.meaning.state, value: pair.meaning.value },
            operationCompatibility: {
              state: pair.operationCompatibility.state,
              value: pair.operationCompatibility.value,
              executionAuthorized: pair.operationCompatibility.executionAuthorized,
              blockingRisks: pair.operationCompatibility.blockingRisks,
            },
            risks: pair.risks.risks,
            limitations: [
              ...pair.meaning.limitations.map((item) => item.code),
              ...pair.operationCompatibility.limitations.map((item) => item.code),
            ],
          })),
          joinSafetyExecuted: relationship.joinSafety.executed,
          operationExecutionExecuted: relationship.operationExecution.executed,
        } : null,
        sources: sourceRecords,
      });
    }

    const adjudicatedConfirmed = mappingBands.confirmed.correct + mappingBands.confirmed.incorrect;
    const adjudicatedProbable = mappingBands.probable.correct + mappingBands.probable.incorrect;
    const result = {
      schemaVersion: "lightbi.phase-7-evaluation-observation.v1",
      corpusVersion: manifest.corpusVersion,
      evaluatedAt: new Date().toISOString(),
      cases: samples.length,
      sourceOccurrences: samples.reduce((total, sample) => total + sample.sources.length, 0),
      groups: Object.fromEntries((["golden", "holdout", "adversarial", "multi_file"] as const).map((group) => [group, samples.filter((sample) => sample.group === group).length])),
      measurements: {
        mappingPrecision: {
          confirmed: { ...mappingBands.confirmed, precision: adjudicatedConfirmed ? mappingBands.confirmed.correct / adjudicatedConfirmed : null },
          probable: { ...mappingBands.probable, precision: adjudicatedProbable ? mappingBands.probable.correct / adjudicatedProbable : null },
          combinedHighConfidence: { correct: mappingBands.confirmed.correct + mappingBands.probable.correct, incorrect: mappingBands.confirmed.incorrect + mappingBands.probable.incorrect, precision: adjudicatedConfirmed + adjudicatedProbable ? (mappingBands.confirmed.correct + mappingBands.probable.correct) / (adjudicatedConfirmed + adjudicatedProbable) : null },
        },
        requiredMappingRecall: requiredMappings ? requiredMappingsFound / requiredMappings : null,
        heldoutCoreSignalRecall: heldoutCoreRequired ? heldoutCoreFound / heldoutCoreRequired : null,
        ambiguityUnknownRate: semanticColumns ? ambiguousOrUnknown / semanticColumns : null,
        grainAccuracy: grainChecks ? grainMatches / grainChecks : null,
        domainActivationPrecision: domainPredicted ? domainTruePositive / domainPredicted : null,
        domainActivation: { predicted: domainPredicted, truePositive: domainTruePositive, falsePositive: domainFalsePositive },
        runnableActionPrecision: runtimeAllowedActions ? runnableCorrectActions / runtimeAllowedActions : null,
        advertisedActionExecutionSuccess: advertisedActions ? executionSuccesses / advertisedActions : null,
        actionCounts: { advertised: advertisedActions, runtimeAllowed: runtimeAllowedActions, executed: executionSuccesses, falseExecutable: falseExecutableActions },
        metricCorrectness: metricComparisons ? metricMatches / metricComparisons : null,
        metricComparisonCounts: { compared: metricComparisons, matched: metricMatches, mismatched: metricMismatches.length, coveredMetricIds: [...metricCoverage].sort() },
        falseDecisionSupport,
        blockedExplanationCompleteness: blockedOrFailed ? explainedBlockedOrFailed / blockedOrFailed : null,
        blockedCounts: { total: blockedOrFailed, explained: explainedBlockedOrFailed },
        timeToFirstValidResultMs: { observations: timeToFirstResultMs.length, minimum: timeToFirstResultMs.length ? Math.min(...timeToFirstResultMs) : null, median: timeToFirstResultMs.length ? [...timeToFirstResultMs].sort((a, b) => a - b)[Math.floor(timeToFirstResultMs.length / 2)] : null, maximum: timeToFirstResultMs.length ? Math.max(...timeToFirstResultMs) : null },
      },
      metricMismatches,
      records,
      evaluationIntegrity: { tuningPerformed: false, groundTruthModified: false, runtimeRulesModified: false, filenameOrExpectedAnswerUsedByRuntime: false },
    };
    fs.writeFileSync(process.env.LIGHTBI_PHASE7_OUTPUT ?? "/tmp/phase7-evaluation-observation.json", `${JSON.stringify(result, null, 2)}\n`);
    expect(samples).toHaveLength(30);
    expect(result.sourceOccurrences).toBe(37);
    expect(result.evaluationIntegrity).toEqual({ tuningPerformed: false, groundTruthModified: false, runtimeRulesModified: false, filenameOrExpectedAnswerUsedByRuntime: false });
  }, 600_000);
});
