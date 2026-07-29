import { SEMANTIC_SIGNAL_BY_ID, type SemanticSignalDefinition } from "../semantic-registry";
import type { CanonicalSourceBoundaryV1 } from "./canonical-source-boundary";
import { createCanonicalSourceCurrencyEvidence, createCanonicalSourceDocumentIdentityEvidence, createCanonicalSourceInventorySnapshotEvidence, createCanonicalSourceLineMeasureEvidence } from "./canonical-source-evidence";
import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import type { CanonicalMetricSourceV1 } from "./governed-domain-metric-contracts";
import type { ColumnSemanticResolutionV1, SemanticResolutionArtifactV1 } from "./semantic-resolution-contracts";

export const CANONICAL_USER_OVERLAY_VERSION = "lightbi.canonical-user-overlay.v1" as const;

export type CanonicalOverlayBindingV1 = Pick<CanonicalSourceBoundaryV1,
  "datasetId" | "sourceId" | "sourceFingerprint" | "inspectionGeneration" | "profileGeneration"
> & { sheetOrTable: string | null };

export type CanonicalMappingDecisionTypeV1 =
  | "confirm_candidate"
  | "map_to_existing_signal"
  | "ignore_for_semantic_analysis"
  | "reset_to_inferred";

export type CanonicalMappingDecisionV1 = {
  overlayVersion: typeof CANONICAL_USER_OVERLAY_VERSION;
  decisionId: string;
  binding: CanonicalOverlayBindingV1;
  physicalColumn: string;
  sourceColumnIndex: number;
  selectedCanonicalSignal: string | null;
  decisionType: CanonicalMappingDecisionTypeV1;
  originalCandidateList: string[];
  rationaleSource: "user_review";
  createdAt: string;
  supersededDecisionReference: string | null;
};

export type CanonicalEvidenceTypeV1 =
  | "reporting_currency"
  | "unit_of_measure"
  | "reporting_period"
  | "snapshot_as_of_date"
  | "source_role"
  | "item_identity"
  | "document_identity"
  | "line_measure"
  | "warehouse_location_identity";

export type CanonicalEvidenceScopeV1 =
  | { level: "dataset" }
  | { level: "source_file" }
  | { level: "sheet_table"; sheetOrTable: string }
  | { level: "physical_column"; physicalColumn: string }
  | { level: "canonical_signal_binding"; physicalColumn: string; canonicalSignal: string };

export type CanonicalEvidenceValueV1 =
  | { kind: "reporting_currency"; currency: string; monetaryColumns: string[] }
  | { kind: "unit_of_measure"; unit: string; quantityColumn: string; uomColumn: string }
  | { kind: "reporting_period"; start: string; end: string }
  | { kind: "snapshot_as_of_date"; date: string; physicalColumn: string }
  | { kind: "source_role"; role: "sales" | "accounting" | "logistics" | "inventory_snapshot" | "inventory_movement" | "unknown_other" }
  | { kind: "item_identity"; physicalColumn: string }
  | { kind: "document_identity"; physicalColumn: string }
  | { kind: "line_measure"; physicalColumn: string; semanticId: string; rowIdentityPhysicalColumn: string }
  | { kind: "warehouse_location_identity"; physicalColumn: string };

export type CanonicalSourceEvidenceDeclarationV1 = {
  overlayVersion: typeof CANONICAL_USER_OVERLAY_VERSION;
  declarationId: string;
  binding: CanonicalOverlayBindingV1;
  evidenceType: CanonicalEvidenceTypeV1;
  value: CanonicalEvidenceValueV1;
  scope: CanonicalEvidenceScopeV1;
  provenance: "user_confirmed";
  validationStatus: "pending" | "valid" | "invalid" | "stale";
  validationBlockers: string[];
  createdAt: string;
  supersededDeclarationReference: string | null;
};

export type CanonicalUserOverlayV1 = {
  schemaVersion: typeof CANONICAL_USER_OVERLAY_VERSION;
  overlayId: string;
  revision: number;
  binding: CanonicalOverlayBindingV1;
  mappingDecisions: CanonicalMappingDecisionV1[];
  sourceEvidenceDeclarations: CanonicalSourceEvidenceDeclarationV1[];
  createdAt: string;
  supersedesOverlayId: string | null;
};

export type CanonicalOverlayValidationV1 = {
  valid: boolean;
  stale: boolean;
  blockers: string[];
  mappingResults: Array<{ decisionId: string; valid: boolean; blockers: string[] }>;
  evidenceResults: Array<{ declarationId: string; valid: boolean; blockers: string[] }>;
};

