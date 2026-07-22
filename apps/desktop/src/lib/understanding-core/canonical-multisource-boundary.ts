import { materializeRuntimeDatasetSource } from "../full-file-runtime-materializer";
import type { MaterializedRuntimeData } from "../full-file-runtime-parser";
import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import type { CanonicalConsumerArtifactV1, CanonicalDatasetStateInputV1, CanonicalInvestigationHandoffV1 } from "./canonical-consumer-boundary";
import { getOrBuildCanonicalConsumerArtifact, prepareCanonicalInvestigationHandoff } from "./canonical-consumer-boundary";
import type { CanonicalSourceBoundaryV1 } from "./canonical-source-boundary";
import {
  validateCanonicalUserOverlay,
  type CanonicalSourceEvidenceDeclarationV1,
  type CanonicalUserOverlayV1,
} from "./canonical-user-overlay";
import { generateGrainCandidateArtifact } from "./grain-candidate-engine";
import { generateRelationshipCandidateArtifact } from "./relationship-candidate-engine";
import type { RelationshipCandidateArtifactV1 } from "./relationship-candidate-contracts";
import type { RelationshipResolutionArtifactV1 } from "./relationship-resolution-contracts";
import { resolveRelationshipShadow } from "./relationship-resolver";

export const CANONICAL_MULTISOURCE_DATASET_VERSION = "lightbi.canonical-multisource-dataset.v1" as const;
export const GOVERNED_PRODUCTION_RELATIONSHIP_VERSION = "lightbi.governed-production-relationship.v1" as const;
export const GOVERNED_PRODUCTION_RELATIONSHIP_POLICY_VERSION = "lightbi.governed-production-relationship-policy.v1" as const;

export function buildCanonicalMultiSourceMemberArtifact(
  input: CanonicalDatasetStateInputV1,
): ReturnType<typeof getOrBuildCanonicalConsumerArtifact> {
  return getOrBuildCanonicalConsumerArtifact(input);
}

export type CanonicalSourceRoleV1 = "sales" | "accounting" | "logistics" | "inventory_snapshot" | "inventory_movement" | "unknown_other";
export type GovernedRelationshipStateV1 = "confirmed" | "conditional" | "ambiguous" | "rejected" | "insufficient_evidence" | "stale";

export type CanonicalMultiSourceMembershipV1 = {
  sourceId: string;
  sourceFingerprint: string;
  inspectionGeneration: string;
  profileGeneration: string;
  sourceLocalArtifactId: string;
  sourceRole: CanonicalSourceRoleV1;
  sourceRoleProvenance: string | null;
  required: boolean;
  overlayIdentity: string;
  semanticSampleScope: CanonicalSourceBoundaryV1["semanticSample"];
  fullFileProfile: CanonicalSourceBoundaryV1["fullFileProfile"];
  runtimeSource: CanonicalSourceBoundaryV1["runtimeSource"];
  sourceEvidence: CanonicalConsumerArtifactV1["canonicalSource"]["sourceEvidence"];
  restrictions: string[];
  completenessState: "complete" | "incomplete" | "stale";
  boundary: CanonicalSourceBoundaryV1;
  artifact: CanonicalConsumerArtifactV1;
  overlay: CanonicalUserOverlayV1;
};

export type GovernedProductionRelationshipArtifactV1 = {
  schemaVersion: typeof GOVERNED_PRODUCTION_RELATIONSHIP_VERSION;
  relationshipArtifactId: string;
  relationshipPolicyVersion: typeof GOVERNED_PRODUCTION_RELATIONSHIP_POLICY_VERSION;
  participatingSourceIds: string[];
  sourceFingerprints: string[];
  sourceLocalArtifactIds: string[];
  sourceRoles: Array<{ sourceId: string; role: CanonicalSourceRoleV1; provenance: string }>;
  candidateRelationshipType: "identity_equivalence" | "unresolved_relation";
  identityBindings: Array<{ sourceId: string; physicalColumn: string; canonicalIdentity: "document_identity" }>;
  reportingPeriod: string | null;
  currency: string | null;
  cardinalityHypothesis: "one_to_one" | "unknown";
  grainCompatibility: "compatible" | "incompatible" | "unknown";
  evidenceReferences: string[];
  contradictions: string[];
  validationState: GovernedRelationshipStateV1;
  restrictions: string[];
  refusalReasons: string[];
  selectedCandidateId: string | null;
  selectedKeyPairId: string | null;
  matchedDistinct: number | null;
  candidateArtifact: RelationshipCandidateArtifactV1;
  shadowResolution: RelationshipResolutionArtifactV1;
  decisionUseAuthorized: false;
};

