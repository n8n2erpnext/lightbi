import type { ChartPreviewModel } from './chart-preview-model';
import type { VisualNarrativePresentationV1 } from './visual-narrative-composition';

export type VisualNarrativeRuntimeItemV1 = {
  id: string;
  label: string;
  chartModel: ChartPreviewModel;
};

function normalized(value: string | null | undefined): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function dimensionKey(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'number') return `n:${value}`;
  if (typeof value === 'boolean') return `b:${value}`;
  return `s:${String(value)}`;
}

function dateLikeDimensionField(field: string): boolean {
  return /(^|_)(date|time|day|week|month|quarter|year|period)(_|$)/.test(normalized(field));
}

function presentationDateDimensionKey(value: unknown): string | null {
  let epochMs: number | null = null;
  if (typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value)) {
    const minEpochMs = Date.UTC(1900, 0, 1);
    const maxEpochMs = Date.UTC(2200, 0, 1);
    if (value >= minEpochMs && value < maxEpochMs) epochMs = value;
  } else if (typeof value === 'string') {
    const text = value.trim();
    const isoDateLike = /^\d{4}-\d{2}-\d{2}(?:[Tt ][0-9]{2}:[0-9]{2}(?::[0-9]{2}(?:\.[0-9]+)?)?(?:[Zz]|[+-][0-9]{2}:?[0-9]{2})?)?$/.test(text);
    if (isoDateLike) {
      const parsed = Date.parse(text);
      if (Number.isFinite(parsed)) epochMs = parsed;
    }
  }
  return epochMs == null ? null : `d:${new Date(epochMs).toISOString().slice(0, 10)}`;
}

function equivalentDimensionKeyer(
  left: ChartPreviewModel,
  right: ChartPreviewModel,
  leftField: string,
  rightField: string,
): ((value: unknown) => string) | null {
  const leftRaw = left.rows.map(row => dimensionKey(row[leftField]));
  const rightRaw = right.rows.map(row => dimensionKey(row[rightField]));
  const leftRawSet = new Set(leftRaw);
  const rightRawSet = new Set(rightRaw);
  if (leftRawSet.size === rightRawSet.size && [...leftRawSet].every(key => rightRawSet.has(key))) return dimensionKey;
  if (!dateLikeDimensionField(leftField) || !dateLikeDimensionField(rightField)) return null;

  const leftDate = left.rows.map(row => presentationDateDimensionKey(row[leftField]));
  const rightDate = right.rows.map(row => presentationDateDimensionKey(row[rightField]));
  if (leftDate.some(key => key == null) || rightDate.some(key => key == null)) return null;
  const leftDateKeys = leftDate as string[];
  const rightDateKeys = rightDate as string[];
  const leftDateSet = new Set(leftDateKeys);
  const rightDateSet = new Set(rightDateKeys);
  // Never let day-level presentation normalization collapse distinct governed members.
  if (leftDateSet.size !== leftRawSet.size || rightDateSet.size !== rightRawSet.size) return null;
  if (leftDateSet.size !== rightDateSet.size || [...leftDateSet].some(key => !rightDateSet.has(key))) return null;
  return value => presentationDateDimensionKey(value) ?? dimensionKey(value);
}
export function visualNarrativeModelsCanAlign(
  left: ChartPreviewModel,
  right: ChartPreviewModel,
): boolean {
  const leftField = left.xField ?? null;
  const rightField = right.xField ?? null;
  if (!leftField || !rightField || normalized(leftField) !== normalized(rightField)) return false;
  if (left.rows.length === 0 || right.rows.length === 0) return false;

  const leftKeys = new Set(left.rows.map(row => dimensionKey(row[leftField])));
  const rightKeys = new Set(right.rows.map(row => dimensionKey(row[rightField])));
  if (leftKeys.size !== rightKeys.size) return false;
  for (const key of leftKeys) if (!rightKeys.has(key)) return false;
  return true;
}

function presentationMetricAlias(left: string, right: string): boolean {
  const leftTokens = normalized(left).split('_').filter(Boolean);
  const rightTokens = normalized(right).split('_').filter(Boolean);
  if (leftTokens.length === 0 || rightTokens.length === 0) return false;
  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);
  const leftContainsRight = rightTokens.every(token => leftSet.has(token));
  const rightContainsLeft = leftTokens.every(token => rightSet.has(token));
  return leftContainsRight || rightContainsLeft;
}