export type CanonicalOverlayProjectionV1 = {
  overlayIdentity: string | null;
  semantic: SemanticResolutionArtifactV1;
  sourceEvidence: CanonicalMetricSourceV1["sourceEvidence"];
  validation: CanonicalOverlayValidationV1;
  appliedDecisionIds: string[];
  appliedDeclarationIds: string[];
};

const SUPPORTED_CURRENCIES = new Set(["AED", "AUD", "BRL", "CAD", "CHF", "CNY", "EUR", "GBP", "HKD", "IDR", "INR", "JPY", "KRW", "MYR", "NZD", "PHP", "SGD", "THB", "TWD", "USD", "VND"]);
const SUPPORTED_UOMS = new Set(["EA", "PCS", "PIECE", "KG", "G", "TON", "L", "ML", "M", "M2", "M3", "BOX", "CARTON", "PACK", "SET", "ROLL", "BAG", "PALLET"]);

function unique(values: readonly string[]): string[] { return [...new Set(values.filter(Boolean))].sort(); }
function now(value?: string): string { return value ?? new Date().toISOString(); }
function isoDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? null : value;
}

export function canonicalOverlayBinding(boundary: CanonicalSourceBoundaryV1): CanonicalOverlayBindingV1 {
  return {
    datasetId: boundary.datasetId,
    sourceId: boundary.sourceId,
    sourceFingerprint: boundary.sourceFingerprint,
    inspectionGeneration: boundary.inspectionGeneration,
    profileGeneration: boundary.profileGeneration,
    sheetOrTable: boundary.fullFileProfile.artifact.sourceProfile.source.sheet ?? null,
  };
}

function sameBinding(left: CanonicalOverlayBindingV1, right: CanonicalOverlayBindingV1): boolean {
  return left.datasetId === right.datasetId && left.sourceId === right.sourceId
    && left.sourceFingerprint === right.sourceFingerprint
    && left.inspectionGeneration === right.inspectionGeneration
    && left.profileGeneration === right.profileGeneration
    && left.sheetOrTable === right.sheetOrTable;
}

function overlayBody(input: Omit<CanonicalUserOverlayV1, "overlayId">) {
  return { ...input, mappingDecisions: input.mappingDecisions.map((item) => ({ ...item })), sourceEvidenceDeclarations: input.sourceEvidenceDeclarations.map((item) => ({ ...item })) };
}

export function createCanonicalUserOverlay(boundary: CanonicalSourceBoundaryV1, createdAt?: string): CanonicalUserOverlayV1 {
  const body = overlayBody({ schemaVersion: CANONICAL_USER_OVERLAY_VERSION, revision: 0, binding: canonicalOverlayBinding(boundary), mappingDecisions: [], sourceEvidenceDeclarations: [], createdAt: now(createdAt), supersedesOverlayId: null });
  return { ...body, overlayId: `canonical-overlay:${deterministicPolicySha256(body)}` };
}

export function resetCanonicalUserOverlay(previous: CanonicalUserOverlayV1, boundary: CanonicalSourceBoundaryV1, createdAt?: string): CanonicalUserOverlayV1 {
  const timestamp = now(createdAt);
  const body = overlayBody({ schemaVersion: CANONICAL_USER_OVERLAY_VERSION, revision: previous.revision + 1, binding: canonicalOverlayBinding(boundary), mappingDecisions: [], sourceEvidenceDeclarations: [], createdAt: timestamp, supersedesOverlayId: previous.overlayId });
  return { ...body, overlayId: `canonical-overlay:${deterministicPolicySha256(body)}` };
}

function activeByKey<T extends { createdAt: string }>(items: readonly T[], key: (item: T) => string): T[] {
  const latest = new Map<string, T>();
  for (const item of items) {
    const current = latest.get(key(item));
    if (!current || current.createdAt <= item.createdAt) latest.set(key(item), item);
  }
  return [...latest.values()];
}

