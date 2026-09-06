import {
  builtInMicroBrainIndexIdentity,
  builtInMicroBrainPresentationIndexIdentity,
  getActiveMicroBrainPackIdentity,
  getBuiltInMicroBrainIndex,
  getBuiltInMicroBrainPresentationIndex,
  microBrainBundledIndexFootprint,
} from "./built-in-index";
import { retrieveMicroBrainConcepts } from "./retrieval";
import { adviseMicroBrainPresentation } from "./presentation-advisor";

export type MicroBrainHealthStatus = "healthy" | "degraded" | "unavailable";
export type MicroBrainHealthCheckV1 = { id: string; ok: boolean; detail: string };
export type MicroBrainHealthV1 = {
  schemaVersion: "lightbi.micro-brain.health.v1";
  status: MicroBrainHealthStatus;
  checkedAt: string;
  semanticIdentity: string | null;
  presentationIdentity: string | null;
  activePackVersion: string | null;
  bundledFootprintBytes: number;
  bundledCeilingBytes: number;
  checks: MicroBrainHealthCheckV1[];
};

const HEALTH_SCHEMA = "lightbi.micro-brain.health.v1" as const;
let cachedHealth: MicroBrainHealthV1 | null = null;
function check(id: string, ok: boolean, detail: string): MicroBrainHealthCheckV1 {
  return { id, ok, detail };
}

function authorityFieldsAbsent(value: object): boolean {
  return !Object.prototype.hasOwnProperty.call(value, "confidence")
    && !Object.prototype.hasOwnProperty.call(value, "metricAuthorized")
    && !Object.prototype.hasOwnProperty.call(value, "domainSupport");
}

export function evaluateMicroBrainHealth(): MicroBrainHealthV1 {
  const checkedAt = new Date().toISOString();
  try {
    const semantic = getBuiltInMicroBrainIndex();
    const presentation = getBuiltInMicroBrainPresentationIndex();
    const semanticIdentity = builtInMicroBrainIndexIdentity();
    const presentationIdentity = builtInMicroBrainPresentationIndexIdentity();
    const activePack = getActiveMicroBrainPackIdentity();
    const footprint = microBrainBundledIndexFootprint();
    const presentationCards = presentation.cards.filter((card) => card.presentation);
    const charterCards = presentationCards.filter((card) => card.presentation?.advisoryKind === "self_charter");
    const semanticProbe = retrieveMicroBrainConcepts(semantic, {
      text: "cash on delivery COD collected on behalf of merchant",
      typedTags: ["kind:measure", "family:money", "type:number"],
      limit: 4,
    });
    const presentationProbe = adviseMicroBrainPresentation({
      domainId: "operations",
      perspectiveId: "performance",
      analyticalIntent: "ranking",
      availableRoles: ["dimension", "measure"],
      userQuestion: "compare operational performance across groups",
      limit: 4,
    });

    const checks = [
      check("semantic_index", semantic.manifest.cardCount > 0 && semantic.manifest.unitCount > 0, `${semantic.manifest.cardCount} cards · ${semantic.manifest.unitCount} units`),
      check("presentation_index", presentationCards.length > 0 && presentation.manifest.unitCount > 0, `${presentationCards.length} advisory cards · ${presentation.manifest.unitCount} units`),
      check("lobe_isolation", Boolean(semanticIdentity && presentationIdentity && semanticIdentity !== presentationIdentity), "semantic and presentation index identities are distinct"),
      check("presentation_authority", presentationCards.every((card) => card.knowledgeLane === "presentation" && card.presentation?.authority === "advisory_only"), "presentation knowledge is advisory-only"),
      check("constitutional_guard", charterCards.length > 0 && charterCards.some((card) => (card.presentation?.mustNot?.length ?? 0) > 0) && charterCards.some((card) => (card.presentation?.abstainWhen?.length ?? 0) > 0), `${charterCards.length} self-charter cards · ${charterCards.reduce((sum, card) => sum + (card.presentation?.mustNot?.length ?? 0), 0)} prohibitions · ${charterCards.reduce((sum, card) => sum + (card.presentation?.abstainWhen?.length ?? 0), 0)} abstention triggers`),
      check("semantic_retrieval", semanticProbe.hits.length > 0 && semanticProbe.hits.every(authorityFieldsAbsent), `${semanticProbe.hits.length} smoke candidates; no authority fields`),
      check("presentation_retrieval", presentationProbe.candidates.length > 0 && presentationProbe.candidates.every((candidate) => candidate.presentation.authority === "advisory_only"), `${presentationProbe.candidates.length} advisory smoke candidates`),
      check("bundled_footprint", footprint.totalBytes <= footprint.ceilingBytes, `${footprint.totalBytes} / ${footprint.ceilingBytes} bytes`),
    ];
    const criticalPassed = checks.every((item) => item.ok);
    return {
      schemaVersion: HEALTH_SCHEMA,
      status: criticalPassed ? "healthy" : "degraded",
      checkedAt,
      semanticIdentity,
      presentationIdentity,
      activePackVersion: activePack?.packVersion ?? null,
      bundledFootprintBytes: footprint.totalBytes,
      bundledCeilingBytes: footprint.ceilingBytes,
      checks,
    };
  } catch (error) {
    return {
      schemaVersion: HEALTH_SCHEMA,
      status: "unavailable",
      checkedAt,
      semanticIdentity: null,
      presentationIdentity: null,
      activePackVersion: null,
      bundledFootprintBytes: 0,
      bundledCeilingBytes: 20 * 1024 * 1024,
      checks: [check("runtime", false, error instanceof Error ? error.message : "micro_brain_health_failed")],
    };
  }
}

export function readMicroBrainHealth(force = false): MicroBrainHealthV1 {
  if (!cachedHealth || force) cachedHealth = evaluateMicroBrainHealth();
  return cachedHealth;
}
