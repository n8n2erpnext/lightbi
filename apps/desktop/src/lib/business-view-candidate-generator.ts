import type { BusinessSignalRegistry } from './business-signal-detector';
import type { PerspectiveCandidate } from './perspective-candidate-generator';
import { getDomainCatalog } from './domain-knowledge-catalog';
import type { DomainId } from './domain-knowledge-catalog';

export interface BusinessViewEvidence {
  signalId: string;
  confidenceContribution: number;
}

export interface BusinessViewConfidence {
  score: number;
  requiredMatchRatio: number;
  optionalMatchRatio: number;
  averageSignalConfidence: number;
}

export interface BusinessViewCandidate {
  id: string;
  perspectiveId: DomainId;
  label: string;
  description: string;
  confidence: BusinessViewConfidence;
  evidence: BusinessViewEvidence[];
  matchedRequiredSignals: string[];
  missingRequiredSignals: string[];
  matchedOptionalSignals: string[];
}

export function generateBusinessViewCandidates(
  perspective: PerspectiveCandidate,
  registry: BusinessSignalRegistry
): BusinessViewCandidate[] {
  const candidates: BusinessViewCandidate[] = [];
  
  const catalog = getDomainCatalog(perspective.id as DomainId);
  if (!catalog) return [];

  for (const view of catalog.businessViews) {
    const evidence: BusinessViewEvidence[] = [];
    const matchedRequiredSignals: string[] = [];
    const missingRequiredSignals: string[] = [];
    const matchedOptionalSignals: string[] = [];
    let sumConfidence = 0;

    for (const signalId of view.requiredSignals) {
      if (registry.hasSignal(signalId)) {
        const signal = registry.getSignal(signalId)!;
        matchedRequiredSignals.push(signalId);
        evidence.push({ signalId, confidenceContribution: signal.confidenceScore });
        sumConfidence += signal.confidenceScore;
      } else {
        missingRequiredSignals.push(signalId);
      }
    }

    if (matchedRequiredSignals.length < view.minimumRequiredMatches) {
      continue;
    }

    for (const signalId of view.optionalSignals) {
      if (registry.hasSignal(signalId)) {
        const signal = registry.getSignal(signalId)!;
        matchedOptionalSignals.push(signalId);
        evidence.push({ signalId, confidenceContribution: signal.confidenceScore });
        sumConfidence += signal.confidenceScore;
      }
    }

    const requiredMatchRatio = view.requiredSignals.length > 0 
      ? matchedRequiredSignals.length / view.requiredSignals.length 
      : 1;

    const optionalMatchRatio = view.optionalSignals.length > 0
      ? matchedOptionalSignals.length / view.optionalSignals.length
      : 1;

    const averageSignalConfidence = evidence.length > 0 ? sumConfidence / evidence.length : 0;

    // confidence = (requiredMatchRatio * 60) + (optionalMatchRatio * 20) + (averageSignalConfidence * 0.20)
    let score = Math.round((requiredMatchRatio * 60) + (optionalMatchRatio * 20) + (averageSignalConfidence * 0.20));
    if (score > 100) score = 100;
    if (score < 0) score = 0;

    candidates.push({
      id: view.id,
      perspectiveId: catalog.id,
      label: view.label,
      description: view.description,
      confidence: {
        score,
        requiredMatchRatio,
        optionalMatchRatio,
        averageSignalConfidence
      },
      evidence,
      matchedRequiredSignals,
      missingRequiredSignals,
      matchedOptionalSignals
    });
  }

  return candidates.sort((a, b) => b.confidence.score - a.confidence.score);
}