export function appendCanonicalMappingDecision(overlay: CanonicalUserOverlayV1, boundary: CanonicalSourceBoundaryV1, input: Omit<CanonicalMappingDecisionV1, "overlayVersion" | "decisionId" | "binding" | "rationaleSource" | "createdAt" | "supersededDecisionReference"> & { createdAt?: string }): CanonicalUserOverlayV1 {
  const previous = activeByKey(overlay.mappingDecisions, (item) => item.physicalColumn).find((item) => item.physicalColumn === input.physicalColumn);
  const createdAt = now(input.createdAt);
  const decisionBase = { overlayVersion: CANONICAL_USER_OVERLAY_VERSION, binding: canonicalOverlayBinding(boundary), ...input, rationaleSource: "user_review" as const, createdAt, supersededDecisionReference: previous?.decisionId ?? null };
  const decision = { ...decisionBase, decisionId: `mapping-decision:${deterministicPolicySha256(decisionBase)}` };
  return nextOverlay(overlay, boundary, [...overlay.mappingDecisions, decision], overlay.sourceEvidenceDeclarations, createdAt);
}

export function appendCanonicalEvidenceDeclaration(overlay: CanonicalUserOverlayV1, boundary: CanonicalSourceBoundaryV1, input: Omit<CanonicalSourceEvidenceDeclarationV1, "overlayVersion" | "declarationId" | "binding" | "provenance" | "validationStatus" | "validationBlockers" | "createdAt" | "supersededDeclarationReference"> & { createdAt?: string }): CanonicalUserOverlayV1 {
  const key = `${input.evidenceType}:${JSON.stringify(input.scope)}`;
  const previous = activeByKey(overlay.sourceEvidenceDeclarations, (item) => `${item.evidenceType}:${JSON.stringify(item.scope)}`).find((item) => `${item.evidenceType}:${JSON.stringify(item.scope)}` === key);
  const createdAt = now(input.createdAt);
  const pendingBase = { overlayVersion: CANONICAL_USER_OVERLAY_VERSION, binding: canonicalOverlayBinding(boundary), evidenceType: input.evidenceType, value: input.value, scope: input.scope, provenance: "user_confirmed" as const, validationStatus: "pending" as const, validationBlockers: [], createdAt, supersededDeclarationReference: previous?.declarationId ?? null };
  const pending = { ...pendingBase, declarationId: `evidence-declaration:${deterministicPolicySha256(pendingBase)}` };
  const validationBlockers = evidenceValidation(boundary, pending);
  const declarationBase = { ...pendingBase, validationStatus: validationBlockers.length ? "invalid" as const : "valid" as const, validationBlockers };
  const declaration = { ...declarationBase, declarationId: `evidence-declaration:${deterministicPolicySha256(declarationBase)}` };
  return nextOverlay(overlay, boundary, overlay.mappingDecisions, [...overlay.sourceEvidenceDeclarations, declaration], createdAt);
}

export function removeCanonicalEvidenceDeclaration(overlay: CanonicalUserOverlayV1, boundary: CanonicalSourceBoundaryV1, declarationId: string, createdAt?: string): CanonicalUserOverlayV1 {
  const target = overlay.sourceEvidenceDeclarations.find((item) => item.declarationId === declarationId);
  if (!target) return overlay;
  const key = `${target.evidenceType}:${JSON.stringify(target.scope)}`;
  const retained = overlay.sourceEvidenceDeclarations.filter((item) => `${item.evidenceType}:${JSON.stringify(item.scope)}` !== key);
  return nextOverlay(overlay, boundary, overlay.mappingDecisions, retained, now(createdAt));
}

function nextOverlay(previous: CanonicalUserOverlayV1, boundary: CanonicalSourceBoundaryV1, mappingDecisions: CanonicalMappingDecisionV1[], sourceEvidenceDeclarations: CanonicalSourceEvidenceDeclarationV1[], createdAt: string): CanonicalUserOverlayV1 {
  const body = overlayBody({ schemaVersion: CANONICAL_USER_OVERLAY_VERSION, revision: previous.revision + 1, binding: canonicalOverlayBinding(boundary), mappingDecisions, sourceEvidenceDeclarations, createdAt, supersedesOverlayId: previous.overlayId });
  return { ...body, overlayId: `canonical-overlay:${deterministicPolicySha256(body)}` };
}

function physicalColumn(boundary: CanonicalSourceBoundaryV1, name: string) {
  return boundary.fullFileProfile.artifact.sourceProfile.columns.find((item) => item.physicalColumnName === name);
}

