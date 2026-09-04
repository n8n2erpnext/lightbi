import type { AnalysisAction } from "./analysis-opportunity-actions";
import { GOVERNED_METRIC_DEFINITIONS_V1 } from "./understanding-core/governed-metric-policy";
import type { FocusSubjectSelection } from "./focus-subject-candidates";
import type { BAAnalysisAuthorityContextV1 } from "./understanding-core/ba-analysis-authority-context";

export {
  createFocusSubjectSelection,
  deriveFocusSubjectCandidates,
  resolveFocusAutoPerspectiveId,
  searchFocusSubjectOptions,
} from "./focus-subject-candidates";
export type {
  FocusPerspectiveCandidate,
  FocusSubjectCandidate,
  FocusSubjectOption,
  FocusSubjectSelection,
} from "./focus-subject-candidates";

export type FocusMetricComparison = {
  field: string;
  canonicalId?: string;
  sourceField?: string;
  identityField?: string;
  aggregationAuthority:
    "governed_metric" | "action_contract" | "semantic_signal_policy" | "stable_semantic_signal";
  aggregation: "SUM" | "COUNT" | "AVG";
  subjectValue: number;
  populationAverage: number;
  topAverage: number;
  bottomAverage: number;
  deltaFromAverage: number;
  percentile: number;
  populationCount: number;
  cohortSize: number;
};

export type FocusTrendComparison = {
  field: string;
  periodCount: number;
  firstPeriod: string;
  lastPeriod: string;
  subjectFirst: number;
  subjectLast: number;
  subjectChangePct: number | null;
  populationFirst: number;
  populationLast: number;
  populationChangePct: number | null;
  peakPeriod: string;
  peakValue: number;
};

export type FocusDistributionGroup = {
  label: string;
  subjectValue: number;
  subjectShare: number;
  populationValue: number;
  populationShare: number;
  deltaSharePctPoints: number;
};

export type FocusDistributionComparison = {
  field: string;
  groups: FocusDistributionGroup[];
};

export type FocusDriverBreakdown = {
  field: string;
  aggregation: "SUM" | "COUNT" | "AVG";
  groups: Array<{ label: string; value: number; share?: number }>;
};

