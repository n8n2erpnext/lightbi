import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const DIR = path.resolve(process.cwd(), "src/lib/understanding-core/micro-brain");
const ROOT = path.resolve(process.cwd(), "../..");
const acceptance = JSON.parse(fs.readFileSync(path.join(DIR, "baseline/mb7-acceptance.v1.json"), "utf8"));
const benchmarkPath = path.join(DIR, "baseline/mb7-active-core-benchmark.v1.json");
const oraclePath = path.join(ROOT, "docs/architecture/phase-7r34-independent-oracle-results.json");
const indexPath = path.join(DIR, "compiled/foundation.index.v1.json");
const sha256 = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

describe("MB-7 acceptance evidence integrity", () => {
  it("binds the accepted benchmark, oracle and compiled index identities", () => {
    expect(acceptance.schemaVersion).toBe("lightbi.micro-brain.mb7-acceptance.v1");
    expect(acceptance.acceptance.state).toBe("source_acceptance_complete_cutover_review_passed_production_not_deployed");
    expect(acceptance.acceptance.productionDeploymentExecuted).toBe(false);
    expect(acceptance.acceptance.productionAuthorityChanged).toBe(false);
    expect(acceptance.acceptance.decisionUseAuthorityExpanded).toBe(false);
    expect(acceptance.activeCoreBenchmark.artifactSha256).toBe(sha256(benchmarkPath));
    expect(acceptance.oracle.artifactSha256).toBe(sha256(oraclePath));
    expect(acceptance.determinism.indexByteSha256).toBe(sha256(indexPath));
  });

  it("records only the three governed ETA recoveries and no confirmed regression", () => {
    expect(acceptance.activeCoreBenchmark.confirmedRegressions).toEqual([]);
    expect(acceptance.activeCoreBenchmark.semanticDifferences).toHaveLength(3);
    for (const difference of acceptance.activeCoreBenchmark.semanticDifferences) {
      expect(difference.physicalColumn).toBe("Thời gian dự kiến đến");
      expect(difference.beforeState).toBe("unknown");
      expect(difference.beforeSelected).toBeNull();
      expect(difference.afterState).toBe("probable");
      expect(difference.afterSelected).toBe("eta");
    }
  });
});
