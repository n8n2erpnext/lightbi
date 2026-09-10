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

const MIN_TRAILING_PAGE_FILL_RATIO = 0.38;
const MIN_PREVIOUS_PAGE_FILL_RATIO = 0.30;

function recomputePageOffsets(page: AnalysisReportPageV1): void {
  let offset = 0;
  for (const fragment of page.fragments) {
    fragment.pageOffsetUnits = offset;
    offset += fragment.renderedHeightUnits;
  }
  page.usedHeightUnits = offset;
}

function rebalanceTrailingPage(
  pages: AnalysisReportPageV1[],
  sections: AnalysisReportSectionV1[],
  pageHeightUnits: number,
): void {
  if (pages.length < 2) return;
  const sectionById = new Map(sections.map(section => [section.id, section]));
  const minTrailingFill = pageHeightUnits * MIN_TRAILING_PAGE_FILL_RATIO;
  const minPreviousFill = pageHeightUnits * MIN_PREVIOUS_PAGE_FILL_RATIO;

  while (pages.length >= 2) {
    const trailing = pages.at(-1)!;
    const previous = pages.at(-2)!;
    if (trailing.usedHeightUnits >= minTrailingFill || previous.fragments.length <= 1) break;
    const firstTrailing = trailing.fragments[0];
    const candidate = previous.fragments.at(-1)!;
    const trailingSection = sectionById.get(firstTrailing.sectionId);
    const candidateSection = sectionById.get(candidate.sectionId);
    if (!trailingSection || !candidateSection) break;
    if (firstTrailing.continued || firstTrailing.sourceOffsetUnits > 0 || candidate.continued || candidate.sourceOffsetUnits > 0 || candidate.scaledToFit) break;
    if ((trailingSection.pageBreakBefore && trailingSection.role !== 'evidence_appendix') || candidateSection.pageBreakBefore || candidateSection.pageBreakAfter) break;
    if (candidate.renderedHeightUnits + trailing.usedHeightUnits > pageHeightUnits) break;
    if (previous.usedHeightUnits - candidate.renderedHeightUnits < minPreviousFill) break;

    previous.fragments.pop();
    trailing.fragments.unshift(candidate);
    recomputePageOffsets(previous);
    recomputePageOffsets(trailing);
  }
}


const MIN_SPARSE_EVIDENCE_FILL_RATIO = 0.24;
const MIN_COMPACT_SCALE = 0.86;

function compactSparseEvidenceTrailingPage(
  pages: AnalysisReportPageV1[],
  sections: AnalysisReportSectionV1[],
  pageHeightUnits: number,
): void {
  if (pages.length < 2) return;
  const trailing = pages.at(-1)!;
  const previous = pages.at(-2)!;
  if (trailing.usedHeightUnits >= pageHeightUnits * MIN_SPARSE_EVIDENCE_FILL_RATIO) return;
  if (trailing.fragments.length === 0 || trailing.fragments.some(fragment => fragment.role !== 'evidence_appendix')) return;
  const sectionById = new Map(sections.map(section => [section.id, section]));
  if (trailing.fragments.some(fragment => {
    const section = sectionById.get(fragment.sectionId);
    return !section || (section.pageBreakBefore && section.role !== 'evidence_appendix') || section.pageBreakAfter;
  })) return;
  if (previous.fragments.some(fragment => {
    const section = sectionById.get(fragment.sectionId);
    return !section || section.pageBreakAfter;
  })) return;
  const combined = previous.usedHeightUnits + trailing.usedHeightUnits;
  if (combined <= pageHeightUnits) {
    previous.fragments.push(...trailing.fragments);
    recomputePageOffsets(previous);
    pages.pop();
    return;
  }
  const scale = pageHeightUnits / combined;
  if (scale < MIN_COMPACT_SCALE) return;
  const combinedFragments = [...previous.fragments, ...trailing.fragments];
  combinedFragments.forEach(fragment => {
    fragment.renderedHeightUnits *= scale;
    fragment.scale *= scale;
    fragment.scaledToFit = fragment.scale < 1;
  });
  previous.fragments = combinedFragments;
  recomputePageOffsets(previous);
  pages.pop();
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
    const remaining = () => input.pageHeightUnits - current().usedHeightUnits;
    if (section.pageBreakBefore && current().fragments.length > 0) {
      // Evidence appendices use a preferred break: start a new page only when the
      // current page cannot hold a useful slice. This avoids one-line orphan pages
      // while preserving hard semantic breaks for executive/decision sections.
      const preferredEvidenceBreak = section.role === 'evidence_appendix';
      const usefulSlice = Math.min(section.heightUnits, input.pageHeightUnits * 0.22);
      if (!preferredEvidenceBreak || remaining() < usefulSlice) nextPage();
    }
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
  rebalanceTrailingPage(pages, input.sections, input.pageHeightUnits);
  compactSparseEvidenceTrailingPage(pages, input.sections, input.pageHeightUnits);
  return {
    schemaVersion: ANALYSIS_REPORT_PLAN_VERSION,
    pageHeightUnits: input.pageHeightUnits,
    sections: input.sections.map(section => ({ ...section })),
    pages,
    governance: { preserveSectionOrder: true, mayStrengthenAuthority: false, semanticBreaksOnly: true },
  };
}
