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
