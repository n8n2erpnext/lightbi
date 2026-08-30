import type { AnalysisAction } from './analysis-opportunity-actions';
import type { ChartPreviewModel } from './chart-preview-model';
import type { BusinessFusionOverview } from './business-fusion-overview';
import type { BusinessBrainEvidence, BusinessBrainIntent, BusinessBrainKpi, BusinessBrainMissingEvidence, BusinessBrainReadiness, BusinessBrainRecommendation, BusinessBrainRisk, BusinessBrainRootCause } from './business-brain-brief';
import { chartFields, dedupeRisks, fieldMatches, formatNarrativeNumber, kpiNarrativeValue, normalize } from './business-brain-analysis';

export function businessQuestionFor(intent: BusinessBrainIntent, action: AnalysisAction): string {
  if (intent === 'payment') return 'How is value split across payment methods, and does the mix create cash-flow or receivable risk?';
  if (intent === 'logistics') return 'How do delivery status, carrier model, and delivery cost affect operational performance and profit?';
  if (intent === 'profitability') return 'Where did profit or margin move, and which business drivers explain the change?';
  if (intent === 'product') return 'Which products or items drive value, growth, decline, or margin risk?';
  if (intent === 'money') return 'How did money movement change across periods, and where should the decision maker focus?';
  if (intent === 'operations') return 'Which operational status, quantity, or movement pattern needs attention?';
  return action.description || 'What business answer does this selected angle support?';
}


function hasAvailableSignal(input: {
  action: AnalysisAction;
  chartModel: ChartPreviewModel | null;
  overview: BusinessFusionOverview | undefined;
}, candidates: string[]): boolean {
  const actionFields = [
    input.action.opportunityName,
    input.action.label,
    input.action.description,
    ...input.action.dimensions,
    ...input.action.measures
  ];
  const chartFieldList = chartFields(input.chartModel);
  const overviewFields = input.overview?.metrics.flatMap(metric => [metric.metricId, metric.label]) ?? [];
  return [...actionFields, ...chartFieldList, ...overviewFields].some(field => fieldMatches(field, candidates));
}


export function buildMissingEvidence(input: {
  action: AnalysisAction;
  chartModel: ChartPreviewModel | null;
  overview: BusinessFusionOverview | undefined;
  intent: BusinessBrainIntent;
}): BusinessBrainMissingEvidence[] {
  const { action, chartModel, overview, intent } = input;
  const missing: BusinessBrainMissingEvidence[] = [];
  const hasProfit = hasAvailableSignal({ action, chartModel, overview }, ['profit', 'margin', 'gross_profit', 'gross profit']);
  const hasDeliveryFee = hasAvailableSignal({ action, chartModel, overview }, ['delivery fee', 'shipping fee', 'freight', 'transport cost', 'phi giao', 'van chuyen']);

  if ((intent === 'payment' || intent === 'profitability') && !hasProfit) {
    missing.push({
      id: 'missing_profit_signal',
      label: 'Profit or margin evidence',
      neededFor: 'profitability conclusion',
      reason: 'Revenue or payment mix alone is not enough to claim profit impact.'
    });
  }

  if (intent === 'logistics' && !hasDeliveryFee) {
    missing.push({
      id: 'missing_delivery_fee',
      label: 'Delivery fee or transport cost',
      neededFor: 'logistics cost impact',
      reason: 'Carrier performance can be counted, but cost impact needs a delivery-fee or transport-cost measure.'
    });
  }

  if (intent === 'logistics') {
    missing.push({
      id: 'missing_fleet_investment_inputs',
      label: 'Fleet investment inputs',
      neededFor: 'buy more internal vehicles decision',
      reason: 'A buy-vs-outsource recommendation needs CAPEX, depreciation, maintenance, driver salary, vehicle capacity, and utilization data.'
    });
  }

  return missing;
}


