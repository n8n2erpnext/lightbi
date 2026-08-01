import React from 'react';
import { AlertTriangle, Layers, CheckCircle2, XCircle, FileText, Wrench, Sparkles } from 'lucide-react';
import type { DatasetUnderstandingResult } from '../../lib/understanding-next/contracts';
import type { CanonicalAnalysisPresentationV1, CanonicalDatasetPresentationV1, CanonicalRemediationOperationV1 } from '../../lib/understanding-core/canonical-consumer-presentation-contract';
import type { CanonicalDomainPerspectiveCandidateV1 } from '../../lib/canonical-source-candidate-projection';
import { dedupeCanonicalRemediations } from '../../lib/canonical-remediation-dedup';
import { adaptNextActionsToLegacy } from '../../lib/understanding-next/action-adapter';
import { AnalysisOpportunityGrid } from './AnalysisOpportunityGrid';
import type { AnalysisAction } from '../../lib/analysis-opportunity-actions';
import { CanonicalPerspectiveSelector } from './CanonicalPerspectiveSelector';
import { useUiLanguage } from '../../lib/ui-language';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  retail_sales_document: 'retail sales data',
  logistics_intake_report: 'logistics intake data',
  logistics_export_report: 'logistics export data',
  inventory_snapshot: 'inventory snapshot data',
  product_master: 'product master data',
  management_ranking: 'management ranking data',
  dirty_operational_export: 'operational export with cleanup risk',
  generic_table: 'general business table',
};

const GRAIN_LABELS: Record<string, string> = {
  transaction: 'transaction-level',
  event: 'event-level',
  snapshot: 'snapshot-level',
  master_data: 'master-data',
  summary: 'summary-level',
  unknown: 'unknown-grain',
};

const DOMAIN_LABELS: Record<string, string> = {
  operations: 'Operations',
  revenue: 'Revenue',
  inventory: 'Inventory',
  customer: 'Customer',
  performance: 'Performance',
  finance: 'Finance',
};

function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

export interface UnderstandingNextCardProps {
  understanding: DatasetUnderstandingResult;
  selectedActionId?: string;
  onSelectAction?: (action: AnalysisAction) => void;
  canonicalPresentation?: CanonicalDatasetPresentationV1;
  canonicalPerspectives?: CanonicalDomainPerspectiveCandidateV1[];
  selectedPerspectiveId?: string | null;
  onSelectPerspective?: (perspectiveId: string) => void;
  onRemediate?: (operation: CanonicalRemediationOperationV1, itemId: string) => void;
}

