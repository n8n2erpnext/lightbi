const BUSINESS_REASON_COPY: Record<string, string> = {
  currency_basis_not_explicit: 'Confirm the reporting currency before this analysis can run.',
  currency_basis_ambiguous_or_incompatible: 'The reporting currency needs review before this analysis can run.',
  unit_basis_not_explicit: 'Confirm the unit of measure before this analysis can run.',
  unit_basis_ambiguous_or_incompatible: 'The unit of measure needs review before this analysis can run.',
  metric_time_basis_incompatible_or_missing: 'Confirm a compatible reporting period before this analysis can run.',
  governed_identity_required_for_count: 'Confirm the business identity used for this governed count.',
  metric_grain_incompatible: 'The current data grain cannot safely support this analysis.',
  cross_source_metric_requires_governed_relationship: 'Confirm the governed relationship between the required sources.',
  unsupported_domain_pack: 'This analysis is not supported by the currently installed domain packs.',
  canonical_full_file_runtime_source_required: 'Reconnect the complete governed source before running this analysis.',
  canonical_handoff_required: 'Reopen the governed source before running this analysis.',
};

export function businessReasonCopy(code: string): string {
  const normalized = String(code ?? '').trim();
  if (!normalized) return 'This analysis needs source review before it can run.';
  if (BUSINESS_REASON_COPY[normalized]) return BUSINESS_REASON_COPY[normalized];
  if (normalized.startsWith('missing_semantic_requirement:')) {
    return 'Confirm the required column meaning before this analysis can run.';
  }
  return 'This analysis needs governed source evidence before it can run.';
}

export function businessReasonSummary(codes: readonly string[]): string[] {
  return [...new Set(codes.map(businessReasonCopy).filter(Boolean))];
}
