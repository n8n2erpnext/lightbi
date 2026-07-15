import { describe, expect, it } from "vitest";
import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import { planGovernedMetricQuery } from "./governed-metric-query-planner";
import { preflightGovernedRuntimeAction } from "./governed-runtime-preflight";
import { governedRuntimePolicyHash } from "./governed-runtime-policy";
import { createGovernedRuntimeFixture, RUNTIME_FIXTURES } from "./governed-runtime-test-support";

function refreshUpstreamIdentities(fixture: ReturnType<typeof RUNTIME_FIXTURES.revenue>): void {
  fixture.metricPreflight.identity = deterministicPolicySha256({ policyHash: fixture.metricPreflight.policyHash, sourceReferences: fixture.metricPreflight.sourceReferences, tuningAllowed: fixture.metricPreflight.tuningAllowed, metrics: fixture.metricPreflight.metrics });
  fixture.questionGeneration.metricPreflightReference = fixture.metricPreflight.identity;
  fixture.questionGeneration.identity = deterministicPolicySha256({
    sourceRef: fixture.questionGeneration.canonicalSourceReference,
    domainActivationReference: fixture.questionGeneration.domainActivationReference,
    metricPreflightReference: fixture.questionGeneration.metricPreflightReference,
    policyHash: fixture.questionGeneration.questionPolicyHash,
    defaultQuestions: fixture.questionGeneration.defaultQuestions,
    candidateQuestions: fixture.questionGeneration.candidateQuestions,
    actionCandidates: fixture.questionGeneration.actionCandidates,
    blockers: fixture.questionGeneration.blockers,
  });
}

