import type { DatasetFamily } from './batch-inspection';
import type { KeyCandidate } from './business-key-detector';
import type { ColumnProfile } from './column-profiler';
import type { 
  RelationshipEdge, 
  EvidenceItem, 
  RelationshipConfidence, 
  RelationshipRisk, 
  RelationshipCardinality,
  DatasetCollectionCandidate,
  RelationshipGraph
} from './relationship-graph';
import {
  buildRelationshipGraph,
  findConnectedComponents
} from './relationship-graph';

function levenshtein(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[j][0] = j;
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator,
      );
    }
  }
  return matrix[b.length][a.length];
}

function calculateNameSimilarity(a: string, b: string): number {
  if (a.toLowerCase() === b.toLowerCase()) return 20;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  const sim = 1 - dist / maxLen;
  return Math.round(sim * 20);
}

function calculateOverlapScore(leftProfile: ColumnProfile, rightProfile: ColumnProfile): number {
  if (!leftProfile.topValues.length || !rightProfile.topValues.length) return 0;
  
  const leftSet = new Set(leftProfile.topValues);
  let overlapCount = 0;
  for (const val of rightProfile.topValues) {
    if (leftSet.has(val)) overlapCount++;
  }
  
  const maxPossible = Math.min(leftProfile.topValues.length, rightProfile.topValues.length);
  const overlapRatio = overlapCount / maxPossible;
  
  return Math.round(overlapRatio * 25);
}

function calculatePatternScore(leftProfile: ColumnProfile, rightProfile: ColumnProfile): number {
  if (!leftProfile.topValues.length || !rightProfile.topValues.length) return 0;
  const leftAvgLen = leftProfile.topValues.reduce((s, v) => s + String(v).length, 0) / leftProfile.topValues.length;
  const rightAvgLen = rightProfile.topValues.reduce((s, v) => s + String(v).length, 0) / rightProfile.topValues.length;
  
  const diff = Math.abs(leftAvgLen - rightAvgLen);
  if (diff <= 1) return 15;
  if (diff <= 3) return 10;
  if (diff <= 5) return 5;
  return 0;
}

