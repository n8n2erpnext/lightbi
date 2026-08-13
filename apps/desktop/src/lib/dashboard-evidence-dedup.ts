export function normalizeAnalysisField(value: string | undefined | null): string {
  return (value ?? '').replace(/[Đđ]/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function analysisShapeKey(dimension: string | undefined | null, measure: string | undefined | null): string {
  return `${normalizeAnalysisField(dimension) || 'none'}|${normalizeAnalysisField(measure) || 'record_count'}`;
}

export function claimAnalysisShape(seen: Set<string>, dimension: string | undefined | null, measure: string | undefined | null): boolean {
  const key = analysisShapeKey(dimension, measure);
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}
