import type { AnalysisAction } from './analysis-opportunity-actions';
import type { ChartPreviewModel } from './chart-preview-model';
import type { BusinessFusionOverview } from './business-fusion-overview';
import { buildChartVariance, buildPlanVariance, buildRootCauses, canonicalChartKpis, chartDistributionKpis, dedupeKpis, formatNarrativeNumber, inferBusinessBrainIntent, kpiNarrativeValue, metricToKpi, pickMetrics, selectedAngleChartKpis } from './business-brain-analysis';
import { buildEvidence, buildMissingEvidence, buildNextQuestions, buildRecommendations, buildRisks, businessQuestionFor, readinessFor } from './business-brain-guidance';

export type BusinessBrainReadiness = 'ready' | 'partial' | 'blocked';
export type BusinessBrainIntent = 'money' | 'profitability' | 'product' | 'payment' | 'logistics' | 'operations' | 'general';

export interface BusinessBrainKpi {
  id: string;
  label: string;
  value?: number;
  previousValue?: number;
  currentValue?: number;
  delta?: number;
  deltaPercent?: number | null;
  source: string;
  confidence: number;
  formula?: string;
  sourceColumns?: string[];
}

export interface BusinessBrainRootCause {
  id: string;
  label: string;
  level?: string;
  dimension?: string;
  metricId?: string;
  value?: number;
  delta?: number;
  deltaPercent?: number | null;
  evidence: string[];
}

export interface BusinessBrainRisk {
  id: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  evidence: string[];
}

export interface BusinessBrainRecommendation {
  type: 'do_now' | 'investigate' | 'need_more_data';
  priority: 'low' | 'medium' | 'high';
  title: string;
  action: string;
}

export interface BusinessBrainMissingEvidence {
  id: string;
  label: string;
  neededFor: string;
  reason: string;
}

export interface BusinessBrainEvidence {
  id: string;
  type: 'kpi' | 'variance' | 'root_cause' | 'risk' | 'missing_evidence';
  label: string;
  source: string;
  details: string[];
  confidence?: number;
}

export interface BusinessBrainNarrative {
  headline: string;
  mainAnswer: string;
  businessQuestion: string;
  sections: Array<{ title: string; body: string; bullets: string[] }>;
}

export interface BusinessBrainBrief {
  angle: string;
  intent: BusinessBrainIntent;
  readiness: BusinessBrainReadiness;
  businessQuestion: string;
  dataCoverage: {
    recognized: string[];
    partial: string[];
    missing: BusinessBrainMissingEvidence[];
  };
  kpis: BusinessBrainKpi[];
  variance: BusinessBrainKpi[];
  rootCauses: BusinessBrainRootCause[];
  risks: BusinessBrainRisk[];
  recommendations: BusinessBrainRecommendation[];
  missingEvidence: BusinessBrainMissingEvidence[];
  nextQuestions: string[];
  evidence: BusinessBrainEvidence[];
  narrative: BusinessBrainNarrative;
}

