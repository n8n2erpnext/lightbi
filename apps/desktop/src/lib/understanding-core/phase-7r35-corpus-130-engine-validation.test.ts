import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path, { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "../semantic-registry";
import { activateCommerceDistributionDomain } from "./commerce-distribution-domain-pack";
import { questionActionPolicyHash } from "./commerce-distribution-question-policy";
import { aggregateContextualEvidence } from "./contextual-evidence-aggregator";
import type { CanonicalMetricSourceV1 } from "./governed-domain-metric-contracts";
import { executeGovernedMetricRequest } from "./governed-metric-executor";
import { preflightGovernedMetrics } from "./governed-metric-preflight";
import { governedMetricPolicyHash } from "./governed-metric-policy";
import { planGovernedMetricQuery } from "./governed-metric-query-planner";
import { generateGovernedCommerceQuestionsAndActions } from "./governed-question-action-generator";
import { preflightGovernedRuntimeAction } from "./governed-runtime-preflight";
import { governedRuntimePolicyHash } from "./governed-runtime-policy";
import type { GovernedAsOfBasisV1, GovernedDuckDBBoundaryV1 } from "./governed-runtime-contracts";
import { generateGrainCandidateArtifact } from "./grain-candidate-engine";
import { resolveGrainSignatureShadow } from "./grain-resolver";
import { profilePhysicalSource } from "./profiler";
import { buildUnderstandingReadiness } from "./readiness-engine";
import { generateRelationshipCandidateArtifact } from "./relationship-candidate-engine";
import { resolveRelationshipShadow } from "./relationship-resolver";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { resolveSemanticShadow } from "./semantic-resolver";
import { createCanonicalSourceCurrencyEvidence, createCanonicalSourceInventorySnapshotEvidence } from "./canonical-source-evidence";

type SourceSpec = {
  id: string;
  path: string;
  sheet: string;
  sha256: string;
  rowCount: number;
  evidenceType: string;
  period: "may" | "june" | null;
  targetMetric: "sales_revenue" | "delivery_count" | "gross_profit" | "inventory_on_hand" | null;
  currencyContract: { currency: string; columns: string[]; period: string; reference: string; referenceHash: string } | null;
  snapshotContract: { asOf: string; unit: string; reference: string; referenceHash: string } | null;
};

type LoadedSource = {
  spec: SourceSpec;
  rawRows: unknown[][];
  rows: Record<string, unknown>[];
  canonicalSource: CanonicalMetricSourceV1;
  grainCandidate: ReturnType<typeof generateGrainCandidateArtifact>;
};

const ROOT = path.resolve(__dirname, "../../../../..");
const CORPUS = path.join(ROOT, "sample-corpus/versions/1.3.0");
const require = createRequire(import.meta.url);
const duckdb = require("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs") as any;
const duckdbDist = dirname(require.resolve("@duckdb/duckdb-wasm/dist/duckdb-node-blocking.cjs"));

function sha256(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function sourcePeriod(value: string): SourceSpec["period"] {
  const lower = value.toLowerCase();
  return lower.includes("may") ? "may" : lower.includes("june") ? "june" : null;
}

function targetMetric(id: string): SourceSpec["targetMetric"] {
  if (id.startsWith("sales_")) return "sales_revenue";
  if (id.startsWith("logistics_")) return "delivery_count";
  if (id.startsWith("derived.accounting_")) return "gross_profit";
  if (id.startsWith("derived.inventory_snapshot_")) return "inventory_on_hand";
  return null;
}

function safeSourceSpecs(): SourceSpec[] {
  // These files contain provenance and source hashes, but no expected metric totals.
  const anchors = JSON.parse(fs.readFileSync(path.join(ROOT, "sample-corpus/tooling/phase-7r34/authentic-anchors.json"), "utf8")) as {
    anchors: Array<{ anchorId: string; path: string; sheet: string; sha256: string; rowCount: number }>;
  };
  const provenance = JSON.parse(fs.readFileSync(path.join(CORPUS, "generation-provenance.json"), "utf8")) as {
    scenarioContract: { path: string; sha256: string };
    outputs: Array<{ id: string; path: string; sha256: string; rowCount: number; evidenceType: string }>;
  };
  const scenario = JSON.parse(fs.readFileSync(path.join(ROOT, provenance.scenarioContract.path), "utf8")) as {
    scenarioCurrency: string;
    currencyScope: { appliesTo: string[] };
    baseUom: string;
    reportingPeriods: Array<{ periodId: string; inventorySnapshotDate: string }>;
  };
  return [
    ...anchors.anchors.map((source) => ({
      id: source.anchorId,
      path: source.path,
      sheet: source.sheet,
      sha256: source.sha256,
      rowCount: source.rowCount,
      evidenceType: "repository_fixture_anchor",
      period: sourcePeriod(source.anchorId),
      targetMetric: targetMetric(source.anchorId),
      currencyContract: null,
      snapshotContract: null,
    })),
    ...provenance.outputs.map((source) => ({
      id: source.id,
      path: path.posix.join("sample-corpus/versions/1.3.0", source.path),
      sheet: "Sheet1",
      sha256: source.sha256,
      rowCount: source.rowCount,
      evidenceType: source.evidenceType,
      period: sourcePeriod(source.id),
      targetMetric: targetMetric(source.id),
      currencyContract: source.id.startsWith("derived.accounting_") ? {
        currency: scenario.scenarioCurrency,
        columns: scenario.currencyScope.appliesTo,
        period: sourcePeriod(source.id) === "may" ? scenario.reportingPeriods[0].periodId : scenario.reportingPeriods[1].periodId,
        reference: provenance.scenarioContract.path,
        referenceHash: provenance.scenarioContract.sha256,
      } : null,
      snapshotContract: source.id.startsWith("derived.inventory_snapshot_") ? {
        asOf: sourcePeriod(source.id) === "may" ? scenario.reportingPeriods[0].inventorySnapshotDate : scenario.reportingPeriods[1].inventorySnapshotDate,
        unit: scenario.baseUom,
        reference: provenance.scenarioContract.path,
        referenceHash: provenance.scenarioContract.sha256,
      } : null,
    })),
  ];
}

function rowsFromRegion(rawRows: unknown[][], source: CanonicalMetricSourceV1): Record<string, unknown>[] {
  const region = source.physical.sourceProfile.dataRegion;
  const columns = source.physical.sourceProfile.header.physicalColumnNames;
  if (region.firstSourceRowIndex === null || region.lastSourceRowIndex === null || columns.length === 0) return [];
  return rawRows.slice(region.firstSourceRowIndex, region.lastSourceRowIndex + 1)
    .filter((row) => row.some((value) => value !== "" && value !== null && value !== undefined))
    .map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? null])));
}

