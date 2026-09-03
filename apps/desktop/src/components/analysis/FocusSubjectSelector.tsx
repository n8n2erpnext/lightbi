import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Target, X } from 'lucide-react';
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
  const [expanded, setExpanded] = useState(Boolean(selected));
  const activeCandidate = candidates.find(candidate => candidate.id === candidateId) ?? candidates[0] ?? null;

  useEffect(() => {
    if (selected) setExpanded(true);
    if (selected?.candidateId && candidates.some(candidate => candidate.id === selected.candidateId)) {
      setCandidateId(selected.candidateId);
      return;
    }
    if (!candidates.some(candidate => candidate.id === candidateId)) setCandidateId(candidates[0]?.id ?? '');
  }, [candidates, selected, selected?.candidateId]);

  const matches = useMemo(
    () => activeCandidate ? searchFocusSubjectOptions(activeCandidate, query, 20) : [],
    [activeCandidate, query],
  );

  if (candidates.length === 0) return null;

  if (!expanded && !selected) return <section data-testid="focus-subject-selector" className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <button data-testid="add-focus-button" type="button" onClick={() => setExpanded(true)} className="inline-flex items-center gap-2 text-[13px] font-semibold text-slate-700 hover:text-slate-950">
          <Plus className="h-4 w-4" /> Add a focus <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Optional</span>
        </button>
        <p className="mt-1 text-[11px] leading-5 text-slate-400">Skip this to analyze the whole dataset as usual. Add a focus only when one entity should be at the center of the analysis.</p>
      </div>
    </div>
  </section>;

  const clearFocus = () => {
    onClear();
    setQuery('');
    setExpanded(false);
  };

  return <section data-testid="focus-subject-selector" className="rounded-xl border border-violet-200 bg-violet-50/30 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900"><Target className="h-4 w-4 text-violet-500" />Focus on something specific <span className="font-normal text-slate-400">(optional)</span></div>
        <p className="mt-1 max-w-2xl text-[12px] leading-5 text-slate-500">The full dataset stays available for comparison. This only makes one entity the center of the analysis.</p>
      </div>
      {selected
        ? <button type="button" onClick={clearFocus} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"><X className="h-3.5 w-3.5" />Clear focus</button>
        : <button type="button" onClick={() => { setExpanded(false); setQuery(''); }} className="rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:bg-white hover:text-slate-600">Skip focus</button>}
    </div>

    {selected ? <div className="mt-3 rounded-lg border border-violet-100 bg-white px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-500">Analysis focus</div>
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
