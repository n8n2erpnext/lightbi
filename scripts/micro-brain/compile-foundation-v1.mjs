import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Matrix, SingularValueDecomposition } from "ml-matrix";

const ROOT = path.resolve(import.meta.dirname, "../..");
const BRAIN_DIR = path.join(ROOT, "apps/desktop/src/lib/understanding-core/micro-brain");
const KNOWLEDGE_DIR = path.join(BRAIN_DIR, "knowledge");
const OUTPUT_PATH = path.join(BRAIN_DIR, "compiled/foundation.index.v1.json");
const SOURCE_MANIFEST_PATH = path.join(KNOWLEDGE_DIR, "manifest.v1.json");

const COMPILER_VERSION = "lightbi.micro-brain.compiler.v1";
const TOKENIZER_VERSION = "lightbi.micro-brain.tokenizer.v1";
const INDEX_VERSION = "lightbi.micro-brain.foundation-index.v1";
const MAX_FEATURES = 2048;
const VECTOR_DIMENSIONS_TARGET = 128;
const RRF_K0 = 60;
const BM25_K1 = 1.2;
const BM25_B = 0.75;

function normalize(value) {
  return String(value ?? "")
    .replace(/đ/gi, (character) => (character === "Đ" ? "D" : "d"))
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9%]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
const STOP_WORDS = new Set(["a", "an", "and", "are", "as", "at", "by", "for", "from", "in", "is", "of", "on", "or", "the", "to", "with", "la", "va", "cua", "cho", "tu", "trong", "tren", "voi"]);

function words(value) {
  return normalize(value).split(" ").filter((token) => token && (!STOP_WORDS.has(token) || token.length <= 2));
}

function charGrams(value) {
  const surface = normalize(value).replace(/\s+/g, "_");
  const grams = [];
  for (const size of [3, 4]) {
    if (surface.length < size) continue;
    for (let index = 0; index <= surface.length - size; index += 1) grams.push(surface.slice(index, index + size));
  }
  return grams;
}

function featuresForText(text, includeCharGrams = false) {
  const tokens = words(text);
  const features = tokens.map((token) => `w:${token}`);
  for (let index = 0; index < tokens.length - 1; index += 1) features.push(`b:${tokens[index]}_${tokens[index + 1]}`);
  if (includeCharGrams) {
    for (const token of tokens.filter((value) => value.length >= 4)) {
      for (const gram of charGrams(token)) features.push(`c:${gram}`);
    }
  }
  return features;
}

