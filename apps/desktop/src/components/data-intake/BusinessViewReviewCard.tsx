import React from 'react';
import { CheckCircle2, XCircle, Search, HelpCircle, Tags } from 'lucide-react';
import type { BusinessViewCandidate } from '../../lib/business-view-generator';

interface BusinessViewReviewCardProps {
  view: BusinessViewCandidate;
  onUseView: (view: BusinessViewCandidate) => void;
  onIgnoreView: (view: BusinessViewCandidate) => void;
  onReviewRelationships: (view: BusinessViewCandidate) => void;
}

export const BusinessViewReviewCard: React.FC<BusinessViewReviewCardProps> = ({
  view,
  onUseView,
  onIgnoreView,
  onReviewRelationships
}) => {
  const isConfirmed = view.status === 'confirmed';
  const isIgnored = view.status === 'ignored';

  return (
    <div className={`mb-4 border-y px-1 py-5 transition-all ${isConfirmed ? 'border-emerald-200 bg-emerald-50/60' : isIgnored ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-[var(--lb-divider)] bg-white'}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-[16px] font-semibold text-gray-900">{view.title}</h4>
            {view.confidence === 'HIGH' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">HIGH CONFIDENCE</span>}
            {view.confidence === 'MEDIUM' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">MEDIUM CONFIDENCE</span>}
            {view.confidence === 'LOW' && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">LOW CONFIDENCE</span>}
            
            {isConfirmed && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> SELECTED</span>}
            {isIgnored && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500 text-white flex items-center gap-1"><XCircle className="w-3 h-3"/> IGNORED</span>}
          </div>
          <p className="text-[13px] text-gray-600">{view.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {view.domains.filter(d => d !== 'unknown').map(d => (
          <span key={d} className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-[11px] font-medium border border-purple-100">
            <Tags className="w-3 h-3" /> {d}
          </span>
        ))}
        <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-[11px] font-medium border border-gray-200">
          <Database className="w-3 h-3" /> {view.datasets.length} datasets
        </span>
      </div>

      <div className="mb-4 border-l-2 border-slate-300 bg-gray-50 px-3 py-3">
        <h5 className="text-[12px] font-semibold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> Suggested analysis
        </h5>
        <ul className="space-y-1">
          {view.suggestedQuestions.slice(0, 3).map(q => (
            <li key={q.id} className="text-[13px] text-gray-600 flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span> {q.question}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <button 
          onClick={() => onReviewRelationships(view)}
          className="text-[13px] text-blue-600 font-medium hover:text-blue-800 flex items-center gap-1 transition-colors"
        >
          <Search className="w-4 h-4" /> View supporting evidence
        </button>

        <div className="flex gap-2">
          {!isIgnored && (
            <button 
              onClick={() => onIgnoreView(view)}
              className="lb-control px-3 py-1.5 text-[12px] font-medium text-gray-600"
            >
              Ignore
            </button>
          )}
          {!isConfirmed && (
            <button 
              onClick={() => onUseView(view)}
              className="lb-action-primary flex items-center gap-1 px-4 py-1.5 text-[13px]"
            >
              <CheckCircle2 className="w-4 h-4" /> Use this view
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple Database icon since we imported it from lucide in the parent
const Database = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
);
