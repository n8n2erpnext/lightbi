import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import type { BAAnalysisAuthorityContextV1 } from '../../lib/understanding-core/ba-analysis-authority-context';

function modeLabel(context: BAAnalysisAuthorityContextV1): string {
  if (context.domain.analysisMode === 'evidence_bound_inferred_domain') return 'Evidence-bound inferred domain';
  if (context.domain.analysisMode === 'governed_supported') return 'Governed supported domain';
  if (context.domain.analysisMode === 'canonical_detect_only') return 'Canonical detect-only';
  return 'Unknown or ambiguous domain';
}

function sourceLabel(context: BAAnalysisAuthorityContextV1): string {
  if (context.domain.primaryDomainSource === 'micro_brain_relation') return 'Semantic inference (Micro Brain)';
  if (context.domain.primaryDomainSource === 'mixed') return 'Canonical + Micro Brain evidence';
  if (context.domain.primaryDomainSource === 'canonical_resolution') return 'Canonical semantic resolution';
  return 'No resolved domain source';
}

export const BAAnalysisAuthorityBanner: React.FC<{
  context: BAAnalysisAuthorityContextV1 | null | undefined;
  scopeLabel?: string;
}> = ({ context, scopeLabel }) => {
  if (!context) return null;
  const inferred = context.domain.analysisMode === 'evidence_bound_inferred_domain';
  const metric = context.authorization.metric;
  return <section
    data-testid="ba-analysis-authority"
    className={`mb-4 rounded-xl border p-4 ${inferred ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}
  >
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-2.5">
        {inferred ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" /> : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />}
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide">
            <span className={inferred ? 'text-amber-800' : 'text-slate-600'}>{modeLabel(context)}</span>
            {scopeLabel && <span className="rounded border border-current/15 px-1.5 py-0.5 normal-case tracking-normal">{scopeLabel}</span>}
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-950">{context.domain.primaryDomain ?? 'Domain unresolved'}</div>
          <div className="mt-1 text-xs leading-5 text-slate-600">{sourceLabel(context)} · {context.domain.officialSupport.productionActive ? 'Production-active support' : 'Not production-active'}</div>
        </div>
      </div>
      <div className="text-right text-[11px] leading-5 text-slate-600">
        {metric ? <>
          <div><span className="font-semibold">Metric:</span> {metric.metricId} · {metric.preflightState}</div>
          <div><span className="font-semibold">Runtime:</span> {metric.runtimeExecutionAllowed ? 'execution allowed by governed preflight' : metric.runtimeState === 'not_evaluated' ? 'not evaluated for this action' : metric.runtimeState}</div>
        </> : <div><span className="font-semibold">Metric:</span> no matched governed metric authority</div>}
        <div><span className="font-semibold">Formula:</span> not independently authorized</div>
      </div>
    </div>
    {inferred && <p className="mt-3 text-[11px] leading-5 text-amber-800">Semantic inference can guide evidence-bound analysis, but it does not activate official domain support, authorize a metric, or turn a hypothesis into a factual claim.</p>}
  </section>;
};
