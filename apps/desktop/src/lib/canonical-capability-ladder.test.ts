import { describe, expect, it } from "vitest";
import { projectCanonicalDomainPerspectives } from "./canonical-source-candidate-projection";
import { getOrBuildCanonicalConsumerArtifact } from "./understanding-core/canonical-consumer-boundary";
import { projectCanonicalCapabilityLadder } from "./canonical-capability-ladder";

describe("canonical capability ladder", () => {
  it("keeps safe universal analysis available when a domain pack has no governed metric", () => {
    const columns = ["contact_date", "customer_id", "branch", "campaign", "duration", "status", "amount", "subscribed"];
    const rows = [
      { contact_date: "2026-01-01", customer_id: "C1", branch: "North", campaign: "A", duration: 30, status: "contacted", amount: 1200, subscribed: "yes" },
      { contact_date: "2026-01-02", customer_id: "C2", branch: "South", campaign: "B", duration: 10, status: "pending", amount: 900, subscribed: "no" },
      { contact_date: "2026-01-03", customer_id: "C3", branch: "North", campaign: "A", duration: 45, status: "converted", amount: 1500, subscribed: "yes" },
    ];
    const artifact = getOrBuildCanonicalConsumerArtifact({
      datasetId: "held-out-bank-campaign",
      sourceKind: "local_file",
      sourceLabel: "held-out.xlsx",
      columns,
      rows,
      sourceRowCount: rows.length,
    });
    const result = projectCanonicalCapabilityLadder(
      artifact,
      projectCanonicalDomainPerspectives(artifact),
      { sourceKind: "local_file", sourceLabel: "held-out.xlsx", fileNames: ["held-out.xlsx"], columns, rows, sourceRowCount: rows.length },
    );

    expect(result.understanding.availableActions.some((action) => action.id.startsWith("universal:"))).toBe(true);
    expect(result.understanding.recommendedQuestions.filter((question) => question.executionScope !== "not_supported").length).toBeGreaterThan(2);
    expect(result.perspectives.filter((perspective) => perspective.state === "governed_action_available").length).toBeGreaterThan(1);
    expect(result.perspectives.some((perspective) => perspective.perspectiveId === "customer")).toBe(true);
  });

  it("does not use filenames to activate capability", () => {
    const columns = ["event_date", "route", "driver", "delivery_status", "waiting_time"];
    const rows = [
      { event_date: "2026-02-01", route: "R1", driver: "D1", delivery_status: "late", waiting_time: 40 },
      { event_date: "2026-02-02", route: "R2", driver: "D2", delivery_status: "on time", waiting_time: 5 },
    ];
    const build = (sourceLabel: string) => {
      const artifact = getOrBuildCanonicalConsumerArtifact({ datasetId: sourceLabel, sourceKind: "local_file", sourceLabel, columns, rows, sourceRowCount: rows.length });
      return projectCanonicalCapabilityLadder(artifact, projectCanonicalDomainPerspectives(artifact), { sourceKind: "local_file", sourceLabel, columns, rows, sourceRowCount: rows.length });
    };
    const first = build("arbitrary-a.xlsx");
    const second = build("unrelated-b.csv");
    expect(first.understanding.availableActions.map((action) => action.label)).toEqual(second.understanding.availableActions.map((action) => action.label));
  });
});
