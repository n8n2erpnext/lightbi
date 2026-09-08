import React from 'react';
import { ChevronDown, Search } from 'lucide-react';
import type { SingleSourceBAOverview, DeepBAFinding } from '../../lib/single-source-ba-overview';
import type { SingleSourceAnalysisNarrativePlanV1, AnalysisNarrativeSectionV1 } from '../../lib/analysis-narrative-plan';
import { createEvidenceInspectorModel, projectDeepBAFindingProvenance } from '../../lib/presentation-provenance';
import { useUiLanguage } from '../../lib/ui-language';
import { EvidenceInspector } from '../analysis/EvidenceInspector';

const ROLE_LABELS: Record<AnalysisNarrativeSectionV1['role'], string> = {
  key_driver: 'Main observed contributors', risk_exception: 'Risks & exceptions', hypothesis: 'Hypotheses to verify',
  supporting_observation: 'Supporting observations', unknown: 'What is still unknown?', next_action: 'What can be checked next?', supporting_evidence: 'Supporting evidence & checks',
};
const BASIS_LABELS = { evidence_backed: 'Evidence-backed', hypothesis: 'Hypothesis', needs_verification: 'Needs verification' } as const;
const CONFIDENCE_STYLES = { high: 'border-emerald-200 bg-emerald-50 text-emerald-800', medium: 'border-amber-200 bg-amber-50 text-amber-800', low: 'border-slate-200 bg-slate-50 text-slate-700' } as const;

