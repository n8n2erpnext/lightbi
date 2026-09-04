import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { createRequire } from "node:module";
import { aggregateContextualEvidence } from "../../apps/desktop/src/lib/understanding-core/contextual-evidence-aggregator";
import type { CandidateAbsenceDebtV1 } from "../../apps/desktop/src/lib/understanding-core/contextual-evidence-contracts";
import { profilePhysicalSource } from "../../apps/desktop/src/lib/understanding-core/profiler";
import { generateSemanticCandidateArtifact } from "../../apps/desktop/src/lib/understanding-core/semantic-candidate-engine";
import { resolveSemanticShadow } from "../../apps/desktop/src/lib/understanding-core/semantic-resolver";
import type { CandidateArtifactV1, ColumnObservationV1 } from "../../apps/desktop/src/lib/understanding-core/semantic-candidate-contracts";
import type { DatasetUnderstandingArtifactV1 } from "../../apps/desktop/src/lib/understanding-core/profiling-contracts";
import type { CompiledMicroBrainIndexV1 } from "../../apps/desktop/src/lib/understanding-core/micro-brain/contracts";
import { retrieveMicroBrainConcepts } from "../../apps/desktop/src/lib/understanding-core/micro-brain/retrieval";
import {
  buildMicroBrainQuerySignature,
  microBrainShadowInvocationReason,
} from "../../apps/desktop/src/lib/understanding-core/micro-brain/query-signature";

const ROOT = process.cwd();
const desktopRequire = createRequire(path.join(ROOT, "apps/desktop/package.json"));
const XLSX = desktopRequire("xlsx") as any;
const INDEX_PATH = path.join(ROOT, "apps/desktop/src/lib/understanding-core/micro-brain/compiled/foundation.index.v1.json");
const MANIFEST_PATH = path.join(ROOT, "sample-corpus/versions/1.4.0/manifest.json");
const RUNS = Number(process.env.MICRO_BRAIN_BENCH_RUNS ?? 5);
const WARMUPS = Number(process.env.MICRO_BRAIN_BENCH_WARMUPS ?? 1);

type Mode = "baseline" | "brain_all" | "brain_selective";
type SourceRef = { path: string; sheet: string; sha256: string };
type Mapping = { physicalColumn: string; canonicalSignal: string };
type AmbiguousMapping = { physicalColumn: string; candidateSignals: string[] };
type Sample = {
  id: string;
  group: "golden" | "holdout" | "adversarial" | "multi_file";
  sources: SourceRef[];
  recognition: { requiredMappings: Mapping[]; expectedAmbiguousMappings: AmbiguousMapping[] };
};
type PreparedSource = {
  ref: SourceRef;
  physical: DatasetUnderstandingArtifactV1;
};

type RunResult = {
  elapsedMs: number;
  queryCount: number;
  queryDurationsMs: number[];
  invocationReasons: Record<string, number>;
  resolutionDigest: string;
};

function readSamples(): Sample[] {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
    groundTruthFiles: Array<{ path: string }>;
  };
  return manifest.groundTruthFiles.flatMap((entry) => {
    const document = JSON.parse(fs.readFileSync(path.join(ROOT, entry.path), "utf8")) as { samples: Sample[] };
    return document.samples;
  });
}

function sourceKey(ref: SourceRef): string {
  return `${ref.path}#${ref.sheet}`;
}

function prepareSource(ref: SourceRef): PreparedSource {
  const bytes = fs.readFileSync(path.join(ROOT, ref.path));
  const actualHash = crypto.createHash("sha256").update(bytes).digest("hex");
  if (actualHash !== ref.sha256) throw new Error(`source hash mismatch: ${ref.path}`);
  const workbook = XLSX.read(bytes, { raw: true });
  const sheet = workbook.Sheets[ref.sheet] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`missing sheet ${ref.path}#${ref.sheet}`);
  const physical = profilePhysicalSource({
    schemaVersion: "lightbi.physical-source-input.v1",
    source: {
      sourceId: sourceKey(ref),
      kind: "local_file",
      label: path.basename(ref.path),
      hash: { algorithm: "sha256", value: ref.sha256 },
    },
    rawRows: XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "", blankrows: true }) as unknown[][],
  });
  return { ref, physical };
}

function prepareSources(samples: Sample[]): Map<string, PreparedSource> {
  const refs = new Map<string, SourceRef>();
  for (const sample of samples) for (const ref of sample.sources) refs.set(sourceKey(ref), ref);
  return new Map([...refs].map(([key, ref]) => [key, prepareSource(ref)]));
}
function candidateArtifacts(sample: Sample, sources: Map<string, PreparedSource>): Array<{
  prepared: PreparedSource;
  candidate: CandidateArtifactV1;
}> {
  return sample.sources.map((ref) => {
    const prepared = sources.get(sourceKey(ref));
    if (!prepared) throw new Error(`prepared source missing: ${sourceKey(ref)}`);
    return { prepared, candidate: generateSemanticCandidateArtifact(prepared.physical) };
  });
}

