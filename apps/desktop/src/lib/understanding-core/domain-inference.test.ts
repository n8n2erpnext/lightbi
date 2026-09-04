import { describe, expect, it } from "vitest";
import { getOrBuildCanonicalConsumerArtifact } from "./canonical-consumer-boundary";

function healthcareRows(): Record<string, unknown>[] {
  return Array.from({ length: 24 }, (_, index) => ({
    "Patient ID": `PAT-${String(index + 1).padStart(3, "0")}`,
    "Appointment ID": `APT-${String(index + 1).padStart(3, "0")}`,
    Provider: index % 2 ? "Dr A" : "Dr B",
    Diagnosis: index % 3 ? "J11" : "R05",
  }));
}

function salesRows(): Record<string, unknown>[] {
  return Array.from({ length: 24 }, (_, index) => ({
    "Order ID": `ORD-${String(index + 1).padStart(3, "0")}`,
    Product: `SKU-${(index % 4) + 1}`,
    Revenue: 100 + index * 5,
    Customer: `CUS-${(index % 8) + 1}`,
  }));
}

describe("MB-5 domain inference is separate from official support", () => {
  it("recognizes healthcare context from validated MB relations without activating support", () => {
    const rows = healthcareRows();
    const artifact = getOrBuildCanonicalConsumerArtifact({
      datasetId: "mb5:healthcare-context",
      sourceKind: "local_file",
      sourceLabel: "healthcare.csv",
      columns: Object.keys(rows[0]),
      rows,
      sourceRowCount: rows.length,
    });
    expect(artifact.status).toBe("valid");
    if (artifact.status !== "valid") return;
    expect(artifact.domainInference.primaryDomain).toBe("healthcare");
    expect(artifact.domainInference.primaryDomainSource).toBe("micro_brain_relation");
    expect(artifact.domainInference.analysisMode).toBe("evidence_bound_inferred_domain");
    expect(artifact.domainInference.officialSupport.productionActive).toBe(false);
    expect(artifact.domainInference.domains.find((item) => item.domainId === "healthcare")?.canonicalSignalIds)
      .toEqual(expect.arrayContaining(["patient", "appointment", "provider", "diagnosis"]));
    expect(artifact.domainInference.limitations.join(" ")).toMatch(/never activates official domain support/i);
  });

  it("keeps ordinary canonical business recognition separate from support authority", () => {
    const rows = salesRows();
    const artifact = getOrBuildCanonicalConsumerArtifact({
      datasetId: "mb5:sales-context",
      sourceKind: "local_file",
      sourceLabel: "sales.csv",
      columns: Object.keys(rows[0]),
      rows,
      sourceRowCount: rows.length,
    });
    expect(artifact.status).toBe("valid");
    if (artifact.status !== "valid") return;
    expect(["revenue", "inventory", "customer"]).toContain(artifact.domainInference.primaryDomain);
    expect(artifact.domainInference.analysisMode).toBe("canonical_detect_only");
    expect(artifact.domainInference.officialSupport.packId).toBe("commerce_distribution_mvp");
    expect(artifact.domainInference.officialSupport.productionActive).toBe(false);
    expect(artifact.domainInference.semanticConcepts.confirmed + artifact.domainInference.semanticConcepts.probable).toBeGreaterThan(0);
  });
});
