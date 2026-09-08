import { describe, expect, it, vi } from 'vitest';
import { adviseDashboardComposition } from './dashboard-composition-advice';

const candidate = (id: string, advisoryKind: string, dashboardRoles: string[]) => ({
  hit: { conceptId: id }, labels: [id], definition: id,
  presentation: {
    schemaVersion: 'lightbi.micro-brain.presentation-advisory.v1',
    authority: 'advisory_only', advisoryKind, dashboardRoles,
  },
});

describe('Dashboard Composition MB advice', () => {
  it('keeps dashboard/domain/perspective roles as an ordinal prior without authority escalation', () => {
    const advisor = vi.fn(() => ({
      brainVersion: 'brain-test', indexVersion: 'index-test', authorityNotes: ['advisory only'],
      candidates: [
        candidate('dashboard', 'dashboard_narrative', ['overview', 'drivers', 'risk', 'evidence']),
        candidate('perspective', 'perspective_profile', ['performance', 'pipeline', 'evidence']),
        candidate('chart', 'chart_pattern', ['should_not_enter_dashboard_role_order']),
      ],
    } as any));    const advice = adviseDashboardComposition({
      domainId: 'revenue', perspectiveId: 'sales',
      userQuestion: 'What should a sales manager review?',
      semanticSignals: ['sales_revenue'],
    }, { advisor });

    expect(advice.roleOrder).toEqual(['overview', 'drivers', 'risk', 'evidence', 'performance', 'pipeline']);
    expect(advice.conceptIds).toEqual(['dashboard', 'perspective']);
    expect(advice.brainVersion).toBe('brain-test');
    expect(advice.governance).toEqual({
      authority: 'advisory_only',
      retrievalScoreIsConfidence: false,
      mayChangeMembership: false,
    });
    expect(advisor).toHaveBeenCalledWith(expect.objectContaining({
      domainId: 'revenue', perspectiveId: 'sales', analyticalIntent: 'dashboard_composition',
    }));
  });

  it('abstains without domain or perspective context instead of inventing a prior', () => {
    const advisor = vi.fn();
    const advice = adviseDashboardComposition({}, { advisor });
    expect(advice.roleOrder).toEqual([]);
    expect(advice.conceptIds).toEqual([]);
    expect(advisor).not.toHaveBeenCalled();
  });
});