import {
  prepareCanonicalInvestigationHandoff,
  type CanonicalConsumerBuildResultV1,
} from "./canonical-consumer-boundary";
import type { CanonicalMultiSourceDatasetV1 } from "./canonical-multisource-boundary";
import type { GovernedBusinessPerspectiveIdV1 } from "./governed-question-action-contracts";

type ValidCanonicalArtifact = Extract<CanonicalConsumerBuildResultV1, { status: "valid" }>;
type CanonicalQuestionCandidate = ValidCanonicalArtifact["questionGeneration"]["candidateQuestions"][number];
type CanonicalBlocker = { code: string; severity: "material" | "critical"; references: string[]; source?: string };
type CanonicalEvidence = { evidenceId: string; references: string[]; provenance: string };

export const CANONICAL_CONSUMER_PRESENTATION_VERSION = "lightbi.canonical-consumer-presentation.v1" as const;

export type CanonicalPresentationStateV1 =
  | "ready"
  | "needs_user_evidence"
  | "needs_mapping_review"
  | "blocked_safety"
  | "unsupported_mvp"
  | "stale"
  | "executing"
  | "execution_failed"
  | "completed";

export type CanonicalRemediationOperationV1 = {
  operationId: string;
  kind:
    | "open_mapping_review"
    | "open_currency_declaration"
    | "open_uom_declaration"
    | "open_reporting_period_declaration"
    | "open_snapshot_declaration"
    | "open_source_role_declaration"
    | "open_item_identity_declaration"
    | "open_document_identity_declaration"
    | "open_warehouse_identity_declaration"
    | "reset_stale_overlay"
    | "rebuild_artifact"
    | "return_to_current_dataset"
    | "retry_execution";
  label: string;
  sourceId: string | null;
  sheetOrTable: string | null;
  physicalColumn: string | null;
  canonicalSignal: string | null;
  remediationCode: string;
};

export type CanonicalPresentationBlockerV1 = {
  code: string;
  message: string;
  severity: "material" | "critical";
  scope: "dataset" | "capability" | "metric" | "question" | "action" | "source" | "physical_column" | "runtime";
  source: string;
  references: string[];
  limitations: string[];
  remediationOperations: CanonicalRemediationOperationV1[];
  evidenceReferences: string[];
};

export type CanonicalAnalysisPresentationV1 = {
  itemId: string;
  questionId: string;
  actionCandidateId: string | null;
  businessPerspectiveIds?: GovernedBusinessPerspectiveIdV1[];
  metricId: string;
  title: string;
  description: string;
  state: CanonicalPresentationStateV1;
  m1State: string;
  m2State: string;
  m3State: string;
  executionReadiness: "executable" | "conditionally_executable" | "not_executable";
  primaryBlocker: CanonicalPresentationBlockerV1 | null;
  secondaryBlockers: CanonicalPresentationBlockerV1[];
  limitations: string[];
  remediationOperations: CanonicalRemediationOperationV1[];
  physicalColumns: string[];
  canonicalSignals: string[];
  sourceId: string | null;
  sheetOrTable: string | null;
  evidence: Array<{ evidenceId: string; references: string[]; provenance: string }>;
  decisionUseRestrictions: Array<{ code: string; reason: string; severity: string }>;
  artifactIdentity: string;
  overlayIdentity: string | null;
  advertisedAsDefault: boolean;
  rank: number | null;
};