export type CanonicalMultiSourceAnalysisV1 = {
  analysisId: string;
  metricId: "gross_profit";
  state: "ready" | "blocked";
  requiredSourceIds: string[];
  relationshipArtifactId: string;
  metricSourceId: string | null;
  m1Identity: string | null;
  m2Identity: string | null;
  m3Identity: string | null;
  actionCandidateId: string | null;
  blockers: string[];
  limitations: string[];
  prohibitedUses: string[];
  queryPlanIdentity: string | null;
  queryPlanSourceIds: string[];
  sourceLocalHandoff: CanonicalInvestigationHandoffV1 | null;
};

export type CanonicalMultiSourceDatasetV1 = {
  schemaVersion: typeof CANONICAL_MULTISOURCE_DATASET_VERSION;
  multiSourceDatasetId: string;
  stateGeneration: string;
  identity: string;
  orderedSourceMemberships: CanonicalMultiSourceMembershipV1[];
  relationshipArtifactId: string;
  relationship: GovernedProductionRelationshipArtifactV1;
  overlayIdentity: string;
  createdAt: string;
  supersededStateReference: string | null;
  analyses: CanonicalMultiSourceAnalysisV1[];
  restrictions: string[];
  decisionUseAuthorized: false;
};

export type CanonicalMultiSourceBuildMemberV1 = {
  artifact: CanonicalConsumerArtifactV1;
  overlay: CanonicalUserOverlayV1;
  required: boolean;
  fullRows?: Record<string, unknown>[];
};

export type CanonicalMultiSourceBuildResultV1 =
  | { status: "valid"; dataset: CanonicalMultiSourceDatasetV1; blockers: [] }
  | { status: "invalid"; dataset: null; blockers: string[]; relationship?: GovernedProductionRelationshipArtifactV1 };

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function activeDeclarations(overlay: CanonicalUserOverlayV1): CanonicalSourceEvidenceDeclarationV1[] {
  const superseded = new Set(overlay.sourceEvidenceDeclarations.map((item) => item.supersededDeclarationReference).filter((item): item is string => Boolean(item)));
  return overlay.sourceEvidenceDeclarations.filter((item) => !superseded.has(item.declarationId) && item.validationStatus === "valid");
}

function declaration<T extends CanonicalSourceEvidenceDeclarationV1["value"]["kind"]>(overlay: CanonicalUserOverlayV1, kind: T) {
  return activeDeclarations(overlay).find((item) => item.value.kind === kind) as (CanonicalSourceEvidenceDeclarationV1 & { value: Extract<CanonicalSourceEvidenceDeclarationV1["value"], { kind: T }> }) | undefined;
}

function roleFor(overlay: CanonicalUserOverlayV1): { role: CanonicalSourceRoleV1; provenance: string } | null {
  const item = declaration(overlay, "source_role");
  return item ? { role: item.value.role, provenance: item.declarationId } : null;
}

function periodFor(overlay: CanonicalUserOverlayV1): { value: string; provenance: string } | null {
  const item = declaration(overlay, "reporting_period");
  return item ? { value: `${item.value.start}/${item.value.end}`, provenance: item.declarationId } : null;
}

function currencyFor(overlay: CanonicalUserOverlayV1): { value: string; provenance: string } | null {
  const item = declaration(overlay, "reporting_currency");
  return item ? { value: item.value.currency.trim().toUpperCase(), provenance: item.declarationId } : null;
}

function documentFor(overlay: CanonicalUserOverlayV1): { physicalColumn: string; provenance: string } | null {
  const item = declaration(overlay, "document_identity");
  return item ? { physicalColumn: item.value.physicalColumn, provenance: item.declarationId } : null;
}

