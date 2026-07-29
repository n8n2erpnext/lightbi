import { describe, expect, it } from "vitest";
import { questionActionPolicyHash } from "./commerce-distribution-question-policy";
import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import { generateGovernedCommerceQuestionsAndActions } from "./governed-question-action-generator";
import type { CanonicalMetricSourceV1, DomainActivationArtifactV1, GovernedMetricPreflightItemV1, GovernedMetricPreflightV1, GovernedMetricStateV1 } from "./governed-domain-metric-contracts";
import type { QuestionActionGenerationInputV1 } from "./governed-question-action-contracts";
import { governedMetricPolicyHash } from "./governed-metric-policy";

type SourceOptions = { semantics?: Array<{ id: string; index?: number; state?: "confirmed" | "probable" | "ambiguous" }>; temporalMode?: string; temporalState?: string; production?: boolean };

function source(options: SourceOptions = {}): CanonicalMetricSourceV1 {
  const semantics = options.semantics ?? [
    { id: "report_date" }, { id: "product" }, { id: "warehouse" }, { id: "delivery_status" },
    { id: "order" }, { id: "revenue" }, { id: "sold_qty" },
    { id: "shipment" }, { id: "stock_qty" }, { id: "total_cost" },
    { id: "currency" }, { id: "uom" },
  ];
  return {
    physical: {
      provenance: { sourceId: "canonical-source", sourceHash: { algorithm: "sha256", value: "phase5m2-source" } },
      sourceProfile: {
        columns: semantics.map((item, index) => ({
          sourceColumnIndex: item.index ?? index,
          physicalColumnName: item.id,
          nullCount: 0,
          parseEvidence: [{ parser: "numeric", attemptedCount: 1, successCount: 1, failureCount: 0, representativeFailures: [] }],
          technicalColumnEvidence: [],
        })),
      },
    },
    semantic: {
      sourceId: "canonical-source",
      columns: semantics.map((item, index) => ({
        sourceColumnIndex: item.index ?? index,
        finalState: item.state ?? "confirmed",
        physicalColumn: item.id,
        selectedCandidateId: (item.state ?? "confirmed") === "ambiguous" ? null : item.id,
        candidateTraces: (item.state ?? "confirmed") === "ambiguous" ? [{ candidateId: item.id }] : [],
      })),
      productionWiring: { executed: options.production ?? false },
    },
    grain: {
      signature: {
        structuralForm: { value: "line", state: "confirmed" },
        temporalMode: { value: options.temporalMode ?? "event", state: options.temporalState ?? "confirmed" },
        aggregationForm: { value: options.temporalMode === "snapshot" ? "snapshot_values" : "additive_measures", state: "confirmed" },
        identityBasis: { state: "confirmed", selectedCandidateIds: semantics.map((item) => item.id).filter((id) => ["order", "shipment", "product"].includes(id)) },
        measureSafety: { safeToAggregate: false, riskIds: [] },
      },
      productionWiring: { executed: options.production ?? false },
    },
    readiness: { productionWiring: { executed: options.production ?? false } },
  } as unknown as CanonicalMetricSourceV1;
}

function metric(metricId: string, state: GovernedMetricStateV1 = "ready", blockers: string[] = []): GovernedMetricPreflightItemV1 {
  return {
    metricId,
    metricVersion: "1.0.0",
    state,
    metricDefinitionAvailable: true,
    semanticRequirementsSatisfied: blockers.length === 0,
    grainCompatible: blockers.length === 0,
    operatorValid: true,
    timeCompatible: blockers.length === 0,
    unitCompatible: null,
    currencyCompatible: null,
    duplicateHandlingSatisfied: blockers.length === 0,
    relationshipRequirementsSatisfied: blockers.length === 0,
    selectedBindings: [],
    selectedIdentityCandidateId: null,
    currencyEvidenceIds: [], inventorySnapshotEvidenceIds: [],
    evidence: [],
    blockers: blockers.map((code) => ({ code, severity: "material", references: [] })),
    limitations: state === "conditionally_ready" ? [{ code: "basis_requires_confirmation", references: [] }] : [],
    remediation: blockers.map(() => ({ code: "confirm_missing_evidence", parameters: {} })),
    metricDefinitionAvailableFlag: true,
    metricPreflightExecuted: true,
    runtimeActionCreated: false,
    runtimeActionAuthorized: false,
    metricExecutionExecuted: false,
    decisionUseAuthorized: false,
    result: null,
    productionWiring: { executed: false },
  };
}

