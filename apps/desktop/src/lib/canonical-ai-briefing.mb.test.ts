import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { generateCanonicalAIBriefing } from "./canonical-ai-briefing";
import { getOrBuildCanonicalConsumerArtifact } from "./understanding-core/canonical-consumer-boundary";

const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SOURCE_PATH = path.join(REPO_ROOT, "sample-corpus/versions/1.4.0/fixtures/delivery-2412-sanitized.xlsx");
const SHEET = "NhapXuatDungGioTTKT";

describe("Canonical AI briefing with Micro Brain provenance", () => {
  it("carries the real TTKT ETA recovery into BA as probable MB semantics, not canonical certainty", () => {
    const workbook = XLSX.read(fs.readFileSync(SOURCE_PATH), { raw: true });
    const sheet = workbook.Sheets[SHEET];
    if (!sheet) throw new Error("TTKT fixture sheet missing");
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const artifact = getOrBuildCanonicalConsumerArtifact({
      datasetId: "mb-briefing:ops.ttkt_20241224",
      sourceKind: "local_file",
      sourceLabel: "delivery-2412-sanitized.xlsx",
      columns,
      rows,
      sourceRowCount: rows.length,
      sheet: SHEET,
    });
    expect(artifact.status).toBe("valid");

    const briefing = generateCanonicalAIBriefing(artifact);
    const eta = briefing.semanticFields.find((field) => field.canonicalId === "eta");
    expect(eta).toMatchObject({
      canonicalId: "eta",
      label: "ETA / Promised Time",
      domain: "operations",
      role: "time",
      confidence: 75,
      resolutionState: "probable",
      semanticSource: "micro_brain",
      registryCoverageStatus: "partial",
      physicalColumn: "Thời gian dự kiến đến",
    });
    expect(eta?.reason).toContain("R-MB-PROBABLE");
    expect(JSON.stringify(eta)).not.toContain("denseSimilarity");
    expect(JSON.stringify(eta)).not.toContain("rrfScore");
  }, 20_000);
});
