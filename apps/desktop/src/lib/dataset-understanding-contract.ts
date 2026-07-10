import { detectCapabilities, generateOpportunities } from './dataset-capability-engine';
import type { DatasetCapability, AnalysisOpportunity } from './dataset-capability-engine';
import type { BusinessSignal, BusinessSignalRegistry } from './business-signal-detector';
import { getSignalType } from './business-signal-detector';
import type { SemanticCoverageReport } from './semantic-coverage';
import type { ReadinessGuidance } from './decision-readiness-engine';
import { evaluateDecisionReadiness } from './decision-readiness-engine';
import type { DatasetHealthResult } from './dataset-health-engine';

export type DatasetGrain = "event" | "entity" | "snapshot" | "summary" | "transaction" | "unknown";

export type DatasetUnderstandingStatus = "understood" | "partial" | "insufficient";

export type MappingIssueType = "recognized" | "ambiguous" | "unrecognized" | "conflicting";

export interface MappingReviewItem {
  physicalColumn: string;
  inferredSignal?: string;
  issueType: MappingIssueType;
  confidence: number;
  suggestedActions: string[];
}

export interface MappingReviewContract {
  items: MappingReviewItem[];
  completionScore?: number;
}

export type UnderstandingConcept = {
  signalId?: string;
  label?: string;
  displayName?: string;
  businessDomain?: string;
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
  sourceSignal?: string;
  targetSignal?: string;
  description?: string;
  confidenceScore: number;
};

export type RelationshipHint = {
  id: string;
  label: string;
  sourceSignal: string;
  targetSignal: string;
  confidenceScore: number;
  reason: string;
  description?: string;
};

export type AvailableAnalysisItem = {
  id: string;
  label: string;
  basedOnSignals: string[];
  source: "signals" | "business_view" | "question";
  actionType?: "group_by" | "trend" | "distribution" | "relationship" | "table_preview";
  dimensions?: string[];
  measures?: string[];
};

export type UnavailableAnalysisItem = {
  id: string;
  label: string;
  missingSignals: string[];
  reason: string;
};

export type DatasetUnderstanding = {
  id: string;
  datasetId?: string;
  datasetName?: string;

  status: DatasetUnderstandingStatus;
  confidenceScore: number;
  grain: DatasetGrain;
  grainHint?: DatasetGrain;
  grainEvidence: string;
  
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
  
  capabilities: DatasetCapability[];
  opportunities: AnalysisOpportunity[];
  // Legacy compatibility fields
  availableAnalysis: AvailableAnalysisItem[];
  unavailableAnalysis: UnavailableAnalysisItem[];

  readiness?: ReadinessGuidance;
  caveats: string[];
  narrative: string;
  mappingReview?: MappingReviewContract;
  semanticCoverage?: SemanticCoverageReport;

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
  status?: DatasetUnderstandingStatus;
  rowCount?: number;
  columnCount?: number;
  signalRegistry: BusinessSignalRegistry;
  perspectives?: any[]; 
  businessViews?: any[];
  questionSuggestions?: any[];
  health?: DatasetHealthResult;
}


