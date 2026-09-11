import type { CanonicalAnalysisPresentationV1, CanonicalDatasetPresentationV1 } from './understanding-core/canonical-consumer-presentation-contract';
import { adviseMicroBrainPresentation, type MicroBrainPresentationAdviceV1, type MicroBrainPresentationQueryV1 } from './understanding-core/micro-brain/presentation-advisor';
import type { AnalysisAction, BusinessQuestion, DatasetUnderstandingResult } from './understanding-next/contracts';

export const QUESTION_PERSPECTIVE_INTELLIGENCE_VERSION = 'lightbi.question-perspective-intelligence.v1' as const;

export type QuestionCandidateBasisV1 = 'data_evidence' | 'domain_context' | 'data_plus_domain';
export type QuestionAnswerabilityV1 = 'executable_now' | 'descriptive_only' | 'needs_more_evidence' | 'unsupported';
export type QuestionIntelligenceSourceV1 = 'governed' | 'universal' | 'merged' | 'domain_context';
export type QuestionActionAuthorityV1 = 'governed' | 'descriptive_existing' | 'none';

export type QuestionMbAdviceV1 = {
  conceptIds: string[];
  perspectiveHints: string[];
  analyticalIntents: string[];
  priorities: string[];
  evidenceRequirements: string[];
  constraints: string[];
  abstainWhen: string[];
  prohibitions: string[];
  authorityNotes: string[];
};

export type QuestionPerspectiveCandidateV1 = {
  candidateId: string;
  title: string;
  description: string;
  perspectiveId: string | null;
  basis: QuestionCandidateBasisV1;
  answerability: QuestionAnswerabilityV1;
  source: QuestionIntelligenceSourceV1;
  governingAnalysisId: string | null;
  metricId: string | null;
  actionId: string | null;
  actionAuthority: QuestionActionAuthorityV1;
  actionKind: string | null;
  dimensions: string[];
  semanticSignals: string[];
  missingEvidence: string[];
  blockers: string[];
  limitations: string[];
  advisoryRankPrior: number;
  rankScore: number;
  rankReasons: string[];
  mbAdvice: QuestionMbAdviceV1;
};

export type QuestionPerspectiveIntelligenceV1 = {
  schemaVersion: typeof QUESTION_PERSPECTIVE_INTELLIGENCE_VERSION;
  domainContext: {
    primaryDomain: string | null;
    primaryDomainSource: string | null;
    analysisMode: string | null;
    officialSupportProductionActive: boolean;
  };
  selectedPerspectiveId: string | null;
  focusLabel: string | null;
  primary: QuestionPerspectiveCandidateV1 | null;
  candidates: QuestionPerspectiveCandidateV1[];
  abstentions: Array<{ candidateId: string; reasons: string[] }>;
  policy: {
    mbMayStrengthenAuthority: false;
    retrievalScoreIsConfidence: false;
    deterministicGateFinal: true;
  };
};

export type QuestionPerspectiveIntelligenceOptionsV1 = {
  presentation: CanonicalDatasetPresentationV1;
  understanding: DatasetUnderstandingResult;
  selectedPerspectiveId?: string | null;
  focusLabel?: string | null;
  advisor?: (query: MicroBrainPresentationQueryV1) => MicroBrainPresentationAdviceV1;
};

type WorkingCandidate = QuestionPerspectiveCandidateV1 & { semanticKey: string };

const EMPTY_MB_ADVICE: QuestionMbAdviceV1 = {
  conceptIds: [], perspectiveHints: [], analyticalIntents: [], priorities: [], evidenceRequirements: [], constraints: [], abstainWhen: [], prohibitions: [], authorityNotes: [],
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))].sort();
}