function FindingView({ finding, overview, usesDomainContext = false, primary = false }: { finding: DeepBAFinding; overview: SingleSourceBAOverview; usesDomainContext?: boolean; primary?: boolean }) {
  const { t } = useUiLanguage();
  return <article data-testid={primary ? 'deep-ba-narrative-primary' : `deep-ba-narrative-finding-${finding.id}`} className={primary ? 'py-2' : 'py-3'}>
    <div className="flex flex-wrap items-center gap-2">
      <strong className={primary ? 'text-[17px] leading-6 text-slate-950' : 'text-[13px] text-slate-900'}>{t(finding.title)}</strong>
      <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase ${CONFIDENCE_STYLES[finding.confidence]}`}>{t(`${finding.confidence} confidence`)}</span>
      <span className="rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-blue-700">{t(BASIS_LABELS[finding.basis])}</span>
      {finding.priorityScore !== undefined && <span className="text-[10px] text-slate-500">{t('Priority score')}: {finding.priorityScore}</span>}
    </div>
    <p className={primary ? 'mt-3 max-w-4xl text-[14px] leading-6 text-slate-800' : 'mt-1.5 max-w-4xl text-[12px] leading-5 text-slate-700'}>{t(finding.statement)}</p>
    <EvidenceInspector model={createEvidenceInspectorModel(projectDeepBAFindingProvenance(finding, overview.investigation?.analysisAuthority ?? overview.analysisAuthority ?? null, { usesDomainContext }))} />
    {finding.evidenceRows.length > 0 && <details className="mt-2">
      <summary className="cursor-pointer text-[10px] font-semibold text-blue-700">{t('View evidence rows')} ({finding.evidenceRows.length})</summary>
      <div className="mt-2 divide-y divide-slate-100 border-y border-slate-100">{finding.evidenceRows.map(row => <div key={`${finding.id}-${row.rowIndex}`} className="py-2 text-[10px] text-slate-600"><span className="font-semibold">{t(row.label)}</span> · {Object.entries(row.values).map(([field, value]) => `${field}=${String(value ?? '∅')}`).join(' · ')}</div>)}</div>
    </details>}
  </article>;
}

export const AnalysisNarrativeBoard: React.FC<{ overview: SingleSourceBAOverview; plan: SingleSourceAnalysisNarrativePlanV1 }> = ({ overview, plan }) => {
  const { t, localize } = useUiLanguage();
  const investigation = overview.investigation;
  if (!investigation || !plan.primaryAnswer) return null;
  return <section data-testid="deep-ba-investigation" data-layout="management-document" className="border-y border-[var(--lb-divider)] bg-transparent">
    <header className="border-b border-[var(--lb-divider)] py-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700"><Search className="h-4 w-4" />{t('Analysis narrative')}</div>
      <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">{t('Narrative order may use bounded domain advice; every finding keeps its original evidence basis and authority.')}</p>
    </header>
    <section data-testid="deep-ba-management-section-01" data-section-number="01" className="grid gap-3 border-b border-[var(--lb-divider)] py-5 md:grid-cols-[44px_minmax(0,1fr)]">
      <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">01</div>
      <div><div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('Main answer')}</div><FindingView finding={plan.primaryAnswer.finding} overview={overview} primary /></div>
    </section>
    <div className="divide-y divide-[var(--lb-divider)]">
      {plan.sections.map((section, index) => {
        const number = String(index + 2).padStart(2, '0');
        return <details key={section.role} open={!section.collapsedByDefault} className="group py-4" data-testid={`deep-ba-narrative-section-${section.role}`} data-section-number={number}>
          <summary className="grid cursor-pointer list-none grid-cols-[44px_minmax(0,1fr)_20px] items-center gap-3 text-[13px] font-semibold text-slate-900">
            <span className="text-[11px] tracking-[0.14em] text-slate-400">{number}</span><span>{t(ROLE_LABELS[section.role])}</span><ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="ml-[56px] mt-3">
            {section.findingItems.length > 0 && <div className="divide-y divide-[var(--lb-divider)] border-y border-[var(--lb-divider)]">{section.findingItems.map(item => <FindingView key={item.finding.id} finding={item.finding} overview={overview} usesDomainContext={item.role === 'hypothesis'} />)}</div>}
            {section.unknownItems.length > 0 && <div className="divide-y divide-amber-100 border-y border-amber-100">{section.unknownItems.map((item, itemIndex) => <div key={`${itemIndex}-${item.unknown.label}`} className="border-l-2 border-amber-300 py-3 pl-3 text-xs"><strong className="text-amber-900">{t(item.unknown.label)}</strong><p className="mt-1 text-amber-800">{t(item.unknown.impact)}</p>{item.unknown.missingSignals.length > 0 && <div className="mt-1 text-[10px] text-amber-700">{t('Missing')}: {item.unknown.missingSignals.map(signal => t(signal)).join(', ')}</div>}</div>)}</div>}
            {section.role === 'unknown' && plan.advisory.abstainWhen.length > 0 && <div className="mt-3 border-l-2 border-violet-300 py-2 pl-3 text-xs text-violet-800"><strong>{t('Advisory abstention checks')}</strong><ul className="mt-1 space-y-1">{plan.advisory.abstainWhen.map(item => <li key={item}>• {t(item)}</li>)}</ul><p className="mt-2 text-[10px] text-violet-600">{t('Micro Brain advisory only — these checks cannot strengthen analysis authority.')}</p></div>}
            {section.actionItems.length > 0 && <div className="divide-y divide-[var(--lb-divider)] border-y border-[var(--lb-divider)]">{section.actionItems.map(item => <article key={`${item.action.priority}-${item.action.title}`} className="py-3 text-xs"><div className="flex flex-wrap gap-2"><strong>{t(item.action.priority.toUpperCase())} · {t(item.action.title)}</strong><span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] uppercase text-blue-700">{t(BASIS_LABELS[item.action.basis])}</span></div><p className="mt-1 text-slate-700">{localize(item.action.action)}</p><p className="mt-1 text-[10px] text-slate-500">{t('Verify')}: {t(item.action.verification)}</p></article>)}</div>}
            {section.role === 'supporting_evidence' && <div className="divide-y divide-[var(--lb-divider)] border-y border-[var(--lb-divider)]">
              {investigation.decompositions.filter(item => plan.supporting.decompositionIds.includes(item.id)).map(item => <article key={item.id} className="py-3"><div className="flex items-center justify-between gap-2"><strong className="text-xs text-slate-900">{t(item.label)}</strong><span className="text-[10px] uppercase text-slate-500">{t(item.status)}</span></div><div className="mt-2 space-y-1">{item.components.map(component => <div key={component.label} className="flex justify-between gap-3 text-[11px]"><span className="text-slate-700">{t(component.label)}</span><span className={component.status === 'observed' ? 'text-emerald-700' : 'text-amber-700'}>{component.field ?? t('Missing')}</span></div>)}</div>{item.caveat && <p className="mt-2 text-[10px] leading-4 text-amber-700">{t(item.caveat)}</p>}</article>)}
              {investigation.comparisons.filter(item => plan.supporting.comparisonKinds.includes(item.kind)).map(item => <div key={item.kind} className="py-3 text-xs"><div className="flex justify-between gap-2"><strong>{t(item.label)}</strong><span className="text-emerald-700">{t(item.status)}</span></div><p className="mt-1 text-slate-600">{t(item.statement)}</p></div>)}
            </div>}
            {section.role === 'supporting_evidence' && investigation.followUpQuestions.length > 0 && <ol className="mt-3 divide-y divide-[var(--lb-divider)] border-y border-[var(--lb-divider)]">{investigation.followUpQuestions.slice(0, plan.supporting.followUpQuestionCount).map((item, itemIndex) => <li key={`${itemIndex}-${item.question}`} className="py-3 text-xs"><strong>{itemIndex + 1}. {t(item.question)}</strong><p className="mt-1 text-slate-500">{t(item.rationale)}</p></li>)}</ol>}
          </div>
        </details>;
      })}
    </div>
  </section>;
};
