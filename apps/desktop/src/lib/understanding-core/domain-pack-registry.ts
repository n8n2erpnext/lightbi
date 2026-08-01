import { SEMANTIC_SIGNAL_BY_ID } from "../semantic-registry";
import { COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1 } from "./commerce-distribution-question-policy";
import { GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1 } from "./domain-support-manifest";
import { GOVERNED_METRIC_DEFINITIONS_V1 } from "./governed-metric-policy";
import type { DomainPackIdV1, DomainPackSupportLevel } from "./domain-support-manifest";

export type DomainPackPerspectiveV1 = {
  id: string;
  label: string;
  businessGoal: string;
  requiredMetricIds: readonly string[];
};

/**
 * A compact, declarative expansion boundary. Runtime engines consume validated
 * definitions from this registry; they do not import vertical-specific files.
 */
export type DeclarativeDomainPackV1 = {
  schemaVersion: "lightbi.domain-pack.v1";
  id: DomainPackIdV1;
  version: string;
  label: string;
  supportLevel: DomainPackSupportLevel;
  signalIds: readonly string[];
  metricIds: readonly string[];
  questionIds: readonly string[];
  perspectives: readonly DomainPackPerspectiveV1[];
  acceptanceCorpusIds: readonly string[];
};

export type DomainPackValidationV1 = {
  valid: boolean;
  errors: string[];
};

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  });
  return [...repeated].sort();
}

export function validateDomainPack(pack: DeclarativeDomainPackV1): DomainPackValidationV1 {
  const errors: string[] = [];
  if (!pack.id.trim()) errors.push("domain_pack_id_required");
  if (!/^\d+\.\d+\.\d+(?:[-+][a-z0-9.-]+)?$/i.test(pack.version)) errors.push("domain_pack_version_must_be_semver");
  if (!pack.label.trim()) errors.push("domain_pack_label_required");
  if (pack.signalIds.length === 0) errors.push("domain_pack_signals_required");
  duplicates(pack.signalIds).forEach((id) => errors.push(`duplicate_signal:${id}`));
  duplicates(pack.metricIds).forEach((id) => errors.push(`duplicate_metric:${id}`));
  duplicates(pack.questionIds).forEach((id) => errors.push(`duplicate_question:${id}`));
  pack.signalIds
    .filter((id) => !SEMANTIC_SIGNAL_BY_ID.has(id))
    .forEach((id) => errors.push(`unknown_semantic_signal:${id}`));
  const metrics = new Set(pack.metricIds);
  pack.perspectives.forEach((perspective) => {
    if (!perspective.id.trim()) errors.push("perspective_id_required");
    perspective.requiredMetricIds
      .filter((metricId) => !metrics.has(metricId))
      .forEach((metricId) => errors.push(`perspective_metric_not_declared:${perspective.id}:${metricId}`));
  });
  if (pack.supportLevel === "mvp_supported" && pack.acceptanceCorpusIds.length === 0) {
    errors.push("supported_domain_pack_requires_acceptance_corpus");
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)].sort() };
}

export class DomainPackRegistryV1 {
  private readonly packs = new Map<DomainPackIdV1, DeclarativeDomainPackV1>();

  register(pack: DeclarativeDomainPackV1): void {
    const validation = validateDomainPack(pack);
    if (!validation.valid) throw new Error(`Invalid domain pack ${pack.id}: ${validation.errors.join(", ")}`);
    if (this.packs.has(pack.id)) throw new Error(`Domain pack already registered: ${pack.id}`);
    this.packs.set(pack.id, Object.freeze({ ...pack }));
  }

  get(id: DomainPackIdV1): DeclarativeDomainPackV1 | undefined {
    return this.packs.get(id);
  }

  list(): DeclarativeDomainPackV1[] {
    return [...this.packs.values()].sort((left, right) => left.id.localeCompare(right.id));
  }
}

const manifest = GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1[0];
const questionPolicy = COMMERCE_DISTRIBUTION_QUESTION_POLICY_V1;

export const COMMERCE_DISTRIBUTION_DOMAIN_PACK_V1 = {
  schemaVersion: "lightbi.domain-pack.v1",
  id: manifest.packId,
  version: manifest.version,
  label: manifest.label,
  supportLevel: "conditional",
  signalIds: [...new Set(manifest.concepts.flatMap((concept) => concept.requiredSemanticSignals))].sort(),
  metricIds: GOVERNED_METRIC_DEFINITIONS_V1.map((metric) => metric.metricId),
  questionIds: questionPolicy.questionFamilies.map((question) => question.questionId),
  perspectives: [
    { id: "executive", label: "Executive overview", businessGoal: "Understand cross-functional change and decision risk.", requiredMetricIds: ["sales_revenue", "gross_profit", "delivery_count"] },
    { id: "sales", label: "Sales performance", businessGoal: "Understand revenue, quantity and transaction movement.", requiredMetricIds: ["sales_revenue", "quantity_sold", "transaction_count"] },
    { id: "finance", label: "Finance and accounting", businessGoal: "Understand governed profitability and financial evidence.", requiredMetricIds: ["gross_profit"] },
    { id: "operations", label: "Fulfillment and logistics", businessGoal: "Understand delivery and trip volume, flow, timeliness, and operational exceptions.", requiredMetricIds: ["delivery_count", "trip_count"] },
    { id: "inventory", label: "Inventory", businessGoal: "Understand point-in-time stock only when snapshot evidence exists.", requiredMetricIds: ["inventory_on_hand"] },
    { id: "performance", label: "Performance", businessGoal: "Review governed delivery timeliness, trip outcomes, quality scores, and source-record patterns without inventing causality.", requiredMetricIds: ["delivery_count", "trip_count", "average_quality_score", "source_record_count"] },
    { id: "customer", label: "Customer and campaign", businessGoal: "Describe source-record patterns by campaign evidence without inventing conversion or causality.", requiredMetricIds: ["source_record_count"] },
    { id: "data_trust", label: "Data trust", businessGoal: "Review evidence, ambiguity and decision readiness.", requiredMetricIds: [] },
  ],
  acceptanceCorpusIds: ["commerce-distribution-corpus-1.3.0"],
} as const satisfies DeclarativeDomainPackV1;

export const DOMAIN_PACK_REGISTRY_V1 = new DomainPackRegistryV1();
DOMAIN_PACK_REGISTRY_V1.register(COMMERCE_DISTRIBUTION_DOMAIN_PACK_V1);
