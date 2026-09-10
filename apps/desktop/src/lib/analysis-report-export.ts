import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { zipSync } from 'fflate';
import { saveBlobWithUserChoice, saveDataUrlWithUserChoice } from './native-capabilities';
import { lightBIFrontendUrl } from './lightbi-routing';
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
const HORIZONTAL_MARGIN_MM = 10;
const CONTENT_TOP_MM = 24;
const CONTENT_BOTTOM_MM = 20;
const DEFAULT_PIXEL_RATIO = 2;
const DEFAULT_CONTACT = 'support@thaiduy.digital';

const REPORT_ROLES = new Set<AnalysisReportRoleV1>([
  'executive_summary', 'answer_overview', 'performance_overview',
  'drivers_components', 'explanation_status', 'recommendations_risks', 'evidence_appendix',
]);

export interface AnalysisReportMetadataV1 {
  title?: string;
  summary?: string;
  sourceNames?: string[];
  exportedAt?: string | Date;
  version?: string;
  distributionUrl?: string;
  contact?: string;
  documentCode?: string;
  disclaimer?: string[];
}

export interface NormalizedAnalysisReportMetadataV1 {
  title: string;
  summary: string;
  sourceNames: string[];
  exportedAtIso: string;
  version: string;
  distributionUrl: string;
  contact: string;
  documentCode: string;
  disclaimer: string[];
}

export interface AnalysisReportDomSectionV1 extends AnalysisReportSectionV1 {
  element: HTMLElement;
}
export interface RenderedAnalysisReportPageV1 {
  pageNumber: number;
  dataUrl: string;
  kind: 'cover' | 'content' | 'about';
}

export interface RenderedAnalysisReportV1 {
  plan: AnalysisReportPlanV1;
  pages: RenderedAnalysisReportPageV1[];
  pageWidthUnits: number;
  pageHeightUnits: number;
  metadata: NormalizedAnalysisReportMetadataV1;
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
  const unitsPerMm = contentWidthUnits / (A4_WIDTH_MM - HORIZONTAL_MARGIN_MM * 2);
  const horizontalMarginUnits = HORIZONTAL_MARGIN_MM * unitsPerMm;
  const contentTopUnits = CONTENT_TOP_MM * unitsPerMm;
  const contentBottomUnits = CONTENT_BOTTOM_MM * unitsPerMm;
  const pageWidthUnits = A4_WIDTH_MM * unitsPerMm;
  const pageHeightUnits = A4_HEIGHT_MM * unitsPerMm;
  const contentHeightUnits = pageHeightUnits - contentTopUnits - contentBottomUnits;
  return { unitsPerMm, horizontalMarginUnits, contentTopUnits, contentBottomUnits, pageWidthUnits, pageHeightUnits, contentHeightUnits };
}

type ReportGeometry = ReturnType<typeof reportGeometry>;

function createPageCanvas(geometry: ReportGeometry, pixelRatio: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(geometry.pageWidthUnits * pixelRatio);
  canvas.height = Math.ceil(geometry.pageHeightUnits * pixelRatio);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('REPORT_CANVAS_UNAVAILABLE');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  return { canvas, context };
}

function px(geometry: ReportGeometry, mm: number, pixelRatio: number): number {
  return geometry.unitsPerMm * mm * pixelRatio;
}