function loadSource(spec: SourceSpec): LoadedSource {
  const file = path.join(ROOT, spec.path);
  expect(fs.existsSync(file), spec.id).toBe(true);
  expect(sha256(file), spec.id).toBe(spec.sha256);
  const workbook = XLSX.read(fs.readFileSync(file), { raw: true });
  const sheet = workbook.Sheets[spec.sheet] ?? workbook.Sheets[workbook.SheetNames[0]];
  expect(sheet, `${spec.id}:${spec.sheet}`).toBeTruthy();
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "", blankrows: true });
  const sourceId = `${spec.path}#${spec.sheet}`;
  const physical = profilePhysicalSource({
    schemaVersion: "lightbi.physical-source-input.v1",
    source: { sourceId, kind: "local_file", label: path.basename(spec.path), path: spec.path, sheet: spec.sheet, hash: { algorithm: "sha256", value: spec.sha256 } },
    rawRows,
  });
  const candidates = generateSemanticCandidateArtifact(physical, { registry: SEMANTIC_SIGNAL_REGISTRY_V1 });
  const semantic = resolveSemanticShadow(physical, candidates, aggregateContextualEvidence(physical, candidates));
  const grainCandidate = generateGrainCandidateArtifact(physical, semantic, rawRows);
  const grain = resolveGrainSignatureShadow(grainCandidate, { sourceId: grainCandidate.sourceId, sourceHash: grainCandidate.sourceHash });
  const readiness = buildUnderstandingReadiness({ scope: "source", physical, semantic, grain });
  const canonicalSource: CanonicalMetricSourceV1 = { physical, semantic, grain, readiness };
  if (spec.currencyContract) {
    canonicalSource.sourceEvidence = { currency: [createCanonicalSourceCurrencyEvidence({
      sourceId,
      sourceHash: { algorithm: "sha256", value: spec.sha256 },
      currency: spec.currencyContract.currency,
      provenance: {
        kind: "declared_scenario_metadata",
        reference: spec.currencyContract.reference,
        referenceHash: { algorithm: "sha256", value: spec.currencyContract.referenceHash },
      },
      scope: "selected_columns",
      applicableMonetaryColumns: spec.currencyContract.columns,
      reportingPeriod: spec.currencyContract.period,
    })] };
  }
  if (spec.snapshotContract) {
    canonicalSource.sourceEvidence = {
      currency: canonicalSource.sourceEvidence?.currency ?? [],
      inventorySnapshots: [createCanonicalSourceInventorySnapshotEvidence({
        sourceId,
        sourceHash: { algorithm: "sha256", value: spec.sha256 },
        provenance: { kind: "declared_scenario_metadata", reference: spec.snapshotContract.reference, referenceHash: { algorithm: "sha256", value: spec.snapshotContract.referenceHash } },
        scope: "one_item_warehouse_as_of_snapshot",
        quantity: { physicalColumn: "QuantityOnHand", semanticId: "stock_qty" },
        itemIdentity: { physicalColumn: "ItemID", semanticId: "sku" },
        warehouseIdentity: { physicalColumn: "WarehouseID", semanticId: "warehouse" },
        asOf: { physicalColumn: "AsOfDate", semanticId: "time_period", value: spec.snapshotContract.asOf },
        unit: { physicalColumn: "UOM", semanticId: "uom", value: spec.snapshotContract.unit },
      })],
    };
  }
  const rows = rowsFromRegion(rawRows, canonicalSource);
  expect(rows.length, spec.id).toBe(spec.rowCount);
  return { spec, rawRows, rows, canonicalSource, grainCandidate };
}

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
      } finally {
        connection.close();
      }
    },
  };
}

function explicitAsOfBasis(loaded: LoadedSource, metricId: string): GovernedAsOfBasisV1 | null {
  if (metricId !== "inventory_on_hand") return null;
  const time = loaded.canonicalSource.semantic.columns.find((column) => column.selectedCandidateId === "time_period" && ["confirmed", "probable"].includes(column.finalState));
  if (!time) return null;
  const values = [...new Set(loaded.rows.map((row) => row[time.physicalColumn]).filter((value) => value !== null && value !== undefined && value !== "").map(String))];
  return values.length === 1 ? { kind: "column_value", sourceColumnIndex: time.sourceColumnIndex, semanticId: "time_period", value: values[0] } : null;
}