function rawMatrix(boundary: CanonicalSourceBoundaryV1, rows: readonly Record<string, unknown>[]): unknown[][] {
  const columns = boundary.semanticSample.columns;
  const valueFor = (row: Record<string, unknown>, column: string) => {
    if (Object.prototype.hasOwnProperty.call(row, column)) return row[column];
    const normalized = column.trim().toLocaleLowerCase("en-US");
    const key = Object.keys(row).find((candidate) => candidate.trim().toLocaleLowerCase("en-US") === normalized);
    return key ? row[key] : null;
  };
  return [columns, ...rows.map((row) => columns.map((column) => valueFor(row, column) ?? null))];
}

async function rowsFor(member: CanonicalMultiSourceBuildMemberV1, signal?: AbortSignal): Promise<Record<string, unknown>[]> {
  if (member.fullRows) return member.fullRows;
  const boundary = member.artifact.sourceBoundary!;
  const materialized = await materializeRuntimeDatasetSource(boundary.runtimeSource, signal, boundary.runtimeSource.binding);
  return JSON.parse(materialized.jsonText) as Record<string, unknown>[];
}

function membership(member: CanonicalMultiSourceBuildMemberV1): CanonicalMultiSourceMembershipV1 {
  const boundary = member.artifact.sourceBoundary!;
  const role = roleFor(member.overlay);
  return {
    sourceId: boundary.sourceId,
    sourceFingerprint: boundary.sourceFingerprint,
    inspectionGeneration: boundary.inspectionGeneration,
    profileGeneration: boundary.profileGeneration,
    sourceLocalArtifactId: member.artifact.identity,
    sourceRole: role?.role ?? "unknown_other",
    sourceRoleProvenance: role?.provenance ?? null,
    required: member.required,
    overlayIdentity: member.overlay.overlayId,
    semanticSampleScope: boundary.semanticSample,
    fullFileProfile: boundary.fullFileProfile,
    runtimeSource: boundary.runtimeSource,
    sourceEvidence: member.artifact.canonicalSource.sourceEvidence,
    restrictions: unique([...member.artifact.blockers, ...member.artifact.caveats]),
    completenessState: "complete",
    boundary,
    artifact: member.artifact,
    overlay: member.overlay,
  };
}

function invalidRelationship(args: {
  memberships: readonly CanonicalMultiSourceMembershipV1[];
  candidates: RelationshipCandidateArtifactV1;
  resolution: RelationshipResolutionArtifactV1;
  blockers: string[];
  state?: GovernedRelationshipStateV1;
}): GovernedProductionRelationshipArtifactV1 {
  const base = {
    schemaVersion: GOVERNED_PRODUCTION_RELATIONSHIP_VERSION,
    relationshipPolicyVersion: GOVERNED_PRODUCTION_RELATIONSHIP_POLICY_VERSION,
    participatingSourceIds: args.memberships.map((item) => item.sourceId),
    sourceFingerprints: args.memberships.map((item) => item.sourceFingerprint),
    sourceLocalArtifactIds: args.memberships.map((item) => item.sourceLocalArtifactId),
    sourceRoles: args.memberships.map((item) => ({ sourceId: item.sourceId, role: item.sourceRole, provenance: item.sourceRoleProvenance ?? "missing" })),
    candidateRelationshipType: "unresolved_relation" as const,
    identityBindings: [],
    reportingPeriod: null,
    currency: null,
    cardinalityHypothesis: "unknown" as const,
    grainCompatibility: "unknown" as const,
    evidenceReferences: [],
    contradictions: unique(args.blockers),
    validationState: args.state ?? "insufficient_evidence" as GovernedRelationshipStateV1,
    restrictions: ["relationship_not_authorized_for_execution", "decision_use_prohibited"],
    refusalReasons: unique(args.blockers),
    selectedCandidateId: null,
    selectedKeyPairId: null,
    matchedDistinct: null,
    candidateArtifact: args.candidates,
    shadowResolution: args.resolution,
    decisionUseAuthorized: false as const,
  };
  return { ...base, relationshipArtifactId: `governed-relationship:${deterministicPolicySha256(base)}` };
}

