import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { aggregateContextualEvidence } from "../contextual-evidence-aggregator";
import { profilePhysicalSource } from "../profiler";
import { generateSemanticCandidateArtifact } from "../semantic-candidate-engine";
import { resolveSemanticShadow } from "../semantic-resolver";
import { getBuiltInMicroBrainIndex } from "./built-in-index";

const REPO_ROOT = path.resolve(__dirname, "../../../../../..");
const SOURCE_PATH = path.join(REPO_ROOT, "sample-corpus/versions/1.4.0/fixtures/delivery-2412-sanitized.xlsx");
const SHEET = "NhapXuatDungGioTTKT";

function ttktPhysical() {
  const workbook = XLSX.read(fs.readFileSync(SOURCE_PATH), { raw: true });
  const sheet = workbook.Sheets[SHEET];
  if (!sheet) throw new Error("TTKT fixture sheet missing");
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: true,
  });
  return profilePhysicalSource({
    schemaVersion: "lightbi.physical-source-input.v1",
    source: { sourceId: "ops.ttkt_20241224", kind: "local_file", label: "delivery-2412-sanitized.xlsx", sheet: SHEET },
    rawRows,
  });
}

describe("Micro Brain selective bridge on governed TTKT corpus", () => {
  it("recovers and conservatively resolves ETA on the real holdout source", () => {
    const physical = ttktPhysical();
    const baseline = generateSemanticCandidateArtifact(physical);
    const bridged = generateSemanticCandidateArtifact(physical, {
      microBrain: { index: getBuiltInMicroBrainIndex(), mode: "selective" },
    });
    const baselineEtaColumn = baseline.observations.find((observation) => observation.physicalColumn === "Thời gian dự kiến đến");
    const bridgedEtaColumn = bridged.observations.find((observation) => observation.physicalColumn === "Thời gian dự kiến đến");
    expect(baselineEtaColumn?.candidateSet.candidates.map((candidate) => candidate.candidateId)).not.toContain("eta");
    expect(bridgedEtaColumn?.candidateSet.candidates.map((candidate) => candidate.candidateId)).toContain("eta");
    expect(bridged.microBrainBridge?.mode).toBe("selective");

    const semantic = resolveSemanticShadow(physical, bridged, aggregateContextualEvidence(physical, bridged));
    const etaResolution = semantic.columns.find((column) => column.physicalColumn === "Thời gian dự kiến đến");
    const etaTrace = etaResolution?.candidateTraces.find((trace) => trace.candidateId === "eta");
    expect(etaTrace?.lexicalClass).toBe("semantic_retrieval");
    expect(etaTrace?.disposition).toBe("selected");
    expect(etaResolution?.finalState).toBe("probable");
    expect(etaResolution?.selectedCandidateId).toBe("eta");
    expect(etaResolution?.ruleIds).toContain("R-MB-PROBABLE");
  });
});
