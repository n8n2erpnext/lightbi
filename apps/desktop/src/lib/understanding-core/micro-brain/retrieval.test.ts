import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CompiledMicroBrainIndexV1 } from "./contracts";
import { validateCompiledMicroBrainIndex } from "./index-loader";
import { retrieveMicroBrainConcepts } from "./retrieval";

const INDEX_PATH = path.resolve(process.cwd(), "src/lib/understanding-core/micro-brain/compiled/foundation.index.v1.json");
const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")) as CompiledMicroBrainIndexV1;

function topIds(query: string, limit = 8, typedTags: string[] = []): string[] {
  return retrieveMicroBrainConcepts(index, { text: query, typedTags, limit }).hits.map((hit) => hit.conceptId);
}

describe("Micro Brain hybrid retrieval", () => {
  it("loads a structurally complete deterministic index", () => {
    const result = validateCompiledMicroBrainIndex(index);
    expect(result).toEqual({ valid: true, errors: [] });
    expect(index.manifest).toMatchObject({ cardCount: 248, unitCount: 1118, featureCount: 2048, vectorDimensions: 128 });
    expect(index.manifest.logicalIndexSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("retrieves COD semantics without converting similarity into confidence", () => {
    const artifact = retrieveMicroBrainConcepts(index, {
      text: "COD cash on delivery tien thu ho shipment consignee collection amount",
      typedTags: ["kind:measure", "family:money", "type:number"],
      limit: 8,
    });
    expect(artifact.hits.slice(0, 3).map((hit) => hit.conceptId)).toContain("concept.cod_amount");
    expect(artifact.hits.find((hit) => hit.conceptId === "concept.cod_amount")?.canonicalSignal).toBe("cod_amount");
    expect(artifact.limitations.join(" ")).toMatch(/not semantic confidence/i);
  });
  it("separates point-in-time stock from movement flow", () => {
    const stockIds = topIds("ending stock on hand as of date warehouse sku quantity", 8, ["kind:snapshot", "family:quantity"]);
    expect(stockIds.slice(0, 4)).toContain("concept.stock_on_hand");
    const movementIds = topIds("inventory movement receipt issue transfer quantity during period", 8, ["kind:flow", "family:inventory"]);
    expect(movementIds.slice(0, 4)).toContain("concept.stock_movement");
  });

  it("recovers an open long-tail concept without inventing a canonical signal", () => {
    const artifact = retrieveMicroBrainConcepts(index, {
      text: "buffer inventory held against demand variability safety stock",
      typedTags: ["kind:snapshot", "domain:inventory"],
      limit: 8,
    });
    const hit = artifact.hits.find((item) => item.conceptId === "concept.safety_stock");
    expect(hit).toBeDefined();
    expect(hit?.canonicalSignal).toBeNull();
  });

  it("recovers unsupported-domain quality concepts as retrieval only", () => {
    const ids = topIds("inspection lot qc pass fail defect nonconformance manufacturing", 8, ["domain:manufacturing", "family:quality"]);
    expect(ids.slice(0, 5).some((id) => ["concept.inspection_lot", "concept.qc_result", "concept.defect_code"].includes(id))).toBe(true);
  });

  it("returns no domain-support or metric authorization field", () => {
    const artifact = retrieveMicroBrainConcepts(index, { text: "gross profit revenue cogs", limit: 5 });
    expect("domainSupport" in artifact).toBe(false);
    expect("metricAuthorized" in artifact).toBe(false);
    expect(artifact.hits.every((hit) => !("confidence" in hit))).toBe(true);
  });
});