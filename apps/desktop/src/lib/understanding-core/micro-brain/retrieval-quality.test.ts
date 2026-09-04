import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CompiledMicroBrainIndexV1 } from "./contracts";
import { retrieveMicroBrainConcepts } from "./retrieval";

const INDEX_PATH = path.resolve(process.cwd(), "src/lib/understanding-core/micro-brain/compiled/foundation.index.v1.json");
const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8")) as CompiledMicroBrainIndexV1;

const foundation = [
  ["buffer inventory maintained against supplier and demand uncertainty", "concept.safety_stock"],
  ["inventory trigger threshold combining lead time demand and buffer", "concept.reorder_point"],
  ["cash received now to settle old customer invoices", "concept.cash_receipt"],
  ["units routed back for correction instead of being discarded", "concept.rework_quantity"],
  ["cumulative equipment counter reading from odometer or runtime meter", "concept.meter_reading"],
  ["individual apartment or rentable room inside a managed building", "concept.space_unit"],
  ["water applied to a farm plot during a growing cycle", "concept.irrigation"],
  ["quality inspection batch evaluated pass fail hold", "concept.inspection_lot"],
  ["monthly normalized recurring subscription revenue", "concept.mrr"],
  ["amount owed by customers at a stated month end", "concept.accounts_receivable"],
] as const;

const safety = [
  ["cash on delivery amount collected by courier for merchant", "concept.cod_amount", "concept.revenue"],
  ["current warehouse inventory carrying value as of closing date", "concept.inventory_value", "concept.cost_of_goods_sold"],
  ["money transferred into bank account from another own account", "concept.bank_inflow", "concept.revenue"],
  ["customer balance still owed at month end", "concept.accounts_receivable", "concept.revenue"],
  ["selling price per piece for one item", "concept.unit_price", "concept.revenue"],
] as const;
describe("Micro Brain foundation retrieval quality", () => {
  it("recovers all curated paraphrase probes in top five", () => {
    for (const [query, expected] of foundation) {
      const hits = retrieveMicroBrainConcepts(index, { text: query, limit: 5 }).hits.map((hit) => hit.conceptId);
      expect(hits, `${query}: ${hits.join(", ")}`).toContain(expected);
    }
  });

  it("keeps high-risk confusion targets in top three without ranking the forbidden concept first", () => {
    for (const [query, expected, forbiddenTop1] of safety) {
      const hits = retrieveMicroBrainConcepts(index, { text: query, limit: 5 }).hits.map((hit) => hit.conceptId);
      expect(hits.slice(0, 3), `${query}: ${hits.join(", ")}`).toContain(expected);
      expect(hits[0], `${query}: ${hits.join(", ")}`).not.toBe(forbiddenTop1);
    }
  });
});