function mappingCompatibility(boundary: CanonicalSourceBoundaryV1, decision: CanonicalMappingDecisionV1): string[] {
  const blockers: string[] = [];
  const profile = physicalColumn(boundary, decision.physicalColumn);
  const resolution = boundary.fullFileUnderstanding.semantic.columns.find((item) => item.physicalColumn === decision.physicalColumn && item.sourceColumnIndex === decision.sourceColumnIndex);
  if (!profile || !resolution) return ["overlay_physical_column_not_found"];
  if (decision.decisionType === "ignore_for_semantic_analysis" || decision.decisionType === "reset_to_inferred") {
    if (decision.selectedCanonicalSignal !== null) blockers.push("overlay_ignore_or_reset_must_not_select_signal");
    return blockers;
  }
  const signal = decision.selectedCanonicalSignal ? SEMANTIC_SIGNAL_BY_ID.get(decision.selectedCanonicalSignal) : null;
  if (!signal) return ["overlay_registry_signal_not_found"];
  if (signal.semanticFamily === "derived_metric") blockers.push("overlay_derived_metric_target_forbidden");
  const candidateIds = resolution.candidateTraces.map((item) => item.candidateId);
  if (decision.decisionType === "confirm_candidate" && !candidateIds.includes(signal.canonicalId)) blockers.push("overlay_confirmed_candidate_not_in_original_candidates");
  const observedTypes = profile.physicalTypeCandidates.flatMap((item) => item.type === "numeric_string" ? [item.type, "number"] : item.type === "date_string" || item.type === "excel_serial_date" ? [item.type, "date"] : [item.type]);
  if (!observedTypes.some((type) => signal.compatibleTypes.includes(type))) blockers.push("overlay_signal_physical_type_incompatible");
  if (decision.originalCandidateList.join("\u0000") !== candidateIds.join("\u0000")) blockers.push("overlay_original_candidate_lineage_mismatch");
  return blockers;
}

function scopeMatches(boundary: CanonicalSourceBoundaryV1, scope: CanonicalEvidenceScopeV1): boolean {
  if (scope.level === "dataset" || scope.level === "source_file") return true;
  if (scope.level === "sheet_table") return scope.sheetOrTable === canonicalOverlayBinding(boundary).sheetOrTable;
  return Boolean(physicalColumn(boundary, scope.physicalColumn));
}

function evidenceValidation(boundary: CanonicalSourceBoundaryV1, declaration: CanonicalSourceEvidenceDeclarationV1): string[] {
  const blockers: string[] = [];
  if (!scopeMatches(boundary, declaration.scope)) blockers.push("overlay_evidence_scope_not_in_source");
  if (declaration.evidenceType !== declaration.value.kind) blockers.push("overlay_evidence_type_value_mismatch");
  const value = declaration.value;
  if (value.kind === "reporting_currency") {
    if (!SUPPORTED_CURRENCIES.has(value.currency.trim().toUpperCase())) blockers.push("overlay_currency_code_unsupported");
    if (!value.monetaryColumns.length || value.monetaryColumns.some((name) => !physicalColumn(boundary, name))) blockers.push("overlay_currency_columns_invalid");
    for (const name of value.monetaryColumns) {
      const resolution = boundary.fullFileUnderstanding.semantic.columns.find((item) => item.physicalColumn === name);
      const moneyCandidate = resolution?.candidateTraces.some((trace) => SEMANTIC_SIGNAL_BY_ID.get(trace.candidateId)?.semanticFamily === "money");
      if (!moneyCandidate) blockers.push("overlay_currency_scope_non_monetary");
    }
  } else if (value.kind === "unit_of_measure") {
    if (!SUPPORTED_UOMS.has(value.unit.trim().toUpperCase())) blockers.push("overlay_uom_unsupported");
    if (!physicalColumn(boundary, value.quantityColumn) || !physicalColumn(boundary, value.uomColumn)) blockers.push("overlay_uom_columns_invalid");
    const resolution = boundary.fullFileUnderstanding.semantic.columns.find((item) => item.physicalColumn === value.quantityColumn);
    if (!resolution?.candidateTraces.some((trace) => ["stock_qty", "inventory", "sold_qty"].includes(trace.candidateId))) blockers.push("overlay_uom_quantity_semantics_incompatible");
    if (resolution?.candidateTraces.some((trace) => ["shipment", "shipment_count", "delivery_count"].includes(trace.candidateId)) && !resolution.candidateTraces.some((trace) => ["stock_qty", "inventory", "sold_qty"].includes(trace.candidateId))) blockers.push("overlay_uom_shipment_count_forbidden");
  } else if (value.kind === "reporting_period") {
    const start = isoDate(value.start); const end = isoDate(value.end);
    if (!start || !end) blockers.push("overlay_reporting_period_invalid");
    else if (start > end) blockers.push("overlay_reporting_period_reversed");
  } else if (value.kind === "snapshot_as_of_date") {
    if (!isoDate(value.date)) blockers.push("overlay_snapshot_as_of_invalid");
    if (!physicalColumn(boundary, value.physicalColumn)) blockers.push("overlay_snapshot_as_of_column_invalid");
  } else if (value.kind === "line_measure") {
    const measure = boundary.fullFileUnderstanding.semantic.columns.find((item) => item.physicalColumn === value.physicalColumn);
    const identity = boundary.fullFileUnderstanding.semantic.columns.find((item) => item.physicalColumn === value.rowIdentityPhysicalColumn);
    if (!measure?.candidateTraces.some((trace) => trace.candidateId === value.semanticId && SEMANTIC_SIGNAL_BY_ID.get(trace.candidateId)?.role === "measure")) blockers.push("overlay_line_measure_semantics_incompatible");
    if (!identity?.candidateTraces.some((trace) => SEMANTIC_SIGNAL_BY_ID.get(trace.candidateId)?.role === "identifier")) blockers.push("overlay_line_measure_identity_incompatible");
  } else if (["item_identity", "document_identity", "warehouse_location_identity"].includes(value.kind)) {
    if (!("physicalColumn" in value) || !physicalColumn(boundary, value.physicalColumn)) blockers.push("overlay_identity_column_invalid");
  }
  return unique(blockers);
}

