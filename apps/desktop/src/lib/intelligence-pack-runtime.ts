import type { CompiledMicroBrainIndexV1 } from './understanding-core/micro-brain/contracts';
import { MICRO_BRAIN_INDEX_SCHEMA_VERSION } from './understanding-core/micro-brain/contracts';
import { validateCompiledMicroBrainIndex } from './understanding-core/micro-brain/index-loader';
import {
  clearActiveMicroBrainPack,
  installActiveMicroBrainPack,
  type ActiveMicroBrainPackIdentityV1,
} from './understanding-core/micro-brain/built-in-index';
import { SEMANTIC_REGISTRY_SCHEMA_VERSION, SEMANTIC_SIGNAL_REGISTRY_V1 } from './semantic-registry';
import { isNativeLightBI } from './native-runtime';

export const INTELLIGENCE_PACK_SCHEMA_VERSION = 'lightbi.intelligence-pack.v1' as const;
export const INTELLIGENCE_PACK_CATALOG_SCHEMA_VERSION = 'lightbi.intelligence-pack-catalog.v1' as const;
export const INTELLIGENCE_PACK_FEATURE_CONTRACTS = [
  'evidence_bound_analysis_authority_v1',
  'micro_brain_index_v1',
] as const;

export type IntelligencePackCatalogEntryV1 = {
  packVersion: string;
  createdAt: string;
  url: string;
  envelopeSha256: string;
  payloadSha256: string;
  signingKeyId: string;
  payloadSchemaVersion: typeof MICRO_BRAIN_INDEX_SCHEMA_VERSION;
  registrySchemaVersion: typeof SEMANTIC_REGISTRY_SCHEMA_VERSION;
  minCoreVersion: string;
  maxCoreVersionExclusive: string;
};

export type IntelligencePackCatalogV1 = {
  schemaVersion: typeof INTELLIGENCE_PACK_CATALOG_SCHEMA_VERSION;
  latest: IntelligencePackCatalogEntryV1 | null;
};

export type NativeIntelligencePackRuntimeV1 = {
  source: 'active' | 'previous' | 'bundled';
  packVersion: string | null;
  payloadSha256: string | null;
  signingKeyId: string | null;
  payloadJson: string | null;
  repaired: boolean;
  limitation: string | null;
  previousPackVersion: string | null;
  trustAuthority: string;
};

export type PreparedNativeIntelligencePackV1 = {
  packVersion: string;
  objectSha256: string;
  payloadSha256: string;
  signingKeyId: string;
  payloadJson: string;
  ready: boolean;
};

export type IntelligencePackPayloadValidationV1 = {
  valid: boolean;
  errors: string[];
  index: CompiledMicroBrainIndexV1 | null;
};

export function validateIntelligencePackPayload(payloadJson: string): IntelligencePackPayloadValidationV1 {
  let index: CompiledMicroBrainIndexV1;
  try {
    index = JSON.parse(payloadJson) as CompiledMicroBrainIndexV1;
  } catch {
    return { valid: false, errors: ['payload_json_invalid'], index: null };
  }
  const structural = validateCompiledMicroBrainIndex(index);
  const errors = [...structural.errors];
  if (index.manifest.schemaVersion !== MICRO_BRAIN_INDEX_SCHEMA_VERSION) errors.push('brain_schema_incompatible');
  const registryIds = new Set(SEMANTIC_SIGNAL_REGISTRY_V1.map(signal => signal.canonicalId));
  const unknownBridges = index.cards
    .map(card => card.canonicalSignal)
    .filter((signal): signal is string => Boolean(signal) && !registryIds.has(signal!));
  if (unknownBridges.length > 0) errors.push('canonical_bridge_not_in_registry');
  return { valid: errors.length === 0, errors: [...new Set(errors)].sort(), index: errors.length === 0 ? index : null };
}

function identityFromRuntime(runtime: NativeIntelligencePackRuntimeV1): ActiveMicroBrainPackIdentityV1 | null {
  if (
    (runtime.source !== 'active' && runtime.source !== 'previous') ||
    !runtime.packVersion ||
    !runtime.payloadSha256 ||
    !runtime.signingKeyId
  ) return null;
  return {
    source: runtime.source,
    packVersion: runtime.packVersion,
    payloadSha256: runtime.payloadSha256,
    signingKeyId: runtime.signingKeyId,
  };
}

export function applyVerifiedRuntimePack(runtime: NativeIntelligencePackRuntimeV1): IntelligencePackPayloadValidationV1 {
  const identity = identityFromRuntime(runtime);
  if (!identity || !runtime.payloadJson) {
    clearActiveMicroBrainPack();
    return { valid: true, errors: [], index: null };
  }
  const validation = validateIntelligencePackPayload(runtime.payloadJson);
  if (!validation.valid || !validation.index) {
    clearActiveMicroBrainPack();
    return validation;
  }
  installActiveMicroBrainPack(validation.index, identity);
  return validation;
}

export async function loadNativeIntelligencePack(): Promise<NativeIntelligencePackRuntimeV1> {
  if (!isNativeLightBI()) {
    clearActiveMicroBrainPack();
    return {
      source: 'bundled', packVersion: null, payloadSha256: null, signingKeyId: null,
      payloadJson: null, repaired: false, limitation: null, previousPackVersion: null, trustAuthority: 'bundled',
    };
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<NativeIntelligencePackRuntimeV1>('load_intelligence_pack');
}

export async function bootstrapIntelligencePackRuntime(): Promise<NativeIntelligencePackRuntimeV1> {
  const runtime = await loadNativeIntelligencePack();
  const validation = applyVerifiedRuntimePack(runtime);
  if (!validation.valid) {
    throw new Error(`INTELLIGENCE_PACK_FRONTEND_VALIDATION_FAILED:${validation.errors.join(',')}`);
  }
  return runtime;
}
