import { projectCanonicalArtifactToUnderstandingNext } from "./canonical-consumer-presentation-adapter";
import type { CanonicalDomainPerspectiveCandidateV1 } from "./canonical-source-candidate-projection";
import type { CanonicalConsumerBuildResultV1 } from "./understanding-core/canonical-consumer-boundary";
import { adaptCoreToUnderstandingNext } from "./understanding-core/next-adapter";
import { createUnderstandingCoreResult } from "./understanding-core/question-engine";
import type { UnderstandingCoreInput } from "./understanding-core/contracts";
import type { AnalysisAction, BusinessLens, BusinessQuestion, DatasetUnderstandingResult, DomainId } from "./understanding-next/contracts";
import { inferSemanticDomainAffinities } from "./understanding-next/semantic-domain-affinity";

export type CanonicalCapabilityLadderResult = {
  understanding: DatasetUnderstandingResult;
  perspectives: CanonicalDomainPerspectiveCandidateV1[];
};

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const id = key(value);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function prefixUniversalAction(action: AnalysisAction): AnalysisAction {
  return { ...action, id: `universal:${action.id}`, questionId: `universal:${action.questionId}` };
}

function prefixUniversalQuestion(question: BusinessQuestion): BusinessQuestion {
  return { ...question, id: `universal:${question.id}`, perspectiveId: `universal:${question.perspectiveId}` };
}

function prefixUniversalLens(lens: BusinessLens): BusinessLens {
  return {
    ...lens,
    id: `universal:${lens.id}`,
    questions: lens.questions.map((question) => ({
      ...question,
      id: `universal:${question.id}`,
      lensId: `universal:${lens.id}`,
      defaultAction: question.defaultAction ? prefixUniversalAction(question.defaultAction) : undefined,
    })),
  };
}

function universalProjection(input: UnderstandingCoreInput): DatasetUnderstandingResult {
  const projected = adaptCoreToUnderstandingNext(createUnderstandingCoreResult(input));
  return {
    ...projected,
    lenses: projected.lenses.map(prefixUniversalLens),
    perspectives: projected.perspectives.map((perspective) => ({ ...perspective, id: `universal:${perspective.id}` })),
    recommendedQuestions: projected.recommendedQuestions.map(prefixUniversalQuestion),
    availableActions: projected.availableActions.map(prefixUniversalAction),
    unavailableActions: projected.unavailableActions.map((action) => ({ ...action, id: `universal:${action.id}` })),
  };
}

export function mergeCanonicalAndUniversalUnderstanding(
  canonical: DatasetUnderstandingResult,
  universal: DatasetUnderstandingResult,
): DatasetUnderstandingResult {
  const canonicalHasSource = canonical.source.sourceColumnCount > 0;
  const mergedSignals = uniqueBy([...canonical.signals, ...universal.signals], (signal) => `${signal.canonicalId}:${signal.physicalColumn}`);
  return {
    source: canonicalHasSource ? canonical.source : universal.source,
    quality: {
      headerStatus: canonical.quality.headerStatus === "failed" ? universal.quality.headerStatus : canonical.quality.headerStatus,
      dirtySignals: uniqueBy(
        [...canonical.quality.dirtySignals, ...universal.quality.dirtySignals],
        (item) => `${item.kind}:${item.column ?? ""}:${item.message}`,
      ),
      blockedReasons: canonical.quality.headerStatus === "failed" ? universal.quality.blockedReasons : canonical.quality.blockedReasons,
    },
    profile: {
      grain: canonical.profile.grain === "unknown" ? universal.profile.grain : canonical.profile.grain,
      documentType: canonical.profile.documentType === "generic_table" ? universal.profile.documentType : canonical.profile.documentType,
      detectedDomains: uniqueBy([...canonical.profile.detectedDomains, ...universal.profile.detectedDomains], (domain) => domain),
    },
    columns: canonical.columns?.length ? canonical.columns : universal.columns,
    signals: mergedSignals,
    domainAffinities: canonical.domainAffinities?.length
      ? canonical.domainAffinities
      : universal.domainAffinities?.length
        ? universal.domainAffinities
        : inferSemanticDomainAffinities(mergedSignals),
    stakeholderFits: uniqueBy([...canonical.stakeholderFits, ...universal.stakeholderFits], (fit) => fit.id),
    lenses: uniqueBy([...canonical.lenses, ...universal.lenses], (lens) => lens.id),
    perspectives: uniqueBy([...canonical.perspectives, ...universal.perspectives], (perspective) => perspective.id),
    recommendedQuestions: uniqueBy([...canonical.recommendedQuestions, ...universal.recommendedQuestions], (question) => question.id),
    availableActions: uniqueBy([...canonical.availableActions, ...universal.availableActions], (action) => action.id),
    unavailableActions: uniqueBy([...canonical.unavailableActions, ...universal.unavailableActions], (action) => action.id),
  };
}