export type FocusSubjectComparison = {
  subject: FocusSubjectSelection;
  analysisAuthority?: BAAnalysisAuthorityContextV1;
  scope?: { kind: "full_source" | "selected_rows"; isTruncated?: boolean };
  populationRowCount: number;
  matchedSubjectRowCount: number;
  rankValue?: string;
  metrics: FocusMetricComparison[];
  trend?: FocusTrendComparison;
  distribution?: FocusDistributionComparison;
  drivers: FocusDriverBreakdown[];
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

const IDENTIFIERISH_HEADER =
  /(^|[^a-z0-9])(id|code|no|number|stt)([^a-z0-9]|$)|uuid|guid|phone|postal|row[^a-z0-9]*id|record[^a-z0-9]*id|rank|ranking|xep hang|xếp hạng|msnv/i;
const TIMEISH_HEADER =
  /(^|[ _-])(date|day|month|year|period|ngay|ngày|thang|tháng|nam|năm|ky|kỳ)($|[ _-])/i;
const MEASUREISH_HEADER =
  /(amount|total|revenue|price|cost|margin|profit|qty|quantity|discount|fee|tax|score|rate|percent|pct|balance|value|doanh thu|giá|chi phí|phí|thuế|điểm|tổng)/i;

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = text(value).replace(/,/g, "");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedField(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function rowValue(
  row: Record<string, unknown>,
  field: string | undefined,
): unknown {
  if (!field) return undefined;
  if (Object.prototype.hasOwnProperty.call(row, field)) return row[field];
  const wanted = normalizedField(field);
  const resolved = Object.keys(row).find((key) => normalizedField(key) === wanted);
  return resolved ? row[resolved] : undefined;
}

function normalizedSemanticId(value: string): string {
  return normalizedField(value).replace(/[^a-z0-9_]+/g, "_");
}

function semanticIdsMatch(left: string, right: string): boolean {
  const a = normalizedSemanticId(left);
  const b = normalizedSemanticId(right);
  return a === b || a.endsWith(`_${b}`) || b.endsWith(`_${a}`);
}

function actionMeasureField(
  subject: FocusSubjectSelection,
  measure: string,
): string | null {
  return (
    subject.metricBindings?.find((item) =>
      semanticIdsMatch(measure, item.canonicalId),
    )?.field ??
    subject.metricBindings?.find((item) =>
      normalizedField(item.field) === normalizedField(measure),
    )?.field ??
    null
  );
}

function actionDimensionField(
  subject: FocusSubjectSelection,
  dimension: string | undefined,
): string | null {
  if (!dimension) return null;
  return (
    subject.dimensionBindings?.find((item) =>
      semanticIdsMatch(dimension, item.canonicalId),
    )?.field ??
    subject.dimensionBindings?.find(
      (item) => normalizedField(item.field) === normalizedField(dimension),
    )?.field ??
    null
  );
}

const GOVERNED_METRIC_ALIASES: Record<string, string> = {
  record_count: "source_record_count",
};

// Exact semantic context metrics may supplement the selected action only when
// Understanding supplied the canonical binding and the aggregation is explicit here.
// This is deliberately narrower than guessing AVG for arbitrary numeric fields.
const FOCUS_CONTEXT_AGGREGATIONS: Record<string, "AVG"> = {
  waiting_time: "AVG",
};

function governedDefinition(measure: string | undefined) {
  if (!measure) return undefined;
  const metricId = GOVERNED_METRIC_ALIASES[measure] ?? measure;
  return GOVERNED_METRIC_DEFINITIONS_V1.find(
    (item) => item.metricId === metricId,
  );
}

function governedAggregation(
  measure: string | undefined,
): "SUM" | "COUNT" | "AVG" | null {
  const definition = governedDefinition(measure);
  if (!definition) return null;
  if (definition.aggregationOperator === "sum") return "SUM";
  if (definition.aggregationOperator === "average") return "AVG";
  if (
    definition.aggregationOperator === "count_source_rows" ||
    definition.aggregationOperator === "count_governed_identity"
  )
    return "COUNT";
  return null;
}

type ComparisonMetricCandidate = {
  field: string;
  canonicalId?: string;
  sourceField?: string;
  aggregation: "SUM" | "COUNT" | "AVG";
  aggregationAuthority:
    "governed_metric" | "action_contract" | "semantic_signal_policy" | "stable_semantic_signal";
  countMode?: "rows" | "distinct_identity";
  identityField?: string;
};

function governedCountIdentityField(
  subject: FocusSubjectSelection,
  measure: string,
): string | null {
  const definition = governedDefinition(measure);
  const semanticSignals =
    definition?.requirements.flatMap(
      (requirement) => requirement.semanticSignals,
    ) ?? [];
  for (const semanticId of semanticSignals) {
    const binding = subject.dimensionBindings?.find(
      (item) =>
        item.role === "identifier" &&
        semanticIdsMatch(item.canonicalId, semanticId),
    );
    if (binding) return binding.field;
  }
  return null;
}

function isEntityStableMetric(
  rows: Record<string, unknown>[],
  subjectField: string,
  metricField: string,
): boolean {
  const valuesByEntity = new Map<string, Set<number>>();
  for (const row of rows.slice(0, 20_000)) {
    const entity = text(rowValue(row, subjectField));
    const value = numberValue(rowValue(row, metricField));
    if (!entity || value === null) continue;
    const values = valuesByEntity.get(entity) ?? new Set<number>();
    values.add(value);
    if (values.size > 1) return false;
    valuesByEntity.set(entity, values);
  }
  return valuesByEntity.size >= 2;
}

function comparisonMetricFields(
  rows: Record<string, unknown>[],
  subject: FocusSubjectSelection,
  action?: AnalysisAction,
): ComparisonMetricCandidate[] {
  const descriptors: ComparisonMetricCandidate[] = [];
  const push = (candidate: ComparisonMetricCandidate) => {
    const normalized = normalizedField(candidate.field);
    const semanticKey = candidate.canonicalId
      ? `semantic:${candidate.canonicalId}`
      : `field:${normalized}`;
    if (
      descriptors.some(
        (item) =>
          (item.canonicalId
            ? `semantic:${item.canonicalId}`
            : `field:${normalizedField(item.field)}`) === semanticKey,
      )
    )
      return;
    if (descriptors.some((item) => normalizedField(item.field) === normalized))
      return;
    descriptors.push(candidate);
  };

  const actionMeasures = action?.measures ?? [];
  for (const measure of actionMeasures) {
    const definition = governedDefinition(measure);
    if (definition?.aggregationOperator === "count_governed_identity") {
      const identityField = governedCountIdentityField(subject, measure);
      if (identityField)
        push({
          field: definition.businessName,
          canonicalId: measure,
          sourceField: identityField,
          aggregation: "COUNT",
          aggregationAuthority: "governed_metric",
          countMode: "distinct_identity",
          identityField,
        });
      continue;
    }
    if (definition?.aggregationOperator === "count_source_rows") {
      push({
        field: definition.businessName,
        canonicalId: measure,
        aggregation: "COUNT",
        aggregationAuthority: "governed_metric",
        countMode: "rows",
      });
      continue;
    }
    const field = actionMeasureField(subject, measure);
    if (!field) continue;
    const governed = governedAggregation(measure);
    const contracted =
      action?.measureAggregations?.[measure] ??
      action?.measureAggregations?.[field];
    if (!governed && !contracted) continue;
    push({
      field,
      sourceField: field,
      canonicalId: measure,
      aggregation: governed ?? contracted!,
      aggregationAuthority: governed ? "governed_metric" : "action_contract",
    });
  }

  // If an action explicitly asks for measures but none can be bound to exact source evidence,
  // fail closed. Never substitute a nearby numeric field merely to keep the Focus card populated.
  if (actionMeasures.length > 0 && descriptors.length === 0) return [];

  // Secondary metrics are descriptive context only when Understanding supplied the exact field
  // and the value is stable within each entity. This makes AVG aggregation invariant to repeated rows.
  for (const binding of subject.metricBindings ?? []) {
    const governed = governedAggregation(binding.canonicalId);
    if (governed) {
      push({
        field: binding.field,
        sourceField: binding.field,
        canonicalId: binding.canonicalId,
        aggregation: governed,
        aggregationAuthority: "governed_metric",
      });
      continue;
    }
    const semanticAggregation = FOCUS_CONTEXT_AGGREGATIONS[binding.canonicalId];
    if (semanticAggregation) {
      push({
        field: binding.field,
        sourceField: binding.field,
        canonicalId: binding.canonicalId,
        aggregation: semanticAggregation,
        aggregationAuthority: "semantic_signal_policy",
      });
      continue;
    }
    if (!isEntityStableMetric(rows, subject.field, binding.field)) continue;
    push({
      field: binding.field,
      sourceField: binding.field,
      canonicalId: binding.canonicalId,
      aggregation: "AVG",
      aggregationAuthority: "stable_semantic_signal",
    });
  }

  return descriptors
    .filter((candidate) => {
      if (candidate.countMode) return true;
      const { field } = candidate;
      if (
        normalizedField(field) === normalizedField(subject.field) ||
        normalizedField(field) === normalizedField(subject.labelField ?? "") ||
        normalizedField(field) === normalizedField(subject.rankField ?? "")
      )
        return false;
      if (IDENTIFIERISH_HEADER.test(field) || TIMEISH_HEADER.test(field))
        return false;
      const values = rows
        .slice(0, 5000)
        .map((row) => rowValue(row, field))
        .filter((value) => text(value));
      if (values.length < Math.min(3, rows.length)) return false;
      return (
        values.filter((value) => numberValue(value) !== null).length /
          values.length >=
        0.8
      );
    })
    .slice(0, 6);
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function aggregate(
  values: number[],
  aggregation: "SUM" | "COUNT" | "AVG",
): number {
  if (aggregation === "COUNT") return values.length;
  if (aggregation === "SUM")
    return values.reduce((sum, value) => sum + value, 0);
  return average(values);
}

function aggregateCandidateRows(
  rows: Record<string, unknown>[],
  candidate: ComparisonMetricCandidate,
): number | null {
  if (candidate.countMode === "rows") return rows.length;
  if (candidate.countMode === "distinct_identity") {
    const values = rows
      .map((row) => text(rowValue(row, candidate.identityField)))
      .filter(Boolean);
    return new Set(values).size;
  }
  const values = rows
    .map((row) => numberValue(rowValue(row, candidate.field)))
    .filter((value): value is number => value !== null);
  return values.length ? aggregate(values, candidate.aggregation) : null;
}

function periodBucket(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const iso = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const numeric = numberValue(value);
  if (numeric !== null && numeric >= 20_000 && numeric <= 80_000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return new Date(excelEpoch + Math.floor(numeric) * 86_400_000)
      .toISOString()
      .slice(0, 10);
  }
  if (numeric !== null && numeric >= 946_684_800 && numeric <= 4_102_444_800) {
    return new Date(numeric * 1000).toISOString().slice(0, 10);
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.toISOString().slice(0, 10);
}

function percentChange(first: number, last: number): number | null {
  return Math.abs(first) < 1e-12
    ? null
    : ((last - first) / Math.abs(first)) * 100;
}

function buildFocusTrend(
  rows: Record<string, unknown>[],
  subject: FocusSubjectSelection,
  action: AnalysisAction | undefined,
  metric: ComparisonMetricCandidate,
): FocusTrendComparison | undefined {
  const actionTimeField = action?.dimensions
    .map((dimension) => actionDimensionField(subject, dimension))
    .find((field) => field && TIMEISH_HEADER.test(field));
  const timeField =
    actionTimeField ??
    subject.dimensionBindings?.find((binding) => binding.role === "time")
      ?.field ??
    subject.dimensionBindings?.find((binding) =>
      TIMEISH_HEADER.test(binding.field),
    )?.field;
  if (!timeField) return undefined;

  const byPeriodEntity = new Map<
    string,
    Map<string, Record<string, unknown>[]>
  >();
  for (const row of rows) {
    const period = periodBucket(rowValue(row, timeField));
    const entity = text(rowValue(row, subject.field));
    if (!period || !entity) continue;
    const byEntity =
      byPeriodEntity.get(period) ??
      new Map<string, Record<string, unknown>[]>();
    const entityRows = byEntity.get(entity) ?? [];
    entityRows.push(row);
    byEntity.set(entity, entityRows);
    byPeriodEntity.set(period, byEntity);
  }
  const periods = [...byPeriodEntity.keys()]
    .sort()
    .filter((period) => byPeriodEntity.get(period)?.has(subject.value));
  if (periods.length < 2) return undefined;
  const read = (period: string, entity: string) =>
    aggregateCandidateRows(
      byPeriodEntity.get(period)?.get(entity) ?? [],
      metric,
    );
  const populationAverage = (period: string) => {
    const values = [...(byPeriodEntity.get(period)?.values() ?? [])]
      .map((entityRows) => aggregateCandidateRows(entityRows, metric))
      .filter((value): value is number => value !== null);
    return values.length ? average(values) : 0;
  };
  const firstPeriod = periods[0];
  const lastPeriod = periods[periods.length - 1];
  const subjectFirst = read(firstPeriod, subject.value) ?? 0;
  const subjectLast = read(lastPeriod, subject.value) ?? 0;
  const subjectSeries = periods.map((period) => ({
    period,
    value: read(period, subject.value) ?? 0,
  }));
  const peak = [...subjectSeries].sort((a, b) => b.value - a.value)[0];
  const populationFirst = populationAverage(firstPeriod);
  const populationLast = populationAverage(lastPeriod);
  return {
    field: timeField,
    periodCount: periods.length,
    firstPeriod,
    lastPeriod,
    subjectFirst,
    subjectLast,
    subjectChangePct: percentChange(subjectFirst, subjectLast),
    populationFirst,
    populationLast,
    populationChangePct: percentChange(populationFirst, populationLast),
    peakPeriod: peak.period,
    peakValue: peak.value,
  };
}

function identityPartitionsByField(
  rows: Record<string, unknown>[],
  identityField: string,
  groupField: string,
): boolean {
  const groupsByIdentity = new Map<string, Set<string>>();
  for (const row of rows) {
    const identity = text(rowValue(row, identityField));
    const group = text(rowValue(row, groupField));
    if (!identity || !group) continue;
    const groups = groupsByIdentity.get(identity) ?? new Set<string>();
    groups.add(group);
    if (groups.size > 1) return false;
    groupsByIdentity.set(identity, groups);
  }
  return groupsByIdentity.size > 0;
}

function buildFocusDistribution(
  rows: Record<string, unknown>[],
  subject: FocusSubjectSelection,
  action: AnalysisAction | undefined,
  metric: ComparisonMetricCandidate,
): FocusDistributionComparison | undefined {
  if (
    action?.actionType !== "distribution" &&
    action?.actionType !== "group_by"
  )
    return undefined;
  if (metric.aggregation === "AVG") return undefined;
  const field =
    actionDimensionField(subject, action.dimensions[0]) ??
    action?.dimensions[0];
  if (!field || normalizedField(field) === normalizedField(subject.field))
    return undefined;
  if (
    metric.countMode === "distinct_identity" &&
    metric.identityField &&
    !identityPartitionsByField(rows, metric.identityField, field)
  )
    return undefined;
  const subjectRows = rows.filter(
    (row) => text(rowValue(row, subject.field)) === subject.value,
  );
  const subjectTotal = aggregateCandidateRows(subjectRows, metric) ?? 0;
  const populationTotal = aggregateCandidateRows(rows, metric) ?? 0;
  if (subjectTotal <= 0 || populationTotal <= 0) return undefined;
  const labels = [
    ...new Set(rows.map((row) => text(rowValue(row, field))).filter(Boolean)),
  ];
  const groups = labels
    .map((label) => {
      const subjectValue =
        aggregateCandidateRows(
          subjectRows.filter((row) => text(rowValue(row, field)) === label),
          metric,
        ) ?? 0;
      const populationValue =
        aggregateCandidateRows(
          rows.filter((row) => text(rowValue(row, field)) === label),
          metric,
        ) ?? 0;
      const subjectShare = subjectValue / subjectTotal;
      const populationShare = populationValue / populationTotal;
      return {
        label,
        subjectValue,
        subjectShare,
        populationValue,
        populationShare,
        deltaSharePctPoints: (subjectShare - populationShare) * 100,
      };
    })
    .filter((group) => group.subjectValue > 0 || group.populationValue > 0)
    .sort((a, b) => b.subjectValue - a.subjectValue)
    .slice(0, 12);
  return groups.length ? { field, groups } : undefined;
}

const DRIVER_PRIORITY = [
  "category",
  "product",
  "salesperson",
  "payment",
  "status",
  "on_time_status",
  "load_status",
  "service_group",
  "current_location",
  "destination_location",
  "carrier",
  "warehouse",
  "branch",
  "route",
  "driver",
  "vehicle",
  "brand",
  "team",
  "manager",
  "item_type",
];

function driverPriority(canonicalId: string): number {
  const normalized = normalizedSemanticId(canonicalId);
  const index = DRIVER_PRIORITY.findIndex((token) =>
    normalized.includes(token),
  );
  return index < 0 ? DRIVER_PRIORITY.length : index;
}

function buildFocusDrivers(
  rows: Record<string, unknown>[],
  subject: FocusSubjectSelection,
  metric: ComparisonMetricCandidate,
): FocusDriverBreakdown[] {
  const subjectRows = rows.filter(
    (row) => text(rowValue(row, subject.field)) === subject.value,
  );
  const bindings = (subject.dimensionBindings ?? [])
    .filter(
      (binding) => binding.role === "dimension" || binding.role === "status",
    )
    .filter(
      (binding) =>
        normalizedField(binding.field) !== normalizedField(subject.field),
    )
    .filter(
      (binding) =>
        !TIMEISH_HEADER.test(binding.field) &&
        !MEASUREISH_HEADER.test(binding.field) &&
        !IDENTIFIERISH_HEADER.test(binding.field),
    )
    .filter(
      (binding) =>
        metric.countMode !== "distinct_identity" ||
        !metric.identityField ||
        identityPartitionsByField(
          subjectRows,
          metric.identityField,
          binding.field,
        ),
    )
    .filter(
      (binding, index, all) =>
        all.findIndex(
          (other) =>
            normalizedField(other.field) === normalizedField(binding.field),
        ) === index,
    )
    .map((binding) => ({
      binding,
      distinct: new Set(
        subjectRows
          .map((row) => text(rowValue(row, binding.field)))
          .filter(Boolean),
      ).size,
    }))
    .filter((entry) => entry.distinct >= 2 && entry.distinct <= 60)
    .sort(
      (a, b) =>
        driverPriority(a.binding.canonicalId) -
          driverPriority(b.binding.canonicalId) || a.distinct - b.distinct,
    )
    .slice(0, 5);

  const total = aggregateCandidateRows(subjectRows, metric) ?? 0;
  return bindings
    .map(({ binding }) => {
      const labels = [
        ...new Set(
          subjectRows
            .map((row) => text(rowValue(row, binding.field)))
            .filter(Boolean),
        ),
      ];
      const groups = labels
        .map((label) => {
          const value =
            aggregateCandidateRows(
              subjectRows.filter(
                (row) => text(rowValue(row, binding.field)) === label,
              ),
              metric,
            ) ?? 0;
          return {
            label,
            value,
            ...(metric.aggregation !== "AVG" && total > 0
              ? { share: value / total }
              : {}),
          };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      return { field: binding.field, aggregation: metric.aggregation, groups };
    })
    .filter((item) => item.groups.length >= 2);
}

export function buildFocusSubjectComparison(
  rows: Record<string, unknown>[],
  subject: FocusSubjectSelection,
  action?: AnalysisAction,
  topN = 10,
  scope: FocusSubjectComparison["scope"] = {
    kind: "full_source",
    isTruncated: false,
  },
  analysisAuthority: BAAnalysisAuthorityContextV1 | null = null,
): FocusSubjectComparison | null {
  if (!rows.length) return null;
  const subjectRows = rows.filter(
    (row) => text(rowValue(row, subject.field)) === subject.value,
  );
  if (!subjectRows.length) return null;
  const metricCandidates = comparisonMetricFields(rows, subject, action);
  const entityRows = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const entity = text(rowValue(row, subject.field));
    if (!entity) continue;
    const bucket = entityRows.get(entity) ?? [];
    bucket.push(row);
    entityRows.set(entity, bucket);
  }

  const metrics: FocusMetricComparison[] = [];
  for (const metricCandidate of metricCandidates) {
    const population = [...entityRows.values()]
      .map((group) => aggregateCandidateRows(group, metricCandidate))
      .filter((value): value is number => value !== null);
    const subjectValue = aggregateCandidateRows(
      entityRows.get(subject.value) ?? [],
      metricCandidate,
    );
    if (population.length < 2 || subjectValue === null) continue;
    const sorted = [...population].sort((a, b) => b - a);
    const n = Math.min(
      Math.max(1, topN),
      Math.max(1, Math.floor(sorted.length / 2)),
    );
    const populationAverage = average(population);
    const lessOrEqual = population.filter(
      (value) => value <= subjectValue,
    ).length;
    metrics.push({
      field: metricCandidate.field,
      canonicalId: metricCandidate.canonicalId,
      sourceField: metricCandidate.sourceField,
      identityField: metricCandidate.identityField,
      aggregationAuthority: metricCandidate.aggregationAuthority,
      aggregation: metricCandidate.aggregation,
      subjectValue,
      populationAverage,
      topAverage: average(sorted.slice(0, n)),
      bottomAverage: average(sorted.slice(-n)),
      deltaFromAverage: subjectValue - populationAverage,
      percentile: (lessOrEqual / population.length) * 100,
      populationCount: population.length,
      cohortSize: n,
    });
  }
  const rankValue = subject.rankField
    ? text(rowValue(subjectRows[0] ?? {}, subject.rankField)) || undefined
    : undefined;
  const primary = metrics[0];
  const primaryCandidate = primary
    ? (metricCandidates.find(
        (candidate) =>
          candidate.canonicalId &&
          candidate.canonicalId === primary.canonicalId,
      ) ??
      metricCandidates.find(
        (candidate) =>
          normalizedField(candidate.field) === normalizedField(primary.field),
      ))
    : undefined;
  return {
    subject,
    ...(analysisAuthority ? { analysisAuthority } : {}),
    scope,
    populationRowCount: rows.length,
    matchedSubjectRowCount: subjectRows.length,
    rankValue,
    metrics,
    trend: primaryCandidate
      ? buildFocusTrend(rows, subject, action, primaryCandidate)
      : undefined,
    distribution: primaryCandidate
      ? buildFocusDistribution(rows, subject, action, primaryCandidate)
      : undefined,
    drivers: primaryCandidate
      ? buildFocusDrivers(rows, subject, primaryCandidate)
      : [],
  };
}

function signed(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return `${rounded >= 0 ? "+" : ""}${rounded}`;
}

export function deriveFocusSubjectNarrative(
  comparison: FocusSubjectComparison,
): FocusSubjectNarrative {
  const primary = comparison.metrics[0];
  const subject = comparison.subject.displayLabel;
  const selectedScope = comparison.scope?.kind === "selected_rows";
  if (!primary)
    return {
      headline: `Analysis around ${subject}`,
      summary: selectedScope
        ? `This readout is bounded to the selected Step 2 rows${comparison.scope?.isTruncated ? " retrieved within the drill-through limit" : ""}; no governed numeric peer comparison is available inside this selected scope.`
        : "The focus is verified in the full source, but no governed numeric comparison is available for this action.",
      insights: [],
      followUpQuestions: [
        `What other governed measures are available for ${subject}?`,
      ],
    };
  const metricLabel = primary.field;
  const topGap = primary.subjectValue - primary.topAverage;
  const bottomGap = primary.subjectValue - primary.bottomAverage;
  const cohortLabel = `${primary.cohortSize}`;
  const secondary = comparison.metrics
    .slice(1)
    .sort(
      (a, b) => Math.abs(b.percentile - 50) - Math.abs(a.percentile - 50),
    )[0];
  const insights: FocusSubjectInsight[] = [
    {
      id: "position",
      title: "Position in the population",
      statement: `${subject} is at the ${Math.round(primary.percentile * 10) / 10}th percentile for ${metricLabel}, ${signed(primary.deltaFromAverage)} versus the population average.`,
    },
    {
      id: "cohort-gap",
      title: "Distance to comparison cohorts",
      statement: `${subject} is ${signed(topGap)} versus the Top ${cohortLabel} average and ${signed(bottomGap)} versus the Bottom ${cohortLabel} average for ${metricLabel}.`,
    },
  ];
  if (comparison.trend) {
    const trend = comparison.trend;
    const subjectChange =
      trend.subjectChangePct === null
        ? "not comparable from a zero baseline"
        : `${signed(trend.subjectChangePct)}%`;
    const populationChange =
      trend.populationChangePct === null
        ? "not comparable from a zero baseline"
        : `${signed(trend.populationChangePct)}%`;
    insights.push({
      id: "focus-trend",
      title: "Trend around the focus",
      statement: `${subject} changed ${subjectChange} from ${trend.firstPeriod} to ${trend.lastPeriod}, while the average peer changed ${populationChange}; ${subject} peaked on ${trend.peakPeriod} at ${Math.round(trend.peakValue * 100) / 100}.`,
    });
  }
  if (comparison.distribution?.groups.length) {
    const standout = [...comparison.distribution.groups].sort(
      (a, b) =>
        Math.abs(b.deltaSharePctPoints) - Math.abs(a.deltaSharePctPoints),
    )[0];
    insights.push({
      id: "focus-distribution",
      title: `${comparison.distribution.field} mix around the focus`,
      statement: `${subject} has ${Math.round(standout.subjectShare * 1000) / 10}% in ${standout.label}, ${signed(standout.deltaSharePctPoints)} percentage points versus the population mix.`,
    });
  }
  const drivers = comparison.drivers ?? [];
  drivers.slice(0, 3).forEach((breakdown, index) => {
    const driver = breakdown.groups[0];
    if (!driver) return;
    insights.push({
      id: `focus-driver-${index + 1}`,
      title: `Largest internal driver by ${breakdown.field}`,
      statement:
        driver.share === undefined
          ? `${subject}'s highest ${breakdown.field} group is ${driver.label} at ${Math.round(driver.value * 100) / 100}.`
          : `${driver.label} contributes ${Math.round(driver.share * 1000) / 10}% of ${subject}'s ${metricLabel} across ${breakdown.field}.`,
    });
  });
  if (secondary)
    insights.push({
      id: "secondary-signal",
      title: "Another signal that stands out",
      statement: `${subject}'s ${secondary.field} sits at the ${Math.round(secondary.percentile * 10) / 10}th percentile (${signed(secondary.deltaFromAverage)} versus average).`,
    });
  const rank = Number(String(comparison.rankValue ?? "").replace(/,/g, ""));
  if (Number.isFinite(rank) && rank > 0 && primary.populationCount > 1)
    insights.push({
      id: "rank-context",
      title: "Rank and selected metric tell different stories",
      statement: `${subject} has recorded rank ${comparison.rankValue}, while ${metricLabel} is at the ${Math.round(primary.percentile * 10) / 10}th percentile. The rank likely reflects additional inputs beyond this metric, so LightBI should inspect those drivers rather than infer causality.`,
    });
  const followUpQuestions = [
    `Which governed metrics differ most for ${subject} versus the population?`,
    `How far is ${subject} from the Top ${cohortLabel} and Bottom ${cohortLabel} cohorts?`,
  ];
  if (comparison.trend)
    followUpQuestions.push(
      `Which periods explain the largest movement for ${subject}?`,
    );
  if (comparison.distribution)
    followUpQuestions.push(
      `Which ${comparison.distribution.field} mix differs most for ${subject} versus the population?`,
    );
  if (drivers.length)
    followUpQuestions.push(
      `Which ${drivers
        .map((item) => item.field)
        .slice(0, 3)
        .join(", ")} groups drive ${subject}'s result?`,
    );
  followUpQuestions.push(
    comparison.rankValue
      ? `Which available signals may help explain the recorded rank ${comparison.rankValue}?`
      : `Which comparison cohort is most relevant for ${subject}?`,
  );
  return {
    headline: `${subject} in context`,
    summary: selectedScope
      ? `This readout is bounded to the selected Step 2 rows${comparison.scope?.isTruncated ? " retrieved within the drill-through limit" : ""}; LightBI does not extend these claims to the full source.`
      : `The verified full population remains the benchmark; every readout below is anchored to ${subject}.`,
    insights,
    followUpQuestions,
  };
}