export type CanonicalUnderstandingPresentationV1 = {
  source: {
    label: string;
    kind: string;
    sheetOrTable: string | null;
    connectedFiles: string[];
    sourceRowCount: number;
    profiledRowCount: number;
    columnCount: number;
    profileScope: "full";
    profileConfidence: string;
    dataRegionState: string;
  };
  representativeEvidence: {
    strategy: string;
    sampledRowCount: number;
    fullFileTruth: false;
    coveredRegions: string[];
  };
  qualityIssues: Array<{ code: string; severity: string; physicalColumn: string | null }>;
  mappings: Array<{
    physicalColumn: string;
    state: string;
    canonicalSignal: string | null;
    provenance: "canonical_resolution" | "user_confirmed";
  }>;
  mappingStateCounts: Record<string, number>;
  unknownBusinessFields: string[];
  ignoredFields: string[];
  grain: {
    structuralForm: string;
    structuralState: string;
    identityBasis: string;
    temporalMode: string;
    aggregationForm: string;
  };
  relationships: {
    state: "source_local_not_evaluated" | "unavailable";
    sourceCount: number;
    explanation: string;
  };
  domainSupport: {
    packId: string;
    state: string;
    concepts: Array<{ conceptId: string; state: string }>;
    metrics: Array<{ metricId: string; state: string }>;
  };
  domainInference: {
    primaryDomain: string | null;
    primaryDomainSource: string | null;
    domains: Array<{ domainId: string; source: string; evidenceRank: number; canonicalSignalIds: string[]; physicalColumns: string[] }>;
    semanticConcepts: { confirmed: number; probable: number; microBrainRecovered: number; ambiguous: number; unknown: number; unresolved: number };
    evidenceConflicts: number;
    officialSupport: { packId: string; state: string; productionActive: boolean };
    analysisMode: string;
    limitations: string[];
  };
  evidence: {
    observedEvidenceCount: number;
    userConfirmedMappingCount: number;
    userConfirmedDeclarationCount: number;
  };
  readinessRestrictions: string[];
};

export type CanonicalDatasetPresentationV1 = {
  schemaVersion: typeof CANONICAL_CONSUMER_PRESENTATION_VERSION;
  artifactIdentity: string;
  overlayIdentity: string | null;
  datasetStateIdentity: string;
  sourceId: string | null;
  datasetState: "understood" | "invalid" | "stale";
  datasetBlockers: CanonicalPresentationBlockerV1[];
  counts: Record<CanonicalPresentationStateV1, number>;
  analyses: CanonicalAnalysisPresentationV1[];
  prohibitedUses: string[];
  understanding: CanonicalUnderstandingPresentationV1 | null;
};

export type CanonicalMultiSourceRelationshipPresentationV1 = {
  schemaVersion: "lightbi.canonical-multisource-relationship-presentation.v1";
  analysisScope: "multi_source";
  state: "relationship_evidence_required" | "relationship_ambiguous" | "relationship_safety_blocked" | "unsupported_source_combination" | "stale_relationship" | "ready_multi_source_action";
  relationshipArtifactId: string;
  participatingSources: Array<{ sourceId: string; label: string; role: string; required: boolean }>;
  blockers: string[];
  remediationOperations: CanonicalRemediationOperationV1[];
  readyAnalysisIds: string[];
  restrictions: string[];
};

export function presentCanonicalMultiSourceRelationship(dataset: CanonicalMultiSourceDatasetV1): CanonicalMultiSourceRelationshipPresentationV1 {
  const blockers = unique([...dataset.relationship.refusalReasons, ...dataset.analyses.flatMap((item) => item.blockers)]);
  const state = dataset.relationship.validationState === "stale"
    ? "stale_relationship"
    : dataset.analyses.some((item) => item.state === "ready")
      ? "ready_multi_source_action"
      : blockers.some((code) => code.includes("source_role") || code.includes("document_identity") || code.includes("reporting_period") || code.includes("currency"))
        ? "relationship_evidence_required"
        : dataset.relationship.validationState === "ambiguous" || dataset.relationship.validationState === "insufficient_evidence"
          ? "relationship_ambiguous"
          : blockers.some((code) => code.includes("not_supported") || code.includes("required_sales_source_missing") || code.includes("required_accounting_source_missing"))
            ? "unsupported_source_combination"
            : "relationship_safety_blocked";
  const remediationOperations = dataset.orderedSourceMemberships.flatMap((member) => {
    const operations: CanonicalRemediationOperationV1[] = [];
    if (!member.sourceRoleProvenance) operations.push(remediationOperation("confirm_source_role", member.sourceId, member.boundary.fullFileProfile.artifact.sourceProfile.source.sheet ?? null, null, null)!);
    if (blockers.includes("source_bound_document_identity_required")) operations.push(remediationOperation("confirm_document_identity", member.sourceId, member.boundary.fullFileProfile.artifact.sourceProfile.source.sheet ?? null, null, null)!);
    if (blockers.includes("source_bound_reporting_period_required") || blockers.includes("reporting_period_mismatch")) operations.push(remediationOperation("provide_period_semantics", member.sourceId, member.boundary.fullFileProfile.artifact.sourceProfile.source.sheet ?? null, null, null)!);
    if (blockers.includes("source_bound_currency_required") || blockers.includes("currency_mismatch")) operations.push(remediationOperation("confirm_currency", member.sourceId, member.boundary.fullFileProfile.artifact.sourceProfile.source.sheet ?? null, null, null)!);
    return operations;
  }).filter(Boolean);
  return {
    schemaVersion: "lightbi.canonical-multisource-relationship-presentation.v1",
    analysisScope: "multi_source",
    state,
    relationshipArtifactId: dataset.relationshipArtifactId,
    participatingSources: dataset.orderedSourceMemberships.map((member) => ({ sourceId: member.sourceId, label: member.boundary.datasetId, role: member.sourceRole, required: member.required })),
    blockers,
    remediationOperations: remediationOperations.filter((item, index, all) => all.findIndex((candidate) => candidate.operationId === item.operationId) === index),
    readyAnalysisIds: dataset.analyses.filter((item) => item.state === "ready").map((item) => item.analysisId),
    restrictions: unique([...dataset.restrictions, ...dataset.relationship.restrictions]),
  };
}

