import React from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { DecisionTrustIssue, DecisionTrustReport } from '../../lib/decision-trust-report';

interface DecisionTrustReportCardProps {
  report: DecisionTrustReport;
}

function tierClass(report: DecisionTrustReport): string {
  if (report.tier === 'safe_to_decide') return 'border-emerald-100 bg-emerald-50 text-emerald-900';
  if (report.tier === 'review_before_deciding') return 'border-amber-100 bg-amber-50 text-amber-900';
  return 'border-red-100 bg-red-50 text-red-900';
}

function issueIcon(issue: DecisionTrustIssue) {
  if (issue.severity === 'critical') return <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />;
  if (issue.severity === 'warning') return <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />;
  return <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />;
}

export const DecisionTrustReportCard: React.FC<DecisionTrustReportCardProps> = ({ report }) => (
  <section className={`rounded-xl border p-4 shadow-sm ${tierClass(report)}`}>
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {report.tier === 'safe_to_decide' ? <ShieldCheck className="h-5 w-5 text-emerald-700" /> : <ShieldAlert className="h-5 w-5" />}
          <h3 className="text-[15px] font-semibold">{report.headline}</h3>
        </div>
        <p className="mt-1 text-[13px] leading-5 opacity-80">{report.explanation}</p>
        <p className="mt-2 text-[13px] font-medium leading-5">{report.recommendation}</p>
      </div>
      <div className="flex h-16 w-20 shrink-0 items-center justify-center rounded-lg border border-white/70 bg-white/70">
        <div className="text-center">
          <div className="text-2xl font-semibold leading-none">{report.score}</div>
          <div className="mt-1 text-[10px] font-semibold uppercase opacity-60">trust</div>
        </div>
      </div>
    </div>

    {report.issues.length > 0 && (
      <div className="mt-4 grid gap-2">
        {report.issues.slice(0, 5).map(issue => (
          <div key={`${issue.type}:${issue.title}`} className="rounded-lg border border-white/70 bg-white/70 p-3 text-slate-800">
            <div className="flex items-start gap-2">
              {issueIcon(issue)}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold">{issue.title}</span>
                  {issue.percent !== undefined && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{Math.round(issue.percent)}%</span>}
                  {issue.count !== undefined && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">{issue.count.toLocaleString()} affected</span>}
                </div>
                <p className="mt-0.5 text-[12px] leading-5 text-slate-600">{issue.detail}</p>
                {issue.evidence.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {issue.evidence.slice(0, 3).map(item => (
                      <span key={item} className="rounded border border-slate-100 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500">{item}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    )}

    {report.issues.length === 0 && (
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-white/70 bg-white/70 p-3 text-[13px] text-emerald-800">
        <CheckCircle2 className="h-4 w-4" />
        No major trust blockers found in the available profile.
      </div>
    )}
  </section>
);