function candidateIdsForColumn(
  artifacts: Array<{ candidate: CandidateArtifactV1 }>,
  physicalColumn: string,
): Set<string> {
  return new Set(artifacts.flatMap(({ candidate }) => candidate.observations
    .filter((observation) => observation.physicalColumn === physicalColumn)
    .flatMap((observation) => observation.candidateSet.candidates.map((candidate) => candidate.candidateId))));
}

function absenceDebts(
  sample: Sample,
  artifacts: Array<{ candidate: CandidateArtifactV1 }>,
): CandidateAbsenceDebtV1[] {
  const result: CandidateAbsenceDebtV1[] = [];
  for (const mapping of sample.recognition.requiredMappings) {
    if (!candidateIdsForColumn(artifacts, mapping.physicalColumn).has(mapping.canonicalSignal)) {
      result.push({
        physicalColumn: `${sample.id}:${mapping.physicalColumn}`,
        candidateId: mapping.canonicalSignal,
        reasonCode: "required_candidate_absent",
      });
    }
  }
  for (const mapping of sample.recognition.expectedAmbiguousMappings) {
    const ids = candidateIdsForColumn(artifacts, mapping.physicalColumn);
    for (const candidateId of mapping.candidateSignals) {
      if (!ids.has(candidateId)) {
        result.push({
          physicalColumn: `${sample.id}:${mapping.physicalColumn}`,
          candidateId,
          reasonCode: "contextual_candidate_absent",
        });
      }
    }
  }
  return result;
}

function columnProfile(prepared: PreparedSource, physicalColumn: string) {
  return prepared.physical.sourceProfile.columns.find((column) => column.physicalColumnName === physicalColumn) ?? null;
}

function observationFor(candidate: CandidateArtifactV1, physicalColumn: string): ColumnObservationV1 | null {
  return candidate.observations.find((observation) => observation.physicalColumn === physicalColumn) ?? null;
}
function runSemanticPass(
  mode: Mode,
  _samples: Sample[],
  sources: Map<string, PreparedSource>,
  index: CompiledMicroBrainIndexV1 | null,
): RunResult {
  const started = performance.now();
  let queryCount = 0;
  const queryDurationsMs: number[] = [];
  const invocationReasons: Record<string, number> = {};
  const digestRows: string[] = [];

  for (const prepared of sources.values()) {
    const candidate = generateSemanticCandidateArtifact(prepared.physical);
    if (mode !== "baseline") {
      if (!index) throw new Error(`index required for ${mode}`);
      for (const observation of candidate.observations) {
        const column = columnProfile(prepared, observation.physicalColumn);
        if (!column) continue;
        const reason = mode === "brain_all"
          ? "all_columns_benchmark"
          : microBrainShadowInvocationReason(observation);
        if (!reason) continue;
        const signature = buildMicroBrainQuerySignature(prepared.physical.sourceProfile, column);
        const queryStarted = performance.now();
        retrieveMicroBrainConcepts(index, signature.query);
        queryDurationsMs.push(performance.now() - queryStarted);
        queryCount += 1;
        invocationReasons[reason] = (invocationReasons[reason] ?? 0) + 1;
      }
    }

    const contextual = aggregateContextualEvidence(prepared.physical, candidate);
    const resolution = resolveSemanticShadow(prepared.physical, candidate, contextual);
    for (const column of resolution.columns) {
      digestRows.push([
        prepared.physical.sourceProfile.source.sourceId,
        column.physicalColumn,
        column.finalState,
        column.selectedCandidateId ?? "",
      ].join("|"));
    }
  }

  digestRows.sort();
  return {
    elapsedMs: performance.now() - started,
    queryCount,
    queryDurationsMs,
    invocationReasons,
    resolutionDigest: crypto.createHash("sha256").update(digestRows.join("\n")).digest("hex"),
  };
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(percentileValue * sorted.length) - 1));
  return sorted[index];
}
function brainSignalsForColumn(
  index: CompiledMicroBrainIndexV1,
  artifacts: Array<{ prepared: PreparedSource; candidate: CandidateArtifactV1 }>,
  physicalColumn: string,
): Set<string> {
  const signals = new Set<string>();
  for (const { prepared } of artifacts) {
    const column = columnProfile(prepared, physicalColumn);
    if (!column) continue;
    const signature = buildMicroBrainQuerySignature(prepared.physical.sourceProfile, column, { limit: 8 });
    const result = retrieveMicroBrainConcepts(index, signature.query);
    for (const hit of result.hits) if (hit.canonicalSignal) signals.add(hit.canonicalSignal);
  }
  return signals;
}