type PresentationOptions = {
  executionStates?: Record<string, "executing" | "execution_failed" | "completed">;
  stale?: boolean;
};

const MESSAGE_BY_CODE: Record<string, string> = {
  currency_basis_not_explicit: "Confirm the reporting currency for the monetary source before this metric can run.",
  currency_basis_ambiguous_or_incompatible: "The reporting currency is ambiguous or incompatible for this metric.",
  currency_basis_conflicting_or_multivalued: "Conflicting reporting currencies were found for this metric.",
  source_bound_currency_evidence_invalid_or_stale: "The saved currency declaration no longer matches this source.",
  unit_basis_not_explicit: "Confirm the unit of measure for the quantity source.",
  unit_basis_ambiguous_or_incompatible: "The unit of measure is ambiguous or incompatible.",
  inventory_snapshot_as_of_basis_required: "Provide snapshot date, unit, item and warehouse evidence for this inventory metric.",
  source_bound_inventory_snapshot_evidence_invalid_or_stale: "The saved inventory snapshot declaration no longer matches this source.",
  metric_time_basis_incompatible_or_missing: "Confirm a compatible reporting period or time basis.",
  governed_identity_required_for_count: "Confirm the business identity used for this governed count.",
  metric_grain_incompatible: "The current row grain cannot safely support this metric.",
  repeated_or_unresolved_measure_aggregation: "Repeated or unresolved values make this aggregation unsafe.",
  cross_source_metric_requires_governed_relationship: "A governed relationship between the participating sources is required.",
  unsupported_domain_pack: "This capability is not supported by the installed domain packs.",
  explanation_only_or_action_candidate_unavailable: "This question is available for explanation only; no governed runtime action is available.",
  canonical_full_file_runtime_source_required: "A matching complete full-file runtime source is required.",
  investigation_handoff_artifact_superseded: "This analysis was created from an older dataset understanding artifact.",
  investigation_handoff_overlay_superseded: "The source evidence changed after this analysis was created.",
  investigation_handoff_source_replaced: "The source file changed after this analysis was created.",
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function humanizeCode(code: string): string {
  const exact = MESSAGE_BY_CODE[code];
  if (exact) return exact;
  if (code.startsWith("missing_semantic_requirement:")) {
    return `Confirm the column meaning required for ${code.split(":").slice(1).join(":").replaceAll("_", " ")}.`;
  }
  if (code.startsWith("advanced_result_")) {
    return `The Advanced result is ${code.slice("advanced_result_".length).replaceAll("_", " ")} and cannot support full-source governed analysis.`;
  }
  return `${code.replaceAll("_", " ").replaceAll(":", ": ")}.`;
}

function remediationOperation(
  code: string,
  sourceId: string | null,
  sheetOrTable: string | null,
  physicalColumn: string | null,
  canonicalSignal: string | null,
): CanonicalRemediationOperationV1 | null {
  const definition: Partial<Record<string, [CanonicalRemediationOperationV1["kind"], string]>> = {
    confirm_column_meaning: ["open_mapping_review", "Review column mapping"],
    confirm_metric_measure_binding: ["open_mapping_review", "Review measure mapping"],
    select_or_confirm_key: ["open_mapping_review", "Review identity mapping"],
    confirm_currency: ["open_currency_declaration", "Provide reporting currency"],
    confirm_unit_of_measure: ["open_uom_declaration", "Provide unit of measure"],
    provide_period_semantics: ["open_reporting_period_declaration", "Provide reporting period"],
    provide_governed_inventory_snapshot_contract: ["open_snapshot_declaration", "Provide snapshot evidence"],
    confirm_source_role: ["open_source_role_declaration", "Confirm source role"],
    confirm_item_identity: ["open_item_identity_declaration", "Confirm item identity"],
    confirm_document_identity: ["open_document_identity_declaration", "Confirm document identity"],
    confirm_warehouse_identity: ["open_warehouse_identity_declaration", "Confirm warehouse identity"],
    reset_stale_overlay: ["reset_stale_overlay", "Reset stale source evidence"],
    rebuild_artifact: ["rebuild_artifact", "Rebuild current dataset"],
  };
  const selected = definition[code];
  if (!selected) return null;
  return {
    operationId: `${selected[0]}:${sourceId ?? "unknown"}:${physicalColumn ?? canonicalSignal ?? "source"}`,
    kind: selected[0],
    label: selected[1],
    sourceId,
    sheetOrTable,
    physicalColumn,
    canonicalSignal,
    remediationCode: code,
  };
}

function stateFor(codes: readonly string[], remediationCodes: readonly string[], unsupported = false): CanonicalPresentationStateV1 {
  if (codes.some((code) => code.includes("superseded") || code.includes("stale") || code.includes("source_replaced"))) return "stale";
  if (unsupported || codes.some((code) => code.includes("unsupported") || code.includes("definition_unavailable"))) return "unsupported_mvp";
  if (remediationCodes.some((code) => ["confirm_column_meaning", "confirm_metric_measure_binding", "select_or_confirm_key"].includes(code))
    || codes.some((code) => code.startsWith("missing_semantic_requirement:"))) return "needs_mapping_review";
  if (remediationCodes.some((code) => ["confirm_currency", "confirm_unit_of_measure", "provide_period_semantics", "provide_governed_inventory_snapshot_contract", "confirm_source_role", "confirm_item_identity", "confirm_document_identity", "confirm_warehouse_identity"].includes(code))) return "needs_user_evidence";
  return "blocked_safety";
}

function blockerPriority(state: CanonicalPresentationStateV1): number {
  return ({ stale: 0, blocked_safety: 1, unsupported_mvp: 2, needs_mapping_review: 3, needs_user_evidence: 4, execution_failed: 5, executing: 6, completed: 7, ready: 8 })[state];
}

function questionPresentation(
  artifact: ValidCanonicalArtifact,
  question: CanonicalQuestionCandidate,
  options: PresentationOptions,
): CanonicalAnalysisPresentationV1 {
  const metric = artifact.metricPreflight.metrics.find((item) => item.metricId === question.metricId);
  const action = question.actionCandidateId
    ? artifact.questionGeneration.actionCandidates.find((item) => item.actionCandidateId === question.actionCandidateId) ?? null
    : null;
  const handoff = action ? prepareCanonicalInvestigationHandoff(artifact, action.actionCandidateId) : null;
  const source = artifact.canonicalSource.physical.sourceProfile.source;
  const sourceId = artifact.sourceBoundary?.sourceId ?? source.sourceId;
  const sheetOrTable = source.sheet ?? null;
  const physicalColumns = unique([
    ...(metric?.selectedBindings.map((item) => item.physicalColumn) ?? []),
    ...question.resolvedDimensions.map((item) => artifact.canonicalSource.semantic.columns[item.sourceColumnIndex]?.physicalColumn ?? ""),
  ]);
  const canonicalSignals = unique([
    ...(metric?.selectedBindings.map((item) => item.semanticId) ?? []),
    ...question.requiredDimensions,
  ]);
  const inferredMappingColumns = artifact.canonicalSource.semantic.columns
    .filter((column) => ["ambiguous", "unknown"].includes(column.finalState)
      && column.candidateTraces.some((trace) => canonicalSignals.includes(trace.candidateId)))
    .map((column) => column.physicalColumn);
  const remediationCodes = unique([
    ...(metric?.remediation.map((item) => item.code) ?? []),
    ...question.remediation,
  ]);
  const rawBlockers: CanonicalBlocker[] = [
    ...(metric?.blockers ?? []),
    ...question.blockers,
    ...(handoff?.runtimePreflight.blockers ?? []),
  ];
  const limitations = unique([
    ...(metric?.limitations.map((item) => item.code) ?? []),
    ...question.limitations.map((item) => item.code),
  ]);
  const evidence = [
    ...(metric?.evidence ?? []),
    ...question.evidence,
    ...(handoff?.runtimePreflight.evidence ?? []),
  ].map((item: CanonicalEvidence) => ({ evidenceId: item.evidenceId, references: [...item.references], provenance: item.provenance }));
  const operationColumns = inferredMappingColumns.length > 0 ? inferredMappingColumns : [physicalColumns[0] ?? null];
  const operations = unique(remediationCodes).flatMap((code) => operationColumns.flatMap((column) => {
    const operation = remediationOperation(code, sourceId, sheetOrTable, column, canonicalSignals[0] ?? null);
    return operation ? [operation] : [];
  })).filter((item, index, all) => all.findIndex((candidate) => candidate.operationId === item.operationId) === index);
  const supported = metric?.metricDefinitionAvailable !== false;
  const executable = Boolean(handoff?.runtimePreflight.executionAllowed && handoff.queryPlanning.state === "planned");
  const derivedState = executable
    ? "ready"
    : stateFor(rawBlockers.map((item) => item.code), remediationCodes, !supported);
  const state = options.stale
    ? "stale"
    : options.executionStates?.[action?.actionCandidateId ?? question.questionId] ?? derivedState;
  const mappedBlockers = rawBlockers.map((item) => {
    const itemState = stateFor([item.code], remediationCodes, !supported);
    const blockerOperations = itemState === "needs_mapping_review" || itemState === "needs_user_evidence" || itemState === "stale" ? operations : [];
    return {
      code: item.code,
      message: humanizeCode(item.code),
      severity: item.severity,
      scope: itemState === "needs_mapping_review" && inferredMappingColumns.length ? "physical_column" as const : itemState === "needs_user_evidence" ? "source" as const : ("source" in item && (item.source === "runtime_preflight" || item.source === "execution")) ? "runtime" as const : "metric" as const,
      source: item.source ?? "metric_preflight",
      references: [...item.references],
      limitations,
      remediationOperations: blockerOperations,
      evidenceReferences: unique(evidence.flatMap((entry) => entry.references)),
      state: itemState,
    };
  }).sort((left, right) => blockerPriority(left.state) - blockerPriority(right.state) || left.code.localeCompare(right.code));
  const primary = mappedBlockers[0] ?? null;
  return {
    itemId: question.questionId,
    questionId: question.questionId,
    actionCandidateId: action?.actionCandidateId ?? null,
    businessPerspectiveIds: [...question.businessPerspectiveIds],
    metricId: question.metricId,
    title: question.title,
    description: question.businessPurpose,
    state,
    m1State: metric?.state ?? "unsupported",
    m2State: question.questionState,
    m3State: handoff?.runtimePreflight.state ?? "unavailable",
    executionReadiness: state === "ready" && executable ? (handoff!.runtimePreflight.state === "conditionally_executable" ? "conditionally_executable" : "executable") : "not_executable",
    primaryBlocker: primary ? (({ state: _state, ...blocker }) => blocker)(primary) : null,
    secondaryBlockers: mappedBlockers.slice(1).map(({ state: _state, ...blocker }) => blocker),
    limitations,
    remediationOperations: state === "needs_mapping_review" || state === "needs_user_evidence" || state === "stale" ? operations : [],
    physicalColumns: unique([...physicalColumns, ...inferredMappingColumns]),
    canonicalSignals,
    sourceId,
    sheetOrTable,
    evidence,
    decisionUseRestrictions: (handoff?.runtimePreflight.restrictions ?? []).map((item) => ({ code: item.code, reason: item.reason, severity: item.severity })),
    artifactIdentity: artifact.identity,
    overlayIdentity: artifact.overlayIdentity,
    advertisedAsDefault: question.advertisedAsDefault,
    rank: question.rank,
  };
}

function understandingPresentation(artifact: ValidCanonicalArtifact): CanonicalUnderstandingPresentationV1 {
  const profile = artifact.canonicalSource.physical.sourceProfile;
  const representative = artifact.canonicalSource.physical.representativeEvidence;
  const semantic = artifact.canonicalSource.semantic;
  const grain = artifact.canonicalSource.grain.signature;
  const boundary = artifact.sourceBoundary;
  const mappings = semantic.columns.map((column) => ({
    physicalColumn: column.physicalColumn,
    state: column.finalState,
    canonicalSignal: column.selectedCandidateId,
    provenance: column.ruleIds.includes("user_overlay.confirmed.v1") || column.ruleIds.includes("user_overlay.ignore.v1")
      ? "user_confirmed" as const
      : "canonical_resolution" as const,
  }));
  const observedEvidenceCount = semantic.columns.reduce((sum, column) => sum + column.columnEvidence.length, 0)
    + artifact.domainActivation.concepts.reduce((sum, concept) => sum + concept.evidence.length, 0);
  const connectedFiles = boundary?.runtimeSource.files.map((item) => item.file.name).filter(Boolean) ?? [profile.source.label];
  return {
    source: {
      label: profile.source.label,
      kind: profile.source.kind,
      sheetOrTable: profile.source.sheet ?? null,
      connectedFiles: unique(connectedFiles),
      sourceRowCount: profile.dataRegion.rowCount,
      profiledRowCount: profile.profiledRowCount,
      columnCount: profile.columns.length,
      profileScope: "full",
      profileConfidence: profile.confidence.level,
      dataRegionState: profile.dataRegion.selectionStatus,
    },
    representativeEvidence: {
      strategy: representative.strategy,
      sampledRowCount: representative.sampledRowCount,
      fullFileTruth: false,
      coveredRegions: [...representative.coveredRegions],
    },
    qualityIssues: profile.issues.map((issue) => ({ code: issue.code, severity: issue.severity, physicalColumn: issue.physicalColumn })),
    mappings,
    mappingStateCounts: { ...semantic.coverage.stateCounts },
    unknownBusinessFields: semantic.columns.filter((column) => ["unknown", "ambiguous"].includes(column.finalState)).map((column) => column.physicalColumn),
    ignoredFields: semantic.columns.filter((column) => column.ruleIds.includes("user_overlay.ignore.v1")).map((column) => column.physicalColumn),
    grain: {
      structuralForm: grain.structuralForm.value,
      structuralState: grain.structuralForm.state,
      identityBasis: grain.identityBasis.value,
      temporalMode: grain.temporalMode.value,
      aggregationForm: grain.aggregationForm.value,
    },
    relationships: {
      state: boundary ? "source_local_not_evaluated" : "unavailable",
      sourceCount: connectedFiles.length,
      explanation: boundary
        ? "This canonical artifact is source-bound. Cross-source relationships are shown only when a governed relationship artifact is available."
        : "No governed source relationship is available for this dataset state.",
    },
    domainSupport: {
      packId: artifact.domainActivation.packId,
      state: artifact.domainActivation.state,
      concepts: artifact.domainActivation.concepts.map((concept) => ({ conceptId: concept.conceptId, state: concept.state })),
      metrics: artifact.metricPreflight.metrics.map((metric) => ({ metricId: metric.metricId, state: metric.state })),
    },
    domainInference: {
      primaryDomain: artifact.domainInference.primaryDomain,
      primaryDomainSource: artifact.domainInference.primaryDomainSource,
      domains: artifact.domainInference.domains.map((item) => ({ domainId: item.domainId, source: item.source, evidenceRank: item.evidenceRank, canonicalSignalIds: [...item.canonicalSignalIds], physicalColumns: [...item.physicalColumns] })),
      semanticConcepts: { ...artifact.domainInference.semanticConcepts },
      evidenceConflicts: artifact.domainInference.evidenceConflicts,
      officialSupport: { ...artifact.domainInference.officialSupport },
      analysisMode: artifact.domainInference.analysisMode,
      limitations: [...artifact.domainInference.limitations],
    },
    evidence: {
      observedEvidenceCount,
      userConfirmedMappingCount: artifact.overlayValidation.mappingResults.filter((item) => item.valid).length,
      userConfirmedDeclarationCount: artifact.overlayValidation.evidenceResults.filter((item) => item.valid).length,
    },
    readinessRestrictions: unique([
      ...artifact.blockers,
      ...artifact.caveats,
      ...artifact.questionGeneration.candidateQuestions.flatMap((question) => question.prohibitedUses),
    ]),
  };
}

export function presentCanonicalConsumerArtifact(
  artifact: CanonicalConsumerBuildResultV1,
  options: PresentationOptions = {},
): CanonicalDatasetPresentationV1 {
  const emptyCounts = (): Record<CanonicalPresentationStateV1, number> => ({ ready: 0, needs_user_evidence: 0, needs_mapping_review: 0, blocked_safety: 0, unsupported_mvp: 0, stale: 0, executing: 0, execution_failed: 0, completed: 0 });
  if (artifact.status !== "valid") {
    const state = options.stale || artifact.blockers.some((code) => code.includes("stale") || code.includes("mismatch")) ? "stale" : "blocked_safety";
    const sourceId = artifact.sourceBoundary?.sourceId ?? null;
    const datasetBlockers = artifact.blockers.map((code) => ({
      code,
      message: humanizeCode(code),
      severity: "critical" as const,
      scope: "dataset" as const,
      source: "integrity",
      references: [artifact.identity],
      limitations: artifact.caveats,
      remediationOperations: state === "stale" ? [remediationOperation("rebuild_artifact", sourceId, null, null, null)!] : [],
      evidenceReferences: [],
    }));
    return { schemaVersion: CANONICAL_CONSUMER_PRESENTATION_VERSION, artifactIdentity: artifact.identity, overlayIdentity: artifact.overlayIdentity, datasetStateIdentity: artifact.datasetStateIdentity, sourceId, datasetState: state === "stale" ? "stale" : "invalid", datasetBlockers, counts: emptyCounts(), analyses: [], prohibitedUses: ["decision_support", "runtime_execution"], understanding: null };
  }
  const analyses = artifact.questionGeneration.candidateQuestions.map((question) => questionPresentation(artifact, question, options));
  for (const concept of artifact.domainActivation.concepts.filter((item) => ["detect_only", "unsupported"].includes(item.state))) {
    if (analyses.some((item) => item.metricId === concept.conceptId)) continue;
    const blockers = concept.blockers.map((item) => ({ code: item.code, message: humanizeCode(item.code), severity: item.severity, scope: "capability" as const, source: "domain_activation", references: [...item.references], limitations: concept.limitations.map((entry) => entry.code), remediationOperations: [], evidenceReferences: concept.evidence.flatMap((entry) => entry.references) }));
    analyses.push({ itemId: `concept:${concept.conceptId}`, questionId: `concept:${concept.conceptId}`, actionCandidateId: null, businessPerspectiveIds: [], metricId: concept.conceptId, title: concept.conceptId.replaceAll("_", " "), description: "The source contains this concept, but decision support is not available in the installed domain packs.", state: options.stale ? "stale" : "unsupported_mvp", m1State: "unsupported", m2State: "not_generated", m3State: "unavailable", executionReadiness: "not_executable", primaryBlocker: blockers[0] ?? { code: "unsupported_mvp", message: "This capability is not supported by the installed domain packs.", severity: "material", scope: "capability", source: "domain_activation", references: [], limitations: [], remediationOperations: [], evidenceReferences: [] }, secondaryBlockers: blockers.slice(1), limitations: concept.limitations.map((item) => item.code), remediationOperations: [], physicalColumns: [], canonicalSignals: [concept.conceptId], sourceId: artifact.sourceBoundary?.sourceId ?? artifact.canonicalSource.physical.sourceProfile.source.sourceId, sheetOrTable: artifact.canonicalSource.physical.sourceProfile.source.sheet ?? null, evidence: concept.evidence.map((item) => ({ evidenceId: item.evidenceId, references: [...item.references], provenance: item.provenance })), decisionUseRestrictions: [], artifactIdentity: artifact.identity, overlayIdentity: artifact.overlayIdentity, advertisedAsDefault: false, rank: null });
  }
  const counts = emptyCounts();
  analyses.forEach((item) => { counts[item.state] += 1; });
  return { schemaVersion: CANONICAL_CONSUMER_PRESENTATION_VERSION, artifactIdentity: artifact.identity, overlayIdentity: artifact.overlayIdentity, datasetStateIdentity: artifact.datasetStateIdentity, sourceId: artifact.sourceBoundary?.sourceId ?? artifact.canonicalSource.physical.sourceProfile.source.sourceId, datasetState: options.stale ? "stale" : "understood", datasetBlockers: [], counts, analyses, prohibitedUses: unique(analyses.flatMap((item) => item.decisionUseRestrictions.map((restriction) => restriction.code))), understanding: understandingPresentation(artifact) };
}
