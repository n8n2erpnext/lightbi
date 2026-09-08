// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { collectAnalysisReportSections, withExpandedReportDetails } from './analysis-report-export';

function measured(element: HTMLElement, height: number, width = 800) {
  element.getBoundingClientRect = () => ({
    x: 0, y: 0, top: 0, left: 0, right: width, bottom: height,
    width, height, toJSON: () => ({}),
  } as DOMRect);
}

describe('analysis report DOM adapter', () => {
  it('collects only top-level semantic sections in screen order', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <section data-report-section="true" data-report-role="answer_overview" data-testid="answer">
        <section data-report-section="true" data-report-role="evidence_appendix" data-testid="nested"></section>
      </section>
      <details data-report-section="true" data-report-role="evidence_appendix" data-report-splittable="true" data-testid="evidence"></details>`;
    const answer = root.querySelector<HTMLElement>('[data-testid="answer"]')!;
    const evidence = root.querySelector<HTMLElement>('[data-testid="evidence"]')!;
    measured(answer, 320);
    measured(evidence, 680);

    const sections = collectAnalysisReportSections(root);
    expect(sections.map(section => section.id)).toEqual(['answer', 'evidence']);
    expect(sections.map(section => section.role)).toEqual(['answer_overview', 'evidence_appendix']);
    expect(sections[0].keepTogether).toBe(true);
    expect(sections[1]).toMatchObject({ keepTogether: false, splittable: true });
  });
  it('opens export-only details during capture and restores screen state afterward', async () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <details data-report-export-expand="true" id="closed"></details>
      <details data-report-export-expand="true" id="open" open></details>`;
    const closed = root.querySelector<HTMLDetailsElement>('#closed')!;
    const open = root.querySelector<HTMLDetailsElement>('#open')!;

    const observed = await withExpandedReportDetails(root, async () => ({
      closed: closed.open,
      open: open.open,
    }));

    expect(observed).toEqual({ closed: true, open: true });
    expect(closed.open).toBe(false);
    expect(open.open).toBe(true);
  });

  it('rejects a semantic section without a canonical report role', () => {
    const root = document.createElement('div');
    root.innerHTML = '<section data-report-section="true" data-testid="bad"></section>';
    measured(root.querySelector<HTMLElement>('[data-testid="bad"]')!, 100);
    expect(() => collectAnalysisReportSections(root)).toThrow('REPORT_SECTION_ROLE_REQUIRED');
  });
});
