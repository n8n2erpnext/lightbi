import React from 'react';
import ReactECharts from 'echarts-for-react';
import { ChevronRight } from 'lucide-react';
import { homeGuidance } from '../../content/home-guidance';
import { businessReasonSummary } from '../../lib/business-reason-copy';
import { useUiLanguage } from '../../lib/ui-language';


const HomeBlockedReasons: React.FC<{ reasons: string[] }> = ({ reasons }) => {
  const { t } = useUiLanguage();
  return <p className="mt-2 break-words text-[11px] text-amber-800">{businessReasonSummary(reasons).map(reason => t(reason)).join(' ')}</p>;
};

interface HomeResultViewProps {
  result: any;
  chartOption: any;
  onFollowUp: (question: string) => void;
}

export const HomeResultView: React.FC<HomeResultViewProps> = ({ result, chartOption, onFollowUp }) => (
  result?.status === 'blocked' ? (
    <div role="alert" data-testid="home-analysis-blocked" className="mt-4 w-full border-l-2 border-amber-400 bg-amber-50 px-4 py-3 text-amber-900">
      <h3 className="text-sm font-semibold">Analysis needs source review</h3>
      <p className="mt-1 text-xs leading-5">{result.message || 'This analysis cannot run with the current governed source state.'}</p>
      {Array.isArray(result.blockedReasons) && result.blockedReasons.length > 0 && (
        <HomeBlockedReasons reasons={result.blockedReasons} />
      )}
    </div>
  ) : (
    <div className="mb-16 mt-4 flex w-full animate-in flex-col gap-6 fade-in slide-in-from-bottom-4 duration-500">
      <section data-testid="home-execution-pipeline" className="border-y border-[var(--lb-divider)] bg-white py-4">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Execution Pipeline</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] md:items-center">
          {[
            ['Question', `"${result.originalQuestion || 'Analyzed Query'}"`],
            ['Template', result.template.name],
            ['Chart', result.chart.chart_type],
            ['Insight', `${Math.round(result.insight.confidence * 100)}% Confidence`],
          ].map(([label, value], index) => (
            <React.Fragment key={String(label)}>
              <div className="min-w-0 px-1 py-1">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-gray-500">{label}</span>
                <span className={`block truncate text-[13px] font-medium ${label === 'Insight' ? 'text-emerald-700' : 'text-gray-900'}`} title={String(value)}>{value}</span>
              </div>
              {index < 3 && <ChevronRight className="hidden h-4 w-4 shrink-0 text-gray-300 md:block" />}
            </React.Fragment>
          ))}
        </div>
      </section>

      <section className="grid border-y border-[var(--lb-divider)] lg:grid-cols-3 lg:divide-x lg:divide-[var(--lb-divider)]">
        <div className="flex flex-col px-1 py-5 lg:pr-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Key Insight</h3>
          <p className="flex-1 text-sm leading-relaxed text-gray-700">{result.insight.observation_text}</p>
          <div className="mt-4 flex items-center justify-between border-t border-[var(--lb-divider)] pt-3 text-[12px] text-gray-500">
            <span>Confidence Score</span>
            <span className="font-medium text-emerald-700">{Math.round(result.insight.confidence * 100)}%</span>
          </div>
        </div>
        <div className="min-w-0 py-5 lg:col-span-2 lg:pl-5">
          <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500">{result.chart.theme_metadata.title}</h3>
          <div className="min-h-[300px] w-full">
            <ReactECharts option={chartOption} style={{ height: '100%', minHeight: 300, width: '100%' }} notMerge />
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--lb-divider)] pt-6">
        <h3 className="mb-4 text-[15px] font-semibold text-gray-900">{homeGuidance.sections.followUpActions}</h3>
        <div className="divide-y divide-[var(--lb-divider)] border-y border-[var(--lb-divider)]">
          {homeGuidance.homeStates.analysisReady.actions.map((suggestion, idx) => (
            <button key={idx} onClick={() => onFollowUp(suggestion)} className="flex w-full items-center justify-between gap-3 px-1 py-3 text-left text-[13px] font-medium text-gray-700 transition-colors hover:bg-black/[0.025]">
              <span>{suggestion}</span><ChevronRight className="h-4 w-4 shrink-0 text-black/25" />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
);
