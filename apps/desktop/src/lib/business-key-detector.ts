import type { DatasetFamily } from './batch-inspection';

export type KeyCandidate = {
  columnName: string;
  datasetId: string;
  semanticTag: string;
  distinctRatio: number;
  nullRatio: number;
  isGeneric: boolean;
};

const GENERIC_KEY_NAMES = new Set(['id', 'code', 'mã', 'ma', 'mã hàng', 'ma hang', 'key', 'no', 'number', 'mã số', 'maso']);

export function isGenericKeyName(name: string): boolean {
  const normalized = name.toLowerCase().trim();
  return GENERIC_KEY_NAMES.has(normalized);
}

export function detectKeyCandidates(
  dataset: DatasetFamily,
  semanticTags: Record<string, string>
): KeyCandidate[] {
  const candidates: KeyCandidate[] = [];

  for (const col of dataset.columns) {
    const profile = dataset.profiles[col];
    if (!profile) continue;

    const nullRatio = profile.nullPercent / 100;
    const distinctRatio = dataset.totalRows > 0 ? profile.distinctCount / dataset.totalRows : 0;

    // A candidate should at least have some uniqueness or be tagged semantically.
    // Reject if completely null (e.g., > 90% nulls)
    if (nullRatio > 0.9) continue;
    
    // We emit candidates for columns that are likely IDs or identifiers
    if (profile.isIdentifier || (semanticTags[col] && semanticTags[col] !== 'unknown') || distinctRatio > 0.4) {
      candidates.push({
        columnName: col,
        datasetId: dataset.id,
        semanticTag: semanticTags[col] || 'unknown',
        distinctRatio,
        nullRatio,
        isGeneric: isGenericKeyName(col)
      });
    }
  }

  return candidates;
}