export function validateCanonicalUserOverlay(boundary: CanonicalSourceBoundaryV1, overlay: CanonicalUserOverlayV1): CanonicalOverlayValidationV1 {
  const expected = canonicalOverlayBinding(boundary);
  const stale = !sameBinding(expected, overlay.binding);
  const blockers: string[] = [];
  if (overlay.schemaVersion !== CANONICAL_USER_OVERLAY_VERSION) blockers.push("overlay_schema_version_unsupported");
  if (stale) blockers.push("overlay_source_binding_stale");
  const decisions = activeByKey(overlay.mappingDecisions, (item) => item.physicalColumn);
  const supersededDecisionIds = new Set(overlay.mappingDecisions.map((item) => item.supersededDecisionReference).filter((item): item is string => Boolean(item)));
  const activeDecisionHeads = overlay.mappingDecisions.filter((item) => !supersededDecisionIds.has(item.decisionId));
  for (const column of new Set(activeDecisionHeads.map((item) => item.physicalColumn))) {
    if (activeDecisionHeads.filter((item) => item.physicalColumn === column).length > 1) blockers.push("overlay_conflicting_active_mappings");
  }
  const declarations = activeByKey(overlay.sourceEvidenceDeclarations, (item) => `${item.evidenceType}:${JSON.stringify(item.scope)}`);
  const mappingResults = decisions.map((decision) => {
    const itemBlockers = stale || !sameBinding(expected, decision.binding) ? ["overlay_mapping_source_binding_stale"] : mappingCompatibility(boundary, decision);
    blockers.push(...itemBlockers);
    return { decisionId: decision.decisionId, valid: itemBlockers.length === 0, blockers: unique(itemBlockers) };
  });
  const evidenceResults = declarations.map((declaration) => {
    const itemBlockers = stale || !sameBinding(expected, declaration.binding) ? ["overlay_evidence_source_binding_stale"] : evidenceValidation(boundary, declaration);
    blockers.push(...itemBlockers);
    return { declarationId: declaration.declarationId, valid: itemBlockers.length === 0, blockers: unique(itemBlockers) };
  });
  return { valid: blockers.length === 0, stale, blockers: unique(blockers), mappingResults, evidenceResults };
}

function userMappedColumn(column: ColumnSemanticResolutionV1, decision: CanonicalMappingDecisionV1): ColumnSemanticResolutionV1 {
  if (decision.decisionType === "reset_to_inferred") return column;
  if (decision.decisionType === "ignore_for_semantic_analysis") return {
    ...column, finalState: "unknown", selectedCandidateId: null,
    ruleIds: unique([...column.ruleIds, "user_overlay.ignore.v1"]),
    limitations: [...column.limitations, { code: "user_ignored_for_semantic_analysis", severity: "material", explanation: "The bound user overlay excluded this column from semantic metric eligibility.", evidenceReferences: [decision.decisionId] }],
  };
  return {
    ...column, finalState: "confirmed", selectedCandidateId: decision.selectedCanonicalSignal,
    ruleIds: unique([...column.ruleIds, "user_overlay.confirmed.v1"]),
    limitations: [...column.limitations, { code: "user_confirmed_mapping", severity: "info", explanation: "User confirmation resolved this source-bound mapping without removing inferred candidate lineage.", evidenceReferences: [decision.decisionId] }],
  };
}