function augmentPerspectives(
  canonicalPerspectives: CanonicalDomainPerspectiveCandidateV1[],
  understanding: DatasetUnderstandingResult,
  artifact: CanonicalConsumerBuildResultV1,
): CanonicalDomainPerspectiveCandidateV1[] {
  const sourceId = artifact.status === "valid" ? artifact.canonicalSource.semantic.sourceId : "unavailable";
  const sourceArtifactId = artifact.status === "valid" ? artifact.identity : "unavailable";
  const actionByQuestion = new Map(
    understanding.availableActions.filter((action) => action.id.startsWith("universal:")).map((action) => [action.questionId, action]),
  );
  const byDomain = new Map<DomainId, { questions: BusinessQuestion[]; actions: AnalysisAction[] }>();
  for (const question of understanding.recommendedQuestions) {
    if (!question.id.startsWith("universal:")) continue;
    const action = actionByQuestion.get(question.id);
    if (!action || action.executionScope === "not_supported") continue;
    const bucket = byDomain.get(question.domain) ?? { questions: [], actions: [] };
    bucket.questions.push(question);
    bucket.actions.push(action);
    byDomain.set(question.domain, bucket);
  }
  const existing = new Map(canonicalPerspectives.map((perspective) => [perspective.perspectiveId, perspective]));
  const affinityByDomain = new Map((understanding.domainAffinities ?? []).map((affinity) => [affinity.domain, affinity.score]));
  const labels: Record<DomainId, string> = {
    operations: "Operations", revenue: "Revenue", inventory: "Inventory",
    customer: "Customer", performance: "Performance", finance: "Finance",
  };
  for (const [domain, capability] of byDomain) {
    const current = existing.get(domain);
    const domainSignals = understanding.signals.filter((signal) => signal.domain === domain);
    existing.set(domain, {
      perspectiveId: domain,
      label: current?.label ?? labels[domain],
      purpose: current?.purpose ?? capability.questions[0]?.userPrompt ?? `Explore supported ${labels[domain].toLowerCase()} questions.`,
      sourceId: current?.sourceId ?? sourceId,
      sourceArtifactId: current?.sourceArtifactId ?? sourceArtifactId,
      matchedSignalIds: uniqueBy([...(current?.matchedSignalIds ?? []), ...domainSignals.map((signal) => signal.canonicalId)], (value) => value),
      matchedPhysicalColumns: uniqueBy([...(current?.matchedPhysicalColumns ?? []), ...domainSignals.map((signal) => signal.physicalColumn)], (value) => value),
      questionIds: uniqueBy([...(current?.questionIds ?? []), ...capability.questions.map((item) => item.id)], (value) => value),
      actionCandidateIds: uniqueBy([...(current?.actionCandidateIds ?? []), ...capability.actions.map((item) => item.id)], (value) => value),
      state: "governed_action_available",
      evidence: uniqueBy([...(current?.evidence ?? []), "capability_ladder:universal_descriptive"], (value) => value),
      blockers: [],
      provenance: "inferred_candidate",
    });
  }
  const semanticFit = (perspective: CanonicalDomainPerspectiveCandidateV1): number => {
    const actionIds = perspective.actionCandidateIds.join(" ");
    const signalIds = perspective.matchedSignalIds.join(" ");
    const allSignalIds = understanding.signals.map((signal) => signal.canonicalId).join(" ");
    // Recommend the business perspective carried by the strongest semantic
    // evidence in the source. Generic person/activity/location signals are
    // useful secondary angles, but must not outrank explicit finance,
    // inventory, commerce, customer, or logistics evidence.
    const strongDomainBoost =
      perspective.perspectiveId === "inventory" && /inventory\.|quantity\.(?:on_hand|stock)|stock/.test(allSignalIds) ? 90 :
      perspective.perspectiveId === "finance" && /money\.(?:profit|margin)/.test(allSignalIds) && /money\.cost/.test(allSignalIds) ? 130 :
      perspective.perspectiveId === "finance" && /money\.(?:profit|margin|cost|receivable|payable|balance|opening_balance|closing_balance|debt)/.test(allSignalIds) ? 85 :
      perspective.perspectiveId === "operations" && /document\.(?:shipment|delivery)|status\.(?:delivery|fulfillment)|entity\.(?:carrier|driver|vehicle)|location\.current/.test(allSignalIds) ? 80 :
      perspective.perspectiveId === "revenue" && /money\.(?:revenue|sales|invoice_total|amount)/.test(allSignalIds) ? 75 :
      perspective.perspectiveId === "customer" && /entity\.(?:customer|patient)|engagement\.(?:segment|conversion|retention|churn)/.test(allSignalIds) ? 70 :
      perspective.perspectiveId === "performance" && /indicator\.|engagement\.(?:outcome|achievement)|entity\.(?:team|coach)/.test(allSignalIds) ? 65 :
      0;
    const capabilityBoost =
      perspective.perspectiveId === "inventory" && /inventory_aging|stock_movement|inventory_on_hand|catalog_composition|catalog_records/.test(actionIds) && /inventory|stock|sku|item|category|brand/.test(signalIds) ? 40 :
      perspective.perspectiveId === "operations" && /shipment|delivery|carrier|operational_workload/.test(actionIds) ? 40 :
      perspective.perspectiveId === "finance" && /economic_indicator|profit_or_margin|gross_profit|receivable|payable|balance/.test(actionIds) ? 40 :
      perspective.perspectiveId === "revenue" && /sales_revenue|money_over_time|money_by_location|payment_mix|transaction_count|actor_value/.test(actionIds) ? 35 :
      perspective.perspectiveId === "performance" && /indicator|performance|achievement|participation/.test(actionIds) ? 25 :
      0;
    // Affinity is useful supporting evidence, but it can grow with the width of
    // a table. Cap it so many weak generic columns cannot outvote a smaller set
    // of explicit domain semantics (for example profit + cost + margin).
    const boundedAffinity = Math.min(
      50,
      affinityByDomain.get(perspective.perspectiveId) ?? Math.min(24, perspective.matchedSignalIds.length * 3),
    );
    return boundedAffinity + strongDomainBoost + capabilityBoost;
  };
  return [...existing.values()].sort((left, right) =>
    Number(right.state === "governed_action_available") - Number(left.state === "governed_action_available")
    || semanticFit(right) - semanticFit(left)
    || right.actionCandidateIds.length - left.actionCandidateIds.length
    || left.label.localeCompare(right.label));
}

export function projectCanonicalCapabilityLadder(
  artifact: CanonicalConsumerBuildResultV1,
  canonicalPerspectives: CanonicalDomainPerspectiveCandidateV1[],
  input: UnderstandingCoreInput,
): CanonicalCapabilityLadderResult {
  const canonical = projectCanonicalArtifactToUnderstandingNext(artifact);
  const universal = universalProjection(input);
  const understanding = mergeCanonicalAndUniversalUnderstanding(canonical, universal);
  return { understanding, perspectives: augmentPerspectives(canonicalPerspectives, understanding, artifact) };
}
