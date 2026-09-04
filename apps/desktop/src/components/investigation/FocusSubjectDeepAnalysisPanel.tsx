import React, { useMemo } from 'react';
import { ArrowRight, Target } from 'lucide-react';
import type { AnalysisAction } from '../../lib/analysis-opportunity-actions';
import type { FocusSubjectComparison } from '../../lib/focus-subject-analysis';
import { deriveFocusSubjectNarrative } from '../../lib/focus-subject-analysis';

function n(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(value);
}

export const FocusSubjectDeepAnalysisPanel: React.FC<{ action: AnalysisAction; comparison: FocusSubjectComparison }> = ({ action, comparison }) => {
  const narrative = useMemo(() => deriveFocusSubjectNarrative(comparison), [comparison]);
  const primary = comparison.metrics[0] ?? null;
  return <section data-testid="focus-deep-analysis" className="space-y-5">
    <div className="rounded-[16px] border border-violet-200 bg-violet-50 p-5">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-700"><Target className="h-4 w-4" />Focus retained across Deep BA</div>
      <h3 className="mt-2 text-xl font-semibold text-slate-950">{comparison.subject.displayLabel}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{action.opportunityName}. {narrative.summary}</p>
      {primary && <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {[['Focus', primary.subjectValue], ['Average', primary.populationAverage], [`Top ${primary.cohortSize} avg`, primary.topAverage], [`Bottom ${primary.cohortSize} avg`, primary.bottomAverage]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-violet-100 bg-white p-3"><div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-lg font-semibold text-slate-950">{n(Number(value))}</div></div>)}
      </div>}
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      {narrative.insights.map(insight => <article key={insight.id} className="rounded-[16px] border border-black/10 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-950">{insight.title}</h4>
        <p className="mt-2 text-sm leading-6 text-slate-600">{insight.statement}</p>
      </article>)}
    </div>
    <div className="rounded-[16px] border border-emerald-200 bg-emerald-50/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">What should LightBI investigate next?</p>
      <div className="mt-3 grid gap-2">{narrative.followUpQuestions.map(question => <div key={question} className="flex items-start gap-2 text-sm leading-6 text-emerald-950"><ArrowRight className="mt-1 h-4 w-4 shrink-0" />{question}</div>)}</div>
    </div>
  </section>;
};
