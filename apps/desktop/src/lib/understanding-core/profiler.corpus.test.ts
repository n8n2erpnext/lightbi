import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { profilePhysicalSource } from "./profiler";
import type { DatasetUnderstandingArtifactV1, StructuralIssueCode } from "./profiling-contracts";

type CorpusGroup = "golden" | "holdout" | "adversarial" | "multi_file";

type CorpusSource = {
  path: string;
  sheet: string;
  required: boolean;
  sha256: string;
};

type ProfilingExpectation = {
  sourceProfiles: Array<{
    sourcePath: string;
    sheet: string;
    headerPosition: { zeroBasedRowIndex: number; basis: string };
    verifiedRowCount: number;
  }>;
  columnPhysicalTypes: Array<{
    physicalColumn: string;
    sourcePaths: string[];
    allowedTypes: string[];
    allowedParseExpectations: string[];
  }>;
  issues: {
    expected: Array<{ code: string; physicalColumn: string | null }>;
    allowed: Array<{ code: string; physicalColumn: string | null }>;
    forbidden: Array<{ code: string; physicalColumn: string | null }>;
  };
  representativeEvidence: {
    requiredSamplingRegions: string[];
    minimumDistinctRegions: number;
    requiredColumns: string[];
    mustPreservePhysicalColumnNames: boolean;
    mustReportUnparsedValues: boolean;
  };
};

type CorpusSample = {
  id: string;
  group: CorpusGroup;
  provenance: { tuningUse: "allowed" | "forbidden" };
  sources: CorpusSource[];
  profilingExpectations: ProfilingExpectation;
};

const REPO_ROOT = path.resolve(__dirname, "../../../../..");
const manifest = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "sample-corpus/versions/1.4.0/manifest.json"), "utf8")) as {
  groundTruthFiles: Array<{ path: string }>;
  groups: Record<CorpusGroup, { tuningAllowed: boolean }>;
};
const samples = manifest.groundTruthFiles.flatMap(entry => {
  const document = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, entry.path), "utf8")) as { samples: CorpusSample[] };
  return document.samples;
});
const artifactCache = new Map<string, DatasetUnderstandingArtifactV1>();

function sourceKey(source: CorpusSource): string {
  return `${source.path}#${source.sheet}`;
}

function artifactFor(source: CorpusSource): DatasetUnderstandingArtifactV1 {
  const key = sourceKey(source);
  const cached = artifactCache.get(key);
  if (cached) return cached;

  const filePath = path.join(REPO_ROOT, source.path);
  if (!fs.existsSync(filePath)) throw new Error(`[phase-2-corpus] Required source is missing: ${filePath}`);
  const actualHash = createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  if (actualHash !== source.sha256) throw new Error(`[phase-2-corpus] Source hash drift: ${source.path}`);
  const workbook = XLSX.readFile(filePath, { raw: true });
  const worksheet = workbook.Sheets[source.sheet] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!worksheet) throw new Error(`[phase-2-corpus] Required sheet is missing: ${source.path}#${source.sheet}`);
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    raw: true,
    blankrows: true
  });
  const artifact = profilePhysicalSource({
    schemaVersion: "lightbi.physical-source-input.v1",
    source: {
      sourceId: key,
      kind: "local_file",
      label: path.basename(source.path),
      path: source.path,
      sheet: source.sheet,
      hash: { algorithm: "sha256", value: source.sha256 }
    },
    rawRows
  });
  artifactCache.set(key, artifact);
  return artifact;
}

