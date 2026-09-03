import { describe, expect, it } from 'vitest';
import type { DatasetUnderstandingResult } from './understanding-next/contracts';
import {
  buildFocusSubjectComparison,
  createFocusSubjectSelection,
  deriveFocusSubjectCandidates,
  resolveFocusAutoPerspectiveId,
  searchFocusSubjectOptions,
} from './focus-subject-analysis';

const rows = Array.from({ length: 30 }, (_, index) => {
  const employeeId = String(24090 + index);
  return {
    'MSNV QUẢN LÝ': employeeId,
    'HỌ TÊN QUẢN LÝ': employeeId === '24128' ? 'Thái Đăng Duy' : `Manager ${index + 1}`,
    'RANKING': index + 1,
    'TỔNG SAO': index % 6,
    'TRUNG BÌNH ĐIỂM 4 TIÊU CHÍ': 7 + index / 10,
    'KHU VỰC': `Region ${(index % 4) + 1}`,
  };
}).concat([{
  'MSNV QUẢN LÝ': '24128',
  'HỌ TÊN QUẢN LÝ': 'Thái Đăng Duy',
  'RANKING': 1769,
  'TỔNG SAO': 0,
  'TRUNG BÌNH ĐIỂM 4 TIÊU CHÍ': 8.7667,
  'KHU VỰC': 'Region 2',
}]);

const understanding = {
  signals: [
    { canonicalId: 'employee_id', label: 'Employee ID', domain: 'performance', physicalColumn: 'MSNV QUẢN LÝ', confidence: 0.99, evidence: [], cardinality: 30, role: 'identifier', usableForDefaultQuestion: true },
    { canonicalId: 'manager', label: 'Manager', domain: 'performance', physicalColumn: 'HỌ TÊN QUẢN LÝ', confidence: 0.98, evidence: [], cardinality: 30, role: 'dimension', usableForDefaultQuestion: true },
    { canonicalId: 'performance_rank', label: 'Performance Rank', domain: 'performance', physicalColumn: 'RANKING', confidence: 0.99, evidence: [], cardinality: 30, role: 'dimension', usableForDefaultQuestion: true },
    { canonicalId: 'performance_star_total', label: 'Performance Star Total', domain: 'performance', physicalColumn: 'TỔNG SAO', confidence: 0.96, evidence: [], cardinality: 6, role: 'measure', usableForDefaultQuestion: true },
    { canonicalId: 'quality_score', label: 'Quality Score', domain: 'performance', physicalColumn: 'TRUNG BÌNH ĐIỂM 4 TIÊU CHÍ', confidence: 0.97, evidence: [], cardinality: 30, role: 'measure', usableForDefaultQuestion: true },
  ],
} as DatasetUnderstandingResult;

describe('Focus Subject Analysis experiment', () => {
  it('projects the understood employee identifier with its manager-name companion and rejects ranking as a focus field', () => {
    const candidates = deriveFocusSubjectCandidates(understanding, rows);
    const employee = candidates.find(candidate => candidate.canonicalId === 'employee_id');
    expect(employee).toBeDefined();
    expect(employee?.field).toBe('MSNV QUẢN LÝ');
    expect(employee?.labelField).toBe('HỌ TÊN QUẢN LÝ');
    expect(candidates.some(candidate => candidate.field === 'RANKING')).toBe(false);
  });

  it('finds a subject by either identifier or human label without filtering the comparison population', () => {
    const candidate = deriveFocusSubjectCandidates(understanding, rows).find(item => item.canonicalId === 'employee_id')!;
    const byId = searchFocusSubjectOptions(candidate, '24128');
    const byName = searchFocusSubjectOptions(candidate, 'thái đăng duy');
    expect(byId[0]?.displayLabel).toBe('24128 — Thái Đăng Duy');
    expect(byName[0]?.value).toBe('24128');

    const subject = createFocusSubjectSelection(candidate, byId[0], understanding);
    const comparison = buildFocusSubjectComparison(rows, subject);
    expect(comparison?.populationRowCount).toBe(rows.length);
    expect(comparison?.matchedSubjectRowCount).toBe(1);
    expect(comparison?.rankValue).toBeTruthy();
    expect(comparison?.metrics.map(metric => metric.field)).toEqual(expect.arrayContaining([
      'TỔNG SAO',
      'TRUNG BÌNH ĐIỂM 4 TIÊU CHÍ',
    ]));
  });

  it('uses only a semantically related governed lens for focus-only mode', () => {
    const candidate = deriveFocusSubjectCandidates(understanding, rows).find(item => item.canonicalId === 'employee_id')!;
    const subject = createFocusSubjectSelection(candidate, searchFocusSubjectOptions(candidate, '24128')[0], understanding);
    expect(resolveFocusAutoPerspectiveId(subject, [
      { perspectiveId: 'revenue', state: 'governed_action_available', matchedSignalIds: ['revenue'] },
      { perspectiveId: 'performance', state: 'governed_action_available', matchedSignalIds: ['employee_id', 'quality_score'] },
    ])).toBe('performance');
    expect(resolveFocusAutoPerspectiveId({ ...subject, domain: 'customer', canonicalId: 'unknown_entity' }, [
      { perspectiveId: 'revenue', state: 'governed_action_available', matchedSignalIds: ['revenue'] },
    ])).toBeNull();
  });

  it('aggregates repeated entity rows before benchmarking revenue focus', () => {
    const storeRows = [
      { Store: 'A', Revenue: 100 }, { Store: 'A', Revenue: 150 },
      { Store: 'B', Revenue: 80 }, { Store: 'B', Revenue: 70 },
      { Store: 'C', Revenue: 400 },
    ];
    const subject = {
      candidateId: 'branch:Store', canonicalId: 'branch', domain: 'revenue' as const, field: 'Store',
      value: 'A', displayLabel: 'Store A', metricFields: ['Revenue'],
    };
    const action = {
      id: 'revenue-by-store', opportunityName: 'Revenue by store', label: 'Revenue by store', description: '',
      actionType: 'group_by' as const, dimensions: ['Store'], measures: ['Revenue'], measureAggregations: { Revenue: 'SUM' as const },
      confidenceScore: 100, source: 'dataset_understanding' as const,
    };
    const comparison = buildFocusSubjectComparison(storeRows, subject, action, 1)!;
    const revenue = comparison.metrics.find(metric => metric.field === 'Revenue')!;
    expect(revenue.subjectValue).toBe(250);
    expect(revenue.populationAverage).toBeCloseTo((250 + 150 + 400) / 3);
    expect(revenue.topAverage).toBe(400);
    expect(revenue.bottomAverage).toBe(150);
    expect(revenue.populationCount).toBe(3);
  });

  it('computes subject versus average/top/bottom deterministically while no-focus remains represented by no selection', () => {
    const candidate = deriveFocusSubjectCandidates(understanding, rows).find(item => item.canonicalId === 'employee_id')!;
    const option = searchFocusSubjectOptions(candidate, '24128')[0];
    const subject = createFocusSubjectSelection(candidate, option, understanding);
    const first = buildFocusSubjectComparison(rows, subject);
    const second = buildFocusSubjectComparison(rows, subject);
    expect(first).toEqual(second);
    expect(first?.metrics.every(metric => Number.isFinite(metric.populationAverage))).toBe(true);
    expect(first?.metrics.every(metric => metric.topAverage >= metric.bottomAverage)).toBe(true);
    expect(buildFocusSubjectComparison(rows, { ...subject, value: 'missing' })).toBeNull();
  });
});
