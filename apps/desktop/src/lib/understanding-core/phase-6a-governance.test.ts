import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { questionActionPolicyHash } from "./commerce-distribution-question-policy";
import { GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1 } from "./domain-support-manifest";
import { governedMetricPolicyHash } from "./governed-metric-policy";
import { governedRuntimePolicyHash } from "./governed-runtime-policy";

const ROOT = path.resolve(__dirname, "../../../../..");
const DOCS = path.join(ROOT, "docs/architecture");
const AUDITS = [
  "phase-6a-consumer-path-audit.json",
  "phase-6a-artifact-identity-audit.json",
  "phase-6a-home-cutover-audit.json",
  "phase-6a-investigation-cutover-audit.json",
  "phase-6a-legacy-reachability-audit.json",
  "phase-6a-end-to-end-audit.json",
  "phase-6a-import-isolation-audit.json",
  "phase-6a-migration-gate-audit.json",
] as const;

function read(name: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(path.join(DOCS, name), "utf8"));
}

describe("Phase 6A consumer cutover governance", () => {
  it("keeps all machine audits parseable and records the allowed classification", () => {
    for (const audit of AUDITS) expect(() => read(audit), audit).not.toThrow();
    expect(read("phase-6a-migration-gate-audit.json")).toMatchObject({
      singleArtifactIdentity: true,
      homeCutover: true,
      investigationCutoverForHomeSelectedPath: true,
      realGoldenEndToEnd: true,
      runtimeSafetyPreserved: true,
      legacyRetirementEligible: false,
      classification: "canonical_consumer_cutover_ready_with_documented_debt",
      decisionUseAuthorized: false,
      phase7Started: false,
    });
  });

  it("keeps Phase 5 policy identities frozen", () => {
    expect(GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1[0].lastValidatedPolicyIdentity).toBe("3efa22d2210d2160bf27b1e16ae00da6617c1227e15a8310adbf9b04606a25fd");
    expect(governedMetricPolicyHash()).toBe("26bd430cbca42fbb5a6c8fdf51f248fd40ebf9dc28bd29f458ee53d864de3f5c");
    expect(questionActionPolicyHash()).toBe("f623f6adbef180d69d78e1f5f185ff62517df9f8d7093788da48d92661c8c808");
    expect(governedRuntimePolicyHash()).toBe("0d2666545d20bd54fe4c2f3f7086e92c4fd32a63dd00ec1e2b81ed23b932605d");
  });

  it("keeps independent legacy and next detectors out of the selected Home path", () => {
    const home = fs.readFileSync(path.join(ROOT, "apps/desktop/src/pages/Home.tsx"), "utf8");
    for (const forbidden of [
      "business-signal-detector",
      "runGuidedInvestigationPipeline(",
      "createDatasetUnderstanding(",
      "createUnderstandingCoreResult(",
      "adaptCoreToUnderstandingNext(",
      "generateAIBriefingFromUnderstandingNext(",
    ]) expect(home).not.toContain(forbidden);
    expect(home.match(/getOrBuildCanonicalConsumerArtifact\(/g)).toHaveLength(1);
    expect(home).toContain("const datasetRows = canonicalRows");
    expect(home).toContain("rows: canonicalRows");
    const boundary = fs.readFileSync(path.join(ROOT, "apps/desktop/src/lib/understanding-core/canonical-consumer-boundary.ts"), "utf8");
    expect(boundary).not.toContain("understanding-next");
    const adapter = fs.readFileSync(path.join(ROOT, "apps/desktop/src/lib/canonical-consumer-presentation-adapter.ts"), "utf8");
    expect(adapter.toLowerCase()).toContain("compatibility");
    expect(adapter).not.toContain("createDatasetUnderstanding");
    expect(adapter).not.toContain("runGuidedInvestigationPipeline");
  });

  it("keeps AI bounded and canonical Investigation execution fail closed", () => {
    const ai = fs.readFileSync(path.join(ROOT, "apps/desktop/src/lib/canonical-ai-briefing.ts"), "utf8");
    expect(ai).not.toContain("rawRows");
    expect(ai).not.toContain("aggregationOperator");
    const investigation = fs.readFileSync(path.join(ROOT, "apps/desktop/src/pages/Investigation.tsx"), "utf8");
    expect(investigation).toContain("if (!canonicalHandoff || canonicalHandoff.queryPlanning.state !== 'planned')");
    expect(investigation).toContain("executeGovernedMetricRequest");
    expect(investigation).not.toContain("executeBackendPreview({");
    expect(investigation).not.toContain("executeDuckDBPreviewSandbox({");
  });
});
