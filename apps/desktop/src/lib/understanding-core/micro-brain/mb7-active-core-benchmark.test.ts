import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { profilePhysicalSource } from "../profiler";
import { generateSemanticCandidateArtifact } from "../semantic-candidate-engine";
import { aggregateContextualEvidence } from "../contextual-evidence-aggregator";
import { resolveSemanticShadow } from "../semantic-resolver";
import type { CandidateArtifactV1, ColumnObservationV1 } from "../semantic-candidate-contracts";
import type { DatasetUnderstandingArtifactV1 } from "../profiling-contracts";
import { getBuiltInMicroBrainIndex } from "./built-in-index";
import { buildMicroBrainQuerySignature, microBrainShadowInvocationReason } from "./query-signature";
import { retrieveMicroBrainConcepts } from "./retrieval";

const ROOT = path.resolve(process.cwd(), "../..");
const INDEX_PATH = path.join(process.cwd(), "src/lib/understanding-core/micro-brain/compiled/foundation.index.v1.json");
const MANIFEST_PATH = path.join(ROOT, "sample-corpus/versions/1.4.0/manifest.json");
const OUTPUT_PATH = path.join(process.cwd(), "src/lib/understanding-core/micro-brain/baseline/mb7-active-core-benchmark.v1.json");
const RUNS = Number(process.env.MICRO_BRAIN_ACTIVE_RUNS ?? 5);
const WARMUPS = Number(process.env.MICRO_BRAIN_ACTIVE_WARMUPS ?? 1);

type SourceRef = { path: string; sheet: string; sha256: string };
type Sample = { id: string; group: string; sources: SourceRef[] };
type Prepared = { ref: SourceRef; physical: DatasetUnderstandingArtifactV1 };
type ResolutionRow = { sourceId: string; physicalColumn: string; state: string; selected: string | null };
type Pass = { elapsedMs: number; queryCount: number; bridgedCandidateCount: number; rows: ResolutionRow[]; digest: string };

function readSamples(): Sample[] {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as { groundTruthFiles: Array<{ path: string }> };
  return manifest.groundTruthFiles.flatMap((entry) => (JSON.parse(fs.readFileSync(path.join(ROOT, entry.path), "utf8")) as { samples: Sample[] }).samples);
}
function sourceKey(ref: SourceRef): string { return `${ref.path}#${ref.sheet}`; }
function prepare(ref: SourceRef): Prepared {
  const bytes = fs.readFileSync(path.join(ROOT, ref.path));
  expect(crypto.createHash("sha256").update(bytes).digest("hex"), ref.path).toBe(ref.sha256);
  const workbook = XLSX.read(bytes, { raw: true });
  const sheet = workbook.Sheets[ref.sheet] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`missing sheet ${sourceKey(ref)}`);
  return {
    ref,
    physical: profilePhysicalSource({
      schemaVersion: "lightbi.physical-source-input.v1",
      source: { sourceId: sourceKey(ref), kind: "local_file", label: path.basename(ref.path), hash: { algorithm: "sha256", value: ref.sha256 } },
      rawRows: XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "", blankrows: true }) as unknown[][],
    }),
  };
}
function prepareSources(samples: Sample[]): Prepared[] {
  const refs = new Map<string, SourceRef>();
  for (const sample of samples) for (const ref of sample.sources) refs.set(sourceKey(ref), ref);
  return [...refs.values()].map(prepare);
}
function runPass(sources: Prepared[], active: boolean): Pass {
  const index = active ? getBuiltInMicroBrainIndex() : null;
  const started = performance.now();
  let queryCount = 0;
  let bridgedCandidateCount = 0;
  const rows: ResolutionRow[] = [];
  for (const source of sources) {
    const candidates = generateSemanticCandidateArtifact(source.physical, active ? { microBrain: { index: index!, mode: "selective" } } : {});
    queryCount += candidates.microBrainBridge?.queryCount ?? 0;
    bridgedCandidateCount += candidates.microBrainBridge?.bridgedCandidateCount ?? 0;
    const contextual = aggregateContextualEvidence(source.physical, candidates);
    const resolution = resolveSemanticShadow(source.physical, candidates, contextual);
    for (const column of resolution.columns) rows.push({
      sourceId: source.physical.sourceProfile.source.sourceId,
      physicalColumn: column.physicalColumn,
      state: column.finalState,
      selected: column.selectedCandidateId ?? null,
    });
  }
  rows.sort((a, b) => `${a.sourceId}|${a.physicalColumn}`.localeCompare(`${b.sourceId}|${b.physicalColumn}`));
  const digest = crypto.createHash("sha256").update(rows.map((row) => `${row.sourceId}|${row.physicalColumn}|${row.state}|${row.selected ?? ""}`).join("\n")).digest("hex");
  return { elapsedMs: performance.now() - started, queryCount, bridgedCandidateCount, rows, digest };
}
function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))];
}
function stats(values: number[]) {
  return { count: values.length, minMs: Math.min(...values), p50Ms: percentile(values, .5), p95Ms: percentile(values, .95), p99Ms: percentile(values, .99), maxMs: Math.max(...values), meanMs: values.reduce((a, b) => a + b, 0) / values.length };
}
function observationFor(candidate: CandidateArtifactV1, column: string): ColumnObservationV1 | null {
  return candidate.observations.find((item) => item.physicalColumn === column) ?? null;
}
function measureRetrieval(sources: Prepared[]): number[] {
  const index = getBuiltInMicroBrainIndex();
  const durations: number[] = [];
  for (const source of sources) {
    const baseline = generateSemanticCandidateArtifact(source.physical);
    for (const column of source.physical.sourceProfile.columns) {
      const observation = observationFor(baseline, column.physicalColumnName);
      if (!observation || !microBrainShadowInvocationReason(observation)) continue;
      const signature = buildMicroBrainQuerySignature(source.physical.sourceProfile, column, { limit: 8 });
      const started = performance.now();
      retrieveMicroBrainConcepts(index, signature.query);
      durations.push(performance.now() - started);
    }
  }
  return durations;
}
function measureColdLoad() {
  const code = String.raw`
const fs=require('fs'); const {performance}=require('perf_hooks');
if(global.gc) global.gc(); const before=process.memoryUsage(); const t=performance.now();
const b=fs.readFileSync(process.argv[1]); const read=performance.now()-t; const p=performance.now(); JSON.parse(b.toString('utf8')); const parse=performance.now()-p;
if(global.gc) global.gc(); const after=process.memoryUsage();
console.log(JSON.stringify({artifactBytes:b.length,readMs:read,parseMs:parse,totalLoadMs:read+parse,rssDeltaBytes:after.rss-before.rss,heapUsedDeltaBytes:after.heapUsed-before.heapUsed}));`;
  const child = spawnSync(process.execPath, ["--expose-gc", "-e", code, INDEX_PATH], { encoding: "utf8" });
  if (child.status !== 0) throw new Error(`cold-load measurement failed: ${child.stderr}`);
  return JSON.parse(child.stdout.trim()) as Record<string, number>;
}
function differences(off: ResolutionRow[], on: ResolutionRow[]) {
  const baseline = new Map(off.map((row) => [`${row.sourceId}|${row.physicalColumn}`, row]));
  return on.flatMap((row) => {
    const before = baseline.get(`${row.sourceId}|${row.physicalColumn}`);
    if (!before || (before.state === row.state && before.selected === row.selected)) return [];
    return [{ sourceId: row.sourceId, physicalColumn: row.physicalColumn, beforeState: before.state, beforeSelected: before.selected, afterState: row.state, afterSelected: row.selected }];
  });
}