function activeValidDeclarations(overlay: CanonicalUserOverlayV1, validation: CanonicalOverlayValidationV1) {
  const valid = new Set(validation.evidenceResults.filter((item) => item.valid).map((item) => item.declarationId));
  return activeByKey(overlay.sourceEvidenceDeclarations, (item) => `${item.evidenceType}:${JSON.stringify(item.scope)}`).filter((item) => valid.has(item.declarationId));
}

export function applyCanonicalUserOverlay(boundary: CanonicalSourceBoundaryV1, inferred: SemanticResolutionArtifactV1, overlay?: CanonicalUserOverlayV1): CanonicalOverlayProjectionV1 {
  if (!overlay) return emptyCanonicalOverlayProjection(inferred);
  const validation = validateCanonicalUserOverlay(boundary, overlay);
  if (validation.stale || overlay.schemaVersion !== CANONICAL_USER_OVERLAY_VERSION || validation.blockers.includes("overlay_conflicting_active_mappings")) return { overlayIdentity: overlay.overlayId, semantic: inferred, sourceEvidence: { currency: [], inventorySnapshots: [], documentIdentities: [], lineMeasures: [] }, validation, appliedDecisionIds: [], appliedDeclarationIds: [] };
  const validDecisionIds = new Set(validation.mappingResults.filter((item) => item.valid).map((item) => item.decisionId));
  const decisions = activeByKey(overlay.mappingDecisions, (item) => item.physicalColumn).filter((item) => validDecisionIds.has(item.decisionId));
  const decisionByColumn = new Map(decisions.map((item) => [item.physicalColumn, item]));
  const columns = inferred.columns.map((column) => decisionByColumn.has(column.physicalColumn) ? userMappedColumn(column, decisionByColumn.get(column.physicalColumn)!) : column);
  const semantic = { ...inferred, columns, coverage: { ...inferred.coverage, resolvedColumnCount: columns.filter((item) => ["confirmed", "probable"].includes(item.finalState)).length, stateCounts: columns.reduce((counts, item) => ({ ...counts, [item.finalState]: counts[item.finalState] + 1 }), { confirmed: 0, probable: 0, ambiguous: 0, unknown: 0, technical: 0, unsupported_input: 0 }) } };
  const declarations = activeValidDeclarations(overlay, validation);
  const sourceHash = { algorithm: "sha256" as const, value: boundary.sourceFingerprint };
  const period = declarations.find((item) => item.value.kind === "reporting_period")?.value;
  const currency = period?.kind === "reporting_period" ? declarations.filter((item) => item.value.kind === "reporting_currency").map((item) => {
    const value = item.value as Extract<CanonicalEvidenceValueV1, { kind: "reporting_currency" }>;
    const reportingPeriod = `${period.start}/${period.end}`;
    return createCanonicalSourceCurrencyEvidence({ sourceId: boundary.sourceId, sourceHash, currency: value.currency.trim().toUpperCase(), provenance: { kind: "user_confirmed", reference: item.declarationId, referenceHash: { algorithm: "sha256", value: deterministicPolicySha256(item) } }, scope: "selected_columns", applicableMonetaryColumns: unique(value.monetaryColumns), reportingPeriod });
  }) : [];
  const role = declarations.find((item) => item.value.kind === "source_role")?.value;
  const uom = declarations.find((item) => item.value.kind === "unit_of_measure")?.value;
  const asOf = declarations.find((item) => item.value.kind === "snapshot_as_of_date")?.value;
  const item = declarations.find((entry) => entry.value.kind === "item_identity")?.value;
  const warehouse = declarations.find((entry) => entry.value.kind === "warehouse_location_identity")?.value;
  const inventorySnapshots = role?.kind === "source_role" && role.role === "inventory_snapshot" && uom?.kind === "unit_of_measure" && asOf?.kind === "snapshot_as_of_date" && item?.kind === "item_identity" && warehouse?.kind === "warehouse_location_identity"
    ? [createCanonicalSourceInventorySnapshotEvidence({ sourceId: boundary.sourceId, sourceHash, provenance: { kind: "user_confirmed", reference: overlay.overlayId, referenceHash: { algorithm: "sha256", value: deterministicPolicySha256(declarations.map((entry) => entry.declarationId)) } }, scope: "one_item_warehouse_as_of_snapshot", quantity: { physicalColumn: uom.quantityColumn, semanticId: "stock_qty" }, itemIdentity: { physicalColumn: item.physicalColumn, semanticId: "sku" }, warehouseIdentity: { physicalColumn: warehouse.physicalColumn, semanticId: "warehouse" }, asOf: { physicalColumn: asOf.physicalColumn, semanticId: "time_period", value: asOf.date }, unit: { physicalColumn: uom.uomColumn, semanticId: "uom", value: uom.unit.trim().toUpperCase() } })]
    : [];
  const documentIdentities = declarations
    .filter((entry) => entry.value.kind === "document_identity")
    .flatMap((entry) => {
      const value = entry.value as Extract<CanonicalEvidenceValueV1, { kind: "document_identity" }>;
      const column = semantic.columns.find((item) =>
        item.physicalColumn === value.physicalColumn
        && item.selectedCandidateId
        && ["confirmed", "probable"].includes(item.finalState)
        && SEMANTIC_SIGNAL_BY_ID.get(item.selectedCandidateId)?.role === "identifier");
      return column?.selectedCandidateId
        ? [createCanonicalSourceDocumentIdentityEvidence({
            sourceId: boundary.sourceId,
            sourceHash,
            provenance: { kind: "user_confirmed", reference: entry.declarationId, referenceHash: { algorithm: "sha256", value: deterministicPolicySha256(entry) } },
            physicalColumn: value.physicalColumn,
            semanticId: column.selectedCandidateId,
          })]
        : [];
    });
  const lineMeasures = declarations
    .filter((entry) => entry.value.kind === "line_measure")
    .map((entry) => {
      const value = entry.value as Extract<CanonicalEvidenceValueV1, { kind: "line_measure" }>;
      return createCanonicalSourceLineMeasureEvidence({
        sourceId: boundary.sourceId,
        sourceHash,
        provenance: { kind: "user_confirmed", reference: entry.declarationId, referenceHash: { algorithm: "sha256", value: deterministicPolicySha256(entry) } },
        physicalColumn: value.physicalColumn,
        semanticId: value.semanticId,
        rowIdentityPhysicalColumn: value.rowIdentityPhysicalColumn,
      });
    });
  return { overlayIdentity: overlay.overlayId, semantic, sourceEvidence: { currency, inventorySnapshots, documentIdentities, lineMeasures }, validation, appliedDecisionIds: decisions.filter((item) => item.decisionType !== "reset_to_inferred").map((item) => item.decisionId), appliedDeclarationIds: declarations.map((item) => item.declarationId) };
}