export function buildRisks(
  overview: BusinessFusionOverview | undefined,
  intent: BusinessBrainIntent,
  missingEvidence: BusinessBrainMissingEvidence[],
  kpis: BusinessBrainKpi[],
  variance: BusinessBrainKpi[]
): BusinessBrainRisk[] {
  const risks: BusinessBrainRisk[] = [
    ...(overview?.riskSignals || []).map(signal => ({
      id: signal.id,
      severity: signal.severity,
      title: signal.title,
      message: signal.message,
      evidence: signal.evidence
    }))
  ];

  const findKpi = (id: string) => kpis.find(kpi => kpi.id === id);
  const topShare = kpis.find(kpi => /(top_share|^share_)/.test(kpi.id) && (kpi.value ?? 0) > 0.5);
  if (topShare?.value !== undefined) {
    risks.push({
      id: 'concentration_risk',
      severity: topShare.value > 0.7 ? 'high' : 'medium',
      title: 'Concentration risk',
      message: `${topShare.label} is ${formatNarrativeNumber(topShare.value, true)}, so the decision may depend heavily on one segment.`,
      evidence: [topShare.id, topShare.source]
    });
  }

  for (const check of overview?.reconciliationChecks ?? []) {
    if (check.severity === 'low') continue;
    risks.push({
      id: fieldMatches(check.label, ['revenue']) ? 'revenue_gap' : `reconciliation_gap_${check.id}`,
      severity: check.severity,
      title: fieldMatches(check.label, ['revenue']) ? 'Revenue gap' : `${check.label} gap`,
      message: `${check.label} gap is ${formatNarrativeNumber(check.gap)}${check.gapPercent !== null ? ` (${formatNarrativeNumber(check.gapPercent, true)})` : ''}.`,
      evidence: [check.id, check.label]
    });
  }

  if ((overview?.sources.length ?? 0) > 1 && (overview?.objectKeys.length ?? 0) === 0) {
    risks.push({
      id: 'missing_shared_key_risk',
      severity: 'high',
      title: 'Missing shared key risk',
      message: 'Multiple datasets were combined without a reliable shared business key, so cross-file conclusions may be incomplete.',
      evidence: ['objectKeys']
    });
  }

  const weakKey = (overview?.objectKeys ?? []).find(key => key.coverage < 0.9);
  if (weakKey) {
    risks.push({
      id: 'key_coverage_risk',
      severity: weakKey.coverage < 0.7 ? 'high' : 'medium',
      title: 'Key coverage risk',
      message: `${weakKey.key} matches ${formatNarrativeNumber(weakKey.coverage, true)} of the related evidence, so some joined analysis may be partial.`,
      evidence: [weakKey.key, ...weakKey.families]
    });
  }

  const relationshipWarning = [...(overview?.crossChecks ?? []), ...(overview?.caveats ?? [])]
    .find(item => /(many to many|many-to-many|duplicate|relationship|join|key)/i.test(item));
  if (relationshipWarning) {
    risks.push({
      id: 'relationship_risk',
      severity: 'medium',
      title: 'Relationship risk',
      message: relationshipWarning,
      evidence: ['crossChecks', 'caveats']
    });
  }

  const costSpike = variance.find(kpi => {
    const text = normalize(`${kpi.id} ${kpi.label} ${kpi.source}`);
    return /(cost|fee|delivery|freight|shipping)/.test(text)
      && (kpi.delta ?? 0) > 0
      && (kpi.deltaPercent ?? 0) > 0.2;
  });
  if (costSpike) {
    risks.push({
      id: fieldMatches(costSpike.label, ['delivery', 'shipping', 'freight']) ? 'delivery_fee_spike' : 'cost_spike',
      severity: (costSpike.deltaPercent ?? 0) > 0.5 ? 'high' : 'medium',
      title: fieldMatches(costSpike.label, ['delivery', 'shipping', 'freight']) ? 'Delivery fee spike' : 'Cost spike',
      message: `${costSpike.label} increased by ${formatNarrativeNumber(costSpike.delta)}${costSpike.deltaPercent !== null && costSpike.deltaPercent !== undefined ? ` (${formatNarrativeNumber(costSpike.deltaPercent, true)})` : ''}.`,
      evidence: [costSpike.id, costSpike.source]
    });
  }

  const margin = findKpi('margin_pct')?.value;
  if (margin !== undefined && margin < 0.12) {
    risks.push({
      id: 'low_margin',
      severity: margin < 0.05 ? 'high' : 'medium',
      title: 'Low margin',
      message: `Margin is ${formatNarrativeNumber(margin, true)}, so profitability needs review before scaling this segment.`,
      evidence: ['margin_pct']
    });
  }

  const receivableExposure = findKpi('payment_receivable_exposure')?.value ?? findKpi('ar_debit')?.value;
  if (receivableExposure !== undefined && receivableExposure > 0.3 && receivableExposure <= 1) {
    risks.push({
      id: 'high_ar_exposure',
      severity: receivableExposure > 0.5 ? 'high' : 'medium',
      title: 'High receivable exposure',
      message: `Receivable exposure is ${formatNarrativeNumber(receivableExposure, true)}, which can pressure cash collection.`,
      evidence: ['payment_receivable_exposure', 'ar_debit']
    });
  }

  const deferredShare = findKpi('deferred_payment_share')?.value;
  if (deferredShare !== undefined && deferredShare > 0.3) {
    risks.push({
      id: 'high_deferred_payment_share',
      severity: deferredShare > 0.45 ? 'high' : 'medium',
      title: 'High deferred payment share',
      message: `Deferred payment share is ${formatNarrativeNumber(deferredShare, true)}, so cash timing should be reviewed.`,
      evidence: ['deferred_payment_share']
    });
  }

  const deliveryFeeToRevenue = findKpi('delivery_fee_to_revenue')?.value;
  if (deliveryFeeToRevenue !== undefined && deliveryFeeToRevenue > 0.08) {
    risks.push({
      id: 'delivery_fee_pressure',
      severity: deliveryFeeToRevenue > 0.15 ? 'high' : 'medium',
      title: 'Delivery fee pressure',
      message: `Delivery fee is ${formatNarrativeNumber(deliveryFeeToRevenue, true)} of revenue in this evidence set.`,
      evidence: ['delivery_fee_to_revenue']
    });
  }

  const deliveryFeeToProfit = findKpi('delivery_fee_to_profit')?.value;
  if (deliveryFeeToProfit !== undefined && deliveryFeeToProfit > 0.25) {
    risks.push({
      id: 'delivery_fee_pressure',
      severity: deliveryFeeToProfit > 0.5 ? 'high' : 'medium',
      title: 'Delivery fee pressure',
      message: `Delivery fee is ${formatNarrativeNumber(deliveryFeeToProfit, true)} of profit in this evidence set.`,
      evidence: ['delivery_fee_to_profit']
    });
  }

  const externalCarrierShare = findKpi('external_carrier_share')?.value;
  if (externalCarrierShare !== undefined && externalCarrierShare > 0.6) {
    risks.push({
      id: 'outsourced_carrier_dependency',
      severity: externalCarrierShare > 0.8 ? 'high' : 'medium',
      title: 'Outsourced carrier dependency',
      message: `External carrier share is ${formatNarrativeNumber(externalCarrierShare, true)}, so cost and SLA exposure should be reviewed.`,
      evidence: ['external_carrier_share']
    });
  }

  const fulfilledRate = findKpi('fulfilled_rate')?.value;
  if (fulfilledRate !== undefined && fulfilledRate < 0.9) {
    risks.push({
      id: 'low_fulfilled_rate',
      severity: fulfilledRate < 0.75 ? 'high' : 'medium',
      title: 'Low fulfilled delivery rate',
      message: `Fulfilled delivery rate is ${formatNarrativeNumber(fulfilledRate, true)}, so retry/cancelled delivery should be investigated.`,
      evidence: ['fulfilled_rate']
    });
  }

  if (intent === 'logistics') {
    risks.push({
      id: 'possible_outsourced_carrier_dependency',
      severity: 'medium',
      title: 'Possible outsourced carrier dependency',
      message: 'Carrier and delivery-fee evidence should be checked before deciding whether internal vehicles can absorb outsourced volume.',
      evidence: ['carrier', 'delivery_fee', 'delivery_status']
    });
  }

  if (missingEvidence.length > 0) {
    risks.push({
      id: 'decision_evidence_gap',
      severity: 'medium',
      title: 'Decision evidence gap',
      message: `${missingEvidence.length} evidence gap(s) prevent a fully confident decision recommendation.`,
      evidence: missingEvidence.map(item => item.label)
    });
  }

  return dedupeRisks(risks).slice(0, 12);
}


