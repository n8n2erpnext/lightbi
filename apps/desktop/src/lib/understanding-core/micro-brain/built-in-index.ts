import foundationIndexRaw from "./compiled/foundation.index.v1.json?raw";
import type { CompiledMicroBrainIndexV1 } from "./contracts";
import { validateCompiledMicroBrainIndex } from "./index-loader";

let cachedIndex: CompiledMicroBrainIndexV1 | null = null;

export function getBuiltInMicroBrainIndex(): CompiledMicroBrainIndexV1 {
  if (cachedIndex) return cachedIndex;
  const parsed = JSON.parse(foundationIndexRaw) as CompiledMicroBrainIndexV1;
  const validation = validateCompiledMicroBrainIndex(parsed);
  if (!validation.valid) {
    throw new Error(`MICRO_BRAIN_INDEX_INVALID:${validation.errors.join(",")}`);
  }
  cachedIndex = parsed;
  return cachedIndex;
}

export function builtInMicroBrainIndexIdentity(): string {
  const index = getBuiltInMicroBrainIndex();
  return index.manifest.logicalIndexSha256 ?? index.manifest.corpusSha256;
}
