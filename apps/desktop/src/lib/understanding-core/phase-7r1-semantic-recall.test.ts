import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "../semantic-registry";
import { questionActionPolicyHash } from "./commerce-distribution-question-policy";
import { aggregateContextualEvidence } from "./contextual-evidence-aggregator";
import { governedMetricPolicyHash } from "./governed-metric-policy";
import { governedRuntimePolicyHash } from "./governed-runtime-policy";
import { generateGrainCandidateArtifact } from "./grain-candidate-engine";
import { resolveGrainSignatureShadow } from "./grain-resolver";
import { validateGrainResolution } from "./grain-resolution-validation";
import { profilePhysicalSource } from "./profiler";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { resolveSemanticShadow } from "./semantic-resolver";

type Group = "golden" | "holdout" | "adversarial" | "multi_file";
type MappingTruth = { physicalColumn: string; canonicalSignal: string; allowedFinalStates?: string[] };
type SourceTruth = { path: string; sheet: string; sha256: string };
type SampleTruth = {
  id: string;
  group: Group;
  provenance: { tuningUse: "allowed" | "forbidden" };
  sources: SourceTruth[];
  recognition: {
    requiredMappings: MappingTruth[];
    forbiddenMappings: MappingTruth[];
  };
};
type Manifest = { corpusVersion: string; groundTruthFiles: Array<{ path: string }> };

const ROOT = path.resolve(__dirname, "../../../../..");
const CORE_SIGNALS = new Set([
  "order",
  "time_period",
  "revenue",
  "product",
  "quantity",
  "sold_qty",
  "stock_qty",
  "shipment",
  "delivery_status",
  "total_cost",
]);
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "sample-corpus/versions/1.4.0/manifest.json"), "utf8")) as Manifest;
const samples = manifest.groundTruthFiles.flatMap((entry) =>
  (JSON.parse(fs.readFileSync(path.join(ROOT, entry.path), "utf8")) as { samples: SampleTruth[] }).samples,
);

function resolveRows(sourceId: string, rows: unknown[][]) {
  const physical = profilePhysicalSource({
    schemaVersion: "lightbi.physical-source-input.v1",
    source: { sourceId, kind: "unknown", label: "generic-fixture", hash: { algorithm: "sha256", value: createHash("sha256").update(JSON.stringify(rows)).digest("hex") } },
    rawRows: rows,
  });
  const candidates = generateSemanticCandidateArtifact(physical, { registry: SEMANTIC_SIGNAL_REGISTRY_V1 });
  const context = aggregateContextualEvidence(physical, candidates);
  return { physical, candidates, context, semantic: resolveSemanticShadow(physical, candidates, context) };
}

function loadSource(sampleId: string, source: SourceTruth) {
  const file = path.join(ROOT, source.path);
  if (!fs.existsSync(file)) throw new Error(`PHASE_7R1_REQUIRED_SOURCE_MISSING:${source.path}`);
  const bytes = fs.readFileSync(file);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(source.sha256);
  const workbook = XLSX.read(bytes, { raw: true });
  const sheet = workbook.Sheets[source.sheet] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`PHASE_7R1_REQUIRED_SHEET_MISSING:${source.path}#${source.sheet}`);
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "", blankrows: true });
  return { ...resolveRows(`${sampleId}:${source.path}#${source.sheet}`, rows), rows };
}

function traceSummary(entry: ReturnType<typeof resolveRows>, physicalColumn: string) {
  const candidate = entry.candidates.observations.find((item) => item.physicalColumn === physicalColumn);
  const resolution = entry.semantic.columns.find((item) => item.physicalColumn === physicalColumn);
  return {
    producedCandidates: candidate?.candidateSet.candidates.map((item) => item.candidateId) ?? [],
    finalState: resolution?.finalState ?? "missing_column",
    selectedCandidateId: resolution?.selectedCandidateId ?? null,
    ruleIds: resolution?.ruleIds ?? [],
    traces: resolution?.candidateTraces.map((item) => ({
      candidateId: item.candidateId,
      disposition: item.disposition,
      lexicalClass: item.lexicalClass,
      supportFamilies: item.independence.independentSupportFamilies,
      contextFamilies: item.independence.independentContextFamilies,
      conflictCodes: item.materialConflictCodes,
      dominance: item.dominance,
      evidence: item.completeEvidenceProfile.supportingEvidence.map((evidence) => ({
        type: evidence.type,
        source: evidence.source,
        code: evidence.explanationCode,
      })),
    })) ?? [],
  };
}

