import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import foundationIndexRaw from "./compiled/foundation.index.v1.json?raw";
import presentationIndexRaw from "./compiled/presentation.index.v1.json?raw";
import type { MicroBrainKnowledgeCardV1, MicroBrainKnowledgeCorpusV1 } from "./contracts";
import { getBuiltInMicroBrainPresentationIndex } from "./built-in-index";
import { validateMicroBrainKnowledgeCorpus } from "./knowledge-schema";
import { adviseMicroBrainPresentation } from "./presentation-advisor";

const PRESENTATION_KNOWLEDGE_DIR = path.resolve(process.cwd(), "src/lib/understanding-core/micro-brain/presentation-knowledge");

function loadPresentationCorpus(): MicroBrainKnowledgeCorpusV1 {
  const manifest = JSON.parse(fs.readFileSync(path.join(PRESENTATION_KNOWLEDGE_DIR, "manifest.v1.json"), "utf8"));
  const cards = manifest.files.flatMap((fileName: string) =>
    JSON.parse(fs.readFileSync(path.join(PRESENTATION_KNOWLEDGE_DIR, fileName), "utf8")) as MicroBrainKnowledgeCardV1[],
  );
  return { ...manifest, cards } as MicroBrainKnowledgeCorpusV1;
}

describe("Micro Brain presentation lobe", () => {
  it("validates the presentation source corpus before compilation", () => {
    const corpus = loadPresentationCorpus();
    const validation = validateMicroBrainKnowledgeCorpus(corpus);
    expect(validation.errors).toEqual([]);
    expect(validation.valid).toBe(true);
    expect(corpus.cards).toHaveLength(88);
  });

  it("is bounded, advisory-only and broad enough for common domains", () => {
    const index = getBuiltInMicroBrainPresentationIndex();
    const byKind = new Map<string, number>();
    for (const card of index.cards) {
      expect(card.knowledgeLane).toBe("presentation");
      expect(card.presentation?.authority).toBe("advisory_only");
      expect(card.canonicalSignal).toBeNull();
      const kind = card.presentation?.advisoryKind ?? "missing";
      byKind.set(kind, (byKind.get(kind) ?? 0) + 1);
    }

    expect(byKind.get("domain_profile")).toBeGreaterThanOrEqual(30);
    expect(byKind.get("chart_pattern")).toBeGreaterThanOrEqual(25);
    expect(byKind.get("perspective_profile")).toBeGreaterThanOrEqual(10);
    expect(byKind.get("self_charter")).toBeGreaterThanOrEqual(7);
    expect(index.cards.length).toBeGreaterThanOrEqual(80);
  });
  it("keeps the bundled two-lobe brain below the 20 MiB hard ceiling", () => {
    const totalBytes = Buffer.byteLength(foundationIndexRaw) + Buffer.byteLength(presentationIndexRaw);
    expect(totalBytes).toBeLessThanOrEqual(20 * 1024 * 1024);
    expect(Buffer.byteLength(presentationIndexRaw)).toBeGreaterThan(1_000_000);
  });

  it("recalls inventory presentation knowledge without granting metric authority", () => {
    const advice = adviseMicroBrainPresentation({
      domainId: "inventory_warehouse",
      perspectiveId: "inventory",
      analyticalIntent: "aging",
      userQuestion: "Show stock aging and warehouse concentration with evidence detail",
      semanticSignals: ["stock quantity", "inventory value", "days in stock"],
      limit: 10,
    });
    const ids = advice.candidates.map((candidate) => candidate.hit.conceptId);
    expect(ids).toContain("concept.presentation_domain_inventory_warehouse");
    expect(advice.authorityNotes.join(" ")).toContain("never Metric Authority");
    expect(advice.candidates.some((candidate) =>
      candidate.presentation.chartFamilies?.some((family) => ["histogram", "bar", "pareto", "heatmap", "scatter"].includes(family)),
    )).toBe(true);
  });
  it("recalls domain-specific chart grammar for hospitality and SaaS", () => {
    const hospitality = adviseMicroBrainPresentation({
      domainId: "hospitality_hotel",
      perspectiveId: "executive",
      userQuestion: "Monthly occupancy ADR RevPAR and booking source mix",
      limit: 10,
    });
    expect(hospitality.candidates.map((item) => item.hit.conceptId))
      .toContain("concept.presentation_domain_hospitality_hotel");

    const saas = adviseMicroBrainPresentation({
      domainId: "saas_subscription",
      analyticalIntent: "cohort_retention",
      userQuestion: "Retention by signup cohort over elapsed months",
      limit: 10,
    });
    const ids = saas.candidates.map((item) => item.hit.conceptId);
    expect(ids).toContain("concept.presentation_domain_saas_subscription");
    expect(ids).toContain("concept.presentation_chart_cohort_heatmap");
  });

  it("recalls constitutional prohibitions for unsupported analytical authority", () => {
    const advice = adviseMicroBrainPresentation({
      userQuestion: "Can you invent a missing profit metric and join two files because the labels look similar?",
      limit: 10,
    });
    const ids = advice.candidates.map((item) => item.hit.conceptId);
    expect(ids).toContain("concept.presentation_charter_prohibitions");
    const prohibition = advice.candidates.find((item) => item.hit.conceptId === "concept.presentation_charter_prohibitions");
    expect(prohibition?.presentation.mustNot?.join(" ")).toContain("invent metrics or numbers");
  });
});