function countTerms(features) {
  const counts = new Map();
  for (const feature of features) counts.set(feature, (counts.get(feature) ?? 0) + 1);
  return counts;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function isSparseRecallCard(card) {
  return card.provenance?.sourceType === "registry_augmentation" || card.id.startsWith("concept.domain_");
}

function typedTags(card) {
  return [
    `kind:${card.kind}`,
    `family:${normalize(card.semanticFamily).replace(/\s+/g, "_")}`,
    `analysis:${card.analysisClass}`,
    ...(isSparseRecallCard(card) ? ["tier:sparse_recall"] : []),
    ...card.relatedDomains.map((domain) => `domain:${normalize(domain).replace(/\s+/g, "_")}`),
    ...card.compatibleTypes.map((type) => `type:${normalize(type).replace(/\s+/g, "_")}`),
  ].sort();
}

function unit(parentCardId, kind, text, polarity, tags) {
  return { unitId: `${parentCardId}:${kind}`, parentCardId, kind, text, polarity, typedTags: tags };
}

function retrievalUnits(card) {
  const tags = typedTags(card);
  // Registry augmentation is a recall fallback. Keep its index footprint narrow so generated
  // dictionary bridges do not drown out the richer manual foundation and negative-knowledge cards.
  if (isSparseRecallCard(card)) {
    return [
      unit(card.id, "terminology", `${card.labels.join(" ; ")} ; ${card.semanticFamily} ; ${card.relatedDomains.join(" ; ")}`, "positive", tags),
      unit(card.id, "positive_clues", card.positiveClues.join(" ; "), "positive", tags),
    ];
  }
  const units = [
    unit(card.id, "definition", `${card.labels.join(" ; ")} . ${card.definition}`, "neutral", tags),
    unit(card.id, "terminology", `${card.labels.join(" ; ")} ; ${card.semanticFamily} ; ${card.relatedDomains.join(" ; ")}`, "positive", tags),
    unit(card.id, "positive_clues", card.positiveClues.join(" ; "), "positive", tags),
    unit(card.id, "negative_clues", card.negativeClues.join(" ; "), "negative", tags),
  ];
  if (card.relations.length > 0) {
    units.push(unit(card.id, "relations", card.relations.map((item) => `${item.subject} ${item.predicate} ${item.object} ${item.explanation}`).join(" ; "), card.relations.some((item) => item.polarity === "distinct_from" || item.polarity === "blocks") ? "negative" : "neutral", tags));
  }
  if (card.formula) {
    units.push(unit(card.id, "formula_requirements", [card.formula.expression, ...card.formula.requiredInputs, ...card.formula.requiredGrain, ...card.formula.requiredUnits, ...card.formula.requiredTimeBasis, ...card.formula.blockers].join(" ; "), "neutral", tags));
  }
  return units;
}

const sourceManifest = JSON.parse(fs.readFileSync(SOURCE_MANIFEST_PATH, "utf8"));
const sourceBuffers = [];
const cards = [];
for (const fileName of [...sourceManifest.files].sort()) {
  const bytes = fs.readFileSync(path.join(KNOWLEDGE_DIR, fileName));
  sourceBuffers.push(Buffer.from(fileName), Buffer.from([0]), bytes, Buffer.from([0]));
  cards.push(...JSON.parse(bytes.toString("utf8")));
}
cards.sort((left, right) => left.id.localeCompare(right.id));
const units = cards.flatMap(retrievalUnits);
const precisionCards = cards.filter((card) => !isSparseRecallCard(card));
const sparseRecallCards = cards.filter(isSparseRecallCard);
const precisionCardIds = new Set(precisionCards.map((card) => card.id));
const trainingDocuments = precisionCards.map((card) => {
  const cardUnits = units.filter((item) => item.parentCardId === card.id);
  const lexical = cardUnits.flatMap((item) => featuresForText(item.text, item.kind === "terminology" || item.kind === "positive_clues"));
  return [...lexical, ...typedTags(card).map((tag) => `t:${tag}`)];
});

// Dense semantics are trained only on the curated precision foundation. Generated registry/domain
// cards stay out of LSA so dictionary expansion cannot rotate the semantic space or dilute negative knowledge.
const documentFrequency = new Map();
const collectionFrequency = new Map();
for (const document of trainingDocuments) {
  const unique = new Set(document);
  for (const feature of unique) documentFrequency.set(feature, (documentFrequency.get(feature) ?? 0) + 1);
  for (const feature of document) collectionFrequency.set(feature, (collectionFrequency.get(feature) ?? 0) + 1);
}

const trainingCount = trainingDocuments.length;
const scoredFeatures = [...collectionFrequency.keys()].map((feature) => {
  const df = documentFrequency.get(feature) ?? 0;
  const cf = collectionFrequency.get(feature) ?? 0;
  const idf = Math.log((trainingCount + 1) / (df + 1)) + 1;
  const typeBoost = feature.startsWith("w:") ? 1.35 : feature.startsWith("b:") ? 1.2 : feature.startsWith("t:") ? 1.15 : 1;
  const singletonPenalty = df === 1 && feature.startsWith("c:") ? 0.55 : 1;
  return { feature, score: Math.log1p(cf) * idf * typeBoost * singletonPenalty, df };
});

scoredFeatures.sort((left, right) => right.score - left.score || right.df - left.df || left.feature.localeCompare(right.feature));
const featureVocabulary = scoredFeatures.slice(0, MAX_FEATURES).map((item) => item.feature);
const featureIndex = new Map(featureVocabulary.map((feature, index) => [feature, index]));
const idf = featureVocabulary.map((feature) => Math.log((trainingCount + 1) / ((documentFrequency.get(feature) ?? 0) + 1)) + 1);

function denseTfidf(features) {
  const counts = countTerms(features.filter((feature) => featureIndex.has(feature)));
  const vector = Array(featureVocabulary.length).fill(0);
  for (const [feature, count] of counts) {
    const index = featureIndex.get(feature);
    vector[index] = (1 + Math.log(count)) * idf[index];
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm > 0 ? vector.map((value) => value / norm) : vector;
}

const trainingMatrix = new Matrix(trainingDocuments.map(denseTfidf));
const vectorDimensions = Math.min(VECTOR_DIMENSIONS_TARGET, trainingMatrix.rows - 1, trainingMatrix.columns);
if (vectorDimensions < 16) throw new Error(`Insufficient rank for LSA: ${vectorDimensions}`);
console.log(`Compiling SVD: precisionCards=${trainingMatrix.rows}, sparseRecallCards=${sparseRecallCards.length}, features=${trainingMatrix.columns}, k=${vectorDimensions}`);
const svd = new SingularValueDecomposition(trainingMatrix, { autoTranspose: true });
const rawProjection = svd.rightSingularVectors.subMatrix(0, featureVocabulary.length - 1, 0, vectorDimensions - 1).to2DArray();

// Canonicalize SVD sign indeterminacy: the largest absolute loading in each component is always positive.
for (let component = 0; component < vectorDimensions; component += 1) {
  let pivot = 0;
  for (let row = 1; row < rawProjection.length; row += 1) {
    if (Math.abs(rawProjection[row][component]) > Math.abs(rawProjection[pivot][component])) pivot = row;
  }
  if (rawProjection[pivot][component] < 0) {
    for (let row = 0; row < rawProjection.length; row += 1) rawProjection[row][component] *= -1;
  }
}

function projectSparseVector(vector) {
  const projected = Array(vectorDimensions).fill(0);
  for (let feature = 0; feature < vector.length; feature += 1) {
    const value = vector[feature];
    if (value === 0) continue;
    const row = rawProjection[feature];
    for (let component = 0; component < vectorDimensions; component += 1) projected[component] += value * row[component];
  }
  const norm = Math.sqrt(projected.reduce((sum, value) => sum + value * value, 0));
  return norm > 0 ? projected.map((value) => value / norm) : projected;
}

function unitFeatures(item) {
  const lexical = featuresForText(item.text, item.kind === "terminology" || item.kind === "positive_clues" || item.kind === "negative_clues");
  return [...lexical, ...item.typedTags.map((tag) => `t:${tag}`)];
}

const unitFeatureLists = units.map(unitFeatures);
const documentVectors = unitFeatureLists.map((features, unitIndex) =>
  precisionCardIds.has(units[unitIndex].parentCardId)
    ? projectSparseVector(denseTfidf(features))
    : Array(vectorDimensions).fill(0));
const documentLengths = units.map((item) => Math.max(1, words(item.text).length + item.typedTags.length));
const averageDocumentLength = documentLengths.reduce((sum, value) => sum + value, 0) / documentLengths.length;
const postings = {};
for (let unitIndex = 0; unitIndex < units.length; unitIndex += 1) {
  const counts = countTerms(unitFeatureLists[unitIndex]);
  for (const [feature, count] of counts) {
    (postings[feature] ??= []).push([unitIndex, count]);
  }
}
const round = (value) => {
  if (!Number.isFinite(value)) throw new Error(`Non-finite compiled value: ${value}`);
  const rounded = Number(value.toFixed(8));
  return Object.is(rounded, -0) ? 0 : rounded;
};

const corpusSha256 = crypto.createHash("sha256")
  .update(Buffer.concat([...sourceBuffers, Buffer.from(canonicalJson(sourceManifest))]))
  .digest("hex");

const compiled = {
  manifest: {
    schemaVersion: "lightbi.micro-brain.index.v1",
    corpusId: sourceManifest.corpusId,
    corpusVersion: sourceManifest.version,
    corpusSha256,
    compilerVersion: COMPILER_VERSION,
    tokenizerVersion: TOKENIZER_VERSION,
    indexVersion: INDEX_VERSION,
    vectorMethod: "tfidf_lsa_svd",
    vectorDimensions,
    rrfK0: RRF_K0,
    bm25K1: BM25_K1,
    bm25B: BM25_B,
    maxFeatures: MAX_FEATURES,
    cardCount: cards.length,
    unitCount: units.length,
    featureCount: featureVocabulary.length,
    precisionCardCount: precisionCards.length,
    sparseRecallCardCount: sparseRecallCards.length,
  },
  cards: cards.map((card) => ({
    id: card.id,
    labels: card.labels,
    canonicalSignal: card.canonicalSignal ?? null,
    semanticFamily: card.semanticFamily,
    relatedDomains: card.relatedDomains,
    analysisClass: card.analysisClass,
    definition: card.definition,
    negativeClues: card.negativeClues,
    relations: card.relations,
    requiredEvidence: card.requiredEvidence,
    blockers: card.blockers,
    formula: card.formula ?? null,
  })),
  units,
  featureVocabulary,
  idf: idf.map(round),
  bm25: {
    documentLengths,
    averageDocumentLength: round(averageDocumentLength),
    postings,
  },
  lsa: {
    projection: rawProjection.map((row) => row.map(round)),
    documentVectors: documentVectors.map((row) => row.map(round)),
  },
};
const logicalIndexSha256 = crypto.createHash("sha256").update(canonicalJson(compiled)).digest("hex");
compiled.manifest.logicalIndexSha256 = logicalIndexSha256;

fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
const outputJson = `${JSON.stringify(compiled)}\n`;
fs.writeFileSync(OUTPUT_PATH, outputJson);
const byteSha256 = crypto.createHash("sha256").update(outputJson).digest("hex");
fs.writeFileSync(`${OUTPUT_PATH}.sha256`, `${byteSha256}  ${path.basename(OUTPUT_PATH)}\n`);

console.log(JSON.stringify({
  output: path.relative(ROOT, OUTPUT_PATH),
  bytes: Buffer.byteLength(outputJson),
  byteSha256,
  logicalIndexSha256,
  corpusSha256,
  cards: cards.length,
  units: units.length,
  features: featureVocabulary.length,
  vectorDimensions,
}, null, 2));