export function scoreRelationship(
  leftKey: KeyCandidate,
  leftProfile: ColumnProfile,
  rightKey: KeyCandidate,
  rightProfile: ColumnProfile
): RelationshipEdge {
  const evidence: EvidenceItem[] = [];
  
  let semanticMatchScore = 0;
  if (leftKey.semanticTag !== 'unknown' && leftKey.semanticTag === rightKey.semanticTag) {
    semanticMatchScore = 30;
    evidence.push({ type: "semantic", score: 30, message: `Matched semantic tag: ${leftKey.semanticTag}` });
  } else {
    evidence.push({ type: "semantic", score: 0, message: "No semantic tag match." });
  }
  
  let baseNameSim = calculateNameSimilarity(leftKey.columnName, rightKey.columnName);
  
  let dataTypeScore = 0;
  if (leftProfile.dataType === rightProfile.dataType) {
    dataTypeScore = 10;
    evidence.push({ type: "datatype", score: 10, message: `Matched data type: ${leftProfile.dataType}` });
  } else {
    evidence.push({ type: "datatype", score: 0, message: "Mismatched data types." });
  }
  
  let profileScore = 0;
  if (leftKey.nullRatio < 0.1 && rightKey.nullRatio < 0.1) {
    profileScore += 7;
  }
  if (leftKey.distinctRatio > 0.8 && rightKey.distinctRatio > 0.8) {
    profileScore += 8; // 1:1
  } else if ((leftKey.distinctRatio > 0.8 && rightKey.distinctRatio < 0.5) || (leftKey.distinctRatio < 0.5 && rightKey.distinctRatio > 0.8)) {
    profileScore += 8; // 1:N
  }
  evidence.push({ type: "profile", score: profileScore, message: `Profile compatibility score: ${profileScore}` });
  
  let overlapScore = calculateOverlapScore(leftProfile, rightProfile);
  evidence.push({ type: "overlap", score: overlapScore, message: `Sample values overlap score: ${overlapScore}` });
  
  let patternScore = calculatePatternScore(leftProfile, rightProfile);
  evidence.push({ type: "pattern", score: patternScore, message: `Value pattern similarity score: ${patternScore}` });
  
  // Generic Penalty Logic
  let nameSimilarityPenalty = 0;
  if (leftKey.isGeneric || rightKey.isGeneric) {
    nameSimilarityPenalty = -15;
    if (overlapScore >= 17) {
      nameSimilarityPenalty = -5;
    }
  }
  
  let finalNameSim = baseNameSim + nameSimilarityPenalty;
  if (finalNameSim < 0) finalNameSim = 0; // Cap at 0
  
  evidence.push({ 
    type: "name", 
    score: finalNameSim, 
    message: `Base similarity: ${baseNameSim}, Generic Penalty: ${nameSimilarityPenalty}` 
  });

  let totalScore = semanticMatchScore + finalNameSim + dataTypeScore + profileScore + patternScore + overlapScore;
  
  let cardinality: RelationshipCardinality = "unknown";
  if (leftKey.distinctRatio > 0.9 && rightKey.distinctRatio > 0.9) {
    cardinality = "one_to_one";
  } else if (leftKey.distinctRatio > 0.9 && rightKey.distinctRatio <= 0.9) {
    cardinality = "one_to_many";
  } else if (leftKey.distinctRatio <= 0.9 && rightKey.distinctRatio > 0.9) {
    cardinality = "many_to_one";
  } else if (leftKey.distinctRatio < 0.5 && rightKey.distinctRatio < 0.5) {
    cardinality = "many_to_many";
  }

  let confidence: RelationshipConfidence = "LOW";
  if (totalScore >= 85) confidence = "HIGH";
  else if (totalScore >= 70) confidence = "MEDIUM";

  let risk: RelationshipRisk = "MEDIUM";
  if (cardinality === "one_to_one" || cardinality === "many_to_one") risk = "LOW";
  else if (cardinality === "many_to_many") risk = "HIGH";
  else if (cardinality === "one_to_many") risk = "MEDIUM";
  else if (cardinality === "unknown") risk = "MEDIUM";

  return {
    relationshipId: `rel_${leftKey.datasetId}_${leftKey.columnName}_${rightKey.datasetId}_${rightKey.columnName}`,
    leftDatasetId: leftKey.datasetId,
    rightDatasetId: rightKey.datasetId,
    leftColumnId: leftKey.columnName,
    rightColumnId: rightKey.columnName,
    score: totalScore,
    confidence,
    cardinality,
    risk,
    status: "suggested",
    evidence
  };
}

export function discoverCollections(
  datasets: DatasetFamily[],
  keyCandidatesMap: Record<string, KeyCandidate[]>
): { collections: DatasetCollectionCandidate[], graph: RelationshipGraph } {
  const edges: RelationshipEdge[] = [];

  for (let i = 0; i < datasets.length; i++) {
    for (let j = i + 1; j < datasets.length; j++) {
      const d1 = datasets[i];
      const d2 = datasets[j];
      
      const c1 = keyCandidatesMap[d1.id] || [];
      const c2 = keyCandidatesMap[d2.id] || [];
            
      for (const k1 of c1) {
        for (const k2 of c2) {
          const rel = scoreRelationship(k1, d1.profiles[k1.columnName], k2, d2.profiles[k2.columnName]);
          if (rel.score >= 50) {
            edges.push(rel);
          }
        }
      }
    }
  }

  const graph = buildRelationshipGraph(edges);
  const components = findConnectedComponents(graph);
  
  const collections: DatasetCollectionCandidate[] = [];
  
  for (const comp of components) {
    const hasStrong = comp.edges.some(e => e.score >= 70);
    const hasMultipleWeak = comp.edges.length > 1;
    
    if (hasStrong || hasMultipleWeak) {
      collections.push({
        collectionId: `coll_${comp.componentId}`,
        datasetIds: comp.nodes.map(n => n.datasetId),
        relationships: comp.edges
      });
    }
  }

  return { collections, graph };
}
