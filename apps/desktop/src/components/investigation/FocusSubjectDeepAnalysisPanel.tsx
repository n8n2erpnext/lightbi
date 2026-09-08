import React, { useMemo } from 'react';
import { ArrowRight, Target } from 'lucide-react';
import type { AnalysisAction } from '../../lib/analysis-opportunity-actions';
import type { FocusSubjectComparison } from '../../lib/focus-subject-analysis';
import { deriveFocusSubjectNarrative } from '../../lib/focus-subject-analysis';

function n(value: number): string { return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(value); }

export const FocusSubjectDeepAnalysisPanel: React.FC<{ action: AnalysisAction; comparison: FocusSubjectComparison }> = ({ action, comparison }) => {
  const narrative = useMemo(() => deriveFocusSubjectNarrative(comparison), [comparison]);
  const primary = comparison.metrics[0] ?? null;
  return <section data-testid="focus-deep-analysis" data-layout="management-document" className="space-y-5">
    <section className="grid gap-3 border-y border-[var(--lb-divider)] py-4 md:grid-cols-[44px_minmax(0,1fr)]" data-section-number="01">
      <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">01</div><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-700"><Target className="h-4 w-4" />Focus retained across Deep BA</div><h3 className="mt-2 text-xl font-semibold text-slate-950">{comparison.subject.displayLabel}</h3><p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">{action.opportunityName}. {narrative.summary}</p></div>
    </section>
    {primary && <section className="grid gap-3 border-b border-[var(--lb-divider)] pb-4 md:grid-cols-[44px_minmax(0,1fr)]" data-section-number="02"><div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">02</div><div className="grid border-y border-[var(--lb-divider)] sm:grid-cols-4 sm:divide-x sm:divide-[var(--lb-divider)]">{[['Focus', primary.subjectValue], ['Average', primary.populationAverage], [`Top ${primary.cohortSize} avg`, primary.topAverage], [`Bottom ${primary.cohortSize} avg`, primary.bottomAverage]].map(([label, value]) => <div key={String(label)} className="px-3 py-3"><div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div><div className="mt-1 text-lg font-semibold text-slate-950">{n(Number(value))}</div></div>)}</div></section>}
    <section className="grid gap-3 border-b border-[var(--lb-divider)] pb-4 md:grid-cols-[44px_minmax(0,1fr)]" data-section-number="03"><div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">03</div><div className="divide-y divide-[var(--lb-divider)] border-y border-[var(--lb-divider)]">{narrative.insights.map(insight => <article key={insight.id} className="py-3"><h4 className="text-sm font-semibold text-slate-950">{insight.title}</h4><p className="mt-1 text-sm leading-6 text-slate-600">{insight.statement}</p></article>)}</div></section>
    <section className="grid gap-3 md:grid-cols-[44px_minmax(0,1fr)]" data-section-number="04"><div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">04</div><div><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">What should LightBI investigate next?</p><div className="mt-2 divide-y divide-[var(--lb-divider)] border-y border-[var(--lb-divider)]">{narrative.followUpQuestions.map(question => <div key={question} className="flex items-start gap-2 py-2.5 text-sm leading-6 text-slate-700"><ArrowRight className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />{question}</div>)}</div></div></section>
  </section>;
};