function evaluateGovernedRecall(
  index: CompiledMicroBrainIndexV1,
  samples: Sample[],
  sources: Map<string, PreparedSource>,
) {
  let requiredTotal = 0;
  let requiredBaseline = 0;
  let requiredBrain = 0;
  let requiredUnion = 0;
  let ambiguousTotal = 0;
  let ambiguousBaseline = 0;
  let ambiguousBrain = 0;
  let ambiguousUnion = 0;
  const recoveredRequired: Array<{ sampleId: string; physicalColumn: string; canonicalSignal: string }> = [];
  const recoveredAmbiguous: Array<{ sampleId: string; physicalColumn: string; canonicalSignal: string }> = [];

  for (const sample of samples) {
    const artifacts = candidateArtifacts(sample, sources);
    for (const mapping of sample.recognition.requiredMappings) {
      requiredTotal += 1;
      const baseline = candidateIdsForColumn(artifacts, mapping.physicalColumn).has(mapping.canonicalSignal);
      const brain = brainSignalsForColumn(index, artifacts, mapping.physicalColumn).has(mapping.canonicalSignal);
      if (baseline) requiredBaseline += 1;
      if (brain) requiredBrain += 1;
      if (baseline || brain) requiredUnion += 1;
      if (!baseline && brain) recoveredRequired.push({ sampleId: sample.id, ...mapping });
    }
    for (const mapping of sample.recognition.expectedAmbiguousMappings) {
      const baselineIds = candidateIdsForColumn(artifacts, mapping.physicalColumn);
      const brainIds = brainSignalsForColumn(index, artifacts, mapping.physicalColumn);
      for (const canonicalSignal of mapping.candidateSignals) {
        ambiguousTotal += 1;
        const baseline = baselineIds.has(canonicalSignal);
        const brain = brainIds.has(canonicalSignal);
        if (baseline) ambiguousBaseline += 1;
        if (brain) ambiguousBrain += 1;
        if (baseline || brain) ambiguousUnion += 1;
        if (!baseline && brain) recoveredAmbiguous.push({ sampleId: sample.id, physicalColumn: mapping.physicalColumn, canonicalSignal });
      }
    }
  }

  return {
    required: { total: requiredTotal, baseline: requiredBaseline, brainTop8: requiredBrain, union: requiredUnion, recovered: recoveredRequired },
    ambiguous: { total: ambiguousTotal, baseline: ambiguousBaseline, brainTop8: ambiguousBrain, union: ambiguousUnion, recovered: recoveredAmbiguous },
  };
}
const FOUNDATION_PROBES = [
  { query: "buffer inventory maintained against supplier and demand uncertainty", expected: "concept.safety_stock" },
  { query: "inventory trigger threshold combining lead time demand and buffer", expected: "concept.reorder_point" },
  { query: "cash received now to settle old customer invoices", expected: "concept.cash_receipt" },
  { query: "units routed back for correction instead of being discarded", expected: "concept.rework_quantity" },
  { query: "cumulative equipment counter reading from odometer or runtime meter", expected: "concept.meter_reading" },
  { query: "individual apartment or rentable room inside a managed building", expected: "concept.space_unit" },
  { query: "water applied to a farm plot during a growing cycle", expected: "concept.irrigation" },
  { query: "quality inspection batch evaluated pass fail hold", expected: "concept.inspection_lot" },
  { query: "monthly normalized recurring subscription revenue", expected: "concept.mrr" },
  { query: "amount owed by customers at a stated month end", expected: "concept.accounts_receivable" },
] as const;

const SAFETY_PROBES = [
  { query: "cash on delivery amount collected by courier for merchant", expected: "concept.cod_amount", forbiddenTop1: "concept.revenue" },
  { query: "current warehouse inventory carrying value as of closing date", expected: "concept.inventory_value", forbiddenTop1: "concept.cost_of_goods_sold" },
  { query: "money transferred into bank account from another own account", expected: "concept.bank_inflow", forbiddenTop1: "concept.revenue" },
  { query: "customer balance still owed at month end", expected: "concept.accounts_receivable", forbiddenTop1: "concept.revenue" },
  { query: "selling price per piece for one item", expected: "concept.unit_price", forbiddenTop1: "concept.revenue" },
] as const;

function evaluateFoundationProbes(index: CompiledMicroBrainIndexV1) {
  const details = FOUNDATION_PROBES.map((probe) => {
    const hits = retrieveMicroBrainConcepts(index, { text: probe.query, limit: 5 }).hits.map((hit) => hit.conceptId);
    return { ...probe, hits, passed: hits.includes(probe.expected) };
  });
  return { passed: details.filter((item) => item.passed).length, total: details.length, details };
}

