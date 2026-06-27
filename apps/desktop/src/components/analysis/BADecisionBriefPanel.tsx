import React from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, ClipboardCheck, Lightbulb, ShieldCheck } from 'lucide-react';
import type { BADecisionBrief, BAInsightSeverity } from '../../lib/ba-decision-engine';

interface BADecisionBriefPanelProps {
  brief: BADecisionBrief;
}

function scoreClass(score: number): string {
  if (score >= 80) return 'text-emerald-700 bg-emerald-50 border-emerald-100';
  if (score >= 60) return 'text-amber-700 bg-amber-50 border-amber-100';
  return 'text-red-700 bg-red-50 border-red-100';
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
  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-indigo-50 text-indigo-600">
            <ClipboardCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-950">BA Decision Brief</h3>
            <p className="mt-1 text-xs leading-5 text-slate-600">{brief.executiveSummary}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[260px_1fr]">
        <div className="space-y-3">
          <div className={`rounded-md border p-3 ${scoreClass(brief.dataTrustScore)}`}>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              Data Trust Score
            </div>
            <div className="text-2xl font-semibold leading-none">{brief.dataTrustScore}</div>
          </div>

          <div className={`rounded-md border p-3 ${scoreClass(brief.decisionReadinessScore)}`}>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Decision Readiness
            </div>
            <div className="text-2xl font-semibold leading-none">{brief.decisionReadinessScore}</div>
          </div>

          {brief.scoreBreakdown.length > 0 && (
            <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
              <div className="mb-2 text-xs font-semibold text-slate-700">Score Breakdown</div>
              <div className="space-y-1.5">
                {brief.scoreBreakdown.slice(0, 5).map(item => (
                  <div key={item.label} title={item.reason} className="flex items-center justify-between gap-3 text-[11px] text-slate-600">
                    <span className="truncate">{item.label}</span>
                    <span className={item.score < 0 ? 'font-mono text-red-600' : 'font-mono text-slate-900'}>
                      {item.score > 0 ? '+' : ''}{item.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {brief.recommendedCharts.length > 0 && (
            <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <BarChart3 className="h-3.5 w-3.5 text-blue-500" />
                Recommended Charts
              </div>
              <div className="space-y-2">
                {brief.recommendedCharts.slice(0, 2).map(chart => (
                  <div key={`${chart.title}-${chart.chartType}`} className="text-xs text-slate-600">
                    <span className="font-medium text-slate-900">{chart.chartType}</span>
                    <span className="text-slate-400"> - </span>
                    {chart.reason}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Lightbulb className="h-3.5 w-3.5" />
              Key Insights
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {brief.insights.slice(0, 4).map(insight => (
                <div key={insight.id} className={`rounded-md border p-3 ${severityClass(insight.severity)}`}>
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

          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <ClipboardCheck className="h-3.5 w-3.5" />
              Decision Suggestions
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
            <div className="rounded-md border border-amber-100 bg-amber-50 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" />
                Data Caveats
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
