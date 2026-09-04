import { SEMANTIC_SIGNAL_BY_ID } from "../semantic-registry";
import { GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1 } from "./domain-support-manifest";
import type { DomainActivationArtifactV1, GovernedMetricPreflightV1 } from "./governed-domain-metric-contracts";
import { getBuiltInMicroBrainIndex } from "./micro-brain/built-in-index";
import type { SemanticResolutionArtifactV1 } from "./semantic-resolution-contracts";
import {
  DOMAIN_INFERENCE_ARTIFACT_VERSION,
  type DomainInferenceArtifactV1,
  type DomainInferenceEvidenceV1,
  type DomainInferenceSourceV1,
} from "./domain-inference-contracts";

const RUNTIME_DOMAINS = new Set([
  "operations",
  "revenue",
  "inventory",
  "customer",
  "performance",
  "finance",
]);

type Bucket = {
  rank: number;
  canonical: boolean;
  brain: boolean;
  signals: Set<string>;
  columns: Set<string>;
  reasons: Set<string>;
};
function bucketFor(map: Map<string, Bucket>, domainId: string): Bucket {
  const existing = map.get(domainId);
  if (existing) return existing;
  const created: Bucket = {
    rank: 0,
    canonical: false,
    brain: false,
    signals: new Set<string>(),
    columns: new Set<string>(),
    reasons: new Set<string>(),
  };
  map.set(domainId, created);
  return created;
}

function sourceFor(bucket: Bucket): DomainInferenceSourceV1 {
  if (bucket.canonical && bucket.brain) return "mixed";
  return bucket.brain ? "micro_brain_relation" : "canonical_resolution";
}

function addEvidence(
  map: Map<string, Bucket>,
  domainId: string,
  rank: number,
  canonical: boolean,
  brain: boolean,
  signalId: string,
  physicalColumn: string,
  reason: string,
): void {
  if (!domainId || domainId === "core") return;
  const bucket = bucketFor(map, domainId);
  bucket.rank += rank;
  bucket.canonical ||= canonical;
  bucket.brain ||= brain;
  bucket.signals.add(signalId);
  bucket.columns.add(physicalColumn);
  bucket.reasons.add(reason);
}

function rankedDomains(map: Map<string, Bucket>): DomainInferenceEvidenceV1[] {
  return [...map.entries()]
    .map(([domainId, bucket]) => ({
      domainId,
      source: sourceFor(bucket),
      evidenceRank: bucket.rank,
      canonicalSignalIds: [...bucket.signals].sort(),
      physicalColumns: [...bucket.columns].sort(),
      reasonCodes: [...bucket.reasons].sort(),
    }))
    .sort((left, right) =>
      right.evidenceRank - left.evidenceRank
      || right.canonicalSignalIds.length - left.canonicalSignalIds.length
      || left.domainId.localeCompare(right.domainId));
}

export function inferDomainState(input: {
  semantic: SemanticResolutionArtifactV1;
  domainActivation: DomainActivationArtifactV1;
  metricPreflight: GovernedMetricPreflightV1;
}): DomainInferenceArtifactV1 {
  const { semantic, domainActivation, metricPreflight } = input;
  const domainBuckets = new Map<string, Bucket>();
  const brainIndex = getBuiltInMicroBrainIndex();
  for (const column of semantic.columns) {
    const signalId = column.selectedCandidateId;
    if (!signalId || !["confirmed", "probable"].includes(column.finalState)) continue;
    const definition = SEMANTIC_SIGNAL_BY_ID.get(signalId);
    if (!definition) continue;
    const mbRecovered = column.ruleIds.includes("R-MB-PROBABLE");
    const weight = column.finalState === "confirmed" ? 3 : mbRecovered ? 1 : 2;
    const declaredDomains = new Set(definition.domains ?? [definition.domain]);
    for (const domainId of declaredDomains) {
      addEvidence(
        domainBuckets,
        domainId,
        weight,
        true,
        mbRecovered,
        signalId,
        column.physicalColumn,
        mbRecovered ? "resolved_semantic_mb_recovery" : `resolved_semantic_${column.finalState}`,
      );
    }

    const knowledgeCards = brainIndex.cards.filter((card) => card.canonicalSignal === signalId);
    for (const card of knowledgeCards) {
      for (const domainId of card.relatedDomains) {
        if (declaredDomains.has(domainId) || domainId === "core") continue;
        addEvidence(domainBuckets, domainId, 2, false, true, signalId, column.physicalColumn, `brain_relation:${card.id}`);
      }
    }
  }

  const domains = rankedDomains(domainBuckets);
  const specialized = domains.filter((item) => !RUNTIME_DOMAINS.has(item.domainId) && item.canonicalSignalIds.length >= 2);
  const primary = specialized[0] ?? domains[0] ?? null;
  const stateCounts = semantic.coverage.stateCounts;
  const microBrainRecovered = semantic.columns.filter((column) => column.ruleIds.includes("R-MB-PROBABLE")).length;
  const productionActive = GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1.some((manifest) => manifest.packId === domainActivation.packId && manifest.productionActive);
  const governedMetricReady = metricPreflight.metrics.some((metric) => ["ready", "conditionally_ready"].includes(metric.state));
  const inferredOnly = primary ? !RUNTIME_DOMAINS.has(primary.domainId) || primary.source === "micro_brain_relation" : false;
  const analysisMode = !primary
    ? "unknown_or_ambiguous" as const
    : productionActive && ["active", "conditional"].includes(domainActivation.state) && governedMetricReady
      ? "governed_supported" as const
      : inferredOnly
        ? "evidence_bound_inferred_domain" as const
        : "canonical_detect_only" as const;

  return {
    schemaVersion: DOMAIN_INFERENCE_ARTIFACT_VERSION,
    primaryDomain: primary?.domainId ?? null,
    primaryDomainSource: primary?.source ?? null,
    domains,
    semanticConcepts: {
      confirmed: stateCounts.confirmed ?? 0,
      probable: stateCounts.probable ?? 0,
      microBrainRecovered,
      ambiguous: stateCounts.ambiguous ?? 0,
      unknown: stateCounts.unknown ?? 0,
      unresolved: (stateCounts.ambiguous ?? 0) + (stateCounts.unknown ?? 0),
    },
    evidenceConflicts: stateCounts.ambiguous ?? 0,
    officialSupport: {
      packId: domainActivation.packId,
      state: domainActivation.state,
      productionActive,
    },
    analysisMode,
    limitations: [
      "Domain evidence rank is an ordering aid, not semantic confidence.",
      "Micro Brain related-domain evidence never activates official domain support.",
      "Official support remains owned by the governed domain-support manifest and runtime gates.",
      analysisMode === "evidence_bound_inferred_domain"
        ? "This domain is semantically inferred and is not an officially supported domain pack."
        : "Canonical recognition does not by itself authorize a metric or decision claim.",
    ],
  };
}
