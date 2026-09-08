import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { zipSync } from 'fflate';
import { saveBlobWithUserChoice, saveDataUrlWithUserChoice } from './native-capabilities';
import {
  createAnalysisReportPlan,
  type AnalysisReportPlanV1,
  type AnalysisReportRoleV1,
  type AnalysisReportSectionV1,
} from './analysis-report-plan';

const REPORT_SECTION_SELECTOR = '[data-report-section="true"]';
const REPORT_EXPORT_EXPAND_SELECTOR = 'details[data-report-export-expand="true"]';
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_MARGIN_MM = 8;
const DEFAULT_PIXEL_RATIO = 2;

const REPORT_ROLES = new Set<AnalysisReportRoleV1>([
  'executive_summary', 'answer_overview', 'performance_overview',
  'drivers_components', 'explanation_status', 'recommendations_risks', 'evidence_appendix',
]);

export interface AnalysisReportDomSectionV1 extends AnalysisReportSectionV1 {
  element: HTMLElement;
}
export interface RenderedAnalysisReportPageV1 {
  pageNumber: number;
  dataUrl: string;
}

export interface RenderedAnalysisReportV1 {
  plan: AnalysisReportPlanV1;
  pages: RenderedAnalysisReportPageV1[];
  pageWidthUnits: number;
  pageHeightUnits: number;
}

function parseBooleanAttribute(element: HTMLElement, name: string, fallback: boolean): boolean {
  const value = element.getAttribute(name);
  if (value === null) return fallback;
  return value === 'true';
}

function reportRole(element: HTMLElement): AnalysisReportRoleV1 {
  const value = element.dataset.reportRole as AnalysisReportRoleV1 | undefined;
  if (!value || !REPORT_ROLES.has(value)) throw new Error('REPORT_SECTION_ROLE_REQUIRED');
  return value;
}

function hasReportSectionAncestor(element: HTMLElement, root: HTMLElement): boolean {
  let parent = element.parentElement;
  while (parent && parent !== root) {
    if (parent.dataset.reportSection === 'true') return true;
    parent = parent.parentElement;
  }
  return false;
}
export function collectAnalysisReportSections(root: HTMLElement): AnalysisReportDomSectionV1[] {
  const elements = Array.from(root.querySelectorAll<HTMLElement>(REPORT_SECTION_SELECTOR))
    .filter(element => !hasReportSectionAncestor(element, root));
  if (elements.length === 0) throw new Error('REPORT_SECTION_METADATA_REQUIRED');
  return elements.map((element, index) => {
    const heightUnits = element.getBoundingClientRect().height;
    if (!Number.isFinite(heightUnits) || heightUnits <= 0) throw new Error('REPORT_SECTION_HEIGHT_INVALID');
    const splittable = parseBooleanAttribute(element, 'data-report-splittable', false);
    return {
      id: element.dataset.reportId || element.dataset.testid || `report-section-${index + 1}`,
      role: reportRole(element),
      heightUnits,
      keepTogether: parseBooleanAttribute(element, 'data-report-keep-together', !splittable),
      pageBreakBefore: parseBooleanAttribute(element, 'data-report-break-before', false),
      pageBreakAfter: parseBooleanAttribute(element, 'data-report-break-after', false),
      splittable,
      element,
    };
  });
}

export async function withExpandedReportDetails<T>(root: HTMLElement, callback: () => Promise<T>): Promise<T> {
  const details = Array.from(root.querySelectorAll<HTMLDetailsElement>(REPORT_EXPORT_EXPAND_SELECTOR));
  const previous = details.map(detail => detail.open);
  details.forEach(detail => { detail.open = true; });
  try {
    return await callback();
  } finally {
    details.forEach((detail, index) => { detail.open = previous[index] ?? false; });
  }
}
async function decodeImage(dataUrl: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  return image;
}

function reportGeometry(contentWidthUnits: number) {
  const unitsPerMm = contentWidthUnits / (A4_WIDTH_MM - A4_MARGIN_MM * 2);
  const marginUnits = A4_MARGIN_MM * unitsPerMm;
  const pageWidthUnits = A4_WIDTH_MM * unitsPerMm;
  const pageHeightUnits = A4_HEIGHT_MM * unitsPerMm;
  const contentHeightUnits = pageHeightUnits - marginUnits * 2;
  return { unitsPerMm, marginUnits, pageWidthUnits, pageHeightUnits, contentHeightUnits };
}

