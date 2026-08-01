import type {
  AnalysisAction,
  BusinessLens,
  BusinessPerspective,
  BusinessQuestion,
  DatasetUnderstandingResult,
  DirtySignal,
  DomainId,
  HeaderStatus,
  OrientationQuestion,
  QuestionIntent
} from "../understanding-next/contracts";
import type {
  CoreAction,
  QuestionCandidate,
  UnderstandingCoreResult,
  UniversalSignal
} from "./contracts";

function familyToDomain(signal: UniversalSignal): DomainId {
  if (signal.family === "money" || signal.family === "document") return "revenue";
  if (signal.family === "inventory" || signal.id.startsWith("item.sku")) return "inventory";
  if (signal.family === "engagement") return "performance";
  if (signal.family === "indicator") return "performance";
  if (signal.family === "event") return "operations";
  if (signal.family === "entity") return signal.id.includes("customer") || signal.id.includes("patient") ? "customer" : "performance";
  if (signal.family === "time" || signal.family === "location" || signal.family === "status" || signal.family === "quantity") return "operations";
  return "performance";
}

function inferLegacyDocumentType(core: UnderstandingCoreResult): DatasetUnderstandingResult["profile"]["documentType"] {
  if (core.overlays.includes("dirty_manual")) return "dirty_operational_export";
  if (core.overlays.includes("inventory")) return "inventory_snapshot";
  if (core.overlays.includes("campaign")) return "generic_table";
  if (core.overlays.includes("logistics")) return "logistics_intake_report";
  if (core.overlays.includes("retail") || core.overlays.includes("b2b") || core.overlays.includes("healthcare")) return "retail_sales_document";
  if (core.overlays.includes("management")) return "management_ranking";
  return "generic_table";
}

function inferLegacyGrain(core: UnderstandingCoreResult): DatasetUnderstandingResult["profile"]["grain"] {
  if (core.overlays.includes("inventory")) return "snapshot";
  if (core.overlays.includes("management")) return "summary";
  if (core.signals.some(signal => signal.id === "item.sku")) return "master_data";
  return "event";
}

function adaptAction(action: CoreAction): AnalysisAction {
  return {
    id: action.id,
    questionId: action.questionId,
    label: action.label,
    actionKind: action.actionKind,
    dimensions: action.dimensions,
    measures: action.measures,
    measureAggregations: action.measureAggregations ? { ...action.measureAggregations } : undefined,
    derivedMeasures: action.derivedMeasures?.map(measure => ({ ...measure, positiveValues: [...measure.positiveValues] })),
    executionScope: action.executionScope === "blocked" ? "not_supported" : action.executionScope
  };
}

function adaptIntent(intent: QuestionCandidate["intent"]): QuestionIntent {
  if (intent === "ranking") return "ranking";
  return intent;
}

function domainForQuestion(question: QuestionCandidate): DomainId {
  const lens = question.lens.toLowerCase();
  if (/inventory|stock|sku/.test(lens)) return "inventory";
  if (/customer|patient|segment/.test(lens)) return "customer";
  if (/finance|profit|margin|cost|receivable|payable|balance/.test(lens)) return "finance";
  if (/revenue|sales|commercial|payment/.test(lens)) return "revenue";
  if (/performance|indicator|campaign|engagement|team|role/.test(lens)) return "performance";
  return "operations";
}

function adaptQuestionToBusinessQuestion(question: QuestionCandidate): BusinessQuestion {
  const firstAction = question.action;
  return {
    id: question.id,
    label: question.label,
    userPrompt: question.prompt,
    domain: domainForQuestion(question),
    perspectiveId: question.lens,
    requiredSignals: question.requiredSignals,
    optionalSignals: question.optionalSignals,
    dimensions: firstAction?.dimensions ?? [],
    measures: firstAction?.measures ?? [],
    measureAggregations: firstAction?.measureAggregations ? { ...firstAction.measureAggregations } : undefined,
    derivedMeasures: firstAction?.derivedMeasures?.map(measure => ({ ...measure, positiveValues: [...measure.positiveValues] })),
    fitScore: question.fitScore,
    actionKind: firstAction?.actionKind ?? "table_preview",
    executionScope: firstAction?.executionScope === "blocked" || !firstAction ? "not_supported" : firstAction.executionScope,
    caveats: question.blockedReasons
  };
}

