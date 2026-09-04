import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "../../semantic-registry";

const BASELINE_PATH = path.resolve(process.cwd(), "src/lib/understanding-core/micro-brain/baseline/mb0-baseline.v1.json");
const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));

function normalizeAlias(value: string): string {
  return value.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

function collisionCount(field: "aliases" | "headerAliases"): number {
  const bySurface = new Map<string, Set<string>>();
  for (const signal of SEMANTIC_SIGNAL_REGISTRY_V1) {
    for (const alias of signal[field]) {
      const surface = normalizeAlias(alias);
      const ids = bySurface.get(surface) ?? new Set<string>();
      ids.add(signal.canonicalId);
      bySurface.set(surface, ids);
    }
  }
  return [...bySurface.values()].filter((ids) => ids.size > 1).length;
}

describe("Micro Brain MB-0 frozen baseline", () => {
  it("matches the accepted RC semantic registry identity", () => {
    expect(SEMANTIC_SIGNAL_REGISTRY_V1).toHaveLength(baseline.semanticRegistry.signalCount);
    expect(collisionCount("aliases")).toBe(baseline.semanticRegistry.normalizedAliasCollisions);
    expect(collisionCount("headerAliases")).toBe(baseline.semanticRegistry.normalizedHeaderAliasCollisions);
  });
  it("records the conservative resolver zero point and support boundary", () => {
    expect(baseline.resolverCorpus).toMatchObject({
      caseCount: 30,
      physicalColumnCount: 752,
      headerOnlyCollisionCases: 84,
      stateCounts: { confirmed: 47, probable: 353, ambiguous: 160, unknown: 191, technical: 1, unsupported_input: 0 },
    });
    expect(baseline.domainSupport).toMatchObject({
      packId: "commerce_distribution_mvp",
      packStatus: "conditional",
      productionActive: false,
    });
  });

  it("records that MB-5 exposes Micro Brain through the production core boundary", () => {
    const coreIndex = fs.readFileSync(path.resolve(process.cwd(), "src/lib/understanding-core/index.ts"), "utf8");
    expect(coreIndex.match(/export \* from "\.\/micro-brain";/g)).toHaveLength(1);
    expect(coreIndex).not.toContain("retrieveMicroBrainConcepts(");
  });
});