function generateDomainOpportunities(
  signals: BusinessSignal[],
  has: (id: string) => boolean,
  timeSignals: BusinessSignal[],
  measureSignals: BusinessSignal[],
  dimensionSignals: BusinessSignal[]
): { available: AvailableAnalysisItem[]; unavailable: UnavailableAnalysisItem[] } {
  const available: AvailableAnalysisItem[] = [];
  const unavailable: UnavailableAnalysisItem[] = [];
  let capId = 1;
  let domainMatched = false;

  if (has('shipment') || has('route') || has('driver')) {
    domainMatched = true;
    if (has('route') && has('shipment')) available.push({ id: `opp_${capId++}`, label: "Shipment activity by route", basedOnSignals: ['shipment', 'route'], source: 'signals', actionType: 'group_by', dimensions: ['route'], measures: ['shipment'] });
    if (has('driver') && has('shipment')) available.push({ id: `opp_${capId++}`, label: "Shipment activity by driver", basedOnSignals: ['shipment', 'driver'], source: 'signals', actionType: 'group_by', dimensions: ['driver'], measures: ['shipment'] });
    if (has('report_date') && has('shipment')) available.push({ id: `opp_${capId++}`, label: "Activity over report date", basedOnSignals: ['shipment', 'report_date'], source: 'signals', actionType: 'trend', dimensions: ['report_date'], measures: ['shipment'] });
    if (has('satisfaction') && has('route')) available.push({ id: `opp_${capId++}`, label: "Satisfaction by route", basedOnSignals: ['satisfaction', 'route'], source: 'signals', actionType: 'group_by', dimensions: ['route'], measures: ['satisfaction'] });
    if (has('satisfaction') && has('driver')) available.push({ id: `opp_${capId++}`, label: "Satisfaction by driver", basedOnSignals: ['satisfaction', 'driver'], source: 'signals', actionType: 'group_by', dimensions: ['driver'], measures: ['satisfaction'] });
    
    if (!has('sla')) unavailable.push({ id: 'ua_sla', label: 'SLA breach analysis', missingSignals: ['sla'], reason: 'Missing SLA data' });
    if (!has('delivery_status')) unavailable.push({ id: 'ua_delivery_status', label: 'Delivery status transition analysis', missingSignals: ['delivery_status'], reason: 'Missing delivery status' });
    if (!has('sla') || !has('delivery_status')) unavailable.push({ id: 'ua_late', label: 'Late delivery rate', missingSignals: ['sla', 'delivery_status'], reason: 'Missing SLA and delivery status' });
  }

  if (has('sku') || has('stock_age') || has('inventory') || has('stock_qty')) {
    domainMatched = true;
    if (has('stock_age') && has('sku')) available.push({ id: `opp_${capId++}`, label: "Stock aging profile by SKU", basedOnSignals: ['stock_age', 'sku'], source: 'signals', actionType: 'distribution', dimensions: ['sku'], measures: ['stock_age'] });
    if (has('stock_age') && has('warehouse')) available.push({ id: `opp_${capId++}`, label: "Average aging by warehouse", basedOnSignals: ['stock_age', 'warehouse'], source: 'signals', actionType: 'group_by', dimensions: ['warehouse'], measures: ['stock_age'] });
    if (has('stock_qty') && has('sku')) available.push({ id: `opp_${capId++}`, label: "Inventory level by SKU", basedOnSignals: ['stock_qty', 'sku'], source: 'signals', actionType: 'group_by', dimensions: ['sku'], measures: ['stock_qty'] });
    if (has('inventory') && has('warehouse')) available.push({ id: `opp_${capId++}`, label: "Inventory by warehouse", basedOnSignals: ['inventory', 'warehouse'], source: 'signals', actionType: 'group_by', dimensions: ['warehouse'], measures: ['inventory'] });
    if (has('inbound') && has('outbound')) available.push({ id: `opp_${capId++}`, label: "Inbound vs outbound movement", basedOnSignals: ['inbound', 'outbound'], source: 'signals', actionType: 'relationship', dimensions: ['sku'], measures: ['inbound', 'outbound'] });

    if (!has('stock_status')) unavailable.push({ id: 'ua_stock_status', label: 'Inventory status analysis', missingSignals: ['stock_status'], reason: 'Missing inventory status column' });
  }

  if (has('revenue') || has('cost') || has('profit') || has('margin')) {
    domainMatched = true;
    if (has('revenue') && has('cost')) available.push({ id: `opp_${capId++}`, label: "Revenue vs cost breakdown", basedOnSignals: ['revenue', 'cost'], source: 'signals', actionType: 'relationship', dimensions: [], measures: ['revenue', 'cost'] });
    if (has('profit') && has('margin')) available.push({ id: `opp_${capId++}`, label: "Profit distribution", basedOnSignals: ['profit', 'margin'], source: 'signals', actionType: 'distribution', dimensions: [], measures: ['profit'] });
    if (has('revenue') && timeSignals.length > 0) available.push({ id: `opp_${capId++}`, label: `Revenue over ${timeSignals[0].label}`, basedOnSignals: ['revenue', timeSignals[0].canonicalId], source: 'signals', actionType: 'trend', dimensions: [timeSignals[0].canonicalId], measures: ['revenue'] });
    if (has('expense') && has('budget')) available.push({ id: `opp_${capId++}`, label: "Expense vs budget", basedOnSignals: ['expense', 'budget'], source: 'signals', actionType: 'relationship', dimensions: [], measures: ['expense', 'budget'] });
    
    if (!has('cost')) unavailable.push({ id: 'ua_cost', label: 'Cost breakdown analysis', missingSignals: ['cost'], reason: 'Missing cost data' });
  }

  if (has('sales') || has('order') || has('revenue')) {
    domainMatched = true;
    if (has('sales') && has('branch')) available.push({ id: `opp_${capId++}`, label: "Sales by branch", basedOnSignals: ['sales', 'branch'], source: 'signals', actionType: 'group_by', dimensions: ['branch'], measures: ['sales'] });
    if (has('revenue') && has('salesperson')) available.push({ id: `opp_${capId++}`, label: "Revenue by salesperson", basedOnSignals: ['revenue', 'salesperson'], source: 'signals', actionType: 'group_by', dimensions: ['salesperson'], measures: ['revenue'] });
    if (has('order') && timeSignals.length > 0) available.push({ id: `opp_${capId++}`, label: "Order volume over time", basedOnSignals: ['order', timeSignals[0].canonicalId], source: 'signals', actionType: 'trend', dimensions: [timeSignals[0].canonicalId], measures: ['order'] });
    if (has('discount') && has('revenue')) available.push({ id: `opp_${capId++}`, label: "Discount impact on revenue", basedOnSignals: ['discount', 'revenue'], source: 'signals', actionType: 'relationship', dimensions: [], measures: ['discount', 'revenue'] });

    if (!has('customer')) unavailable.push({ id: 'ua_customer', label: 'Customer cohort analysis', missingSignals: ['customer'], reason: 'Missing customer identifier' });
  }

  if (has('customer') || has('segment') || has('retention')) {
    domainMatched = true;
    if (has('retention') && has('segment')) available.push({ id: `opp_${capId++}`, label: "Retention rate by segment", basedOnSignals: ['retention', 'segment'], source: 'signals', actionType: 'group_by', dimensions: ['segment'], measures: ['retention'] });
    if (has('order_count') && has('segment')) available.push({ id: `opp_${capId++}`, label: "Order frequency by segment", basedOnSignals: ['order_count', 'segment'], source: 'signals', actionType: 'group_by', dimensions: ['segment'], measures: ['order_count'] });
    if (has('contribution') && has('segment')) available.push({ id: `opp_${capId++}`, label: "Revenue contribution by segment", basedOnSignals: ['contribution', 'segment'], source: 'signals', actionType: 'group_by', dimensions: ['segment'], measures: ['contribution'] });
    if (has('last_purchase') && has('segment')) available.push({ id: `opp_${capId++}`, label: "Recency distribution by segment", basedOnSignals: ['last_purchase', 'segment'], source: 'signals', actionType: 'distribution', dimensions: ['segment'], measures: ['last_purchase'] });

    if (!has('last_purchase')) unavailable.push({ id: 'ua_recency', label: 'Recency analysis', missingSignals: ['last_purchase'], reason: 'Missing last purchase date' });
  }

  if (has('kpi') || has('target') || has('achievement') || has('actual')) {
    domainMatched = true;
    if (has('target') && has('achievement')) available.push({ id: `opp_${capId++}`, label: "Target vs achievement by KPI", basedOnSignals: ['target', 'achievement', 'kpi'], source: 'signals', actionType: 'relationship', dimensions: ['kpi'], measures: ['target', 'achievement'] });
    if (has('actual') && has('department')) available.push({ id: `opp_${capId++}`, label: "Actual performance by department", basedOnSignals: ['actual', 'department'], source: 'signals', actionType: 'group_by', dimensions: ['department'], measures: ['actual'] });
    if (has('efficiency') && has('department')) available.push({ id: `opp_${capId++}`, label: "Efficiency by department", basedOnSignals: ['efficiency', 'department'], source: 'signals', actionType: 'group_by', dimensions: ['department'], measures: ['efficiency'] });
    if (has('performance_gap') && has('kpi')) available.push({ id: `opp_${capId++}`, label: "Performance gap distribution", basedOnSignals: ['performance_gap', 'kpi'], source: 'signals', actionType: 'distribution', dimensions: ['kpi'], measures: ['performance_gap'] });

    if (!has('target')) unavailable.push({ id: 'ua_target', label: 'Target vs actual comparison', missingSignals: ['target'], reason: 'Missing target data' });
  }

  if (!domainMatched || (domainMatched && available.length === 0)) {
    let hasPromotedDist = false;
    for (const dim of dimensionSignals) {
      if (capId > 8) break;
      const isIdentifier = dim.canonicalId.toLowerCase().includes('id') || dim.canonicalId.toLowerCase().includes('sku') || dim.canonicalId.toLowerCase().includes('code') || dim.canonicalId.toLowerCase().includes('name');
      if (!hasPromotedDist && !isIdentifier) {
        // Only promote distribution for safe categorical non-identifiers
        available.push({ id: `gen_aa_${capId++}`, label: `${dim.label} distribution`, basedOnSignals: [dim.canonicalId], source: 'signals', actionType: 'distribution', dimensions: [dim.canonicalId], measures: ['record_count'] });
        hasPromotedDist = true;
      } else if (isIdentifier) {
        // High cardinality identifier / meaningless record_count fallback to table_preview
        available.push({ id: `gen_aa_${capId++}`, label: `Preview ${dim.label} data`, basedOnSignals: [dim.canonicalId], source: 'signals', actionType: 'table_preview', dimensions: [dim.canonicalId], measures: [] });
      }
    }
    let hasPromotedTrend = false;
    let hasPromotedGroupBy = false;
    for (const measure of measureSignals) {
      for (const time of timeSignals) {
        if (capId > 16) break;
        if (!hasPromotedTrend) {
          available.push({ id: `gen_aa_${capId++}`, label: `${measure.label} over ${time.label}`, basedOnSignals: [measure.canonicalId, time.canonicalId], source: 'signals', actionType: 'trend', dimensions: [time.canonicalId], measures: [measure.canonicalId] });
          hasPromotedTrend = true;
        }
      }
      for (const dim of dimensionSignals) {
        if (capId > 24) break;
        if (!hasPromotedGroupBy) {
          available.push({ id: `gen_aa_${capId++}`, label: `${measure.label} by ${dim.label}`, basedOnSignals: [measure.canonicalId, dim.canonicalId], source: 'signals', actionType: 'group_by', dimensions: [dim.canonicalId], measures: [measure.canonicalId] });
          hasPromotedGroupBy = true;
        }
      }
    }

    if (signals.length > 0 && measureSignals.length === 0) unavailable.push({ id: 'gen_ua_1', label: 'Quantitative breakdown analysis', missingSignals: ['(any measure)'], reason: 'Dataset lacks quantitative measure signals to aggregate.' });
    if (signals.length > 0 && timeSignals.length === 0) unavailable.push({ id: 'gen_ua_2', label: 'Trend over time analysis', missingSignals: ['(any time dimension)'], reason: 'Dataset lacks time-based signals for trend analysis.' });
  }

  // Fallback if absolutely no opportunities were generated
  if (available.length === 0) {
    available.push({ 
      id: `gen_aa_preview`, 
      label: `Explore dataset structure and sample rows`, 
      basedOnSignals: [], 
      source: 'signals', 
      actionType: 'table_preview', 
      dimensions: [], 
      measures: [] 
    });
  }

  return { available, unavailable };
}