function adaptQuestionToOrientationQuestion(question: QuestionCandidate, lensId: string): OrientationQuestion {
  return {
    id: `oq_${question.id}`,
    lensId,
    label: question.label,
    userPrompt: question.prompt,
    intent: adaptIntent(question.intent),
    defaultAction: question.action ? adaptAction(question.action) : undefined,
    blockedReasons: question.blockedReasons
  };
}

function availabilityFor(questions: QuestionCandidate[]): BusinessLens["availability"] {
  if (questions.some(question => question.action)) return "ready";
  if (questions.some(question => question.blockedReasons.length > 0)) return "partial";
  return "blocked";
}

function adaptDirtySignals(core: UnderstandingCoreResult): DirtySignal[] {
  return core.signals
    .filter(signal => signal.family === "quality")
    .map(signal => ({
      kind:
        signal.id === "quality.formula_error"
          ? "formula_error"
          : signal.id === "quality.technical_column"
            ? "technical_column"
            : "dominant_single_value",
      column: signal.physicalColumn,
      severity: signal.id === "quality.formula_error" ? "warning" : "info",
      message: signal.label,
      evidence: signal.evidence
    }));
}

export function adaptCoreToUnderstandingNext(core: UnderstandingCoreResult): DatasetUnderstandingResult {
  const domains = new Set<DomainId>();
  for (const signal of core.signals) domains.add(familyToDomain(signal));
  if (core.overlays.includes("healthcare")) {
    domains.add("revenue");
    domains.add("customer");
    domains.add("performance");
  }

  const questionsByLens = new Map<string, QuestionCandidate[]>();
  for (const question of core.questions) {
    const bucket = questionsByLens.get(question.lens) ?? [];
    bucket.push(question);
    questionsByLens.set(question.lens, bucket);
  }

  const lenses: BusinessLens[] = [...questionsByLens.entries()].map(([lens, questions], index) => ({
    id: lens.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `lens_${index}`,
    domain: domainForQuestion(questions[0]),
    label: lens,
    description: questions[0]?.prompt ?? lens,
    priority: 100 - index,
    requiredSignals: [...new Set(questions.flatMap(question => question.requiredSignals))],
    optionalSignals: [...new Set(questions.flatMap(question => question.optionalSignals))],
    availability: availabilityFor(questions),
    reasons: [...new Set(questions.flatMap(question => question.evidence))].slice(0, 5),
    questions: questions.map(question => adaptQuestionToOrientationQuestion(question, lens))
  }));

  const headerStatus: HeaderStatus = core.source.columnCount === 0 ? "failed" : "clean";

  return {
    source: {
      fileNames: [...core.source.fileNames],
      sheetNames: [...core.source.sheetNames],
      sourceRowCount: core.source.sourceRowCount,
      sourceColumnCount: core.source.columnCount,
      parsedRowCount: core.source.sampleRowCount,
      sampleRowCount: core.source.sampleRowCount
    },
    quality: {
      headerStatus,
      dirtySignals: adaptDirtySignals(core),
      blockedReasons: headerStatus === "failed" ? ["No usable column headers were detected."] : []
    },
    profile: {
      grain: inferLegacyGrain(core),
      documentType: inferLegacyDocumentType(core),
      detectedDomains: [...domains]
    },
    columns: [],
    signals: core.signals.map(signal => ({
      canonicalId: signal.id,
      label: signal.label,
      domain: familyToDomain(signal),
      physicalColumn: signal.physicalColumn,
      confidence: signal.confidence,
      evidence: signal.evidence,
      cardinality: signal.health.distinctCount,
      dominanceRatio: signal.health.dominanceRatio,
      role: signal.role === "quality" ? "technical" : signal.role,
      usableForDefaultQuestion: signal.usableForDefaultQuestion
    })),
    stakeholderFits: [],
    lenses,
    perspectives: core.overlays.map<BusinessPerspective>(overlay => ({
      id: overlay,
      label: overlay.replace(/_/g, " "),
      domain: overlay === "inventory" ? "inventory" : overlay === "logistics" ? "operations" : "revenue",
      reason: "Detected from universal business signals.",
      signalIds: core.signals.map(signal => signal.id)
    })),
    recommendedQuestions: core.questions.map(adaptQuestionToBusinessQuestion),
    availableActions: core.actions.map(adaptAction),
    unavailableActions: core.questions
      .filter(question => !question.action)
      .map(question => ({
        id: question.id,
        label: question.label,
        reason: question.blockedReasons.join("; ") || "No executable action available.",
        missingSignals: question.requiredSignals,
        blockedReasons: question.blockedReasons
      }))
  };
}
