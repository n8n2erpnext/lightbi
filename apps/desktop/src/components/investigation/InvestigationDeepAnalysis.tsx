import React, { useRef, useState } from 'react';
import { ArrowLeft, ClipboardCheck, Download, FileImage, FileText, LayoutDashboard, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import type { AnalysisAction } from '../../lib/analysis-opportunity-actions';
import { BADecisionBriefPanel } from '../analysis/BADecisionBriefPanel';
import type { BADecisionBrief } from '../../lib/ba-decision-engine';
import { createBusinessBrainBrief } from '../../lib/business-brain-brief';
import { BusinessBrainBriefPanel } from '../analysis/BusinessBrainBriefPanel';
import type { BusinessFusionOverview } from '../../lib/business-fusion-overview';
import { BusinessFusionOverviewCard } from '../analysis/BusinessFusionOverviewCard';
import type { ChartPreviewModel } from '../../lib/chart-preview-model';
import type { DisplayPreferences } from '../../stores/display-preferences-store';
import { BusinessFusionAngleReadout } from './InvestigationBAReadouts';
import { useUiLanguage } from '../../lib/ui-language';
import type { SingleSourceBAOverview } from '../../lib/single-source-ba-overview';
import { SingleSourceBAOverviewCard } from './SingleSourceBAOverviewCard';

export interface InvestigationDeepAnalysisProps {
  action: AnalysisAction;
  brief: BADecisionBrief | null;
  businessFusionOverview?: BusinessFusionOverview;
  singleSourceBAOverview?: SingleSourceBAOverview | null;
  chartModel: ChartPreviewModel | null;
  onClose: () => void;
  onCreateDashboard?: () => void;
  canCreateDashboard?: boolean;
  preferences: DisplayPreferences;
}

export const InvestigationDeepAnalysis: React.FC<InvestigationDeepAnalysisProps> = ({ action, brief, businessFusionOverview, singleSourceBAOverview, chartModel, onClose, onCreateDashboard, canCreateDashboard = false, preferences }) => {
  const { t, localize } = useUiLanguage();
  const exportRef = useRef<HTMLDivElement>(null);
  const [exportState, setExportState] = useState<'idle' | 'image' | 'pdf'>('idle');
  const [exportError, setExportError] = useState('');
  const fileStem = (localize(action.opportunityName) || 'LightBI-BA').replace(/[\\/:*?"<>|]+/g, '-').slice(0, 80);

  const renderAnalysisImage = async (): Promise<string> => {
    if (!exportRef.current) throw new Error(t('The analysis is not ready to export.', 'Bản phân tích chưa sẵn sàng để xuất.'));
    return toPng(exportRef.current, { backgroundColor: '#fbfbfa', cacheBust: true, pixelRatio: 2 });
  };

  const exportImage = async () => {
    setExportState('image'); setExportError('');
    try {
      const dataUrl = await renderAnalysisImage();
      const anchor = document.createElement('a');
      anchor.download = `${fileStem}-BA.png`; anchor.href = dataUrl; anchor.click();
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : t('Could not export the image.', 'Không thể xuất ảnh.')); }
    finally { setExportState('idle'); }
  };

  const exportPdf = async () => {
    setExportState('pdf'); setExportError('');
    try {
      const dataUrl = await renderAnalysisImage();
      const image = new Image(); image.src = dataUrl; await image.decode();
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
      const margin = 8; const pageWidth = pdf.internal.pageSize.getWidth(); const pageHeight = pdf.internal.pageSize.getHeight();
      const width = pageWidth - margin * 2; const height = image.height * width / image.width; const printable = pageHeight - margin * 2;
      for (let offset = 0, page = 0; offset < height; offset += printable, page += 1) {
        if (page > 0) pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', margin, margin - offset, width, height, undefined, 'FAST');
      }
      pdf.save(`${fileStem}-BA.pdf`);
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : t('Could not export the PDF.', 'Không thể xuất PDF.')); }
    finally { setExportState('idle'); }
  };
  return (
  <div className="fixed inset-0 z-40 flex justify-end bg-black/15 backdrop-blur-[1px]" onClick={onClose}>
    <aside className="h-full w-full max-w-[1120px] overflow-y-auto border-l border-black/10 bg-[#fbfbfa] shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-black/10 bg-white/95 px-6 py-5 backdrop-blur"><div className="flex items-start gap-3"><button data-testid="deep-analysis-back" onClick={onClose} className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/60 shadow-sm transition-colors hover:bg-black/[0.035] hover:text-black" title={t('Back to chart', 'Quay lại biểu đồ')}><ArrowLeft className="h-4 w-4" />{t('Back', 'Quay lại')}</button><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-600"><ClipboardCheck className="h-3.5 w-3.5" />{t('Deep BA analysis', 'Phân tích BA chuyên sâu')}</div><h2 className="mt-1 text-xl font-semibold text-[#202123]">{localize(action.opportunityName)}</h2><p className="mt-1 text-xs leading-5 text-black/50">{t('Explanation, governed evidence, caveats, drivers, and recommended actions for the decision angle currently shown in the chart.', 'Giải thích, bằng chứng có quản trị, lưu ý, tác nhân và hành động đề xuất cho góc nhìn đang hiển thị trên biểu đồ.')}</p></div></div><button onClick={onClose} className="rounded-full border border-black/10 bg-white p-2 text-black/50 shadow-sm transition-colors hover:bg-black/[0.035] hover:text-black" title={t('Close analysis panel', 'Đóng phân tích')}><X className="h-4 w-4" /></button></div>
      <div className="border-b border-black/5 bg-white px-5 py-3">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="mr-auto inline-flex items-center gap-2 text-xs text-black/45"><Download className="h-3.5 w-3.5" />{t('Export this complete perspective analysis', 'Xuất toàn bộ bản phân tích theo góc nhìn này')}</span>
          <button type="button" onClick={() => void exportImage()} disabled={exportState !== 'idle'} className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/65 shadow-sm hover:bg-black/[0.035] disabled:opacity-50"><FileImage className="h-4 w-4" />{exportState === 'image' ? t('Exporting…', 'Đang xuất…') : t('Export image', 'Xuất ảnh')}</button>
          <button type="button" onClick={() => void exportPdf()} disabled={exportState !== 'idle'} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"><FileText className="h-4 w-4" />{exportState === 'pdf' ? t('Exporting…', 'Đang xuất…') : t('Export PDF', 'Xuất PDF')}</button>
        </div>
        {exportError && <p role="alert" className="mt-2 text-xs text-red-600">{exportError}</p>}
      </div>
      <div ref={exportRef} className="p-5">
        {businessFusionOverview && <><BusinessBrainBriefPanel brief={createBusinessBrainBrief({ action, chartModel, overview: businessFusionOverview })} preferences={preferences} /><BusinessFusionAngleReadout action={action} chartModel={chartModel} overview={businessFusionOverview} preferences={preferences} /><div className="mb-5"><BusinessFusionOverviewCard overview={businessFusionOverview} /></div></>}
        {!businessFusionOverview && singleSourceBAOverview && <SingleSourceBAOverviewCard overview={singleSourceBAOverview} preferences={preferences} />}
        {brief ? <BADecisionBriefPanel brief={brief} /> : <div className="rounded-[16px] border border-black/10 bg-white p-6 text-sm text-black/55 shadow-sm">{t('Run the preview first, then LightBI can explain this decision angle in depth.', 'Hãy chạy biểu đồ trước, sau đó LightBI sẽ phân tích sâu góc nhìn quyết định này.')}</div>}
        {onCreateDashboard && <section data-testid="deep-analysis-dashboard-cta" className="mt-5 rounded-[18px] border border-blue-200 bg-gradient-to-r from-blue-50 to-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-700"><LayoutDashboard className="h-4 w-4" />{t('Next step', 'Bước tiếp theo')}</div>
              <h3 className="mt-2 text-lg font-semibold text-[#202123]">{t('Create a BI dashboard for this perspective', 'Tạo Dashboard BI theo góc nhìn này')}</h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-black/55">{t('LightBI will combine the primary answer, KPIs and supporting analyses into one governed dashboard.', 'LightBI sẽ kết hợp câu trả lời chính, KPI và các phân tích hỗ trợ thành một Dashboard có quản trị thống nhất.')}</p>
            </div>
            <button type="button" onClick={onCreateDashboard} disabled={!canCreateDashboard} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-black/20">
              <LayoutDashboard className="h-4 w-4" />{t('Create perspective dashboard', 'Tạo Dashboard theo góc nhìn')}
            </button>
          </div>
        </section>}
      </div>
    </aside>
  </div>
  );
};
