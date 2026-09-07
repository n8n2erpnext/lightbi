import { recordMicroBrainObservation } from './app-usage-telemetry';
export type MicroBrainConsent = "unset" | "allowed" | "declined";

export type MicroBrainLearningState = {
  schemaVersion: "lightbi.micro-brain.local-learning.v1";
  consent: MicroBrainConsent;
  learningEnabled: boolean;
  decidedAt: string | null;
  evidence: {
    retrievals: number;
    candidateHits: number;
    abstentions: number;
    lastActivityAt: string | null;
  };
};

export type MicroBrainRuntimeState = {
  retrievals: number;
  candidateHits: number;
  abstentions: number;
  lastActivityAt: string | null;
};

export type MicroBrainLearningEvidenceSnapshot = { retrievals:number; candidateHits:number; abstentions:number; capturedAt:string };

const STORAGE_KEY = "lightbi.micro-brain.local-learning.v1";
const EVENT = "lightbi-micro-brain-state";
const EMPTY_EVIDENCE = { retrievals: 0, candidateHits: 0, abstentions: 0, lastActivityAt: null } as const;
let runtimeState: MicroBrainRuntimeState = { ...EMPTY_EVIDENCE };

function emptyState(): MicroBrainLearningState {
  return { schemaVersion: "lightbi.micro-brain.local-learning.v1", consent: "unset", learningEnabled: false, decidedAt: null, evidence: { ...EMPTY_EVIDENCE } };
}

function safeStorage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}

export function readMicroBrainLearningState(): MicroBrainLearningState {
  const storage = safeStorage();
  if (!storage) return emptyState();
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "null") as Partial<MicroBrainLearningState> | null;
    if (!parsed || parsed.schemaVersion !== "lightbi.micro-brain.local-learning.v1") return emptyState();
    const consent: MicroBrainConsent = parsed.consent === "allowed" || parsed.consent === "declined" ? parsed.consent : "unset";
    const evidence = parsed.evidence || EMPTY_EVIDENCE;
    return {
      schemaVersion: "lightbi.micro-brain.local-learning.v1",
      consent,
      learningEnabled: consent === "allowed" && parsed.learningEnabled === true,
      decidedAt: typeof parsed.decidedAt === "string" ? parsed.decidedAt : null,
      evidence: {
        retrievals: Math.max(0, Number(evidence.retrievals) || 0),
        candidateHits: Math.max(0, Number(evidence.candidateHits) || 0),
        abstentions: Math.max(0, Number(evidence.abstentions) || 0),
        lastActivityAt: typeof evidence.lastActivityAt === "string" ? evidence.lastActivityAt : null,
      },
    };
  } catch { return emptyState(); }
}

function write(state: MicroBrainLearningState): void {
  try { safeStorage()?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function decideMicroBrainLearning(allowed: boolean): void {
  const state = readMicroBrainLearningState();
  write({ ...state, consent: allowed ? "allowed" : "declined", learningEnabled: allowed, decidedAt: new Date().toISOString() });
}

export function setMicroBrainLearningEnabled(enabled: boolean): void {
  const state = readMicroBrainLearningState();
  write({ ...state, consent: enabled ? "allowed" : state.consent === "unset" ? "declined" : state.consent, learningEnabled: enabled, decidedAt: state.decidedAt || new Date().toISOString() });
}

export function clearMicroBrainLearningMemory(): void {
  const state = readMicroBrainLearningState();
  write({ ...state, evidence: { ...EMPTY_EVIDENCE } });
}

export function recordMicroBrainRuntimeActivity(hitCount: number): void {
  const now = new Date().toISOString();
  runtimeState = {
    retrievals: runtimeState.retrievals + 1,
    candidateHits: runtimeState.candidateHits + Math.max(0, hitCount),
    abstentions: runtimeState.abstentions + (hitCount === 0 ? 1 : 0),
    lastActivityAt: now,
  };
  const state = readMicroBrainLearningState();
  if (state.learningEnabled) {
    recordMicroBrainObservation(hitCount);
    write({ ...state, evidence: {
      retrievals: state.evidence.retrievals + 1,
      candidateHits: state.evidence.candidateHits + Math.max(0, hitCount),
      abstentions: state.evidence.abstentions + (hitCount === 0 ? 1 : 0),
      lastActivityAt: now,
    }});
  } else if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function readMicroBrainRuntimeState(): MicroBrainRuntimeState { return { ...runtimeState }; }
export function snapshotMicroBrainLearningEvidence(): MicroBrainLearningEvidenceSnapshot {
  const evidence = readMicroBrainLearningState().evidence;
  return { retrievals:evidence.retrievals, candidateHits:evidence.candidateHits, abstentions:evidence.abstentions, capturedAt:new Date().toISOString() };
}
export function consumeMicroBrainLearningEvidence(snapshot: MicroBrainLearningEvidenceSnapshot): void {
  const state = readMicroBrainLearningState();
  write({ ...state, evidence: {
    retrievals: Math.max(0, state.evidence.retrievals - Math.max(0, snapshot.retrievals)),
    candidateHits: Math.max(0, state.evidence.candidateHits - Math.max(0, snapshot.candidateHits)),
    abstentions: Math.max(0, state.evidence.abstentions - Math.max(0, snapshot.abstentions)),
    lastActivityAt: state.evidence.lastActivityAt,
  }});
}
export function microBrainLearningMemoryBytes(): number {
  const state = readMicroBrainLearningState();
  return new TextEncoder().encode(JSON.stringify(state.evidence)).byteLength;
}
export function subscribeMicroBrainState(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener("storage", listener); };
}
