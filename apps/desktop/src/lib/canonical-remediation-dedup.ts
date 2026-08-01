import type { CanonicalRemediationOperationV1 } from "./understanding-core/canonical-consumer-presentation-contract";

export function canonicalRemediationScopeKey(operation: CanonicalRemediationOperationV1): string {
  // Currency is declared once for a source and applies to the selected monetary
  // columns. Presenting one remediation per money column makes Easy Mode look
  // broken and does not create a different governed decision.
  if (operation.remediationCode === "confirm_currency") {
    return [operation.kind, operation.remediationCode, operation.sourceId ?? "", operation.sheetOrTable ?? ""].join("|");
  }
  return [
    operation.kind,
    operation.remediationCode,
    operation.sourceId ?? "",
    operation.sheetOrTable ?? "",
    operation.physicalColumn ?? "",
    operation.canonicalSignal ?? "",
  ].join("|");
}

export function dedupeCanonicalRemediations(
  operations: readonly CanonicalRemediationOperationV1[],
): CanonicalRemediationOperationV1[] {
  const retained = new Map<string, CanonicalRemediationOperationV1>();
  operations.forEach((operation) => {
    const key = canonicalRemediationScopeKey(operation);
    if (!retained.has(key)) retained.set(key, operation);
  });
  return [...retained.values()];
}
