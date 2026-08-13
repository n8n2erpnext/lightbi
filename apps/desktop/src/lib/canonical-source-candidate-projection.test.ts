import { describe, expect, it } from "vitest";
import { projectCanonicalBusinessPerspectives, projectGovernedBundleCandidates } from "./canonical-source-candidate-projection";
import type { CanonicalSourceCandidateProjectionV1 } from "./canonical-source-candidate-projection";

function candidate(id: string, role: "sales" | "accounting" | "logistics", month: string): CanonicalSourceCandidateProjectionV1 {
  const base = { sourceId: id, sourceFingerprint: `${id}-fingerprint`, sourceArtifactId: `${id}-artifact` };
  return {
    schemaVersion: "lightbi.canonical-source-candidate-projection.v1",
    ...base,
    roleCandidates: [{ candidateId: `${id}:role`, value: role, ...base, scope: { level: "source_file", physicalColumn: null }, supportingEvidence: ["canonical"], contradictingEvidence: [], confidence: 0.9, provenance: "inferred_candidate" }],
    documentIdentityCandidates: [],
    reportingPeriodCandidates: [{ candidateId: `${id}:period`, value: { start: `${month}-01`, end: `${month}-28`, physicalColumn: "Date" }, ...base, scope: { level: "physical_column", physicalColumn: "Date" }, supportingEvidence: ["full_file_range"], contradictingEvidence: [], confidence: 0.9, provenance: "inferred_candidate" }],
    monetaryColumnCandidates: [],
    observedCurrencyCandidates: [],
  };
}

function withMoney(
  source: CanonicalSourceCandidateProjectionV1,
  physicalColumn: string,
  canonicalSignal: string,
): CanonicalSourceCandidateProjectionV1 {
  const base = { sourceId: source.sourceId, sourceFingerprint: source.sourceFingerprint, sourceArtifactId: source.sourceArtifactId };
  return {
    ...source,
    monetaryColumnCandidates: [{
      candidateId: `${source.sourceId}:money:${canonicalSignal}`,
      value: { physicalColumn, canonicalSignal },
      ...base,
      scope: { level: "physical_column", physicalColumn },
      supportingEvidence: ["canonical"],
      contradictingEvidence: [],
      confidence: 0.95,
      provenance: "inferred_candidate",
    }],
  };
}

describe("canonical source candidates and governed bundles", () => {
  it("pairs compatible cross-functional periods and projects same-role period partitions", () => {
    const sources = [
      { key: "sales-may", candidates: candidate("sales-may", "sales", "2026-05") },
      { key: "sales-june", candidates: candidate("sales-june", "sales", "2026-06") },
      { key: "accounting-may", candidates: candidate("accounting-may", "accounting", "2026-05") },
      { key: "accounting-june", candidates: candidate("accounting-june", "accounting", "2026-06") },
      { key: "logistics-may", candidates: candidate("logistics-may", "logistics", "2026-05") },
      { key: "logistics-june", candidates: candidate("logistics-june", "logistics", "2026-06") },
    ];
    const bundles = projectGovernedBundleCandidates(sources);
    const grossProfit = bundles.filter((bundle) => bundle.kind === "gross_profit_period");
    expect(grossProfit.map((bundle) => bundle.sourceKeys)).toEqual([
      ["sales-may", "accounting-may"],
      ["sales-june", "accounting-june"],
    ]);
    expect(bundles.filter((bundle) => bundle.kind === "delivery_source_local")).toHaveLength(2);
    expect(bundles.find((bundle) => bundle.kind === "revenue_period_comparison")).toMatchObject({
      state: "needs_confirmation",
      relationshipState: "period_partition_candidate",
    });
    expect(bundles.find((bundle) => bundle.kind === "delivery_period_comparison")).toMatchObject({
      state: "needs_confirmation",
      relationshipState: "period_partition_candidate",
    });
    expect(bundles.some((bundle) => bundle.sourceKeys.length === 6)).toBe(false);
  });

  it("projects the complete ERP set into truthful executable and blocked perspectives", () => {
    const sources = [
      { key: "sales-may", candidates: candidate("sales-may", "sales", "2026-05") },
      { key: "sales-june", candidates: candidate("sales-june", "sales", "2026-06") },
      { key: "accounting-may", candidates: candidate("accounting-may", "accounting", "2026-05") },
      { key: "accounting-june", candidates: candidate("accounting-june", "accounting", "2026-06") },
      { key: "logistics-may", candidates: candidate("logistics-may", "logistics", "2026-05") },
      { key: "logistics-june", candidates: candidate("logistics-june", "logistics", "2026-06") },
    ];
    const bundles = projectGovernedBundleCandidates(sources);
    const perspectives = projectCanonicalBusinessPerspectives(sources, bundles);

    expect(perspectives.map((item) => item.perspectiveId)).toEqual([
      "executive_overview",
      "sales_performance",
      "profitability",
      "finance_accounting",
      "fulfillment_operations",
      "order_journey",
      "period_comparison",
      "data_trust",
    ]);
    expect(perspectives.find((item) => item.perspectiveId === "executive_overview")).toMatchObject({
      sourceKeys: expect.arrayContaining(["sales-may", "accounting-may", "logistics-may"]),
      sourceRoles: ["accounting", "logistics", "sales"],
      periods: ["2026-05", "2026-06"],
      state: "partial",
      recommended: true,
    });
    expect(perspectives.find((item) => item.perspectiveId === "profitability")).toMatchObject({
      capabilityIds: ["gross_profit"],
      state: "needs_evidence",
      periods: ["2026-05", "2026-06"],
    });
    expect(perspectives.find((item) => item.perspectiveId === "sales_performance")).toMatchObject({
      state: "needs_evidence",
      blockers: [],
    });
    expect(perspectives.find((item) => item.perspectiveId === "period_comparison")).toMatchObject({
      state: "needs_evidence",
      blockers: [],
      capabilityIds: ["sales_revenue", "delivery_count"],
    });
    expect(perspectives.find((item) => item.perspectiveId === "order_journey")).toMatchObject({
      state: "not_yet_executable",
      blockers: ["three_role_order_journey_relationship_policy_not_implemented"],
    });
  });

  it("exposes source-local profitability for an accounting file with direct gross-profit evidence", () => {
    const accounting = withMoney(candidate("accounting-june", "accounting", "2026-06"), "GrossProfit", "gross_profit");
    const perspectives = projectCanonicalBusinessPerspectives([{ key: "accounting-june", candidates: accounting }], []);

    expect(perspectives.find((item) => item.perspectiveId === "profitability")).toMatchObject({
      sourceKeys: ["accounting-june"],
      sourceRoles: ["accounting"],
      periods: ["2026-06"],
      capabilityIds: ["gross_profit"],
      state: "needs_evidence",
      blockers: [],
      recommended: true,
    });
    expect(perspectives.find((item) => item.perspectiveId === "finance_accounting")).toMatchObject({
      sourceKeys: ["accounting-june"],
      state: "needs_evidence",
      blockers: [],
    });
  });
});