export function emptyCanonicalOverlayProjection(inferred: SemanticResolutionArtifactV1): CanonicalOverlayProjectionV1 {
  return { overlayIdentity: null, semantic: inferred, sourceEvidence: { currency: [], inventorySnapshots: [], documentIdentities: [], lineMeasures: [] }, validation: { valid: true, stale: false, blockers: [], mappingResults: [], evidenceResults: [] }, appliedDecisionIds: [], appliedDeclarationIds: [] };
}

export function parseCanonicalUserOverlay(value: unknown): CanonicalUserOverlayV1 | null {
  if (!isRecord(value)) return null;
  const candidate = value as Partial<CanonicalUserOverlayV1>;
  if (candidate.schemaVersion !== CANONICAL_USER_OVERLAY_VERSION
    || typeof candidate.overlayId !== "string"
    || !Number.isInteger(candidate.revision)
    || !isOverlayBinding(candidate.binding)
    || !Array.isArray(candidate.mappingDecisions)
    || !candidate.mappingDecisions.every(isMappingDecision)
    || !Array.isArray(candidate.sourceEvidenceDeclarations)
    || !candidate.sourceEvidenceDeclarations.every(isEvidenceDeclaration)
    || typeof candidate.createdAt !== "string"
    || !(candidate.supersedesOverlayId === null || typeof candidate.supersedesOverlayId === "string")) return null;
  const parsed = candidate as CanonicalUserOverlayV1;
  const { overlayId: _overlayId, ...body } = parsed;
  return parsed.overlayId === `canonical-overlay:${deterministicPolicySha256(body)}` ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNullableString(value: unknown): boolean { return value === null || typeof value === "string"; }
function isStringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every((item) => typeof item === "string"); }

