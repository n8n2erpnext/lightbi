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
  "apps/desktop/src/lib/understanding-core/canonical-period-partition-boundary.ts",
  "apps/desktop/src/lib/understanding-core/governed-question-action-generator.ts",
  "apps/desktop/src/pages/Home.tsx",
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
        const relative = path.relative(ROOT, file).split(path.sep).join("/");
        if (MODULES.some((token) => source.includes(token)) && !AUTHORIZED_PHASE6_CONSUMERS.has(relative)) result.push(relative);
      }
    }
  };
  walk(path.join(ROOT, "apps/desktop/src"));
  return result.sort();
}

describe("Phase 5M3 runtime governance and import isolation", () => {
  it("freezes exactly nine governed metrics and six explicit operators", () => {
    expect(GOVERNED_RUNTIME_POLICY_V1.domainPackId).toBe("commerce_distribution_mvp");
    expect(GOVERNED_RUNTIME_POLICY_V1.metricIds).toEqual(GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1[0].governedMetricIds);
    expect(GOVERNED_RUNTIME_POLICY_V1.metricIds).toHaveLength(9);
    expect(new Set(Object.values(GOVERNED_RUNTIME_POLICY_V1.operators))).toEqual(new Set([
      "governed_sum", "governed_average", "governed_identity_count", "governed_source_row_count", "governed_point_in_time_snapshot_sum", "governed_revenue_minus_cost",
    ]));
    expect(governedRuntimePolicyHash()).toBe("0d2666545d20bd54fe4c2f3f7086e92c4fd32a63dd00ec1e2b81ed23b932605d");
  });

  it("keeps upstream policy identities unchanged", () => {
    expect(governedMetricPolicyHash()).toBe("389f209926cf7a62429c03c395b1f4c6a576b4ad16cacacb7162773352e22fd6");
    expect(questionActionPolicyHash()).toBe("840d387ff5150407a0e672e9128936f502e8da9a002937488c1e11ee01218c25");
    expect(GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1[0].lastValidatedPolicyIdentity).toBe("3efa22d2210d2160bf27b1e16ae00da6617c1227e15a8310adbf9b04606a25fd");
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
