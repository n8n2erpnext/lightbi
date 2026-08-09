export type DrillBreakdownItem = {
  label: string;
  count: number;
  share: number;
};

export type DrillBreakdown = {
  column: string;
  totalGroups: number;
  items: DrillBreakdownItem[];
};

const normalize = (value: string) => value
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_');

const BUSINESS_PRIORITY: RegExp[] = [
  /buu_cuc|post_office|current_location|location|branch|hub|warehouse|store|depot|station|site/,
  /status|state|condition|aging|age_bucket|bucket|stage/,
  /route|service|carrier|transport|vehicle|driver|owner|manager|salesperson|employee|user/,
  /category|group|type|segment|region|province|city|district|channel|product/,
];

const IDENTITY_LIKE = /(^|_)(id|uuid|code|key|no|number|ma_phieu|ma_don|tracking|shipment_id|order_id)($|_)/;

function valueLabel(value: unknown): string {
  if (value === null || value === undefined || String(value).trim() === '') return '(Blank)';
  return String(value).trim();
}

export function buildDrillBreakdowns(
  columns: string[],
  rows: Record<string, unknown>[],
  selectedDimension?: string,
  limit = 4,
): DrillBreakdown[] {
  if (rows.length === 0) return [];
  const selected = normalize(selectedDimension ?? '');
  return columns.map((column, index) => {
    const normalized = normalize(column);
    const counts = new Map<string, number>();
    for (const row of rows) {
      const label = valueLabel(row[column]);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    const distinct = counts.size;
    const priorityIndex = BUSINESS_PRIORITY.findIndex(pattern => pattern.test(normalized));
    const isIdentity = IDENTITY_LIKE.test(normalized);
    const usefulCardinality = distinct >= 2 && distinct <= Math.min(100, Math.max(12, Math.ceil(rows.length * 0.25)));
    const eligible = normalized !== selected && usefulCardinality && (!isIdentity || priorityIndex >= 0);
    const score = eligible
      ? (priorityIndex >= 0 ? 1_000 - priorityIndex * 120 : 300) + Math.min(100, distinct) - index / 100
      : -1;
    return { column, counts, distinct, score };
  }).filter(candidate => candidate.score >= 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(candidate => ({
      column: candidate.column,
      totalGroups: candidate.distinct,
      items: [...candidate.counts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .slice(0, 8)
        .map(([label, count]) => ({ label, count, share: count / rows.length })),
    }));
}
