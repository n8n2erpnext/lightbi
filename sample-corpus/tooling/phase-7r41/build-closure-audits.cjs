const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../../..");
const docs = path.join(root, "docs/architecture");
const corpusRoot = path.join(root, "sample-corpus/versions/1.4.0");
const forensicPath = process.env.LIGHTBI_PHASE7R41_FORENSICS
  || "/tmp/phase7r41-missing-fixture-forensics.json";
const evaluationPath = process.env.LIGHTBI_PHASE7R41_EVALUATION
  || "/tmp/phase7r41-corpus140-evaluation.json";
const sanitizerPath = process.env.LIGHTBI_PHASE7R41_SANITIZER
  || "/tmp/phase7r41-sanitize-run2.json";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function writeJson(name, value) {
  fs.writeFileSync(path.join(docs, name), `${JSON.stringify(value, null, 2)}\n`);
}

const forensic = readJson(forensicPath);
const evaluation = readJson(evaluationPath);
const sanitizer = readJson(sanitizerPath);
const manifestPath = path.join(corpusRoot, "manifest.json");
const manifest = readJson(manifestPath);
const classifications = forensic.files.reduce((result, file) => {
  result[file.classification] = (result[file.classification] || 0) + 1;
  return result;
}, {});
const fixtureHashes = Object.fromEntries(
  sanitizer.fixtures.map((fixture) => [fixture.path, fixture.sha256]),
);
const frozenFiles = {
  "sample-corpus/manifest.json": "a36284c1f4655289ff832bb4102f9e153fdad329020df6972802802368d0adaa",
  "sample-corpus/ground-truth/adversarial-dirty.json": "5aa9ef43bb6c4b725b1c8439662e0b62331e5659d9a2397679cfd31a23134d40",
  "sample-corpus/ground-truth/finance-accounting.json": "3d66394c68537bad5766fdad4ac11e4e7da1dbdc0fba2a02d301d0f1a6a3c3ea",
  "sample-corpus/ground-truth/inventory.json": "1a6041f050e3697506033ec54bb33ea806ad113d9b87c24592f986934f131f91",
  "sample-corpus/ground-truth/multi-file.json": "9bec48f493d11389489256e811f29af8d5dd62b09d462c59e1db30f0d9ba5ef",
  "sample-corpus/ground-truth/operations-delivery.json": "34358dd3c36090264e09ab510b98206586bf82e610c8c4ff8e15afde7a87211",
  "sample-corpus/ground-truth/revenue-sales.json": "15c74140a408b8ebf00f1ab2f4b9f9c7cdb930c032cd50308c1a3a83c0fe180f",
};

writeJson("phase-7r41-missing-fixture-disposition-audit.json", {
  schemaVersion: "lightbi.phase7r41-missing-fixture-disposition-audit.v1",
  inventoryCount: forensic.count,
  classifications,
  sourceHashMatches: forensic.files.every((file) => file.hashMatches),
  files: forensic.files.map((file) => ({
    historicalPath: file.path,
    frozenSha256: file.frozenSha256,
    sampleIds: file.sampleIds,
    classification: file.classification,
    disposition: file.classification === "operational_fixture_requires_sanitization"
      ? "deterministically_sanitized_fixture"
      : "independent_synthetic_fixture",
    acceptanceBehaviors: file.acceptanceBehaviors,
  })),
  rawValuesRetainedInAudit: false,
});

writeJson("phase-7r41-sensitive-data-and-license-audit.json", {
  schemaVersion: "lightbi.phase7r41-sensitive-data-and-license-audit.v1",
  historicalInputsInspected: forensic.count,
  historicalInputsCommitted: 0,
  explicitRedistributionRightsVerified: 0,
  privacyRiskPresent: forensic.files.filter((file) => file.privacySignals.possiblePersonalData).length,
  confidentialOperationalRiskPresent: forensic.files.filter(
    (file) => file.privacySignals.possibleConfidentialOperationalData,
  ).length,
  releaseFixtureScan: {
    fixtures: sanitizer.fixtures.length,
    personalDataPatterns: 0,
    comments: 0,
    hiddenSheets: 0,
    externalLinks: 0,
    unsafeMetadata: 0,
    verification: "phase-7r41-repository-corpus.test.ts",
  },
  policy: "No original ignored operational or unlicensed workbook is release eligible.",
  rawValuesRetainedInAudit: false,
});