export function buildRecommendations(
  intent: BusinessBrainIntent,
  missingEvidence: BusinessBrainMissingEvidence[],
  rootCauses: BusinessBrainRootCause[],
  risks: BusinessBrainRisk[]
): BusinessBrainRecommendation[] {
  const recommendations: BusinessBrainRecommendation[] = [];

  if (rootCauses.length > 0) {
    recommendations.push({
      type: 'investigate',
      priority: 'medium',
      title: 'Investigate the strongest driver',
      action: `Start with ${rootCauses[0].label}; it has the clearest evidence in this selected angle.`
    });
  }

  if (intent === 'logistics') {
    recommendations.push({
      type: missingEvidence.some(item => item.id === 'missing_fleet_investment_inputs') ? 'need_more_data' : 'investigate',
      priority: 'high',
      title: 'Validate internal vs outsourced delivery economics',
      action: 'Compare completed delivery share, outsourced delivery fee, and profit impact before deciding whether to shift volume to internal vehicles.'
    });
  }

  if (intent === 'payment') {
    recommendations.push({
      type: 'investigate',
      priority: 'medium',
      title: 'Review cash-flow exposure',
      action: 'Compare cash, installment, transfer, and receivable exposure by period, store, and product before acting on payment mix.'
    });
  }

  if (risks.some(risk => risk.id === 'low_margin' || risk.id === 'delivery_fee_pressure')) {
    recommendations.push({
      type: 'investigate',
      priority: 'high',
      title: 'Protect margin before scaling',
      action: 'Drill into product, store, payment, and logistics cost drivers before increasing volume in this segment.'
    });
  }

  if (risks.some(risk => risk.id === 'high_ar_exposure' || risk.id === 'high_deferred_payment_share')) {
    recommendations.push({
      type: 'investigate',
      priority: 'high',
      title: 'Review collection and payment terms',
      action: 'Compare deferred payment and receivable exposure by customer, product, store, and period.'
    });
  }

  const hasBlockingGap = missingEvidence.length > 0;
  const hasHighRisk = risks.some(risk => risk.severity === 'high');
  if (!hasBlockingGap && !hasHighRisk && rootCauses.length > 0) {
    recommendations.push({
      type: 'do_now',
      priority: 'medium',
      title: 'Use this angle as the decision baseline',
      action: `Use ${rootCauses[0].label} as the first review point, then validate the listed KPI evidence before execution.`
    });
  }

  if (missingEvidence.length > 0) {
    recommendations.push({
      type: 'need_more_data',
      priority: 'high',
      title: 'Collect missing decision evidence',
      action: `Add ${missingEvidence.slice(0, 3).map(item => item.label).join(', ')} to raise decision readiness.`
    });
  }

  return recommendations.slice(0, 4);
}