describe("MB-7 active-core benchmark", () => {
  it("measures the active selective bridge against the same core with MB disabled", () => {
    const samples = readSamples();
    const prepareStarted = performance.now();
    const sources = prepareSources(samples);
    const prepareMs = performance.now() - prepareStarted;
    for (let i = 0; i < WARMUPS; i += 1) { runPass(sources, false); runPass(sources, true); }
    const offRuns: Pass[] = [], onRuns: Pass[] = [];
    for (let i = 0; i < RUNS; i += 1) {
      const order = i % 2 === 0 ? [false, true] : [true, false];
      for (const active of order) (active ? onRuns : offRuns).push(runPass(sources, active));
    }
    expect(new Set(offRuns.map((run) => run.digest)).size).toBe(1);
    expect(new Set(onRuns.map((run) => run.digest)).size).toBe(1);
    const diff = differences(offRuns[0].rows, onRuns[0].rows);
    const confirmedRegressions = diff.filter((item) => item.beforeState === "confirmed" && (item.afterState !== "confirmed" || item.afterSelected !== item.beforeSelected));
    expect(confirmedRegressions).toEqual([]);
    const retrievalDurations = measureRetrieval(sources);
    expect(retrievalDurations.length).toBe(onRuns[0].queryCount);
    const offStats = stats(offRuns.map((run) => run.elapsedMs));
    const onStats = stats(onRuns.map((run) => run.elapsedMs));
    const result = {
      schemaVersion: "lightbi.micro-brain.active-core-benchmark.v1",
      generatedAt: new Date().toISOString(),
      hardware: { architecture: os.arch(), cpuModel: os.cpus()[0]?.model ?? "unknown", logicalCpuCount: os.cpus().length, totalMemoryBytes: os.totalmem(), nodeVersion: process.version, platform: `${os.platform()} ${os.release()}` },
      corpus: { sampleCount: samples.length, uniqueSourceCount: sources.length, physicalColumnCount: sources.reduce((sum, item) => sum + item.physical.sourceProfile.columns.length, 0), prepareMs },
      activeCore: {
        runs: RUNS,
        warmups: WARMUPS,
        mbOff: offStats,
        mbSelective: onStats,
        p50DeltaMs: onStats.p50Ms - offStats.p50Ms,
        p50DeltaPct: ((onStats.p50Ms - offStats.p50Ms) / offStats.p50Ms) * 100,
        queryCountPerRun: onRuns[0].queryCount,
        bridgedCandidateCountPerRun: onRuns[0].bridgedCandidateCount,
        retrievalLatency: stats(retrievalDurations),
        offResolutionDigest: offRuns[0].digest,
        onResolutionDigest: onRuns[0].digest,
        semanticDifferences: diff,
        confirmedRegressions,
      },
      indexColdLoad: measureColdLoad(),
      indexIdentity: getBuiltInMicroBrainIndex().manifest.logicalIndexSha256,
    };
    if (process.env.LIGHTBI_WRITE_MB7_BENCH === "1") fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`MB7_ACTIVE_BENCH=${JSON.stringify(result)}`);
  }, 180_000);
});
