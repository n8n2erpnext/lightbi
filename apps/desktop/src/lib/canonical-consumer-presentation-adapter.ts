import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "./semantic-registry";
import type { CanonicalConsumerBuildResultV1 } from "./understanding-core/canonical-consumer-boundary";
import type { AnalysisAction, DatasetUnderstandingResult, DomainId } from "./understanding-next/contracts";

function nextDomain(value: string | undefined): DomainId {
  return (["operations", "revenue", "inventory", "customer", "performance", "finance"] as const).includes(value as DomainId)
    ? value as DomainId
    : "operations";
}

function grainProjection(value: string): DatasetUnderstandingResult["profile"]["grain"] {
  if (value === "document") return "transaction";
  if (value === "event") return "event";
  if (value === "snapshot") return "snapshot";
  if (value === "master") return "master_data";
  if (value === "summary") return "summary";
  return "unknown";
}

// Compatibility-only projection for the existing Home card. It does not detect,
// resolve, score, or authorize anything beyond the canonical artifact.
export function projectCanonicalArtifactToUnderstandingNext(artifact: CanonicalConsumerBuildResultV1): DatasetUnderstandingResult {
  if (artifact.status !== "valid") {
    return {
      source: { fileNames: ["Unavailable dataset"], sheetNames: [], sourceRowCount: 0, sourceColumnCount: 0, parsedRowCount: 0, sampleRowCount: 0 },
      quality: { headerStatus: "failed", dirtySignals: [], blockedReasons: artifact.blockers },
      profile: { grain: "unknown", documentType: "generic_table", detectedDomains: [] },
      columns: [], signals: [], stakeholderFits: [], lenses: [], perspectives: [], recommendedQuestions: [], availableActions: [],
      unavailableActions: artifact.blockers.map((reason, index) => ({ id: `canonical-blocker:${index}`, label: "Canonical analysis unavailable", reason, missingSignals: [], blockedReasons: [reason] })),
    };
  }
  const { canonicalSource, questionGeneration } = artifact;
  const physical = canonicalSource.physical.sourceProfile;
  const definitions = new Map(SEMANTIC_SIGNAL_REGISTRY_V1.map((item) => [item.canonicalId, item]));
  const signals = canonicalSource.semantic.columns.flatMap((column) => {
    if (!column.selectedCandidateId || !["confirmed", "probable"].includes(column.finalState)) return [];
    const definition = definitions.get(column.selectedCandidateId);
    const profile = physical.columns[column.sourceColumnIndex];
    return [{
      canonicalId: column.selectedCandidateId,
      label: definition?.label ?? column.selectedCandidateId,
      domain: nextDomain(definition?.domain),
      physicalColumn: column.physicalColumn,
      confidence: column.finalState === "confirmed" ? 100 : 75,
      evidence: column.columnEvidence.map((item) => item.explanationCode),
      cardinality: profile?.cardinality.distinctCount ?? 0,
      dominanceRatio: profile?.stringSummary?.topValues[0] && profile.nonNullCount ? profile.stringSummary.topValues[0].count / profile.nonNullCount : undefined,
      role: definition?.role ?? "dimension",
      usableForDefaultQuestion: true,
    }];
  });
  const actionByQuestion = new Map(questionGeneration.actionCandidates.map((action) => [action.questionId, action]));
  const toAction = (questionId: string): AnalysisAction | undefined => {
    const action = actionByQuestion.get(questionId);
    if (!action || action.actionCandidateState === "blocked") return undefined;
    const actionKind = action.actionKind === "trend_candidate" ? "trend" : action.actionKind === "status_breakdown_candidate" ? "distribution" : "group_by";
    return {
      id: action.actionCandidateId,
      questionId: action.questionId,
      label: action.title,
      actionKind,
      dimensions: action.resolvedDimensions.map((item) => item.semanticId),
      measures: [action.metricId],
      executionScope: "full_local_file" as const,
    };
  };
  const defaultQuestions = questionGeneration.defaultQuestions.map((question) => ({
    id: question.questionId,
    label: question.title,
    userPrompt: question.businessPurpose,
    domain: nextDomain(definitions.get(question.resolvedDimensions[0]?.semanticId)?.domain),
    perspectiveId: "commerce_distribution_mvp",
    requiredSignals: [question.metricId, ...question.requiredDimensions],
    optionalSignals: [],
    dimensions: question.resolvedDimensions.map((item) => item.semanticId),
    measures: [question.metricId],
    fitScore: question.questionState === "ready" ? 100 : 80,
    actionKind: question.intent === "trend" ? "trend" as const : question.intent === "status_breakdown" ? "distribution" as const : "group_by" as const,
    executionScope: "full_local_file" as const,
    caveats: question.limitations.map((item) => item.code),
  }));
  const availableActions = questionGeneration.candidateQuestions.flatMap((question) => {
    const action = toAction(question.questionId);
    return action ? [action] : [];
  });
  const lensQuestions = questionGeneration.candidateQuestions.map((question) => ({
    id: question.questionId,
    lensId: "commerce_distribution_mvp",
    label: question.title,
    userPrompt: question.businessPurpose,
    intent: question.intent === "trend" ? "trend" as const : "ranking" as const,
    defaultAction: toAction(question.questionId),
    blockedReasons: question.blockers.map((item) => item.code),
  }));
  return {
    source: { fileNames: [physical.source.label], sheetNames: physical.source.sheet ? [physical.source.sheet] : [], sourceRowCount: physical.dataRegion.rowCount, sourceColumnCount: physical.columns.length, parsedRowCount: physical.dataRegion.rowCount, sampleRowCount: canonicalSource.physical.representativeEvidence.sampledRowCount },
    quality: {
      headerStatus: physical.header.selectionStatus === "selected" ? (physical.header.selectedHeaderRowIndex === 0 ? "clean" : "recovered") : physical.header.selectionStatus === "ambiguous" ? "ambiguous" : "failed",
      dirtySignals: physical.issues.map((issue) => ({ kind: issue.code === "technical_column" ? "technical_column" as const : issue.code === "mixed_type" ? "mixed_text_number" as const : "dominant_single_value" as const, column: issue.physicalColumn ?? undefined, severity: issue.severity === "error" ? "blocking" as const : issue.severity === "warning" ? "warning" as const : "info" as const, message: issue.code, evidence: issue.evidence })),
      blockedReasons: artifact.blockers,
    },
    profile: { grain: grainProjection(canonicalSource.grain.signature.structuralForm.value), documentType: "generic_table", detectedDomains: signals.map((item) => item.domain).filter((value, index, values) => values.indexOf(value) === index) },
    columns: physical.columns.map((column) => ({ name: column.physicalColumnName, normalizedName: column.physicalColumnName.toLowerCase(), health: { inferredType: column.physicalTypeCandidates[0]?.type === "number" ? "number" : column.physicalTypeCandidates[0]?.type?.includes("date") ? "date" : column.physicalTypeCandidates[0]?.type === "mixed" ? "mixed" : column.nonNullCount === 0 ? "empty" : "string", nonEmptyCount: column.nonNullCount, parseSuccessRate: Math.max(0, ...column.parseEvidence.map((item) => item.attemptedCount ? item.successCount / item.attemptedCount : 0)), distinctCount: column.cardinality.distinctCount, topValues: column.stringSummary?.topValues ?? [] } })),
    signals,
    stakeholderFits: [],
    lenses: [{ id: "commerce_distribution_mvp", domain: signals[0]?.domain ?? "operations", label: "Commerce and distribution", description: "Questions supported by canonical mappings and governed metric preflight.", priority: 1, requiredSignals: [], optionalSignals: [], availability: availableActions.length ? "ready" : "blocked", reasons: artifact.caveats, questions: lensQuestions }],
    perspectives: [{ id: "commerce_distribution_mvp", label: "Commerce and distribution", domain: signals[0]?.domain ?? "operations", reason: "Activated from the canonical domain support artifact.", signalIds: signals.map((item) => item.canonicalId) }],
    recommendedQuestions: defaultQuestions,
    availableActions,
    unavailableActions: questionGeneration.blockedQuestions.map((question) => ({ id: question.questionId, label: question.title, reason: question.blockers.map((item) => item.code).join(", ") || "Governed metric is unavailable", missingSignals: question.requiredDimensions.filter((item) => !question.resolvedDimensions.some((binding) => binding.semanticId === item)), blockedReasons: question.blockers.map((item) => item.code) })),
  };
}
