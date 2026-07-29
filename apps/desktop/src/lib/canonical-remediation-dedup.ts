import type { CanonicalRemediationOperationV1 } from "./understanding-core/canonical-consumer-presentation-contract";

export function canonicalRemediationScopeKey(operation: CanonicalRemediationOperationV1): string {
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
