import { describe, expect, it } from "vitest";
import { SEMANTIC_SIGNAL_REGISTRY_V1 } from "../semantic-registry";
import { activateCommerceDistributionDomain } from "./commerce-distribution-domain-pack";
import { aggregateContextualEvidence } from "./contextual-evidence-aggregator";
import { canonicalJson, deterministicPolicySha256 } from "./contextual-evidence-policy";
import { generateGrainCandidateArtifact } from "./grain-candidate-engine";
import { resolveGrainSignatureShadow } from "./grain-resolver";
import type { CanonicalMetricSourceV1, DomainMetricEvaluationContextV1 } from "./governed-domain-metric-contracts";
import { preflightGovernedMetrics } from "./governed-metric-preflight";
import { GOVERNED_METRIC_DEFINITIONS_V1, GOVERNED_METRIC_POLICY_V1, governedMetricPolicyHash } from "./governed-metric-policy";
import { profilePhysicalSource } from "./profiler";
import { buildUnderstandingReadiness } from "./readiness-engine";
import { generateSemanticCandidateArtifact } from "./semantic-candidate-engine";
import { resolveSemanticShadow } from "./semantic-resolver";

const allowed: DomainMetricEvaluationContextV1 = { group: "synthetic", tuningUse: "allowed" };
const forbidden: DomainMetricEvaluationContextV1 = { group: "holdout", tuningUse: "forbidden" };
const mandatoryNegativeProbes = [
  "identifier_as_revenue", "unit_price_as_revenue", "percentage_as_amount", "average_rate_as_amount", "snapshot_as_quantity_sold",
  "balance_across_time", "repeated_order_total", "ambiguous_grain", "unknown_measure_role", "incompatible_currency",
  "incompatible_uom", "missing_transaction_key", "row_count_as_customer_count", "distinct_without_governed_key", "revenue_without_time_basis",
  "profit_incompatible_grain", "profit_incompatible_currency", "profit_missing_cost", "relationship_metric_without_relationship", "numeric_parse_without_semantics",
  "high_physical_quality_but_blocked", "high_semantic_coverage_incompatible_grain", "holdout_tuning_attempt", "filename_specific_activation", "canonical_semantic_override_attempt",
  "blocker_weakening_attempt", "global_safe_to_aggregate_attempt", "definition_execution_authorization_attempt", "empty_or_invalid_artifact", "policy_hash_mismatch",
] as const;

function canonicalSource(id: string, rows: unknown[][], syntheticResolutions: Record<string, string> = {}): CanonicalMetricSourceV1 {
  const physical = profilePhysicalSource({ schemaVersion: "lightbi.physical-source-input.v1", source: { sourceId: id, kind: "unknown", label: "fixture", hash: { algorithm: "sha256", value: deterministicPolicySha256(rows) } }, rawRows: rows });
  const candidate = generateSemanticCandidateArtifact(physical, { registry: SEMANTIC_SIGNAL_REGISTRY_V1 });
  const contextual = aggregateContextualEvidence(physical, candidate);
  const semantic = resolveSemanticShadow(physical, candidate, contextual);
  for (const [physicalColumn, candidateId] of Object.entries(syntheticResolutions)) {
    const column = semantic.columns.find((item) => item.physicalColumn === physicalColumn);
    if (!column?.candidateTraces.some((trace) => trace.candidateId === candidateId)) throw new Error(`SYNTHETIC_CANDIDATE_MISSING:${physicalColumn}:${candidateId}`);
    column.finalState = "probable";
    column.selectedCandidateId = candidateId;
  }
  const grainCandidate = generateGrainCandidateArtifact(physical, semantic, rows);
  const grain = resolveGrainSignatureShadow(grainCandidate, { sourceId: grainCandidate.sourceId, sourceHash: grainCandidate.sourceHash });
  const readiness = buildUnderstandingReadiness({ scope: "source", physical, semantic, grain });
  return { physical, semantic, grain, readiness };
}

