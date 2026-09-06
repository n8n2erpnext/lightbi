import { describe, expect, it } from "vitest";
import { evaluateMicroBrainHealth } from "./health";

describe("Micro Brain deterministic health contract", () => {
  it("reports the accepted semantic and presentation lobes healthy without granting authority", () => {
    const health = evaluateMicroBrainHealth();
    expect(health.status).toBe("healthy");
    expect(health.semanticIdentity).toBeTruthy();
    expect(health.presentationIdentity).toBeTruthy();
    expect(health.semanticIdentity).not.toBe(health.presentationIdentity);
    expect(health.bundledFootprintBytes).toBeLessThanOrEqual(health.bundledCeilingBytes);
    expect(health.checks.every((item) => item.ok)).toBe(true);
    expect(health.checks.find((item) => item.id === "presentation_authority")?.detail).toContain("advisory-only");
  });

  it("never exposes a confidence or decision-authority health claim", () => {
    const serialized = JSON.stringify(evaluateMicroBrainHealth());
    expect(serialized).not.toContain("semanticConfidence");
    expect(serialized).not.toContain("metricAuthorized");
    expect(serialized).not.toContain("decisionAuthorized");
  });
});