function isOverlayBinding(value: unknown): value is CanonicalOverlayBindingV1 {
  if (!isRecord(value)) return false;
  return [value.datasetId, value.sourceId, value.sourceFingerprint, value.inspectionGeneration, value.profileGeneration].every((item) => typeof item === "string")
    && isNullableString(value.sheetOrTable);
}

function isEvidenceScope(value: unknown): value is CanonicalEvidenceScopeV1 {
  if (!isRecord(value) || !["dataset", "source_file", "sheet_table", "physical_column", "canonical_signal_binding"].includes(String(value.level))) return false;
  if (value.level === "sheet_table") return typeof value.sheetOrTable === "string";
  if (value.level === "physical_column") return typeof value.physicalColumn === "string";
  if (value.level === "canonical_signal_binding") return typeof value.physicalColumn === "string" && typeof value.canonicalSignal === "string";
  return true;
}

function isEvidenceValue(value: unknown): value is CanonicalEvidenceValueV1 {
  if (!isRecord(value)) return false;
  if (value.kind === "reporting_currency") return typeof value.currency === "string" && isStringArray(value.monetaryColumns);
  if (value.kind === "unit_of_measure") return [value.unit, value.quantityColumn, value.uomColumn].every((item) => typeof item === "string");
  if (value.kind === "reporting_period") return typeof value.start === "string" && typeof value.end === "string";
  if (value.kind === "snapshot_as_of_date") return typeof value.date === "string" && typeof value.physicalColumn === "string";
  if (value.kind === "source_role") return ["sales", "accounting", "logistics", "inventory_snapshot", "inventory_movement", "unknown_other"].includes(String(value.role));
  if (value.kind === "line_measure") return [value.physicalColumn, value.semanticId, value.rowIdentityPhysicalColumn].every((item) => typeof item === "string");
  return ["item_identity", "document_identity", "warehouse_location_identity"].includes(String(value.kind)) && typeof value.physicalColumn === "string";
}

function isMappingDecision(value: unknown): value is CanonicalMappingDecisionV1 {
  if (!isRecord(value)) return false;
  return value.overlayVersion === CANONICAL_USER_OVERLAY_VERSION
    && typeof value.decisionId === "string"
    && isOverlayBinding(value.binding)
    && typeof value.physicalColumn === "string"
    && Number.isInteger(value.sourceColumnIndex)
    && isNullableString(value.selectedCanonicalSignal)
    && ["confirm_candidate", "map_to_existing_signal", "ignore_for_semantic_analysis", "reset_to_inferred"].includes(String(value.decisionType))
    && isStringArray(value.originalCandidateList)
    && value.rationaleSource === "user_review"
    && typeof value.createdAt === "string"
    && isNullableString(value.supersededDecisionReference);
}

function isEvidenceDeclaration(value: unknown): value is CanonicalSourceEvidenceDeclarationV1 {
  if (!isRecord(value)) return false;
  return value.overlayVersion === CANONICAL_USER_OVERLAY_VERSION
    && typeof value.declarationId === "string"
    && isOverlayBinding(value.binding)
    && ["reporting_currency", "unit_of_measure", "reporting_period", "snapshot_as_of_date", "source_role", "item_identity", "document_identity", "line_measure", "warehouse_location_identity"].includes(String(value.evidenceType))
    && isEvidenceValue(value.value)
    && value.evidenceType === value.value.kind
    && isEvidenceScope(value.scope)
    && value.provenance === "user_confirmed"
    && ["pending", "valid", "invalid", "stale"].includes(String(value.validationStatus))
    && isStringArray(value.validationBlockers)
    && typeof value.createdAt === "string"
    && isNullableString(value.supersededDeclarationReference);
}

export function compatibleRegistrySignals(boundary: CanonicalSourceBoundaryV1, physicalColumnName: string): SemanticSignalDefinition[] {
  const profile = physicalColumn(boundary, physicalColumnName);
  if (!profile) return [];
  const types = new Set<string>(profile.physicalTypeCandidates.flatMap((item) => item.type === "numeric_string" ? [item.type, "number"] : item.type === "date_string" || item.type === "excel_serial_date" ? [item.type, "date"] : [item.type]));
  return [...SEMANTIC_SIGNAL_BY_ID.values()].filter((signal) => signal.semanticFamily !== "derived_metric" && signal.compatibleTypes.some((type) => types.has(type))).sort((a, b) => a.label.localeCompare(b.label));
}
