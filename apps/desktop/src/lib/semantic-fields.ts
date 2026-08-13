import type { FieldSemanticType, SemanticTag } from './semantic-tag-registry';
import { SEMANTIC_TAG_REGISTRY } from './semantic-tag-registry';
import type { ColumnProfile } from './column-profiler';

export interface SemanticField {
  name: string;
  semanticType: FieldSemanticType;
  semanticTag: SemanticTag;
  confidence: number;
  topValues?: string[]; // Injected from profile
}

export type SemanticMapping = SemanticField[];

/**
 * Maps physical column names to their semantic representation, enhanced by data profiling.
 */
export function mapSemanticFields(profiles: ColumnProfile[]): SemanticMapping {
  if (!profiles || profiles.length === 0) return [];

  return profiles.map(profile => {
    const lowerCol = profile.name.toLowerCase().trim();
    
    let bestTag: SemanticTag = "unknown";
    let bestType: FieldSemanticType = "unknown";
    let maxConfidence = 0;

    for (const [tag, config] of Object.entries(SEMANTIC_TAG_REGISTRY)) {
      for (const alias of config.aliases) {
        // Exact match gets highest confidence
        if (lowerCol === alias) {
          if (1.0 > maxConfidence) {
            maxConfidence = 1.0;
            bestTag = tag as SemanticTag;
            bestType = config.defaultType;
          }
        } 
        // Partial word match gets high confidence
        else if (new RegExp(`\\b${alias}\\b`, 'i').test(lowerCol)) {
          if (0.8 > maxConfidence) {
            maxConfidence = 0.8;
            bestTag = tag as SemanticTag;
            bestType = config.defaultType;
          }
        }
        // Substring match gets lower confidence
        else if (lowerCol.includes(alias)) {
          if (0.6 > maxConfidence) {
            maxConfidence = 0.6;
            bestTag = tag as SemanticTag;
            bestType = config.defaultType;
          }
        }
      }
    }

    // Profiling Overrides
    
    // 1. If it's identified as an exact Identifier by the profiler
    if (profile.isIdentifier) {
      const wasDimension = (bestType === "dimension");
      // It's definitely an identifier, override the type
      bestType = "identifier";
      // If we thought it was a dimension, fix the tag or leave it as generic
      if (bestTag === "unknown" || wasDimension) {
        bestTag = "generic_id";
      }
    }

    // 2. If it is highly categorical but we didn't tag it
    if (profile.isCategorical && bestTag === "unknown") {
      bestTag = "generic_name";
      bestType = "dimension";
      maxConfidence = 0.5; // Moderate confidence based on data shape alone
    }

    // 3. Drop confidence if we thought it was a metric but it's string-heavy
    if (bestType === "metric" && profile.dataType === "string") {
      maxConfidence *= 0.5; // Penalize
    }

    return {
      name: profile.name,
      semanticType: bestType,
      semanticTag: bestTag,
      confidence: maxConfidence,
      topValues: profile.topValues
    };
  });
}