function preflight(source: CanonicalMetricSourceV1, metricIds?: string[], context = allowed, expectedPolicyHash = governedMetricPolicyHash()) {
  return preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources: [source], metricIds, evaluationContext: context, expectedPolicyHash });
}

const revenue = canonicalSource("revenue", [
  ["OrderID", "Product", "OrderDate", "Revenue", "Currency"],
  ["O-1", "A", "2026-01-01", 100, "USD"],
  ["O-2", "B", "2026-01-01", 50, "USD"],
  ["O-3", "A", "2026-01-02", 75, "USD"],
], { OrderID: "order", OrderDate: "time_period" });
const quantity = canonicalSource("quantity", [
  ["OrderID", "Product", "OrderDate", "Sold Quantity", "UOM"],
  ["O-1", "A", "2026-01-01", 2, "pcs"],
  ["O-1", "B", "2026-01-01", 1, "pcs"],
  ["O-2", "A", "2026-01-02", 3, "pcs"],
], { OrderID: "order", OrderDate: "time_period", "Sold Quantity": "sold_qty" });
const inventory = canonicalSource("inventory", [
  ["SKU", "Warehouse", "Period", "StockQty", "UOM"],
  ["A", "W1", "2026-01-31", 10, "pcs"],
  ["B", "W1", "2026-01-31", 20, "pcs"],
  ["C", "W1", "2026-01-31", 30, "pcs"],
], { StockQty: "stock_qty", Period: "time_period" });
const delivery = canonicalSource("delivery", [
  ["ShipmentID", "DeliveryDate", "DeliveryStatus"],
  ["S-1", "2026-01-01", "Delivered"],
  ["S-2", "2026-01-02", "Delivered"],
  ["S-3", "2026-01-03", "Pending"],
], { ShipmentID: "shipment" });
const grossProfit = canonicalSource("gross-profit", [
  ["OrderID", "OrderDate", "Revenue", "TotalCost", "Currency"],
  ["O-1", "2026-01-01", 100, 60, "USD"],
  ["O-2", "2026-01-02", 200, 140, "USD"],
  ["O-3", "2026-01-03", 150, 100, "USD"],
], { OrderID: "order", OrderDate: "time_period", Revenue: "revenue", TotalCost: "total_cost" });

