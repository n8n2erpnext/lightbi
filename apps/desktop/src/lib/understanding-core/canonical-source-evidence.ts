import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import type { CanonicalMetricSourceV1, CanonicalSourceCurrencyEvidenceV1, CanonicalSourceDocumentIdentityEvidenceV1, CanonicalSourceInventorySnapshotEvidenceV1, CanonicalSourceLineMeasureEvidenceV1 } from "./governed-domain-metric-contracts";
import { SEMANTIC_SIGNAL_BY_ID } from "../semantic-registry";

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

export type CanonicalSourceDocumentIdentityEvidenceInputV1 = Omit<CanonicalSourceDocumentIdentityEvidenceV1, "schemaVersion" | "evidenceId" | "inferred" | "attachedAt">;

function documentIdentityEvidenceBody(input: CanonicalSourceDocumentIdentityEvidenceInputV1) {
  return {
    schemaVersion: "lightbi.canonical-source-document-identity-evidence.v1" as const,
    sourceId: input.sourceId,
    sourceHash: input.sourceHash,
    provenance: input.provenance,
    physicalColumn: input.physicalColumn,
    semanticId: input.semanticId,
    inferred: false as const,
    attachedAt: "canonical_source" as const,
  };
}

export function createCanonicalSourceDocumentIdentityEvidence(input: CanonicalSourceDocumentIdentityEvidenceInputV1): CanonicalSourceDocumentIdentityEvidenceV1 {
  const body = documentIdentityEvidenceBody(input);
  return { ...body, evidenceId: `document-identity-evidence:${deterministicPolicySha256(body)}` };
}

export function canonicalSourceDocumentIdentityEvidenceIdentity(evidence: CanonicalSourceDocumentIdentityEvidenceV1): string {
  const { evidenceId: _evidenceId, ...body } = evidence;
  return `document-identity-evidence:${deterministicPolicySha256(body)}`;
}

export function documentIdentityEvidenceMatchesSource(evidence: CanonicalSourceDocumentIdentityEvidenceV1, source: CanonicalMetricSourceV1): boolean {
  const hash = source.physical.provenance.sourceHash;
  const semantic = source.semantic.columns.find((column) =>
    column.physicalColumn === evidence.physicalColumn
    && column.selectedCandidateId === evidence.semanticId
    && ["confirmed", "probable"].includes(column.finalState));
  const definition = semantic?.selectedCandidateId ? SEMANTIC_SIGNAL_BY_ID.get(semantic.selectedCandidateId) : undefined;
  return evidence.schemaVersion === "lightbi.canonical-source-document-identity-evidence.v1"
    && evidence.evidenceId === canonicalSourceDocumentIdentityEvidenceIdentity(evidence)
    && evidence.sourceId === source.physical.provenance.sourceId
    && hash?.algorithm === "sha256"
    && evidence.sourceHash.algorithm === "sha256"
    && evidence.sourceHash.value === hash.value
    && Boolean(semantic)
    && evidence.inferred === false
    && evidence.attachedAt === "canonical_source"
    && evidence.provenance.kind === "user_confirmed"
    && evidence.provenance.reference.trim().length > 0
    && evidence.provenance.referenceHash.algorithm === "sha256"
    && /^[a-f0-9]{64}$/.test(evidence.provenance.referenceHash.value)
    && definition?.role === "identifier";
}

export type CanonicalSourceLineMeasureEvidenceInputV1 = Omit<CanonicalSourceLineMeasureEvidenceV1, "schemaVersion" | "evidenceId" | "inferred" | "attachedAt">;

function lineMeasureEvidenceBody(input: CanonicalSourceLineMeasureEvidenceInputV1) {
  return {
    schemaVersion: "lightbi.canonical-source-line-measure-evidence.v1" as const,
    sourceId: input.sourceId,
    sourceHash: input.sourceHash,
    provenance: input.provenance,
    physicalColumn: input.physicalColumn,
    semanticId: input.semanticId,
    rowIdentityPhysicalColumn: input.rowIdentityPhysicalColumn,
    inferred: false as const,
    attachedAt: "canonical_source" as const,
  };
}

export function createCanonicalSourceLineMeasureEvidence(input: CanonicalSourceLineMeasureEvidenceInputV1): CanonicalSourceLineMeasureEvidenceV1 {
  const body = lineMeasureEvidenceBody(input);
  return { ...body, evidenceId: `line-measure-evidence:${deterministicPolicySha256(body)}` };
}

export function canonicalSourceLineMeasureEvidenceIdentity(evidence: CanonicalSourceLineMeasureEvidenceV1): string {
  const { evidenceId: _evidenceId, ...body } = evidence;
  return `line-measure-evidence:${deterministicPolicySha256(body)}`;
}

export function lineMeasureEvidenceMatchesSource(evidence: CanonicalSourceLineMeasureEvidenceV1, source: CanonicalMetricSourceV1): boolean {
  const hash = source.physical.provenance.sourceHash;
  const measure = source.semantic.columns.find((column) =>
    column.physicalColumn === evidence.physicalColumn
    && column.selectedCandidateId === evidence.semanticId
    && ["confirmed", "probable"].includes(column.finalState)
    && SEMANTIC_SIGNAL_BY_ID.get(column.selectedCandidateId)?.role === "measure");
  const identity = source.semantic.columns.find((column) =>
    column.physicalColumn === evidence.rowIdentityPhysicalColumn
    && column.selectedCandidateId
    && ["confirmed", "probable"].includes(column.finalState)
    && SEMANTIC_SIGNAL_BY_ID.get(column.selectedCandidateId)?.role === "identifier");
  const profile = identity
    ? source.physical.sourceProfile.columns.find((column) => column.sourceColumnIndex === identity.sourceColumnIndex)
    : undefined;
  const candidateId = identity ? `key:${identity.sourceColumnIndex}` : null;
  return evidence.schemaVersion === "lightbi.canonical-source-line-measure-evidence.v1"
    && evidence.evidenceId === canonicalSourceLineMeasureEvidenceIdentity(evidence)
    && evidence.sourceId === source.physical.provenance.sourceId
    && hash?.algorithm === "sha256"
    && evidence.sourceHash.algorithm === "sha256"
    && evidence.sourceHash.value === hash.value
    && Boolean(measure)
    && Boolean(identity)
    && profile?.nullCount === 0
    && profile.cardinality.mode === "exact"
    && profile.uniqueness.uniquenessRatio === 1
    && candidateId !== null
    && source.grain.signature.identityBasis.selectedCandidateIds.includes(candidateId)
    && evidence.inferred === false
    && evidence.attachedAt === "canonical_source"
    && evidence.provenance.kind === "user_confirmed"
    && evidence.provenance.reference.trim().length > 0
    && evidence.provenance.referenceHash.algorithm === "sha256"
    && /^[a-f0-9]{64}$/.test(evidence.provenance.referenceHash.value);
}