export function visualNarrativeModelsAreEquivalentSingleSeries(
  left: ChartPreviewModel,
  right: ChartPreviewModel,
): boolean {
  // Duplicate detection is intentionally broader than combo alignment. Two
  // presentation lanes may project the same governed grain under different
  // field labels (for example `time_period` vs `Date`). A combo still requires
  // declared grain compatibility, but duplicate suppression may compare the
  // actual dimension members directly.
  const leftField = left.xField ?? null;
  const rightField = right.xField ?? null;
  if (!leftField || !rightField || left.rows.length === 0 || right.rows.length === 0) return false;
  if (left.seriesFields.length !== 1 || right.seriesFields.length !== 1) return false;
  const equivalentKey = equivalentDimensionKeyer(left, right, leftField, rightField);
  if (!equivalentKey) return false;
  const leftMetric = left.seriesFields[0];
  const rightMetric = right.seriesFields[0];
  if (!presentationMetricAlias(leftMetric, rightMetric)) return false;
  const rightByKey = new Map(right.rows.map(row => [equivalentKey(row[rightField]), row] as const));
  for (const leftRow of left.rows) {
    const rightRow = rightByKey.get(equivalentKey(leftRow[leftField]));
    if (!rightRow) return false;
    const leftValue = Number(leftRow[leftMetric]);
    const rightValue = Number(rightRow[rightMetric]);
    if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue)) return false;
    const tolerance = 1e-9 * Math.max(1, Math.abs(leftValue), Math.abs(rightValue));
    if (Math.abs(leftValue - rightValue) > tolerance) return false;
  }
  return true;
}

function uniqueFieldName(field: string, used: Set<string>, label: string): string {
  if (!used.has(field)) return field;
  const base = `${field} · ${label}`;
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base} ${suffix}`)) suffix += 1;
  return `${base} ${suffix}`;
}
export function combineVisualNarrativeModels(
  left: VisualNarrativeRuntimeItemV1,
  right: VisualNarrativeRuntimeItemV1,
  presentation: VisualNarrativePresentationV1,
): ChartPreviewModel | null {
  if (!visualNarrativeModelsCanAlign(left.chartModel, right.chartModel)) return null;
  const leftField = left.chartModel.xField!;
  const rightField = right.chartModel.xField!;
  const rightByKey = new Map(right.chartModel.rows.map(row => [dimensionKey(row[rightField]), row] as const));
  const used = new Set<string>([leftField]);
  const seriesFields: string[] = [];
  const leftNames = new Map<string, string>();
  const rightNames = new Map<string, string>();
  for (const field of left.chartModel.seriesFields) {
    const name = uniqueFieldName(field, used, left.label);
    used.add(name); leftNames.set(field, name); seriesFields.push(name);
  }
  for (const field of right.chartModel.seriesFields) {
    const name = uniqueFieldName(field, used, right.label);
    used.add(name); rightNames.set(field, name); seriesFields.push(name);
  }
  const rows = left.chartModel.rows.map(leftRow => {
    const rightRow = rightByKey.get(dimensionKey(leftRow[leftField])) ?? {};
    const row: Record<string, unknown> = { [leftField]: leftRow[leftField] };
    for (const [field, name] of leftNames) row[name] = leftRow[field];
    for (const [field, name] of rightNames) row[name] = rightRow[field];
    return row;
  });
  return {
    id: `visual_narrative_${left.id}_${right.id}`,
    sourceResultId: `${left.chartModel.sourceResultId}+${right.chartModel.sourceResultId}`,
    status: 'ready',
    chartType: 'bar',
    title: `${left.label} + ${right.label}`,
    xField: leftField,
    yField: seriesFields[0],
    seriesFields,
    rows,
    warnings: [
      ...left.chartModel.warnings,
      ...right.chartModel.warnings,
      `Presentation-level ${presentation} of independently governed aggregate results; no raw-row join was performed.`,
    ],
    source: 'duckdb_preview_result',
  };
}