function approveSalesAccountingRelationship(
  memberships: readonly CanonicalMultiSourceMembershipV1[],
  candidates: RelationshipCandidateArtifactV1,
  resolution: RelationshipResolutionArtifactV1,
): GovernedProductionRelationshipArtifactV1 {
  const sales = memberships.filter((item) => item.sourceRole === "sales");
  const accounting = memberships.filter((item) => item.sourceRole === "accounting");
  const blockers: string[] = [];
  if (sales.length !== 1) blockers.push(sales.length ? "multiple_sales_sources_not_supported" : "required_sales_source_missing");
  if (accounting.length !== 1) blockers.push(accounting.length ? "multiple_accounting_sources_not_supported" : "required_accounting_source_missing");
  if (memberships.some((item) => item.sourceRole === "unknown_other" && item.required)) blockers.push("required_source_role_unknown");
  if (blockers.length) return invalidRelationship({ memberships, candidates, resolution, blockers });

  const endpoints = [sales[0], accounting[0]];
  const documents = endpoints.map((item) => documentFor(item.overlay));
  const periods = endpoints.map((item) => periodFor(item.overlay));
  const currencies = endpoints.map((item) => currencyFor(item.overlay));
  if (documents.some((item) => !item)) blockers.push("source_bound_document_identity_required");
  if (periods.some((item) => !item)) blockers.push("source_bound_reporting_period_required");
  if (currencies.some((item) => !item)) blockers.push("source_bound_currency_required");
  if (periods.every(Boolean) && periods[0]!.value !== periods[1]!.value) blockers.push("reporting_period_mismatch");
  if (currencies.every(Boolean) && currencies[0]!.value !== currencies[1]!.value) blockers.push("currency_mismatch");

  const pair = candidates.pairs.find((item) => new Set([item.leftSourceId, item.rightSourceId]).size === 2
    && [sales[0].sourceId, accounting[0].sourceId].every((id) => [item.leftSourceId, item.rightSourceId].includes(id)));
  const identityCandidate = pair?.candidates.find((item) => item.relationshipClass === "identity_equivalence");
  const keyPair = documents.every(Boolean) ? identityCandidate?.keyPairAlternatives.find((item) => {
    const expected = new Map(endpoints.map((member, index) => [member.sourceId, documents[index]!.physicalColumn]));
    return item.componentPairs.length === 1
      && expected.get(item.left.sourceId) === item.componentPairs[0].leftColumn
      && expected.get(item.right.sourceId) === item.componentPairs[0].rightColumn;
  }) : undefined;
  if (!pair || !identityCandidate) blockers.push("identity_relationship_candidate_missing");
  if (!keyPair) blockers.push("declared_document_identity_not_supported_by_relationship_candidate");
  if (keyPair && (keyPair.overlap.coverageRatio !== 1 || keyPair.overlap.leftUnmatchedDistinct !== 0 || keyPair.overlap.rightUnmatchedDistinct !== 0)) blockers.push("document_identity_full_overlap_required");
  if (keyPair && (keyPair.overlap.leftNulls !== 0 || keyPair.overlap.rightNulls !== 0)) blockers.push("document_identity_nulls_forbidden");
  if (keyPair && (keyPair.overlap.leftDuplicateRows !== 0 || keyPair.overlap.rightDuplicateRows !== 0 || keyPair.overlap.possibleFanout)) blockers.push("one_to_one_document_identity_required");
  if (identityCandidate && !identityCandidate.operationAlternatives.some((item) => item === "reconcile_candidate" || item === "join_candidate")) blockers.push("relationship_operation_not_compatible");
  if (keyPair && !keyPair.cardinalityAlternatives.includes("one_to_one")) blockers.push("relationship_cardinality_not_one_to_one");
  const exactIdentityReconciliation = Boolean(keyPair
    && keyPair.overlap.coverageRatio === 1
    && keyPair.overlap.leftNulls === 0
    && keyPair.overlap.rightNulls === 0
    && keyPair.overlap.leftDuplicateRows === 0
    && keyPair.overlap.rightDuplicateRows === 0
    && !keyPair.overlap.possibleFanout
    && keyPair.cardinalityAlternatives.includes("one_to_one"));
  if (identityCandidate?.grain.structural === "mixed" && !exactIdentityReconciliation) blockers.push("relationship_grain_incompatible");
  const unresolvedRisks = resolution.pairs.find((item) => item.pairId === pair?.pairId)?.operationCompatibility.blockingRisks
    .filter((risk) => !(risk === "mixed_grain" && exactIdentityReconciliation)) ?? [];
  if (unresolvedRisks.length) blockers.push("relationship_policy_blocking_risk");
  if (blockers.length) return invalidRelationship({ memberships, candidates, resolution, blockers, state: blockers.some((item) => item.endsWith("mismatch") || item.includes("forbidden")) ? "rejected" : "insufficient_evidence" });

  const evidenceReferences = unique([
    documents[0]!.provenance, documents[1]!.provenance,
    periods[0]!.provenance, periods[1]!.provenance,
    currencies[0]!.provenance, currencies[1]!.provenance,
    identityCandidate!.candidateId, keyPair!.candidateId,
    ...identityCandidate!.evidence.map((item) => item.evidenceId),
  ]);
  const base = {
    schemaVersion: GOVERNED_PRODUCTION_RELATIONSHIP_VERSION,
    relationshipPolicyVersion: GOVERNED_PRODUCTION_RELATIONSHIP_POLICY_VERSION,
    participatingSourceIds: endpoints.map((item) => item.sourceId).sort(),
    sourceFingerprints: endpoints.map((item) => item.sourceFingerprint).sort(),
    sourceLocalArtifactIds: endpoints.map((item) => item.sourceLocalArtifactId).sort(),
    sourceRoles: endpoints.map((item) => ({ sourceId: item.sourceId, role: item.sourceRole, provenance: item.sourceRoleProvenance! })).sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
    candidateRelationshipType: "identity_equivalence" as const,
    identityBindings: endpoints.map((item, index) => ({ sourceId: item.sourceId, physicalColumn: documents[index]!.physicalColumn, canonicalIdentity: "document_identity" as const })).sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
    reportingPeriod: periods[0]!.value,
    currency: currencies[0]!.value,
    cardinalityHypothesis: "one_to_one" as const,
    grainCompatibility: "compatible" as const,
    evidenceReferences,
    contradictions: [],
    validationState: "confirmed" as const,
    restrictions: [
      "relationship_supports_only_existing_commerce_distribution_actions",
      "identity_reconciliation_only",
      "cross_source_measure_join_prohibited",
      ...(identityCandidate!.grain.structural === "mixed" ? ["source_structural_grains_differ"] : []),
      "decision_use_prohibited",
    ],
    refusalReasons: [],
    selectedCandidateId: identityCandidate!.candidateId,
    selectedKeyPairId: keyPair!.candidateId,
    matchedDistinct: keyPair!.overlap.matchedDistinct,
    candidateArtifact: candidates,
    shadowResolution: resolution,
    decisionUseAuthorized: false as const,
  };
  return { ...base, relationshipArtifactId: `governed-relationship:${deterministicPolicySha256(base)}` };
}

