import type { DatasetUnderstanding, DatasetGrain } from './dataset-understanding-contract';
import type { DecisionReadinessTier } from './decision-readiness-engine';
import { getSignalType } from './business-signal-detector';

export type FieldRole = "dimension" | "measure" | "time" | "identifier" | "unknown";
export type AITrustLevel = "high" | "moderate" | "low";

export interface SemanticKeyEntry {
  canonicalId: string;
  role: FieldRole;
  safeForFilter: boolean;
  safeForGroup: boolean;
  safeForAggregate: boolean;
  note: string;
}

export interface AISemanticBriefing {
  briefingVersion: "1.0";
  generatedAt: string;
  datasetLabel: string;
  semanticKeys: SemanticKeyEntry[];
  grain: DatasetGrain;
  grainNote: string;
  trustLevel: AITrustLevel;
  trustRationale: string;
  safeActions: string[];
  caveats: string[];
}

export function generateAIBriefing(understanding: DatasetUnderstanding): AISemanticBriefing {
  const semanticKeys: SemanticKeyEntry[] = [];
  let hasDimension = false;
  let hasMeasure = false;
  let hasTime = false;
  let dimensionIds: string[] = [];
  let measureIds: string[] = [];

  for (const concept of understanding.detectedConcepts || []) {
    let role: FieldRole = "unknown";
    const baseType = getSignalType(concept.canonicalConcept);
    
    if (concept.canonicalConcept === "unrecognized" || concept.canonicalConcept === "unknown") {
      role = "unknown";
    } else if (concept.canonicalConcept.endsWith("_id")) {
      role = "identifier";
    } else if (baseType === "dimension") {
      role = "dimension";
    } else if (baseType === "measure") {
      role = "measure";
    } else if (baseType === "time") {
      role = "time";
    }

    const isDimensionOrId = role === "dimension" || role === "identifier";
    const isMeasure = role === "measure";
    const isTime = role === "time";
    const isUnknown = role === "unknown";

    if (isDimensionOrId) { hasDimension = true; dimensionIds.push(concept.canonicalConcept); }
    if (isMeasure) { hasMeasure = true; measureIds.push(concept.canonicalConcept); }
    if (isTime) hasTime = true;

    semanticKeys.push({
      canonicalId: concept.canonicalConcept,
      role,
      safeForFilter: !isUnknown,
      safeForGroup: isDimensionOrId,
      safeForAggregate: isMeasure,
      note: `Detected as ${role}`
    });
  }

  const safeActions: string[] = ["preview sample rows"];
  
  if (hasDimension && hasMeasure) {
    safeActions.push(`group by ${dimensionIds[0]} and sum ${measureIds[0]}`);
  }
  if (hasTime && hasMeasure) {
    safeActions.push(`trend ${measureIds[0]} over time`);
  }
  if (!hasMeasure && hasDimension) {
    safeActions.push(`count rows by ${dimensionIds[0]}`);
  }

  const caveatSet = new Set<string>();
  if (understanding.caveats) {
    for (const c of understanding.caveats) caveatSet.add(c);
  }
  if (understanding.readiness?.caveats) {
    for (const c of understanding.readiness.caveats) caveatSet.add(c);
  }

  const unknownCount = semanticKeys.filter(k => k.role === "unknown").length;
  if (unknownCount > 0) {
    const pct = Math.round((unknownCount / Math.max(semanticKeys.length, 1)) * 100);
    caveatSet.add(`${pct}% of recognized concepts have unknown roles`);
  }

  const tier = understanding.readiness?.tier || "exploratory_only";
  let trustLevel: AITrustLevel = "low";
  if (tier === "decision_support") trustLevel = "high";
  else if (tier === "caution") trustLevel = "moderate";

  const grain = understanding.grain || "unknown";
  let grainNote = "Row granularity could not be determined — verify before aggregation";
  const entityStr = understanding.inferredEntities?.length ? understanding.inferredEntities.join('/') : "record";

  if (grain === "event") grainNote = `Each row appears to be a ${entityStr} event`;
  else if (grain === "snapshot") grainNote = `Each row appears to be a point-in-time snapshot of ${entityStr}`;
  else if (grain === "entity") grainNote = `Each row appears to represent a single ${entityStr} record`;
  else if (grain === "summary") grainNote = "Each row appears to be a aggregated summary over a time period";

  return {
    briefingVersion: "1.0",
    generatedAt: new Date().toISOString(),
    datasetLabel: understanding.datasetName || "Unnamed Dataset",
    semanticKeys,
    grain,
    grainNote,
    trustLevel,
    trustRationale: understanding.readiness?.reasonSummary || "Unknown",
    safeActions,
    caveats: Array.from(caveatSet)
  };
}