function compactSource(loaded: LoadedSource) {
  return {
    id: loaded.spec.id,
    path: loaded.spec.path,
    sha256: loaded.spec.sha256,
    evidenceType: loaded.spec.evidenceType,
    period: loaded.spec.period,
    targetMetric: loaded.spec.targetMetric,
    physical: {
      rowCount: loaded.canonicalSource.physical.sourceProfile.dataRegion.rowCount,
      headerRowIndex: loaded.canonicalSource.physical.sourceProfile.header.selectedHeaderRowIndex,
      selectionStatus: loaded.canonicalSource.physical.sourceProfile.dataRegion.selectionStatus,
    },
    semantics: loaded.canonicalSource.semantic.columns.map((column) => ({ physicalColumn: column.physicalColumn, state: column.finalState, signal: column.selectedCandidateId, candidateTraces: column.candidateTraces })),
    grain: loaded.canonicalSource.grain.signature,
    readiness: loaded.canonicalSource.readiness.capabilities,
  };
}

describe.sequential("Phase 7R3.5 corpus 1.3.0 governed engine validation", () => {
  it("runs the unchanged canonical path before loading any expected metric truth", async () => {
    const specs = safeSourceSpecs();
    expect(specs).toHaveLength(12);
    const loaded = specs.map(loadSource);
    const boundary = await nodeDuckDBBoundary();
    const sourceRecords: Array<Record<string, unknown>> = [];

    for (const source of loaded) {
      const evaluationContext = { group: "synthetic", tuningUse: "forbidden" } as const;
      const activation = activateCommerceDistributionDomain({ schemaVersion: "lightbi.domain-activation-input.v1", sources: [source.canonicalSource], evaluationContext });
      const metricPreflight = preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources: [source.canonicalSource], evaluationContext, expectedPolicyHash: governedMetricPolicyHash() });
      const questions = generateGovernedCommerceQuestionsAndActions({ schemaVersion: "lightbi.question-action-generation-input.v1", canonicalSource: source.canonicalSource, domainActivation: activation, metricPreflight, expectedQuestionPolicyHash: questionActionPolicyHash() });
      const actions: Array<Record<string, unknown>> = [];

      for (const candidate of questions.actionCandidates) {
        const asOfBasis = explicitAsOfBasis(source, candidate.metricId);
        const runtime = preflightGovernedRuntimeAction({
          schemaVersion: "lightbi.governed-runtime-preflight-input.v1",
          canonicalSource: source.canonicalSource,
          metricPreflight,
          questionGeneration: questions,
          actionCandidate: candidate,
          expectedRuntimePolicyHash: governedRuntimePolicyHash(),
          asOfBasis,
        });
        const planning = planGovernedMetricQuery(runtime);
        let execution: Awaited<ReturnType<typeof executeGovernedMetricRequest>> | null = null;
        if (planning.state === "planned") {
          execution = await executeGovernedMetricRequest({
            schemaVersion: "lightbi.governed-metric-execution-request.v1",
            requestId: `phase7r35:${source.spec.id}:${candidate.questionId}`,
            plan: planning.plan,
            rows: source.rows,
            groundTruth: { state: "unavailable", value: null, tolerance: null, provenance: "phase7r35:expected-not-loaded-before-execution" },
          }, boundary);
        }
        actions.push({ candidate, asOfBasis, runtime, planning, execution });
      }

      sourceRecords.push({
        source: compactSource(source),
        activation,
        metricPreflight,
        questions: {
          defaultQuestions: questions.defaultQuestions,
          candidateQuestions: questions.candidateQuestions,
          blockedQuestions: questions.blockedQuestions,
          actionCandidateCount: questions.actionCandidates.length,
        },
        actions,
      });
    }

    const inventoryBase = loaded.find((source) => source.spec.id === "derived.inventory_snapshot_may")!;
    const movementSource = loaded.find((source) => source.spec.id === "derived.inventory_movements_june")!;
    const inventoryContext = { group: "synthetic", tuningUse: "forbidden" } as const;
    const evaluateInventory = (canonicalSource: CanonicalMetricSourceV1) => {
      const activation = activateCommerceDistributionDomain({ schemaVersion: "lightbi.domain-activation-input.v1", sources: [canonicalSource], evaluationContext: inventoryContext });
      const metricPreflight = preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources: [canonicalSource], metricIds: ["inventory_on_hand"], evaluationContext: inventoryContext, expectedPolicyHash: governedMetricPolicyHash() });
      const questions = generateGovernedCommerceQuestionsAndActions({ schemaVersion: "lightbi.question-action-generation-input.v1", canonicalSource, domainActivation: activation, metricPreflight, expectedQuestionPolicyHash: questionActionPolicyHash() });
      return { activation, metricPreflight, metric: metricPreflight.metrics[0], questions, actions: questions.actionCandidates.filter((item) => item.metricId === "inventory_on_hand") };
    };
    const inventoryNegativeProbes: Array<Record<string, unknown>> = [];
    const blockedInventoryProbe = (probeId: string, canonicalSource: CanonicalMetricSourceV1) => {
      const evaluated = evaluateInventory(canonicalSource);
      const question = evaluated.questions.candidateQuestions.find((item) => item.metricId === "inventory_on_hand")!;
      expect(evaluated.actions, probeId).toHaveLength(0);
      expect(question.actionCandidateId, probeId).toBeNull();
      expect(question.blockers.length, probeId).toBeGreaterThan(0);
      expect(question.evidence.length, probeId).toBeGreaterThan(0);
      expect(question.limitations.length, probeId).toBeGreaterThan(0);
      expect(question.remediation.length, probeId).toBeGreaterThan(0);
      inventoryNegativeProbes.push({ probeId, outcome: "explanation_only", metricState: evaluated.metric.state, blockerCodes: [...new Set([...evaluated.metric.blockers.map((item) => item.code), ...question.blockers.map((item) => item.code)])].sort(), evidenceCount: question.evidence.length, limitationCount: question.limitations.length, remediation: question.remediation });
      return evaluated;
    };
    const inventoryClone = () => structuredClone(inventoryBase.canonicalSource);

    blockedInventoryProbe("movement_quantity_submitted_as_inventory_on_hand", movementSource.canonicalSource);
    const missingAsOf = inventoryClone(); delete missingAsOf.sourceEvidence;
    blockedInventoryProbe("missing_as_of_date", missingAsOf);
    const multipleDates = inventoryClone();
    const multipleDateProfile = multipleDates.physical.sourceProfile.columns.find((item) => item.physicalColumnName === "AsOfDate")!;
    multipleDateProfile.cardinality = { ...multipleDateProfile.cardinality, distinctCount: 2 };
    blockedInventoryProbe("multiple_snapshot_dates_without_selection", multipleDates);

    const crossPeriodPreflight = preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources: [inventoryBase.canonicalSource, loaded.find((source) => source.spec.id === "derived.inventory_snapshot_june")!.canonicalSource], metricIds: ["inventory_on_hand"], evaluationContext: inventoryContext, expectedPolicyHash: governedMetricPolicyHash() });
    expect(crossPeriodPreflight.metrics[0].state, "cross_period_snapshot_sum").toBe("blocked");
    inventoryNegativeProbes.push({ probeId: "cross_period_snapshot_sum", outcome: "blocked_at_m1", metricState: crossPeriodPreflight.metrics[0].state, blockerCodes: crossPeriodPreflight.metrics[0].blockers.map((item) => item.code) });

    const missingItem = inventoryClone();
    Object.assign(missingItem.semantic.columns.find((item) => item.physicalColumn === "ItemID")!, { finalState: "ambiguous", selectedCandidateId: null });
    blockedInventoryProbe("missing_item_identity", missingItem);
    const missingWarehouse = inventoryClone();
    Object.assign(missingWarehouse.semantic.columns.find((item) => item.physicalColumn === "WarehouseID")!, { finalState: "ambiguous", selectedCandidateId: null });
    blockedInventoryProbe("missing_required_warehouse_identity", missingWarehouse);
    const duplicateIdentity = inventoryClone();
    duplicateIdentity.grain.signature.identityBasis.selectedCandidateIds = [];
    blockedInventoryProbe("duplicate_item_warehouse_as_of_key", duplicateIdentity);
    const conflictingQuantity = inventoryClone();
    conflictingQuantity.sourceEvidence!.inventorySnapshots![0] = { ...conflictingQuantity.sourceEvidence!.inventorySnapshots![0], quantity: { physicalColumn: "ConflictingQuantity", semanticId: "stock_qty" } };
    blockedInventoryProbe("conflicting_quantity_for_one_identity", conflictingQuantity);
    const mixedUom = inventoryClone();
    const mixedUomProfile = mixedUom.physical.sourceProfile.columns.find((item) => item.physicalColumnName === "UOM")!;
    mixedUomProfile.cardinality = { ...mixedUomProfile.cardinality, distinctCount: 2 };
    blockedInventoryProbe("mixed_uom", mixedUom);
    const staleAsOf = inventoryClone();
    staleAsOf.sourceEvidence!.inventorySnapshots![0] = { ...staleAsOf.sourceEvidence!.inventorySnapshots![0], sourceId: "wrong-source#Sheet1" };
    blockedInventoryProbe("stale_or_wrong_source_as_of_metadata", staleAsOf);

    const positiveInventory = evaluateInventory(inventoryClone());
    const detailedCandidate = positiveInventory.actions.find((item) => item.questionId === "commerce.inventory_on_hand.by_item_warehouse")!;
    expect(detailedCandidate).toBeTruthy();
    const positiveInventoryRuntime = preflightGovernedRuntimeAction({ schemaVersion: "lightbi.governed-runtime-preflight-input.v1", canonicalSource: inventoryBase.canonicalSource, metricPreflight: positiveInventory.metricPreflight, questionGeneration: positiveInventory.questions, actionCandidate: detailedCandidate, expectedRuntimePolicyHash: governedRuntimePolicyHash(), asOfBasis: explicitAsOfBasis(inventoryBase, "inventory_on_hand") });
    expect(positiveInventoryRuntime.action).not.toBeNull();
    const quantityTamper = structuredClone(positiveInventoryRuntime);
    quantityTamper.action!.metricBindings[0] = { ...quantityTamper.action!.metricBindings[0], physicalColumn: "QuantityDelta" };
    const quantityTamperPlan = planGovernedMetricQuery(quantityTamper);
    expect(quantityTamperPlan.state, "quantity_binding_changed_after_preflight").toBe("blocked");
    inventoryNegativeProbes.push({ probeId: "quantity_binding_changed_after_preflight", outcome: "blocked_at_planner", blockerCodes: quantityTamperPlan.blockers });
    const operatorTamper = structuredClone(positiveInventoryRuntime);
    operatorTamper.action!.operator = "governed_sum";
    const operatorTamperPlan = planGovernedMetricQuery(operatorTamper);
    expect(operatorTamperPlan.state, "operator_changed_from_snapshot_sum").toBe("blocked");
    inventoryNegativeProbes.push({ probeId: "operator_changed_from_snapshot_sum", outcome: "blocked_at_planner", blockerCodes: operatorTamperPlan.blockers });

    const oracleSupplied = inventoryClone();
    oracleSupplied.sourceEvidence!.inventorySnapshots![0] = { ...oracleSupplied.sourceEvidence!.inventorySnapshots![0], inferred: true } as never;
    blockedInventoryProbe("oracle_truth_supplied_before_execution", oracleSupplied);
    const blockedInventoryPromotion = evaluateInventory(movementSource.canonicalSource);
    expect(blockedInventoryPromotion.actions, "blocked_action_promoted_by_m2").toHaveLength(0);
    inventoryNegativeProbes.push({ probeId: "blocked_action_promoted_by_m2", outcome: "explanation_only", questionStates: blockedInventoryPromotion.questions.candidateQuestions.filter((item) => item.metricId === "inventory_on_hand").map((item) => item.questionState), blockerCodes: blockedInventoryPromotion.questions.candidateQuestions.filter((item) => item.metricId === "inventory_on_hand").flatMap((item) => item.blockers.map((blocker) => blocker.code)) });
    const evidenceTamper = structuredClone(positiveInventoryRuntime);
    evidenceTamper.action!.evidence = evidenceTamper.action!.evidence.filter((item) => item.kind !== "inventory_snapshot");
    evidenceTamper.action!.restrictions = evidenceTamper.action!.restrictions.filter((item) => !item.code.toLowerCase().includes("snapshot") && !item.code.toLowerCase().includes("as_of"));
    evidenceTamper.action!.asOfBasis = null;
    const evidenceTamperPlan = planGovernedMetricQuery(evidenceTamper);
    expect(evidenceTamperPlan.state, "restriction_or_asof_evidence_removed_before_presentation").toBe("blocked");
    inventoryNegativeProbes.push({ probeId: "restriction_or_asof_evidence_removed_before_presentation", outcome: "blocked_at_planner", blockerCodes: evidenceTamperPlan.blockers });

    expect(inventoryNegativeProbes, "required Phase 7R3.7 negative probes").toHaveLength(15);
    fs.writeFileSync("/tmp/phase7r37-negative-probes.json", `${JSON.stringify({ schemaVersion: "lightbi.phase7r37-negative-probes.v1", inventoryNegativeProbes }, null, 2)}\n`);

    const bundles = ["may", "june"].map((period) => {
      const members = loaded.filter((source) => source.spec.period === period && !source.spec.id.startsWith("accounting_"));
      const candidate = generateRelationshipCandidateArtifact({
        schemaVersion: "lightbi.source-bundle-input.v1",
        bundleId: `phase7r35:${period}`,
        members: members.map((source) => ({ physical: source.canonicalSource.physical, semantic: source.canonicalSource.semantic, grainCandidate: source.grainCandidate, grainResolution: source.canonicalSource.grain, rawRows: source.rawRows })),
      });
      return { period, memberIds: members.map((source) => source.spec.id), candidate, resolution: resolveRelationshipShadow(candidate) };
    });
    const continuityMembers = loaded.filter((source) => ["derived.inventory_snapshot_may", "derived.inventory_movements_june"].includes(source.spec.id));
    const continuityCandidate = generateRelationshipCandidateArtifact({
      schemaVersion: "lightbi.source-bundle-input.v1",
      bundleId: "phase7r35:may-to-june-inventory-continuity",
      members: continuityMembers.map((source) => ({ physical: source.canonicalSource.physical, semantic: source.canonicalSource.semantic, grainCandidate: source.grainCandidate, grainResolution: source.canonicalSource.grain, rawRows: source.rawRows })),
    });
    const relationshipRecords = [...bundles, { period: "cross_period", memberIds: continuityMembers.map((source) => source.spec.id), candidate: continuityCandidate, resolution: resolveRelationshipShadow(continuityCandidate) }];

    const probeBase = loaded.find((source) => source.spec.id === "derived.accounting_may_vnd")!;
    const evaluateProbe = (canonicalSource: CanonicalMetricSourceV1) => {
      const evaluationContext = { group: "synthetic", tuningUse: "forbidden" } as const;
      const activation = activateCommerceDistributionDomain({ schemaVersion: "lightbi.domain-activation-input.v1", sources: [canonicalSource], evaluationContext });
      const metricPreflight = preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources: [canonicalSource], metricIds: ["gross_profit"], evaluationContext, expectedPolicyHash: governedMetricPolicyHash() });
      const questions = generateGovernedCommerceQuestionsAndActions({ schemaVersion: "lightbi.question-action-generation-input.v1", canonicalSource, domainActivation: activation, metricPreflight, expectedQuestionPolicyHash: questionActionPolicyHash() });
      return { activation, metricPreflight, metric: metricPreflight.metrics[0], questions, actions: questions.actionCandidates.filter((item) => item.metricId === "gross_profit") };
    };
    const blockedProbe = (probeId: string, canonicalSource: CanonicalMetricSourceV1, expectedBlocker: string) => {
      const result = evaluateProbe(canonicalSource);
      const question = result.questions.candidateQuestions.find((item) => item.metricId === "gross_profit")!;
      const codes = [...result.metric.blockers.map((item) => item.code), ...question.blockers.map((item) => item.code)];
      expect(result.actions, probeId).toHaveLength(0);
      expect(codes.some((code) => code.includes(expectedBlocker)), probeId).toBe(true);
      return { probeId, outcome: "blocked", metricState: result.metric.state, blockerCodes: [...new Set(codes)].sort(), remediation: question.remediation };
    };
    const evidenceInput = probeBase.spec.currencyContract!;
    const currencyEvidence = (overrides: Partial<Parameters<typeof createCanonicalSourceCurrencyEvidence>[0]> = {}) => createCanonicalSourceCurrencyEvidence({
      sourceId: probeBase.canonicalSource.physical.provenance.sourceId,
      sourceHash: { algorithm: "sha256", value: probeBase.spec.sha256 },
      currency: evidenceInput.currency,
      provenance: { kind: "declared_scenario_metadata", reference: evidenceInput.reference, referenceHash: { algorithm: "sha256", value: evidenceInput.referenceHash } },
      scope: "selected_columns",
      applicableMonetaryColumns: evidenceInput.columns,
      reportingPeriod: evidenceInput.period,
      ...overrides,
    });
    const cloneSource = () => structuredClone(probeBase.canonicalSource);
    const negativeProbes: Array<Record<string, unknown>> = [];

    const missingCurrency = cloneSource(); delete missingCurrency.sourceEvidence;
    negativeProbes.push(blockedProbe("missing_currency_evidence", missingCurrency, "currency"));

    const localeCurrency = cloneSource();
    localeCurrency.sourceEvidence = { currency: [{ ...currencyEvidence(), inferred: true, evidenceId: "currency-evidence:locale-derived" } as any] };
    negativeProbes.push(blockedProbe("locale_derived_currency", localeCurrency, "currency"));

    const wrongSourceCurrency = cloneSource();
    wrongSourceCurrency.sourceEvidence = { currency: [currencyEvidence({ sourceId: "another-source#Sheet1" })] };
    negativeProbes.push(blockedProbe("currency_bound_to_another_source", wrongSourceCurrency, "currency"));

    const conflictingCurrency = cloneSource();
    conflictingCurrency.sourceEvidence = { currency: [currencyEvidence(), currencyEvidence({ currency: "USD" })] };
    negativeProbes.push(blockedProbe("conflicting_currencies", conflictingCurrency, "currency"));

    const excludedCostScope = cloneSource();
    excludedCostScope.sourceEvidence = { currency: [currencyEvidence({ applicableMonetaryColumns: ["Revenue_Credit"] })] };
    negativeProbes.push(blockedProbe("currency_scope_excludes_cogs", excludedCostScope, "currency"));

    const beforeEvidence = cloneSource(); delete beforeEvidence.sourceEvidence;
    const beforeEvidenceResult = evaluateProbe(beforeEvidence);
    beforeEvidence.sourceEvidence = { currency: [currencyEvidence()] };
    expect(beforeEvidenceResult.actions, "currency_evidence_attached_after_preflight").toHaveLength(0);
    expect(beforeEvidenceResult.metric.currencyEvidenceIds, "currency_evidence_attached_after_preflight").toHaveLength(0);
    negativeProbes.push({ probeId: "currency_evidence_attached_after_preflight", outcome: "blocked", metricState: beforeEvidenceResult.metric.state, blockerCodes: beforeEvidenceResult.metric.blockers.map((item) => item.code), remediation: beforeEvidenceResult.metric.remediation });

    const repeatedRevenue = cloneSource();
    repeatedRevenue.grain.signature.measureSafety.observations.find((item) => item.physicalColumn === "Revenue_Credit")!.repeatedWithinParent = true;
    negativeProbes.push(blockedProbe("repeated_revenue_inside_identity", repeatedRevenue, "metric_safe_binding_missing:gross_profit_revenue"));

    const repeatedCost = cloneSource();
    repeatedCost.grain.signature.measureSafety.observations.find((item) => item.physicalColumn === "COGS_Debit")!.repeatedWithinParent = true;
    negativeProbes.push(blockedProbe("repeated_cost_inside_identity", repeatedCost, "metric_safe_binding_missing:gross_profit_cost"));

    const missingIdentity = cloneSource(); missingIdentity.grain.signature.identityBasis.selectedCandidateIds = [];
    negativeProbes.push(blockedProbe("missing_governed_identity", missingIdentity, "repeated_or_unresolved_measure_aggregation"));

    const ambiguousRevenue = cloneSource();
    const revenue = ambiguousRevenue.semantic.columns.find((item) => item.physicalColumn === "Revenue_Credit")!;
    ambiguousRevenue.semantic.columns.push({ ...structuredClone(revenue), physicalColumn: "Revenue_Alternative", sourceColumnIndex: 999 });
    ambiguousRevenue.grain.signature.measureSafety.observations.push({ ...structuredClone(ambiguousRevenue.grain.signature.measureSafety.observations.find((item) => item.physicalColumn === "Revenue_Credit")!), physicalColumn: "Revenue_Alternative" });
    negativeProbes.push(blockedProbe("ambiguous_revenue_binding", ambiguousRevenue, "metric_safe_binding_ambiguous:gross_profit_revenue"));

    const incompatiblePeriod = cloneSource(); incompatiblePeriod.grain.signature.temporalMode = { ...incompatiblePeriod.grain.signature.temporalMode, value: "none", state: "confirmed" };
    negativeProbes.push(blockedProbe("incompatible_period", incompatiblePeriod, "metric_time_basis_incompatible_or_missing"));

    const positive = evaluateProbe(cloneSource());
    const positiveAction = positive.actions[0];
    expect(positiveAction, JSON.stringify({ metric: positive.metric, questions: positive.questions.candidateQuestions.filter((item) => item.metricId === "gross_profit") })).toBeTruthy();
    const positiveRuntime = preflightGovernedRuntimeAction({ schemaVersion: "lightbi.governed-runtime-preflight-input.v1", canonicalSource: probeBase.canonicalSource, metricPreflight: positive.metricPreflight, questionGeneration: positive.questions, actionCandidate: positiveAction, expectedRuntimePolicyHash: governedRuntimePolicyHash() });
    expect(positiveRuntime.action, JSON.stringify(positiveRuntime.blockers)).not.toBeNull();
    const tamperedRuntime = structuredClone(positiveRuntime);
    tamperedRuntime.action!.operator = "governed_sum";
    const tamperedPlan = planGovernedMetricQuery(tamperedRuntime);
    expect(tamperedPlan.state, "operator_changed_from_governed_revenue_minus_cost").toBe("blocked");
    negativeProbes.push({ probeId: "operator_changed_from_governed_revenue_minus_cost", outcome: "blocked", blockerCodes: tamperedPlan.blockers });

    const expectedTruthWithoutEvidence = evaluateProbe(missingCurrency);
    expect(expectedTruthWithoutEvidence.actions, "expected_truth_supplied_before_execution").toHaveLength(0);
    negativeProbes.push({ probeId: "expected_truth_supplied_before_execution", outcome: "blocked_before_execution", suppliedExpectedTruth: 3_075_721_244, blockerCodes: expectedTruthWithoutEvidence.metric.blockers.map((item) => item.code), remediation: expectedTruthWithoutEvidence.metric.remediation });

    const blockedPromotion = evaluateProbe(repeatedCost);
    expect(blockedPromotion.actions, "blocked_action_promoted_by_m2").toHaveLength(0);
    negativeProbes.push({ probeId: "blocked_action_promoted_by_m2", outcome: "explanation_only", questionState: blockedPromotion.questions.candidateQuestions[0]?.questionState, blockerCodes: blockedPromotion.questions.candidateQuestions[0]?.blockers.map((item) => item.code), remediation: blockedPromotion.questions.candidateQuestions[0]?.remediation });

    const explanation = evaluateProbe(missingCurrency).questions.candidateQuestions.find((item) => item.metricId === "gross_profit")!;
    expect(explanation.blockers.length, "blocker_without_remediation").toBeGreaterThan(0);
    expect(explanation.evidence.length, "blocker_without_remediation").toBeGreaterThan(0);
    expect(explanation.limitations.length, "blocker_without_remediation").toBeGreaterThan(0);
    expect(explanation.remediation.length, "blocker_without_remediation").toBeGreaterThan(0);
    negativeProbes.push({ probeId: "blocker_without_remediation", outcome: "explanation_complete", blockerCodes: explanation.blockers.map((item) => item.code), evidenceCount: explanation.evidence.length, limitationCount: explanation.limitations.length, remediation: explanation.remediation });
    expect(negativeProbes, "required negative probe count").toHaveLength(15);
    fs.writeFileSync("/tmp/phase7r36-negative-probes.json", `${JSON.stringify({ schemaVersion: "lightbi.phase7r36-negative-probes.v1", negativeProbes }, null, 2)}\n`);

    // Expected values and release eligibility are loaded only after every governed execution above has completed.
    const oracle = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/architecture/phase-7r34-independent-oracle-results.json"), "utf8")) as any;
    const manifest = JSON.parse(fs.readFileSync(path.join(CORPUS, "corpus-manifest.json"), "utf8")) as any;
    const comparisons: Array<Record<string, unknown>> = [];
    for (const record of sourceRecords) {
      const source = record.source as ReturnType<typeof compactSource>;
      if (!source.targetMetric || !source.period) continue;
      const expected = source.targetMetric === "sales_revenue" ? oracle.periods[source.period].metrics.revenue
        : source.targetMetric === "delivery_count" ? oracle.periods[source.period].metrics.deliveryCount
        : source.targetMetric === "gross_profit" ? oracle.periods[source.period].metrics.grossProfit
        : oracle.periods[source.period].metrics.inventoryOnHand;
      const targetActions = (record.actions as any[]).filter((action) => action.candidate.metricId === source.targetMetric);
      comparisons.push({
        sourceId: source.id,
        period: source.period,
        metricId: source.targetMetric,
        expected,
        actionCount: targetActions.length,
        actions: targetActions.map((action) => ({
          questionId: action.candidate.questionId,
          runtimeState: action.runtime.state,
          runtimeBlockers: action.runtime.blockers,
          planningState: action.planning.state,
          operator: action.planning.plan?.operator ?? null,
          metricBindings: action.planning.plan?.metricBindings ?? [],
          groupingBindings: action.planning.plan?.groupingBindings ?? [],
          timeBinding: action.planning.plan?.timeBinding ?? null,
          asOfBasis: action.planning.plan?.asOfBasis ?? null,
          status: action.execution?.status ?? "not_executed",
          actual: action.execution?.groundTruthComparison.actual ?? null,
          exactMatch: action.execution?.groundTruthComparison.actual === expected,
          visibleRows: action.execution?.rowCount ?? 0,
          decisionUseAuthorized: action.execution?.decisionUseAuthorized ?? false,
          productionWiring: action.execution?.productionWiring ?? { executed: false },
        })),
      });
    }

    const inventoryComparisons = comparisons.filter((item) => item.metricId === "inventory_on_hand").map((comparison: any) => {
      const expectedPerItem = oracle.periods[comparison.period].metrics.perItemInventoryBalances as Record<string, number>;
      const expectedDetailed = oracle.periods[comparison.period].metrics.itemWarehouseInventoryBalances as Array<{ itemId: string; warehouseId: string; asOfDate: string; uom: string; quantityOnHand: number }>;
      const sourceRecord = sourceRecords.find((record) => (record.source as any).id === comparison.sourceId)!;
      const grouped = (sourceRecord.actions as any[]).find((action) => action.candidate.questionId === "commerce.inventory_on_hand.by_product")?.execution;
      const visible = (grouped?.rows ?? []) as Record<string, unknown>[];
      const matchedVisible = visible.filter((row) => {
        const key = String(row.sku ?? row.product ?? "");
        return key in expectedPerItem && Number(row.inventory_on_hand) === expectedPerItem[key];
      }).length;
      const detailed = (sourceRecord.actions as any[]).find((action) => action.candidate.questionId === "commerce.inventory_on_hand.by_item_warehouse")?.execution;
      const governedRows = (detailed?.rows ?? []) as Record<string, unknown>[];
      const expectedByKey = new Map(expectedDetailed.map((row) => [`${row.itemId}\u0000${row.warehouseId}\u0000${row.asOfDate}`, row]));
      const governedKeys = governedRows.map((row) => `${String(row.sku)}\u0000${String(row.warehouse)}\u0000${String(row.time_period)}`);
      const governedKeySet = new Set(governedKeys);
      const duplicateIdentityCount = governedKeys.length - governedKeySet.size;
      const missingKeys = [...expectedByKey.keys()].filter((key) => !governedKeySet.has(key));
      const unexpectedKeys = [...governedKeySet].filter((key) => !expectedByKey.has(key));
      const quantityMismatches = governedRows.filter((row) => {
        const expectedRow = expectedByKey.get(`${String(row.sku)}\u0000${String(row.warehouse)}\u0000${String(row.time_period)}`);
        return !expectedRow || Number(row.inventory_on_hand) !== expectedRow.quantityOnHand;
      });
      const governedTotal = governedRows.reduce((sum, row) => sum + Number(row.inventory_on_hand), 0);
      const expectedTotal = expectedDetailed.reduce((sum, row) => sum + row.quantityOnHand, 0);
      return {
        sourceId: comparison.sourceId,
        expectedPerItemCount: Object.keys(expectedPerItem).length,
        governedVisiblePerItemCount: visible.length,
        matchedVisiblePerItem: matchedVisible,
        fullPerItemCoverage: visible.length === Object.keys(expectedPerItem).length && matchedVisible === visible.length,
        itemWarehouseOracleAvailable: true,
        expectedItemWarehouseCount: expectedDetailed.length,
        governedItemWarehouseCount: governedRows.length,
        missingKeyCount: missingKeys.length,
        unexpectedKeyCount: unexpectedKeys.length,
        quantityMismatchCount: quantityMismatches.length,
        duplicateIdentityCount,
        governedGroupedTotal: governedTotal,
        expectedGroupedTotal: expectedTotal,
        globalTotalMatchesGroupedBalances: governedTotal === expectedTotal && expectedTotal === comparison.expected,
        itemWarehouseBalanceComparisonComplete: governedRows.length === expectedDetailed.length
          && missingKeys.length === 0
          && unexpectedKeys.length === 0
          && quantityMismatches.length === 0
          && duplicateIdentityCount === 0
          && governedTotal === expectedTotal,
      };
    });

    const observation = {
      schemaVersion: "lightbi.phase7r35-engine-observation.v1",
      evidenceType: "repository_fixture_anchored_semi_synthetic_evidence",
      inputIsolation: {
        sourceContractsLoadedBeforeExecution: ["authentic-anchors.json", "generation-provenance.json", "scenario-contract.json"],
        expectedTruthLoadedAfterAllExecution: ["phase-7r34-independent-oracle-results.json", "corpus-manifest.json"],
        executionGroundTruthState: "unavailable",
        oraclePassedToEngine: false,
        manifestTruthPassedToEngine: false,
      },
      sourceRecords,
      relationshipRecords,
      postExecutionComparison: { comparisons, inventoryComparisons, expectedRelationshipContracts: manifest.expectedRelationships },
    };
    fs.writeFileSync("/tmp/phase7r35-engine-observation.json", `${JSON.stringify(observation, null, 2)}\n`);

    expect(sourceRecords).toHaveLength(12);
    expect(sourceRecords.every((record) => (record.activation as any).productionWiring.executed === false)).toBe(true);
    expect(sourceRecords.flatMap((record) => record.actions as any[]).every((action) => action.execution?.decisionUseAuthorized !== true && action.execution?.productionWiring.executed !== true)).toBe(true);
    expect(comparisons).toHaveLength(8);
    expect(inventoryComparisons.every((comparison) => comparison.itemWarehouseBalanceComparisonComplete), JSON.stringify(inventoryComparisons)).toBe(true);
  }, 180_000);
});
