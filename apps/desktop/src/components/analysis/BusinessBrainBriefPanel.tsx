import React from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Search, ShieldAlert, Target } from 'lucide-react';
import type { BusinessBrainBrief, BusinessBrainKpi } from '../../lib/business-brain-brief';
import { formatValue } from '../../lib/display-formatter';
import type { DisplayPreferences } from '../../stores/display-preferences-store';

interface BusinessBrainBriefPanelProps {
  brief: BusinessBrainBrief;
  preferences: DisplayPreferences;
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'n/a';
  return `${Math.round(value * 100)}%`;
}

function formatKpiValue(kpi: BusinessBrainKpi, preferences: DisplayPreferences): string {
  if (kpi.value !== undefined && kpi.value >= 0 && kpi.value <= 1 && /share|rate|margin|pct/i.test(kpi.id + kpi.label)) {
    return formatPercent(kpi.value);
  }
  const value = kpi.currentValue ?? kpi.value;
  if (value === undefined) return 'available';
  return formatValue(value, 'number', preferences, { compact: true });
}

function readinessStyle(readiness: BusinessBrainBrief['readiness']): string {
  if (readiness === 'ready') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (readiness === 'partial') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-red-200 bg-red-50 text-red-800';
}

const EvidenceLine: React.FC<{ kpi: BusinessBrainKpi; tone?: 'default' | 'indigo' }> = ({ kpi, tone = 'default' }) => {
  const textClass = tone === 'indigo' ? 'text-indigo-950/45' : 'text-black/45';
  const evidence = [
    kpi.formula ? `Formula: ${kpi.formula}` : null,
    kpi.sourceColumns?.length ? `Columns: ${kpi.sourceColumns.join(', ')}` : null
  ].filter(Boolean);
  if (evidence.length === 0) return null;
  return <p className={`mt-1 text-[11px] ${textClass}`}>{evidence.join(' · ')}</p>;
};

