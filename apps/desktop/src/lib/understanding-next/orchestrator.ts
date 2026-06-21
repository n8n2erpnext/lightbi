import type { DatasetUnderstandingResult, UnderstandingInput } from "./contracts";
import { buildDatasetProfile } from "./dataset-profiler";
import { detectBusinessSignals } from "./signal-detector";
import { generateQuestionFit } from "./question-fit-engine";
import { createGuardedActions } from "./runtime-action-guard";

export function createDatasetUnderstandingResult(input: UnderstandingInput): DatasetUnderstandingResult {
  const datasetProfile = buildDatasetProfile(input);
  const signals = detectBusinessSignals(datasetProfile);
  const { lenses, perspectives, questions } = generateQuestionFit(datasetProfile, signals);
  const { availableActions, unavailableActions } = createGuardedActions(questions);

  return {
    source: datasetProfile.source,
    quality: datasetProfile.quality,
    profile: datasetProfile.profile,
    signals,
    lenses,
    perspectives,
    recommendedQuestions: questions,
    availableActions,
    unavailableActions
  };
}