function grossProfitAnalysis(memberships: readonly CanonicalMultiSourceMembershipV1[], relationship: GovernedProductionRelationshipArtifactV1): CanonicalMultiSourceAnalysisV1 {
  const accounting = memberships.find((item) => item.sourceRole === "accounting");
  const blockers: string[] = [];
  if (relationship.validationState !== "confirmed" && relationship.validationState !== "conditional") blockers.push(...relationship.refusalReasons, `relationship_${relationship.validationState}`);
  const metric = accounting?.artifact.metricPreflight.metrics.find((item) => item.metricId === "gross_profit");
  if (!metric || !["ready", "conditionally_ready"].includes(metric.state)) blockers.push(...(metric?.blockers.map((item) => item.code) ?? ["gross_profit_metric_not_eligible"]));
  const action = accounting?.artifact.questionGeneration.actionCandidates.find((item) => item.metricId === "gross_profit") ?? null;
  if (!action) blockers.push("gross_profit_action_not_advertised_by_unchanged_m2");
  const handoff = accounting && action ? prepareCanonicalInvestigationHandoff(accounting.artifact, action.actionCandidateId) : null;
  if (!handoff?.runtimePreflight.executionAllowed || handoff.queryPlanning.state !== "planned") blockers.push(...(handoff?.blockers ?? ["unchanged_m3_not_executable"]));
  const requiredSourceIds = memberships.filter((item) => ["sales", "accounting"].includes(item.sourceRole)).map((item) => item.sourceId).sort();
  if (requiredSourceIds.length !== 2) blockers.push("gross_profit_requires_sales_and_accounting_sources");
  const finalBlockers = unique(blockers);
  const queryPlanIdentity = handoff?.queryPlanning.state === "planned"
    ? `multisource-plan:${deterministicPolicySha256({ relationship: relationship.relationshipArtifactId, sourceIds: requiredSourceIds, metricPlan: handoff.queryPlanning.plan.planId })}`
    : null;
  return {
    analysisId: `multisource-analysis:${deterministicPolicySha256({ metricId: "gross_profit", relationship: relationship.relationshipArtifactId, sourceIds: requiredSourceIds })}`,
    metricId: "gross_profit",
    state: finalBlockers.length ? "blocked" : "ready",
    requiredSourceIds,
    relationshipArtifactId: relationship.relationshipArtifactId,
    metricSourceId: accounting?.sourceId ?? null,
    m1Identity: accounting?.artifact.metricPreflight.identity ?? null,
    m2Identity: accounting?.artifact.questionGeneration.identity ?? null,
    m3Identity: handoff?.runtimePreflight.identity ?? null,
    actionCandidateId: action?.actionCandidateId ?? null,
    blockers: finalBlockers,
    limitations: ["Gross profit is calculated by the unchanged governed Accounting formula; Sales is independently materialized and used to validate the declared document relationship and reporting scope."],
    prohibitedUses: ["unreconciled_revenue_cost_subtraction", "decision_use_without_review"],
    queryPlanIdentity,
    queryPlanSourceIds: finalBlockers.length ? [] : requiredSourceIds,
    sourceLocalHandoff: finalBlockers.length ? null : handoff,
  };
}

