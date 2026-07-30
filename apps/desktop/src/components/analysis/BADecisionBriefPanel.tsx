import React from 'react';
import { AlertTriangle, BarChart3, ClipboardCheck, Lightbulb } from 'lucide-react';
import type { BADecisionBrief, BAInsightSeverity } from '../../lib/ba-decision-engine';
import { useUiLanguage } from '../../lib/ui-language';

interface BADecisionBriefPanelProps {
  brief: BADecisionBrief;
}

function severityClass(severity: BAInsightSeverity): string {
  switch (severity) {
    case 'positive':
      return 'border-emerald-100 bg-emerald-50 text-emerald-800';
    case 'warning':
      return 'border-amber-100 bg-amber-50 text-amber-800';
    case 'critical':
      return 'border-red-100 bg-red-50 text-red-800';
    case 'neutral':
    default:
      return 'border-slate-100 bg-slate-50 text-slate-800';
  }
}

export const BADecisionBriefPanel: React.FC<BADecisionBriefPanelProps> = ({ brief }) => {
  const { t } = useUiLanguage();
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/60 shadow-sm">
      <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">{t('Business analysis brief', 'Bản phân tích nghiệp vụ')}</div>
            <h3 className="mt-1 text-lg font-semibold text-emerald-950">{t('Executive answer', 'Câu trả lời điều hành')}</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-emerald-950/75">{brief.executiveSummary}</p>
          </div>
        </div>
          <div className="grid shrink-0 grid-cols-2 gap-2">
            <div className="min-w-24 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-center">
              <div className="text-2xl font-semibold text-emerald-900">{brief.decisionReadinessScore}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">{t('Ready', 'Sẵn sàng')}</div>
            </div>
            <div className="min-w-24 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-center">
              <div className="text-2xl font-semibold text-emerald-900">{brief.dataTrustScore}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">{t('Trust', 'Tin cậy')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
          {brief.recommendedCharts.length > 0 && (
            <div className="rounded-xl border border-blue-100 bg-white p-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
                {t('Recommended charts', 'Biểu đồ đề xuất')}
              </div>
              <div className="space-y-2">
                {brief.recommendedCharts.slice(0, 4).map(chart => (
                  <div key={`${chart.title}-${chart.chartType}`} className="text-xs text-slate-600">
                    <span className="font-medium text-slate-900">{chart.chartType}</span>
                    <span className="text-slate-400"> - </span>
                    {chart.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Lightbulb className="h-3.5 w-3.5" />
              {t('Where it changed', 'Thay đổi nằm ở đâu')}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {brief.insights.slice(0, 6).map(insight => (
                <div key={insight.id} className={`rounded-lg border p-3 ${severityClass(insight.severity)}`}>
                  <div className="mb-1 text-xs font-semibold">{insight.title}</div>
                  <p className="text-xs leading-5 opacity-90">{insight.statement}</p>
                  {insight.evidence.length > 0 && (
                    <ul className="mt-2 space-y-1 text-[11px] opacity-80">
                      {insight.evidence.slice(0, 3).map(item => (
                        <li key={item}>- {item}</li>
                      ))}
                    </ul>
                  )}
                  {insight.evidenceRows && insight.evidenceRows.length > 0 && (
                    <div className="mt-2 rounded border border-white/70 bg-white/60 p-2 text-[11px]">
                      <div className="mb-1 font-semibold opacity-80">Raw row pointers</div>
                      <div className="space-y-1">
                        {insight.evidenceRows.slice(0, 3).map(row => (
                          <div key={`${insight.id}-${row.rowIndex}`} className="font-mono opacity-80">
                            {row.label}: {Object.entries(row.values).map(([key, value]) => `${key}=${String(value)}`).join(', ')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <ClipboardCheck className="h-3.5 w-3.5" />
              {t('Decision suggestions', 'Đề xuất quyết định')}
            </div>
            <div className="space-y-2">
              {brief.decisionSuggestions.map(suggestion => (
                <div key={suggestion.title} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-900">{suggestion.title}</span>
                    <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500 ring-1 ring-slate-200">
                      {suggestion.priority}
                    </span>
                  </div>
                  <p className="text-xs leading-5 text-slate-600">{suggestion.action}</p>
                </div>
              ))}
            </div>
          </div>

          {brief.caveats.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t('Evidence limits and caveats', 'Giới hạn bằng chứng và lưu ý')}
              </div>
              <ul className="space-y-1 text-xs text-amber-800">
                {brief.caveats.slice(0, 4).map(caveat => (
                  <li key={caveat}>- {caveat}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
