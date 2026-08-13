import { describe, expect, it } from "vitest";
import { canonicalSourceCurrencyEvidenceIdentity, createCanonicalSourceCurrencyEvidence, currencyEvidenceMatchesSource } from "./canonical-source-evidence";
import type { CanonicalMetricSourceV1 } from "./governed-domain-metric-contracts";

const SOURCE_ID = "derived/accounting.csv#Sheet1";
const SOURCE_HASH = "a".repeat(64);
const CONTRACT_HASH = "b".repeat(64);

function source(): CanonicalMetricSourceV1 {
  return {
    physical: { provenance: { sourceId: SOURCE_ID, sourceHash: { algorithm: "sha256", value: SOURCE_HASH } } },
  } as unknown as CanonicalMetricSourceV1;
}

function evidence() {
  return createCanonicalSourceCurrencyEvidence({
    sourceId: SOURCE_ID,
    sourceHash: { algorithm: "sha256", value: SOURCE_HASH },
    currency: "VND",
    provenance: { kind: "declared_scenario_metadata", reference: "scenario-contract.json", referenceHash: { algorithm: "sha256", value: CONTRACT_HASH } },
    scope: "selected_columns",
    applicableMonetaryColumns: ["Revenue_Credit", "COGS_Debit"],
    reportingPeriod: "2026-05",
  });
}

describe("Phase 7R3.6 canonical currency evidence contract", () => {
  it("creates a deterministic source-bound identity", () => {
    const first = evidence();
    const second = evidence();
    expect(first).toEqual(second);
    expect(first.evidenceId).toBe(canonicalSourceCurrencyEvidenceIdentity(first));
    expect(currencyEvidenceMatchesSource(first, source())).toBe(true);
  });

  it("rejects another source, a stale hash, inference, and identity tampering", () => {
    const valid = evidence();
    expect(currencyEvidenceMatchesSource({ ...valid, sourceId: "other#Sheet1" }, source())).toBe(false);
    expect(currencyEvidenceMatchesSource({ ...valid, sourceHash: { algorithm: "sha256", value: "c".repeat(64) } }, source())).toBe(false);
    expect(currencyEvidenceMatchesSource({ ...valid, inferred: true } as never, source())).toBe(false);
    expect(currencyEvidenceMatchesSource({ ...valid, evidenceId: "currency-evidence:tampered" }, source())).toBe(false);
  });

  it("keeps scope and reporting period in the deterministic identity", () => {
    const valid = evidence();
    const changedScope = createCanonicalSourceCurrencyEvidence({
      sourceId: SOURCE_ID,
      sourceHash: { algorithm: "sha256", value: SOURCE_HASH },
      currency: "VND",
      provenance: { kind: "declared_scenario_metadata", reference: "scenario-contract.json", referenceHash: { algorithm: "sha256", value: CONTRACT_HASH } },
      scope: "selected_columns",
      applicableMonetaryColumns: ["Revenue_Credit"],
      reportingPeriod: "2026-06",
    });
    expect(changedScope.evidenceId).not.toBe(valid.evidenceId);
  });
});
