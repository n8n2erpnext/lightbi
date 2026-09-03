import React, { useMemo } from 'react';
import { ArrowRight, ClipboardCheck, Target } from 'lucide-react';
import type { FocusSubjectComparison } from '../../lib/focus-subject-analysis';
import { deriveFocusSubjectNarrative } from '../../lib/focus-subject-analysis';

export const FocusSubjectContextBundle: React.FC<{ comparison: FocusSubjectComparison }> = ({ comparison }) => {
  const narrative = useMemo(() => deriveFocusSubjectNarrative(comparison), [comparison]);
  return <section data-testid="focus-context-bundle" className="mt-5 rounded-[16px] border border-violet-200 bg-violet-50/35 p-4">
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-violet-100 p-2 text-violet-700"><Target className="h-4 w-4" /></div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600">Analysis around the focus</p>
        <h3 className="mt-1 text-[15px] font-semibold text-slate-950">{narrative.headline}</h3>
        <p className="mt-1 text-[12px] leading-5 text-slate-500">{narrative.summary}</p>
      </div>
    </div>
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      {narrative.insights.map(insight => <article key={insight.id} className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-900"><ClipboardCheck className="h-3.5 w-3.5 text-violet-500" />{insight.title}</div>
        <p className="mt-2 text-[12px] leading-5 text-slate-600">{insight.statement}</p>
      </article>)}
    </div>
    <div className="mt-4 rounded-xl border border-violet-100 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Questions worth asking next</p>
      <div className="mt-2 grid gap-2">{narrative.followUpQuestions.map(question => <div key={question} className="flex items-start gap-2 text-[12px] leading-5 text-slate-600"><ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />{question}</div>)}</div>
    </div>
  </section>;
};

export const FocusSubjectBAAnswerCard: React.FC<{ comparison: FocusSubjectComparison; canAnalyzeDeeper: boolean; onAnalyzeDeeper: () => void }> = ({ comparison, canAnalyzeDeeper, onAnalyzeDeeper }) => {
  const narrative = useMemo(() => deriveFocusSubjectNarrative(comparison), [comparison]);
  return <section data-testid="focus-ba-answer" className="mt-5 rounded-[16px] border border-violet-200 bg-white shadow-sm">
    <div className="border-b border-violet-100 px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-600">BA answer · Focus context</p>
      <h3 className="mt-1 text-[16px] font-semibold text-slate-950">{narrative.headline}</h3>
      <p className="mt-1 text-[12px] leading-5 text-slate-500">{narrative.insights[0]?.statement ?? narrative.summary}</p>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <p className="max-w-3xl text-[12px] leading-5 text-slate-500">Deep BA will keep this same subject at the center instead of reverting to a population-only explanation.</p>
      <button type="button" disabled={!canAnalyzeDeeper} onClick={onAnalyzeDeeper} className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">Analyze this focus deeper</button>
    </div>
  </section>;
};