function normalizeToken(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function neutralQuestionWording(value: string): string {
  return value
    .replace(/\bbest\b/gi, 'highest observed')
    .replace(/\bworst\b/gi, 'lowest observed')
    .replace(/\bleaders?\b/gi, 'highest observed group')
    .replace(/\blaggards?\b/gi, 'lowest observed group')
    .replace(/\bneeds attention\b/gi, 'shows the largest observed exception');
}

function signalFor(value: string, understanding: DatasetUnderstandingResult): string {
  const normalized = normalizeToken(value);
  const physical = understanding.signals.find(signal => normalizeToken(signal.physicalColumn) === normalized);
  if (physical) return normalizeToken(physical.canonicalId);
  const canonical = understanding.signals.find(signal => normalizeToken(signal.canonicalId) === normalized);
  return normalizeToken(canonical?.canonicalId ?? value);
}

function semanticKey(
  measureIds: readonly string[],
  derivedMeasureIds: readonly string[],
  actionKind: string | null,
  dimensions: readonly string[],
  understanding: DatasetUnderstandingResult,
): string {
  const measures = unique(measureIds.map(value => signalFor(value, understanding))).join('+') || 'no_metric';
  const derived = unique(derivedMeasureIds.map(value => normalizeToken(value))).join('+') || 'no_derived';
  const dims = unique(dimensions.map(value => signalFor(value, understanding))).join('+') || 'no_dimension';
  return `${normalizeToken(actionKind ?? 'unknown')}|${measures}|${derived}|${dims}`;
}

function canonicalAnswerability(item: CanonicalAnalysisPresentationV1, action: AnalysisAction | undefined): QuestionAnswerabilityV1 {
  if (item.state === 'ready' && item.executionReadiness !== 'not_executable' && action) return 'executable_now';
  if (item.state === 'needs_user_evidence' || item.state === 'needs_mapping_review') return 'needs_more_evidence';
  return 'unsupported';
}

function canonicalCandidate(item: CanonicalAnalysisPresentationV1, understanding: DatasetUnderstandingResult, selectedPerspectiveId: string | null): WorkingCandidate {
  const action = item.actionCandidateId ? understanding.availableActions.find(candidate => candidate.id === item.actionCandidateId) : undefined;
  const answerability = canonicalAnswerability(item, action);
  const dimensions = action?.dimensions ?? [];
  const missingEvidence = unique([
    ...(item.primaryBlocker?.references ?? []),
    ...item.secondaryBlockers.flatMap(blocker => blocker.references),
    ...(item.state === 'needs_user_evidence' || item.state === 'needs_mapping_review' ? item.physicalColumns : []),
  ]);
  return {
    candidateId: `governed:${item.questionId}`,
    title: neutralQuestionWording(item.title),
    description: item.description,
    perspectiveId: selectedPerspectiveId && (item.businessPerspectiveIds ?? []).some(id => String(id) === selectedPerspectiveId)
      ? selectedPerspectiveId
      : item.businessPerspectiveIds?.[0] ?? null,
    basis: 'data_evidence',
    answerability,
    source: 'governed',
    governingAnalysisId: item.itemId,
    metricId: item.metricId,
    actionId: action?.id ?? null,
    actionAuthority: answerability === 'executable_now' ? 'governed' : 'none',
    actionKind: action?.actionKind ?? null,
    dimensions: [...dimensions],
    semanticSignals: unique([...item.canonicalSignals, ...dimensions.map(value => signalFor(value, understanding)), item.metricId]),
    missingEvidence,
    blockers: unique([item.primaryBlocker?.code ?? '', ...item.secondaryBlockers.map(blocker => blocker.code)]),
    limitations: unique(item.limitations),
    advisoryRankPrior: 0,
    rankScore: 0,
    rankReasons: [],
    mbAdvice: { ...EMPTY_MB_ADVICE },
    semanticKey: semanticKey(action?.measures ?? (item.metricId ? [item.metricId] : []), action?.derivedMeasures?.map(measure => measure.id) ?? [], action?.actionKind ?? null, dimensions, understanding),
  };
}

function universalCandidate(question: BusinessQuestion, action: AnalysisAction | undefined, understanding: DatasetUnderstandingResult): WorkingCandidate {
  const runnable = Boolean(action && action.executionScope !== 'not_supported');
  const metricId = action?.measures?.[0] ?? question.measures?.[0] ?? null;
  const dimensions = action?.dimensions ?? question.dimensions ?? [];
  return {
    candidateId: `universal:${question.id.replace(/^universal:/, '')}`,
    title: neutralQuestionWording(question.label),
    description: question.userPrompt,
    perspectiveId: question.domain ?? null,
    basis: 'data_evidence',
    answerability: runnable ? 'descriptive_only' : 'needs_more_evidence',
    source: 'universal',
    governingAnalysisId: null,
    metricId,
    actionId: runnable ? action!.id : null,
    actionAuthority: runnable ? 'descriptive_existing' : 'none',
    actionKind: action?.actionKind ?? question.actionKind,
    dimensions: [...dimensions],
    semanticSignals: unique([...(question.requiredSignals ?? []), ...(question.optionalSignals ?? []), ...(question.measures ?? []), ...dimensions.map(value => signalFor(value, understanding))]),
    missingEvidence: unique(question.requiredSignals.filter(required => !understanding.signals.some(signal => normalizeToken(signal.canonicalId) === normalizeToken(required)))),
    blockers: runnable ? [] : ['descriptive_action_unavailable'],
    limitations: unique(question.caveats ?? []),
    advisoryRankPrior: 0,
    rankScore: 0,
    rankReasons: [],
    mbAdvice: { ...EMPTY_MB_ADVICE },
    semanticKey: semanticKey(action?.measures ?? question.measures ?? [], action?.derivedMeasures?.map(measure => measure.id) ?? [], action?.actionKind ?? question.actionKind, dimensions, understanding),
  };
}

function mergeCandidate(preferred: WorkingCandidate, sibling: WorkingCandidate): WorkingCandidate {
  const governed = preferred.source === 'governed' ? preferred : sibling.source === 'governed' ? sibling : preferred;
  const other = governed === preferred ? sibling : preferred;
  return {
    ...governed,
    candidateId: `merged:${governed.candidateId.replace(/^governed:/, '')}`,
    source: 'merged',
    semanticSignals: unique([...governed.semanticSignals, ...other.semanticSignals]),
    missingEvidence: unique([...governed.missingEvidence, ...other.missingEvidence]),
    blockers: unique([...governed.blockers, ...other.blockers]),
    limitations: unique([...governed.limitations, ...other.limitations]),
    // Governed executable authority wins only because it already existed upstream.
    // If governed is not executable, an existing descriptive universal action may remain usable,
    // but it is explicitly labeled descriptive rather than inheriting governed authority.
    actionId: governed.actionAuthority === 'governed' ? governed.actionId : other.actionId,
    actionAuthority: governed.actionAuthority === 'governed' ? 'governed' : other.actionAuthority,
    answerability: governed.actionAuthority === 'governed' ? 'executable_now' : other.answerability,
  };
}

function dedupeCandidates(candidates: WorkingCandidate[]): WorkingCandidate[] {
  const result = new Map<string, WorkingCandidate>();
  for (const candidate of candidates) {
    const existing = result.get(candidate.semanticKey);
    if (!existing) { result.set(candidate.semanticKey, candidate); continue; }
    result.set(candidate.semanticKey, mergeCandidate(existing, candidate));
  }
  return [...result.values()];
}

function extractMbAdvice(advice: MicroBrainPresentationAdviceV1): QuestionMbAdviceV1 {
  return {
    conceptIds: unique(advice.candidates.map(item => item.hit.conceptId)),
    perspectiveHints: unique(advice.candidates.flatMap(item => item.presentation.perspectives ?? [])),
    analyticalIntents: unique(advice.candidates.flatMap(item => item.presentation.analyticalIntents ?? [])),
    priorities: unique(advice.candidates.flatMap(item => item.presentation.priorities ?? [])),
    evidenceRequirements: unique(advice.candidates.flatMap(item => item.presentation.evidenceRequirements ?? [])),
    constraints: unique(advice.candidates.flatMap(item => item.presentation.constraints ?? [])),
    abstainWhen: unique(advice.candidates.flatMap(item => item.presentation.abstainWhen ?? [])),
    prohibitions: unique(advice.candidates.flatMap(item => item.presentation.mustNot ?? [])),
    authorityNotes: unique(advice.authorityNotes),
  };
}

function humanizeConcept(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function domainContextCandidates(
  advice: MicroBrainPresentationAdviceV1,
  existing: WorkingCandidate[],
  selectedPerspectiveId: string | null,
  primaryDomain: string | null,
): WorkingCandidate[] {
  const contextId = selectedPerspectiveId ?? primaryDomain;
  if (!contextId) return [];
  const mbAdvice = extractMbAdvice(advice);
  const contextCards = advice.candidates.filter(item => item.presentation.advisoryKind === 'domain_profile' || item.presentation.advisoryKind === 'perspective_profile');
  const covered = normalizeToken(existing.flatMap(candidate => [candidate.title, candidate.description, candidate.actionKind ?? '', ...candidate.semanticSignals]).join(' '));
  const topics = unique(contextCards.flatMap(item => [...(item.presentation.priorities ?? []), ...(item.presentation.analyticalIntents ?? [])]))
    .filter(topic => !['evidence', 'evidence_detail', 'overview'].includes(normalizeToken(topic)))
    .filter(topic => !covered.includes(normalizeToken(topic)))
    .slice(0, 3);
  return topics.map((topic, index) => {
    const topicId = normalizeToken(topic);
    const contextLabel = humanizeConcept(contextId);
    return {
      candidateId: `domain-context:${normalizeToken(contextId)}:${topicId}`,
      title: `What evidence is needed to evaluate ${humanizeConcept(topic)}?`,
      description: `${contextLabel} context makes this question relevant, but LightBI will not calculate it until governed evidence and action authority are available.`,
      perspectiveId: selectedPerspectiveId,
      basis: 'domain_context',
      answerability: 'needs_more_evidence',
      source: 'domain_context',
      governingAnalysisId: null,
      metricId: null,
      actionId: null,
      actionAuthority: 'none',
      actionKind: topicId,
      dimensions: [],
      semanticSignals: [],
      missingEvidence: mbAdvice.evidenceRequirements.length > 0 ? [...mbAdvice.evidenceRequirements] : [`governed_evidence_for:${topicId}`],
      blockers: ['domain_context_only_no_governed_action'],
      limitations: ['micro_brain_advisory_only', 'retrieval_relevance_not_semantic_confidence'],
      advisoryRankPrior: Math.max(1, 3 - index),
      rankScore: 0,
      rankReasons: ['domain_context_candidate'],
      mbAdvice,
      semanticKey: `domain_context|${normalizeToken(contextId)}|${topicId}`,
    };
  });
}

function advisoryPrior(advice: MicroBrainPresentationAdviceV1, selectedPerspectiveId: string | null, primaryDomain: string | null): number {
  let prior = 0;
  advice.candidates.slice(0, 6).forEach((candidate, index) => {
    const ordinal = Math.max(1, 6 - index);
    const hints = candidate.presentation.perspectives ?? [];
    if (selectedPerspectiveId && hints.some(value => normalizeToken(value) === normalizeToken(selectedPerspectiveId))) prior += Math.min(4, ordinal);
    if (primaryDomain && candidate.presentation.advisoryKind === 'domain_profile' && candidate.hit.conceptId.includes(normalizeToken(primaryDomain))) prior += Math.min(4, ordinal);
    if (candidate.presentation.advisoryKind === 'perspective_profile') prior += 1;
  });
  return Math.min(8, prior);
}

function rankCandidate(candidate: WorkingCandidate, selectedPerspectiveId: string | null, focusLabel: string | null): WorkingCandidate {
  let score = 0;
  const reasons: string[] = [];
  if (selectedPerspectiveId && candidate.perspectiveId === selectedPerspectiveId) { score += 100; reasons.push('selected_perspective_match'); }
  if (candidate.answerability === 'executable_now') { score += 60; reasons.push('governed_executable'); }
  else if (candidate.answerability === 'descriptive_only') { score += 40; reasons.push('safe_descriptive_existing'); }
  else if (candidate.answerability === 'needs_more_evidence') { score += 10; reasons.push('needs_evidence'); }
  if (candidate.actionAuthority === 'governed') { score += 20; reasons.push('governed_action_authority'); }
  const evidenceCompleteness = Math.max(0, 12 - Math.min(12, candidate.missingEvidence.length * 3 + candidate.blockers.length * 2));
  score += evidenceCompleteness;
  reasons.push(`evidence_completeness:${evidenceCompleteness}`);
  if (focusLabel) {
    const focusTokens = normalizeToken(focusLabel).split('_').filter(token => token.length > 2);
    const text = normalizeToken(`${candidate.title} ${candidate.description}`);
    if (focusTokens.some(token => text.includes(token))) { score += 8; reasons.push('focus_text_match'); }
  }
  if (/\bcontext\b/i.test(`${candidate.title} ${candidate.description}`)) { score -= 18; reasons.push('supporting_context_penalty'); }
  if (candidate.advisoryRankPrior > 0) { score += candidate.advisoryRankPrior; reasons.push(`mb_advisory_ordinal_prior:${candidate.advisoryRankPrior}`); }
  return { ...candidate, rankScore: score, rankReasons: reasons };
}

export function buildQuestionPerspectiveIntelligence(options: QuestionPerspectiveIntelligenceOptionsV1): QuestionPerspectiveIntelligenceV1 {
  const { presentation, understanding } = options;
  const selectedPerspectiveId = options.selectedPerspectiveId ?? null;
  const focusLabel = options.focusLabel ?? null;
  const domainInference = presentation.understanding?.domainInference ?? null;
  const primaryDomain = domainInference?.primaryDomain ?? null;
  const advisor = options.advisor ?? adviseMicroBrainPresentation;
  const actionByQuestion = new Map(understanding.availableActions.map(action => [action.questionId, action]));
  const canonical = presentation.analyses
    .filter(item => !selectedPerspectiveId || (item.businessPerspectiveIds ?? []).some(id => String(id) === selectedPerspectiveId))
    .map(item => canonicalCandidate(item, understanding, selectedPerspectiveId));
  const universal = understanding.recommendedQuestions
    .filter(question => question.id.startsWith('universal:'))
    .filter(question => !selectedPerspectiveId || question.domain === selectedPerspectiveId)
    .map(question => universalCandidate(question, actionByQuestion.get(question.id), understanding));
  const sourceCandidates = [...canonical, ...universal];
  const contextAdvice = advisor({
    domainId: primaryDomain ?? undefined,
    perspectiveId: selectedPerspectiveId ?? undefined,
    semanticSignals: unique(understanding.signals.map(signal => signal.canonicalId)),
    userQuestion: `Which questions are relevant to ${selectedPerspectiveId ?? primaryDomain ?? 'this data'}?`,
    limit: 8,
  });
  const contextCandidates = domainContextCandidates(contextAdvice, sourceCandidates, selectedPerspectiveId, primaryDomain);

  const deduped = dedupeCandidates([...sourceCandidates, ...contextCandidates]).map(candidate => {
    const query: MicroBrainPresentationQueryV1 = {
      domainId: primaryDomain ?? undefined,
      perspectiveId: selectedPerspectiveId ?? candidate.perspectiveId ?? undefined,
      analyticalIntent: candidate.actionKind ?? undefined,
      semanticSignals: unique([...candidate.semanticSignals, ...understanding.signals.map(signal => signal.canonicalId)]),
      userQuestion: candidate.title,
      limit: 6,
    };
    const rawAdvice = candidate.source === 'domain_context' ? contextAdvice : advisor(query);
    const mbAdvice = candidate.source === 'domain_context' ? candidate.mbAdvice : extractMbAdvice(rawAdvice);
    const advisoryRankPrior = candidate.source === 'domain_context'
      ? candidate.advisoryRankPrior
      : advisoryPrior(rawAdvice, selectedPerspectiveId, primaryDomain);
    const usesDomainContext = Boolean(primaryDomain && advisoryRankPrior > 0);
    const basis: QuestionCandidateBasisV1 = candidate.source === 'domain_context'
      ? 'domain_context'
      : usesDomainContext ? 'data_plus_domain' : 'data_evidence';
    return rankCandidate({ ...candidate, basis, mbAdvice, advisoryRankPrior }, selectedPerspectiveId, focusLabel);
  }).sort((left, right) => right.rankScore - left.rankScore || left.candidateId.localeCompare(right.candidateId));

  const actionable = deduped.filter(candidate => candidate.answerability === 'executable_now' || candidate.answerability === 'descriptive_only');
  const primary = actionable[0] ?? null;
  const abstentions = deduped.flatMap(candidate => candidate.mbAdvice.abstainWhen.length
    ? [{ candidateId: candidate.candidateId, reasons: [...candidate.mbAdvice.abstainWhen] }]
    : []);
  const publicCandidate = (candidate: WorkingCandidate): QuestionPerspectiveCandidateV1 => {
    const { semanticKey: _semanticKey, ...published } = candidate;
    return published;
  };

  return {
    schemaVersion: QUESTION_PERSPECTIVE_INTELLIGENCE_VERSION,
    domainContext: {
      primaryDomain,
      primaryDomainSource: domainInference?.primaryDomainSource ?? null,
      analysisMode: domainInference?.analysisMode ?? null,
      officialSupportProductionActive: Boolean(domainInference?.officialSupport.productionActive),
    },
    selectedPerspectiveId,
    focusLabel,
    primary: primary ? publicCandidate(primary) : null,
    candidates: deduped.map(publicCandidate),
    abstentions,
    policy: { mbMayStrengthenAuthority: false, retrievalScoreIsConfidence: false, deterministicGateFinal: true },
  };
}
