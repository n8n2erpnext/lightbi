import { describe, expect, it } from 'vitest';
import { analysisShapeKey, claimAnalysisShape } from './dashboard-evidence-dedup';

describe('dashboard evidence shape deduplication', () => {
  it('treats accent/case variants as the same analytical shape', () => {
    expect(analysisShapeKey('ĐVT', 'record_count')).toBe(analysisShapeKey('dvt', 'Record Count'));
  });

  it('keeps a different measure or dimension while rejecting exact evidence duplicates', () => {
    const seen = new Set<string>();
    expect(claimAnalysisShape(seen, 'Status', 'record_count')).toBe(true);
    expect(claimAnalysisShape(seen, 'status', 'record count')).toBe(false);
    expect(claimAnalysisShape(seen, 'Route', 'record_count')).toBe(true);
    expect(claimAnalysisShape(seen, 'Status', 'Revenue')).toBe(true);
  });
});