describe("Phase 5M3 governed runtime preflight and query planning", () => {
  it("creates deterministic plans for all six governed operators without silent fallbacks", () => {
    const fixtures = [RUNTIME_FIXTURES.revenue(), RUNTIME_FIXTURES.quantity(), RUNTIME_FIXTURES.transaction(), RUNTIME_FIXTURES.inventory(), RUNTIME_FIXTURES.delivery(), RUNTIME_FIXTURES.profit()];
    const expected = ["governed_sum", "governed_sum", "governed_identity_count", "governed_point_in_time_snapshot_sum", "governed_identity_count", "governed_revenue_minus_cost"];
    fixtures.forEach((fixture, index) => {
      expect(fixture.actionCandidate, fixture.id).not.toBeNull();
      const preflight = preflightGovernedRuntimeAction(fixture.runtimeInput);
      expect(preflight.state, fixture.id).toBe("executable");
      expect(preflight.action?.operator).toBe(expected[index]);
      expect(preflight.runtimeActionCreated).toBe(true);
      expect(preflight.runtimeActionAuthorized).toBe(true);
      expect(preflight.decisionUseAuthorized).toBe(false);
      const first = planGovernedMetricQuery(preflight);
      const second = planGovernedMetricQuery(preflight);
      expect(first.state, fixture.id).toBe("planned");
      expect(second).toEqual(first);
      if (first.state !== "planned") return;
      expect(first.plan.operator).toBe(expected[index]);
      expect(first.plan.sql).not.toMatch(/AVG\(|COUNT\(\*\)/);
      expect(first.plan.decisionUseAuthorized).toBe(false);
      expect(first.plan.productionWiring.executed).toBe(false);
    });
  });

  it("preserves conditional limitations and permits only policy-listed conditional metrics", () => {
    const fixture = createGovernedRuntimeFixture({
      id: "conditional-revenue", metricId: "sales_revenue", questionId: "commerce.sales_revenue.over_time", state: "conditionally_ready", limitations: ["currency_basis_not_explicit"],
      columns: [{ physical: "OrderID", semantic: "order" }, { physical: "OrderDate", semantic: "report_date" }, { physical: "Revenue", semantic: "revenue" }],
      rows: [{ OrderID: "O-1", OrderDate: "2026-01-01", Revenue: 10 }], currencyCompatible: null,
    });
    const result = preflightGovernedRuntimeAction(fixture.runtimeInput);
    expect(result.state).toBe("conditionally_executable");
    expect(result.restrictions.map((item) => item.code)).toContain("CONDITIONAL_EXECUTION_ONLY");
    expect(result.restrictions.map((item) => item.code)).toContain("METRIC_LIMITATION:currency_basis_not_explicit");
    expect(planGovernedMetricQuery(result).state).toBe("planned");

    const profit = RUNTIME_FIXTURES.profit();
    profit.metric.state = "conditionally_ready";
    profit.actionCandidate!.metricPreflightState = "conditionally_ready";
    refreshUpstreamIdentities(profit);
    const blocked = preflightGovernedRuntimeAction(profit.runtimeInput);
    expect(blocked.state).toBe("blocked");
  });

  it("binds only allowed canonical product and governed time dimensions", () => {
    const product = planGovernedMetricQuery(preflightGovernedRuntimeAction(RUNTIME_FIXTURES.quantity().runtimeInput));
    expect(product.state).toBe("planned");
    if (product.state === "planned") {
      expect(product.plan.groupingBindings.map((item) => item.semanticId)).toEqual(["product"]);
      expect(product.plan.sql).toContain('"product" AS "product"');
    }
    const time = planGovernedMetricQuery(preflightGovernedRuntimeAction(RUNTIME_FIXTURES.revenue().runtimeInput));
    expect(time.state).toBe("planned");
    if (time.state === "planned") {
      expect(time.plan.timeBinding?.semanticId).toBe("report_date");
      expect(time.plan.sql).toContain('"orderdate" AS "report_date"');
    }
  });

  it("covers the mandatory negative runtime and planning probes", () => {
    const automaticSum = preflightGovernedRuntimeAction(RUNTIME_FIXTURES.transaction().runtimeInput);
    automaticSum.action!.operator = "governed_sum";
    expect(planGovernedMetricQuery(automaticSum).blockers).toContain("runtime_preflight_identity_mismatch");

    const countFallback = preflightGovernedRuntimeAction(RUNTIME_FIXTURES.revenue().runtimeInput);
    countFallback.action!.operator = "governed_identity_count";
    expect(planGovernedMetricQuery(countFallback).state).toBe("blocked");

    const unitPrice = RUNTIME_FIXTURES.revenue();
    unitPrice.canonicalSource.semantic.columns.find((item) => item.selectedCandidateId === "revenue")!.selectedCandidateId = "unit_price";
    expect(preflightGovernedRuntimeAction(unitPrice.runtimeInput).blockers.map((item) => item.code)).toContain("runtime_binding_missing:revenue_amount");

    const snapshotQuantity = RUNTIME_FIXTURES.quantity();
    snapshotQuantity.canonicalSource.semantic.columns.find((item) => item.selectedCandidateId === "sold_qty")!.selectedCandidateId = "stock_qty";
    expect(preflightGovernedRuntimeAction(snapshotQuantity.runtimeInput).state).toBe("blocked");

    const crossTimeSnapshot = preflightGovernedRuntimeAction(RUNTIME_FIXTURES.inventory().runtimeInput);
    crossTimeSnapshot.action!.groupingBindings.push({ ...crossTimeSnapshot.action!.metricBindings[0], role: "dimension", semanticId: "time_period" });
    expect(planGovernedMetricQuery(crossTimeSnapshot).state).toBe("blocked");

    const repeated = RUNTIME_FIXTURES.revenue();
    repeated.metric.duplicateHandlingSatisfied = false;
    refreshUpstreamIdentities(repeated);
    expect(preflightGovernedRuntimeAction(repeated.runtimeInput).blockers.map((item) => item.code)).toContain("duplicate_or_repeated_total_handling_unproved");

    const noIdentity = RUNTIME_FIXTURES.transaction();
    noIdentity.canonicalSource.grain.signature.identityBasis.selectedCandidateIds = [];
    expect(preflightGovernedRuntimeAction(noIdentity.runtimeInput).blockers.map((item) => item.code)).toContain("governed_identity_semantics_not_bound_to_grain");

    const noCost = RUNTIME_FIXTURES.profit();
    noCost.canonicalSource.semantic.columns.find((item) => item.selectedCandidateId === "total_cost")!.selectedCandidateId = "opaque";
    expect(preflightGovernedRuntimeAction(noCost.runtimeInput).blockers.map((item) => item.code)).toContain("runtime_binding_missing:gross_profit_cost");

    const badCurrency = RUNTIME_FIXTURES.profit();
    badCurrency.metric.currencyCompatible = false;
    refreshUpstreamIdentities(badCurrency);
    expect(preflightGovernedRuntimeAction(badCurrency.runtimeInput).blockers.map((item) => item.code)).toContain("currency_incompatible");

    const badGrain = RUNTIME_FIXTURES.profit();
    badGrain.metric.grainCompatible = false;
    refreshUpstreamIdentities(badGrain);
    expect(preflightGovernedRuntimeAction(badGrain.runtimeInput).blockers.map((item) => item.code)).toContain("metric_preflight_compatibility_incomplete");

    const noAsOf = RUNTIME_FIXTURES.inventory();
    noAsOf.runtimeInput.asOfBasis = null;
    expect(preflightGovernedRuntimeAction(noAsOf.runtimeInput).blockers.map((item) => item.code)).toContain("inventory_as_of_basis_required");

    const promoted = RUNTIME_FIXTURES.revenue();
    promoted.metric.state = "blocked";
    promoted.metric.blockers.push({ code: "metric_grain_incompatible", severity: "critical", references: [] });
    refreshUpstreamIdentities(promoted);
    expect(preflightGovernedRuntimeAction(promoted.runtimeInput).state).toBe("blocked");

    const conditional = createGovernedRuntimeFixture({ id: "conditional-negative", metricId: "sales_revenue", questionId: "commerce.sales_revenue.over_time", state: "conditionally_ready", limitations: ["currency_basis_not_explicit"], columns: [{ physical: "OrderID", semantic: "order" }, { physical: "OrderDate", semantic: "report_date" }, { physical: "Revenue", semantic: "revenue" }], rows: [{ OrderID: "O-1", OrderDate: "2026-01-01", Revenue: 10 }] });
    const conditionalPreflight = preflightGovernedRuntimeAction(conditional.runtimeInput);
    conditionalPreflight.action!.restrictions = [];
    expect(planGovernedMetricQuery(conditionalPreflight).state).toBe("blocked");

    const textFixture = RUNTIME_FIXTURES.revenue();
    textFixture.actionCandidate!.title = "SELECT * FROM secret";
    expect(preflightGovernedRuntimeAction(textFixture.runtimeInput).state).toBe("invalid");

    const wrongOperator = preflightGovernedRuntimeAction(RUNTIME_FIXTURES.revenue().runtimeInput);
    wrongOperator.action!.operator = "governed_revenue_minus_cost";
    expect(planGovernedMetricQuery(wrongOperator).state).toBe("blocked");

    const grouping = preflightGovernedRuntimeAction(RUNTIME_FIXTURES.revenue().runtimeInput);
    grouping.action!.groupingBindings[0].semanticId = "customer";
    expect(planGovernedMetricQuery(grouping).state).toBe("blocked");

    const source = RUNTIME_FIXTURES.revenue();
    source.questionGeneration.canonicalSourceReference = "source:wrong";
    expect(preflightGovernedRuntimeAction(source.runtimeInput).blockers.map((item) => item.code)).toContain("invalid_canonical_source_binding");

    const policy = RUNTIME_FIXTURES.revenue();
    policy.runtimeInput.expectedRuntimePolicyHash = governedRuntimePolicyHash({ changed: true });
    expect(preflightGovernedRuntimeAction(policy.runtimeInput).blockers.map((item) => item.code)).toContain("runtime_policy_hash_mismatch");

    const explanation = RUNTIME_FIXTURES.revenue();
    explanation.runtimeInput.actionCandidate = null;
    expect(preflightGovernedRuntimeAction(explanation.runtimeInput).state).toBe("unavailable");

    const production = RUNTIME_FIXTURES.revenue();
    (production.actionCandidate!.productionWiring as { executed: boolean }).executed = true;
    expect(preflightGovernedRuntimeAction(production.runtimeInput).state).toBe("invalid");
  });
});
