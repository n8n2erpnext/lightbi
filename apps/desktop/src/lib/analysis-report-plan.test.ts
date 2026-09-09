import { describe, expect, it } from 'vitest';
import { createAnalysisReportPlan, type AnalysisReportSectionV1 } from './analysis-report-plan';

function section(overrides: Partial<AnalysisReportSectionV1> & Pick<AnalysisReportSectionV1, 'id' | 'role' | 'heightUnits'>): AnalysisReportSectionV1 {
  return {
    keepTogether: true,
    pageBreakBefore: false,
    pageBreakAfter: false,
    splittable: false,
    ...overrides,
  };
}

describe('AnalysisReportPlan', () => {
  it('preserves semantic screen order while moving keep-together sections to the next page', () => {
    const plan = createAnalysisReportPlan({
      pageHeightUnits: 100,
      sections: [
        section({ id: 'summary', role: 'executive_summary', heightUnits: 55 }),
        section({ id: 'answer', role: 'answer_overview', heightUnits: 60 }),
        section({ id: 'drivers', role: 'drivers_components', heightUnits: 30 }),
      ],
    });
    expect(plan.pages).toHaveLength(2);
    expect(plan.pages[0].fragments.map(fragment => fragment.sectionId)).toEqual(['summary']);
    expect(plan.pages[1].fragments.map(fragment => fragment.sectionId)).toEqual(['answer', 'drivers']);
    expect(plan.governance.preserveSectionOrder).toBe(true);
    expect(plan.governance.mayStrengthenAuthority).toBe(false);
  });

  it('honors explicit page breaks before and after sections', () => {
    const plan = createAnalysisReportPlan({
      pageHeightUnits: 120,
      sections: [
        section({ id: 'summary', role: 'executive_summary', heightUnits: 30, pageBreakAfter: true }),
        section({ id: 'answer', role: 'answer_overview', heightUnits: 30 }),
        section({ id: 'evidence', role: 'evidence_appendix', heightUnits: 30, pageBreakBefore: true }),
      ],
    });
    expect(plan.pages.map(page => page.fragments.map(fragment => fragment.sectionId))).toEqual([
      ['summary'], ['answer'], ['evidence'],
    ]);
  });
  it('backtracks one adjacent whole section instead of leaving an editorial orphan on the final page', () => {
    const plan = createAnalysisReportPlan({
      pageHeightUnits: 100,
      sections: [
        section({ id: 'answer', role: 'answer_overview', heightUnits: 45 }),
        section({ id: 'drivers', role: 'drivers_components', heightUnits: 45 }),
        section({ id: 'limitations', role: 'recommendations_risks', heightUnits: 20 }),
      ],
    });
    expect(plan.pages.map(page => page.fragments.map(fragment => fragment.sectionId))).toEqual([
      ['answer'], ['drivers', 'limitations'],
    ]);
    expect(plan.pages.map(page => page.usedHeightUnits)).toEqual([45, 65]);
    expect(plan.pages[1].fragments.map(fragment => fragment.pageOffsetUnits)).toEqual([0, 45]);
  });

  it('never rebalances across an explicit semantic page break', () => {
    const plan = createAnalysisReportPlan({
      pageHeightUnits: 100,
      sections: [
        section({ id: 'answer', role: 'answer_overview', heightUnits: 45 }),
        section({ id: 'drivers', role: 'drivers_components', heightUnits: 45 }),
        section({ id: 'evidence', role: 'evidence_appendix', heightUnits: 20, pageBreakBefore: true }),
      ],
    });
    expect(plan.pages.map(page => page.fragments.map(fragment => fragment.sectionId))).toEqual([
      ['answer', 'drivers'], ['evidence'],
    ]);
  });

  it('splits only explicitly splittable evidence across bounded pages', () => {
    const plan = createAnalysisReportPlan({
      pageHeightUnits: 100,
      sections: [section({
        id: 'evidence', role: 'evidence_appendix', heightUnits: 230,
        keepTogether: false, splittable: true,
      })],
    });
    expect(plan.pages).toHaveLength(3);
    expect(plan.pages.map(page => page.fragments[0].sourceHeightUnits)).toEqual([100, 100, 30]);
    expect(plan.pages.map(page => page.fragments[0].continuationIndex)).toEqual([0, 1, 2]);
    expect(plan.pages[1].fragments[0].continued).toBe(true);
  });

  it('keeps an oversized keep-together section intact by scaling it to one page', () => {
    const plan = createAnalysisReportPlan({
      pageHeightUnits: 100,
      sections: [section({ id: 'chart', role: 'performance_overview', heightUnits: 160 })],
    });
    expect(plan.pages).toHaveLength(1);
    expect(plan.pages[0].fragments[0]).toMatchObject({
      sectionId: 'chart', sourceHeightUnits: 160, renderedHeightUnits: 100, scaledToFit: true,
    });
    expect(plan.pages[0].fragments[0].scale).toBeCloseTo(0.625, 4);
  });
});
