import React from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { SingleSourceBAOverview, DeepBAFinding } from '../../lib/single-source-ba-overview';
import type { SingleSourceAnalysisNarrativePlanV1, AnalysisNarrativeSectionV1 } from '../../lib/analysis-narrative-plan';
import { createEvidenceInspectorModel, projectDeepBAFindingProvenance } from '../../lib/presentation-provenance';
import { useUiLanguage } from '../../lib/ui-language';
import { EvidenceInspector } from '../analysis/EvidenceInspector';

const ROLE_LABELS: Record<AnalysisNarrativeSectionV1['role'], string> = {
  key_driver: 'Main observed contributors',
  risk_exception: 'Risks & exceptions',
  hypothesis: 'Hypotheses to verify',
  supporting_observation: 'Supporting observations',
  unknown: 'What is still unknown?',
  next_action: 'What can be checked next?',
  supporting_evidence: 'Supporting evidence & checks',
};

const BASIS_LABELS = {
  evidence_backed: 'Evidence-backed',
  hypothesis: 'Hypothesis',
  needs_verification: 'Needs verification',
} as const;

const CONFIDENCE_STYLES = {
  high: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  low: 'border-slate-200 bg-slate-50 text-slate-700',
} as const;

function FindingView({ finding, overview, usesDomainContext = false, primary = false }: { finding: DeepBAFinding; overview: SingleSourceBAOverview; usesDomainContext?: boolean; primary?: boolean }) {
  const { t } = useUiLanguage();
  return <article data-testid={primary ? 'deep-ba-narrative-primary' : `deep-ba-narrative-finding-${finding.id}`} className={primary ? 'border-l-2 border-blue-300 py-1 pl-4 pr-2' : 'border-l border-slate-200 py-1 pl-3 pr-2'}>
    <div className="flex flex-wrap items-center gap-2">
      <strong className={primary ? 'text-base text-slate-950' : 'text-xs text-slate-900'}>{t(finding.title)}</strong>
      <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${CONFIDENCE_STYLES[finding.confidence]}`}>{t(`${finding.confidence} confidence`)}</span>
      <span className="rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-700">{t(BASIS_LABELS[finding.basis])}</span>
      {finding.priorityScore !== undefined && <span className="text-[10px] text-slate-500">{t('Priority score')}: {finding.priorityScore}</span>}
    </div>
    <p className={primary ? 'mt-3 text-sm leading-6 text-slate-800' : 'mt-2 text-xs leading-5 text-slate-700'}>{t(finding.statement)}</p>
    <EvidenceInspector model={createEvidenceInspectorModel(projectDeepBAFindingProvenance(finding, overview.investigation?.analysisAuthority ?? overview.analysisAuthority ?? null, { usesDomainContext }))} />
    {finding.evidenceRows.length > 0 && <details className="mt-2">
      <summary className="cursor-pointer text-[10px] font-semibold text-blue-700">{t('View evidence rows')} ({finding.evidenceRows.length})</summary>
      <div className="mt-2 space-y-1">{finding.evidenceRows.map(row => <div key={`${finding.id}-${row.rowIndex}`} className="rounded bg-slate-50 px-2 py-1.5 text-[10px] text-slate-600"><span className="font-semibold">{t(row.label)}</span> · {Object.entries(row.values).map(([field, value]) => `${field}=${String(value ?? '∅')}`).join(' · ')}</div>)}</div>
    </details>}
  </article>;
}

export const AnalysisNarrativeBoard: React.FC<{ overview: SingleSourceBAOverview; plan: SingleSourceAnalysisNarrativePlanV1 }> = ({ overview, plan }) => {
  const { t, localize } = useUiLanguage();
  const investigation = overview.investigation;
  if (!investigation || !plan.primaryAnswer) return null;
  return <section data-testid="deep-ba-investigation" className="border-y border-slate-200 bg-transparent">
    <div className="border-b border-slate-200 px-5 py-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700"><Search className="h-4 w-4" />{t('Analysis narrative')}</div>
      <h4 className="mt-1 text-base font-semibold text-slate-950">{t('Answer first, then evidence, contributors, risks, and unknowns')}</h4>
      <p className="mt-1 text-xs leading-5 text-slate-500">{t('Narrative order may use bounded domain advice; every finding keeps its original evidence basis and authority.')}</p>
    </div>
    <div className="p-5">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('Main answer')}</div>
      <FindingView finding={plan.primaryAnswer.finding} overview={overview} primary />
    </div>
    <div className="divide-y divide-slate-100 border-t border-slate-100">
      {plan.sections.map(section => <details key={section.role} open={!section.collapsedByDefault} className="group px-5 py-4" data-testid={`deep-ba-narrative-section-${section.role}`}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-900">
          <span>{t(ROLE_LABELS[section.role])}</span><ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3">
          {section.findingItems.length > 0 && <div className="grid gap-3 lg:grid-cols-2">{section.findingItems.map(item => <FindingView key={item.finding.id} finding={item.finding} overview={overview} usesDomainContext={item.role === 'hypothesis'} />)}</div>}
          {section.unknownItems.length > 0 && <div className="space-y-2">{section.unknownItems.map((item, index) => <div key={`${index}-${item.unknown.label}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs"><strong className="text-amber-900">{t(item.unknown.label)}</strong><p className="mt-1 text-amber-800">{t(item.unknown.impact)}</p>{item.unknown.missingSignals.length > 0 && <div className="mt-1 text-[10px] text-amber-700">{t('Missing')}: {item.unknown.missingSignals.map(signal => t(signal)).join(', ')}</div>}</div>)}</div>}
          {section.role === 'unknown' && plan.advisory.abstainWhen.length > 0 && <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50 p-3 text-xs text-violet-800"><strong>{t('Advisory abstention checks')}</strong><ul className="mt-1 space-y-1">{plan.advisory.abstainWhen.map(item => <li key={item}>• {t(item)}</li>)}</ul><p className="mt-2 text-[10px] text-violet-600">{t('Micro Brain advisory only — these checks cannot strengthen analysis authority.')}</p></div>}
          {section.actionItems.length > 0 && <div className="space-y-2">{section.actionItems.map(item => <article key={`${item.action.priority}-${item.action.title}`} className="rounded-lg border border-slate-200 bg-white p-3 text-xs"><div className="flex flex-wrap gap-2"><strong>{t(item.action.priority.toUpperCase())} · {t(item.action.title)}</strong><span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] uppercase text-blue-700">{t(BASIS_LABELS[item.action.basis])}</span></div><p className="mt-1 text-slate-700">{localize(item.action.action)}</p><p className="mt-1 text-[10px] text-slate-500">{t('Verify')}: {t(item.action.verification)}</p></article>)}</div>}
          {section.role === 'supporting_evidence' && <div className="grid gap-3 lg:grid-cols-2">
            {investigation.decompositions.filter(item => plan.supporting.decompositionIds.includes(item.id)).map(item => <article key={item.id} className="rounded-lg border border-slate-200 p-3"><div className="flex items-center justify-between gap-2"><strong className="text-xs text-slate-900">{t(item.label)}</strong><span className="text-[10px] uppercase text-slate-500">{t(item.status)}</span></div><div className="mt-2 space-y-1">{item.components.map(component => <div key={component.label} className="flex justify-between gap-3 text-[11px]"><span className="text-slate-700">{t(component.label)}</span><span className={component.status === 'observed' ? 'text-emerald-700' : 'text-amber-700'}>{component.field ?? t('Missing')}</span></div>)}</div>{item.caveat && <p className="mt-2 text-[10px] leading-4 text-amber-700">{t(item.caveat)}</p>}</article>)}
            {investigation.comparisons.filter(item => plan.supporting.comparisonKinds.includes(item.kind)).map(item => <div key={item.kind} className="rounded-lg border border-slate-200 p-3 text-xs"><div className="flex justify-between gap-2"><strong>{t(item.label)}</strong><span className="text-emerald-700">{t(item.status)}</span></div><p className="mt-1 text-slate-600">{t(item.statement)}</p></div>)}
          </div>}
          {section.role === 'supporting_evidence' && investigation.followUpQuestions.length > 0 && <ol className="mt-3 space-y-2">{investigation.followUpQuestions.slice(0, plan.supporting.followUpQuestionCount).map((item, index) => <li key={`${index}-${item.question}`} className="rounded-lg border border-slate-200 p-3 text-xs"><strong>{index + 1}. {t(item.question)}</strong><p className="mt-1 text-slate-500">{t(item.rationale)}</p></li>)}</ol>}
        </div>
      </details>)}
    </div>
  </section>;
};