function assertSourceExpectation(sample: CorpusSample, source: CorpusSource): void {
  const artifact = artifactFor(source);
  const profile = artifact.sourceProfile;
  const expectedSource = sample.profilingExpectations.sourceProfiles.find(item => item.sourcePath === source.path && item.sheet === source.sheet);
  expect(expectedSource, `${sample.id}: missing source expectation for ${sourceKey(source)}`).toBeDefined();

  // Exact truths.
  expect(profile.header.selectedHeaderRowIndex, `${sample.id}: header position for ${sourceKey(source)}`)
    .toBe(expectedSource?.headerPosition.zeroBasedRowIndex);
  expect(profile.profiledRowCount, `${sample.id}: profiled row count for ${sourceKey(source)}`)
    .toBe(expectedSource?.verifiedRowCount);
  expect(profile.dataRegion.rowCount).toBe(profile.profiledRowCount);
  expect(profile.profilingScope).toBe("full");
  expect(artifact.representativeEvidence.fullFileTruth).toBe(false);
  if (profile.profiledRowCount > 100) {
    expect(artifact.representativeEvidence.sampledRowCount).toBeLessThan(profile.profiledRowCount);
  }
  expect(artifact.representativeEvidence.rows.every(row => row.sourceRowIndex > profile.header.selectedHeaderRowIndex!)).toBe(true);
  expect(artifact.provenance.sourceHash?.value).toBe(source.sha256);

  // Bounded/allowed physical truths.
  const expectedColumns = sample.profilingExpectations.columnPhysicalTypes.filter(item => item.sourcePaths.includes(source.path));
  for (const expectedColumn of expectedColumns) {
    const actual = profile.columns.find(column => column.physicalColumnName === expectedColumn.physicalColumn);
    expect(actual, `${sample.id}: physical column not preserved: ${expectedColumn.physicalColumn}`).toBeDefined();
    const candidateTypes = actual?.physicalTypeCandidates.map(candidate => candidate.type) ?? [];
    expect(
      candidateTypes.some(type => expectedColumn.allowedTypes.includes(type)),
      `${sample.id}: ${expectedColumn.physicalColumn} candidates ${candidateTypes.join(", ")} outside ${expectedColumn.allowedTypes.join(", ")}`
    ).toBe(true);
  }

  const actualIssues = profile.issues.map(item => ({ code: item.code, physicalColumn: item.physicalColumn }));
  for (const expectedIssue of sample.profilingExpectations.issues.expected) {
    if (expectedIssue.physicalColumn && !profile.columns.some(column => column.physicalColumnName === expectedIssue.physicalColumn)) continue;
    expect(
      actualIssues.some(actual => actual.code === expectedIssue.code && actual.physicalColumn === expectedIssue.physicalColumn),
      `${sample.id}: expected issue missing: ${expectedIssue.code}:${expectedIssue.physicalColumn ?? "source"}`
    ).toBe(true);
  }
  for (const forbiddenIssue of sample.profilingExpectations.issues.forbidden) {
    expect(
      actualIssues.some(actual => actual.code === forbiddenIssue.code && (forbiddenIssue.physicalColumn == null || actual.physicalColumn === forbiddenIssue.physicalColumn)),
      `${sample.id}: forbidden issue present: ${forbiddenIssue.code}`
    ).toBe(false);
  }

  const evidence = artifact.representativeEvidence;
  for (const region of sample.profilingExpectations.representativeEvidence.requiredSamplingRegions) {
    expect(evidence.coveredRegions, `${sample.id}: missing evidence region ${region}`).toContain(region);
  }
  expect(new Set(evidence.coveredRegions).size).toBeGreaterThanOrEqual(sample.profilingExpectations.representativeEvidence.minimumDistinctRegions);
  for (const requiredColumn of sample.profilingExpectations.representativeEvidence.requiredColumns) {
    if (!profile.columns.some(column => column.physicalColumnName === requiredColumn)) continue;
    expect(evidence.rows.every(row => Object.prototype.hasOwnProperty.call(row.values, requiredColumn)), `${sample.id}: evidence omitted ${requiredColumn}`).toBe(true);
  }
  if (sample.profilingExpectations.representativeEvidence.mustReportUnparsedValues) {
    const sampledSourceRows = new Set(evidence.rows.map(row => row.sourceRowIndex));
    for (const column of profile.columns) {
      for (const parse of column.parseEvidence) {
        for (const failure of parse.representativeFailures) {
          expect(sampledSourceRows, `${sample.id}: unparsed value omitted at source row ${failure.sourceRowIndex}`).toContain(failure.sourceRowIndex);
        }
      }
    }
  }
}

describe("Phase 2 canonical profiler corpus runner", () => {
  it("keeps validation groups tuning-forbidden", () => {
    for (const sample of samples) {
      expect(sample.provenance.tuningUse).toBe(manifest.groups[sample.group].tuningAllowed ? "allowed" : "forbidden");
    }
  });

  for (const group of ["golden", "holdout", "adversarial", "multi_file"] as const) {
    it(`validates exact and bounded profiling truth for ${group} cases`, () => {
      const groupSamples = samples.filter(sample => sample.group === group);
      expect(groupSamples.length).toBeGreaterThan(0);
      for (const sample of groupSamples) {
        for (const source of sample.sources) assertSourceExpectation(sample, source);
      }
    }, 120_000);
  }

  it("never emits an unsupported silent-parse-drop issue code", () => {
    const knownIssueCodes = new Set<StructuralIssueCode>();
    for (const sample of samples) {
      for (const source of sample.sources) {
        for (const issue of artifactFor(source).sourceProfile.issues) knownIssueCodes.add(issue.code);
      }
    }
    expect(knownIssueCodes.has("silent_parse_drop" as StructuralIssueCode)).toBe(false);
  });
});
