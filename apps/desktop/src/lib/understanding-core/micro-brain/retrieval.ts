import {
  MICRO_BRAIN_RETRIEVAL_SCHEMA_VERSION,
  type CompiledMicroBrainIndexV1,
  type MicroBrainRetrievalArtifactV1,
  type MicroBrainRetrievalHitV1,
} from "./contracts";
import { microBrainFeaturesForText, normalizeMicroBrainSurface } from "./normalization";

export type MicroBrainQueryV1 = {
  text: string;
  typedTags?: string[];
  limit?: number;
};

type UnitScore = { unitIndex: number; score: number };
type ConceptAccumulator = {
  conceptId: string;
  canonicalSignal: string | null;
  sparseRank: number | null;
  denseRank: number | null;
  sparseScore: number | null;
  denseSimilarity: number | null;
  positiveUnitIds: Set<string>;
  negativeUnitIds: Set<string>;
};

type PreparedMicroBrainIndex = {
  featureIndex: Map<string, number>;
  canonicalSignalByConcept: Map<string, string | null>;
};

const PREPARED_INDEX = new WeakMap<CompiledMicroBrainIndexV1, PreparedMicroBrainIndex>();

function prepareIndex(index: CompiledMicroBrainIndexV1): PreparedMicroBrainIndex {
  const cached = PREPARED_INDEX.get(index);
  if (cached) return cached;
  const prepared = {
    featureIndex: new Map(index.featureVocabulary.map((feature, featurePosition) => [feature, featurePosition])),
    canonicalSignalByConcept: new Map(index.cards.map((card) => [card.id, card.canonicalSignal])),
  };
  PREPARED_INDEX.set(index, prepared);
  return prepared;
}

function countFeatures(features: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const feature of features) counts.set(feature, (counts.get(feature) ?? 0) + 1);
  return counts;
}

function dot(left: readonly number[], right: readonly number[]): number {
  let total = 0;
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) total += left[index] * right[index];
  return total;
}
function normalizeTypedTag(tag: string): string {
  return tag
    .split(":")
    .map((part) => normalizeMicroBrainSurface(part).replace(/\s+/g, "_"))
    .filter(Boolean)
    .join(":");
}

function buildQueryFeatures(query: MicroBrainQueryV1): string[] {
  return [
    ...microBrainFeaturesForText(query.text, true),
    ...(query.typedTags ?? []).map((tag) => `t:${normalizeTypedTag(tag)}`),
  ];
}

function sparseRank(index: CompiledMicroBrainIndexV1, queryFeatures: readonly string[]): UnitScore[] {
  const tuning = index.manifest as typeof index.manifest & { bm25K1?: number; bm25B?: number };
  const k1 = tuning.bm25K1 ?? 1.2;
  const b = tuning.bm25B ?? 0.75;
  const scores = new Map<number, number>();
  const queryCounts = countFeatures(queryFeatures);
  const unitCount = index.units.length;
  const averageLength = Math.max(index.bm25.averageDocumentLength, 1);

  for (const [feature, queryCount] of queryCounts) {
    const posting = index.bm25.postings[feature];
    if (!posting?.length) continue;
    const df = posting.length;
    const inverseDocumentFrequency = Math.log(1 + (unitCount - df + 0.5) / (df + 0.5));
    const queryWeight = 1 + Math.log(queryCount);
    for (const [unitIndex, termFrequency] of posting) {
      const documentLength = index.bm25.documentLengths[unitIndex] ?? averageLength;
      const denominator = termFrequency + k1 * (1 - b + b * (documentLength / averageLength));
      const contribution = inverseDocumentFrequency * ((termFrequency * (k1 + 1)) / denominator) * queryWeight;
      scores.set(unitIndex, (scores.get(unitIndex) ?? 0) + contribution);
    }
  }
  return [...scores.entries()]
    .map(([unitIndex, score]) => ({ unitIndex, score }))
    .sort((left, right) => right.score - left.score || left.unitIndex - right.unitIndex);
}