function evaluateSafetyProbes(index: CompiledMicroBrainIndexV1) {
  const details = SAFETY_PROBES.map((probe) => {
    const hits = retrieveMicroBrainConcepts(index, { text: probe.query, limit: 5 }).hits.map((hit) => hit.conceptId);
    return {
      ...probe,
      hits,
      expectedFound: hits.slice(0, 3).includes(probe.expected),
      forbiddenAvoidedAtTop1: hits[0] !== probe.forbiddenTop1,
    };
  });
  return {
    expectedTop3Passed: details.filter((item) => item.expectedFound).length,
    forbiddenTop1Avoided: details.filter((item) => item.forbiddenAvoidedAtTop1).length,
    total: details.length,
    details,
  };
}
function summarizeDurations(values: number[]) {
  return {
    count: values.length,
    minMs: values.length ? Math.min(...values) : 0,
    p50Ms: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
    p99Ms: percentile(values, 0.99),
    maxMs: values.length ? Math.max(...values) : 0,
    meanMs: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
  };
}

function loadIndexWithMemoryMeasurement(): {
  index: CompiledMicroBrainIndexV1;
  load: Record<string, number>;
} {
  global.gc?.();
  const before = process.memoryUsage();
  const started = performance.now();
  const bytes = fs.readFileSync(INDEX_PATH);
  const readMs = performance.now() - started;
  const parseStarted = performance.now();
  const index = JSON.parse(bytes.toString("utf8")) as CompiledMicroBrainIndexV1;
  const parseMs = performance.now() - parseStarted;
  global.gc?.();
  const after = process.memoryUsage();
  return {
    index,
    load: {
      artifactBytes: bytes.byteLength,
      readMs,
      parseMs,
      totalLoadMs: readMs + parseMs,
      rssDeltaBytes: after.rss - before.rss,
      heapUsedDeltaBytes: after.heapUsed - before.heapUsed,
    },
  };
}

function main(): void {
  const mode = (process.env.MICRO_BRAIN_BENCH_MODE ?? "baseline") as Mode;
  if (!["baseline", "brain_all", "brain_selective"].includes(mode)) throw new Error(`unsupported mode ${mode}`);
  const samples = readSamples();
  const prepareStarted = performance.now();
  const sources = prepareSources(samples);
  const prepareMs = performance.now() - prepareStarted;

  let index: CompiledMicroBrainIndexV1 | null = null;
  let indexLoad: Record<string, number> | null = null;
  if (mode !== "baseline") {
    const loaded = loadIndexWithMemoryMeasurement();
    index = loaded.index;
    indexLoad = loaded.load;
  }

  for (let iteration = 0; iteration < WARMUPS; iteration += 1) runSemanticPass(mode, samples, sources, index);
  const runs: RunResult[] = [];
  for (let iteration = 0; iteration < RUNS; iteration += 1) runs.push(runSemanticPass(mode, samples, sources, index));
  const digests = [...new Set(runs.map((run) => run.resolutionDigest))];
  if (digests.length !== 1) throw new Error(`non-deterministic resolver digest in ${mode}`);
  const queryDurations = runs.flatMap((run) => run.queryDurationsMs);

  const result: Record<string, unknown> = {
    schemaVersion: "lightbi.micro-brain.shadow-benchmark.v1",
    mode,
    runs: RUNS,
    warmups: WARMUPS,
    hardware: {
      architecture: os.arch(),
      logicalCpuCount: os.cpus().length,
      cpuModel: os.cpus()[0]?.model ?? "unknown",
      totalMemoryBytes: os.totalmem(),
      nodeVersion: process.version,
      platform: `${os.platform()} ${os.release()}`,
    },
    corpus: {
      sampleCount: samples.length,
      uniqueSourceCount: sources.size,
      uniquePhysicalColumnCount: [...sources.values()].reduce((sum, source) => sum + source.physical.sourceProfile.columns.length, 0),
      prepareMs,
    },
    semanticPass: summarizeDurations(runs.map((run) => run.elapsedMs)),
    brainQueries: summarizeDurations(queryDurations),
    queryCountPerRun: runs[0]?.queryCount ?? 0,
    invocationReasons: runs[0]?.invocationReasons ?? {},
    resolutionDigest: digests[0],
    indexLoad,
  };
  if (mode === "brain_all" && index) {
    result.quality = {
      governedRecall: evaluateGovernedRecall(index, samples, sources),
      foundationProbes: evaluateFoundationProbes(index),
      safetyProbes: evaluateSafetyProbes(index),
    };
  }

  global.gc?.();
  const finalMemory = process.memoryUsage();
  const usage = process.resourceUsage();
  result.processMemory = {
    rssBytes: finalMemory.rss,
    heapUsedBytes: finalMemory.heapUsed,
    externalBytes: finalMemory.external,
    maxRssKiB: usage.maxRSS,
  };
  console.log(`MB_BENCH_RESULT=${JSON.stringify(result)}`);
}

main();
