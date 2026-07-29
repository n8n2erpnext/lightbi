import { describe, expect, it } from "vitest";
import {
  COMMERCE_DISTRIBUTION_DOMAIN_PACK_V1,
  DOMAIN_PACK_REGISTRY_V1,
  DomainPackRegistryV1,
  validateDomainPack,
} from "./domain-pack-registry";

describe("declarative domain pack registry", () => {
  it("registers the current commerce pack through the open registry", () => {
    const pack = DOMAIN_PACK_REGISTRY_V1.get("commerce_distribution_mvp");
    expect(pack).toEqual(COMMERCE_DISTRIBUTION_DOMAIN_PACK_V1);
    expect(pack?.metricIds).toContain("gross_profit");
    expect(pack?.perspectives.map((item) => item.id)).toEqual(expect.arrayContaining(["executive", "sales", "finance", "operations", "data_trust"]));
  });

  it("rejects undeclared signals and perspective metrics", () => {
    const result = validateDomainPack({
      schemaVersion: "lightbi.domain-pack.v1",
      id: "future_pack",
      version: "1.0.0",
      label: "Future",
      supportLevel: "detect_only",
      signalIds: ["not_in_the_registry"],
      metricIds: [],
      questionIds: [],
      perspectives: [{ id: "operator", label: "Operator", businessGoal: "Review", requiredMetricIds: ["missing_metric"] }],
      acceptanceCorpusIds: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      "unknown_semantic_signal:not_in_the_registry",
      "perspective_metric_not_declared:operator:missing_metric",
    ]));
  });

  it("keeps registration deterministic and refuses duplicate pack ids", () => {
    const registry = new DomainPackRegistryV1();
    registry.register(COMMERCE_DISTRIBUTION_DOMAIN_PACK_V1);
    expect(() => registry.register(COMMERCE_DISTRIBUTION_DOMAIN_PACK_V1)).toThrow("already registered");
  });
});
