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

const PRESENTATION_DOMAIN_QUERY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  revenue: ["sales_revenue"],
  finance: ["finance_accounting"],
  inventory: ["inventory_warehouse"],
  operations: ["logistics_transportation"],
  customer: ["customer_crm_support"],
};

function domainQueryTags(domainId: string | undefined): string[] {
  const canonical = clean(domainId);
  if (!canonical) return [];
  return [...new Set([canonical, ...(PRESENTATION_DOMAIN_QUERY_ALIASES[canonical] ?? [])])]
    .map((value) => `domain:${value}`);
}


const PRESENTATION_PERSPECTIVE_QUERY_ALIASES: Readonly<Record<string, readonly string[]>> = {
  executive_overview: ['executive'],
  sales_performance: ['sales'],
  profitability: ['finance', 'executive'],
  finance_accounting: ['finance'],
  fulfillment_operations: ['operations'],
  order_journey: ['operations', 'customer_service'],
  period_comparison: ['analyst'],
  data_trust: ['analyst', 'risk_compliance'],
  revenue_money: ['sales', 'executive'],
  performance_ranking: ['sales', 'executive'],
  inventory_health: ['inventory'],
  ops_flow: ['operations'],
  customer_dist: ['customer_service', 'analyst'],
  customer_low_value: ['customer_service', 'sales'],
  dirty_review: ['analyst', 'risk_compliance'],
};

function perspectiveQueryValues(perspectiveId: string | undefined): string[] {
  const canonical = clean(perspectiveId);
  if (!canonical) return [];
  return [...new Set([canonical, ...(PRESENTATION_PERSPECTIVE_QUERY_ALIASES[canonical] ?? [])])];
}

function perspectiveQueryTags(perspectiveId: string | undefined): string[] {
  return perspectiveQueryValues(perspectiveId).map((value) => `view:${value}`);
}

function normalizeQueryValue(value: string): string {
  return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function adviseMicroBrainPresentation(
  query: MicroBrainPresentationQueryV1,
): MicroBrainPresentationAdviceV1 {
  const index = getBuiltInMicroBrainPresentationIndex();
  const typedTags = [
    ...domainQueryTags(query.domainId),
    ...perspectiveQueryTags(query.perspectiveId),
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
  const perspectiveValues = new Set(perspectiveQueryValues(query.perspectiveId).map(normalizeQueryValue));
  const candidates = retrieval.hits.flatMap((hit) => {
    const card = cardById.get(hit.conceptId);
    if (!card?.presentation) return [];
    return [{
      hit,
      labels: card.labels ?? [],
      definition: card.definition ?? "",
      presentation: card.presentation,
    }];
  }).sort((left, right) => {
    const match = (candidate: MicroBrainPresentationCandidateV1) =>
      (candidate.presentation.perspectives ?? []).some(value => perspectiveValues.has(normalizeQueryValue(value))) ? 1 : 0;
    return match(right) - match(left)
      || left.hit.fusedRank - right.hit.fusedRank
      || left.hit.conceptId.localeCompare(right.hit.conceptId);
  });

  return {
    brainVersion: retrieval.brainVersion,
    indexVersion: retrieval.indexVersion,
    candidates,
    authorityNotes: [
      "Micro Brain participates in Dashboard Intelligence, never Metric Authority.",
      "User-selected domain and perspective outrank presentation advice; exact perspective matches may rerank advice while fused retrieval ranks remain auditable.",
      "Every rendered chart still requires deterministic schema, metric and evidence validation.",
      "Retrieval rank is advisory relevance, not semantic confidence or causal evidence.",
    ],
  };
}
