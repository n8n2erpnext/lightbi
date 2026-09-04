import { useMemo } from "react";
import { AlertCircle, CheckCircle2, MinusCircle } from "lucide-react";
import { FocusSubjectSelector } from "./FocusSubjectSelector";
import {
  createMultiSourceFocusSelection,
  deriveMultiSourceFocusCandidates,
  type MultiSourceFocusReviewSourceV1,
  type MultiSourceFocusSubjectCandidateV1,
  type MultiSourceFocusSubjectSelectionV1,
} from "../../lib/multisource-focus-subject";
import type { FocusSubjectOption, FocusSubjectSelection } from "../../lib/focus-subject-analysis";

export const MultiSourceFocusSubjectSelector: React.FC<{
  sources: MultiSourceFocusReviewSourceV1[];
  activeSourceKeys?: string[];
  selected: MultiSourceFocusSubjectSelectionV1 | null;
  onChange: (selection: MultiSourceFocusSubjectSelectionV1 | null) => void;
}> = ({ sources, activeSourceKeys, selected, onChange }) => {
  const activeKeySet = useMemo(() => new Set(activeSourceKeys ?? sources.map(source => source.key)), [activeSourceKeys, sources]);
  const candidateSources = useMemo(() => sources.filter(source => activeKeySet.has(source.key)), [activeKeySet, sources]);
  const candidates = useMemo(() => deriveMultiSourceFocusCandidates(candidateSources), [candidateSources]);
  if (candidates.length === 0) return null;

  const selectedAdapter: FocusSubjectSelection | null = selected ? {
    candidateId: selected.candidateId,
    canonicalId: selected.canonicalId,
    domain: selected.domain,
    field: "Cross-source canonical identity",
    value: selected.value,
    displayLabel: selected.displayLabel,
    metricFields: [],
  } : null;

  const handleSelect = (candidate: MultiSourceFocusSubjectCandidateV1, option: FocusSubjectOption) => {
    onChange(createMultiSourceFocusSelection(candidate, option, sources));
  };
  const visibleBindings = selected?.bindings.filter(binding => activeKeySet.has(binding.sourceKey)) ?? [];
  const matched = visibleBindings.filter((binding) => binding.state === "matched_exact");
  const absent = visibleBindings.filter((binding) => binding.state === "concept_available_value_absent");
  const unavailable = visibleBindings.filter((binding) => binding.state === "concept_unavailable");

  return <div data-testid="multisource-focus-subject" className="mt-5 space-y-3">
    <FocusSubjectSelector
      candidates={candidates}
      selected={selectedAdapter}
      onSelect={(candidate, option) => handleSelect(candidate as MultiSourceFocusSubjectCandidateV1, option)}
      onClear={() => onChange(null)}
    />
    {selected && <div className="rounded-xl border border-violet-100 bg-white/80 p-3 text-[11px] text-slate-600">
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700"><CheckCircle2 className="h-3 w-3" />{matched.length} exact source match{matched.length === 1 ? "" : "es"}</span>
        {absent.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700"><MinusCircle className="h-3 w-3" />{absent.length} source{absent.length === 1 ? "" : "s"} without this exact value</span>}
        {unavailable.length > 0 && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-slate-600"><AlertCircle className="h-3 w-3" />{unavailable.length} source{unavailable.length === 1 ? "" : "s"} without a governed concept binding</span>}
      </div>
      <p className="mt-2 leading-5">Focus changes the analysis readout only where exact source evidence exists. Governed totals and source relationships remain unchanged.</p>
    </div>}
  </div>;
};
