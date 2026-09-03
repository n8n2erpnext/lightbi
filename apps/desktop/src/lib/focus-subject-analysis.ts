import type { AnalysisAction } from './analysis-opportunity-actions';
import type { BusinessSignal, DatasetUnderstandingResult, DomainId } from './understanding-next/contracts';
import { GOVERNED_METRIC_DEFINITIONS_V1 } from './understanding-core/governed-metric-policy';

export type FocusSubjectOption = {
  value: string;
  displayLabel: string;
  searchText: string;
};

export type FocusSubjectCandidate = {
  id: string;
  canonicalId: string;
  domain: DomainId;
  field: string;
  fieldLabel: string;
  labelField?: string;
  options: FocusSubjectOption[];
  confidence: number;
};

export type FocusSubjectSelection = {
  candidateId: string;
  canonicalId: string;
  domain: DomainId;
  field: string;
  value: string;
  displayLabel: string;
  labelField?: string;
  metricFields: string[];
  metricBindings?: Array<{ canonicalId: string; field: string }>;
  rankField?: string;
};

export type FocusMetricComparison = {
  field: string;
  canonicalId?: string;
  aggregation: 'SUM' | 'COUNT' | 'AVG';
  subjectValue: number;
  populationAverage: number;
  topAverage: number;
  bottomAverage: number;
  deltaFromAverage: number;
  percentile: number;
  populationCount: number;
};

export type FocusSubjectComparison = {
  subject: FocusSubjectSelection;
  populationRowCount: number;
  matchedSubjectRowCount: number;
  rankValue?: string;
  metrics: FocusMetricComparison[];
};

export type FocusSubjectInsight = {
  id: string;
  title: string;
  statement: string;
};

export type FocusSubjectNarrative = {
  headline: string;
  summary: string;
  insights: FocusSubjectInsight[];
  followUpQuestions: string[];
};

export type FocusPerspectiveCandidate = {
  perspectiveId: string;
  state: string;
  matchedSignalIds: string[];
};

export function resolveFocusAutoPerspectiveId(
  subject: FocusSubjectSelection | null | undefined,
  perspectives: FocusPerspectiveCandidate[],
): string | null {
  if (!subject) return null;
  return perspectives
    .filter(perspective => perspective.state === 'governed_action_available')
    .map(perspective => ({
      perspective,
      score: Number(perspective.matchedSignalIds.includes(subject.canonicalId)) * 3
        + Number(perspective.perspectiveId === subject.domain) * 2,
    }))
    .filter(entry => entry.score > 0)
    .sort((left, right) => right.score - left.score)[0]?.perspective.perspectiveId ?? null;
}

