import { describe, expect, it } from "vitest";
import type { CanonicalSourceCandidateProjectionV1 } from "../canonical-source-candidate-projection";
import {
  buildDatasetCollectionUnderstanding,
  createPerspectiveAnalysisPlan,
  suggestedDeclarationsForPerspective,
} from "./collection-understanding";

function source(id: string, role: "sales" | "accounting" | "logistics", month: string): CanonicalSourceCandidateProjectionV1 {
  const base = {
    sourceId: id,
    sourceFingerprint: `hash-${id}`,
    sourceArtifactId: `artifact-${id}`,
  };
  const candidate = <T,>(candidateId: string, value: T) => ({
    candidateId,
    value,
    ...base,
    scope: { level: "source_file" as const, physicalColumn: null },
    supportingEvidence: ["canonical"],
    contradictingEvidence: [],
    confidence: 0.94,
    provenance: "inferred_candidate" as const,
  });
  return {
    schemaVersion: "lightbi.canonical-source-candidate-projection.v1",
    ...base,
    roleCandidates: [candidate(`role-${id}`, role)],
    documentIdentityCandidates: [candidate(`document-${id}`, { physicalColumn: "OrderID", canonicalSignal: "order" })],
    reportingPeriodCandidates: [candidate(`period-${id}`, { start: `${month}-01`, end: `${month}-28`, physicalColumn: "Date" })],
    monetaryColumnCandidates: role === "logistics" ? [] : [candidate(`money-${id}`, { physicalColumn: "Revenue", canonicalSignal: "revenue" })],
    observedCurrencyCandidates: [candidate(`currency-${id}`, { currency: "VND", physicalColumn: "Currency" })],
  };
}

describe("collection understanding", () => {
  it("understands a six-source order-to-cash collection before UI rendering", () => {
    const sources = [
      ["sales-may", "sales", "2026-05"], ["sales-june", "sales", "2026-06"],
      ["accounting-may", "accounting", "2026-05"], ["accounting-june", "accounting", "2026-06"],
      ["logistics-may", "logistics", "2026-05"], ["logistics-june", "logistics", "2026-06"],
    ].map(([key, role, month]) => ({ key, name: key, rowCount: 1500, columns: ["OrderID"], candidates: source(key, role as "sales" | "accounting" | "logistics", month) }));
    const collection = buildDatasetCollectionUnderstanding(sources, []);
    expect(collection.workflow).toBe("order_to_cash_and_delivery");
    expect(collection.observedPeriods).toEqual(["2026-05", "2026-06"]);
    expect(collection.sharedDocumentCandidates).toEqual(["orderid"]);
    expect(collection.perspectives.map((item) => item.perspectiveId)).toEqual(expect.arrayContaining([
      "executive_overview", "sales_performance", "finance_accounting", "fulfillment_operations", "data_trust",
    ]));
    expect(collection.perspectives.map((item) => String(item.perspectiveId))).not.toContain("inventory");
  });

  it("turns one perspective choice into source declarations and an analysis plan", () => {
    const sources = [
      { key: "sales-may", name: "Sales May", rowCount: 100, candidates: source("sales-may", "sales", "2026-05") },
      { key: "sales-june", name: "Sales June", rowCount: 100, candidates: source("sales-june", "sales", "2026-06") },
    ];
    const collection = buildDatasetCollectionUnderstanding(sources, []);
    const perspective = collection.perspectives.find((item) => item.perspectiveId === "sales_performance")!;
    const declarations = suggestedDeclarationsForPerspective(sources, perspective);
    const plan = createPerspectiveAnalysisPlan(collection, perspective.perspectiveId);
    expect(Object.values(declarations).every((item) => item.selected && item.role === "sales")).toBe(true);
    expect(plan.periodScope).toEqual({ mode: "compare", baselinePeriodId: "2026-05", comparisonPeriodId: "2026-06" });
    expect(plan.chartIntents).toEqual(expect.arrayContaining(["kpi", "trend", "ranking", "evidence"]));
  });

  it("prefers a structurally shared business key over a source-local document number", () => {
    const accounting = source("accounting", "accounting", "2026-05");
    accounting.documentIdentityCandidates[0] = {
      ...accounting.documentIdentityCandidates[0],
      value: { physicalColumn: "JournalNo", canonicalSignal: "journal" },
    };
    const sources = [
      { key: "accounting", name: "Accounting", rowCount: 100, columns: ["JournalNo", "OrderID"], candidates: accounting },
      { key: "accounting-prior", name: "Accounting prior", rowCount: 100, columns: ["JournalNo", "OrderID"], candidates: { ...accounting, sourceId: "accounting-prior" } },
      { key: "sales", name: "Sales", rowCount: 100, columns: ["OrderID"], candidates: source("sales", "sales", "2026-05") },
    ];
    const collection = buildDatasetCollectionUnderstanding(sources, []);
    const perspective = collection.perspectives.find((item) => item.perspectiveId === "executive_overview")!;
    const declarations = suggestedDeclarationsForPerspective(sources, perspective);
    expect(declarations.accounting.documentColumn).toBe("OrderID");
    expect(declarations["accounting-prior"].documentColumn).toBe("OrderID");
    expect(declarations.sales.documentColumn).toBe("OrderID");
  });
});