export function readinessFor(kpis: BusinessBrainKpi[], rootCauses: BusinessBrainRootCause[], missingEvidence: BusinessBrainMissingEvidence[]): BusinessBrainReadiness {
  if (kpis.length === 0 && rootCauses.length === 0) return 'blocked';
  if (missingEvidence.length > 0) return 'partial';
  return 'ready';
}


export function buildEvidence(input: {
  kpis: BusinessBrainKpi[];
  variance: BusinessBrainKpi[];
  rootCauses: BusinessBrainRootCause[];
  risks: BusinessBrainRisk[];
  missingEvidence: BusinessBrainMissingEvidence[];
}): BusinessBrainEvidence[] {
  const kpiEvidence = input.kpis.slice(0, 6).map(kpi => ({
    id: `evidence_kpi_${kpi.id}`,
    type: 'kpi' as const,
    label: kpi.label,
    source: kpi.source,
    confidence: kpi.confidence,
    details: [
      kpi.formula ? `Formula: ${kpi.formula}` : null,
      kpi.sourceColumns?.length ? `Columns: ${kpi.sourceColumns.join(', ')}` : null,
      `Value: ${kpiNarrativeValue(kpi)}`
    ].filter((item): item is string => Boolean(item))
  }));

  const varianceEvidence = input.variance.slice(0, 4).map(kpi => ({
    id: `evidence_variance_${kpi.id}`,
    type: 'variance' as const,
    label: kpi.label,
    source: kpi.source,
    confidence: kpi.confidence,
    details: [
      kpi.formula ? `Formula: ${kpi.formula}` : null,
      kpi.sourceColumns?.length ? `Columns: ${kpi.sourceColumns.join(', ')}` : null,
      `${formatNarrativeNumber(kpi.previousValue)} -> ${formatNarrativeNumber(kpi.currentValue)}, delta ${formatNarrativeNumber(kpi.delta)}`
    ].filter((item): item is string => Boolean(item))
  }));

  const rootCauseEvidence = input.rootCauses.slice(0, 5).map(cause => ({
    id: `evidence_root_${cause.id}`,
    type: 'root_cause' as const,
    label: cause.label,
    source: cause.dimension ?? cause.level ?? 'root cause',
    details: cause.evidence
  }));

  const riskEvidence = input.risks.slice(0, 5).map(risk => ({
    id: `evidence_risk_${risk.id}`,
    type: 'risk' as const,
    label: risk.title,
    source: risk.severity,
    details: [risk.message, ...risk.evidence]
  }));

  const missingEvidence = input.missingEvidence.slice(0, 5).map(item => ({
    id: `evidence_missing_${item.id}`,
    type: 'missing_evidence' as const,
    label: item.label,
    source: item.neededFor,
    details: [item.reason]
  }));

  return [...kpiEvidence, ...varianceEvidence, ...rootCauseEvidence, ...riskEvidence, ...missingEvidence];
}


