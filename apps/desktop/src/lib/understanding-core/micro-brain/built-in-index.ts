import foundationIndexRaw from "./compiled/foundation.index.v1.json?raw";
import type { CompiledMicroBrainIndexV1 } from "./contracts";
import { validateCompiledMicroBrainIndex } from "./index-loader";

export type ActiveMicroBrainPackIdentityV1 = {
  packVersion: string;
  payloadSha256: string;
  signingKeyId: string;
  source: "active" | "previous";
};

let cachedBuiltInIndex: CompiledMicroBrainIndexV1 | null = null;
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

export function bundledMicroBrainIndexIdentity(): string {
  const index = getBundledIndex();
  return index.manifest.logicalIndexSha256 ?? index.manifest.corpusSha256;
}

export function builtInMicroBrainIndexIdentity(): string {
  const index = getBuiltInMicroBrainIndex();
  return index.manifest.logicalIndexSha256 ?? index.manifest.corpusSha256;
}
