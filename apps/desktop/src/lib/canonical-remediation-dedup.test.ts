import { describe, expect, it } from "vitest";
import { dedupeCanonicalRemediations } from "./canonical-remediation-dedup";
import type { CanonicalRemediationOperationV1 } from "./understanding-core/canonical-consumer-presentation-contract";

function currency(sourceId: string, operationId: string): CanonicalRemediationOperationV1 {
  return {
    operationId,
    kind: "open_currency_declaration",
    label: "Provide reporting currency",
    sourceId,
    sheetOrTable: "Sheet1",
    physicalColumn: null,
    canonicalSignal: null,
    remediationCode: "confirm_currency",
  };
}

describe("canonical remediation deduplication", () => {
  it("removes duplicate occurrences within the same governed scope", () => {
    expect(dedupeCanonicalRemediations([currency("source-a", "one"), currency("source-a", "two")])).toHaveLength(1);
  });

  it("does not merge distinct source scopes", () => {
    expect(dedupeCanonicalRemediations([currency("source-a", "one"), currency("source-b", "two")])).toHaveLength(2);
  });

  it("presents one source-level currency action even when preflight reports several money columns", () => {
    const first = { ...currency("source-a", "one"), physicalColumn: "NetRevenue", canonicalSignal: "net_revenue" };
    const second = { ...currency("source-a", "two"), physicalColumn: "GrossProfit", canonicalSignal: "gross_profit" };
    expect(dedupeCanonicalRemediations([first, second])).toHaveLength(1);
  });
});
