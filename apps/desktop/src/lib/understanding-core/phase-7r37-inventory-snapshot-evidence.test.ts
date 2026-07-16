import { describe, expect, it } from "vitest";
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "../semantic-registry";
import { aggregateContextualEvidence } from "./contextual-evidence-aggregator";
import {
  canonicalSourceInventorySnapshotEvidenceIdentity,
  createCanonicalSourceInventorySnapshotEvidence,
  inventorySnapshotEvidenceMatchesSource,
} from "./canonical-source-evidence";
import type { CanonicalMetricSourceV1, CanonicalSourceInventorySnapshotEvidenceV1 } from "./governed-domain-metric-contracts";
import { profilePhysicalSource } from "./profiler";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { resolveSemanticShadow } from "./semantic-resolver";

const SOURCE_ID = "derived/inventory-snapshot.csv#Sheet1";
const SOURCE_HASH = "a".repeat(64);
const CONTRACT_HASH = "b".repeat(64);

function source(): CanonicalMetricSourceV1 {
  return { physical: { provenance: { sourceId: SOURCE_ID, sourceHash: { algorithm: "sha256", value: SOURCE_HASH } } } } as unknown as CanonicalMetricSourceV1;
}

function evidence() {
  return createCanonicalSourceInventorySnapshotEvidence({
    sourceId: SOURCE_ID,
    sourceHash: { algorithm: "sha256", value: SOURCE_HASH },
    provenance: { kind: "declared_scenario_metadata", reference: "scenario-contract.json", referenceHash: { algorithm: "sha256", value: CONTRACT_HASH } },
    scope: "one_item_warehouse_as_of_snapshot",
    quantity: { physicalColumn: "QuantityOnHand", semanticId: "stock_qty" },
    itemIdentity: { physicalColumn: "ItemID", semanticId: "sku" },
    warehouseIdentity: { physicalColumn: "WarehouseID", semanticId: "warehouse" },
    asOf: { physicalColumn: "AsOfDate", semanticId: "time_period", value: "2026-05-31" },
    unit: { physicalColumn: "UOM", semanticId: "uom", value: "EA" },
  });
}

function resolvedColumns(headers: string[], rows: unknown[][]) {
  const physical = profilePhysicalSource({
    schemaVersion: "lightbi.physical-source-input.v1",
    source: { sourceId: `semantic-probe:${headers.join("|")}`, kind: "local_file", label: "probe.csv" },
    rawRows: [headers, ...rows],
  });
  const candidates = generateSemanticCandidateArtifact(physical, { registry: SEMANTIC_SIGNAL_REGISTRY_V1 });
  return resolveSemanticShadow(physical, candidates, aggregateContextualEvidence(physical, candidates)).columns;
}

describe("Phase 7R3.7 source-bound inventory snapshot evidence", () => {
  it("creates a deterministic source-bound contract", () => {
    const first = evidence();
    expect(first).toEqual(evidence());
    expect(first.evidenceId).toBe(canonicalSourceInventorySnapshotEvidenceIdentity(first));
    expect(inventorySnapshotEvidenceMatchesSource(first, source())).toBe(true);
  });

  it("rejects all fifteen governed evidence mutations", () => {
    const valid = evidence();
    const probes: Array<[string, CanonicalSourceInventorySnapshotEvidenceV1]> = [
      ["wrong_source", { ...valid, sourceId: "other#Sheet1" }],
      ["stale_source_hash", { ...valid, sourceHash: { algorithm: "sha256", value: "c".repeat(64) } }],
      ["tampered_identity", { ...valid, evidenceId: "inventory-snapshot-evidence:tampered" }],
      ["inferred_contract", { ...valid, inferred: true } as never],
      ["wrong_attachment_stage", { ...valid, attachedAt: "runtime" } as never],
      ["missing_reference", { ...valid, provenance: { ...valid.provenance, reference: "" } }],
      ["invalid_reference_hash", { ...valid, provenance: { ...valid.provenance, referenceHash: { algorithm: "sha256", value: "bad" } } }],
      ["missing_as_of_value", { ...valid, asOf: { ...valid.asOf, value: "" } }],
      ["missing_uom_value", { ...valid, unit: { ...valid.unit, value: "" } }],
      ["wrong_scope", { ...valid, scope: "all_rows" } as never],
      ["changed_quantity_binding", { ...valid, quantity: { ...valid.quantity, physicalColumn: "Qty" } }],
      ["changed_item_binding", { ...valid, itemIdentity: { ...valid.itemIdentity, physicalColumn: "Product" } }],
      ["changed_warehouse_binding", { ...valid, warehouseIdentity: { ...valid.warehouseIdentity, physicalColumn: "Location" } }],
      ["changed_as_of_binding", { ...valid, asOf: { ...valid.asOf, physicalColumn: "ReportingPeriod" } }],
      ["changed_uom_binding", { ...valid, unit: { ...valid.unit, physicalColumn: "Unit" } }],
    ];
    expect(probes).toHaveLength(15);
    for (const [probeId, candidate] of probes) expect(inventorySnapshotEvidenceMatchesSource(candidate, source()), probeId).toBe(false);
  });

  it("requires explicit snapshot semantics and does not promote generic or operational quantities", () => {
    const positive = resolvedColumns(
      ["ItemID", "WarehouseID", "QuantityOnHand", "AsOfDate", "UOM"],
      [["ITEM-1", "WH-1", 10, "2026-05-31", "EA"], ["ITEM-2", "WH-1", 20, "2026-05-31", "EA"]],
    );
    expect(positive.find((column) => column.physicalColumn === "QuantityOnHand")).toMatchObject({ selectedCandidateId: "stock_qty", finalState: "probable" });

    const probes = [
      { id: "sales_quantity", header: "Quantity", rows: [["ORDER-1", 2], ["ORDER-2", 3]] },
      { id: "shipment_quantity", header: "ShipmentQuantity", rows: [["SHIP-1", 4], ["SHIP-2", 5]] },
      { id: "movement_quantity", header: "QuantityDelta", rows: [["MOVE-1", -2], ["MOVE-2", 8]] },
      { id: "stock_threshold", header: "StockThreshold", rows: [["ITEM-1", 5], ["ITEM-2", 10]] },
      { id: "backlog_quantity", header: "BacklogQuantity", rows: [["ITEM-1", 11], ["ITEM-2", 12]] },
      { id: "inventory_credit_money", header: "InventoryCredit", rows: [["DOC-1", 100_000], ["DOC-2", 250_000]] },
      { id: "ambiguous_qty", header: "Qty", rows: [["ROW-1", 1], ["ROW-2", 2]] },
    ];
    for (const probe of probes) {
      const target = resolvedColumns(["RecordID", probe.header], probe.rows).find((column) => column.physicalColumn === probe.header)!;
      expect(target.selectedCandidateId === "stock_qty" && ["confirmed", "probable"].includes(target.finalState), probe.id).toBe(false);
    }
  });
});
