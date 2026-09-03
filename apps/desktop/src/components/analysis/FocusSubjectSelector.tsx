import React, { useEffect, useMemo, useState } from 'react';
import { Search, Target, X } from 'lucide-react';
import type { FocusSubjectCandidate, FocusSubjectOption, FocusSubjectSelection } from '../../lib/focus-subject-analysis';
import { searchFocusSubjectOptions } from '../../lib/focus-subject-analysis';

export const FocusSubjectSelector: React.FC<{
  candidates: FocusSubjectCandidate[];
  selected: FocusSubjectSelection | null;
  onSelect: (candidate: FocusSubjectCandidate, option: FocusSubjectOption) => void;
  onClear: () => void;
}> = ({ candidates, selected, onSelect, onClear }) => {
  const [candidateId, setCandidateId] = useState(candidates[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const activeCandidate = candidates.find(candidate => candidate.id === candidateId) ?? candidates[0] ?? null;

  useEffect(() => {
    if (selected?.candidateId && candidates.some(candidate => candidate.id === selected.candidateId)) {
      setCandidateId(selected.candidateId);
      return;
    }
    if (!candidates.some(candidate => candidate.id === candidateId)) setCandidateId(candidates[0]?.id ?? '');
  }, [candidates, selected?.candidateId]);

  const matches = useMemo(
    () => activeCandidate ? searchFocusSubjectOptions(activeCandidate, query, 20) : [],
    [activeCandidate, query],
  );

  if (candidates.length === 0) return null;

  return <section data-testid="focus-subject-selector" className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900"><Target className="h-4 w-4 text-slate-500" />Choose a focus <span className="font-normal text-slate-400">(optional)</span></div>
        <p className="mt-1 max-w-2xl text-[12px] leading-5 text-slate-500">Keep the full dataset for comparison, but make one entity the center of the analysis.</p>
      </div>
      {selected && <button type="button" onClick={onClear} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"><X className="h-3.5 w-3.5" />Clear focus</button>}
    </div>

    {selected ? <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Analysis focus</div>
      <div className="mt-1 text-[14px] font-semibold text-slate-900">{selected.displayLabel}</div>
      <div className="mt-1 text-[11px] text-slate-500">{selected.field} · comparison population remains unchanged</div>
    </div> : <div className="mt-3 grid gap-2 md:grid-cols-[220px_minmax(0,1fr)]">
      <select aria-label="Focus subject type" value={activeCandidate?.id ?? ''} onChange={event => { setCandidateId(event.target.value); setQuery(''); }} className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 outline-none focus:border-slate-400">
        {candidates.map(candidate => <option key={candidate.id} value={candidate.id}>{candidate.fieldLabel} · {candidate.field}</option>)}
      </select>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input aria-label="Search focus subject" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by ID or name" className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[12px] text-slate-800 outline-none focus:border-slate-400" />
      </div>
      <div className="md:col-start-2">
        {query.trim() ? <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          {matches.length ? matches.map(option => <button type="button" key={option.value} onClick={() => activeCandidate && onSelect(activeCandidate, option)} className="block w-full rounded-md px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-slate-50">
            <span className="font-medium text-slate-900">{option.displayLabel}</span>
          </button>) : <div className="px-3 py-3 text-[12px] text-slate-400">No matching focus found.</div>}
        </div> : <div className="px-1 text-[11px] text-slate-400">Type an identifier or label to choose the subject you care about.</div>}
      </div>
    </div>}
  </section>;
};
