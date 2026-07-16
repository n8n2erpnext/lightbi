import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import type { CanonicalMetricSourceV1, CanonicalSourceCurrencyEvidenceV1, CanonicalSourceInventorySnapshotEvidenceV1 } from "./governed-domain-metric-contracts";

export type CanonicalSourceCurrencyEvidenceInputV1 = Omit<CanonicalSourceCurrencyEvidenceV1, "schemaVersion" | "evidenceId" | "inferred" | "attachedAt">;

function evidenceBody(input: CanonicalSourceCurrencyEvidenceInputV1) {
  return {
    schemaVersion: "lightbi.canonical-source-currency-evidence.v1" as const,
    sourceId: input.sourceId,
    sourceHash: input.sourceHash,
    currency: input.currency,
    provenance: input.provenance,
    scope: input.scope,
    applicableMonetaryColumns: [...new Set(input.applicableMonetaryColumns)].sort(),
    reportingPeriod: input.reportingPeriod,
    inferred: false as const,
    attachedAt: "canonical_source" as const,
  };
}

export function createCanonicalSourceCurrencyEvidence(input: CanonicalSourceCurrencyEvidenceInputV1): CanonicalSourceCurrencyEvidenceV1 {
  const body = evidenceBody(input);
  return { ...body, evidenceId: `currency-evidence:${deterministicPolicySha256(body)}` };
}

export function canonicalSourceCurrencyEvidenceIdentity(evidence: CanonicalSourceCurrencyEvidenceV1): string {
  const { evidenceId: _evidenceId, ...body } = evidence;
  return `currency-evidence:${deterministicPolicySha256(body)}`;
}

export function currencyEvidenceMatchesSource(evidence: CanonicalSourceCurrencyEvidenceV1, source: CanonicalMetricSourceV1): boolean {
  const hash = source.physical.provenance.sourceHash;
  return evidence.schemaVersion === "lightbi.canonical-source-currency-evidence.v1"
    && evidence.evidenceId === canonicalSourceCurrencyEvidenceIdentity(evidence)
    && evidence.sourceId === source.physical.provenance.sourceId
    && hash?.algorithm === "sha256"
    && evidence.sourceHash.algorithm === "sha256"
    && evidence.sourceHash.value === hash.value
    && evidence.currency.trim().length > 0
    && evidence.reportingPeriod.trim().length > 0
    && evidence.inferred === false
    && evidence.attachedAt === "canonical_source"
    && evidence.provenance.reference.trim().length > 0
    && evidence.provenance.referenceHash.algorithm === "sha256"
    && /^[a-f0-9]{64}$/.test(evidence.provenance.referenceHash.value);
}

export type CanonicalSourceInventorySnapshotEvidenceInputV1 = Omit<CanonicalSourceInventorySnapshotEvidenceV1, "schemaVersion" | "evidenceId" | "inferred" | "attachedAt">;

function inventorySnapshotEvidenceBody(input: CanonicalSourceInventorySnapshotEvidenceInputV1) {
  return {
    schemaVersion: "lightbi.canonical-source-inventory-snapshot-evidence.v1" as const,
    sourceId: input.sourceId,
    sourceHash: input.sourceHash,
    provenance: input.provenance,
    scope: input.scope,
    quantity: input.quantity,
    itemIdentity: input.itemIdentity,
    warehouseIdentity: input.warehouseIdentity,
    asOf: input.asOf,
    unit: input.unit,
    inferred: false as const,
    attachedAt: "canonical_source" as const,
  };
}

export function createCanonicalSourceInventorySnapshotEvidence(input: CanonicalSourceInventorySnapshotEvidenceInputV1): CanonicalSourceInventorySnapshotEvidenceV1 {
  const body = inventorySnapshotEvidenceBody(input);
  return { ...body, evidenceId: `inventory-snapshot-evidence:${deterministicPolicySha256(body)}` };
}

export function canonicalSourceInventorySnapshotEvidenceIdentity(evidence: CanonicalSourceInventorySnapshotEvidenceV1): string {
  const { evidenceId: _evidenceId, ...body } = evidence;
  return `inventory-snapshot-evidence:${deterministicPolicySha256(body)}`;
}

export function inventorySnapshotEvidenceMatchesSource(evidence: CanonicalSourceInventorySnapshotEvidenceV1, source: CanonicalMetricSourceV1): boolean {
  const hash = source.physical.provenance.sourceHash;
  return evidence.schemaVersion === "lightbi.canonical-source-inventory-snapshot-evidence.v1"
    && evidence.evidenceId === canonicalSourceInventorySnapshotEvidenceIdentity(evidence)
    && evidence.sourceId === source.physical.provenance.sourceId
    && hash?.algorithm === "sha256"
    && evidence.sourceHash.algorithm === "sha256"
    && evidence.sourceHash.value === hash.value
    && evidence.scope === "one_item_warehouse_as_of_snapshot"
    && evidence.asOf.value.trim().length > 0
    && evidence.unit.value.trim().length > 0
    && evidence.inferred === false
    && evidence.attachedAt === "canonical_source"
    && evidence.provenance.reference.trim().length > 0
    && evidence.provenance.referenceHash.algorithm === "sha256"
    && /^[a-f0-9]{64}$/.test(evidence.provenance.referenceHash.value);
}
