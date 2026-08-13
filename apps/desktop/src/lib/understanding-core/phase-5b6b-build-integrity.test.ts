import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../../../..");
const DOCS = path.join(ROOT, "docs/architecture");
const CORE = path.join(ROOT, "apps/desktop/src/lib/understanding-core");

type JsonObject = Record<string, unknown>;

function object(value: unknown, label: string): JsonObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`PHASE_5B6B_EXPECTED_OBJECT:${label}`);
  }
  return value as JsonObject;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`PHASE_5B6B_EXPECTED_ARRAY:${label}`);
  return value;
}

function readAudit(name: string): JsonObject {
  return object(JSON.parse(fs.readFileSync(path.join(DOCS, name), "utf8")), name);
}

function sha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

describe("Phase 5B6B build integrity and baseline governance", () => {
  it("owns and resolves the preserved set of 28 diagnostics", () => {
    const audit = readAudit("phase-5b6b-diagnostic-ownership-audit.json");
    const diagnostics = array(audit.diagnostics, "diagnostics").map((entry, index) => object(entry, `diagnostic-${index}`));
    const summary = object(audit.summary, "diagnostic-summary");

    expect(diagnostics).toHaveLength(28);
    expect(new Set(diagnostics.map((entry) => entry.id)).size).toBe(28);
    expect(diagnostics.every((entry) => typeof entry.owningPhase === "string" && entry.owningPhase !== "earlier canonical/Phase 5 source")).toBe(true);
    expect(diagnostics.every((entry) => entry.finalDisposition !== "unresolved")).toBe(true);
    expect(summary).toMatchObject({
      ownedDiagnostics: 28,
      unownedDiagnostics: 0,
      resolvedDiagnostics: 28,
      diagnosticOwnershipComplete: true,
    });
  });

  it("governs baseline debt by exact test identity and failure class", () => {
    const allowlist = readAudit("phase-5b6b-regression-baseline-allowlist.v1.json");
    const entries = array(allowlist.tests, "allowlist-tests").map((entry, index) => object(entry, `allowlist-${index}`));
    const identities = entries.map((entry) => `${entry.file}|${entry.fullTestName}`);
    const deterministic = entries.filter((entry) => entry.class === "deterministic");
    const timingSensitive = entries.filter((entry) => entry.class === "timing_sensitive");

    expect(entries).toHaveLength(9);
    expect(new Set(identities).size).toBe(9);
    expect(deterministic).toHaveLength(6);
    expect(timingSensitive).toHaveLength(3);
    expect(deterministic.every((entry) => entry.expectedFailureType === "assertion")).toBe(true);
    expect(timingSensitive.every((entry) => entry.expectedFailureType === "timeout_only")).toBe(true);
    expect(entries.every((entry) => entry.ownership !== "phase_5b6b_owned")).toBe(true);
  });

  it("preserves frozen policy and artifact bytes", () => {
    const audit = readAudit("phase-5b6b-semantic-preservation-audit.json");
    const policies = array(audit.frozenPolicySourceHashes, "policy-hashes").map((entry, index) => object(entry, `policy-${index}`));
    const artifacts = array(audit.frozenArtifacts, "artifact-hashes").map((entry, index) => object(entry, `artifact-${index}`));

    for (const policy of policies) {
      expect(policy.before).toBe(policy.after);
      expect(sha256(path.join(CORE, String(policy.file)))).toBe(policy.after);
    }
    for (const artifact of artifacts) {
      expect(artifact.byteIdentical).toBe(true);
      expect(sha256(path.join(DOCS, String(artifact.file)))).toBe(artifact.sha256);
    }
    expect(audit.frozenPolicyIdentityPreserved).toBe(true);
    expect(audit.canonicalArtifactSemanticsPreserved).toBe(true);
  });

  it("keeps import and authority boundaries unchanged", () => {
    const isolation = readAudit("phase-5b6b-import-isolation-audit.json");
    const migration = readAudit("phase-5b6b-migration-gate-audit.json");
    const build = readAudit("phase-5b6b-build-restoration-audit.json");

    expect(sha256(path.join(CORE, "index.ts"))).toBe("70df668ca5b7d9f4e14d5bd9946a89215036ebfc54bd73e247b0f6374d10bc12");
    expect(array(isolation.newProductionImporters, "new-production-importers")).toEqual([]);
    expect(array(isolation.newBarrelExports, "new-barrel-exports")).toEqual([]);
    expect(isolation.shadowImportIsolationPreserved).toBe(true);
    expect(build.typescriptBuildIntegrityEstablished).toBe(true);
    expect(migration).toMatchObject({
      authenticRuntimePlanReplayAvailable: false,
      actualPlanBindingCoverageComplete: false,
      actualSqlPreviewBindingCoverageComplete: false,
      previewResultIdentitySafe: false,
      productionProjectionEligible: false,
      authorityMigrationEvidenceSufficientForPhase5CPlanning: false,
      canonicalAuthorityMigrationEligible: false,
    });
  });

  it("adds no diagnostic suppression or compiler escape hatch", () => {
    const files = [
      "aggregation-guard-shadow.ts",
      "canonical-runtime-adapter.ts",
      "canonical-runtime-adapter.corpus.test.ts",
      "contextual-evidence-aggregator.ts",
      "contextual-evidence.corpus.test.ts",
      "grain-candidate-engine.ts",
      "grain-candidate.corpus.test.ts",
      "grain-resolution-validation.ts",
      "grain-resolver.ts",
      "legacy-canonical-comparison.ts",
      "legacy-canonical-comparison.corpus.test.ts",
      "paired-legacy-replay-contracts.ts",
      "readiness-engine.ts",
      "relationship-candidate-contracts.ts",
      "relationship-candidate-engine.ts",
      "relationship-resolution-contracts.ts",
      "relationship-resolver.ts",
      "semantic-candidate-engine.ts",
      "semantic-resolution.corpus.test.ts",
      "semantic-resolver.ts"
    ];
    const source = files.map((file) => fs.readFileSync(path.join(CORE, file), "utf8")).join("\n");

    expect(source).not.toMatch(/@ts-ignore|@ts-expect-error|eslint-disable|skipLibCheck/);
  });
});
