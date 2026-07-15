import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { questionActionPolicyHash } from "./commerce-distribution-question-policy";
import { GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1 } from "./domain-support-manifest";
import { governedMetricPolicyHash } from "./governed-metric-policy";
import { GOVERNED_RUNTIME_POLICY_V1, governedRuntimePolicyHash } from "./governed-runtime-policy";

const ROOT = path.resolve(__dirname, "../../../../..");
const CORE = path.join(ROOT, "apps/desktop/src/lib/understanding-core");
const DOCS = path.join(ROOT, "docs/architecture");
const AUDITS = [
  "phase-5m3-runtime-preflight-audit.json",
  "phase-5m3-query-plan-audit.json",
  "phase-5m3-corpus-execution-audit.json",
  "phase-5m3-ground-truth-comparison-audit.json",
  "phase-5m3-runtime-safety-audit.json",
  "phase-5m3-import-isolation-audit.json",
  "phase-5m3-migration-gate-audit.json",
] as const;
const MODULES = [
  "governed-runtime-contracts",
  "governed-runtime-policy",
  "governed-runtime-preflight",
  "governed-metric-query-planner",
  "governed-metric-executor",
  "governed-local-duckdb-boundary",
] as const;
const AUTHORIZED_PHASE6_CONSUMERS = new Set([
  "apps/desktop/src/lib/investigation-session.ts",
  "apps/desktop/src/lib/understanding-core/canonical-consumer-boundary.ts",
  "apps/desktop/src/pages/Investigation.tsx",
]);

function readAudit(name: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(path.join(DOCS, name), "utf8")) as Record<string, any>;
}

function productionImporters(): string[] {
  const result: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if ([".ts", ".tsx"].includes(path.extname(file)) && !file.includes(".test.") && !file.includes(".corpus.test.") && !MODULES.some((token) => file.endsWith(`${token}.ts`)) && !file.endsWith("governed-runtime-test-support.ts")) {
        const source = fs.readFileSync(file, "utf8");
        const relative = path.relative(ROOT, file);
        if (MODULES.some((token) => source.includes(token)) && !AUTHORIZED_PHASE6_CONSUMERS.has(relative)) result.push(relative);
      }
    }
  };
  walk(path.join(ROOT, "apps/desktop/src"));
  return result.sort();
}

describe("Phase 5M3 runtime governance and import isolation", () => {
  it("freezes exactly six governed metrics and four explicit operators", () => {
    expect(GOVERNED_RUNTIME_POLICY_V1.domainPackId).toBe("commerce_distribution_mvp");
    expect(GOVERNED_RUNTIME_POLICY_V1.metricIds).toEqual(GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1[0].governedMetricIds);
    expect(GOVERNED_RUNTIME_POLICY_V1.metricIds).toHaveLength(6);
    expect(new Set(Object.values(GOVERNED_RUNTIME_POLICY_V1.operators))).toEqual(new Set([
      "governed_sum", "governed_identity_count", "governed_point_in_time_snapshot_sum", "governed_revenue_minus_cost",
    ]));
    expect(governedRuntimePolicyHash()).toBe("9b5ef8acc2d6761b428b41713c4e0d87a9db3bb9c79d251e51026057d0ea00b4");
  });

  it("keeps upstream policy identities unchanged", () => {
    expect(governedMetricPolicyHash()).toBe("79b00e4aa7e97311da56db1f19a996c52c8034dc52da21b0dc6981dfd1282702");
    expect(questionActionPolicyHash()).toBe("9c8ce5e0904a95f70e80cb81bc79a4c52ba4729f4772a7e9a8d6e997da3d6cbb");
    expect(GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1[0].lastValidatedPolicyIdentity).toBe("7b18e323865c6058a780d5ef31527878a60c004a116ba600c95ec6a705b8f37c");
  });

  it("keeps all audits parseable, truthful, and closed to production authority", () => {
    for (const file of AUDITS) expect(() => readAudit(file), file).not.toThrow();
    expect(readAudit(AUDITS[0])).toMatchObject({ runtimePolicyHash: governedRuntimePolicyHash(), positiveProbeCount: 10, negativeProbeCount: 20 });
    expect(readAudit(AUDITS[2])).toMatchObject({ controlledExecution: { executableActions: 6, executionSuccesses: 6, exactGroundTruthMatches: 6 }, realCorpusExecution: { executionPerformed: false } });
    expect(readAudit(AUDITS[4])).toMatchObject({ negativeProbeCount: 20, falseExecutableCases: 0, decisionUseAuthorized: false });
    expect(readAudit(AUDITS[6])).toMatchObject({ productionProjectionEligible: false, phase5M4Eligible: false, phase6CutoverEligible: false });
  });

  it("has no importer outside the governed Phase 6 consumer, barrel export, or legacy aggregation authorization", () => {
    expect(productionImporters()).toEqual([]);
    const barrel = fs.readFileSync(path.join(CORE, "index.ts"), "utf8");
    expect(MODULES.some((token) => barrel.includes(token))).toBe(false);
    const implementation = MODULES.map((token) => fs.readFileSync(path.join(CORE, `${token}.ts`), "utf8")).join("\n");
    for (const forbidden of ["from \"../numeric-health-gate\"", "from \"./aggregation-guard-shadow", "understanding-next", "domain-ba-playbooks", "Home.tsx", "Investigation.tsx"]) {
      expect(implementation).not.toContain(forbidden);
    }
    expect(GOVERNED_RUNTIME_POLICY_V1.forbiddenBehavior).toContain("legacy_isSafeForSum_authorization");
    expect(implementation).toContain("decisionUseAuthorized: false");
    expect(implementation).toContain("productionWiring: { executed: false }");
  });
});
