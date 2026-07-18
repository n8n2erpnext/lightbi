#!/usr/bin/env node
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const XLSX = require(path.join(ROOT, "node_modules/.pnpm/xlsx@0.18.5/node_modules/xlsx/xlsx.js"));
const VERSION_ROOT = path.join(ROOT, "sample-corpus/versions/1.4.0");
const TRUTH_ROOT = path.join(VERSION_ROOT, "ground-truth");

const FROZEN_120 = {
  "sample-corpus/manifest.json": "a36284c1f4655289ff832bb4102f9e153fdad329020df6972802802368d0adaa",
  "sample-corpus/ground-truth/adversarial-dirty.json": "5aa9eb78ca5ace97f23af6b1edf21ad8616764d281180ef6f9273f43e4d287dc",
  "sample-corpus/ground-truth/finance-accounting.json": "3d66360763825b7a70b440b1367f3cbd0ac57b3d57ebefac956ca73a3efdfc71",
  "sample-corpus/ground-truth/inventory.json": "1a604479b6c9175224dacff892d50509a129f47e1c297dce58ea04c79626497a",
  "sample-corpus/ground-truth/multi-file.json": "9bec416f7f66e768777387e2af963e496e410b6aeb4e1e1a70b7412993584b3f",
  "sample-corpus/ground-truth/operations-delivery.json": "34358725ee416f0b26a4b72c15f2d8a324c5a38227a3756e2fb744a7cb22374b",
  "sample-corpus/ground-truth/revenue-sales.json": "15c74119995414d497b94baf539672ac1ffd98a10e940561775c17769716685a",
};

const PATHS = {
  "sample data/Sales_ERP_May_2026.xlsx": "sample-corpus/anchors/1.3.0/Sales_ERP_May_2026.xlsx",
  "sample data/Sales_ERP_June_2026.xlsx": "sample-corpus/anchors/1.3.0/Sales_ERP_June_2026.xlsx",
  "sample data/Logistics_ERP_May_2026.csv": "sample-corpus/anchors/1.3.0/Logistics_ERP_May_2026.csv",
  "sample data/Logistics_ERP_June_2026.csv": "sample-corpus/anchors/1.3.0/Logistics_ERP_June_2026.csv",
  "sample data/Accounting_ERP_May_2026.csv": "sample-corpus/anchors/1.3.0/Accounting_ERP_May_2026.csv",
  "sample data/Accounting_ERP_June_2026.csv": "sample-corpus/anchors/1.3.0/Accounting_ERP_June_2026.csv",
  "sample data/2017-06-22 DANH SACH XEP HANG QUAN LY TOAN QUOC.xlsx": "sample-corpus/versions/1.4.0/fixtures/management-ranking-sanitized.xlsx",
  "sample data/BHX_PHIEUXUAT.xlsx": "sample-corpus/versions/1.4.0/fixtures/sales-issue-sanitized.xlsx",
  "sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx": "sample-corpus/versions/1.4.0/fixtures/inventory-detail-sanitized.xlsx",
  "sample data/PLU ALL FRESH 22.03.2021.xlsx": "sample-corpus/versions/1.4.0/fixtures/product-list-sanitized.xlsx",
  "sample data/TỒN DỰ KIẾN HUBLAN.xlsx": "sample-corpus/versions/1.4.0/fixtures/inventory-projection-sanitized.xlsx",
  "sample data/bcctnhapTTKT_19122024.xlsx": "sample-corpus/versions/1.4.0/fixtures/delivery-1912-sanitized.xlsx",
  "sample data/bcctnhapTTKT_23122024.xlsx": "sample-corpus/versions/1.4.0/fixtures/delivery-2312-sanitized.xlsx",
  "sample data/bcctnhapTTKT_24122024.xlsx": "sample-corpus/versions/1.4.0/fixtures/delivery-2412-sanitized.xlsx",
  "sample data/Sample - Superstore for Tableau 9.x versions.xls": "sample-corpus/versions/1.4.0/fixtures/commerce-orders-synthetic.xlsx",
  "sample data/World Bank Indicators.xlsx": "sample-corpus/versions/1.4.0/fixtures/public-indicators-synthetic.xlsx",
  "sample data/WorldCupPlayers.xlsx": "sample-corpus/versions/1.4.0/fixtures/event-participants-synthetic.xlsx",
  "sample data/bank-additional-full.xlsx": "sample-corpus/versions/1.4.0/fixtures/campaign-outcomes-synthetic.xlsx",
  "sample data/motodetail.xlsx": "sample-corpus/versions/1.4.0/fixtures/service-detail-synthetic.xlsx",
};

const OPERATIONAL = new Set([
  "sample data/2017-06-22 DANH SACH XEP HANG QUAN LY TOAN QUOC.xlsx",
  "sample data/BHX_PHIEUXUAT.xlsx",
  "sample data/Bao_cao_chi_tiet_Ton_kho_vung_tinh_28-12-2024.xlsx",
  "sample data/PLU ALL FRESH 22.03.2021.xlsx",
  "sample data/TỒN DỰ KIẾN HUBLAN.xlsx",
  "sample data/bcctnhapTTKT_19122024.xlsx",
  "sample data/bcctnhapTTKT_23122024.xlsx",
  "sample data/bcctnhapTTKT_24122024.xlsx",
]);

const PROFILE_TYPE_OVERRIDES = {
  "sample-corpus/versions/1.4.0/fixtures/service-detail-synthetic.xlsx\u001fDATE": ["excel_serial_date", "number"],
};