export const BusinessBrainBriefPanel: React.FC<BusinessBrainBriefPanelProps> = ({ brief, preferences }) => {
  return (
    <section className="mb-5 overflow-hidden rounded-[16px] border border-black/10 bg-white shadow-sm">
      <div className="border-b border-black/10 bg-[#101827] px-5 py-4 text-white">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-200">
              <ClipboardCheck className="h-4 w-4" />
              Business Brain Report
            </div>
            <h3 className="mt-2 text-xl font-semibold">{brief.angle}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">{brief.businessQuestion}</p>
          </div>
          <div className={`rounded-xl border px-4 py-3 text-center ${readinessStyle(brief.readiness)}`}>
            <p className="text-2xl font-semibold">{brief.readiness.toUpperCase()}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide">Decision readiness</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-950">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4" />
            Main Answer
          </div>
          <p className="mt-2 text-sm leading-6">{brief.narrative.mainAnswer}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#202123]">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              KPI
            </div>
            <div className="mt-3 grid gap-2">
              {brief.kpis.length > 0 ? brief.kpis.slice(0, 6).map(kpi => (
                <div key={`${kpi.id}-${kpi.label}`} className="rounded-lg bg-black/[0.025] px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#202123]">{kpi.label}</p>
                      <p className="mt-1 text-[11px] text-black/45">Source: {kpi.source} · confidence {Math.round(kpi.confidence * 100)}%</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-[#202123]">{formatKpiValue(kpi, preferences)}</p>
                  </div>
                  {kpi.delta !== undefined && (
                    <p className="mt-1 text-xs text-black/55">
                      Delta {formatValue(kpi.delta, 'number', preferences, { compact: true })} ({formatPercent(kpi.deltaPercent)})
                    </p>
                  )}
                  <EvidenceLine kpi={kpi} />
                </div>
              )) : (
                <p className="text-sm text-black/50">No safe KPI was generated for this angle.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#202123]">
              <CheckCircle2 className="h-4 w-4 text-indigo-600" />
              Variance
            </div>
            <div className="mt-3 grid gap-2">
              {brief.variance.length > 0 ? brief.variance.slice(0, 6).map(kpi => (
                <div key={`${kpi.id}-${kpi.label}`} className="rounded-lg bg-indigo-50 px-3 py-2">
                  <p className="text-sm font-semibold text-indigo-950">{kpi.label}</p>
                  <p className="mt-1 text-xs text-indigo-950/70">
                    {formatValue(kpi.previousValue ?? 0, 'number', preferences, { compact: true })}
                    {' -> '}
                    {formatValue(kpi.currentValue ?? 0, 'number', preferences, { compact: true })}
                    {kpi.delta !== undefined && (
                      <span> · delta {formatValue(kpi.delta, 'number', preferences, { compact: true })} ({formatPercent(kpi.deltaPercent)})</span>
                  )}
                  </p>
                  <p className="mt-1 text-[11px] text-indigo-950/45">Source: {kpi.source}</p>
                  <EvidenceLine kpi={kpi} tone="indigo" />
                </div>
              )) : (
                <p className="text-sm text-black/50">No safe variance was generated for this angle.</p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-black/10 bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#202123]">
            <Search className="h-4 w-4 text-blue-600" />
            Root Cause
          </div>
          <ul className="mt-3 grid gap-2 text-sm leading-5 text-black/65 md:grid-cols-2">
            {brief.rootCauses.length > 0 ? brief.rootCauses.slice(0, 6).map(cause => (
              <li key={cause.id} className="rounded-lg bg-blue-50 px-3 py-2">
                <span className="font-semibold text-blue-950">{cause.label}</span>
                {cause.delta !== undefined && <span> · delta {formatValue(cause.delta, 'number', preferences, { compact: true })}</span>}
              </li>
            )) : (
              <li>No ranked driver is available yet.</li>
            )}
          </ul>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-950">
              <ShieldAlert className="h-4 w-4" />
              Risks
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-amber-950/80">
              {brief.risks.length > 0 ? brief.risks.slice(0, 5).map(risk => (
                <li key={risk.id}>
                  <span className="font-semibold">{risk.title}</span>: {risk.message}
                </li>
              )) : (
                <li>No major business risk was generated for this angle.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-violet-950">
              <ClipboardCheck className="h-4 w-4" />
              Recommendations
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-violet-950/80">
              {brief.recommendations.length > 0 ? brief.recommendations.map(recommendation => (
                <li key={`${recommendation.type}-${recommendation.title}`}>
                  <span className="font-semibold">{recommendation.title}</span>: {recommendation.action}
                </li>
              )) : (
                <li>No recommendation can be made safely yet.</li>
              )}
            </ul>
          </div>
        </div>

        {brief.nextQuestions.length > 0 && (
          <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-sky-950">
              <Search className="h-4 w-4" />
              Next Questions
            </div>
            <ul className="mt-3 grid gap-2 text-sm leading-5 text-sky-950/80 md:grid-cols-2">
              {brief.nextQuestions.map(question => (
                <li key={question} className="rounded-lg bg-white/70 px-3 py-2">{question}</li>
              ))}
            </ul>
          </div>
        )}

        {brief.evidence.length > 0 && (
          <details className="rounded-xl border border-black/10 bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[#202123]">Evidence audit trail</summary>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {brief.evidence.slice(0, 10).map(item => (
                <div key={item.id} className="rounded-lg bg-black/[0.025] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-[#202123]">{item.label}</p>
                    <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-black/45">{item.type.replace('_', ' ')}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-black/45">Source: {item.source}{item.confidence !== undefined ? ` · confidence ${Math.round(item.confidence * 100)}%` : ''}</p>
                  <ul className="mt-2 space-y-1 text-xs leading-5 text-black/60">
                    {item.details.slice(0, 3).map(detail => <li key={detail}>- {detail}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </details>
        )}

        {brief.missingEvidence.length > 0 && (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-red-950">
              <AlertTriangle className="h-4 w-4" />
              Missing Evidence
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-5 text-red-950/80">
              {brief.missingEvidence.map(item => (
                <li key={item.id}>
                  <span className="font-semibold">{item.label}</span> for {item.neededFor}: {item.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};
