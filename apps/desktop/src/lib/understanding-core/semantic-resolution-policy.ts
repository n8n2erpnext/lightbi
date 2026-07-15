import { canonicalJson, deterministicPolicySha256 } from "./contextual-evidence-policy";
import { SEMANTIC_RESOLUTION_POLICY_VERSION, type LexicalEvidenceClass, type ResolutionPolicyV1 } from "./semantic-resolution-contracts";

export const LEXICAL_CLASS_ORDER: LexicalEvidenceClass[] = ["canonical_id_exact", "canonical_label_exact", "header_alias_exact", "alias_exact", "token_containment", "value_only", "none"];
export const SEMANTIC_RESOLUTION_POLICY: ResolutionPolicyV1 = {
  schemaVersion: SEMANTIC_RESOLUTION_POLICY_VERSION,
  lexicalOrder: LEXICAL_CLASS_ORDER,
  materialStructuralIssues: ["technical_column", "mixed_type", "malformed_value", "header_not_found", "header_selection_ambiguous", "merged_header_suspected", "parse_failure"],
  forbiddenInference: ["weighted_score", "total_ranking", "candidate_manufacture", "context_bootstrap", "absence_as_support", "representative_as_full_file_truth", "representative_family_as_independent_support", "domain_or_grain_inference"],
  rules: [
    { ruleId: "R-TECHNICAL", description: "Technical observations remain technical and cannot select business semantics.", outcome: "technical" },
    { ruleId: "R-UNSUPPORTED", description: "Unsupported physical input remains explicit.", outcome: "unsupported_input" },
    { ruleId: "R-NO-CANDIDATE", description: "Candidate absence resolves to unknown.", outcome: "unknown" },
    { ruleId: "R-WEAK-ONLY", description: "Containment, representative values, generic physical facts, or correlated context alone abstain.", outcome: "unknown" },
    { ruleId: "R-MATERIAL-CONFLICT", description: "Material structural or semantic conflict prevents selection.", outcome: "materially_conflicted" },
    { ruleId: "R-AMBIGUOUS", description: "Multiple incomparable viable candidates remain ambiguous.", outcome: "ambiguous" },
    { ruleId: "R-PROBABLE", description: "One viable exact candidate plus an independent non-lexical family may be probable.", outcome: "probable" },
    { ruleId: "R-CONFIRMED", description: "One viable exact candidate plus two independent non-lexical families including full-file facts may be confirmed.", outcome: "confirmed" },
    { ruleId: "R-DOMINANCE", description: "Strict support-set partial-order dominance; contextual support alone cannot dominate.", outcome: "dominated" },
    { ruleId: "R-DEBT", description: "Material absent alternatives block confidence and force unknown or ambiguity.", outcome: "governance" },
  ],
};

export function semanticResolutionPolicyHash(value: unknown = SEMANTIC_RESOLUTION_POLICY): string { return deterministicPolicySha256(value); }
export function canonicalResolutionJson(value: unknown): string { return canonicalJson(value); }