function preflight(metrics: GovernedMetricPreflightItemV1[]): GovernedMetricPreflightV1 {
  const canonicalMetrics = [...metrics].sort((a, b) => a.metricId.localeCompare(b.metricId));
  const base: Omit<GovernedMetricPreflightV1, "identity"> = {
    schemaVersion: "lightbi.governed-metric-preflight.v1",
    domainPackId: "commerce_distribution_mvp",
    policyVersion: "lightbi.governed-metric-policy.v1",
    policyHash: governedMetricPolicyHash(),
    sourceReferences: ["source:phase5m2-source"],
    tuningAllowed: true,
    metrics: canonicalMetrics,
    blockers: metrics.flatMap((item) => item.blockers),
    limitations: metrics.flatMap((item) => item.limitations),
    metricResultsProduced: false,
    runtimeActionCreated: false,
    runtimeActionAuthorized: false,
    metricExecutionExecuted: false,
    decisionUseAuthorized: false,
    productionWiring: { executed: false },
  };
  return {
    ...base,
    identity: deterministicPolicySha256({ policyHash: base.policyHash, sourceReferences: base.sourceReferences, tuningAllowed: base.tuningAllowed, metrics: base.metrics }),
  };
}

function activation(state: DomainActivationArtifactV1["state"] = "conditional"): DomainActivationArtifactV1 {
  return {
    schemaVersion: "lightbi.domain-activation.v1",
    packId: "commerce_distribution_mvp",
    packVersion: "1.0.0",
    manifestPolicyHash: "2d411107a2be1c39eb53eec11368a5813419257ec38ca4ca75e4b6e48251055f",
    identity: "activation-fixture-v1",
    state,
    concepts: [], blockers: [], limitations: [], tuningAllowed: true,
    canonicalArtifactsModified: false,
    questionGeneration: { executed: false }, actionGeneration: { executed: false }, productionWiring: { executed: false },
  };
}

function input(metrics: GovernedMetricPreflightItemV1[], canonicalSource = source()): QuestionActionGenerationInputV1 {
  return { schemaVersion: "lightbi.question-action-generation-input.v1", canonicalSource, domainActivation: activation(), metricPreflight: preflight(metrics), expectedQuestionPolicyHash: questionActionPolicyHash() };
}

function generated(metrics: GovernedMetricPreflightItemV1[], canonicalSource = source()) {
  return generateGovernedCommerceQuestionsAndActions(input(metrics, canonicalSource));
}

