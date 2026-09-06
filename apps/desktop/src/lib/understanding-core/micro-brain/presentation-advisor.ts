import { getBuiltInMicroBrainPresentationIndex } from "./built-in-index";
import type {
  MicroBrainPresentationAdvisoryV1,
  MicroBrainRetrievalHitV1,
} from "./contracts";
import { retrieveMicroBrainConcepts } from "./retrieval";

export type MicroBrainPresentationQueryV1 = {
  domainId?: string;
  perspectiveId?: string;
  analyticalIntent?: string;
  availableRoles?: string[];
  semanticSignals?: string[];
  userQuestion?: string;
  limit?: number;
};

export type MicroBrainPresentationCandidateV1 = {
  hit: MicroBrainRetrievalHitV1;
  labels: string[];
  definition: string;
  presentation: MicroBrainPresentationAdvisoryV1;
};
export type MicroBrainPresentationAdviceV1 = {
  brainVersion: string;
  indexVersion: string;
  candidates: MicroBrainPresentationCandidateV1[];
  authorityNotes: string[];
};

function clean(value: string | undefined): string {
  return String(value ?? "").trim();
}

export function adviseMicroBrainPresentation(
  query: MicroBrainPresentationQueryV1,
): MicroBrainPresentationAdviceV1 {
  const index = getBuiltInMicroBrainPresentationIndex();
  const typedTags = [
    query.domainId ? `domain:${query.domainId}` : "",
    query.perspectiveId ? `view:${query.perspectiveId}` : "",
    query.analyticalIntent ? `intent:${query.analyticalIntent}` : "",
    ...(query.availableRoles ?? []).map((role) => `role:${role}`),
  ].filter(Boolean);

  const text = [
    clean(query.userQuestion),
    clean(query.domainId),
    clean(query.perspectiveId),
    clean(query.analyticalIntent),
    ...(query.semanticSignals ?? []),
    ...(query.availableRoles ?? []),
  ].filter(Boolean).join(" ; ");

  const retrieval = retrieveMicroBrainConcepts(index, {
    text,
    typedTags,
    limit: query.limit ?? 8,
  });
  const cardById = new Map(index.cards.map((card) => [card.id, card]));
  const candidates = retrieval.hits.flatMap((hit) => {
    const card = cardById.get(hit.conceptId);
    if (!card?.presentation) return [];
    return [{
      hit,
      labels: card.labels ?? [],
      definition: card.definition ?? "",
      presentation: card.presentation,
    }];
  });

  return {
    brainVersion: retrieval.brainVersion,
    indexVersion: retrieval.indexVersion,
    candidates,
    authorityNotes: [
      "Micro Brain participates in Dashboard Intelligence, never Metric Authority.",
      "User-selected domain and perspective outrank presentation advice.",
      "Every rendered chart still requires deterministic schema, metric and evidence validation.",
      "Retrieval rank is advisory relevance, not semantic confidence or causal evidence.",
    ],
  };
}
