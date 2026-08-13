import { describe, expect, it } from "vitest";
import { preflightGovernedRuntimeAction } from "./governed-runtime-preflight";
import { createGovernedRuntimeFixture, RUNTIME_FIXTURES } from "./governed-runtime-test-support";

describe("Phase 7R2 advertised action and runtime preflight alignment", () => {
  it("advertises an identity-bound count action only when runtime preflight permits it", () => {
    const fixture = RUNTIME_FIXTURES.transaction();

    expect(fixture.actionCandidate?.questionId).toBe("commerce.transaction_count.summary");
    expect(fixture.questionGeneration.defaultQuestions.some((question) => question.questionId === fixture.actionCandidate?.questionId)).toBe(true);

    const runtime = preflightGovernedRuntimeAction(fixture.runtimeInput);
    expect(["executable", "conditionally_executable"]).toContain(runtime.state);
    expect(runtime.blockers).toEqual([]);
  });

  it("keeps a runtime-blocked count question as explanation-only with exact remediation", () => {
    const fixture = createGovernedRuntimeFixture({
      id: "phase7r2-transaction-without-grain-identity",
      metricId: "transaction_count",
      questionId: "commerce.transaction_count.summary",
      columns: [
        { physical: "OrderID", semantic: "order" },
        { physical: "Revenue", semantic: "revenue", type: "number" },
      ],
      rows: [
        { OrderID: "O-1", Revenue: 100 },
        { OrderID: "O-2", Revenue: 75 },
      ],
      identityIds: [],
    });
    const question = fixture.questionGeneration.candidateQuestions.find((item) => item.questionId === "commerce.transaction_count.summary");

    expect(fixture.actionCandidate).toBeNull();
    expect(question).toMatchObject({
      questionState: "blocked",
      actionCandidateId: null,
      advertisedAsDefault: false,
      rank: null,
    });
    expect(question?.blockers).toContainEqual(expect.objectContaining({
      code: "governed_identity_semantics_not_bound_to_grain",
      source: "runtime_preflight",
    }));
    expect(question?.limitations.map((item) => item.code)).toContain("runtime_preflight_blocked_explanation_only");
    expect(question?.remediation).toContain("satisfy_runtime_preflight:governed_identity_semantics_not_bound_to_grain");
    expect(fixture.questionGeneration.blockedQuestions.some((item) => item.questionId === question?.questionId)).toBe(true);
    expect(fixture.questionGeneration.defaultQuestions.some((item) => item.questionId === question?.questionId)).toBe(false);
  });

  it("keeps every advertised default backed by the retained runnable action set", () => {
    const fixtures = [
      RUNTIME_FIXTURES.revenue(),
      RUNTIME_FIXTURES.quantity(),
      RUNTIME_FIXTURES.transaction(),
      RUNTIME_FIXTURES.inventory(),
      RUNTIME_FIXTURES.delivery(),
      RUNTIME_FIXTURES.profit(),
    ];

    for (const fixture of fixtures) {
      const actionQuestionIds = new Set(fixture.questionGeneration.actionCandidates.map((action) => action.questionId));
      expect(fixture.questionGeneration.defaultQuestions.length).toBeGreaterThan(0);
      expect(fixture.questionGeneration.defaultQuestions.every((question) => actionQuestionIds.has(question.questionId))).toBe(true);
      expect(fixture.questionGeneration.defaultQuestions.length).toBeLessThanOrEqual(5);
    }
  });
});
