import React from 'react';
import { BrainCircuit, ChevronDown, Database, ShieldCheck } from 'lucide-react';
import type {
  EvidenceInspectorModelV1,
  PresentationAuthorityClassV1,
  PresentationClaimBasisV1,
  PresentationCausalStatusV1,
  PresentationDerivationKindV1,
  PresentationEvidenceKindV1,
} from '../../lib/presentation-provenance';
import { useUiLanguage } from '../../lib/ui-language';

const AUTHORITY_LABELS: Record<PresentationAuthorityClassV1, string> = {
  governed: 'Governed',
  evidence_bound: 'Evidence-bound',
  advisory: 'Advisory',
  hypothesis_only: 'Hypothesis only',
  unresolved: 'Unresolved',
};

const CAUSAL_LABELS: Record<PresentationCausalStatusV1, string> = {
  descriptive: 'Descriptive only',
  association_only: 'Association only',
  hypothesis: 'Hypothesis',
  causal_not_established: 'Causality not established',
  not_applicable: 'Not applicable',
};

const BASIS_LABELS: Record<PresentationClaimBasisV1, string> = {
  OBSERVED: 'Observed',
  CALCULATED: 'Calculated',
  SEMANTICALLY_RESOLVED: 'Semantically resolved',
  DOMAIN_CONTEXT: 'Domain context',
  INFERRED: 'Inferred',
  HYPOTHESIS: 'Hypothesis',
};

const DERIVATION_LABELS: Record<PresentationDerivationKindV1, string> = {
  direct_observation: 'Direct observation',
  governed_calculation: 'Governed calculation',
  semantic_resolution: 'Semantic resolution',
  domain_context: 'Domain context',
  mixed_inference: 'Mixed inference',
  hypothesis: 'Hypothesis',
  question_projection: 'Question projection',
};

const EVIDENCE_LABELS: Record<PresentationEvidenceKindV1, string> = {
  source_row: 'Source rows',
  source_field: 'Source fields',
  canonical: 'Canonical evidence',
  governed: 'Governed evidence',
  user_confirmation: 'User-confirmed evidence',
  domain_inference: 'Domain evidence',
  runtime: 'Runtime evidence',
  policy: 'Policy evidence',
  other: 'Other evidence',
};

export const EvidenceInspector: React.FC<{ model: EvidenceInspectorModelV1 }> = ({ model }) => {
  const { t } = useUiLanguage();
  const evidenceCount = model.evidenceGroups.reduce((sum, group) => sum + group.items.length, 0);
  return <details data-testid={`claim-evidence-inspector-${model.subject.id}`} className="mt-2 rounded-lg border border-slate-100 bg-slate-50/60 text-[10px] text-slate-600">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-2.5 py-2 font-semibold text-slate-600">
      <span className="inline-flex min-w-0 items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 shrink-0 text-blue-600" />{t('Evidence & provenance')}<span className="font-normal text-slate-400">· {evidenceCount}</span></span>
      <span className="inline-flex items-center gap-1.5"><span className="rounded border border-slate-200 bg-white px-1.5 py-0.5">{t(AUTHORITY_LABELS[model.authorityClass])}</span><ChevronDown className="h-3.5 w-3.5 text-slate-400" /></span>
    </summary>
    <div className="space-y-3 border-t border-slate-100 px-2.5 py-2.5">
      <div className="flex flex-wrap gap-1.5">
        <span className="font-semibold text-slate-500">{t('Claim basis')}:</span>
        {model.basis.map(basis => <span key={basis} className="rounded border border-slate-200 bg-white px-1.5 py-0.5">{t(BASIS_LABELS[basis])}</span>)}
        <span className="ml-1 font-semibold text-slate-500">{t('Causal status')}:</span>
        <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5">{t(CAUSAL_LABELS[model.causalStatus])}</span>
      </div>
      <div className="text-slate-500"><span className="font-semibold">{t('Derivation')}:</span> {t(DERIVATION_LABELS[model.derivation.kind])}</div>
      {model.evidenceGroups.length > 0 && <div className="space-y-2">
        {model.evidenceGroups.map(group => <div key={group.kind}>
          <div className="inline-flex items-center gap-1 font-semibold text-slate-500"><Database className="h-3 w-3" />{t(EVIDENCE_LABELS[group.kind])}</div>
          <div className="mt-1 space-y-1">{group.items.slice(0, 8).map(item => <div key={item.evidenceId} className="rounded bg-white px-2 py-1.5 text-slate-500">
            <span className="font-medium text-slate-700">{item.evidenceId}</span>
            <span className="ml-1 text-slate-400">· {item.provenance}</span>
            {item.references.length > 0 && <div className="mt-0.5 break-words text-slate-400">{item.references.slice(0, 6).join(' · ')}</div>}
          </div>)}</div>
        </div>)}
      </div>}
      {model.knowledgeRefs.length > 0 && <div className="space-y-2">
        <div className="inline-flex items-center gap-1 font-semibold text-violet-700"><BrainCircuit className="h-3 w-3" />{t('Knowledge context')}</div>
        {model.knowledgeRefs.map(item => <div key={item.knowledgeId} className="rounded border border-violet-100 bg-violet-50 px-2.5 py-2 text-violet-800">
          <div className="font-semibold">{item.kind === 'micro_brain_advisory' ? t('Micro Brain advisory') : t('Domain context')} · {t(item.authority === 'advisory_only' ? 'Advisory only' : 'Context only')}</div>
          {item.references.length > 0 && <div className="mt-1 break-words text-violet-700/80">{item.references.slice(0, 6).join(' · ')}</div>}
          {item.authorityNotes.map(note => <div key={note} className="mt-1 leading-4">{t(note)}</div>)}
        </div>)}
      </div>}
      {model.limitations.length > 0 && <div><div className="font-semibold text-slate-500">{t('Limitations')}</div><ul className="mt-1 list-disc space-y-0.5 pl-4">{model.limitations.slice(0, 8).map(item => <li key={item}>{t(item)}</li>)}</ul></div>}
      {model.decisionUseRestrictions.length > 0 && <div><div className="font-semibold text-slate-500">{t('Decision-use restrictions')}</div><ul className="mt-1 list-disc space-y-0.5 pl-4">{model.decisionUseRestrictions.map(item => <li key={item.code}><span className="font-medium">{item.code}</span> · {t(item.reason)}</li>)}</ul></div>}
    </div>
  </details>;
};