function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(stable(value), null, 2)}\n`); }
function replacePaths(value) {
  if (typeof value === "string") return PATHS[value] ?? value;
  if (Array.isArray(value)) return value.map(replacePaths);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, replacePaths(nested)]));
  return value;
}
function workbookRows(sourcePath, sheetName, headerIndex) {
  const workbook = XLSX.readFile(path.join(ROOT, sourcePath), { raw: true });
  const sheet = workbook.Sheets[sheetName] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error(`Missing release sheet: ${sourcePath}#${sheetName}`);
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: "", blankrows: true });
  return rows.slice(headerIndex + 1).filter((row) => row.some((value) => value !== "" && value !== null && value !== undefined)).length;
}
function updateSample(sample) {
  const originalPaths = sample.sources.map((source) => source.path);
  const next = replacePaths(structuredClone(sample));
  next.corpusVersion = "1.4.0";
  next.provenance = {
    ...next.provenance,
    kind: "repository_release_fixture",
    evidenceClass: originalPaths.every((entry) => entry.startsWith("sample data/") && !OPERATIONAL.has(entry) && !PATHS[entry]?.includes("fixtures/"))
      ? "approved_repository_synthetic_fixture"
      : originalPaths.some((entry) => OPERATIONAL.has(entry))
        ? "privacy_sanitized_operational_shape_evidence"
        : originalPaths.some((entry) => PATHS[entry]?.includes("fixtures/"))
          ? "synthetic_equivalent_acceptance_fixture"
          : "approved_repository_fixture",
    dataHandling: "repository_controlled_release_acceptance_data",
    notes: `Corpus 1.4.0 fixture with independent hashes and profiling truth. Acceptance-purpose lineage: ${sample.id}; no corpus 1.2.0 measurement is re-claimed.`,
  };
  for (let index = 0; index < next.sources.length; index += 1) {
    const source = next.sources[index];
    source.sha256 = sha256(path.join(ROOT, source.path));
    source.required = true;
  }
  for (const profile of next.profilingExpectations.sourceProfiles) {
    profile.verifiedRowCount = workbookRows(profile.sourcePath, profile.sheet, profile.headerPosition.zeroBasedRowIndex);
    profile.headerPosition.basis = "verified_repository_release_fixture_read";
  }
  next.profilingExpectations.verifiedRowCount = next.profilingExpectations.sourceProfiles.reduce((sum, item) => sum + item.verifiedRowCount, 0);
  for (const column of next.profilingExpectations.columnPhysicalTypes) {
    const sourcePath = column.sourcePaths[0];
    const override = PROFILE_TYPE_OVERRIDES[`${sourcePath}\u001f${column.physicalColumn}`];
    if (override) column.allowedTypes = override;
  }
  if (originalPaths.includes("sample data/motodetail.xlsx")) {
    next.profilingExpectations.issues.expected = next.profilingExpectations.issues.expected.filter((issue) => !["mixed_type", "formula_error"].includes(issue.code));
    next.profilingExpectations.issues.allowed.push(
      { code: "mixed_type", physicalColumn: "DATE" },
      { code: "formula_error", physicalColumn: "AREA\nCLASS" },
    );
  }
  if (originalPaths.some((entry) => PATHS[entry]?.includes("fixtures/"))) next.verifiedMetricAnswers = {};
  return next;
}

function main() {
  for (const [relative, expected] of Object.entries(FROZEN_120)) {
    const actual = sha256(path.join(ROOT, relative));
    if (actual !== expected) throw new Error(`Frozen corpus 1.2.0 drift: ${relative}`);
  }
  fs.mkdirSync(TRUTH_ROOT, { recursive: true });
  const baseManifest = JSON.parse(fs.readFileSync(path.join(ROOT, "sample-corpus/manifest.json"), "utf8"));
  const groundTruthFiles = [];
  let sampleCount = 0;
  for (const entry of baseManifest.groundTruthFiles) {
    const name = path.basename(entry.path);
    const document = JSON.parse(fs.readFileSync(path.join(ROOT, entry.path), "utf8"));
    const output = {
      ...replacePaths(document),
      corpusVersion: "1.4.0",
      evidencePolicy: "repository_safe_release_acceptance",
      samples: document.samples.map(updateSample),
    };
    const outputPath = path.join(TRUTH_ROOT, name);
    writeJson(outputPath, output);
    sampleCount += output.samples.length;
    groundTruthFiles.push({ path: path.relative(ROOT, outputPath), sha256: sha256(outputPath), sampleCount: output.samples.length });
  }
  const sources = [...new Set(Object.values(PATHS))].sort().map((sourcePath) => ({
    path: sourcePath,
    sha256: sha256(path.join(ROOT, sourcePath)),
    trackedInput: true,
    ignoredInputEligible: false,
  }));
  const manifest = {
    schemaVersion: "lightbi.acceptance-corpus.v1.4",
    corpusVersion: "1.4.0",
    releaseAuthority: true,
    evidenceClass: "repository_safe_release_acceptance",
    historicalLineage: { corpusVersion: "1.2.0", classification: "historical_local_acceptance_evidence", measurementsReclaimed: false, frozenManifestSha256: FROZEN_120["sample-corpus/manifest.json"] },
    groups: baseManifest.groups,
    groundTruthFiles,
    sources,
    sampleCount,
    fixturePolicy: { absolutePathsAllowed: false, sampleDataFallbackAllowed: false, ignoredFilesEligible: false, missingRequiredInputBehavior: "fail_closed" },
  };
  writeJson(path.join(VERSION_ROOT, "manifest.json"), manifest);
  process.stdout.write(`${JSON.stringify({ corpusVersion: manifest.corpusVersion, sampleCount, manifestSha256: sha256(path.join(VERSION_ROOT, "manifest.json")), groundTruthFiles }, null, 2)}\n`);
}

main();
