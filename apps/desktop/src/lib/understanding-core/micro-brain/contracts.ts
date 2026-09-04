export const MICRO_BRAIN_KNOWLEDGE_SCHEMA_VERSION = "lightbi.micro-brain.knowledge-card.v1" as const;
export const MICRO_BRAIN_CORPUS_SCHEMA_VERSION = "lightbi.micro-brain.corpus.v1" as const;
export const MICRO_BRAIN_INDEX_SCHEMA_VERSION = "lightbi.micro-brain.index.v1" as const;
export const MICRO_BRAIN_RETRIEVAL_SCHEMA_VERSION = "lightbi.micro-brain.retrieval.v1" as const;

export type MicroBrainKnowledgeStatus = "draft" | "validated";
export type MicroBrainKnowledgeKind =
  | "concept"
  | "dimension"
  | "identifier"
  | "measure"
  | "status"
  | "time"
  | "unit"
  | "event"
  | "snapshot"
  | "flow"
  | "formula"
  | "risk";

export type MicroBrainAnalysisClass =
  | "canonical_bridge"
  | "descriptive"
  | "descriptive_or_canonical_bridge"
  | "relation_only"
  | "guarded_formula";

export type MicroBrainKnowledgeProvenanceV1 = {
  sourceType: "model_synthesis" | "lightbi_contract" | "registry_augmentation";
  sourceLabel: string;
  synthesizedAt: string;
  notes?: string[];
};
export type MicroBrainRelationV1 = {
  subject: string;
  predicate: string;
  object: string;
  polarity: "support" | "distinct_from" | "blocks" | "requires";
  explanation: string;
};

export type MicroBrainFormulaV1 = {
  expression: string;
  requiredInputs: string[];
  requiredGrain: string[];
  requiredUnits: string[];
  requiredTimeBasis: string[];
  blockers: string[];
};

export type MicroBrainKnowledgeCardV1 = {
  schemaVersion: typeof MICRO_BRAIN_KNOWLEDGE_SCHEMA_VERSION;
  id: string;
  status: MicroBrainKnowledgeStatus;
  kind: MicroBrainKnowledgeKind;
  labels: string[];
  canonicalSignal?: string;
  semanticFamily: string;
  relatedDomains: string[];
  definition: string;
  positiveClues: string[];
  negativeClues: string[];
  compatibleTypes: string[];
  relations: MicroBrainRelationV1[];
  requiredEvidence: string[];
  blockers: string[];
  analysisClass: MicroBrainAnalysisClass;
  formula?: MicroBrainFormulaV1;
  provenance: MicroBrainKnowledgeProvenanceV1;
};
export type MicroBrainKnowledgeCorpusV1 = {
  schemaVersion: typeof MICRO_BRAIN_CORPUS_SCHEMA_VERSION;
  corpusId: string;
  version: string;
  maturityLabel: string;
  description: string;
  cards: MicroBrainKnowledgeCardV1[];
};

export type MicroBrainRetrievalUnitKind =
  | "definition"
  | "terminology"
  | "positive_clues"
  | "negative_clues"
  | "relations"
  | "formula_requirements";

export type MicroBrainRetrievalUnitV1 = {
  unitId: string;
  parentCardId: string;
  kind: MicroBrainRetrievalUnitKind;
  text: string;
  polarity: "positive" | "negative" | "neutral";
  typedTags: string[];
};

export type MicroBrainIndexManifestV1 = {
  schemaVersion: typeof MICRO_BRAIN_INDEX_SCHEMA_VERSION;
  corpusId: string;
  corpusVersion: string;
  corpusSha256: string;
  compilerVersion: string;
  tokenizerVersion: string;
  indexVersion: string;
  vectorMethod: "tfidf_lsa_svd";
  vectorDimensions: number;
  rrfK0: number;
  bm25K1?: number;
  bm25B?: number;
  maxFeatures?: number;
  logicalIndexSha256?: string;
  cardCount: number;
  unitCount: number;
  featureCount: number;
  precisionCardCount?: number;
  sparseRecallCardCount?: number;
};
export type MicroBrainRetrievalHitV1 = {
  conceptId: string;
  canonicalSignal: string | null;
  sparseRank: number | null;
  denseRank: number | null;
  fusedRank: number;
  rrfScore: number;
  sparseScore: number | null;
  denseSimilarity: number | null;
  positiveUnitIds: string[];
  negativeUnitIds: string[];
};

export type MicroBrainRetrievalArtifactV1 = {
  schemaVersion: typeof MICRO_BRAIN_RETRIEVAL_SCHEMA_VERSION;
  brainVersion: string;
  indexVersion: string;
  normalizedQuery: string;
  queryFeatures: string[];
  hits: MicroBrainRetrievalHitV1[];
  limitations: string[];
};

export type CompiledMicroBrainIndexV1 = {
  manifest: MicroBrainIndexManifestV1;
  cards: Array<{
    id: string;
    labels?: string[];
    canonicalSignal: string | null;
    semanticFamily: string;
    relatedDomains: string[];
    analysisClass: MicroBrainAnalysisClass;
    definition?: string;
    negativeClues?: string[];
    relations?: MicroBrainRelationV1[];
    requiredEvidence: string[];
    blockers: string[];
    formula?: MicroBrainFormulaV1 | null;
  }>;
  units: MicroBrainRetrievalUnitV1[];
  featureVocabulary: string[];
  idf: number[];
  bm25: {
    documentLengths: number[];
    averageDocumentLength: number;
    postings: Record<string, Array<[number, number]>>;
  };
  lsa: {
    projection: number[][];
    documentVectors: number[][];
  };
};