export async function buildCanonicalMultiSourceDataset(input: {
  multiSourceDatasetId: string;
  members: CanonicalMultiSourceBuildMemberV1[];
  createdAt?: string;
  supersededStateReference?: string | null;
  signal?: AbortSignal;
}): Promise<CanonicalMultiSourceBuildResultV1> {
  const blockers: string[] = [];
  if (!input.multiSourceDatasetId.trim()) blockers.push("multi_source_dataset_id_required");
  if (input.members.length < 2) blockers.push("multi_source_dataset_requires_two_sources");
  for (const member of input.members) {
    if (!member.artifact.sourceBoundary) blockers.push("source_local_canonical_boundary_required");
    if (member.artifact.overlayIdentity !== member.overlay.overlayId) blockers.push("source_local_artifact_overlay_mismatch");
    if (member.artifact.sourceBoundary && !validateCanonicalUserOverlay(member.artifact.sourceBoundary, member.overlay).valid) blockers.push("source_overlay_invalid_or_stale");
  }
  const boundaries = input.members.map((item) => item.artifact.sourceBoundary).filter((item): item is CanonicalSourceBoundaryV1 => Boolean(item));
  if (new Set(boundaries.map((item) => item.sourceId)).size !== boundaries.length) blockers.push("duplicate_source_membership");
  if (blockers.length) return { status: "invalid", dataset: null, blockers: unique(blockers) };

  const orderedMembers = [...input.members].sort((a, b) => a.artifact.sourceBoundary!.sourceId.localeCompare(b.artifact.sourceBoundary!.sourceId));
  const rows = await Promise.all(orderedMembers.map((item) => rowsFor(item, input.signal)));
  if (rows.some((item, index) => item.length !== orderedMembers[index].artifact.sourceBoundary!.sourceRowCount)) return { status: "invalid", dataset: null, blockers: ["full_source_row_count_mismatch"] };
  const memberships = orderedMembers.map(membership);
  const relationshipMembers = orderedMembers.map((member, index) => {
    const boundary = member.artifact.sourceBoundary!;
    const matrix = rawMatrix(boundary, rows[index]);
    return {
      physical: member.artifact.canonicalSource.physical,
      semantic: member.artifact.canonicalSource.semantic,
      grainCandidate: generateGrainCandidateArtifact(member.artifact.canonicalSource.physical, member.artifact.canonicalSource.semantic, matrix),
      grainResolution: member.artifact.canonicalSource.grain,
      rawRows: matrix,
    };
  });
  const candidates = generateRelationshipCandidateArtifact({ schemaVersion: "lightbi.source-bundle-input.v1", bundleId: input.multiSourceDatasetId, members: relationshipMembers });
  const shadowResolution = resolveRelationshipShadow(candidates);
  const relationship = approveSalesAccountingRelationship(memberships, candidates, shadowResolution);
  const analyses = [grossProfitAnalysis(memberships, relationship)];
  const overlayIdentity = `composite-overlay:${deterministicPolicySha256(memberships.map((item) => ({ sourceId: item.sourceId, overlayId: item.overlayIdentity })))}`;
  const identityBody = {
    schemaVersion: CANONICAL_MULTISOURCE_DATASET_VERSION,
    multiSourceDatasetId: input.multiSourceDatasetId,
    memberships: memberships.map((item) => ({ sourceId: item.sourceId, sourceFingerprint: item.sourceFingerprint, inspectionGeneration: item.inspectionGeneration, profileGeneration: item.profileGeneration, sourceLocalArtifactId: item.sourceLocalArtifactId, sourceRole: item.sourceRole, roleProvenance: item.sourceRoleProvenance, required: item.required, overlayIdentity: item.overlayIdentity })),
    relationshipArtifactId: relationship.relationshipArtifactId,
    overlayIdentity,
    supersededStateReference: input.supersededStateReference ?? null,
    analyses: analyses.map((item) => ({ analysisId: item.analysisId, state: item.state, queryPlanIdentity: item.queryPlanIdentity })),
  };
  const identity = `canonical-multisource:${deterministicPolicySha256(identityBody)}`;
  const dataset: CanonicalMultiSourceDatasetV1 = {
    schemaVersion: CANONICAL_MULTISOURCE_DATASET_VERSION,
    multiSourceDatasetId: input.multiSourceDatasetId,
    stateGeneration: `multisource-generation:${deterministicPolicySha256({ identityBody, generation: memberships.map((item) => [item.inspectionGeneration, item.profileGeneration]) })}`,
    identity,
    orderedSourceMemberships: memberships,
    relationshipArtifactId: relationship.relationshipArtifactId,
    relationship,
    overlayIdentity,
    createdAt: input.createdAt ?? new Date().toISOString(),
    supersededStateReference: input.supersededStateReference ?? null,
    analyses,
    restrictions: ["commerce_distribution_mvp_only", "no_generic_join_authority", "decision_use_prohibited"],
    decisionUseAuthorized: false,
  };
  return { status: "valid", dataset, blockers: [] };
}

