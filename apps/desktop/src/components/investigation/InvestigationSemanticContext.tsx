import React from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Database } from 'lucide-react';
import type { AISafeBriefing } from '../../lib/ai-briefing-contract';

export interface InvestigationSemanticContextProps {
  briefing: AISafeBriefing;
  briefingRationale: string;
  readinessClass: string;
  readinessTier: string;
  safeActionHints: string[];
  show: boolean;
  onToggle: () => void;
}

export const InvestigationSemanticContext: React.FC<InvestigationSemanticContextProps> = ({ briefing, briefingRationale, readinessClass, readinessTier, safeActionHints, show, onToggle }) => (
  <div className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm transition-all duration-300">
    <button onClick={onToggle} className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-black/[0.025]"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.04] text-black/60"><Database className="h-4 w-4" /></div><div><h3 className="mb-0.5 text-sm font-semibold text-[#202123]">AI Semantic Briefing</h3><p className="text-xs text-black/45">Context, grain, and safe actions for execution</p></div></div><div className="text-gray-400">{show ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}</div></button>
    {show && <div className="border-t border-black/5 bg-[#f7f7f6] p-6 pt-2"><div className="grid grid-cols-1 gap-6 md:grid-cols-2"><div><h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Canonical context</h4><div className="mb-3 rounded border border-gray-200 bg-white p-3 text-sm"><span className="mb-1 block font-semibold">Grain: {briefing.grain}</span><span className="text-gray-600">{briefing.grainEvidence || 'No grain evidence recorded.'}</span></div><div className="rounded border border-gray-200 bg-white p-3 text-sm"><span className="mb-1 block font-semibold">Runtime state: <span className={readinessClass}>{readinessTier.toUpperCase()}</span></span><span className="text-gray-600">{briefingRationale}</span></div></div><div><h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Governed action</h4><ul className="mb-4 space-y-2">{safeActionHints.length > 0 ? safeActionHints.map(action => <li key={action} className="flex items-center rounded border border-gray-200 bg-white p-2 text-sm text-gray-700"><CheckCircle2 className="mr-2 h-4 w-4 shrink-0 text-emerald-500" /><code className="rounded bg-gray-100 px-1">{action}</code></li>) : <li className="rounded border border-gray-200 bg-white p-2 text-sm text-gray-500">No action passed the governed runtime preflight.</li>}</ul>{briefing.caveats.length > 0 && <><h4 className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-gray-500">Artifact caveats</h4><ul className="space-y-1">{briefing.caveats.map(caveat => <li key={caveat} className="flex items-start rounded border border-amber-100 bg-amber-50 p-2 text-xs text-amber-700"><AlertTriangle className="mr-2 mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />{caveat}</li>)}</ul></>}</div></div></div>}
  </div>
);
