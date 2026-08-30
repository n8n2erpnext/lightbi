import type {
  QuestionCandidate,
  UnderstandingCoreInput,
  UnderstandingCoreResult,
  UniversalSignal
} from "./contracts";
import { detectUniversalSignals, inferOverlays } from "./signal-engine";
import { projectSemanticCapabilityMatrix } from './semantic-capability-matrix';
import { appendUniversalQuestionsPrimary } from './question-engine-primary';
import { appendUniversalQuestionsSecondary } from './question-engine-secondary';
import { resolveUniversalQuestionContext, VIRTUAL_COUNT_MEASURES } from './question-engine-shared';

function contextualQuestionPriority(question: QuestionCandidate, signals: UniversalSignal[]): number {
  const overlays = new Set(inferOverlays(signals));
  const priorities: Record<string, number> = {};

  if (overlays.has("inventory")) {
    priorities.inventory_aging_backlog = 120;
    priorities.inventory_value_exposure = 115;
    priorities.stock_movement = 110;
    priorities.status_flow = 100;
  } else if (overlays.has("logistics")) {
    priorities.shipment_backlog_by_status = 120;
    priorities.shipment_backlog_by_location = 115;
    priorities.shipment_value_exposure = 110;
    priorities.delivery_completion_mix = 105;
    priorities.carrier_cost_impact = 100;
    priorities.status_flow = 95;
  }

  if (overlays.has("campaign")) {
    priorities.engagement_outcome_overview = 120;
    priorities.engagement_by_segment = 115;
    priorities.engagement_by_contact_channel = 110;
    priorities.campaign_effort_review = 105;
  }

  return priorities[question.id] ?? 0;
}

export function generateUniversalQuestions(input: UnderstandingCoreInput, signals: UniversalSignal[]): QuestionCandidate[] {
  const questions: QuestionCandidate[] = [];
  const context = resolveUniversalQuestionContext(input, signals);
  appendUniversalQuestionsPrimary(questions, context);
  appendUniversalQuestionsSecondary(questions, context);
  const visibleQuestions = questions.filter(question => question.action || question.evidence.length > 0);
  const qualityColumns = new Set(signals.filter(signal => signal.family === "quality").map(signal => signal.physicalColumn));
  const hasExecutableBusinessQuestion = visibleQuestions.some(question => question.action
      && question.intent !== "quality_review"
      && [...question.action.dimensions, ...question.action.measures].some(column => !VIRTUAL_COUNT_MEASURES.has(column) && !qualityColumns.has(column)));
  return visibleQuestions
      .sort((a, b) => {
      const qualityOrder = hasExecutableBusinessQuestion
        ? Number(a.intent === "quality_review") - Number(b.intent === "quality_review")
        : Number(b.intent === "quality_review") - Number(a.intent === "quality_review");
      if (qualityOrder !== 0) return qualityOrder;
      const executableFirst = Number(Boolean(b.action)) - Number(Boolean(a.action));
      if (executableFirst !== 0) return executableFirst;
      const contextual = contextualQuestionPriority(b, signals) - contextualQuestionPriority(a, signals);
      if (contextual !== 0) return contextual;
      return b.fitScore - a.fitScore;
    });
}

export function createUnderstandingCoreResult(input: UnderstandingCoreInput): UnderstandingCoreResult {
  const signals = detectUniversalSignals(input);
  const overlays = inferOverlays(signals);
  const capabilityMatrix = projectSemanticCapabilityMatrix(signals);
  const questions = generateUniversalQuestions(input, signals);
  const actions = questions.flatMap(question => question.action ? [question.action] : []);
  const blockedReasons = questions
    .filter(question => !question.action)
    .flatMap(question => question.blockedReasons);

  return {
    source: {
      kind: input.sourceKind ?? "unknown",
      label: input.sourceLabel ?? input.fileNames?.[0] ?? input.sheetNames?.[0] ?? "dataset",
      fileNames: input.fileNames ?? [],
      sheetNames: input.sheetNames ?? [],
      sourceRowCount: input.sourceRowCount ?? input.rows.length,
      sampleRowCount: input.rows.length,
      columnCount: input.columns.length
    },
    overlays,
    capabilityMatrix,
    signals,
    questions,
    actions,
    blockedReasons
  };
}
