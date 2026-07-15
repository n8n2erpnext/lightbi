import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalJson, deterministicPolicySha256 } from "./contextual-evidence-policy";
import { DOMAIN_SUPPORT_MANIFEST, GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1 } from "./domain-support-manifest";
import { GOVERNED_METRIC_DEFINITIONS_V1, GOVERNED_METRIC_POLICY_V1, governedMetricPolicyHash } from "./governed-metric-policy";

const ROOT = path.resolve(__dirname, "../../../../..");
const DOCS = path.join(ROOT, "docs/architecture");
const CORE = path.join(ROOT, "apps/desktop/src/lib/understanding-core");
const auditFiles = [
  "phase-5m1-domain-ownership-audit.json",
  "phase-5m1-commerce-pack-activation-audit.json",
  "phase-5m1-governed-metric-catalog.json",
  "phase-5m1-metric-preflight-corpus-audit.json",
  "phase-5m1-metric-ground-truth-audit.json",
  "phase-5m1-domain-metric-policy-audit.json",
  "phase-5m1-import-isolation-audit.json",
  "phase-5m1-migration-gate-audit.json",
] as const;

function read(name: string): Record<string, unknown> { return JSON.parse(fs.readFileSync(path.join(DOCS, name), "utf8")) as Record<string, unknown>; }

describe("Phase 5M1 governance, preservation, and import isolation", () => {
  it("keeps the Phase 0 compatibility manifest empty while adding exactly one governed conditional pack", () => {
    expect(DOMAIN_SUPPORT_MANIFEST).toEqual([]);
    expect(GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1).toHaveLength(1);
    const pack = GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1[0];
    expect(pack.packId).toBe("commerce_distribution_mvp");
    expect(pack.packStatus).toBe("conditional");
    expect(pack.productionActive).toBe(false);
    expect(pack.lastValidatedPolicyIdentity).toBe("7b18e323865c6058a780d5ef31527878a60c004a116ba600c95ec6a705b8f37c");
  });

  it("has complete immutable definitions and no execution authority", () => {
    expect(GOVERNED_METRIC_DEFINITIONS_V1).toHaveLength(6);
    expect(new Set(GOVERNED_METRIC_DEFINITIONS_V1.map((metric) => metric.metricId)).size).toBe(6);
    for (const metric of GOVERNED_METRIC_DEFINITIONS_V1) {
      expect(metric.requirements.length).toBeGreaterThan(0);
      expect(metric.requiredReadinessCapabilities.length).toBeGreaterThan(0);
      expect(metric.duplicateHandling).toBeTruthy();
      expect(metric.repeatedParentHandling).toBeTruthy();
      expect(metric.snapshotHandling).toBeTruthy();
      expect(metric.nullHandling).toBeTruthy();
      expect(metric.unitBehavior).toBeTruthy();
      expect(metric.currencyBehavior).toBeTruthy();
      expect(metric.executionAuthorization).toBe(false);
    }
    expect(governedMetricPolicyHash()).toBe("79b00e4aa7e97311da56db1f19a996c52c8034dc52da21b0dc6981dfd1282702");
    expect(GOVERNED_METRIC_POLICY_V1.forbiddenInference).toContain("numeric_parse_establishes_measure");
  });

  it("parses all eight machine-readable audits and keeps their gates closed", () => {
    for (const name of auditFiles) expect(() => read(name), name).not.toThrow();
    expect(read("phase-5m1-import-isolation-audit.json")).toMatchObject({ newProductionImporters: [], newBarrelExports: [], productionRuntimeBehaviorChanged: false, productionWiring: { executed: false } });
    expect(read("phase-5m1-migration-gate-audit.json")).toMatchObject({ runtimeAuthorityMigrationEligible: false, productionProjectionEligible: false, duckdbMetricExecutionEligible: false, phase6CutoverEligible: false });
    expect(read("phase-5m1-metric-ground-truth-audit.json")).toMatchObject({ verifiedValuesModified: false, unverifiedValuesInvented: false, preflightProducesMetricValue: false });
  });

  it("has no production importer and does not export the new foundation from the frozen barrel", () => {
    const productionExtensions = new Set([".ts", ".tsx"]);
    const newModuleTokens = ["commerce-distribution-domain-pack", "governed-domain-metric-contracts", "governed-metric-policy", "governed-metric-preflight"];
    const importers: string[] = [];
    const walk = (directory: string): void => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (productionExtensions.has(path.extname(file)) && !file.includes(".test.") && !file.includes(".corpus.test.")) {
          const source = fs.readFileSync(file, "utf8");
          if (newModuleTokens.some((token) => source.includes(`understanding-core/${token}`))) importers.push(path.relative(ROOT, file));
        }
      }
    };
    walk(path.join(ROOT, "apps/desktop/src"));
    expect(importers).toEqual([]);
    const barrel = fs.readFileSync(path.join(CORE, "index.ts"), "utf8");
    expect(newModuleTokens.some((token) => barrel.includes(token))).toBe(false);
  });

  it("keeps hashes independent of formatting and sensitive runtime context", () => {
    expect(deterministicPolicySha256({ a: 1, b: 2 })).toBe(deterministicPolicySha256({ b: 2, a: 1 }));
    expect(deterministicPolicySha256({ ...GOVERNED_METRIC_POLICY_V1, rules: [...GOVERNED_METRIC_POLICY_V1.rules, { ruleId: "changed", description: "changed" }] })).not.toBe(governedMetricPolicyHash());
    const text = canonicalJson(GOVERNED_METRIC_POLICY_V1);
    expect(text).not.toContain("/home/");
    expect(text).not.toMatch(/createdAt|Date\.now|locale|environment/);
  });
});