const ENTITY_DIMENSIONS = new Set([
  'employee', 'manager', 'person', 'salesperson', 'buyer', 'coach', 'team',
  'customer', 'product', 'sku', 'item', 'branch', 'store', 'warehouse',
  'supplier', 'vendor', 'project', 'asset', 'sensor', 'channel',
]);
const NEVER_FOCUS = new Set(['performance_rank', 'rank', 'ranking', 'status']);
const LABELISH_HEADER = /(name|label|description|title|manager|employee|customer|product|item|supplier|vendor|branch|warehouse|person|salesperson|buyer|coach|team|project|ten|tên|ho ten|họ tên)/i;
const IDENTIFIERISH_HEADER = /(^|[ _-])(id|code|no|number)($|[ _-])|uuid|guid|phone|postal|rank|ranking|xep hang|xếp hạng|msnv/i;
const TIMEISH_HEADER = /(^|[ _-])(date|day|month|year|period|ngay|ngày|thang|tháng|nam|năm|ky|kỳ)($|[ _-])/i;

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const raw = text(value).replace(/,/g, '');
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedField(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function rowValue(row: Record<string, unknown>, field: string | undefined): unknown {
  if (!field) return undefined;
  if (Object.prototype.hasOwnProperty.call(row, field)) return row[field];
  const wanted = normalizedField(field);
  const resolved = Object.keys(row).find(key => normalizedField(key) === wanted);
  return resolved ? row[resolved] : undefined;
}

function eligibleSignal(signal: BusinessSignal): boolean {
  if (signal.confidence < 0.55 || NEVER_FOCUS.has(signal.canonicalId)) return false;
  if (signal.role === 'identifier') return true;
  return signal.role === 'dimension' && ENTITY_DIMENSIONS.has(signal.canonicalId);
}

function companionScore(identity: BusinessSignal, candidate: BusinessSignal, rows: Record<string, unknown>[]): number {
  if (candidate.physicalColumn === identity.physicalColumn || candidate.role !== 'dimension' || NEVER_FOCUS.has(candidate.canonicalId)) return -1;
  const mapping = new Map<string, Set<string>>();
  let paired = 0;
  for (const row of rows) {
    const id = text(row[identity.physicalColumn]);
    const label = text(row[candidate.physicalColumn]);
    if (!id || !label || id === label) continue;
    paired += 1;
    const values = mapping.get(id) ?? new Set<string>();
    values.add(label);
    mapping.set(id, values);
  }
  if (mapping.size < 2 || paired < Math.min(3, Math.max(1, rows.length))) return -1;
  const unambiguous = [...mapping.values()].filter(values => values.size === 1).length;
  const consistency = unambiguous / mapping.size;
  if (consistency < 0.98) return -1;
  const identityValues = new Set(rows.map(row => text(row[identity.physicalColumn])).filter(Boolean));
  const coverage = identityValues.size ? mapping.size / identityValues.size : 0;
  if (coverage < 0.6) return -1;
  const distinctLabels = new Set([...mapping.values()].flatMap(values => [...values])).size;
  if (distinctLabels < 2) return -1;
  let score = consistency * 4 + coverage * 3;
  if (LABELISH_HEADER.test(candidate.physicalColumn)) score += 2;
  if (candidate.domain === identity.domain) score += 0.5;
  if (Math.abs(distinctLabels - mapping.size) <= Math.max(2, mapping.size * 0.1)) score += 1;
  return score;
}

function bestLabelSignal(identity: BusinessSignal, signals: BusinessSignal[], rows: Record<string, unknown>[]): BusinessSignal | undefined {
  return signals
    .map(signal => ({ signal, score: companionScore(identity, signal, rows) }))
    .filter(entry => entry.score >= 0)
    .sort((left, right) => right.score - left.score)[0]?.signal;
}

export function deriveFocusSubjectCandidates(
  understanding: DatasetUnderstandingResult | null | undefined,
  rows: Record<string, unknown>[],
): FocusSubjectCandidate[] {
  if (!understanding || rows.length === 0) return [];
  const signals = understanding.signals.filter(signal => rows.some(row => text(row[signal.physicalColumn])));
  const eligible = signals.filter(eligibleSignal);
  return eligible.map(signal => {
    const labelSignal = signal.role === 'identifier' ? bestLabelSignal(signal, signals, rows) : undefined;
    const optionMap = new Map<string, FocusSubjectOption>();
    for (const row of rows) {
      const value = text(row[signal.physicalColumn]);
      if (!value || optionMap.has(value)) continue;
      const label = labelSignal ? text(row[labelSignal.physicalColumn]) : '';
      const displayLabel = label && label !== value ? `${value} — ${label}` : value;
      optionMap.set(value, { value, displayLabel, searchText: `${value} ${label}`.trim().toLocaleLowerCase() });
    }
    return {
      id: `${signal.canonicalId}:${signal.physicalColumn}`,
      canonicalId: signal.canonicalId,
      domain: signal.domain,
      field: signal.physicalColumn,
      fieldLabel: signal.label,
      labelField: labelSignal?.physicalColumn,
      options: [...optionMap.values()].sort((a, b) => a.displayLabel.localeCompare(b.displayLabel, undefined, { numeric: true })),
      confidence: signal.confidence,
    };
  }).filter(candidate => candidate.options.length >= 2)
    .sort((a, b) => {
      const aIdentifier = understanding.signals.find(signal => signal.physicalColumn === a.field)?.role === 'identifier' ? 1 : 0;
      const bIdentifier = understanding.signals.find(signal => signal.physicalColumn === b.field)?.role === 'identifier' ? 1 : 0;
      return bIdentifier - aIdentifier || b.confidence - a.confidence || a.fieldLabel.localeCompare(b.fieldLabel);
    });
}

export function createFocusSubjectSelection(
  candidate: FocusSubjectCandidate,
  option: FocusSubjectOption,
  understanding: DatasetUnderstandingResult,
): FocusSubjectSelection {
  const metricSignals = understanding.signals.filter(signal => signal.role === 'measure' && signal.confidence >= 0.55);
  const metricFields = metricSignals.map(signal => signal.physicalColumn);
  const rankField = understanding.signals.find(signal => signal.canonicalId === 'performance_rank')?.physicalColumn;
  return {
    candidateId: candidate.id,
    canonicalId: candidate.canonicalId,
    domain: candidate.domain,
    field: candidate.field,
    value: option.value,
    displayLabel: option.displayLabel,
    labelField: candidate.labelField,
    metricFields: [...new Set(metricFields)],
    metricBindings: metricSignals.map(signal => ({ canonicalId: signal.canonicalId, field: signal.physicalColumn })),
    rankField,
  };
}

export function searchFocusSubjectOptions(candidate: FocusSubjectCandidate, query: string, limit = 30): FocusSubjectOption[] {
  const normalized = query.trim().toLocaleLowerCase();
  const source = normalized ? candidate.options.filter(option => option.searchText.includes(normalized)) : candidate.options;
  return source.slice(0, Math.max(1, limit));
}

function actionMeasureField(subject: FocusSubjectSelection, measure: string): string | null {
  const normalizedMeasure = normalizedField(measure).replace(/[^a-z0-9_]+/g, '_');
  const binding = subject.metricBindings?.find(item => {
    const canonical = normalizedField(item.canonicalId).replace(/[^a-z0-9_]+/g, '_');
    return normalizedMeasure === canonical
      || normalizedMeasure.endsWith(`_${canonical}`)
      || canonical.endsWith(`_${normalizedMeasure}`);
  });
  return binding?.field ?? null;
}

function governedAggregation(measure: string | undefined): 'SUM' | 'COUNT' | 'AVG' | null {
  if (!measure) return null;
  const definition = GOVERNED_METRIC_DEFINITIONS_V1.find(item => item.metricId === measure);
  if (!definition) return null;
  if (definition.aggregationOperator === 'sum') return 'SUM';
  if (definition.aggregationOperator === 'average') return 'AVG';
  if (definition.aggregationOperator === 'count_source_rows') return 'COUNT';
  return null;
}

type ComparisonMetricCandidate = {
  field: string;
  canonicalId?: string;
  aggregation: 'SUM' | 'COUNT' | 'AVG';
};

function comparisonMetricFields(rows: Record<string, unknown>[], subject: FocusSubjectSelection, action?: AnalysisAction): ComparisonMetricCandidate[] {
  const descriptors: ComparisonMetricCandidate[] = [];
  const push = (field: string, canonicalId: string | undefined, aggregation: 'SUM' | 'COUNT' | 'AVG') => {
    const normalized = normalizedField(field);
    const semanticKey = canonicalId ? `semantic:${canonicalId}` : `field:${normalized}`;
    if (descriptors.some(item => (item.canonicalId ? `semantic:${item.canonicalId}` : `field:${normalizedField(item.field)}`) === semanticKey)) return;
    if (descriptors.some(item => normalizedField(item.field) === normalized)) return;
    descriptors.push({ field, canonicalId, aggregation });
  };

  for (const measure of action?.measures ?? []) {
    const field = actionMeasureField(subject, measure) ?? measure;
    push(field, measure, governedAggregation(measure)
      ?? action?.measureAggregations?.[measure]
      ?? action?.measureAggregations?.[field]
      ?? 'SUM');
  }
  for (const binding of subject.metricBindings ?? []) push(binding.field, binding.canonicalId, 'AVG');
  for (const field of subject.metricFields) push(field, undefined, 'AVG');
  for (const field of [...new Set(rows.slice(0, 1000).flatMap(row => Object.keys(row)))]) push(field, undefined, 'AVG');

  return descriptors.filter(candidate => {
    const { field } = candidate;
    if (normalizedField(field) === normalizedField(subject.field)
      || normalizedField(field) === normalizedField(subject.labelField ?? '')
      || normalizedField(field) === normalizedField(subject.rankField ?? '')) return false;
    if (IDENTIFIERISH_HEADER.test(field) || TIMEISH_HEADER.test(field)) return false;
    const values = rows.slice(0, 5000).map(row => rowValue(row, field)).filter(value => text(value));
    if (values.length < Math.min(3, rows.length)) return false;
    return values.filter(value => numberValue(value) !== null).length / values.length >= 0.8;
  }).slice(0, 6);
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function aggregate(values: number[], aggregation: 'SUM' | 'COUNT' | 'AVG'): number {
  if (aggregation === 'COUNT') return values.length;
  if (aggregation === 'SUM') return values.reduce((sum, value) => sum + value, 0);
  return average(values);
}

export function buildFocusSubjectComparison(
  rows: Record<string, unknown>[],
  subject: FocusSubjectSelection,
  action?: AnalysisAction,
  topN = 10,
): FocusSubjectComparison | null {
  if (!rows.length) return null;
  const subjectRows = rows.filter(row => text(rowValue(row, subject.field)) === subject.value);
  if (!subjectRows.length) return null;
  const metrics: FocusMetricComparison[] = [];
  for (const metricCandidate of comparisonMetricFields(rows, subject, action)) {
    const { field, canonicalId, aggregation } = metricCandidate;
    const grouped = new Map<string, number[]>();
    for (const row of rows) {
      const entity = text(rowValue(row, subject.field));
      const value = numberValue(rowValue(row, field));
      if (!entity || value === null) continue;
      const values = grouped.get(entity) ?? [];
      values.push(value);
      grouped.set(entity, values);
    }
    const subjectValues = grouped.get(subject.value) ?? [];
    const population = [...grouped.values()].filter(values => values.length > 0).map(values => aggregate(values, aggregation));
    if (population.length < 2 || subjectValues.length === 0) continue;
    const subjectValue = aggregate(subjectValues, aggregation);
    const sorted = [...population].sort((a, b) => b - a);
    const n = Math.min(Math.max(1, topN), sorted.length);
    const populationAverage = average(population);
    const lessOrEqual = population.filter(value => value <= subjectValue).length;
    metrics.push({
      field, canonicalId, aggregation,
      subjectValue,
      populationAverage,
      topAverage: average(sorted.slice(0, n)),
      bottomAverage: average(sorted.slice(-n)),
      deltaFromAverage: subjectValue - populationAverage,
      percentile: (lessOrEqual / population.length) * 100,
      populationCount: population.length,
    });
  }
  const rankValue = subject.rankField ? text(rowValue(subjectRows[0] ?? {}, subject.rankField)) || undefined : undefined;
  return {
    subject,
    populationRowCount: rows.length,
    matchedSubjectRowCount: subjectRows.length,
    rankValue,
    metrics,
  };
}

function signed(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded >= 0 ? '+' : ''}${rounded}`;
}

export function deriveFocusSubjectNarrative(comparison: FocusSubjectComparison): FocusSubjectNarrative {
  const primary = comparison.metrics[0];
  const subject = comparison.subject.displayLabel;
  if (!primary) return {
    headline: `Analysis around ${subject}`,
    summary: 'The focus is verified in the full source, but no governed numeric comparison is available for this action.',
    insights: [],
    followUpQuestions: [`What other governed measures are available for ${subject}?`],
  };
  const metricLabel = primary.field;
  const topGap = primary.subjectValue - primary.topAverage;
  const bottomGap = primary.subjectValue - primary.bottomAverage;
  const secondary = comparison.metrics.slice(1)
    .sort((a, b) => Math.abs(b.percentile - 50) - Math.abs(a.percentile - 50))[0];
  const insights: FocusSubjectInsight[] = [
    {
      id: 'position',
      title: 'Position in the population',
      statement: `${subject} is at the ${Math.round(primary.percentile * 10) / 10}th percentile for ${metricLabel}, ${signed(primary.deltaFromAverage)} versus the population average.`,
    },
    {
      id: 'cohort-gap',
      title: 'Distance to comparison cohorts',
      statement: `${subject} is ${signed(topGap)} versus the Top 10 average and ${signed(bottomGap)} versus the Bottom 10 average for ${metricLabel}.`,
    },
  ];
  if (secondary) insights.push({
    id: 'secondary-signal',
    title: 'Another signal that stands out',
    statement: `${secondary.field} sits at the ${Math.round(secondary.percentile * 10) / 10}th percentile (${signed(secondary.deltaFromAverage)} versus average).`,
  });
  const rank = Number(String(comparison.rankValue ?? '').replace(/,/g, ''));
  if (Number.isFinite(rank) && rank > 0 && primary.populationCount > 1) insights.push({
    id: 'rank-context',
    title: 'Rank and selected metric tell different stories',
    statement: `${subject} has recorded rank ${comparison.rankValue}, while ${metricLabel} is at the ${Math.round(primary.percentile * 10) / 10}th percentile. The rank likely reflects additional inputs beyond this metric, so LightBI should inspect those drivers rather than infer causality.`,
  });
  return {
    headline: `${subject} in context`,
    summary: `The full population remains the benchmark; every readout below is anchored to ${subject}.`,
    insights,
    followUpQuestions: [
      `Which governed metrics differ most for ${subject} versus the population?`,
      `How far is ${subject} from the Top 10 and Bottom 10 cohorts?`,
      comparison.rankValue ? `Which available signals may help explain the recorded rank ${comparison.rankValue}?` : `Which comparison cohort is most relevant for ${subject}?`,
    ],
  };
}