export function validateCanonicalMultiSourceDataset(dataset: CanonicalMultiSourceDatasetV1): string[] {
  const blockers: string[] = [];
  const memberships = dataset.orderedSourceMemberships;
  if (memberships.length < 2) blockers.push("multi_source_membership_incomplete");
  if (new Set(memberships.map((item) => item.sourceId)).size !== memberships.length) blockers.push("duplicate_source_membership");
  for (const item of memberships) {
    const boundary = item.boundary;
    if (boundary.sourceFingerprint !== item.sourceFingerprint) blockers.push(`stale_source_fingerprint:${item.sourceId}`);
    if (boundary.inspectionGeneration !== item.inspectionGeneration || boundary.profileGeneration !== item.profileGeneration) blockers.push(`stale_source_generation:${item.sourceId}`);
    if (item.artifact.identity !== item.sourceLocalArtifactId || item.artifact.overlayIdentity !== item.overlayIdentity) blockers.push(`stale_source_local_artifact:${item.sourceId}`);
    if (item.overlay.overlayId !== item.overlayIdentity) blockers.push(`stale_source_overlay_identity:${item.sourceId}`);
    if (!validateCanonicalUserOverlay(boundary, item.overlay).valid) blockers.push(`stale_source_overlay:${item.sourceId}`);
  }
  if (dataset.relationship.relationshipArtifactId !== dataset.relationshipArtifactId) blockers.push("relationship_artifact_identity_mismatch");
  if (unique(dataset.relationship.participatingSourceIds).join("|") !== unique(memberships.map((item) => item.sourceId)).join("|")) blockers.push("relationship_source_membership_mismatch");
  if (unique(dataset.relationship.sourceFingerprints).join("|") !== unique(memberships.map((item) => item.sourceFingerprint)).join("|")) blockers.push("relationship_source_fingerprint_mismatch");
  if (unique(dataset.relationship.sourceLocalArtifactIds).join("|") !== unique(memberships.map((item) => item.sourceLocalArtifactId)).join("|")) blockers.push("relationship_source_artifact_mismatch");
  if (dataset.relationship.participatingSourceIds.some((id) => !memberships.some((item) => item.sourceId === id))) blockers.push("relationship_source_membership_missing");
  const ready = dataset.analyses.filter((item) => item.state === "ready");
  for (const analysis of ready) {
    if (!analysis.sourceLocalHandoff?.runtimePreflight.executionAllowed || analysis.sourceLocalHandoff.queryPlanning.state !== "planned") blockers.push("multi_source_action_without_m3_approval");
    if (analysis.relationshipArtifactId !== dataset.relationshipArtifactId) blockers.push("multi_source_analysis_relationship_superseded");
    if (analysis.requiredSourceIds.some((id) => !analysis.queryPlanSourceIds.includes(id))) blockers.push("multi_source_query_plan_omits_required_source");
  }
  return unique(blockers);
}