export function createBusinessBrainBrief(input: {
  action: AnalysisAction;
  chartModel: ChartPreviewModel | null;
  overview?: BusinessFusionOverview;
}): BusinessBrainBrief {
  const { action, chartModel, overview } = input;
  const intent = inferBusinessBrainIntent(action, chartModel);
  const metrics = pickMetrics(overview, intent);
  const kpis = dedupeKpis([
    ...canonicalChartKpis(chartModel),
    ...selectedAngleChartKpis(chartModel, intent),
    ...chartDistributionKpis(chartModel, intent),
    ...metrics.map(metricToKpi)
  ]);
  const variance = dedupeKpis([
    ...buildPlanVariance(chartModel),
    ...buildChartVariance(chartModel),
    ...kpis.filter(kpi => kpi.delta !== undefined)
  ]);
  const rootCauses = buildRootCauses(overview, chartModel, intent);
  const missingEvidence = buildMissingEvidence({ action, chartModel, overview, intent });
  const risks = buildRisks(overview, intent, missingEvidence, kpis, variance);
  const recommendations = buildRecommendations(intent, missingEvidence, rootCauses, risks);
  const nextQuestions = buildNextQuestions({ intent, rootCauses, risks, missingEvidence });
  const evidence = buildEvidence({ kpis, variance, rootCauses, risks, missingEvidence });
  const readiness = readinessFor(kpis, rootCauses, missingEvidence);
  const businessQuestion = businessQuestionFor(intent, action);

  const leadKpi = kpis[0];
  const leadCause = rootCauses[0];
  const mainAnswer = leadKpi?.delta !== undefined
    ? `${leadKpi.label} moved by ${formatNarrativeNumber(leadKpi.delta)}. ${leadCause ? `The strongest visible driver is ${leadCause.label}.` : ''}`.trim()
    : leadKpi
      ? `${leadKpi.label} is ${kpiNarrativeValue(leadKpi)}. ${leadCause ? `The strongest visible driver is ${leadCause.label}.` : 'Use this KPI as the first reading for the selected angle.'}`.trim()
    : leadCause
      ? `${leadCause.label} is the strongest visible driver for this selected angle.`
      : readiness === 'blocked'
        ? 'LightBI found the angle, but there is not enough structured evidence to produce a safe BA answer yet.'
        : 'LightBI found directional evidence for this selected angle.';

  return {
    angle: action.opportunityName || action.label,
    intent,
    readiness,
    businessQuestion,
    dataCoverage: {
      recognized: [
        ...action.dimensions,
        ...action.measures,
        ...(chartModel?.xField ? [chartModel.xField] : []),
        ...(chartModel?.yField ? [chartModel.yField] : []),
        ...metrics.map(metric => metric.label)
      ].filter((value, index, values) => Boolean(value) && values.indexOf(value) === index),
      partial: missingEvidence.map(item => item.neededFor),
      missing: missingEvidence
    },
    kpis,
    variance,
    rootCauses,
    risks,
    recommendations,
    missingEvidence,
    nextQuestions,
    evidence,
    narrative: {
      headline: `${action.opportunityName || action.label} - ${readiness.toUpperCase()}`,
      businessQuestion,
      mainAnswer,
      sections: [
        {
          title: 'KPI',
          body: kpis.length > 0 ? 'LightBI found measurable evidence for this angle.' : 'No safe KPI was found for this angle yet.',
          bullets: kpis.slice(0, 5).map(kpi => `${kpi.label}: ${kpiNarrativeValue(kpi)}${kpi.delta !== undefined ? `, delta ${formatNarrativeNumber(kpi.delta)}` : ''}`)
        },
        {
          title: 'Variance',
          body: variance.length > 0 ? 'LightBI compared current and previous evidence where possible.' : 'No safe period or baseline comparison was available.',
          bullets: variance.slice(0, 5).map(kpi => `${kpi.label}: ${formatNarrativeNumber(kpi.previousValue)} -> ${formatNarrativeNumber(kpi.currentValue)}, delta ${formatNarrativeNumber(kpi.delta)}${kpi.deltaPercent !== undefined && kpi.deltaPercent !== null ? ` (${formatNarrativeNumber(kpi.deltaPercent, true)})` : ''}`)
        },
        {
          title: 'Root cause',
          body: rootCauses.length > 0 ? 'LightBI ranked the strongest available drivers across the available drill path.' : 'No driver ranking was available.',
          bullets: rootCauses.slice(0, 6).map(cause => `${cause.level ? `${cause.level}: ` : ''}${cause.label}${cause.value !== undefined ? ` (${formatNarrativeNumber(cause.value)})` : ''}${cause.delta !== undefined ? `, delta ${formatNarrativeNumber(cause.delta)}` : ''}`)
        },
        {
          title: 'Risk',
          body: risks.length > 0 ? 'LightBI detected risks that may affect the decision.' : 'No major business risk was generated for this angle.',
          bullets: risks.slice(0, 5).map(risk => `${risk.title}: ${risk.message}`)
        },
        {
          title: 'Recommendation',
          body: recommendations.length > 0 ? 'LightBI generated next actions from the available evidence.' : 'No recommendation can be made safely yet.',
          bullets: recommendations.slice(0, 5).map(recommendation => `${recommendation.title}: ${recommendation.action}`)
        },
        {
          title: 'Next question',
          body: nextQuestions.length > 0 ? 'LightBI suggests the next BA question to continue the investigation.' : 'No next question was generated yet.',
          bullets: nextQuestions
        },
        {
          title: 'Evidence',
          body: evidence.length > 0 ? 'LightBI kept the key evidence behind this answer for audit.' : 'No evidence bundle was generated yet.',
          bullets: evidence.slice(0, 8).map(item => `${item.label}: ${item.details.join('; ')}`)
        },
        {
          title: 'Missing evidence',
          body: missingEvidence.length > 0 ? 'The answer is useful directionally but not complete for final decision-making.' : 'No major missing evidence was detected for this selected angle.',
          bullets: missingEvidence.map(item => `${item.label}: ${item.reason}`)
        }
      ]
    }
  };
}
