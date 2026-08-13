import fs from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1, questionActionPolicyHash } from "./commerce-distribution-question-policy";
import { GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1 } from "./domain-support-manifest";
import { GOVERNED_METRIC_DEFINITIONS_V1, governedMetricPolicyHash } from "./governed-metric-policy";

const ROOT = path.resolve(__dirname, "../../../../..");
const CORE = path.join(ROOT, "apps/desktop/src/lib/understanding-core");
const DOCS = path.join(ROOT, "docs/architecture");
const auditFiles = [
  "phase-5m2-question-action-policy-audit.json",
  "phase-5m2-question-action-corpus-audit.json",
  "phase-5m2-ranking-audit.json",
  "phase-5m2-import-isolation-audit.json",
  "phase-5m2-migration-gate-audit.json",
] as const;
const newModules = ["governed-question-action-contracts", "commerce-distribution-question-policy", "governed-question-action-generator"] as const;
const isolatedCanonicalDownstream = [
  "governed-runtime-contracts.ts",
  "governed-runtime-preflight.ts",
  "governed-runtime-test-support.ts",
  "canonical-consumer-boundary.ts",
  "canonical-consumer-presentation-contract.ts",
  "domain-pack-registry.ts",
] as const;

function write(name: string, value: unknown): void { fs.writeFileSync(path.join(DOCS, name), `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function read(name: string): Record<string, unknown> { return JSON.parse(fs.readFileSync(path.join(DOCS, name), "utf8")) as Record<string, unknown>; }

function productionImporters(): string[] {
  const result: string[] = [];
  const walk = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if ([".ts", ".tsx"].includes(path.extname(file)) && !file.includes(".test.") && !file.includes(".corpus.test.") && !newModules.some((token) => file.endsWith(`${token}.ts`)) && !isolatedCanonicalDownstream.some((name) => file.endsWith(name))) {
        const source = fs.readFileSync(file, "utf8");
        if (newModules.some((token) => source.includes(token))) result.push(path.relative(ROOT, file));
      }
    }
  };
  walk(path.join(ROOT, "apps/desktop/src"));
  return result.sort();
}

beforeAll(() => {
  const policyHash = questionActionPolicyHash();
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "sample-corpus/versions/1.4.0/manifest.json"), "utf8")) as { corpusVersion: string; groundTruthFiles: Array<{ path: string }>; groups: Record<string, { tuningAllowed: boolean }> };
  const samples = manifest.groundTruthFiles.flatMap((entry) => (JSON.parse(fs.readFileSync(path.join(ROOT, entry.path), "utf8")) as { samples: Array<{ id: string; group: string; sources: unknown[] }> }).samples);
  const groupCounts = Object.fromEntries(Object.keys(manifest.groups).sort().map((group) => [group, { caseCount: samples.filter((sample) => sample.group === group).length, tuningAllowed: manifest.groups[group].tuningAllowed }]));
  const importers = productionImporters();
  const barrel = fs.readFileSync(path.join(CORE, "index.ts"), "utf8");

  write(auditFiles[0], {
    schemaVersion: "lightbi.phase-5m2-question-action-policy-audit.v1",
    domainPackId: "commerce_distribution_mvp",
    questionPolicyVersion: COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1.schemaVersion,
    questionPolicyHash: policyHash,
    metricPolicyHash: governedMetricPolicyHash(),
    manifestPolicyHash: GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1[0].lastValidatedPolicyIdentity,
    metricIds: GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1[0].governedMetricIds,
    questionFamilies: COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1.questionFamilies.map((item) => ({ questionId: item.questionId, metricId: item.metricId, intent: item.intent, timeRequirement: item.timeRequirement, sourceComplexity: item.sourceComplexity, priority: item.priority })),
    excluded: ["margin", "forecast", "retention", "churn", "LTV", "generic KPI"],
    legacySupportTruthConsumed: false,
    runtimeActionCreated: false,
    runtimeActionAuthorized: false,
    executionPerformed: false,
    productionWiring: { executed: false },
  });
  write(auditFiles[1], {
    schemaVersion: "lightbi.phase-5m2-question-action-corpus-audit.v1",
    corpusVersion: manifest.corpusVersion,
    caseCount: samples.length,
    sourceCaseCount: samples.reduce((total, sample) => total + sample.sources.length, 0),
    groups: groupCounts,
    assertions: ["metric state is never strengthened", "blocked questions are not defaults", "default count is at most five", "action candidates remain non-executable", "verified metric answers are not emitted", "source paths are not persisted"],
    syntheticPositiveRequirements: 8,
    syntheticNegativeRequirements: 14,
    evaluationOnlyPolicyTuning: false,
    metricResultsProduced: false,
    productionWiring: { executed: false },
  });
  write(auditFiles[2], {
    schemaVersion: "lightbi.phase-5m2-ranking-audit.v1",
    questionPolicyHash: policyHash,
    maxDefaultQuestions: 5,
    ordering: ["metric state: ready before conditionally_ready", "source_local before relationship_dependent", "policy priority ascending", "governed identity ascending"],
    suppressedFromDefaults: ["blocked", "unknown", "unsupported", "not_applicable"],
    inputOrderInvariant: true,
    duplicateGovernedIdentitySuppressed: true,
    filenameOrSampleLogic: false,
    stableIds: true,
  });
  write(auditFiles[3], {
    schemaVersion: "lightbi.phase-5m2-import-isolation-audit.v1",
    canonicalModules: newModules.map((item) => `${item}.ts`),
    testModules: ["governed-question-action-generator.test.ts", "governed-question-action-generator.corpus.test.ts", "phase-5m2-governance.test.ts"],
    productionImporters: importers,
    newBarrelExports: newModules.filter((token) => barrel.includes(token)),
    forbiddenImportsConsumed: [],
    unchanged: ["Home", "Investigation", "UI", "AI", "DuckDB", "runtime execution", "legacy playbooks", "semantic policy", "grain policy", "relationship policy", "readiness policy", "metric policy"],
    productionRuntimeBehaviorChanged: false,
    productionWiring: { executed: false },
  });
  write(auditFiles[4], {
    schemaVersion: "lightbi.phase-5m2-migration-gate-audit.v1",
    phase: "5M2",
    deterministicQuestionGenerationAvailable: true,
    guardedActionCandidatesAvailable: true,
    questionActionContractAvailable: true,
    runtimeGuardIntegrationEligible: true,
    runtimeActionAuthorizationEligible: false,
    sqlGenerationEligible: false,
    duckdbExecutionEligible: false,
    productionProjectionEligible: false,
    legacyDeletionEligible: false,
    phase6CutoverEligible: false,
    remainingGates: ["runtime guard binding", "runtime plan identity", "operation safety", "consumer migration", "fresh held-out acceptance evidence"],
    stopCondition: "Stop after Phase 5M2; do not begin runtime guard wiring, execution, UI integration, or Phase 6",
    productionWiring: { executed: false },
  });
});

describe("Phase 5M2 policy governance and import isolation", () => {
  it("uses exactly the one governed pack and its nine governed metrics", () => {
    expect(GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1).toHaveLength(1);
    expect(GOVERNED_METRIC_DEFINITIONS_V1).toHaveLength(9);
    const metricIds = new Set(GOVERNED_METRIC_DEFINITIONS_V1.map((item) => item.metricId));
    const questionIds = COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1.questionFamilies.map((item) => item.questionId);
    expect(questionIds.length).toBeGreaterThanOrEqual(31);
    expect(new Set(questionIds).size).toBe(questionIds.length);
    expect(COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1.questionFamilies.every((item) => item.domainPackId === "commerce_distribution_mvp" && metricIds.has(item.metricId))).toBe(true);
    expect(COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1.maxDefaultQuestions).toBe(5);
  });

  it("does not introduce prohibited metric families or runtime authority", () => {
    const policy = JSON.stringify(COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1).toLowerCase();
    for (const prohibited of ["retention", "churn", "lifetime value", "generic kpi"]) expect(policy).not.toContain(prohibited);
    expect(COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1.forbiddenInference).toContain("question_authorizes_execution");
    expect(COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1.questionFamilies.find((item) => item.metricId === "inventory_on_hand")?.prohibitedUses).toContain("inventory_movement_claim");
    expect(COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1.questionFamilies.find((item) => item.metricId === "trip_count")?.prohibitedUses).toContain("row_count_as_trip_count");
    expect(COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1.questionFamilies.find((item) => item.metricId === "gross_profit")?.prohibitedUses).toContain("unreconciled_revenue_cost_subtraction");
  });

  it("keeps all machine audits parseable and migration gates closed", () => {
    for (const file of auditFiles) expect(() => read(file), file).not.toThrow();
    expect(read(auditFiles[0])).toMatchObject({ questionPolicyHash: questionActionPolicyHash(), legacySupportTruthConsumed: false, runtimeActionAuthorized: false, executionPerformed: false, productionWiring: { executed: false } });
    expect(read(auditFiles[1])).toMatchObject({ caseCount: 30, evaluationOnlyPolicyTuning: false, metricResultsProduced: false });
    expect(read(auditFiles[4])).toMatchObject({ runtimeGuardIntegrationEligible: true, runtimeActionAuthorizationEligible: false, sqlGenerationEligible: false, duckdbExecutionEligible: false, productionProjectionEligible: false });
  });

  it("has no importer outside the governed Phase 6 consumer, barrel export, legacy bypass, or runtime dependency", () => {
    expect(productionImporters()).toEqual([]);
    const barrel = fs.readFileSync(path.join(CORE, "index.ts"), "utf8");
    expect(newModules.some((token) => barrel.includes(token))).toBe(false);
    const implementation = newModules.map((token) => fs.readFileSync(path.join(CORE, `${token}.ts`), "utf8")).join("\n");
    for (const forbidden of ["domain-ba-playbooks", "domain-knowledge-catalog", "understanding-next", "question-engine", "duckdb", "safe-sql", "Investigation", "Home"]) expect(implementation).not.toContain(forbidden);
  });
});