describe("Phase 5M1 governed commerce domain and metric foundation", () => {
  it("defines exactly one conditional pack and the complete governed metric catalog", async () => {
    const { GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1, DOMAIN_SUPPORT_MANIFEST } = await import("./domain-support-manifest");
    expect(DOMAIN_SUPPORT_MANIFEST).toEqual([]);
    expect(GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1).toHaveLength(1);
    expect(GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1[0].packStatus).toBe("conditional");
    expect(GOVERNED_METRIC_DEFINITIONS_V1).toHaveLength(9);
    expect(GOVERNED_METRIC_DEFINITIONS_V1.every((metric) => metric.executionAuthorization === false && metric.requirements.length > 0)).toBe(true);
  });

  it("covers the ten mandatory positive probes without authorizing execution", () => {
    const revenueResult = preflight(revenue, ["sales_revenue"]);
    const quantityResult = preflight(quantity, ["quantity_sold"]);
    const transactionResult = preflight(revenue, ["transaction_count"]);
    const inventoryResult = preflight(inventory, ["inventory_on_hand"]);
    const deliveryResult = preflight(delivery, ["delivery_count"]);
    const profitResult = preflight(grossProfit, ["gross_profit"]);
    const generic = canonicalSource("generic", [["opaque"], ["a"], ["b"]]);
    const genericActivation = activateCommerceDistributionDomain({ schemaVersion: "lightbi.domain-activation-input.v1", sources: [generic], evaluationContext: allowed });
    const partialActivation = activateCommerceDistributionDomain({ schemaVersion: "lightbi.domain-activation-input.v1", sources: [revenue], evaluationContext: allowed });
    const independent = preflight(revenue, ["transaction_count", "sales_revenue"]);

    for (const result of [revenueResult, quantityResult, transactionResult, inventoryResult, deliveryResult, profitResult]) {
      expect(["ready", "conditionally_ready", "blocked"]).toContain(result.metrics[0].state);
      expect(result.metrics[0].metricDefinitionAvailable).toBe(true);
      expect(result.metricResultsProduced).toBe(false);
      expect(result.runtimeActionAuthorized).toBe(false);
      expect(result.productionWiring.executed).toBe(false);
    }
    expect(revenueResult.metrics[0].semanticRequirementsSatisfied).toBe(true);
    expect(quantityResult.metrics[0].semanticRequirementsSatisfied).toBe(true);
    expect(transactionResult.metrics[0].semanticRequirementsSatisfied).toBe(true);
    expect(inventoryResult.metrics[0].semanticRequirementsSatisfied).toBe(true);
    expect(deliveryResult.metrics[0].semanticRequirementsSatisfied).toBe(true);
    expect(profitResult.metrics[0].semanticRequirementsSatisfied).toBe(true);
    expect(generic.readiness.capabilities.find((item) => item.capabilityId === "physical_profile_ready")?.state).toBe("ready");
    expect(genericActivation.state).toBe("unsupported");
    expect(partialActivation.state).toBe("conditional");
    expect(independent.metrics).toHaveLength(2);
    expect(independent.metrics.every((metric) => metric.runtimeActionCreated === false)).toBe(true);
  });

  it("governs at least thirty mandatory negative probes", () => {
    expect(mandatoryNegativeProbes).toHaveLength(30);
    const negativeCases: Array<{ name: string; source: CanonicalMetricSourceV1; metric: string; blocker: string }> = [
      { name: "identifier proposed as revenue", source: canonicalSource("n01", [["OrderID"], ["O-1"], ["O-2"]]), metric: "sales_revenue", blocker: "missing_semantic_requirement:revenue_amount" },
      { name: "unit price proposed as revenue", source: canonicalSource("n02", [["UnitPrice", "OrderDate"], [10, "2026-01-01"], [20, "2026-01-02"]]), metric: "sales_revenue", blocker: "missing_semantic_requirement:revenue_amount" },
      { name: "percentage proposed as amount", source: canonicalSource("n03", [["MarginPct", "OrderDate"], [.1, "2026-01-01"], [.2, "2026-01-02"]]), metric: "sales_revenue", blocker: "missing_semantic_requirement:revenue_amount" },
      { name: "average rate proposed as amount", source: canonicalSource("n04", [["Discount", "OrderDate"], [.1, "2026-01-01"], [.2, "2026-01-02"]]), metric: "sales_revenue", blocker: "missing_semantic_requirement:revenue_amount" },
      { name: "snapshot as quantity sold", source: inventory, metric: "quantity_sold", blocker: "snapshot_quantity_cannot_be_quantity_sold" },
      { name: "balance across time", source: inventory, metric: "sales_revenue", blocker: "missing_semantic_requirement:revenue_amount" },
      { name: "repeated order total", source: canonicalSource("n07", [["OrderID", "Product", "OrderDate", "Revenue"], ["O-1", "A", "2026-01-01", 100], ["O-1", "B", "2026-01-01", 100], ["O-2", "A", "2026-01-02", 50]]), metric: "sales_revenue", blocker: "repeated_or_unresolved_measure_aggregation" },
      { name: "ambiguous grain", source: canonicalSource("n08", [["Revenue"], [10], [20]]), metric: "sales_revenue", blocker: "metric_grain_incompatible" },
      { name: "unknown measure role", source: canonicalSource("n09", [["Amount"], [10], [20]]), metric: "sales_revenue", blocker: "missing_semantic_requirement:revenue_amount" },
      { name: "incompatible currency", source: canonicalSource("n10", [["OrderID", "OrderDate", "Revenue", "Currency", "CCY"], ["O-1", "2026-01-01", 10, "USD", "EUR"], ["O-2", "2026-01-02", 20, "USD", "EUR"]]), metric: "sales_revenue", blocker: "currency_basis_ambiguous_or_incompatible" },
      { name: "incompatible uom", source: canonicalSource("n11", [["OrderID", "OrderDate", "Sold Quantity", "UOM", "Unit"], ["O-1", "2026-01-01", 10, "pcs", "kg"], ["O-2", "2026-01-02", 20, "pcs", "kg"]], { OrderID: "order", OrderDate: "time_period", "Sold Quantity": "sold_qty" }), metric: "quantity_sold", blocker: "unit_basis_ambiguous_or_incompatible" },
      { name: "missing transaction key", source: canonicalSource("n12", [["Revenue", "OrderDate"], [10, "2026-01-01"], [20, "2026-01-02"]]), metric: "transaction_count", blocker: "missing_semantic_requirement:transaction_identity" },
      { name: "customer row count", source: canonicalSource("n13", [["Customer"], ["A"], ["B"]]), metric: "transaction_count", blocker: "missing_semantic_requirement:transaction_identity" },
      { name: "distinct without governed key", source: canonicalSource("n14", [["OrderID"], ["O-1"], ["O-1"]]), metric: "transaction_count", blocker: "governed_identity_required_for_count" },
      { name: "revenue missing time", source: canonicalSource("n15", [["OrderID", "Revenue"], ["O-1", 10], ["O-2", 20]]), metric: "sales_revenue", blocker: "metric_time_basis_incompatible_or_missing" },
      { name: "profit incompatible grain", source: canonicalSource("n16", [["OrderID", "OrderDate", "Revenue", "TotalCost"], ["O-1", "2026-01-01", 10, 5], ["O-1", "2026-01-01", 10, 6]]), metric: "gross_profit", blocker: "repeated_or_unresolved_measure_aggregation" },
      { name: "profit incompatible currencies", source: canonicalSource("n17", [["OrderID", "OrderDate", "Revenue", "TotalCost", "Currency", "CCY"], ["O-1", "2026-01-01", 10, 5, "USD", "EUR"], ["O-2", "2026-01-02", 20, 10, "USD", "EUR"]]), metric: "gross_profit", blocker: "currency_basis_ambiguous_or_incompatible" },
      { name: "profit missing cost", source: revenue, metric: "gross_profit", blocker: "missing_semantic_requirement:gross_profit_cost" },
      { name: "relationship metric ungoverned", source: revenue, metric: "gross_profit", blocker: "missing_semantic_requirement:gross_profit_cost" },
      { name: "numeric parse only", source: canonicalSource("n20", [["Opaque"], [10], [20]]), metric: "sales_revenue", blocker: "missing_semantic_requirement:revenue_amount" },
      { name: "high physical quality blocked", source: canonicalSource("n21", [["Opaque"], [10], [20]]), metric: "sales_revenue", blocker: "missing_semantic_requirement:revenue_amount" },
      { name: "semantic coverage incompatible grain", source: canonicalSource("n22", [["Revenue"], [10], [20]]), metric: "sales_revenue", blocker: "metric_grain_incompatible" },
      { name: "filename cannot activate", source: canonicalSource("Sales_ERP_Revenue.xlsx", [["Opaque"], ["a"], ["b"]]), metric: "sales_revenue", blocker: "missing_semantic_requirement:revenue_amount" },
      { name: "empty artifact", source: canonicalSource("n29", []), metric: "sales_revenue", blocker: "full_file_physical_profile_required" },
    ];
    expect(negativeCases.length).toBeGreaterThanOrEqual(24);
    for (const probe of negativeCases) {
      const item = preflight(probe.source, [probe.metric]).metrics[0];
      expect(item.state, probe.name).toBe("blocked");
      expect(item.blockers.map((entry) => entry.code), probe.name).toContain(probe.blocker);
    }

    const badTuning = preflight(revenue, ["sales_revenue"], { group: "holdout", tuningUse: "allowed" }).metrics[0];
    expect(badTuning.blockers.map((entry) => entry.code)).toContain("evaluation_only_group_cannot_tune_policy");
    const unknown = preflight(revenue, ["customer_count"]).metrics[0];
    expect(unknown.state).toBe("unsupported");
    const policyMismatch = preflight(revenue, ["sales_revenue"], allowed, "bad").metrics[0];
    expect(policyMismatch.blockers.map((entry) => entry.code)).toContain("governed_metric_policy_hash_mismatch");
    const hashMismatch = structuredClone(revenue); hashMismatch.semantic.sourceHash = { algorithm: "sha256", value: "bad" };
    expect(preflight(hashMismatch, ["sales_revenue"]).metrics[0].blockers.map((entry) => entry.code)).toContain("canonical_source_hash_mismatch");
    const crossSource = preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources: [revenue, canonicalSource("cost-only", [["OrderID", "OrderDate", "TotalCost", "Currency"], ["O-1", "2026-01-01", 5, "USD"], ["O-2", "2026-01-02", 10, "USD"]], { OrderID: "order", OrderDate: "time_period", TotalCost: "total_cost" })], metricIds: ["gross_profit"], evaluationContext: forbidden, expectedPolicyHash: governedMetricPolicyHash() });
    expect(crossSource.metrics[0].blockers.map((entry) => entry.code)).toContain("cross_source_metric_requires_governed_relationship");
    const noSources = preflightGovernedMetrics({ schemaVersion: "lightbi.governed-metric-preflight-input.v1", sources: [], evaluationContext: allowed, expectedPolicyHash: governedMetricPolicyHash() });
    expect(noSources.metrics.every((metric) => metric.state === "unknown" || metric.state === "blocked")).toBe(true);
    const attemptedOverride = structuredClone(revenue);
    const before = canonicalJson(attemptedOverride);
    preflight(attemptedOverride, ["sales_revenue"]);
    expect(canonicalJson(attemptedOverride)).toBe(before);
    expect(attemptedOverride.grain.signature.measureSafety.safeToAggregate).toBe(false);
    expect(GOVERNED_METRIC_DEFINITIONS_V1.every((metric) => metric.executionAuthorization === false)).toBe(true);
  });

  it("is deterministic, order-stable, fail-closed, and privacy safe", () => {
    const first = preflight(revenue, ["transaction_count", "sales_revenue"]);
    const second = preflight(revenue, ["sales_revenue", "transaction_count"]);
    expect(canonicalJson(first)).toBe(canonicalJson(second));
    expect(first.identity).toBe(second.identity);
    expect(JSON.stringify(first)).not.toContain("fixture");
    expect(JSON.stringify(first)).not.toContain("2026-01-01");
    expect(JSON.stringify(first)).not.toContain("/home/");
    expect(governedMetricPolicyHash({ a: 1, b: 2 })).toBe(governedMetricPolicyHash({ b: 2, a: 1 }));
    expect(governedMetricPolicyHash({ ...GOVERNED_METRIC_POLICY_V1, forbiddenInference: [] })).not.toBe(governedMetricPolicyHash());
    const duplicated = structuredClone(revenue);
    duplicated.semantic.columns[0].columnEvidence.push(...duplicated.semantic.columns[0].columnEvidence);
    const duplicatedResult = preflight(duplicated, ["sales_revenue"]);
    expect(duplicatedResult.metrics[0].state).toBe(first.metrics.find((metric) => metric.metricId === "sales_revenue")?.state);
    expect(duplicatedResult.metrics[0].blockers).toEqual(first.metrics.find((metric) => metric.metricId === "sales_revenue")?.blockers);
  });
});