describe("Phase 5M2 governed commerce question and action generation", () => {
  it("generates the required positive governed question families", () => {
    const result = generated([
      metric("sales_revenue"), metric("quantity_sold"), metric("transaction_count"), metric("delivery_count"), metric("gross_profit", "conditionally_ready"),
    ]);
    expect(result.candidateQuestions.find((item) => item.questionId === "commerce.sales_revenue.over_time")?.questionState).toBe("ready");
    expect(result.candidateQuestions.find((item) => item.questionId === "commerce.sales_revenue.by_product")?.resolvedDimensions[0]?.semanticId).toBe("product");
    expect(result.candidateQuestions.some((item) => item.questionId === "commerce.quantity_sold.over_time" && item.actionCandidateId)).toBe(true);
    expect(result.candidateQuestions.some((item) => item.questionId === "commerce.transaction_count.summary" && item.actionCandidateId)).toBe(true);
    expect(result.candidateQuestions.some((item) => item.questionId === "commerce.delivery_count.summary" && item.actionCandidateId)).toBe(true);

    const inventory = generated([metric("inventory_on_hand")], source({ semantics: [{ id: "product" }, { id: "stock_qty" }, { id: "uom" }], temporalMode: "snapshot" }));
    expect(inventory.candidateQuestions.find((item) => item.questionId === "commerce.inventory_on_hand.as_of")?.actionCandidateId).toBeNull();
    expect(inventory.candidateQuestions.find((item) => item.questionId === "commerce.inventory_on_hand.as_of")?.questionState).toBe("blocked");
    expect(inventory.candidateQuestions.some((item) => item.questionId.includes("movement"))).toBe(false);
  });

  it("returns at most five deterministic defaults independent of input order", () => {
    const metrics = [metric("gross_profit", "conditionally_ready"), metric("delivery_count"), metric("transaction_count"), metric("quantity_sold"), metric("sales_revenue")];
    const first = generated(metrics);
    const reorderedSource = source({ semantics: [
      { id: "uom", index: 11 }, { id: "currency", index: 10 }, { id: "total_cost", index: 9 },
      { id: "stock_qty", index: 8 }, { id: "shipment", index: 7 }, { id: "sold_qty", index: 6 },
      { id: "revenue", index: 5 }, { id: "order", index: 4 }, { id: "delivery_status", index: 3 },
      { id: "warehouse", index: 2 }, { id: "product", index: 1 }, { id: "report_date", index: 0 },
    ] });
    const second = generated([...metrics].reverse(), reorderedSource);
    expect(first.defaultQuestions).toHaveLength(5);
    expect(first.defaultQuestions.map((item) => item.questionId)).toEqual(second.defaultQuestions.map((item) => item.questionId));
    expect(first.identity).toBe(second.identity);
    expect(first.defaultQuestions.every((item) => item.rank !== null && item.rank! <= 5)).toBe(true);
  });

  it("fails closed for blocked profit, unit-price revenue, missing identities, and missing time", () => {
    const profit = generated([metric("gross_profit", "blocked", ["missing_semantic_requirement:gross_profit_cost"])]);
    expect(profit.defaultQuestions.some((item) => item.metricId === "gross_profit")).toBe(false);
    expect(profit.actionCandidates.some((item) => item.metricId === "gross_profit")).toBe(false);
    expect(profit.blockedQuestions.find((item) => item.metricId === "gross_profit")?.blockers.map((item) => item.code)).toContain("missing_semantic_requirement:gross_profit_cost");

    const unitPrice = generated([metric("sales_revenue", "blocked", ["missing_semantic_requirement:revenue_amount"])], source({ semantics: [{ id: "unit_price" }, { id: "report_date" }] }));
    expect(unitPrice.defaultQuestions.some((item) => item.metricId === "sales_revenue")).toBe(false);

    const count = generated([metric("transaction_count", "blocked", ["governed_identity_required_for_count"])]);
    expect(count.actionCandidates.some((item) => item.metricId === "transaction_count")).toBe(false);

    const missingTime = generated([metric("sales_revenue")], source({ semantics: [{ id: "product" }] }));
    const trend = missingTime.candidateQuestions.find((item) => item.questionId === "commerce.sales_revenue.over_time")!;
    expect(trend.questionState).toBe("blocked");
    expect(trend.blockers.map((item) => item.code)).toContain("missing_compatible_time_dimension");
    expect(trend.actionCandidateId).toBeNull();
  });

  it("preserves snapshot, domain, alias, duplication, and state boundaries", () => {
    const snapshot = generated([metric("inventory_on_hand")], source({ semantics: [{ id: "product" }, { id: "stock_qty" }, { id: "uom" }], temporalMode: "snapshot" }));
    const inventory = snapshot.candidateQuestions.filter((item) => item.metricId === "inventory_on_hand");
    expect(inventory.every((item) => item.actionCandidateId === null)).toBe(true);
    expect(inventory.every((item) => item.prohibitedUses.includes("inventory_movement_claim"))).toBe(true);
    expect(inventory.some((item) => item.title.toLowerCase().includes("movement"))).toBe(false);

    const unsupportedInput = input([metric("sales_revenue")]);
    unsupportedInput.domainActivation = activation("unsupported");
    const unsupported = generateGovernedCommerceQuestionsAndActions(unsupportedInput);
    expect(unsupported.defaultQuestions).toEqual([]);
    expect(unsupported.actionCandidates).toEqual([]);
    expect(unsupported.blockers.map((item) => item.code)).toContain("domain_pack_not_usable:unsupported");

    const aliasOnly = generated([metric("sales_revenue")], source({ semantics: [{ id: "report_date" }, { id: "product", state: "ambiguous" }] }));
    expect(aliasOnly.candidateQuestions.find((item) => item.questionId === "commerce.sales_revenue.by_product")?.questionState).toBe("blocked");

    const duplicated = generated([metric("sales_revenue"), metric("sales_revenue")]);
    expect(new Set(duplicated.candidateQuestions.map((item) => item.governedIdentity)).size).toBe(duplicated.candidateQuestions.length);

    const conditional = generated([metric("sales_revenue", "conditionally_ready")]);
    expect(conditional.candidateQuestions.filter((item) => item.metricId === "sales_revenue").every((item) => item.questionState === "conditionally_ready")).toBe(true);
    const blocked = generated([metric("sales_revenue", "blocked", ["metric_grain_incompatible"])]);
    expect(blocked.candidateQuestions.filter((item) => item.metricId === "sales_revenue").every((item) => item.questionState === "blocked")).toBe(true);
  });

  it("never bypasses governed policy or creates execution authority", () => {
    const legacyLike = source({ semantics: [{ id: "margin" }, { id: "customer" }, { id: "report_date" }] });
    const noGovernedMetric = generated([], legacyLike);
    expect(noGovernedMetric.defaultQuestions).toEqual([]);
    expect(noGovernedMetric.candidateQuestions.every((item) => item.metricDefinitionAvailable)).toBe(true);
    expect(noGovernedMetric.candidateQuestions.every((item) => item.blockers.some((blocker) => blocker.code === "metric_preflight_result_missing"))).toBe(true);
    expect(noGovernedMetric.candidateQuestions.some((item) => ["margin", "retention", "churn", "ltv", "forecast"].some((word) => item.title.toLowerCase().includes(word)))).toBe(false);

    const result = generated([metric("sales_revenue"), metric("transaction_count")]);
    expect(result.runtimeActionCreated).toBe(false);
    expect(result.runtimeActionAuthorized).toBe(false);
    expect(result.executionPerformed).toBe(false);
    expect(result.productionWiring.executed).toBe(false);
    for (const item of [...result.candidateQuestions, ...result.actionCandidates]) {
      expect(item.runtimeActionCreated).toBe(false);
      expect(item.runtimeActionAuthorized).toBe(false);
      expect(item.executionPerformed).toBe(false);
      expect(item.productionWiring.executed).toBe(false);
    }
    expect(JSON.stringify(result)).not.toMatch(/SELECT\s|FROM\s|GROUP BY\s/i);
  });
});
