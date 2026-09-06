import foundationIndexRaw from "./compiled/foundation.index.v1.json?raw";
import presentationIndexRaw from "./compiled/presentation.index.v1.json?raw";
import type { CompiledMicroBrainIndexV1 } from "./contracts";
import { validateCompiledMicroBrainIndex } from "./index-loader";

export type ActiveMicroBrainPackIdentityV1 = {
  packVersion: string;
  payloadSha256: string;
  signingKeyId: string;
  source: "active" | "previous";
};

let cachedBuiltInIndex: CompiledMicroBrainIndexV1 | null = null;
let cachedPresentationIndex: CompiledMicroBrainIndexV1 | null = null;
let activePack: { index: CompiledMicroBrainIndexV1; identity: ActiveMicroBrainPackIdentityV1 } | null = null;

function getBundledIndex(): CompiledMicroBrainIndexV1 {
  if (cachedBuiltInIndex) return cachedBuiltInIndex;
  const parsed = JSON.parse(foundationIndexRaw) as CompiledMicroBrainIndexV1;
  const validation = validateCompiledMicroBrainIndex(parsed);
  if (!validation.valid) {
    throw new Error(`MICRO_BRAIN_INDEX_INVALID:${validation.errors.join(",")}`);
  }
  cachedBuiltInIndex = parsed;
  return cachedBuiltInIndex;
}

function getBundledPresentationIndex(): CompiledMicroBrainIndexV1 {
  if (cachedPresentationIndex) return cachedPresentationIndex;
  const parsed = JSON.parse(presentationIndexRaw) as CompiledMicroBrainIndexV1;
  const validation = validateCompiledMicroBrainIndex(parsed);
  if (!validation.valid) {
    throw new Error(`MICRO_BRAIN_PRESENTATION_INDEX_INVALID:${validation.errors.join(",")}`);
  }
  cachedPresentationIndex = parsed;
  return cachedPresentationIndex;
}

export function installActiveMicroBrainPack(
  index: CompiledMicroBrainIndexV1,
  identity: ActiveMicroBrainPackIdentityV1,
): void {
  const validation = validateCompiledMicroBrainIndex(index);
  if (!validation.valid) {
    throw new Error(`MICRO_BRAIN_PACK_INDEX_INVALID:${validation.errors.join(",")}`);
  }
  activePack = { index, identity };
}

export function clearActiveMicroBrainPack(): void {
  activePack = null;
}

export function getActiveMicroBrainPackIdentity(): ActiveMicroBrainPackIdentityV1 | null {
  return activePack?.identity ?? null;
}

export function getBuiltInMicroBrainIndex(): CompiledMicroBrainIndexV1 {
  return activePack?.index ?? getBundledIndex();
}

export function getBuiltInMicroBrainPresentationIndex(): CompiledMicroBrainIndexV1 {
  return getBundledPresentationIndex();
}

export function bundledMicroBrainIndexIdentity(): string {
  const index = getBundledIndex();
  return index.manifest.logicalIndexSha256 ?? index.manifest.corpusSha256;
}

export function builtInMicroBrainIndexIdentity(): string {
  const index = getBuiltInMicroBrainIndex();
  return index.manifest.logicalIndexSha256 ?? index.manifest.corpusSha256;
}

export function builtInMicroBrainPresentationIndexIdentity(): string {
  const index = getBundledPresentationIndex();
  return index.manifest.logicalIndexSha256 ?? index.manifest.corpusSha256;
}

export function microBrainBundledIndexFootprint(): { semanticBytes: number; presentationBytes: number; totalBytes: number; ceilingBytes: number } {
  const encoder = new TextEncoder();
  const semanticBytes = encoder.encode(foundationIndexRaw).byteLength;
  const presentationBytes = encoder.encode(presentationIndexRaw).byteLength;
  return { semanticBytes, presentationBytes, totalBytes: semanticBytes + presentationBytes, ceilingBytes: 20 * 1024 * 1024 };
}
