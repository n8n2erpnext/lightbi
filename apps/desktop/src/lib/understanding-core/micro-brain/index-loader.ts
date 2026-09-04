import {
  MICRO_BRAIN_INDEX_SCHEMA_VERSION,
  type CompiledMicroBrainIndexV1,
} from "./contracts";

export type MicroBrainIndexValidationV1 = {
  valid: boolean;
  errors: string[];
};

export function validateCompiledMicroBrainIndex(index: CompiledMicroBrainIndexV1): MicroBrainIndexValidationV1 {
  const errors: string[] = [];
  if (index.manifest.schemaVersion !== MICRO_BRAIN_INDEX_SCHEMA_VERSION) errors.push("index_schema_version");
  if (index.manifest.cardCount !== index.cards.length) errors.push("card_count_mismatch");
  if (index.manifest.unitCount !== index.units.length) errors.push("unit_count_mismatch");
  if (index.manifest.featureCount !== index.featureVocabulary.length) errors.push("feature_count_mismatch");
  if (index.idf.length !== index.featureVocabulary.length) errors.push("idf_feature_mismatch");
  if (index.lsa.projection.length !== index.featureVocabulary.length) errors.push("projection_feature_mismatch");
  if (index.lsa.documentVectors.length !== index.units.length) errors.push("document_vector_unit_mismatch");
  if (index.bm25.documentLengths.length !== index.units.length) errors.push("bm25_length_unit_mismatch");
  if (index.manifest.vectorDimensions <= 0) errors.push("vector_dimensions_invalid");
  for (const row of index.lsa.projection) {
    if (row.length !== index.manifest.vectorDimensions) {
      errors.push("projection_dimension_mismatch");
      break;
    }
  }
  for (const row of index.lsa.documentVectors) {
    if (row.length !== index.manifest.vectorDimensions) {
      errors.push("document_vector_dimension_mismatch");
      break;
    }
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)].sort() };
}