export type CanonicalMultiSourceInvestigationHandoffV1 = CanonicalInvestigationHandoffV1 & {
  multiSource: {
    schemaVersion: "lightbi.canonical-multisource-investigation-handoff.v1";
    multiSourceArtifactId: string;
    stateGeneration: string;
    relationshipArtifactId: string;
    relationshipState: GovernedRelationshipStateV1;
    requiredSourceIds: string[];
    queryPlanIdentity: string;
    sourceMemberships: Array<Pick<CanonicalMultiSourceMembershipV1, "sourceId" | "sourceFingerprint" | "inspectionGeneration" | "profileGeneration" | "sourceRole" | "runtimeSource" | "boundary">>;
    restrictions: string[];
  };
};

export function prepareCanonicalMultiSourceInvestigationHandoff(dataset: CanonicalMultiSourceDatasetV1, analysisId: string): CanonicalMultiSourceInvestigationHandoffV1 | null {
  if (validateCanonicalMultiSourceDataset(dataset).length) return null;
  const analysis = dataset.analyses.find((item) => item.analysisId === analysisId && item.state === "ready");
  if (!analysis?.sourceLocalHandoff || !analysis.queryPlanIdentity) return null;
  return {
    ...analysis.sourceLocalHandoff,
    multiSource: {
      schemaVersion: "lightbi.canonical-multisource-investigation-handoff.v1",
      multiSourceArtifactId: dataset.identity,
      stateGeneration: dataset.stateGeneration,
      relationshipArtifactId: dataset.relationshipArtifactId,
      relationshipState: dataset.relationship.validationState,
      requiredSourceIds: analysis.requiredSourceIds,
      queryPlanIdentity: analysis.queryPlanIdentity,
      sourceMemberships: dataset.orderedSourceMemberships
        .filter((item) => analysis.requiredSourceIds.includes(item.sourceId))
        .map((item) => ({ sourceId: item.sourceId, sourceFingerprint: item.sourceFingerprint, inspectionGeneration: item.inspectionGeneration, profileGeneration: item.profileGeneration, sourceRole: item.sourceRole, runtimeSource: item.runtimeSource, boundary: item.boundary })),
      restrictions: unique([...dataset.restrictions, ...analysis.prohibitedUses]),
    },
  };
}

export function validateCanonicalMultiSourceInvestigationHandoff(handoff: CanonicalMultiSourceInvestigationHandoffV1, current: CanonicalMultiSourceDatasetV1): string[] {
  const blockers = validateCanonicalMultiSourceDataset(current);
  if (handoff.multiSource.multiSourceArtifactId !== current.identity) blockers.push("multisource_handoff_artifact_superseded");
  if (handoff.multiSource.stateGeneration !== current.stateGeneration) blockers.push("multisource_handoff_generation_superseded");
  if (handoff.multiSource.relationshipArtifactId !== current.relationshipArtifactId) blockers.push("multisource_handoff_relationship_superseded");
  const analysis = current.analyses.find((item) => item.queryPlanIdentity === handoff.multiSource.queryPlanIdentity);
  if (!analysis || analysis.state !== "ready") blockers.push("multisource_handoff_plan_not_current");
  return unique(blockers);
}

export type CanonicalMultiSourceMaterializerV1 = (boundary: CanonicalSourceBoundaryV1, signal?: AbortSignal) => Promise<MaterializedRuntimeData>;