export async function renderAnalysisReportPages(root: HTMLElement, pixelRatio = DEFAULT_PIXEL_RATIO): Promise<RenderedAnalysisReportV1> {
  return withExpandedReportDetails(root, async () => {
    const rootWidth = root.getBoundingClientRect().width;
    if (!Number.isFinite(rootWidth) || rootWidth <= 0) throw new Error('REPORT_ROOT_WIDTH_INVALID');
    const sections = collectAnalysisReportSections(root);
    const geometry = reportGeometry(rootWidth);
    const plan = createAnalysisReportPlan({
      pageHeightUnits: geometry.contentHeightUnits,
      sections: sections.map(({ element: _element, ...section }) => section),
    });
    const captures = new Map<string, HTMLImageElement>();
    for (const section of sections) {
      const dataUrl = await toPng(section.element, { backgroundColor: '#fbfbfa', cacheBust: true, pixelRatio });
      captures.set(section.id, await decodeImage(dataUrl));
    }

    const pages: RenderedAnalysisReportPageV1[] = [];
    for (const page of plan.pages) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(geometry.pageWidthUnits * pixelRatio);
      canvas.height = Math.ceil(geometry.pageHeightUnits * pixelRatio);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('REPORT_CANVAS_UNAVAILABLE');
      context.fillStyle = '#fbfbfa';
      context.fillRect(0, 0, canvas.width, canvas.height);

      for (const fragment of page.fragments) {
        const section = sections.find(item => item.id === fragment.sectionId);
        const image = captures.get(fragment.sectionId);
        if (!section || !image) throw new Error('REPORT_SECTION_CAPTURE_MISSING');
        const sourceY = fragment.sourceOffsetUnits / section.heightUnits * image.height;
        const sourceHeight = fragment.sourceHeightUnits / section.heightUnits * image.height;
        const destinationX = geometry.marginUnits * pixelRatio;
        const destinationY = (geometry.marginUnits + fragment.pageOffsetUnits) * pixelRatio;
        const destinationWidth = rootWidth * pixelRatio;
        const destinationHeight = fragment.renderedHeightUnits * pixelRatio;
        context.drawImage(
          image,
          0,
          sourceY,
          image.width,
          sourceHeight,
          destinationX,
          destinationY,
          destinationWidth,
          destinationHeight,
        );
      }
      pages.push({ pageNumber: page.pageNumber, dataUrl: canvas.toDataURL('image/png') });
    }

    return {
      plan,
      pages,
      pageWidthUnits: geometry.pageWidthUnits,
      pageHeightUnits: geometry.pageHeightUnits,
    };
  });
}

async function dataUrlBytes(dataUrl: string): Promise<Uint8Array> {
  const response = await fetch(dataUrl);
  return new Uint8Array(await response.arrayBuffer());
}
export async function saveAnalysisReportPngPages(root: HTMLElement, fileStem: string): Promise<{ pageCount: number; format: 'png' | 'zip' }> {
  const report = await renderAnalysisReportPages(root);
  if (report.pages.length === 1) {
    await saveDataUrlWithUserChoice(report.pages[0].dataUrl, {
      suggestedName: `${fileStem}-BA.png`,
      description: 'PNG report page',
      extensions: ['png'],
    });
    return { pageCount: 1, format: 'png' };
  }
  const entries: Record<string, Uint8Array> = {};
  for (const page of report.pages) {
    entries[`${fileStem}-BA-page-${String(page.pageNumber).padStart(2, '0')}.png`] = await dataUrlBytes(page.dataUrl);
  }
  const zipped = zipSync(entries, { level: 6 });
  const buffer = zipped.buffer.slice(zipped.byteOffset, zipped.byteOffset + zipped.byteLength) as ArrayBuffer;
  await saveBlobWithUserChoice(new Blob([buffer], { type: 'application/zip' }), {
    suggestedName: `${fileStem}-BA-PNG-pages.zip`,
    description: 'PNG report pages',
    extensions: ['zip'],
  });
  return { pageCount: report.pages.length, format: 'zip' };
}
export async function saveAnalysisReportPdf(root: HTMLElement, fileStem: string): Promise<{ pageCount: number }> {
  const report = await renderAnalysisReportPages(root);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  report.pages.forEach((page, index) => {
    if (index > 0) pdf.addPage();
    pdf.addImage(page.dataUrl, 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST');
  });
  await saveBlobWithUserChoice(pdf.output('blob'), {
    suggestedName: `${fileStem}-BA.pdf`,
    description: 'PDF document',
    extensions: ['pdf'],
  });
  return { pageCount: report.pages.length };
}
