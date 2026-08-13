import type { DatasetUnderstandingResult, UnderstandingInput } from "./contracts";
import { buildDatasetProfile } from "./dataset-profiler";
import { detectBusinessSignals } from "./signal-detector";
import { generateQuestionFit } from "./question-fit-engine";
import { createGuardedActions } from "./runtime-action-guard";
import { generateStakeholderFits } from "./stakeholder-fit-engine";
import { inferSemanticDomainAffinities } from "./semantic-domain-affinity";

export function createDatasetUnderstandingResult(input: UnderstandingInput): DatasetUnderstandingResult {
  const datasetProfile = buildDatasetProfile(input);
  const signals = detectBusinessSignals(datasetProfile);
  const domainAffinities = inferSemanticDomainAffinities(signals);
  const detectedDomains = [
    ...new Set([
      ...domainAffinities.map(affinity => affinity.domain),
      ...datasetProfile.profile.detectedDomains,
      ...signals
        .filter(signal => signal.role !== "technical" && signal.confidence >= 45)
        .map(signal => signal.domain)
    ])
  ];
  const enrichedProfile = {
    ...datasetProfile,
    profile: {
      ...datasetProfile.profile,
      detectedDomains
    }
  };
  const stakeholderFits = generateStakeholderFits(enrichedProfile, signals);
  const { lenses, perspectives, questions } = generateQuestionFit(enrichedProfile, signals);
  const { availableActions, unavailableActions } = createGuardedActions(questions);

  return {
    source: enrichedProfile.source,
    quality: enrichedProfile.quality,
    profile: enrichedProfile.profile,
    columns: enrichedProfile.columns,
    signals,
    domainAffinities,
    stakeholderFits,
    lenses,
    perspectives,
    recommendedQuestions: questions,
    availableActions,
    unavailableActions
  };
}