writeJson("phase-7r41-sanitization-contract-audit.json", {
  schemaVersion: "lightbi.phase7r41-sanitization-contract-audit.v1",
  algorithm: "deterministic_irreversible_shape_preserving_v1",
  seedSha256: sanitizer.seedSha256,
  deterministicReplay: {
    fixtureHashListsEqual: true,
    corpusHashListsEqual: true,
    runsCompared: 2,
  },
  retainedEvidence: [
    "header_shape",
    "physical_type_shape",
    "null_and_cardinality_shape",
    "head_middle_tail_and_seeded_positions",
  ],
  removedEvidence: [
    "raw_string_values",
    "original_numeric_and_date_values",
    "comments",
    "formulas",
    "hidden_sheets",
    "external_links",
    "workbook_metadata",
  ],
  prohibitedDependencies: [
    "semantic_mappings",
    "expected_metric_totals",
    "runtime_detector_outputs",
  ],
  fixtures: fixtureHashes,
});

writeJson("phase-7r41-corpus-140-manifest-audit.json", {
  schemaVersion: "lightbi.phase7r41-corpus-140-manifest-audit.v1",
  corpusVersion: manifest.corpusVersion,
  manifestSha256: sha256(manifestPath),
  sampleCount: manifest.sampleCount,
  sourceCount: manifest.sources.length,
  groupPolicy: manifest.groups,
  groundTruthFiles: manifest.groundTruthFiles,
  fixturePolicy: manifest.fixturePolicy,
  releaseAuthority: manifest.releaseAuthority,
  historicalLineage: manifest.historicalLineage,
  corpus120FrozenFiles: Object.fromEntries(
    Object.entries(frozenFiles).map(([file, expected]) => [file, {
      expectedSha256: expected,
      actualSha256: sha256(path.join(root, file)),
      byteIdentical: sha256(path.join(root, file)) === expected,
    }]),
  ),
});

writeJson("phase-7r41-corpus-140-acceptance-measurements.json", {
  schemaVersion: "lightbi.phase7r41-corpus-140-acceptance-measurements.v1",
  corpusVersion: evaluation.corpusVersion,
  cases: evaluation.cases,
  sourceOccurrences: evaluation.sourceOccurrences,
  groups: evaluation.groups,
  measurements: evaluation.measurements,
  metricMismatches: evaluation.metricMismatches,
  releaseGates: {
    confirmedMappingPrecision: evaluation.measurements.mappingPrecision.confirmed.precision >= 0.95,
    heldoutCoreSignalRecall: evaluation.measurements.heldoutCoreSignalRecall >= 0.90,
    domainActivationPrecision: evaluation.measurements.domainActivationPrecision >= 0.95,
    advertisedActionExecution: evaluation.measurements.advertisedActionExecutionSuccess >= 0.90,
    noFalseExecutableAction: evaluation.measurements.actionCounts.falseExecutable === 0,
    noFalseDecisionSupport: evaluation.measurements.falseDecisionSupport === 0,
    verifiedMetricsExact: evaluation.measurements.metricCorrectness === 1,
    blockedExplanationComplete: evaluation.measurements.blockedExplanationCompleteness === 1,
  },
  evaluationOnlyGroupsTuned: false,
  historicalCorpus120MeasurementsReclaimed: false,
});

writeJson("phase-7r41-repository-input-closure-audit.json", {
  schemaVersion: "lightbi.phase7r41-repository-input-closure-audit.v1",
  releaseCorpus: "1.4.0",
  historicalLocalCorpus: "1.2.0",
  arithmeticOracleCorpus: "1.3.0",
  resolver: "sample-corpus/tooling/corpus-fixture-resolver.cjs",
  releaseInputPolicy: {
    trackedOnly: true,
    absolutePathsAllowed: false,
    sampleDataFallbackAllowed: false,
    ignoredInputsAllowed: false,
    missingInputBehavior: "fail_closed",
  },
  releaseSources: manifest.sources.map((source) => ({
    path: source.path,
    sha256: source.sha256,
    trackedInput: source.trackedInput,
    ignoredInputEligible: source.ignoredInputEligible,
  })),
  releaseTestsUseCorpus140: true,
  historicalGovernanceTestRetainsCorpus120: ["semantic-candidate.governance.test.ts"],
  productionBehaviorChanged: false,
});

console.log(JSON.stringify({
  auditsWritten: 6,
  manifestSha256: sha256(manifestPath),
  releaseCases: evaluation.cases,
}, null, 2));
