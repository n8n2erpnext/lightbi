import type { FocusSubjectCandidate, FocusSubjectOption } from "./focus-subject-analysis";

export type MultiSourceFocusReviewSourceV1 = {
  key: string;
  name: string;
  focusCandidates?: FocusSubjectCandidate[];
};

export type MultiSourceFocusSubjectCandidateV1 = FocusSubjectCandidate & {
  sourceKeys: string[];
};

export type MultiSourceFocusBindingStateV1 =
  | "matched_exact"
  | "concept_available_value_absent"
  | "concept_unavailable";

export type MultiSourceFocusSourceBindingV1 = {
  sourceKey: string;
  sourceName: string;
  state: MultiSourceFocusBindingStateV1;
  field: string | null;
  labelField?: string;
};

export type MultiSourceFocusSubjectSelectionV1 = {
  schemaVersion: "lightbi.multisource-focus-subject.v1";
  candidateId: string;
  canonicalId: string;
  domain: FocusSubjectCandidate["domain"];
  value: string;
  displayLabel: string;
  bindings: MultiSourceFocusSourceBindingV1[];
};

const normalized = (value: string) => value.trim();

export function deriveMultiSourceFocusCandidates(
  sources: MultiSourceFocusReviewSourceV1[],
): MultiSourceFocusSubjectCandidateV1[] {
  const grouped = new Map<string, Array<{ source: MultiSourceFocusReviewSourceV1; candidate: FocusSubjectCandidate }>>();
  for (const source of sources) {
    for (const candidate of source.focusCandidates ?? []) {
      const entries = grouped.get(candidate.canonicalId) ?? [];
      entries.push({ source, candidate });
      grouped.set(candidate.canonicalId, entries);
    }
  }
  return [...grouped.entries()].map(([canonicalId, entries]) => {
    const representative = [...entries].sort((a, b) => b.candidate.confidence - a.candidate.confidence)[0].candidate;
    const options = new Map<string, FocusSubjectOption>();
    for (const { candidate } of entries) {
      for (const option of candidate.options) {
        const value = normalized(option.value);
        if (!value) continue;
        const existing = options.get(value);
        if (!existing || option.displayLabel.length > existing.displayLabel.length) options.set(value, option);
      }
    }
    return {
      ...representative,
      id: `multisource:${canonicalId}`,
      options: [...options.values()].sort((a, b) => a.displayLabel.localeCompare(b.displayLabel, undefined, { numeric: true })),
      sourceKeys: [...new Set(entries.map(({ source }) => source.key))].sort(),
    };
  }).filter((candidate) => candidate.options.length >= 2)
    .sort((a, b) => b.sourceKeys.length - a.sourceKeys.length || b.confidence - a.confidence || a.fieldLabel.localeCompare(b.fieldLabel));
}

export function createMultiSourceFocusSelection(
  candidate: MultiSourceFocusSubjectCandidateV1,
  option: FocusSubjectOption,
  sources: MultiSourceFocusReviewSourceV1[],
): MultiSourceFocusSubjectSelectionV1 {
  const bindings = sources.map((source): MultiSourceFocusSourceBindingV1 => {
    const local = (source.focusCandidates ?? []).find((item) => item.canonicalId === candidate.canonicalId);
    if (!local) return { sourceKey: source.key, sourceName: source.name, state: "concept_unavailable", field: null };
    const exact = local.options.some((item) => normalized(item.value) === normalized(option.value));
    return {
      sourceKey: source.key,
      sourceName: source.name,
      state: exact ? "matched_exact" : "concept_available_value_absent",
      field: local.field,
      labelField: local.labelField,
    };
  });
  return {
    schemaVersion: "lightbi.multisource-focus-subject.v1",
    candidateId: candidate.id,
    canonicalId: candidate.canonicalId,
    domain: candidate.domain,
    value: option.value,
    displayLabel: option.displayLabel,
    bindings,
  };
}

export function focusBindingForSource(
  selection: MultiSourceFocusSubjectSelectionV1 | null | undefined,
  sourceKey: string,
): MultiSourceFocusSourceBindingV1 | null {
  return selection?.bindings.find((binding) => binding.sourceKey === sourceKey) ?? null;
}

export function filterRowsForMultiSourceFocus(
  rows: Record<string, unknown>[],
  selection: MultiSourceFocusSubjectSelectionV1 | null | undefined,
  binding: MultiSourceFocusSourceBindingV1 | null | undefined,
): Record<string, unknown>[] {
  if (!selection) return rows;
  if (!binding || binding.state !== "matched_exact" || !binding.field) return [];
  const wanted = normalized(selection.value);
  return rows.filter((row) => normalized(String(row[binding.field!] ?? "")) === wanted);
}
