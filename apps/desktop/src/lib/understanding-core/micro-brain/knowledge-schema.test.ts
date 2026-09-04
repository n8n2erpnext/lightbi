import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { MicroBrainKnowledgeCardV1, MicroBrainKnowledgeCorpusV1 } from "./contracts";
import { validateMicroBrainKnowledgeCard, validateMicroBrainKnowledgeCorpus } from "./knowledge-schema";

const KNOWLEDGE_DIR = path.resolve(process.cwd(), "src/lib/understanding-core/micro-brain/knowledge");

function loadCorpus(): { manifest: any; corpus: MicroBrainKnowledgeCorpusV1 } {
  const manifest = JSON.parse(fs.readFileSync(path.join(KNOWLEDGE_DIR, "manifest.v1.json"), "utf8"));
  const cards = manifest.files.flatMap((fileName: string) =>
    JSON.parse(fs.readFileSync(path.join(KNOWLEDGE_DIR, fileName), "utf8")) as MicroBrainKnowledgeCardV1[],
  );
  return {
    manifest,
    corpus: {
      schemaVersion: "lightbi.micro-brain.corpus.v1",
      corpusId: manifest.corpusId,
      version: manifest.version,
      maturityLabel: manifest.maturityLabel,
      description: manifest.maturityNote,
      cards,
    },
  };
}

describe("Micro Brain knowledge foundation", () => {
  it("validates the model-synthesized foundation corpus and frozen counts", () => {
    const { manifest, corpus } = loadCorpus();
    const result = validateMicroBrainKnowledgeCorpus(corpus);
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(corpus.cards).toHaveLength(248);
    expect(manifest.counts).toMatchObject({ canonicalBridges: 225, openConcepts: 23, guardedFormulas: 25, confusionPairs: 56 });
  });
  it("preserves high-risk negative knowledge and guarded formulas", () => {
    const { corpus } = loadCorpus();
    const byId = new Map(corpus.cards.map((card) => [card.id, card]));
    expect(byId.get("concept.cod_amount")?.negativeClues.join(" ")).toMatch(/not carrier revenue/i);
    expect(byId.get("concept.stock_on_hand")?.negativeClues.join(" ")).toMatch(/not movement flow/i);
    expect(byId.get("concept.gross_profit")?.formula?.requiredInputs).toEqual(["revenue", "cost_of_goods_sold"]);
    expect(byId.get("concept.safety_stock")?.canonicalSignal).toBeUndefined();
    expect(byId.get("concept.reorder_point")?.analysisClass).toBe("guarded_formula");
    expect(byId.get("concept.diagnosis")?.relatedDomains).toContain("healthcare");
  });

  it("fails closed on unknown canonical bridges and direct clue contradictions", () => {
    const { corpus } = loadCorpus();
    const base = structuredClone(corpus.cards[0]);
    const badBridge = { ...base, id: "concept.invalid_bridge", canonicalSignal: "not_a_real_signal" };
    expect(validateMicroBrainKnowledgeCard(badBridge).errors).toContain("unknown_canonical_signal:concept.invalid_bridge:not_a_real_signal");

    const contradiction = {
      ...base,
      id: "concept.direct_contradiction",
      positiveClues: ["same clue"],
      negativeClues: ["same clue"],
    };
    expect(validateMicroBrainKnowledgeCard(contradiction).errors)
      .toContain("direct_clue_contradiction:concept.direct_contradiction:same clue");
  });
});