function denseQueryVector(index: CompiledMicroBrainIndexV1, queryFeatures: readonly string[]): number[] | null {
  const { featureIndex } = prepareIndex(index);
  const counts = countFeatures(queryFeatures.filter((feature) => featureIndex.has(feature)));
  if (counts.size === 0) return null;
  const sparse = Array(index.featureVocabulary.length).fill(0);
  for (const [feature, count] of counts) {
    const featurePosition = featureIndex.get(feature);
    if (featurePosition === undefined) continue;
    sparse[featurePosition] = (1 + Math.log(count)) * index.idf[featurePosition];
  }
  const sparseNorm = Math.sqrt(sparse.reduce((sum, value) => sum + value * value, 0));
  if (sparseNorm === 0) return null;
  for (let indexPosition = 0; indexPosition < sparse.length; indexPosition += 1) sparse[indexPosition] /= sparseNorm;
  const dimensions = index.manifest.vectorDimensions;
  const projected = Array(dimensions).fill(0);
  for (let featurePosition = 0; featurePosition < sparse.length; featurePosition += 1) {
    const value = sparse[featurePosition];
    if (value === 0) continue;
    const projection = index.lsa.projection[featurePosition];
    for (let component = 0; component < dimensions; component += 1) projected[component] += value * projection[component];
  }
  const norm = Math.sqrt(projected.reduce((sum, value) => sum + value * value, 0));
  return norm > 0 ? projected.map((value) => value / norm) : null;
}
function denseRank(index: CompiledMicroBrainIndexV1, queryFeatures: readonly string[]): UnitScore[] {
  const queryVector = denseQueryVector(index, queryFeatures);
  if (!queryVector) return [];
  return index.lsa.documentVectors
    .map((vector, unitIndex) => ({ unitIndex, score: dot(queryVector, vector) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.unitIndex - right.unitIndex);
}

function ensureConcept(
  concepts: Map<string, ConceptAccumulator>,
  index: CompiledMicroBrainIndexV1,
  conceptId: string,
): ConceptAccumulator {
  const existing = concepts.get(conceptId);
  if (existing) return existing;
  const canonicalSignal = prepareIndex(index).canonicalSignalByConcept.get(conceptId) ?? null;
  const created: ConceptAccumulator = {
    conceptId,
    canonicalSignal,
    sparseRank: null,
    denseRank: null,
    sparseScore: null,
    denseSimilarity: null,
    positiveUnitIds: new Set<string>(),
    negativeUnitIds: new Set<string>(),
  };
  concepts.set(conceptId, created);
  return created;
}

function recordUnit(accumulator: ConceptAccumulator, index: CompiledMicroBrainIndexV1, unitIndex: number): void {
  const unit = index.units[unitIndex];
  if (!unit) return;
  if (unit.polarity === "negative") accumulator.negativeUnitIds.add(unit.unitId);
  else accumulator.positiveUnitIds.add(unit.unitId);
}

export function retrieveMicroBrainConcepts(
  index: CompiledMicroBrainIndexV1,
  query: MicroBrainQueryV1,
): MicroBrainRetrievalArtifactV1 {
  const normalizedQuery = normalizeMicroBrainSurface(query.text);
  const queryFeatures = buildQueryFeatures(query);
  const sparse = sparseRank(index, queryFeatures);
  const dense = denseRank(index, queryFeatures);
  const concepts = new Map<string, ConceptAccumulator>();
  const scanLimit = Math.min(Math.max((query.limit ?? 8) * 12, 48), 160);

  let conceptRank = 0;
  const seenSparse = new Set<string>();
  for (const item of sparse.slice(0, scanLimit)) {
    const unit = index.units[item.unitIndex];
    const accumulator = ensureConcept(concepts, index, unit.parentCardId);
    recordUnit(accumulator, index, item.unitIndex);
    if (unit.polarity === "negative") continue;
    if (!seenSparse.has(unit.parentCardId)) {
      seenSparse.add(unit.parentCardId);
      accumulator.sparseRank = ++conceptRank;
      accumulator.sparseScore = item.score;
    } else if ((accumulator.sparseScore ?? Number.NEGATIVE_INFINITY) < item.score) accumulator.sparseScore = item.score;
  }

  conceptRank = 0;
  const seenDense = new Set<string>();
  for (const item of dense.slice(0, scanLimit)) {
    const unit = index.units[item.unitIndex];
    const accumulator = ensureConcept(concepts, index, unit.parentCardId);
    recordUnit(accumulator, index, item.unitIndex);
    if (unit.polarity === "negative") continue;
    if (!seenDense.has(unit.parentCardId)) {
      seenDense.add(unit.parentCardId);
      accumulator.denseRank = ++conceptRank;
      accumulator.denseSimilarity = item.score;
    } else if ((accumulator.denseSimilarity ?? Number.NEGATIVE_INFINITY) < item.score) accumulator.denseSimilarity = item.score;
  }
  const k0 = index.manifest.rrfK0;
  const ranked = [...concepts.values()]
    .filter((item) => item.sparseRank !== null || item.denseRank !== null)
    .map((item) => ({
      ...item,
      rrfScore: (item.sparseRank === null ? 0 : 1 / (k0 + item.sparseRank))
        + (item.denseRank === null ? 0 : 1 / (k0 + item.denseRank)),
    }))
    .sort((left, right) => right.rrfScore - left.rrfScore
      || (right.denseSimilarity ?? Number.NEGATIVE_INFINITY) - (left.denseSimilarity ?? Number.NEGATIVE_INFINITY)
      || left.conceptId.localeCompare(right.conceptId));

  const limit = Math.min(Math.max(query.limit ?? 8, 1), 16);
  const hits: MicroBrainRetrievalHitV1[] = ranked.slice(0, limit).map((item, indexPosition) => ({
    conceptId: item.conceptId,
    canonicalSignal: item.canonicalSignal,
    sparseRank: item.sparseRank,
    denseRank: item.denseRank,
    fusedRank: indexPosition + 1,
    rrfScore: item.rrfScore,
    sparseScore: item.sparseScore,
    denseSimilarity: item.denseSimilarity,
    positiveUnitIds: [...item.positiveUnitIds].sort(),
    negativeUnitIds: [...item.negativeUnitIds].sort(),
  }));

  return {
    schemaVersion: MICRO_BRAIN_RETRIEVAL_SCHEMA_VERSION,
    brainVersion: index.manifest.corpusVersion,
    indexVersion: index.manifest.indexVersion,
    normalizedQuery,
    queryFeatures,
    hits,
    limitations: [
      "Retrieval rank and dense similarity are candidate-recall provenance, not semantic confidence.",
      "A retrieved concept cannot activate domain support, metric authorization, or final semantic resolution by itself.",
      "Negative knowledge is preserved separately and must not be hidden by a positive retrieval hit.",
    ],
  };
}