function generateNarrative(
  status: DatasetUnderstandingStatus,
  signals: BusinessSignal[],
  availableCount: number,
  has: (id: string) => boolean
): string {
  if (status === "insufficient") return "Insufficient data to understand this dataset.";

  if (has('report_date') && has('route') && has('driver') && has('shipment') && has('satisfaction')) {
    return "This dataset appears to describe delivery operations activity, but advanced SLA/status analysis is unavailable.";
  }

  const domainCounts: Record<string, number> = {};
  for (const s of signals) {
    domainCounts[s.domain] = (domainCounts[s.domain] || 0) + 1;
  }
  let dominantDomain = "unknown";
  let maxCount = 0;
  for (const [d, count] of Object.entries(domainCounts)) {
    if (count > maxCount) { maxCount = count; dominantDomain = d; }
  }

  if (dominantDomain === 'operations') return `This appears to be an operations or delivery dataset. ${availableCount} analysis paths identified.`;
  if (dominantDomain === 'inventory') return `This appears to be an inventory dataset. ${availableCount} analysis paths identified.`;
  if (dominantDomain === 'finance') return `This appears to be a finance or P&L dataset. ${availableCount} analysis paths identified.`;
  if (dominantDomain === 'revenue') return `This appears to be a sales or revenue dataset. ${availableCount} analysis paths identified.`;
  if (dominantDomain === 'customer') return `This appears to be a customer analytics dataset. ${availableCount} analysis paths identified.`;
  if (dominantDomain === 'performance') return `This appears to be a performance or KPI dataset. ${availableCount} analysis paths identified.`;

  return `Detected ${signals.length} business concepts across ${availableCount} analysis paths.`;
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
  const semanticCoverage = signalRegistry.semanticCoverage;
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
  // opportunities and capabilities generated at the end
  const availableAnalysis: any[] = [];
  const unavailableAnalysis: UnavailableAnalysisItem[] = [];

  const signalIds = signals.map(s => s.canonicalId);
  
  const has = (id: string) => signalIds.includes(id);

  if (has('report_date') && has('route') && has('driver') && has('shipment') && has('satisfaction')) {
    const feedback = inferredEntities.find(e => e.conceptSignals.includes('satisfaction'));
    if (feedback) feedback.label = 'Customer Feedback';
  }

  // 7. Domain-General Analysis Logic
  const timeSignals = signals.filter(s => getSignalType(s.canonicalId) === 'time');
  const measureSignals = signals.filter(s => getSignalType(s.canonicalId) === 'measure');
  const dimensionSignals = signals.filter(s => getSignalType(s.canonicalId) === 'dimension');

  const domainOpps = generateDomainOpportunities(signals, has, timeSignals, measureSignals, dimensionSignals);
  availableAnalysis.push(...domainOpps.available);
  unavailableAnalysis.push(...domainOpps.unavailable);

  // Generate Narrative
  const narrative = generateNarrative(status, signals, availableAnalysis.length, has);

  const confidenceScore = signals.length > 0 ? (signals.reduce((acc, s) => acc + s.confidenceScore, 0) / signals.length) : 0;

  // 8. Grain Heuristics
  let grain: DatasetGrain = "unknown";
  let grainEvidence = "No structural patterns recognized.";

  const hasEventSignals = has('shipment') || has('order') || has('stock_movement') || has('inbound') || has('outbound');
  const hasSnapshotSignals = has('stock_age') || has('stock_status') || has('inventory') || has('replenishment') || has('warehouse');
  const hasEntitySignals = has('sku') || has('product') || has('customer') || has('supplier') || has('branch') || has('salesperson');
  const hasTime = timeSignals.length > 0;

  if (hasEventSignals) {
    grain = "event";
    grainEvidence = "Detected event-level signals (e.g. shipment, order).";
  } else if (hasSnapshotSignals) {
    grain = "snapshot";
    grainEvidence = "Detected point-in-time snapshot signals (e.g. inventory, warehouse).";
  } else if (hasEntitySignals && !hasTime && measureSignals.length <= 1) {
    grain = "entity";
    grainEvidence = "Detected entity-level signals without deep temporal data.";
  } else if (hasTime && measureSignals.length > 0 && !hasEntitySignals && !hasEventSignals && !hasSnapshotSignals) {
    grain = "summary";
    grainEvidence = "Detected aggregated measures over time dimensions.";
  }

  const capabilities = detectCapabilities(signals);
  const opportunities = generateOpportunities(capabilities, grain);
  
  const baseUnderstanding = {
    id: `du_${Date.now()}`,
    datasetId: input.signalRegistry.datasetId || `ds_${Date.now()}`,
    datasetName,
    status,
    confidenceScore,
    grain,
    grainEvidence,
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
    capabilities,
    opportunities,
    availableAnalysis,
    unavailableAnalysis,
    caveats: [] as string[],
    narrative,
    mappingReview: input.signalRegistry.mappingReview,
    semanticCoverage,
    sourceTrace: {
      signalIds: signals.map(s => s.canonicalId),
      perspectiveIds: perspectives.map(p => p.id || 'p'),
      businessViewIds: businessViews.map(v => v.id || 'v'),
      questionSuggestionIds: questionSuggestions.map(q => q.id || 'q'),
    },
    createdAt: new Date().toISOString()
  };

  const hasActionableOpportunity = baseUnderstanding.opportunities.some(o => o.confidence === 'high' || o.confidence === 'medium');
  const hasRunnableAvailableAnalysis = baseUnderstanding.availableAnalysis.some(a => a.actionType && a.actionType !== 'table_preview');
  const lacksActionableAnalysis = !hasActionableOpportunity && !hasRunnableAvailableAnalysis;

  // Phase 1 Honesty: establish final truthful understanding state first
  if (lacksActionableAnalysis) {
    if (baseUnderstanding.status === "understood") {
      baseUnderstanding.status = "partial";
    }
    const msg = "Could not assemble runnable analysis paths from detected signals.";
    if (!baseUnderstanding.caveats.includes(msg)) {
      baseUnderstanding.caveats.push(msg);
    }
  }

  const unknownBusinessLikeCount = semanticCoverage?.summary.unknownBusinessLike ?? 0;
  if (unknownBusinessLikeCount > 0) {
    if (baseUnderstanding.status === "understood") {
      baseUnderstanding.status = "partial";
    }
    const msg = `${unknownBusinessLikeCount} populated business-like column(s) are not mapped to canonical signals yet. Review semantic coverage before relying on AI or final BA narrative.`;
    if (!baseUnderstanding.caveats.includes(msg)) {
      baseUnderstanding.caveats.push(msg);
    }
  }

  const readiness = evaluateDecisionReadiness(baseUnderstanding as any);

  // Rebuild the readiness evidence coherently for the zero-opportunity case
  if (lacksActionableAnalysis) {
    readiness.tier = "exploratory_only";
    readiness.explanation = "Dataset lacks structural support to assemble actionable analysis.";
    const msg = "Could not assemble runnable analysis paths from detected signals.";
    if (!readiness.caveats.includes(msg)) {
      readiness.caveats.push(msg);
    }
    if (readiness.score > 50) readiness.score = 50;
  }
  if (unknownBusinessLikeCount > 0) {
    const msg = `${unknownBusinessLikeCount} business-like column(s) need semantic review.`;
    if (!readiness.caveats.includes(msg)) {
      readiness.caveats.push(msg);
    }
    if (readiness.score > 85) readiness.score = 85;
  }

  const finalObject: DatasetUnderstanding = {
    ...baseUnderstanding,
    readiness
  };
  
  return finalObject;
}
