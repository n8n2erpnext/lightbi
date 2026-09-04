import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DOMAIN_KNOWLEDGE_CATALOG_V1 } from "../../domain-knowledge-catalog";
import { SEMANTIC_SIGNAL_REGISTRY_V1, SUPPORTED_RUNTIME_BA_DOMAINS } from "../../semantic-registry";
import type { CompiledMicroBrainIndexV1, MicroBrainKnowledgeCardV1 } from "./contracts";
import { retrieveMicroBrainConcepts } from "./retrieval";

const ROOT = path.resolve(process.cwd(), "src/lib/understanding-core/micro-brain");
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "knowledge/manifest.v1.json"), "utf8"));
const cards = manifest.files.flatMap((fileName: string) =>
  JSON.parse(fs.readFileSync(path.join(ROOT, "knowledge", fileName), "utf8")) as MicroBrainKnowledgeCardV1[],
);
const index = JSON.parse(fs.readFileSync(path.join(ROOT, "compiled/foundation.index.v1.json"), "utf8")) as CompiledMicroBrainIndexV1;
const supported = new Set<string>(SUPPORTED_RUNTIME_BA_DOMAINS);

function signals(query: string): Array<string | null> {
  return retrieveMicroBrainConcepts(index, { text: query, limit: 8 }).hits.map((hit) => hit.canonicalSignal);
}

describe("Micro Brain registry/domain alignment", () => {
  it("covers every canonical signal exposed to the six supported BA domains", () => {
    const eligible = [...new Set(SEMANTIC_SIGNAL_REGISTRY_V1
      .filter((definition) => definition.domains.some((domain) => supported.has(domain)))
      .map((definition) => definition.canonicalId))].sort();
    const bridged = new Set(cards.map((card) => card.canonicalSignal).filter(Boolean));
    expect(eligible).toHaveLength(368);
    expect(eligible.filter((signal) => !bridged.has(signal))).toEqual([]);
    expect(new Set(SEMANTIC_SIGNAL_REGISTRY_V1.map((definition) => definition.canonicalId)).size).toBe(370);
    expect(manifest.counts.registryAlignedCanonicalSignals).toBe(370);
  });

  it("adds one retrieval-only domain context card for every supported catalog", () => {
    const expected = DOMAIN_KNOWLEDGE_CATALOG_V1.filter((catalog) => supported.has(catalog.id));
    expect(expected).toHaveLength(6);
    for (const catalog of expected) {
      const card = cards.find((item) => item.id === `concept.domain_${catalog.id}`);
      expect(card?.analysisClass, catalog.id).toBe("descriptive");
      expect(card?.canonicalSignal, catalog.id).toBeUndefined();
      expect(card?.provenance.sourceType).toBe("lightbi_contract");
    }
  });

  it("preserves partial-registry evidence debt on generated fallback bridges", () => {
    const generated = cards.filter((card) => card.provenance.sourceType === "registry_augmentation");
    expect(generated.length).toBeGreaterThan(100);
    const partialIds = new Set(SEMANTIC_SIGNAL_REGISTRY_V1
      .filter((definition) => definition.coverageStatus === "partial")
      .map((definition) => definition.canonicalId));
    for (const card of generated.filter((item) => item.canonicalSignal && partialIds.has(item.canonicalSignal))) {
      expect(card.blockers, card.id).toContain("registry_partial_coverage_requires_contextual_evidence");
    }
  });

  it.each([
    ["Campaign Attempts", "campaign_attempts"],
    ["Previous Outcome", "previous_outcome"],
    ["KPI", "kpi"],
    ["Fiscal Year", "fiscal_year"],
    ["Voucher Payment", "payment_voucher"],
    ["Stock Threshold", "stock_threshold"],
  ])("recovers previously uncovered dictionary concept: %s", (query, expected) => {
    expect(signals(query), query).toContain(expected);
  });
});
