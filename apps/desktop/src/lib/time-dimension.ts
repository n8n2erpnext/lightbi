const TIME_LIKE_DIMENSIONS = [
  'report_date',
  'date',
  'order_date',
  'delivery_date',
  'created_at',
  'updated_at',
  'month',
  'year',
  'period',
  'fiscal_month',
  'fiscal_year'
];

export function normalizeColumnName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function isPeriodLikeDimension(dim: string): boolean {
  const normalized = normalizeColumnName(dim);
  return (
    normalized === 'month' ||
    normalized === 'year' ||
    normalized === 'period' ||
    normalized.includes('month') ||
    normalized.includes('year') ||
    normalized.includes('period') ||
    normalized.includes('thang') ||
    normalized.includes('nam') ||
    normalized.includes('ky')
  );
}

export function isTimeLikeDimension(dim: string): boolean {
  const normalized = normalizeColumnName(dim);
  return (
    TIME_LIKE_DIMENSIONS.includes(normalized) ||
    normalized.includes('date') ||
    normalized.includes('time') ||
    normalized.includes('timestamp') ||
    normalized.includes('ngay') ||
    normalized.includes('thoi gian') ||
    isPeriodLikeDimension(dim)
  );
}
