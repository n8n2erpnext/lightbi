import { detectBusinessSignals, type DetectorInput, type BusinessSignalRegistry } from './business-signal-detector';
import { generatePerspectiveCandidates, type PerspectiveCandidate } from './perspective-candidate-generator';
import { generateBusinessViewCandidates, type BusinessViewCandidate } from './business-view-candidate-generator';
import { generateQuestionPlans, type QuestionPlan } from './question-plan-generator';
import { renderQuestionSuggestions, type QuestionSuggestion } from './question-suggestion-renderer';

export type GuidedInvestigationResult = {
  signals: BusinessSignalRegistry;
  perspectives: PerspectiveCandidate[];
  businessViews: BusinessViewCandidate[];
  questionPlans: QuestionPlan[];
  questionSuggestions: QuestionSuggestion[];
};

export function runGuidedInvestigationPipeline(input: DetectorInput): GuidedInvestigationResult {
  // 1. Detect Semantic Business Signals from raw columns
  const signals = detectBusinessSignals(input);

  // 2. Generate generic Perspectives (e.g. "Revenue", "Operations")
  const perspectives = generatePerspectiveCandidates(signals);

  // 3. Generate specific Business Views based on Domain Knowledge Catalog
  const businessViews = generateBusinessViewCandidates({ 
    perspectives, 
    signalRegistry: signals 
  });

  // 4. Generate abstract analytical Question Plans 
  const questionPlans = generateQuestionPlans(businessViews, signals);

  // 5. Render final human-readable NLP suggestions
  const questionSuggestions = renderQuestionSuggestions({ plans: questionPlans });

  return {
    signals,
    perspectives,
    businessViews,
    questionPlans,
    questionSuggestions
  };
}
