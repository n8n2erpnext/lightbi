export const DOMAIN_INFERENCE_ARTIFACT_VERSION = "lightbi.domain-inference-artifact.v1" as const;

export type DomainInferenceSourceV1 =
  | "canonical_resolution"
  | "micro_brain_relation"
  | "mixed";

export type DomainAnalysisModeV1 =
  | "governed_supported"
  | "canonical_detect_only"
  | "evidence_bound_inferred_domain"
  | "unknown_or_ambiguous";

export type DomainInferenceEvidenceV1 = {
  domainId: string;
  source: DomainInferenceSourceV1;
  evidenceRank: number;
  canonicalSignalIds: string[];
  physicalColumns: string[];
  reasonCodes: string[];
};

export type DomainInferenceArtifactV1 = {
  schemaVersion: typeof DOMAIN_INFERENCE_ARTIFACT_VERSION;
  primaryDomain: string | null;
  primaryDomainSource: DomainInferenceSourceV1 | null;
  domains: DomainInferenceEvidenceV1[];
  semanticConcepts: {
    confirmed: number;
    probable: number;
    microBrainRecovered: number;
    ambiguous: number;
    unknown: number;
    unresolved: number;
  };
  evidenceConflicts: number;
  officialSupport: {
    packId: string;
    state: string;
    productionActive: boolean;
  };
  analysisMode: DomainAnalysisModeV1;
  limitations: string[];
};
