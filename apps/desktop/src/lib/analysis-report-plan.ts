export const ANALYSIS_REPORT_PLAN_VERSION = 'lightbi.analysis-report-plan.v1' as const;

export type AnalysisReportRoleV1 =
  | 'executive_summary'
  | 'answer_overview'
  | 'performance_overview'
  | 'drivers_components'
  | 'explanation_status'
  | 'recommendations_risks'
  | 'evidence_appendix';

export interface AnalysisReportSectionV1 {
  id: string;
  role: AnalysisReportRoleV1;
  heightUnits: number;
  keepTogether: boolean;
  pageBreakBefore: boolean;
  pageBreakAfter: boolean;
  splittable: boolean;
}

export interface AnalysisReportPageFragmentV1 {
  sectionId: string;
  role: AnalysisReportRoleV1;
  sourceOffsetUnits: number;
  sourceHeightUnits: number;
  renderedHeightUnits: number;
  pageOffsetUnits: number;
  continuationIndex: number;
  continued: boolean;
  scaledToFit: boolean;
  scale: number;
}

export interface AnalysisReportPageV1 {
  pageNumber: number;
  usedHeightUnits: number;
  fragments: AnalysisReportPageFragmentV1[];
}

export interface AnalysisReportPlanV1 {
  schemaVersion: typeof ANALYSIS_REPORT_PLAN_VERSION;
  pageHeightUnits: number;
  sections: AnalysisReportSectionV1[];
  pages: AnalysisReportPageV1[];
  governance: {
    preserveSectionOrder: true;
    mayStrengthenAuthority: false;
    semanticBreaksOnly: true;
  };
}

export interface CreateAnalysisReportPlanInputV1 {
  pageHeightUnits: number;
  sections: AnalysisReportSectionV1[];
}
function assertValidInput(input: CreateAnalysisReportPlanInputV1): void {
  if (!Number.isFinite(input.pageHeightUnits) || input.pageHeightUnits <= 0) {
    throw new Error('REPORT_PAGE_HEIGHT_REQUIRED');
  }
  const ids = new Set<string>();
  for (const section of input.sections) {
    if (!section.id || ids.has(section.id)) throw new Error('REPORT_SECTION_ID_INVALID');
    if (!Number.isFinite(section.heightUnits) || section.heightUnits <= 0) throw new Error('REPORT_SECTION_HEIGHT_INVALID');
    ids.add(section.id);
  }
}

function emptyPage(pageNumber: number): AnalysisReportPageV1 {
  return { pageNumber, usedHeightUnits: 0, fragments: [] };
}

export function createAnalysisReportPlan(input: CreateAnalysisReportPlanInputV1): AnalysisReportPlanV1 {
  assertValidInput(input);
  const pages: AnalysisReportPageV1[] = [emptyPage(1)];
  const current = () => pages[pages.length - 1];
  const nextPage = () => pages.push(emptyPage(pages.length + 1));

  const addFragment = (
    section: AnalysisReportSectionV1,
    sourceOffsetUnits: number,
    sourceHeightUnits: number,
    renderedHeightUnits: number,
    continuationIndex: number,
    scale = 1,
  ) => {
    const page = current();
    page.fragments.push({
      sectionId: section.id,
      role: section.role,
      sourceOffsetUnits,
      sourceHeightUnits,
      renderedHeightUnits,
      pageOffsetUnits: page.usedHeightUnits,
      continuationIndex,
      continued: continuationIndex > 0,
      scaledToFit: scale < 1,
      scale,
    });
    page.usedHeightUnits += renderedHeightUnits;
  };

  input.sections.forEach((section, sectionIndex) => {
    if (section.pageBreakBefore && current().fragments.length > 0) nextPage();
    const remaining = () => input.pageHeightUnits - current().usedHeightUnits;
    const mustStayWhole = section.keepTogether || !section.splittable;

    if (mustStayWhole) {
      if (section.heightUnits <= input.pageHeightUnits) {
        if (section.heightUnits > remaining() && current().fragments.length > 0) nextPage();
        addFragment(section, 0, section.heightUnits, section.heightUnits, 0);
      } else {
        if (current().fragments.length > 0) nextPage();
        const scale = input.pageHeightUnits / section.heightUnits;
        addFragment(section, 0, section.heightUnits, input.pageHeightUnits, 0, scale);
      }
    } else {
      let sourceOffset = 0;
      let continuationIndex = 0;
      while (sourceOffset < section.heightUnits) {
        if (remaining() <= 0) nextPage();
        const sourceHeight = Math.min(section.heightUnits - sourceOffset, remaining());
        addFragment(section, sourceOffset, sourceHeight, sourceHeight, continuationIndex);
        sourceOffset += sourceHeight;
        continuationIndex += 1;
        if (sourceOffset < section.heightUnits) nextPage();
      }
    }

    if (section.pageBreakAfter && sectionIndex < input.sections.length - 1 && current().fragments.length > 0) {
      nextPage();
    }
  });

  while (pages.length > 1 && pages.at(-1)?.fragments.length === 0) pages.pop();
  return {
    schemaVersion: ANALYSIS_REPORT_PLAN_VERSION,
    pageHeightUnits: input.pageHeightUnits,
    sections: input.sections.map(section => ({ ...section })),
    pages,
    governance: { preserveSectionOrder: true, mayStrengthenAuthority: false, semanticBreaksOnly: true },
  };
}