function resolvedColumn(entry: ReturnType<typeof resolveRows>, physicalColumn: string) {
  const column = entry.semantic.columns.find((item) => item.physicalColumn === physicalColumn);
  if (!column) throw new Error(`PHASE_7R1_FIXTURE_COLUMN_MISSING:${physicalColumn}`);
  return column;
}

function selected(entry: ReturnType<typeof resolveRows>, physicalColumn: string, signal: string) {
  const column = resolvedColumn(entry, physicalColumn);
  const diagnostic = JSON.stringify(traceSummary(entry, physicalColumn));
  expect(["probable", "confirmed"], diagnostic).toContain(column.finalState);
  expect(column.selectedCandidateId, diagnostic).toBe(signal);
}

describe.sequential("Phase 7R1 core signal recall remediation", () => {
  it("audits the unchanged holdout core-signal denominator and emits complete miss traces", () => {
    let required = 0;
    let found = 0;
    const misses: Array<Record<string, unknown>> = [];
    for (const sample of samples.filter((item) => item.group === "holdout")) {
      const loaded = sample.sources.map((source) => loadSource(sample.id, source));
      for (const truth of sample.recognition.requiredMappings.filter((mapping) => CORE_SIGNALS.has(mapping.canonicalSignal))) {
        required += 1;
        const entry = loaded.find((artifact) => artifact.physical.sourceProfile.columns.some((column) => column.physicalColumnName === truth.physicalColumn));
        const summary = entry ? traceSummary(entry, truth.physicalColumn) : null;
        const matched = summary != null
          && summary.selectedCandidateId === truth.canonicalSignal
          && (truth.allowedFinalStates ?? ["probable", "confirmed"]).includes(summary.finalState);
        if (matched) found += 1;
        else misses.push({ sampleId: sample.id, physicalColumn: truth.physicalColumn, expectedSignal: truth.canonicalSignal, ...summary });
      }
    }
    const observation = { corpusVersion: manifest.corpusVersion, required, found, recall: required ? found / required : null, misses };
    if (process.env.LIGHTBI_WRITE_PHASE7R1_OBSERVATION === "1") {
      fs.writeFileSync("/tmp/phase7r1-semantic-observation.json", `${JSON.stringify(observation, null, 2)}\n`);
    }
    expect(required).toBe(22);
    expect(found).toBeGreaterThanOrEqual(20);
  }, 180_000);

  it("recognizes generic date suffixes and accounting measure heads with independent physical evidence", () => {
    const artifact = resolveRows("generic-semantic-heads", [
      ["PostingDate", "COGS_Credit"],
      ["2026-01-01", 125],
      ["2026-01-02", 90],
    ]);
    selected(artifact, "PostingDate", "time_period");
    selected(artifact, "COGS_Credit", "total_cost");
  });

  it("does not promote unsupported date words or accounting qualifiers", () => {
    const artifact = resolveRows("negative-semantic-heads", [
      ["Candidate", "Debit Account"],
      ["Alice", "1000"],
      ["Bob", "2000"],
    ]);
    expect(resolvedColumn(artifact, "Candidate").selectedCandidateId).not.toBe("time_period");
    expect(resolvedColumn(artifact, "Debit Account").selectedCandidateId).not.toBe("total_cost");
  });

  it("keeps the generic quantity collision uncertain without relabeling stock quantity", () => {
    const artifact = resolveRows("quantity-specificity", [
      ["Quantity", "Stock Quantity"],
      [2, 10],
      [4, 12],
    ]);
    expect(resolvedColumn(artifact, "Quantity").finalState).toBe("ambiguous");
    expect(resolvedColumn(artifact, "Quantity").selectedCandidateId).toBeNull();
    const stock = resolvedColumn(artifact, "Stock Quantity");
    expect(stock.selectedCandidateId).not.toBe("quantity");
    expect(["ambiguous", "probable", "confirmed"]).toContain(stock.finalState);
  });

  it("recognizes generic shipment document references without matching unrelated documents", () => {
    const positive = resolveRows("shipment-reference-positive", [["Consignment Note ID"], [10001], [10002]]);
    selected(positive, "Consignment Note ID", "shipment");
    const negative = resolveRows("shipment-reference-negative", [["Receipt Note ID"], [10001], [10002]]);
    expect(resolvedColumn(negative, "Receipt Note ID").selectedCandidateId).not.toBe("shipment");
    const collision = resolveRows("shipment-reference-collision", [["Shipment Status"], ["Pending"], ["Delivered"]]);
    expect(resolvedColumn(collision, "Shipment Status").selectedCandidateId).not.toBe("shipment");
  });

  it("keeps identifier and business-measure collisions conservative", () => {
    const artifact = resolveRows("identifier-measure", [
      ["Order", "Order Amount"],
      ["SO-1", 100],
      ["SO-2", 200],
    ]);
    selected(artifact, "Order", "order");
    expect(resolvedColumn(artifact, "Order Amount").selectedCandidateId).not.toBe("order");
  });

  it("separates stock status from threshold values and retains collision uncertainty", () => {
    const artifact = resolveRows("status-threshold", [
      ["Stock Status", "Stock Threshold", "Threshold Status"],
      ["Low stock", "30 days", "30"],
      ["In stock", "60 days", "60"],
    ]);
    expect(resolvedColumn(artifact, "Stock Status").selectedCandidateId).not.toBe("stock_threshold");
    selected(artifact, "Stock Threshold", "stock_threshold");
    expect(resolvedColumn(artifact, "Threshold Status").selectedCandidateId).toBeNull();
  });

  it("preserves the corpus stock-threshold contract without a status false positive", () => {
    const sample = samples.find((item) => item.id === "inv.provincial_aging_20241228");
    if (!sample) throw new Error("PHASE_7R1_REQUIRED_CORPUS_CASE_MISSING:inv.provincial_aging_20241228");
    const artifact = loadSource(sample.id, sample.sources[0]);
    const diagnostic = JSON.stringify(traceSummary(artifact, "Ngưỡng tồn"));
    expect(resolvedColumn(artifact, "Ngưỡng tồn").selectedCandidateId, diagnostic).toBe("stock_threshold");
  }, 60_000);

  it("keeps a specific date-role collision ambiguous instead of forcing the generic period", () => {
    const artifact = resolveRows("date-role-collision", [
      ["Due Date"],
      ["2026-01-01"],
      ["2026-02-01"],
    ]);
    const column = resolvedColumn(artifact, "Due Date");
    expect(column.finalState).toBe("ambiguous");
    expect(column.selectedCandidateId).toBeNull();
  });

  it("does not manufacture certainty for generic currency or UOM surfaces", () => {
    const artifact = resolveRows("currency-uom-collision", [
      ["Unit", "Code"],
      ["USD", "A"],
      ["kg", "B"],
    ]);
    expect(["unknown", "ambiguous"]).toContain(resolvedColumn(artifact, "Unit").finalState);
    expect(["unknown", "ambiguous"]).toContain(resolvedColumn(artifact, "Code").finalState);
  });

  it("does not use neighbor evidence alone and leaves unknown columns unknown", () => {
    const artifact = resolveRows("neighbor-insufficient", [
      ["Revenue", "Mystery Value"],
      [100, "alpha"],
      [200, "beta"],
    ]);
    selected(artifact, "Revenue", "revenue");
    expect(resolvedColumn(artifact, "Mystery Value").finalState).toBe("unknown");
    expect(resolvedColumn(artifact, "Mystery Value").selectedCandidateId).toBeNull();
  });

  it("is invariant to physical input-column order", () => {
    const left = resolveRows("order-left", [["Quantity", "InvoiceDate"], [2, "2026-01-01"], [3, "2026-01-02"]]);
    const right = resolveRows("order-right", [["InvoiceDate", "Quantity"], ["2026-01-01", 2], ["2026-01-02", 3]]);
    const projection = (artifact: ReturnType<typeof resolveRows>) => Object.fromEntries(
      artifact.semantic.columns.map((column) => [column.physicalColumn, { state: column.finalState, signal: column.selectedCandidateId }]),
    );
    expect(projection(left)).toEqual(projection(right));
  });

  it("contains no filename, sample identity, hash, row-count, or expected-answer rule", () => {
    const productionFiles = [
      "src/lib/semantic-registry.ts",
      "src/lib/understanding-core/semantic-candidate-engine.ts",
      "src/lib/understanding-core/semantic-resolver.ts",
      "src/lib/understanding-core/contextual-evidence-aggregator.ts",
    ];
    const prohibited = ["superstore", "accounting_june", "provincial_aging", "hublan", "sampleId", "sourceHash.value", "expectedSignal"];
    for (const file of productionFiles) {
      const source = fs.readFileSync(path.join(ROOT, "apps/desktop", file), "utf8");
      for (const token of prohibited) expect(source).not.toContain(token);
    }
  });

  it("introduces no confident forbidden mapping across the unchanged corpus", () => {
    const violations: Array<Record<string, unknown>> = [];
    for (const sample of samples) {
      const loaded = sample.sources.map((source) => loadSource(sample.id, source));
      for (const truth of sample.recognition.forbiddenMappings) {
        const entry = loaded.find((artifact) => artifact.physical.sourceProfile.columns.some((column) => column.physicalColumnName === truth.physicalColumn));
        if (!entry) continue;
        const column = resolvedColumn(entry, truth.physicalColumn);
        if (["probable", "confirmed"].includes(column.finalState) && column.selectedCandidateId === truth.canonicalSignal) {
          violations.push({ sampleId: sample.id, ...truth, finalState: column.finalState });
        }
      }
    }
    expect(violations).toEqual([]);
  }, 240_000);

  it("does not increase grain certainty without direct mechanical evidence", () => {
    const violations: Array<Record<string, unknown>> = [];
    for (const sample of samples) {
      for (const source of sample.sources.map((entry) => loadSource(sample.id, entry))) {
        const candidate = generateGrainCandidateArtifact(source.physical, source.semantic, source.rows);
        const resolution = resolveGrainSignatureShadow(candidate, { sourceId: candidate.sourceId, sourceHash: candidate.sourceHash });
        const validation = validateGrainResolution(candidate, resolution);
        if (validation.forbiddenCertaintyViolations.length > 0) {
          violations.push({ sampleId: sample.id, sourceId: source.physical.sourceProfile.source.sourceId, violations: validation.forbiddenCertaintyViolations });
        }
      }
    }
    expect(violations).toEqual([]);
  }, 240_000);

  it("does not mutate downstream metric, question, or runtime policies", () => {
    expect(governedMetricPolicyHash()).toBe("79b00e4aa7e97311da56db1f19a996c52c8034dc52da21b0dc6981dfd1282702");
    expect(questionActionPolicyHash()).toBe("cc32c28851557fedb41ea87d9b873a1941b3808140d7f7608a6363170bd68b4e");
    expect(governedRuntimePolicyHash()).toBe("9b5ef8acc2d6761b428b41713c4e0d87a9db3bb9c79d251e51026057d0ea00b4");
  });
});
