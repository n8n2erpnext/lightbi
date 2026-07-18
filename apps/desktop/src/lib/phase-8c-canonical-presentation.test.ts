import { createRequire } from "node:module";
import fs from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inspectLocalFile } from "./local-file-inspector";
import { presentCanonicalConsumerArtifact } from "./understanding-core/canonical-consumer-presentation-contract";
import { createFileSourceCandidate } from "./source-preflight";
import { createCanonicalSourceBoundary, type CanonicalSourceBoundaryV1 } from "./understanding-core/canonical-source-boundary";
import { getOrBuildCanonicalConsumerArtifact, resetCanonicalConsumerCacheForTests } from "./understanding-core/canonical-consumer-boundary";
import { appendCanonicalEvidenceDeclaration, createCanonicalUserOverlay, type CanonicalUserOverlayV1 } from "./understanding-core/canonical-user-overlay";

createRequire(import.meta.url);

async function repositoryBoundary(relativePath: string): Promise<{ boundary: CanonicalSourceBoundaryV1; rows: Record<string, unknown>[] }> {
  const payload = fs.readFileSync(join(process.cwd(), "../..", relativePath));
  const file = new File([payload], relativePath.split("/").at(-1)!, { type: "text/csv" });
  const candidate = createFileSourceCandidate(file);
  if (!("rawUrl" in candidate)) throw new Error("local source required");
  const inspected = await inspectLocalFile(candidate);
  if (inspected.status !== "accessible") throw new Error(inspected.message);
  const metadata = inspected.metadata;
  const sample = metadata.semantic_sample!;
  const boundary = createCanonicalSourceBoundary({
    datasetId: file.name,
    columns: metadata.columns!,
    semanticRows: metadata.semantic_rows!,
    semanticSample: { strategy: sample.strategy, sourceRowCount: sample.source_row_count, rowIndexes: sample.row_indexes },
    fullFileProfile: metadata.canonical_full_file_profile!,
    fullFileUnderstanding: metadata.canonical_full_file_profile!.fullFileUnderstanding,
    runtimeFiles: [{ file }],
  });
  return { boundary, rows: metadata.semantic_rows! };
}

function build(boundary: CanonicalSourceBoundaryV1, rows: Record<string, unknown>[], overlay?: CanonicalUserOverlayV1) {
  return getOrBuildCanonicalConsumerArtifact({ datasetId: boundary.datasetId, sourceKind: "local_file", sourceLabel: boundary.datasetId, columns: boundary.semanticSample.columns, rows, sourceRowCount: boundary.sourceRowCount, sourceBoundary: boundary, userOverlay: overlay });
}

describe("Phase 8C canonical presentation contract", () => {
  it("keeps metric blockers scoped and routes gross-profit evidence through the source-bound overlay", async () => {
    resetCanonicalConsumerCacheForTests();
    const { boundary, rows } = await repositoryBoundary("sample-corpus/versions/1.3.0/derived/derived-accounting-may-vnd.csv");
    const before = build(boundary, rows);
    const presentation = presentCanonicalConsumerArtifact(before);
    const grossProfit = presentation.analyses.find((item) => item.metricId === "gross_profit");
    expect(presentation.datasetState).toBe("understood");
    expect(presentation.datasetBlockers).toEqual([]);
    expect(grossProfit?.state).toBe("needs_user_evidence");
    expect(grossProfit?.remediationOperations.some((item) => item.kind === "open_currency_declaration")).toBe(true);
    expect(grossProfit?.executionReadiness).toBe("not_executable");
    expect(grossProfit?.primaryBlocker?.message).not.toMatch(/^[a-z0-9_:]+$/);
    expect(grossProfit?.evidence.every((item) => Boolean(item.provenance))).toBe(true);

    let overlay = createCanonicalUserOverlay(boundary, "2026-07-18T00:00:00.000Z");
    overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, { evidenceType: "reporting_period", value: { kind: "reporting_period", start: "2026-05-01", end: "2026-05-31" }, scope: { level: "source_file" }, createdAt: "2026-07-18T00:00:01.000Z" });
    overlay = appendCanonicalEvidenceDeclaration(overlay, boundary, { evidenceType: "reporting_currency", value: { kind: "reporting_currency", currency: "VND", monetaryColumns: ["Revenue_Credit", "COGS_Debit"] }, scope: { level: "source_file" }, createdAt: "2026-07-18T00:00:02.000Z" });
    const after = presentCanonicalConsumerArtifact(build(boundary, rows, overlay));
    const resolved = after.analyses.find((item) => item.metricId === "gross_profit");
    expect(resolved?.state).toBe("ready");
    expect(resolved?.executionReadiness).not.toBe("not_executable");
    expect(after.analyses.filter((item) => item.metricId !== "gross_profit").map((item) => item.state)).toEqual(expect.any(Array));
  });

  it("never gives unsupported or safety-blocked capabilities a fake remediation or executable state", async () => {
    resetCanonicalConsumerCacheForTests();
    const { boundary, rows } = await repositoryBoundary("sample-corpus/versions/1.3.0/derived/derived-accounting-may-vnd.csv");
    const presentation = presentCanonicalConsumerArtifact(build(boundary, rows));
    for (const item of presentation.analyses.filter((entry) => ["unsupported_mvp", "blocked_safety"].includes(entry.state))) {
      expect(item.executionReadiness).toBe("not_executable");
      expect(item.remediationOperations).toEqual([]);
    }
  });

  it("retains secondary blockers and decision-use restrictions", async () => {
    resetCanonicalConsumerCacheForTests();
    const { boundary, rows } = await repositoryBoundary("sample-corpus/versions/1.3.0/derived/derived-accounting-may-vnd.csv");
    const presentation = presentCanonicalConsumerArtifact(build(boundary, rows));
    const blocked = presentation.analyses.find((item) => item.primaryBlocker);
    expect(blocked).toBeTruthy();
    expect(blocked?.primaryBlocker?.code).toBeTruthy();
    expect(blocked?.secondaryBlockers).toBeDefined();
    expect(blocked?.decisionUseRestrictions).toBeDefined();
  });

  it("projects a superseded presentation as stale without making it runnable", async () => {
    resetCanonicalConsumerCacheForTests();
    const { boundary, rows } = await repositoryBoundary("sample-corpus/versions/1.3.0/derived/derived-accounting-may-vnd.csv");
    const presentation = presentCanonicalConsumerArtifact(build(boundary, rows), { stale: true });
    expect(presentation.datasetState).toBe("stale");
    expect(presentation.analyses.every((item) => item.state === "stale")).toBe(true);
    expect(presentation.analyses.every((item) => item.executionReadiness === "not_executable")).toBe(true);
  });
});