export function buildNextQuestions(input: {
  intent: BusinessBrainIntent;
  rootCauses: BusinessBrainRootCause[];
  risks: BusinessBrainRisk[];
  missingEvidence: BusinessBrainMissingEvidence[];
}): string[] {
  const { intent, rootCauses, risks, missingEvidence } = input;
  const questions: string[] = [];
  const leadCause = rootCauses[0];

  if (missingEvidence.length > 0) {
    questions.push(`What data can close the ${missingEvidence[0].label.toLowerCase()} gap?`);
  }

  if (intent === 'payment') {
    questions.push('Which store, product, or customer segment is driving deferred payment and receivable exposure?');
  } else if (intent === 'logistics') {
    questions.push('Which carrier or delivery status contributes the most delivery cost and retry risk?');
  } else if (intent === 'product') {
    questions.push('Which product category or store explains the largest value concentration?');
  } else if (intent === 'profitability') {
    questions.push('Which product, store, payment method, or logistics driver explains the margin movement?');
  } else if (intent === 'money') {
    questions.push('Which business dimension explains the period-over-period money movement?');
  }

  if (risks.some(risk => risk.id === 'delivery_fee_pressure')) {
    questions.push('Is delivery fee pressure coming from carrier mix, delivery status, or product/store concentration?');
  }
  if (risks.some(risk => risk.id === 'concentration_risk')) {
    questions.push('Can the result be diversified across more products, stores, customers, or carriers?');
  }
  if (risks.some(risk => risk.id === 'revenue_gap' || risk.id === 'relationship_risk' || risk.id === 'key_coverage_risk')) {
    questions.push('Which source rows or shared keys should be reconciled before using this as a final decision?');
  }
  if (risks.some(risk => risk.id === 'high_ar_exposure' || risk.id === 'high_deferred_payment_share')) {
    questions.push('Which customers or stores should be reviewed first for collection risk?');
  }
  if (leadCause) {
    questions.push(`What changed inside ${leadCause.label} compared with the previous period or plan?`);
  }

  return questions.filter((question, index, values) => values.indexOf(question) === index).slice(0, 4);
}