function font(context: CanvasRenderingContext2D, geometry: ReportGeometry, pixelRatio: number, mm: number, weight = 400): void {
  context.font = `${weight} ${Math.max(1, px(geometry, mm, pixelRatio))}px Inter, Arial, sans-serif`;
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let line = words[0];
  for (const word of words.slice(1)) {
    const candidate = `${line} ${word}`;
    if (context.measureText(candidate).width <= maxWidth) line = candidate;
    else { lines.push(line); line = word; }
  }
  lines.push(line);
  return lines;
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 20,
): number {
  const lines = wrapText(context, text, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function truncate(value: string, max = 96): string {
  const normalized = value.replace(/\s+/gu, ' ').trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}…`;
}

function sourceSummary(sourceNames: string[]): string {
  if (sourceNames.length === 0) return 'Source: not declared';
  if (sourceNames.length === 1) return `Source: ${sourceNames[0]}`;
  return `Sources: ${sourceNames[0]} +${sourceNames.length - 1} more`;
}

async function sha256Hex(value: string): Promise<string> {
  try {
    const subtle = globalThis.crypto?.subtle;
    if (subtle) {
      const bytes = new TextEncoder().encode(value);
      const digest = await subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, '0')).join('');
    }
  } catch {
    // Fall through to deterministic non-cryptographic reference when WebCrypto is unavailable.
  }
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').repeat(8);
}

async function normalizeMetadata(
  fileStem: string,
  metadata: AnalysisReportMetadataV1 | undefined,
  plan: AnalysisReportPlanV1,
  captureFingerprints: string[],
): Promise<NormalizedAnalysisReportMetadataV1> {
  const exportedAt = metadata?.exportedAt instanceof Date
    ? metadata.exportedAt
    : metadata?.exportedAt ? new Date(metadata.exportedAt) : new Date();
  const exportedAtIso = Number.isNaN(exportedAt.getTime()) ? new Date().toISOString() : exportedAt.toISOString();
  const sourceNames = [...new Set((metadata?.sourceNames ?? []).map(value => value.trim()).filter(Boolean))];
  const version = metadata?.version ?? import.meta.env.VITE_LIGHTBI_VERSION ?? '0.9.2-beta.7';
  const distributionUrl = metadata?.distributionUrl ?? lightBIFrontendUrl('distribution');
  const contact = metadata?.contact ?? DEFAULT_CONTACT;
  const disclaimer = metadata?.disclaimer ?? [
    'This report is analytical evidence generated from the stated source data and governed analysis boundaries. It is not a legal, tax, accounting, medical, investment, or regulatory certification.',
    'Observations, rankings, correlations, and contribution statements do not establish causality. Review the source evidence and visible limitations before making operational or financial decisions.',
    'The document reference fingerprint is an integrity aid for this export. It is not a digital signature and does not replace signed provenance or source-system controls.',
  ];
  const summary = metadata?.summary?.replace(/\s+/gu, ' ').trim() || 'LightBI prepared this governed report from the selected analysis scope. Read the executive summary first, then review the business analysis and source-bound evidence before making a decision.';
  const seed = JSON.stringify({
    title: metadata?.title ?? fileStem,
    summary,
    sourceNames,
    exportedAtIso,
    version,
    plan: plan.pages.map(page => page.fragments.map(fragment => [fragment.sectionId, fragment.role, fragment.sourceOffsetUnits, fragment.sourceHeightUnits])),
    captureFingerprints,
  });
  const digest = await sha256Hex(seed);
  const dateCode = exportedAtIso.slice(0, 10).replaceAll('-', '');
  const documentCode = metadata?.documentCode ?? `LBI-${dateCode}-${digest.slice(0, 16).toUpperCase()}`;
  return {
    title: metadata?.title?.trim() || fileStem,
    summary,
    sourceNames,
    exportedAtIso,
    version,
    distributionUrl,
    contact,
    documentCode,
    disclaimer,
  };
}

function roleHeading(role: AnalysisReportRoleV1 | undefined): string {
  if (role === 'executive_summary') return 'Executive Summary';
  if (role === 'answer_overview') return 'Business Analysis';
  if (role === 'performance_overview') return 'Performance Overview';
  if (role === 'drivers_components') return 'Drivers & Components';
  if (role === 'explanation_status') return 'Analysis Narrative';
  if (role === 'recommendations_risks') return 'Recommendations & Risks';
  if (role === 'evidence_appendix') return 'Evidence Appendix';
  return 'Business Analysis';
}

function drawPageChrome(
  context: CanvasRenderingContext2D,
  geometry: ReportGeometry,
  pixelRatio: number,
  metadata: NormalizedAnalysisReportMetadataV1,
  pageNumber: number,
  totalPages: number,
  sectionHeading?: string,
): void {
  const left = px(geometry, HORIZONTAL_MARGIN_MM, pixelRatio);
  const right = geometry.pageWidthUnits * pixelRatio - left;
  context.strokeStyle = '#e2e8f0';
  context.lineWidth = Math.max(1, pixelRatio);
  context.beginPath();
  context.moveTo(left, px(geometry, 17, pixelRatio));
  context.lineTo(right, px(geometry, 17, pixelRatio));
  context.stroke();

  context.fillStyle = '#111827';
  font(context, geometry, pixelRatio, 3.2, 700);
  context.fillText('LightBI', left, px(geometry, 12.6, pixelRatio));
  context.fillStyle = '#64748b';
  font(context, geometry, pixelRatio, 2.6, 600);
  context.textAlign = 'right';
  context.fillText(truncate(sectionHeading || metadata.title, 72), right, px(geometry, 12.6, pixelRatio));
  context.textAlign = 'left';

  const footerY = geometry.pageHeightUnits * pixelRatio - px(geometry, 11.5, pixelRatio);
  context.beginPath();
  context.moveTo(left, footerY - px(geometry, 4.2, pixelRatio));
  context.lineTo(right, footerY - px(geometry, 4.2, pixelRatio));
  context.stroke();
  context.fillStyle = '#64748b';
  font(context, geometry, pixelRatio, 2.35, 500);
  context.fillText(truncate(sourceSummary(metadata.sourceNames), 72), left, footerY);
  context.fillStyle = '#94a3b8';
  font(context, geometry, pixelRatio, 2.1, 500);
  context.fillText(`${new Date(metadata.exportedAtIso).toLocaleString()} · ${metadata.documentCode}`, left, footerY + px(geometry, 3.4, pixelRatio));
  context.textAlign = 'right';
  context.fillStyle = '#475569';
  font(context, geometry, pixelRatio, 2.5, 700);
  context.fillText(`Page ${pageNumber} / ${totalPages}`, right, footerY);
  context.textAlign = 'left';
}

function renderCoverPage(
  geometry: ReportGeometry,
  pixelRatio: number,
  metadata: NormalizedAnalysisReportMetadataV1,
  totalPages: number,
): RenderedAnalysisReportPageV1 {
  const { canvas, context } = createPageCanvas(geometry, pixelRatio);
  const left = px(geometry, 20, pixelRatio);
  const maxWidth = geometry.pageWidthUnits * pixelRatio - left * 2;
  context.fillStyle = '#111827';
  font(context, geometry, pixelRatio, 5.3, 800);
  context.fillText('LightBI', left, px(geometry, 36, pixelRatio));
  context.fillStyle = '#2563eb';
  font(context, geometry, pixelRatio, 2.6, 700);
  context.fillText('BUSINESS ANALYSIS REPORT', left, px(geometry, 48, pixelRatio));
  context.fillStyle = '#0f172a';
  font(context, geometry, pixelRatio, 7.4, 750);
  let y = drawWrappedText(context, metadata.title, left, px(geometry, 64, pixelRatio), maxWidth, px(geometry, 9, pixelRatio), 5);
  context.fillStyle = '#475569';
  font(context, geometry, pixelRatio, 3.2, 500);
  y = drawWrappedText(context, 'Executive summary → governed business analysis → source-bound evidence', left, y + px(geometry, 6, pixelRatio), maxWidth, px(geometry, 5.3, pixelRatio), 3);
  context.fillStyle = '#2563eb';
  font(context, geometry, pixelRatio, 2.45, 750);
  context.fillText('EXECUTIVE SUMMARY', left, y + px(geometry, 8, pixelRatio));
  context.fillStyle = '#334155';
  font(context, geometry, pixelRatio, 2.8, 500);
  y = drawWrappedText(context, metadata.summary, left, y + px(geometry, 15, pixelRatio), maxWidth, px(geometry, 4.7, pixelRatio), 7);

  const cardTop = Math.max(y + px(geometry, 10, pixelRatio), px(geometry, 122, pixelRatio));
  context.fillStyle = '#f8fafc';
  context.fillRect(left, cardTop, maxWidth, px(geometry, 62, pixelRatio));
  context.fillStyle = '#64748b';
  font(context, geometry, pixelRatio, 2.4, 700);
  context.fillText('SOURCE', left + px(geometry, 6, pixelRatio), cardTop + px(geometry, 10, pixelRatio));
  context.fillStyle = '#0f172a';
  font(context, geometry, pixelRatio, 3.2, 600);
  drawWrappedText(context, metadata.sourceNames.length ? metadata.sourceNames.join(' · ') : 'Source name not declared by caller', left + px(geometry, 6, pixelRatio), cardTop + px(geometry, 17, pixelRatio), maxWidth - px(geometry, 12, pixelRatio), px(geometry, 4.8, pixelRatio), 4);
  context.fillStyle = '#64748b';
  font(context, geometry, pixelRatio, 2.4, 700);
  context.fillText('DOCUMENT REFERENCE', left + px(geometry, 6, pixelRatio), cardTop + px(geometry, 38, pixelRatio));
  context.fillStyle = '#0f172a';
  font(context, geometry, pixelRatio, 3, 650);
  context.fillText(metadata.documentCode, left + px(geometry, 6, pixelRatio), cardTop + px(geometry, 46, pixelRatio));
  context.fillStyle = '#64748b';
  font(context, geometry, pixelRatio, 2.5, 500);
  context.fillText(`Exported ${new Date(metadata.exportedAtIso).toLocaleString()} · LightBI ${metadata.version}`, left + px(geometry, 6, pixelRatio), cardTop + px(geometry, 54, pixelRatio));

  context.fillStyle = '#92400e';
  font(context, geometry, pixelRatio, 2.55, 600);
  drawWrappedText(context, 'Governed analytical evidence — review limitations and source data before making a decision.', left, px(geometry, 210, pixelRatio), maxWidth, px(geometry, 4.3, pixelRatio), 4);
  drawPageChrome(context, geometry, pixelRatio, metadata, 1, totalPages, 'Report cover');
  return { pageNumber: 1, dataUrl: canvas.toDataURL('image/png'), kind: 'cover' };
}

function renderAboutPage(
  geometry: ReportGeometry,
  pixelRatio: number,
  metadata: NormalizedAnalysisReportMetadataV1,
  pageNumber: number,
  totalPages: number,
): RenderedAnalysisReportPageV1 {
  const { canvas, context } = createPageCanvas(geometry, pixelRatio);
  const left = px(geometry, 20, pixelRatio);
  const maxWidth = geometry.pageWidthUnits * pixelRatio - left * 2;
  context.fillStyle = '#0f172a';
  font(context, geometry, pixelRatio, 6.2, 750);
  context.fillText('About this LightBI report', left, px(geometry, 48, pixelRatio));
  context.fillStyle = '#475569';
  font(context, geometry, pixelRatio, 3.2, 500);
  let y = drawWrappedText(context, 'This final page records the software identity, distribution location, contact channel, report reference and decision-use warnings attached to this export.', left, px(geometry, 61, pixelRatio), maxWidth, px(geometry, 5.2, pixelRatio), 5);

  const fields = [
    ['LightBI version', metadata.version],
    ['Distribution', metadata.distributionUrl],
    ['Contact', metadata.contact],
    ['Document reference', metadata.documentCode],
  ];
  y += px(geometry, 10, pixelRatio);
  for (const [label, value] of fields) {
    context.fillStyle = '#64748b';
    font(context, geometry, pixelRatio, 2.4, 700);
    context.fillText(label.toUpperCase(), left, y);
    context.fillStyle = '#0f172a';
    font(context, geometry, pixelRatio, 3, 600);
    y = drawWrappedText(context, value, left, y + px(geometry, 6, pixelRatio), maxWidth, px(geometry, 4.8, pixelRatio), 4) + px(geometry, 6, pixelRatio);
  }

  context.fillStyle = '#92400e';
  font(context, geometry, pixelRatio, 2.6, 750);
  context.fillText('DISCLAIMER & WARNINGS', left, y + px(geometry, 3, pixelRatio));
  y += px(geometry, 11, pixelRatio);
  metadata.disclaimer.forEach((item, index) => {
    context.fillStyle = '#475569';
    font(context, geometry, pixelRatio, 2.65, 500);
    y = drawWrappedText(context, `${index + 1}. ${item}`, left, y, maxWidth, px(geometry, 4.5, pixelRatio), 8) + px(geometry, 4, pixelRatio);
  });
  drawPageChrome(context, geometry, pixelRatio, metadata, pageNumber, totalPages, 'LightBI report information');
  return { pageNumber, dataUrl: canvas.toDataURL('image/png'), kind: 'about' };
}

export async function renderAnalysisReportPages(
  root: HTMLElement,
  pixelRatio = DEFAULT_PIXEL_RATIO,
  metadata?: AnalysisReportMetadataV1,
): Promise<RenderedAnalysisReportV1> {
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
    const captureFingerprints: string[] = [];
    for (const section of sections) {
      const dataUrl = await toPng(section.element, { backgroundColor: '#ffffff', cacheBust: true, pixelRatio });
      captureFingerprints.push(await sha256Hex(dataUrl));
      captures.set(section.id, await decodeImage(dataUrl));
    }
    const normalizedMetadata = await normalizeMetadata(metadata?.title || 'LightBI-BA', metadata, plan, captureFingerprints);
    const totalPages = plan.pages.length + 2;
    const pages: RenderedAnalysisReportPageV1[] = [renderCoverPage(geometry, pixelRatio, normalizedMetadata, totalPages)];

    for (const page of plan.pages) {
      const { canvas, context } = createPageCanvas(geometry, pixelRatio);
      for (const fragment of page.fragments) {
        const section = sections.find(item => item.id === fragment.sectionId);
        const image = captures.get(fragment.sectionId);
        if (!section || !image) throw new Error('REPORT_SECTION_CAPTURE_MISSING');
        const sourceY = fragment.sourceOffsetUnits / section.heightUnits * image.height;
        const sourceHeight = fragment.sourceHeightUnits / section.heightUnits * image.height;
        const destinationX = geometry.horizontalMarginUnits * pixelRatio;
        const destinationY = (geometry.contentTopUnits + fragment.pageOffsetUnits) * pixelRatio;
        const destinationWidth = rootWidth * pixelRatio;
        const destinationHeight = fragment.renderedHeightUnits * pixelRatio;
        context.drawImage(image, 0, sourceY, image.width, sourceHeight, destinationX, destinationY, destinationWidth, destinationHeight);
      }
      const overallPageNumber = page.pageNumber + 1;
      drawPageChrome(context, geometry, pixelRatio, normalizedMetadata, overallPageNumber, totalPages, roleHeading(page.fragments[0]?.role));
      pages.push({ pageNumber: overallPageNumber, dataUrl: canvas.toDataURL('image/png'), kind: 'content' });
    }
    pages.push(renderAboutPage(geometry, pixelRatio, normalizedMetadata, totalPages, totalPages));

    return {
      plan,
      pages,
      pageWidthUnits: geometry.pageWidthUnits,
      pageHeightUnits: geometry.pageHeightUnits,
      metadata: normalizedMetadata,
    };
  });
}

async function dataUrlBytes(dataUrl: string): Promise<Uint8Array> {
  const response = await fetch(dataUrl);
  return new Uint8Array(await response.arrayBuffer());
}

export async function saveAnalysisReportPngPages(
  root: HTMLElement,
  fileStem: string,
  metadata?: AnalysisReportMetadataV1,
): Promise<{ pageCount: number; format: 'png' | 'zip' }> {
  const report = await renderAnalysisReportPages(root, DEFAULT_PIXEL_RATIO, { ...metadata, title: metadata?.title ?? fileStem });
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

export async function saveAnalysisReportPdf(
  root: HTMLElement,
  fileStem: string,
  metadata?: AnalysisReportMetadataV1,
): Promise<{ pageCount: number }> {
  const report = await renderAnalysisReportPages(root, DEFAULT_PIXEL_RATIO, { ...metadata, title: metadata?.title ?? fileStem });
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
