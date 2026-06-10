import type { BusinessSignalRegistry } from './business-signal-detector';

export type DatasetUnderstandingStatus = "understood" | "partial" | "insufficient";

export type UnderstandingConcept = {
  signalId: string;
  label: string;
  canonicalConcept: string;
  confidenceScore: number;
  evidence: string[];
};

export type UnderstandingEntity = {
  id: string;
  label: string;
  conceptSignals: string[];
  confidenceScore: number;
};

export type WorkflowHint = {
  id: string;
  label: string;
  fromSignal: string;
  toSignal?: string;
  confidenceScore: number;
};

export type RelationshipHint = {
  id: string;
  label: string;
  sourceSignal: string;
  targetSignal: string;
  confidenceScore: number;
  reason: string;
};

export type AvailableAnalysisItem = {
  id: string;
  label: string;
  basedOnSignals: string[];
  source: "signals" | "business_view" | "question";
};

export type UnavailableAnalysisItem = {
  id: string;
  label: string;
  missingSignals: string[];
  reason: string;
};

export type DatasetUnderstanding = {
  id: string;
  datasetName?: string;

  status: DatasetUnderstandingStatus;
  confidenceScore: number;

  summary: {
    rowCount?: number;
    columnCount?: number;
    signalCount: number;
    perspectiveCount: number;
    businessViewCount: number;
    questionCount: number;
  };

  detectedConcepts: UnderstandingConcept[];
  inferredEntities: UnderstandingEntity[];
  workflowHints: WorkflowHint[];
  relationshipHints: RelationshipHint[];

  availableAnalysis: AvailableAnalysisItem[];
  unavailableAnalysis: UnavailableAnalysisItem[];

  caveats: string[];
  narrative: string;

  sourceTrace: {
    signalIds: string[];
    perspectiveIds: string[];
    businessViewIds: string[];
    questionSuggestionIds: string[];
  };

  createdAt: string;
};

export interface CreateUnderstandingInput {
  datasetName?: string;
  rowCount?: number;
  columnCount?: number;
  signalRegistry: BusinessSignalRegistry;
  perspectives?: any[]; 
  businessViews?: any[];
  questionSuggestions?: any[];
}

export function createDatasetUnderstanding(input: CreateUnderstandingInput): DatasetUnderstanding {
  const {
    datasetName,
    rowCount,
    columnCount,
    signalRegistry,
    perspectives = [],
    businessViews = [],
    questionSuggestions = [],
  } = input;

  const signals = signalRegistry.signals || [];
  const hasSignals = signals.length > 0;
  const hasViewsOrQuestions = businessViews.length > 0 || questionSuggestions.length > 0;

  let status: DatasetUnderstandingStatus = "insufficient";
  if (!hasSignals) {
    status = "insufficient";
  } else if (hasSignals && !hasViewsOrQuestions) {
    status = "partial";
  } else if (hasSignals && hasViewsOrQuestions) {
    status = "understood";
  }

  // 4. detectedConcepts come directly from signalRegistry.signals
  const detectedConcepts: UnderstandingConcept[] = signals.map(sig => ({
    signalId: sig.canonicalId,
    label: sig.label,
    canonicalConcept: sig.canonicalId,
    confidenceScore: sig.confidenceScore,
    evidence: sig.supportingEvidence.map(e => e.columnName),
  }));

  // 5. inferredEntities derive from canonical signals
  const inferredEntities: UnderstandingEntity[] = signals.map(sig => ({
    id: `entity_${sig.canonicalId}`,
    label: sig.label,
    conceptSignals: [sig.canonicalId],
    confidenceScore: sig.confidenceScore,
  }));

  const workflowHints: WorkflowHint[] = [];
  const relationshipHints: RelationshipHint[] = [];
  const availableAnalysis: AvailableAnalysisItem[] = [];
  const unavailableAnalysis: UnavailableAnalysisItem[] = [];

  const signalIds = signals.map(s => s.canonicalId);
  const has = (id: string) => signalIds.includes(id);

  // 7. Delivery Performance Logic (Conservative Mapping)
  if (has('report_date') && has('route') && has('driver') && has('shipment') && has('satisfaction')) {
    // Override label for Customer Feedback entity as requested
    const feedback = inferredEntities.find(e => e.conceptSignals.includes('satisfaction'));
    if (feedback) feedback.label = 'Customer Feedback';

    availableAnalysis.push(
      { id: 'aa1', label: 'Shipment activity by route', basedOnSignals: ['shipment', 'route'], source: 'signals' },
      { id: 'aa2', label: 'Shipment activity by driver', basedOnSignals: ['shipment', 'driver'], source: 'signals' },
      { id: 'aa3', label: 'Satisfaction by route', basedOnSignals: ['satisfaction', 'route'], source: 'signals' },
      { id: 'aa4', label: 'Satisfaction by driver', basedOnSignals: ['satisfaction', 'driver'], source: 'signals' },
      { id: 'aa5', label: 'Activity over report date', basedOnSignals: ['report_date'], source: 'signals' }
    );

    if (!has('sla') || !has('delivery_status')) {
      unavailableAnalysis.push(
        { id: 'ua1', label: 'SLA breach analysis', missingSignals: ['sla'], reason: 'Missing SLA information' },
        { id: 'ua2', label: 'Delivery status transition analysis', missingSignals: ['delivery_status'], reason: 'Missing delivery status' },
        { id: 'ua3', label: 'Late delivery rate', missingSignals: ['sla', 'delivery_status'], reason: 'Missing SLA and delivery status' }
      );
    }
  }

  // Generate Narrative
  let narrative = "";
  if (status === "insufficient") {
    narrative = "Insufficient data to understand this dataset.";
  } else if (has('report_date') && has('route') && has('driver') && has('shipment') && has('satisfaction')) {
    narrative = "This dataset appears to describe delivery operations activity, but advanced SLA/status analysis is unavailable.";
  } else {
    narrative = `Detected ${signals.length} business concepts.`;
  }

  const confidenceScore = signals.length > 0 ? (signals.reduce((acc, s) => acc + s.confidenceScore, 0) / signals.length) : 0;

  return {
    id: `du_${Date.now()}`,
    datasetName,
    status,
    confidenceScore,
    summary: {
      rowCount,
      columnCount,
      signalCount: signals.length,
      perspectiveCount: perspectives.length,
      businessViewCount: businessViews.length,
      questionCount: questionSuggestions.length,
    },
    detectedConcepts,
    inferredEntities,
    workflowHints,
    relationshipHints,
    availableAnalysis,
    unavailableAnalysis,
    caveats: [],
    narrative,
    sourceTrace: {
      signalIds,
      perspectiveIds: perspectives.map(p => p.id || 'p'),
      businessViewIds: businessViews.map(v => v.id || 'v'),
      questionSuggestionIds: questionSuggestions.map(q => q.id || 'q'),
    },
    createdAt: new Date().toISOString(),
  };
}
