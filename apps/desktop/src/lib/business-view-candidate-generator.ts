import type { BusinessSignalRegistry } from './business-signal-detector';
import type { PerspectiveCandidate } from './perspective-candidate-generator';
import { getDomainCatalog } from './domain-knowledge-catalog';
import type { DomainId } from './domain-knowledge-catalog';

export type BusinessViewCandidateStatus = 'candidate' | 'rejected';

export type BusinessViewCandidateEvidence = {
  signalId: string;
  canonicalSignal: string;
  label: string;
  confidenceScore: number;
  role: 'required' | 'optional';
  message: string;
};

export type BusinessViewCandidate = {
  id: string;
  definitionId: string;
  label: string;
  perspectiveId: string;
  description: string;
  confidenceScore: number;
  status: BusinessViewCandidateStatus;
  matchedRequiredSignals: string[];
  missingRequiredSignals: string[];
  matchedOptionalSignals: string[];
  evidence: BusinessViewCandidateEvidence[];
  intentIds: string[];
  examples: string[];
};

export interface GenerateBusinessViewCandidatesInput {
  perspectives: PerspectiveCandidate[];
  signalRegistry: BusinessSignalRegistry;
  catalogs?: any; // For test injection if needed, though getDomainCatalog is preferred
}

export function generateBusinessViewCandidates(
  input: GenerateBusinessViewCandidatesInput
): BusinessViewCandidate[] {
  const { perspectives, signalRegistry } = input;
  const candidates: BusinessViewCandidate[] = [];

  for (const perspective of perspectives) {
    const catalog = getDomainCatalog(perspective.id as DomainId);
    if (!catalog) continue;

    for (const view of catalog.businessViews) {
      const evidence: BusinessViewCandidateEvidence[] = [];
      const matchedRequiredSignals: string[] = [];
      const missingRequiredSignals: string[] = [];
      const matchedOptionalSignals: string[] = [];
      let sumConfidence = 0;

      for (const signalId of view.requiredSignals) {
        if (signalRegistry.hasSignal(signalId)) {
          const signal = signalRegistry.getSignal(signalId)!;
          matchedRequiredSignals.push(signalId);
          evidence.push({
            signalId,
            canonicalSignal: signal.canonicalId,
            label: signal.label,
            confidenceScore: signal.confidenceScore,
            role: 'required',
            message: `Found required signal: ${signal.label}`
          });
          sumConfidence += signal.confidenceScore;
        } else {
          missingRequiredSignals.push(signalId);
        }
      }

      if (matchedRequiredSignals.length < view.minimumRequiredMatches) {
        continue;
      }

      for (const signalId of view.optionalSignals) {
        if (signalRegistry.hasSignal(signalId)) {
          const signal = signalRegistry.getSignal(signalId)!;
          matchedOptionalSignals.push(signalId);
          evidence.push({
            signalId,
            canonicalSignal: signal.canonicalId,
            label: signal.label,
            confidenceScore: signal.confidenceScore,
            role: 'optional',
            message: `Found optional enriching signal: ${signal.label}`
          });
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

      let score = Math.round((requiredMatchRatio * 60) + (optionalMatchRatio * 20) + (averageSignalConfidence * 0.20));
      if (score > 100) score = 100;
      if (score < 0) score = 0;

      candidates.push({
        id: view.id,
        definitionId: view.id,
        label: view.label,
        perspectiveId: catalog.id,
        description: view.description,
        confidenceScore: score,
        status: 'candidate',
        matchedRequiredSignals,
        missingRequiredSignals,
        matchedOptionalSignals,
        evidence,
        intentIds: catalog.intentFamilies.map(i => i.id),
        examples: catalog.intentFamilies.flatMap(i => i.questionTemplates)
      });
    }
  }

  return candidates.sort((a, b) => b.confidenceScore - a.confidenceScore);
}