export const UnderstandingNextCard: React.FC<UnderstandingNextCardProps> = ({ 
  understanding, 
  selectedActionId, 
  onSelectAction,
  canonicalPresentation,
  canonicalPerspectives = [],
  selectedPerspectiveId = null,
  onSelectPerspective,
  onRemediate,
}) => {
  const { t } = useUiLanguage();
  const getHeaderStatus = () => {
    if (understanding.quality.headerStatus === 'failed') return { text: 'BLOCKED (Schema Empty)', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle };
    if (understanding.quality.headerStatus === 'recovered') return { text: 'Recovered Schema', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle };
    if (understanding.quality.headerStatus === 'clean') return { text: 'Clean Schema', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 };
    return { text: 'Ambiguous Schema', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle };
  };

  const statusConfig = getHeaderStatus();
  const StatusIcon = statusConfig.icon;
  const readyLenses = understanding.lenses
    .map(lens => ({ ...lens, questions: lens.questions.filter(question => question.defaultAction) }))
    .filter(lens => lens.availability === 'ready' && lens.questions.length > 0);
  const partialLenses = understanding.lenses.filter(lens => !readyLenses.some(ready => ready.id === lens.id));
  const topSignals = [...understanding.signals]
    .filter(signal => signal.role !== 'technical')
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 5);
  const topStakeholders = [...(understanding.stakeholderFits ?? [])].slice(0, 4);
  const topDomains = (understanding.domainAffinities?.length
    ? understanding.domainAffinities.map(affinity => affinity.domain)
    : understanding.profile.detectedDomains
  ).slice(0, 4).map(domain => DOMAIN_LABELS[domain] ?? humanize(domain));
  const readyQuestionCount = readyLenses.reduce((sum, lens) => sum + lens.questions.filter(question => question.defaultAction).length, 0);
  const blockedAnalysisCount = understanding.unavailableActions.length + partialLenses.reduce((sum, lens) => sum + lens.questions.filter(question => !question.defaultAction).length, 0);
  const documentLabel = DOCUMENT_TYPE_LABELS[understanding.profile.documentType] ?? humanize(understanding.profile.documentType);
  const recommendedPerspectiveId = canonicalPerspectives.find(
    perspective => perspective.state === 'governed_action_available'
  )?.perspectiveId ?? null;
  const actionablePerspectives = canonicalPerspectives.filter(
    perspective => perspective.state === 'governed_action_available'
  );
  const grainLabel = GRAIN_LABELS[understanding.profile.grain] ?? humanize(understanding.profile.grain);



  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Technical source facts stay available without leading the Easy Mode journey. */}
      <details className="rounded-xl border border-slate-200 bg-slate-50/60">
        <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-semibold text-slate-700">
          {t('Review technical evidence', 'Xem bằng chứng kỹ thuật')}
        </summary>
        <div className="flex justify-between items-start border-t border-slate-200 px-4 py-3">
          <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h3 className="text-[16px] font-semibold text-gray-900">{t('Dataset profile', 'Hồ sơ dữ liệu')}</h3>
            <div className={`flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
              <StatusIcon className="w-3.5 h-3.5 mr-1" />
              {statusConfig.text}
            </div>
          </div>
          <div className="flex items-center gap-4 text-[13px] text-gray-600">
             <div className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-gray-400"/> {documentLabel}</div>
             <div className="flex items-center gap-1.5"><Layers className="w-4 h-4 text-gray-400"/> Grain: {grainLabel}</div>
          </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
          <div className="text-[11px] font-medium px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-slate-600 flex flex-col items-end">
            <div><span className="text-slate-400">Source Rows:</span> <span className="font-semibold text-slate-700">{understanding.source.sourceRowCount > 0 ? understanding.source.sourceRowCount.toLocaleString() : 'Unknown'}</span></div>
            <div><span className="text-slate-400">Sample Rows:</span> <span className="font-semibold text-slate-700">{understanding.source.sampleRowCount.toLocaleString()}</span></div>
            <div><span className="text-slate-400">Parsed Rows:</span> <span className="font-semibold text-slate-700">{understanding.source.parsedRowCount.toLocaleString()}</span></div>
          </div>
          </div>
        </div>
      </details>

      {/* BA summary */}
      <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">{t('LightBI understands this as', 'LightBI hiểu đây là')}</div>
            <h4 className="mt-1 text-[18px] font-semibold text-gray-950">
              {documentLabel}
              <span className="text-gray-400"> · </span>
              {grainLabel}
            </h4>
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-gray-600">
              {t(
                `LightBI sees ${understanding.source.sourceRowCount > 0 ? understanding.source.sourceRowCount.toLocaleString() : 'an unknown number of'} source rows, ${understanding.source.sourceColumnCount.toLocaleString()} columns, and enough business signals to offer ${readyQuestionCount} ready runtime action${readyQuestionCount === 1 ? '' : 's'}.${blockedAnalysisCount > 0 ? ` ${blockedAnalysisCount} other angle${blockedAnalysisCount === 1 ? '' : 's'} need more signals before they are safe to run.` : ''}`,
                `LightBI đã đọc ${understanding.source.sourceRowCount > 0 ? understanding.source.sourceRowCount.toLocaleString() : 'số dòng chưa xác định'} dòng, ${understanding.source.sourceColumnCount.toLocaleString()} cột và tìm thấy ${readyQuestionCount} phân tích có thể chạy.${blockedAnalysisCount > 0 ? ` ${blockedAnalysisCount} góc nhìn khác cần thêm bằng chứng.` : ''}`,
              )}
            </p>
          </div>
          <div className="grid min-w-[220px] grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg border border-white/80 bg-white/80 p-2">
              <div className="text-gray-400">{t('Ready analyses', 'Phân tích sẵn sàng')}</div>
              <div className="mt-0.5 text-[18px] font-semibold text-emerald-700">{readyLenses.length}</div>
            </div>
            <div className="rounded-lg border border-white/80 bg-white/80 p-2">
              <div className="text-gray-400">{t('Review needed', 'Cần xem lại')}</div>
              <div className="mt-0.5 text-[18px] font-semibold text-amber-700">{partialLenses.length}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">{t('Business domains', 'Lĩnh vực kinh doanh')}</div>
            <div className="flex flex-wrap gap-2">
              {topDomains.length > 0 ? topDomains.map(domain => (
                <span key={domain} className="rounded-full border border-blue-100 bg-white px-2.5 py-1 text-[12px] font-medium text-blue-700">{domain}</span>
              )) : <span className="text-[12px] text-gray-400">No strong business domain detected yet.</span>}
            </div>
            {topStakeholders.length > 0 && (
              <div className="mt-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Relevant roles</div>
                <div className="flex flex-wrap gap-2">
                  {topStakeholders.map(role => (
                    <span key={role.id} className="rounded-full border border-emerald-100 bg-white px-2.5 py-1 text-[12px] font-medium text-emerald-700">
                      {role.label}
                      <span className="ml-1 text-emerald-400">{role.score}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">{t('Key signals found', 'Tín hiệu chính đã tìm thấy')}</div>
            <div className="flex flex-wrap gap-2">
              {topSignals.length > 0 ? topSignals.map(signal => (
                <span key={`${signal.canonicalId}:${signal.physicalColumn}`} className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[12px] text-gray-700">
                  <span className="font-medium">{signal.label}</span>
                  <span className="text-gray-400">: {signal.physicalColumn}</span>
                </span>
              )) : <span className="text-[12px] text-gray-400">No reusable business signal detected.</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Dirty Signals Banner */}
      {understanding.quality.dirtySignals.length > 0 && (
        <div className="flex flex-col gap-2">
          {understanding.quality.dirtySignals.map((sig, i) => (
             <div key={i} className={`flex items-start p-3 rounded-lg border ${sig.severity === 'blocking' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold">{sig.kind} <span className="text-[11px] opacity-75 font-normal ml-2">Needs review</span></span>
                  <span className="text-[12px] opacity-90 mt-0.5">{sig.message}</span>
                  {sig.evidence.length > 0 && <span className="text-[11px] mt-1 font-mono bg-white/50 px-1.5 py-0.5 rounded">{sig.evidence[0]}</span>}
                </div>
             </div>
          ))}
        </div>
      )}

      {!canonicalPresentation && understanding.quality.blockedReasons.length > 0 && (
        <div className="flex flex-col gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
           <span className="text-[13px] font-semibold flex items-center"><XCircle className="w-4 h-4 mr-2" /> Blocked Analysis</span>
           <ul className="list-disc pl-6 text-[12px]">
              {understanding.quality.blockedReasons.map((r, i) => <li key={i}>{r}</li>)}
           </ul>
        </div>
      )}

      {canonicalPresentation && (
        <>
          <CanonicalUnderstandingSummary presentation={canonicalPresentation} />
          <div className="border-t border-gray-100 pt-4">
            <CanonicalPerspectiveSelector
              items={actionablePerspectives.map((perspective) => ({
                id: perspective.perspectiveId,
                label: perspective.label,
                question: perspective.purpose,
                state: perspective.state === 'governed_action_available'
                  ? 'ready'
                  : perspective.state === 'governed_questions_available'
                    ? 'partial'
                    : 'recognized',
                badges: perspective.matchedSignalIds,
                recommended: perspective.perspectiveId === recommendedPerspectiveId,
              }))}
              selectedId={selectedPerspectiveId}
              onSelect={(id) => onSelectPerspective?.(id)}
            />
            {canonicalPerspectives.some(perspective => perspective.state !== 'governed_action_available') && (
              <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60">
                <summary className="cursor-pointer px-4 py-3 text-[12px] font-semibold text-slate-600">
                  {t('Other signals LightBI found', 'Các tín hiệu khác LightBI đã tìm thấy')}
                </summary>
                <div className="flex flex-wrap gap-2 border-t border-slate-200 px-4 py-3">
                  {canonicalPerspectives.filter(perspective => perspective.state !== 'governed_action_available').map(perspective => (
                    <span key={perspective.perspectiveId} data-testid={`business-perspective-${perspective.perspectiveId}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-600">
                      {perspective.label} · {t('not enough evidence to analyze safely', 'chưa đủ bằng chứng để phân tích an toàn')}
                    </span>
                  ))}
                </div>
              </details>
            )}
          </div>
          <CanonicalAnalysisStates
            presentation={canonicalPresentation}
            understanding={understanding}
            selectedPerspectiveId={selectedPerspectiveId}
            onSelectAction={onSelectAction}
            onRemediate={onRemediate}
          />
        </>
      )}

      {/* Lens-first orientation */}
      {!canonicalPresentation && <div className="pt-4 border-t border-gray-100">
        <div className="mb-3">
          <h4 className="text-[15px] font-semibold text-gray-900">Choose the decision angle to explore</h4>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Ready angles are generated only after LightBI finds the required columns and metrics in this dataset.
          </p>
        </div>
        {readyLenses.length > 0 && <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {readyLenses.map(lens => {
            const statusClass =
              lens.availability === 'ready'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : lens.availability === 'partial'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : lens.availability === 'not_implemented'
                    ? 'bg-slate-50 text-slate-500 border-slate-200'
                    : 'bg-red-50 text-red-700 border-red-200';

            return (
              <div key={lens.id} className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-gray-900">{lens.label}</div>
                    <div className="text-[12px] text-gray-500 mt-0.5">{lens.description}</div>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${statusClass}`}>
                    ready
                  </span>
                </div>

                {lens.reasons.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {lens.reasons.slice(0, 3).map((reason, idx) => (
                      <li key={idx} className="text-[11px] text-gray-500 flex gap-1.5">
                        <span className="text-gray-300">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 space-y-2">
                  {lens.questions.map(question => (
                    <div key={question.id} className="rounded-md border border-gray-100 bg-gray-50 p-2">
                      <div className="text-[12px] font-medium text-gray-800">{question.label}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{question.userPrompt}</div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-gray-400">{question.intent}</span>
                        {question.defaultAction ? (
                          <button
                            type="button"
                            onClick={() => onSelectAction?.(adaptNextActionsToLegacy([question.defaultAction!])[0])}
                            className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded hover:bg-indigo-100"
                          >
                            Investigate
                          </button>
                        ) : question.blockedReasons.length > 0 ? (
                          <span className="text-[11px] text-gray-400">Needs more signals</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>}

        {partialLenses.length > 0 && (
          <details className="rounded-lg border border-amber-100 bg-amber-50/40">
            <summary className="cursor-pointer px-3 py-2 text-[12px] font-semibold text-amber-800">
              {partialLenses.length} angle{partialLenses.length === 1 ? '' : 's'} need more signals
            </summary>
            <div className="grid grid-cols-1 gap-2 border-t border-amber-100 p-3 md:grid-cols-2">
              {partialLenses.map(lens => (
                <div key={lens.id} className="rounded-lg border border-amber-100 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-semibold text-gray-900">{lens.label}</div>
                      <div className="mt-0.5 text-[12px] text-gray-500">{lens.description}</div>
                    </div>
                    <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                      {lens.availability.replace('_', ' ')}
                    </span>
                  </div>
                  {lens.reasons.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {lens.reasons.slice(0, 3).map((reason, idx) => (
                        <li key={idx} className="flex gap-1.5 text-[11px] text-gray-500">
                          <span className="text-amber-300">•</span>
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}
      </div>}

      {!canonicalPresentation && <details className="pt-3 border-t border-gray-100 mt-1 group">
        <summary className="cursor-pointer select-none text-[12px] font-semibold text-gray-500 hover:text-gray-800">
          Show technical understanding details
        </summary>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Left Column: Domains & Perspectives */}
          <div className="flex flex-col gap-5">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5">Detected Domains</h4>
              <div className="flex flex-wrap gap-2">
                {understanding.profile.detectedDomains.length > 0 ? (
                  understanding.profile.detectedDomains.map((dom, i) => (
                    <div key={i} className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-md text-[12px] font-medium text-indigo-700 flex flex-col shadow-sm">
                      {dom}
                    </div>
                  ))
                ) : (
                  <span className="text-[13px] text-gray-400">No domains detected.</span>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5">Perspectives</h4>
              <div className="flex flex-col gap-2">
                  {understanding.perspectives.map((p, i) => (
                    <div key={i} className="text-[12px] p-2 bg-gray-50 border border-gray-100 rounded-lg">
                        <div className="font-semibold text-gray-800">{p.label}</div>
                        <div className="text-gray-500 mt-0.5">{p.reason}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Right Column: Actions */}
          <div className="flex flex-col gap-5">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5">Runtime action candidates</h4>
              {understanding.availableActions.length > 0 ? (
                <AnalysisOpportunityGrid 
                  actions={adaptNextActionsToLegacy(understanding.availableActions)}
                  selectedActionId={selectedActionId} 
                  onSelectAction={onSelectAction || (() => {})} 
                />
              ) : (
                <p className="text-[12px] text-gray-400">No reliable analysis patterns found or dataset blocked.</p>
              )}
            </div>

            {understanding.unavailableActions.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5">Missing / Unavailable Analysis</h4>
                <ul className="space-y-2">
                  {understanding.unavailableActions.map(analysis => (
                    <li key={analysis.id} className="text-[12px] text-gray-700 bg-slate-50 p-2.5 rounded-md border border-slate-200 flex flex-col gap-1">
                      <div className="flex items-start">
                        <XCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 mr-1.5 flex-shrink-0" />
                        <span className="font-medium">{analysis.label}</span>
                      </div>
                      <span className="text-[11px] text-gray-500 pl-5">Missing signals: {analysis.missingSignals.join(', ')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </details>}
    </div>
  );
};

const CanonicalUnderstandingSummary: React.FC<{ presentation: CanonicalDatasetPresentationV1 }> = ({ presentation }) => {
  const summary = presentation.understanding;
  if (!summary) return null;
  const mapped = summary.mappings.filter(item => item.canonicalSignal);
  return <details className="rounded-lg border border-gray-200 bg-gray-50/50 p-3" data-testid="canonical-understanding-summary">
    <summary className="cursor-pointer text-[13px] font-semibold text-gray-800">Inspect canonical understanding</summary>
    <div className="mt-3 grid gap-3 text-[12px] text-gray-600 md:grid-cols-2">
      <div>
        <div className="font-semibold text-gray-800">Source and profile</div>
        <p className="mt-1">{summary.source.connectedFiles.length} connected file{summary.source.connectedFiles.length === 1 ? '' : 's'} · {summary.source.sourceRowCount.toLocaleString()} full-source rows · {summary.source.columnCount} columns</p>
        <p>Profile: {summary.source.profileScope}, {summary.source.profileConfidence} confidence · data region {humanize(summary.source.dataRegionState)}</p>
        <p>Representative evidence: {summary.representativeEvidence.sampledRowCount.toLocaleString()} rows ({humanize(summary.representativeEvidence.strategy)}); never treated as full-file truth.</p>
        <p className="mt-1 break-words">Sources: {summary.source.connectedFiles.join(', ')}</p>
      </div>
      <div>
        <div className="font-semibold text-gray-800">Meaning and readiness</div>
        <p className="mt-1">{mapped.length} mapped · {summary.unknownBusinessFields.length} ambiguous or unknown · {summary.ignoredFields.length} ignored</p>
        <p>Grain: {humanize(summary.grain.structuralForm)} ({humanize(summary.grain.structuralState)}) · {humanize(summary.grain.temporalMode)} · {humanize(summary.grain.aggregationForm)}</p>
        <p>Domain pack: {humanize(summary.domainSupport.packId)} · {humanize(summary.domainSupport.state)}</p>
        <p>User-confirmed evidence: {summary.evidence.userConfirmedMappingCount} mappings · {summary.evidence.userConfirmedDeclarationCount} declarations</p>
      </div>
      <div>
        <div className="font-semibold text-gray-800">Mappings</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {summary.mappings.map(item => <span key={item.physicalColumn} className="rounded border border-gray-200 bg-white px-2 py-1" data-state={item.state}>{item.physicalColumn}: {item.canonicalSignal ?? humanize(item.state)}{item.provenance === 'user_confirmed' ? ' (confirmed)' : ''}</span>)}
        </div>
      </div>
      <div>
        <div className="font-semibold text-gray-800">Quality, relationships and restrictions</div>
        <p className="mt-1">Quality findings: {summary.qualityIssues.length || 'none'} · Relationship state: {humanize(summary.relationships.state)}</p>
        <p>{summary.relationships.explanation}</p>
        {summary.unknownBusinessFields.length > 0 && <p className="mt-1">Needs review: {summary.unknownBusinessFields.join(', ')}</p>}
        {summary.readinessRestrictions.length > 0 && <p className="mt-1">Restrictions retained: {summary.readinessRestrictions.map(humanize).join(', ')}</p>}
      </div>
    </div>
  </details>;
};

const STATE_LABELS: Record<CanonicalAnalysisPresentationV1['state'], string> = {
  ready: 'Ready',
  needs_user_evidence: 'Needs confirmation',
  needs_mapping_review: 'Needs mapping review',
  blocked_safety: 'Safety blocked',
  unsupported_mvp: 'Not supported yet',
  stale: 'Stale',
  executing: 'Executing',
  execution_failed: 'Execution failed',
  completed: 'Completed',
};

const CanonicalAnalysisStates: React.FC<{
  presentation: CanonicalDatasetPresentationV1;
  understanding: DatasetUnderstandingResult;
  selectedPerspectiveId?: string | null;
  onSelectAction?: (action: AnalysisAction) => void;
  onRemediate?: (operation: CanonicalRemediationOperationV1, itemId: string) => void;
}> = ({ presentation, understanding, selectedPerspectiveId, onSelectAction, onRemediate }) => {
  const { t } = useUiLanguage();
  const actionById = new Map(understanding.availableActions.map(action => [action.id, action]));
  const perspectiveAnalyses = selectedPerspectiveId
    ? presentation.analyses.filter(item => (item.businessPerspectiveIds ?? []).some(id => id === selectedPerspectiveId))
    : [];
  const countRows: Array<[CanonicalAnalysisPresentationV1['state'], string]> = [
    ['ready', 'Ready now'],
    ['needs_user_evidence', 'Needs confirmation'],
    ['needs_mapping_review', 'Needs mapping review'],
    ['blocked_safety', 'Safety blocked'],
    ['unsupported_mvp', 'Unsupported'],
  ];
  const groups = [
    { id: 'recommended', label: 'Recommended now', items: perspectiveAnalyses.filter(item => item.state === 'ready' && item.advertisedAsDefault).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)) },
    { id: 'additional', label: 'Additional supported analyses', items: perspectiveAnalyses.filter(item => item.state === 'ready' && !item.advertisedAsDefault) },
    { id: 'resolvable', label: 'Resolvable analyses', items: perspectiveAnalyses.filter(item => item.state === 'needs_user_evidence' || item.state === 'needs_mapping_review') },
    { id: 'blocked', label: 'Safety-blocked analyses', items: perspectiveAnalyses.filter(item => item.state === 'blocked_safety') },
    { id: 'execution-failed', label: 'Execution failed', items: perspectiveAnalyses.filter(item => item.state === 'execution_failed') },
    { id: 'unsupported', label: 'Not supported yet', items: perspectiveAnalyses.filter(item => item.state === 'unsupported_mvp') },
    { id: 'stale', label: 'Stale analyses', items: perspectiveAnalyses.filter(item => item.state === 'stale') },
  ].filter(group => group.items.length > 0);
  const primaryAnalysis = perspectiveAnalyses
    .filter(item => item.state === 'ready' && item.executionReadiness !== 'not_executable' && item.actionCandidateId && actionById.has(item.actionCandidateId))
    .sort((left, right) => Number(right.advertisedAsDefault) - Number(left.advertisedAsDefault) || (left.rank ?? 99) - (right.rank ?? 99))[0] ?? null;
  const primaryAction = primaryAnalysis?.actionCandidateId ? actionById.get(primaryAnalysis.actionCandidateId) : undefined;
  const readyExecutableAnalyses = perspectiveAnalyses
    .filter(item => item.state === 'ready' && item.executionReadiness !== 'not_executable' && item.actionCandidateId && actionById.has(item.actionCandidateId))
    .sort((left, right) => Number(right.advertisedAsDefault) - Number(left.advertisedAsDefault) || (left.rank ?? 99) - (right.rank ?? 99));
  const renderItem = (item: CanonicalAnalysisPresentationV1) => {
    const action = item.actionCandidateId ? actionById.get(item.actionCandidateId) : undefined;
    const canInvestigate = item.state === 'ready' && item.executionReadiness !== 'not_executable' && action;
    const remediationOperations = dedupeCanonicalRemediations(item.remediationOperations);
    return <article key={item.itemId} tabIndex={-1} id={`analysis-item-${item.itemId}`} data-testid={`canonical-analysis-${item.itemId}`} data-state={item.state} className="min-w-0 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-gray-700">{STATE_LABELS[item.state]}</span>
        <div className="mt-2 min-w-0">
          <div className="break-words text-[13px] font-semibold leading-5 text-gray-900">{item.title}</div>
          <div className="mt-1 text-[12px] leading-5 text-gray-500">{item.description}</div>
        </div>
      </div>
      {item.primaryBlocker && <div className="mt-2 text-[12px] text-amber-800" role="status" data-testid={`canonical-primary-blocker-${item.itemId}`}>
        <span className="font-medium">{item.primaryBlocker.message}</span>
        {(item.primaryBlocker.scope === 'source' || item.primaryBlocker.scope === 'physical_column') && <span className="mt-0.5 block text-[11px] text-gray-500">Scope: {item.sheetOrTable ? `${item.sheetOrTable} · ` : ''}{item.primaryBlocker.scope === 'physical_column' ? item.physicalColumns.join(', ') : 'Current source'}</span>}
      </div>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] uppercase text-gray-400">{item.metricId}</span>
        {canInvestigate ? <button type="button" data-testid={`canonical-investigate-${item.itemId}`} onClick={() => onSelectAction?.(adaptNextActionsToLegacy([action])[0])} className="rounded border border-indigo-100 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100">Investigate</button> : null}
        {!canInvestigate && remediationOperations.length > 0 ? <div className="flex flex-wrap gap-1.5">
          {remediationOperations.map((operation) => <button key={operation.operationId} type="button" data-testid={`canonical-remediate-${item.itemId}-${operation.kind}`} onClick={() => onRemediate?.(operation, item.itemId)} className="flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800"><Wrench className="h-3 w-3" />{operation.label}</button>)}
        </div> : null}
      </div>
      {(item.secondaryBlockers.length > 0 || item.limitations.length > 0 || item.evidence.length > 0 || item.decisionUseRestrictions.length > 0) && <details className="mt-2 text-[11px] text-gray-500">
        <summary className="cursor-pointer font-medium text-gray-600">{item.state === 'unsupported_mvp' ? 'View limitation' : 'Evidence and limitations'}</summary>
        {item.secondaryBlockers.map((blocker, index) => <p key={`${blocker.code}:${index}`} className="mt-1">{blocker.message}</p>)}
        {item.limitations.map((code, index) => <p key={`${code}:${index}`} className="mt-1">Limitation: {humanize(code)}</p>)}
        {item.evidence.map((entry, index) => <p key={`${entry.evidenceId}:${entry.provenance}:${index}`} className="mt-1">Evidence: {entry.evidenceId} ({entry.provenance})</p>)}
        {item.decisionUseRestrictions.map((restriction, index) => <p key={`${restriction.code}:${index}`} className="mt-1">Restriction: {restriction.reason}</p>)}
      </details>}
    </article>;
  };
  return <section className="border-t border-gray-100 pt-4" aria-labelledby="canonical-analysis-heading" data-testid="canonical-analysis-states">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[10px]">2</span>
          {t('Your analysis', 'Phân tích của bạn')}
        </div>
        <h4 id="canonical-analysis-heading" className="mt-1 text-[15px] font-semibold text-gray-900">{t('LightBI will calculate and visualize the best supported answer.', 'LightBI sẽ tính toán và trực quan hóa câu trả lời phù hợp nhất.')}</h4>
        <p className="mt-0.5 text-[12px] text-gray-500">{t('Only analyses that pass governed checks are available.', 'Chỉ những phân tích vượt qua kiểm tra quản trị mới được sử dụng.')}</p>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Canonical analysis state summary">
        {selectedPerspectiveId && countRows.map(([state, label]) => <span key={state} data-testid={`canonical-count-${state}`} className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-600">{label}: <strong>{perspectiveAnalyses.filter(item => item.state === state).length}</strong></span>)}
      </div>
    </div>

    {!selectedPerspectiveId && <div className="mt-3 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-[12px] text-indigo-800" data-testid="canonical-select-perspective-prompt">
      {t('Choose a business perspective above. LightBI will select the best supported analysis for you.', 'Chọn một góc nhìn kinh doanh ở trên. LightBI sẽ tự chọn phân tích phù hợp nhất cho bạn.')}
    </div>}

    {selectedPerspectiveId && primaryAnalysis && primaryAction && <div className="mt-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-5" data-testid="canonical-primary-analysis">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700"><Sparkles className="h-4 w-4" />{t('Recommended by LightBI', 'LightBI đề xuất')}</div>
          <h5 className="mt-2 text-[18px] font-semibold text-slate-950">{primaryAnalysis.title}</h5>
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-slate-600">{primaryAnalysis.description}</p>
        </div>
        <button
          type="button"
          data-testid="canonical-analyze-perspective"
          onClick={() => onSelectAction?.(adaptNextActionsToLegacy([primaryAction])[0])}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-800"
        >
          <Sparkles className="h-4 w-4" />
          {t('Analyze this perspective', 'Phân tích góc nhìn này')}
        </button>
      </div>
    </div>}

    {selectedPerspectiveId && readyExecutableAnalyses.length > 1 && <section className="mt-4" aria-labelledby="canonical-ready-angles-heading">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <h5 id="canonical-ready-angles-heading" className="text-[13px] font-semibold text-slate-900">{t('Other questions this data can answer', 'CÃ¡c cÃ¢u há»i khÃ¡c dá»¯ liá»‡u nÃ y cÃ³ thá»ƒ tráº£ lá»i')}</h5>
          <p className="mt-0.5 text-[11px] text-slate-500">{t('Every option below passed the same governed checks.', 'Má»—i lá»±a chá»n bÃªn dÆ°á»›i Ä‘á»u Ä‘Ã£ vÆ°á»£t qua cÃ¹ng má»™t bá»™ kiá»ƒm tra quáº£n trá»‹.')}</p>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">{readyExecutableAnalyses.length} {t('ready angles', 'gÃ³c nhÃ¬n sáºµn sÃ ng')}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {readyExecutableAnalyses.slice(1).map(item => {
          const action = actionById.get(item.actionCandidateId!);
          return <button
            key={item.itemId}
            type="button"
            onClick={() => action && onSelectAction?.(adaptNextActionsToLegacy([action])[0])}
            className="min-h-[118px] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[13px] font-semibold leading-5 text-slate-900">{item.title}</span>
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            </div>
            <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-500">{item.description}</p>
            <span className="mt-3 inline-flex text-[11px] font-semibold text-blue-700">{t('Analyze', 'PhÃ¢n tÃ­ch')} â†’</span>
          </button>;
        })}
      </div>
    </section>}

    {selectedPerspectiveId && perspectiveAnalyses.length === 0 && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800" data-testid="canonical-perspective-recognized-only">
      LightBI recognizes this perspective from canonical business signals, but no governed question or metric contract is available for it yet. No chart will be fabricated.
    </div>}

    {presentation.datasetBlockers.length > 0 && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800" role="alert" data-testid="canonical-dataset-blocker">
      <div className="flex items-center gap-2 text-[13px] font-semibold"><XCircle className="h-4 w-4" /> Dataset unavailable</div>
      {presentation.datasetBlockers.map(blocker => <p key={blocker.code} className="mt-1 text-[12px]">{blocker.message}</p>)}
    </div>}

    {selectedPerspectiveId && groups.length > 0 && <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60">
      <summary className="cursor-pointer px-4 py-3 text-[12px] font-semibold text-slate-700">{t('Explore another question or review evidence', 'Khám phá câu hỏi khác hoặc xem bằng chứng')}</summary>
      <div className="space-y-4 border-t border-slate-200 p-4">
        {groups.map(group => <section key={group.id} aria-labelledby={`canonical-group-${group.id}`} data-testid={`canonical-group-${group.id}`}>
          <h5 id={`canonical-group-${group.id}`} className="mb-2 text-[12px] font-semibold text-gray-700">{group.label} <span className="font-normal text-gray-400">({group.items.length})</span></h5>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{group.items.map(renderItem)}</div>
        </section>)}
      </div>
    </details>}
  </section>;
};
