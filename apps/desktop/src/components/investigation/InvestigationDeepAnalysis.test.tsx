// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DEFAULT_PREFERENCES } from '../../stores/display-preferences-store';
import { InvestigationDeepAnalysis } from './InvestigationDeepAnalysis';

describe('InvestigationDeepAnalysis export boundary', () => {
  it('keeps the dashboard CTA visible but outside the image/PDF capture surface', () => {
    render(
      <InvestigationDeepAnalysis
        action={{
          id: 'action-weight-by-route',
          opportunityName: 'Cargo weight by route',
          label: 'Cargo weight by route',
          description: 'Compare cargo weight by route',
          actionType: 'group_by',
          dimensions: ['route'],
          measures: ['weight'],
          confidenceScore: 100,
          source: 'dataset_understanding',
        }}
        brief={null}
        chartModel={null}
        onClose={vi.fn()}
        onCreateDashboard={vi.fn()}
        canCreateDashboard
        preferences={DEFAULT_PREFERENCES}
      />,
    );

    const exportSurface = screen.getByTestId('deep-analysis-export-surface');
    const dashboardCta = screen.getByTestId('deep-analysis-dashboard-cta');
    expect(dashboardCta).toBeTruthy();
    expect(exportSurface.contains(dashboardCta)).toBe(false);
  });
});
