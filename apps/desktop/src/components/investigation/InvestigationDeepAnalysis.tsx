import React from 'react';
import { ClipboardCheck, X } from 'lucide-react';
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
  preferences: DisplayPreferences;
}

export const InvestigationDeepAnalysis: React.FC<InvestigationDeepAnalysisProps> = ({ action, brief, businessFusionOverview, singleSourceBAOverview, chartModel, onClose, preferences }) => {
  const { t } = useUiLanguage();
  return (
  <div className="fixed inset-0 z-40 flex justify-end bg-black/15 backdrop-blur-[1px]" onClick={onClose}>
    <aside className="h-full w-full max-w-[1120px] overflow-y-auto border-l border-black/10 bg-[#fbfbfa] shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-black/10 bg-white/95 px-6 py-5 backdrop-blur"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-600"><ClipboardCheck className="h-3.5 w-3.5" />{t('Deep BA analysis', 'Phân tích BA chuyên sâu')}</div><h2 className="mt-1 text-xl font-semibold text-[#202123]">{action.opportunityName}</h2><p className="mt-1 text-xs leading-5 text-black/50">{t('Explanation, governed evidence, caveats, drivers, and recommended actions for the decision angle currently shown in the chart.', 'Giải thích, bằng chứng có quản trị, lưu ý, tác nhân và hành động đề xuất cho góc nhìn đang hiển thị trên biểu đồ.')}</p></div><button onClick={onClose} className="rounded-full border border-black/10 bg-white p-2 text-black/50 shadow-sm transition-colors hover:bg-black/[0.035] hover:text-black" title={t('Close analysis panel', 'Đóng phân tích')}><X className="h-4 w-4" /></button></div>
      <div className="p-5">
        {businessFusionOverview && <><BusinessBrainBriefPanel brief={createBusinessBrainBrief({ action, chartModel, overview: businessFusionOverview })} preferences={preferences} /><BusinessFusionAngleReadout action={action} chartModel={chartModel} overview={businessFusionOverview} preferences={preferences} /><div className="mb-5"><BusinessFusionOverviewCard overview={businessFusionOverview} /></div></>}
        {!businessFusionOverview && singleSourceBAOverview && <SingleSourceBAOverviewCard overview={singleSourceBAOverview} preferences={preferences} />}
        {brief ? <BADecisionBriefPanel brief={brief} /> : <div className="rounded-[16px] border border-black/10 bg-white p-6 text-sm text-black/55 shadow-sm">{t('Run the preview first, then LightBI can explain this decision angle in depth.', 'Hãy chạy biểu đồ trước, sau đó LightBI sẽ phân tích sâu góc nhìn quyết định này.')}</div>}
      </div>
    </aside>
  </div>
  );
};
