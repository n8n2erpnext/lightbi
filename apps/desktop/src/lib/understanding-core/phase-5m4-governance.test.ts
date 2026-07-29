import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../../../..");
const CORE = path.join(ROOT, "apps/desktop/src/lib/understanding-core");
const DOCS = path.join(ROOT, "docs/architecture");
const AUDITS = [
  "phase-5m4-real-golden-blocker-audit.json",
  "phase-5m4-real-golden-execution-audit.json",
  "phase-5m4-corpus-regression-audit.json",
  "phase-5m4-phase5-acceptance-audit.json",
  "phase-5m4-import-isolation-audit.json",
  "phase-5m4-final-gate-audit.json",
] as const;
const MODULES = [
  "commerce-distribution-domain-pack",
  "governed-metric-preflight",
  "governed-question-action-generator",
  "governed-runtime-preflight",
  "governed-metric-query-planner",
  "governed-metric-executor",
] as const;
const AUTHORIZED_PHASE6_CONSUMERS = new Set([
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
      else if ([".ts", ".tsx"].includes(path.extname(file)) && !file.includes(".test.") && !file.startsWith(CORE)) {
        const source = fs.readFileSync(file, "utf8");
        const relative = path.relative(ROOT, file).split(path.sep).join("/");
        if (MODULES.some((token) => source.includes(token)) && !AUTHORIZED_PHASE6_CONSUMERS.has(relative)) result.push(relative);
      }
    }
  };
  walk(path.join(ROOT, "apps/desktop/src"));
  return result.sort();
}

describe("Phase 5M4 acceptance closure governance", () => {
  it("keeps every machine audit parseable and truthful", () => {
    for (const audit of AUDITS) expect(() => readAudit(audit), audit).not.toThrow();
    expect(readAudit(AUDITS[0])).toMatchObject({ rootCauseClassification: "generic_semantic_binding_defect", decisionUseAuthorized: false, productionWiring: { executed: false } });
    expect(readAudit(AUDITS[1])).toMatchObject({ execution: { engine: "duckdb", performed: true, actual: 22973896244 }, groundTruthComparison: { state: "exact_match", expected: 22973896244, actual: 22973896244, comparisonTiming: "post_execution_only" } });
    expect(readAudit(AUDITS[2])).toMatchObject({ caseCount: 30, regressions: 0, falseExecutableCases: 0, holdoutOrAdversarialTuning: false });
    expect(readAudit(AUDITS[3])).toMatchObject({ passCount: 12, failCount: 0, phase6CutoverExecuted: false });
  });

  it("retains metric safety and authority restrictions", () => {
    const blocker = readAudit(AUDITS[0]);
    const execution = readAudit(AUDITS[1]);
    expect(blocker.rootCause.thresholdLowered).toBe(false);
    expect(blocker.rootCause.safetyRuleWeakened).toBe(false);
    expect(blocker.realGoldenAfterCorrection.grain.safeToAggregate).toBe(false);
    expect(execution.queryPlan).toMatchObject({ operator: "governed_sum", silentFallbackUsed: false, expectedValueUsedForPlanning: false });
    expect(execution.decisionUseAuthorized).toBe(false);
    expect(execution.productionWiring.executed).toBe(false);
  });

  it("has no ungoverned Phase 5 production importer or barrel export", () => {
    expect(productionImporters()).toEqual([]);
    const barrel = fs.readFileSync(path.join(CORE, "index.ts"), "utf8");
    expect(MODULES.filter((token) => barrel.includes(token))).toEqual([]);
    expect(readAudit(AUDITS[4])).toMatchObject({ productionImporters: [], barrelExports: [], phase6CutoverExecuted: false });
  });

  it("uses one allowed final classification and never claims cutover execution", () => {
    const finalGate = readAudit(AUDITS[5]);
    expect([
      "phase5_core_ready_for_phase6_cutover",
      "phase5_core_ready_with_documented_debt",
      "not_ready_final_regression_verification",
    ]).toContain(finalGate.classification);
    expect(finalGate.decisionUseAuthorized).toBe(false);
    expect(finalGate.productionWiring.executed).toBe(false);
  });
});
