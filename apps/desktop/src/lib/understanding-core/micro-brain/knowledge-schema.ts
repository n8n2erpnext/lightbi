import { SEMANTIC_SIGNAL_BY_ID } from "../../semantic-registry";
import {
  MICRO_BRAIN_CORPUS_SCHEMA_VERSION,
  MICRO_BRAIN_KNOWLEDGE_SCHEMA_VERSION,
  type MicroBrainKnowledgeCardV1,
  type MicroBrainKnowledgeCorpusV1,
} from "./contracts";
import { normalizeMicroBrainSurface } from "./normalization";

export type MicroBrainKnowledgeValidationV1 = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

const ID_PATTERN = /^concept\.[a-z0-9][a-z0-9._-]*$/;
const FORBIDDEN_FIXTURE_SURFACES = ["sample-corpus", "expected answer", "fixture id", "holdout case id", "test oracle id"];

function duplicateValues(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values.map(normalizeMicroBrainSurface).filter(Boolean)) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated].sort();
}

function nonEmpty(values: readonly string[]): boolean {
  return values.some((value) => normalizeMicroBrainSurface(value).length > 0);
}

export function validateMicroBrainKnowledgeCard(card: MicroBrainKnowledgeCardV1): MicroBrainKnowledgeValidationV1 {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (card.schemaVersion !== MICRO_BRAIN_KNOWLEDGE_SCHEMA_VERSION) errors.push(`schema_version:${card.id}`);
  if (!ID_PATTERN.test(card.id)) errors.push(`invalid_id:${card.id}`);
  if (!nonEmpty(card.labels)) errors.push(`labels_required:${card.id}`);
  if (!normalizeMicroBrainSurface(card.definition)) errors.push(`definition_required:${card.id}`);
  if (!nonEmpty(card.positiveClues)) errors.push(`positive_clues_required:${card.id}`);
  if (!nonEmpty(card.negativeClues)) errors.push(`negative_clues_required:${card.id}`);
  if (!card.semanticFamily.trim()) errors.push(`semantic_family_required:${card.id}`);
  if (!nonEmpty(card.relatedDomains)) errors.push(`related_domains_required:${card.id}`);
  if (card.compatibleTypes.length === 0) warnings.push(`compatible_types_empty:${card.id}`);
  if (card.requiredEvidence.length === 0) warnings.push(`required_evidence_empty:${card.id}`);
  if (card.canonicalSignal && !SEMANTIC_SIGNAL_BY_ID.has(card.canonicalSignal)) {
    errors.push(`unknown_canonical_signal:${card.id}:${card.canonicalSignal}`);
  }
  duplicateValues(card.labels).forEach((value) => errors.push(`duplicate_label:${card.id}:${value}`));
  duplicateValues(card.positiveClues).forEach((value) => warnings.push(`duplicate_positive_clue:${card.id}:${value}`));
  duplicateValues(card.negativeClues).forEach((value) => warnings.push(`duplicate_negative_clue:${card.id}:${value}`));

  const positive = new Set(card.positiveClues.map(normalizeMicroBrainSurface).filter(Boolean));
  for (const clue of card.negativeClues.map(normalizeMicroBrainSurface).filter(Boolean)) {
    if (positive.has(clue)) errors.push(`direct_clue_contradiction:${card.id}:${clue}`);
  }
  const sourceText = normalizeMicroBrainSurface([
    card.definition,
    ...card.labels,
    ...card.positiveClues,
    ...card.negativeClues,
  ].join(" "));
  for (const forbidden of FORBIDDEN_FIXTURE_SURFACES) {
    if (sourceText.includes(normalizeMicroBrainSurface(forbidden))) errors.push(`fixture_truth_leak:${card.id}:${forbidden}`);
  }

  const relationKeys = new Set<string>();
  for (const relation of card.relations) {
    const key = [relation.subject, relation.predicate, relation.object, relation.polarity]
      .map(normalizeMicroBrainSurface)
      .join("|");
    if (relationKeys.has(key)) errors.push(`duplicate_relation:${card.id}:${key}`);
    relationKeys.add(key);
    if (!normalizeMicroBrainSurface(relation.explanation)) errors.push(`relation_explanation_required:${card.id}:${key}`);
  }

  if (card.analysisClass === "guarded_formula" && !card.formula) errors.push(`formula_required:${card.id}`);
  if (card.formula && card.analysisClass !== "guarded_formula") warnings.push(`formula_on_non_formula_card:${card.id}`);
  return { valid: errors.length === 0, errors: [...new Set(errors)].sort(), warnings: [...new Set(warnings)].sort() };
}
export function validateMicroBrainKnowledgeCorpus(corpus: MicroBrainKnowledgeCorpusV1): MicroBrainKnowledgeValidationV1 {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (corpus.schemaVersion !== MICRO_BRAIN_CORPUS_SCHEMA_VERSION) errors.push("corpus_schema_version");
  if (!corpus.corpusId.trim()) errors.push("corpus_id_required");
  if (!/^\d+\.\d+\.\d+(?:[-+][a-z0-9.-]+)?$/i.test(corpus.version)) errors.push("corpus_version_must_be_semver");
  if (corpus.cards.length === 0) errors.push("corpus_cards_required");

  const ids = new Set<string>();
  for (const card of corpus.cards) {
    if (ids.has(card.id)) errors.push(`duplicate_card_id:${card.id}`);
    ids.add(card.id);
    const result = validateMicroBrainKnowledgeCard(card);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  const normalizedLabels = new Map<string, string[]>();
  for (const card of corpus.cards) {
    for (const label of card.labels) {
      const normalized = normalizeMicroBrainSurface(label);
      if (!normalized) continue;
      const members = normalizedLabels.get(normalized) ?? [];
      members.push(card.id);
      normalizedLabels.set(normalized, members);
    }
  }
  for (const [surface, members] of normalizedLabels) {
    if (new Set(members).size > 1) warnings.push(`cross_card_label_collision:${surface}:${[...new Set(members)].sort().join(",")}`);
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)].sort(), warnings: [...new Set(warnings)].sort() };
}