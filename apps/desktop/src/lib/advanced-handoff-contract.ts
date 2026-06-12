import type { DatasetUnderstanding, DatasetGrain } from './dataset-understanding-contract';
import type { DecisionReadinessTier } from './decision-readiness-engine';
import { getSignalType } from './business-signal-detector';

export type FieldRole = "dimension" | "measure" | "time" | "identifier" | "unknown";

export interface FieldRoleEntry {
  rawHeader: string;
  canonicalId: string;
  role: FieldRole;
  confidence: number;
  note: string;
}

export interface CanonicalMappingEntry {
  rawHeader: string;
  canonicalId: string;
  mappingSource: "alias" | "overlay" | "inferred";
}

export interface AdvancedHandoffArtifact {
  generatedAt: string;
  datasetLabel: string;
  fieldRoles: FieldRoleEntry[];
  grain: DatasetGrain;
  grainEvidence: string;
  canonicalMapping: CanonicalMappingEntry[];
  caveats: string[];
  readinessSummary: {
    score: number;
    tier: DecisionReadinessTier;
    recommendation: string;
  };
}

export function generateAdvancedHandoff(understanding: DatasetUnderstanding): AdvancedHandoffArtifact {
  const fieldRoles: FieldRoleEntry[] = [];
  const canonicalMapping: CanonicalMappingEntry[] = [];

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

    for (const rawHeader of concept.evidence || []) {
      fieldRoles.push({
        rawHeader,
        canonicalId: concept.canonicalConcept,
        role,
        confidence: concept.confidenceScore / 100, // 0.0 - 1.0
        note: `Inferred from semantic engine`
      });

      canonicalMapping.push({
        rawHeader,
        canonicalId: concept.canonicalConcept,
        mappingSource: "inferred"
      });
    }
  }

  const caveatSet = new Set<string>();
  if (understanding.caveats) {
    for (const c of understanding.caveats) caveatSet.add(c);
  }
  if (understanding.readiness?.caveats) {
    for (const c of understanding.readiness.caveats) caveatSet.add(c);
  }

  const unknownRoles = fieldRoles.filter(f => f.role === 'unknown');
  if (unknownRoles.length > 0) {
    const rawHeaders = unknownRoles.map(f => f.rawHeader).join(', ');
    caveatSet.add(`${unknownRoles.length} columns could not be classified: [${rawHeaders}]`);
  }

  if (understanding.grain === 'unknown') {
    caveatSet.add("Dataset grain is undetermined — verify row granularity before aggregation");
  }

  const tier = understanding.readiness?.tier || "exploratory_only";
  const score = understanding.readiness?.score || 0;
  
  let recommendation = "Use for exploration only. Do not use as basis for automated decisions.";
  if (tier === "decision_support") {
    recommendation = "Suitable for automated reporting and decision dashboards.";
  } else if (tier === "caution") {
    recommendation = "Suitable for manual analysis. Verify findings before acting on them.";
  }

  return {
    generatedAt: new Date().toISOString(),
    datasetLabel: understanding.datasetName || "Unnamed Dataset",
    fieldRoles,
    grain: understanding.grain || "unknown",
    grainEvidence: understanding.grainEvidence || "No structural patterns recognized.",
    canonicalMapping,
    caveats: Array.from(caveatSet),
    readinessSummary: {
      score,
      tier,
      recommendation
    }
  };
}
