// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearMicroBrainLearningMemory,
  consumeMicroBrainLearningEvidence,
  decideMicroBrainLearning,
  microBrainLearningMemoryBytes,
  readMicroBrainLearningState,
  readMicroBrainRuntimeState,
  recordMicroBrainRuntimeActivity,
  setMicroBrainLearningEnabled,
  snapshotMicroBrainLearningEvidence,
  withdrawMicroBrainLearningConsent,
} from "./micro-brain-privacy";

describe("Micro Brain local learning consent", () => {
  beforeEach(() => localStorage.clear());

  it("starts opt-in unset and does not persist retrieval evidence before consent", () => {
    expect(readMicroBrainLearningState()).toMatchObject({ consent: "unset", learningEnabled: false });
    const before = readMicroBrainRuntimeState().retrievals;
    recordMicroBrainRuntimeActivity(3);
    expect(readMicroBrainRuntimeState().retrievals).toBe(before + 1);
    expect(readMicroBrainLearningState().evidence.retrievals).toBe(0);
  });

  it("persists only sanitized counters after explicit allow and can be paused", () => {
    decideMicroBrainLearning(true);
    recordMicroBrainRuntimeActivity(2);
    recordMicroBrainRuntimeActivity(0);
    expect(readMicroBrainLearningState()).toMatchObject({ consent: "allowed", learningEnabled: true, evidence: { retrievals: 2, candidateHits: 2, abstentions: 1 } });
    expect(microBrainLearningMemoryBytes()).toBeGreaterThan(0);
    setMicroBrainLearningEnabled(false);
    recordMicroBrainRuntimeActivity(7);
    expect(readMicroBrainLearningState().evidence.retrievals).toBe(2);
  });


  it("explicit consent withdrawal clears retained local learning evidence and records declined consent", () => {
    decideMicroBrainLearning(true);
    recordMicroBrainRuntimeActivity(0);
    expect(readMicroBrainLearningState().evidence.retrievals).toBe(1);
    withdrawMicroBrainLearningConsent();
    expect(readMicroBrainLearningState()).toMatchObject({ consent: "declined", learningEnabled: false, evidence: { retrievals: 0, candidateHits: 0, abstentions: 0, lastActivityAt: null } });
  });

  it("clears local learning memory without changing the user's consent choice", () => {
    decideMicroBrainLearning(true);
    recordMicroBrainRuntimeActivity(1);
    clearMicroBrainLearningMemory();
    expect(readMicroBrainLearningState()).toMatchObject({ consent: "allowed", learningEnabled: true, evidence: { retrievals: 0, candidateHits: 0, abstentions: 0, lastActivityAt: null } });
  });
});

it("consumes only the accepted snapshot and preserves learning events that arrived during upload", () => {
  decideMicroBrainLearning(true);
  recordMicroBrainRuntimeActivity(0);
  const snapshot = snapshotMicroBrainLearningEvidence();
  recordMicroBrainRuntimeActivity(0);
  consumeMicroBrainLearningEvidence(snapshot);
  expect(readMicroBrainLearningState().evidence).toMatchObject({ retrievals: 1, abstentions: 1 });
});
