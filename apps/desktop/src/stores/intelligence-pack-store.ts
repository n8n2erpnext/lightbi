import { create } from 'zustand';
import { lightBIDistributionEndpoint } from '../lib/distribution-pairing';
import { externalFetch } from '../lib/native-capabilities';
import { isNativeLightBI } from '../lib/native-runtime';
import {
  applyVerifiedRuntimePack,
  bootstrapIntelligencePackRuntime,
  INTELLIGENCE_PACK_CATALOG_SCHEMA_VERSION,
  type IntelligencePackCatalogEntryV1,
  type IntelligencePackCatalogV1,
  type NativeIntelligencePackRuntimeV1,
  type PreparedNativeIntelligencePackV1,
  validateIntelligencePackPayload,
} from '../lib/intelligence-pack-runtime';
import { getActiveMicroBrainPackIdentity } from '../lib/understanding-core/micro-brain/built-in-index';

export type IntelligencePackUpdateStatus =
  | 'bundled'
  | 'active'
  | 'checking'
  | 'up_to_date'
  | 'available'
  | 'preparing'
  | 'activating'
  | 'failed';

type IntelligencePackStore = {
  status: IntelligencePackUpdateStatus;
  runtime: NativeIntelligencePackRuntimeV1 | null;
  latest: IntelligencePackCatalogEntryV1 | null;
  error: string;
  checkedAt: number | null;
  bootstrap: () => Promise<void>;
  check: (force?: boolean) => Promise<void>;
  update: () => Promise<void>;
  rollback: () => Promise<void>;
};

let checkPromise: Promise<void> | null = null;
let updatePromise: Promise<void> | null = null;

function compareVersions(left: string, right: string): number {
  const parse = (value: string) => {
    const [core, pre = ''] = value.replace(/^v/, '').split('-', 2);
    return { core: core.split('.').map(part => Number(part) || 0), pre };
  };
  const a = parse(left), b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    if ((a.core[index] ?? 0) !== (b.core[index] ?? 0)) return (a.core[index] ?? 0) > (b.core[index] ?? 0) ? 1 : -1;
  }
  if (a.pre === b.pre) return 0;
  if (!a.pre) return 1;
  if (!b.pre) return -1;
  return a.pre.localeCompare(b.pre, undefined, { numeric: true });
}

async function latestCatalog(force: boolean): Promise<IntelligencePackCatalogV1> {
  const endpoint = lightBIDistributionEndpoint();
  const response = await externalFetch(`${endpoint}/api/intelligence-packs/latest${force ? '?refresh=1' : ''}`, { cache: force ? 'no-store' : 'default' });
  if (response.status === 404) return { schemaVersion: INTELLIGENCE_PACK_CATALOG_SCHEMA_VERSION, latest: null };
  if (!response.ok) throw new Error(`Intelligence Pack service unavailable (HTTP ${response.status}).`);
  const catalog = await response.json() as IntelligencePackCatalogV1;
  if (catalog.schemaVersion !== INTELLIGENCE_PACK_CATALOG_SCHEMA_VERSION) throw new Error('Intelligence Pack catalog schema is invalid.');
  return catalog;
}

export const useIntelligencePackStore = create<IntelligencePackStore>((set, get) => ({
  status: 'bundled', runtime: null, latest: null, error: '', checkedAt: null,
  bootstrap: async () => {
    if (!isNativeLightBI()) return;
    try {
      const runtime = await bootstrapIntelligencePackRuntime();
      set({ runtime, status: runtime.source === 'bundled' ? 'bundled' : 'active', error: '' });
    } catch (cause) {
      set({ status: 'failed', error: cause instanceof Error ? cause.message : 'Intelligence Pack bootstrap failed.' });
    }
  },
  check: (force = false) => {
    if (!isNativeLightBI()) return Promise.resolve();
    if (checkPromise) return checkPromise;
    if (!force && get().checkedAt && Date.now() - get().checkedAt! < 6 * 60 * 60 * 1000) return Promise.resolve();
    checkPromise = (async () => {
      set({ status: 'checking', error: '' });
      try {
        const catalog = await latestCatalog(force);
        const current = getActiveMicroBrainPackIdentity();
        if (!catalog.latest) {
          set({ latest: null, status: current ? 'active' : 'bundled', checkedAt: Date.now() });
          return;
        }
        const newer = !current || compareVersions(catalog.latest.packVersion, current.packVersion) > 0;
        set({ latest: catalog.latest, status: newer ? 'available' : 'up_to_date', checkedAt: Date.now() });
      } catch (cause) {
        set({ status: 'failed', error: cause instanceof Error ? cause.message : 'Intelligence Pack check failed.', checkedAt: Date.now() });
      } finally {
        checkPromise = null;
      }
    })();
    return checkPromise;
  },
  update: () => {
    if (updatePromise) return updatePromise;
    const latest = get().latest;
    if (!latest || !isNativeLightBI()) return Promise.resolve();
    updatePromise = (async () => {
      set({ status: 'preparing', error: '' });
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const prepared = await invoke<PreparedNativeIntelligencePackV1>('prepare_intelligence_pack_update', {
          url: latest.url,
          envelopeSha256: latest.envelopeSha256,
        });
        if (!prepared.ready) throw new Error('Intelligence Pack could not be staged safely.');
        const validation = validateIntelligencePackPayload(prepared.payloadJson);
        if (!validation.valid) throw new Error(`Intelligence Pack semantic smoke validation failed: ${validation.errors.join(', ')}`);
        set({ status: 'activating' });
        await invoke('activate_intelligence_pack');
        const runtime = await bootstrapIntelligencePackRuntime();
        set({ runtime, status: 'active', error: '' });
      } catch (cause) {
        set({ status: 'failed', error: cause instanceof Error ? cause.message : 'Intelligence Pack update failed.' });
      } finally {
        updatePromise = null;
      }
    })();
    return updatePromise;
  },
  rollback: async () => {
    if (!isNativeLightBI()) return;
    set({ status: 'activating', error: '' });
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const runtime = await invoke<NativeIntelligencePackRuntimeV1>('rollback_intelligence_pack');
      const validation = applyVerifiedRuntimePack(runtime);
      if (!validation.valid) throw new Error(`Rolled-back pack failed frontend validation: ${validation.errors.join(', ')}`);
      set({ runtime, status: runtime.source === 'bundled' ? 'bundled' : 'active', error: '' });
    } catch (cause) {
      set({ status: 'failed', error: cause instanceof Error ? cause.message : 'Intelligence Pack rollback failed.' });
    }
  },
}));
