import { getOrCreateInstallationId, anonymousPairingEnabled, lightBIDistributionEndpoint } from './distribution-pairing';
import { buildGenerationManifest, generationTelemetryEnvironment } from './generation-manifest';
import { isNativeLightBI } from './native-runtime';
import { externalFetch } from './native-capabilities';

export type LightBIFeature = 'easy_mode' | 'advanced_mode' | 'advanced_query' | 'advanced_database_edit' | 'deep_ba' | 'subset_analysis' | 'dashboard' | 'chart' | 'export' | 'data_import' | 'database_connect' | 'google_sheets';
export type LightBIUpdateEvent = 'update_available' | 'update_download_started' | 'update_download_success' | 'update_download_failed' | 'update_install_started';
const SESSION_KEY = 'lightbi-usage-session-id';
const START_KEY = 'lightbi-usage-session-start';

export type MicroBrainObservationBatchPayload = {
  schemaVersion: 'lightbi.micro-brain.observation-batch.v1'; batchId: string; installationId: string;
  appVersion: string; platform: string; generationId: string; environment: string;
  retrievals: number; candidateHits: number; abstentions: number; batchStartedAt: string; batchEndedAt: string;
};
type MicroBrainBatchState = { batchId: string | null; startedAt: string | null; retrievals: number; candidateHits: number; abstentions: number };
const emptyMicroBrainBatch = (): MicroBrainBatchState => ({ batchId:null, startedAt:null, retrievals:0, candidateHits:0, abstentions:0 });
let microBrainBatch: MicroBrainBatchState = emptyMicroBrainBatch();
const microBrainRetryQueue: MicroBrainBatchState[] = [];
let microBrainFlushTimer: number | null = null;
let microBrainFlushInFlight = false;

export function buildMicroBrainObservationBatchPayload(input: { installationId:string; retrievals:number; candidateHits:number; abstentions:number; startedAt:string; endedAt:string; appVersion?:string; platform?:string; generationId?:string; environment?:string; batchId?:string }): MicroBrainObservationBatchPayload {
  return { schemaVersion:'lightbi.micro-brain.observation-batch.v1', batchId:input.batchId ?? `mbb-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
    installationId:input.installationId, appVersion:input.appVersion ?? import.meta.env.VITE_LIGHTBI_VERSION ?? '0.9.2-beta.7', platform:input.platform ?? navigator.platform ?? 'unknown',
    generationId:input.generationId ?? buildGenerationManifest().generation_id, environment:input.environment ?? (import.meta.env.MODE === 'test' ? 'test' : generationTelemetryEnvironment()),
    retrievals:Math.max(0,Math.trunc(input.retrievals)), candidateHits:Math.max(0,Math.trunc(input.candidateHits)), abstentions:Math.max(0,Math.trunc(input.abstentions)), batchStartedAt:input.startedAt, batchEndedAt:input.endedAt };
}

function sessionId() {
  let value = sessionStorage.getItem(SESSION_KEY);
  if (!value) {
    value = globalThis.crypto?.randomUUID?.() ?? `usage-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, value);
    sessionStorage.setItem(START_KEY, String(Date.now()));
  }
  return value;
}

async function send(event: 'app_open' | 'app_close' | 'feature_use', feature?: LightBIFeature, durationSeconds?: number) {
  if (!isNativeLightBI() || !anonymousPairingEnabled()) return;
  let endpoint: string;
  try { endpoint = lightBIDistributionEndpoint(); } catch { return; }
  await externalFetch(`${endpoint}/api/app/event`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: event === 'app_close',
    body: JSON.stringify({
      event, feature, durationSeconds, installationId: getOrCreateInstallationId(), sessionId: sessionId(),
      appVersion: import.meta.env.VITE_LIGHTBI_VERSION ?? '0.9.2-beta.7', platform: navigator.platform ?? 'unknown', environment: import.meta.env.MODE === 'test' ? 'test' : generationTelemetryEnvironment(),
    }),
  }).catch(() => null);
}


async function flushMicroBrainObservationBatch(keepalive = false) {
  if (microBrainFlushInFlight || !isNativeLightBI() || !anonymousPairingEnabled()) return;
  const retrying = microBrainRetryQueue.length > 0;
  const batch = retrying ? microBrainRetryQueue[0] : microBrainBatch;
  if (!batch || batch.retrievals <= 0 || !batch.startedAt || !batch.batchId) return;
  let endpoint: string; try { endpoint = lightBIDistributionEndpoint(); } catch { return; }
  if (!retrying) microBrainBatch = emptyMicroBrainBatch();
  microBrainFlushInFlight = true;
  if (microBrainFlushTimer !== null) { window.clearTimeout(microBrainFlushTimer); microBrainFlushTimer = null; }
  const payload = buildMicroBrainObservationBatchPayload({ batchId:batch.batchId, installationId:getOrCreateInstallationId(), retrievals:batch.retrievals, candidateHits:batch.candidateHits, abstentions:batch.abstentions, startedAt:batch.startedAt, endedAt:new Date().toISOString() });
  let failed = false;
  try {
    const response = await externalFetch(`${endpoint}/api/micro-brain/observation-batch`, { method:'POST', headers:{'content-type':'application/json'}, keepalive, body:JSON.stringify(payload) });
    if (!response.ok) throw new Error('micro_brain_observation_batch_rejected');
    if (retrying) microBrainRetryQueue.shift();
  } catch {
    failed = true;
    if (!retrying) microBrainRetryQueue.push(batch);
  } finally {
    microBrainFlushInFlight = false;
    const pending = microBrainRetryQueue.length > 0 || microBrainBatch.retrievals > 0;
    if (pending && microBrainFlushTimer === null) microBrainFlushTimer = window.setTimeout(() => { microBrainFlushTimer = null; void flushMicroBrainObservationBatch(); }, failed ? 60_000 : 5_000);
  }
}

export function recordMicroBrainObservation(hitCount: number) {
  if (!isNativeLightBI() || !anonymousPairingEnabled()) return;
  if (!microBrainBatch.batchId) microBrainBatch.batchId = `mbb-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  microBrainBatch.startedAt ??= new Date().toISOString();
  microBrainBatch.retrievals += 1; microBrainBatch.candidateHits += Math.max(0,Math.trunc(hitCount)); microBrainBatch.abstentions += hitCount === 0 ? 1 : 0;
  if (microBrainBatch.retrievals >= 25) { void flushMicroBrainObservationBatch(); return; }
  if (microBrainFlushTimer === null) microBrainFlushTimer = window.setTimeout(() => { microBrainFlushTimer = null; void flushMicroBrainObservationBatch(); }, 60_000);
}

export function startAppUsageTelemetry() {
  if (!isNativeLightBI()) return;
  void send('app_open');
  addEventListener('pagehide', () => {
    const started = Number(sessionStorage.getItem(START_KEY)) || Date.now();
    void send('app_close', undefined, Math.max(0, (Date.now() - started) / 1000));
    void flushMicroBrainObservationBatch(true);
  }, { once: true });
}

export function trackFeatureUsage(feature: LightBIFeature) {
  void send('feature_use', feature);
}

export function trackUpdateEvent(event: LightBIUpdateEvent) {
  if (!isNativeLightBI() || !anonymousPairingEnabled()) return;
  let endpoint: string;
  try { endpoint = lightBIDistributionEndpoint(); } catch { return; }
  void externalFetch(`${endpoint}/api/app/event`, { method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event,installationId:getOrCreateInstallationId(),sessionId:sessionId(),appVersion:import.meta.env.VITE_LIGHTBI_VERSION??'0.9.2-beta.7',platform:navigator.platform??'unknown',environment:import.meta.env.MODE==='test'?'test':generationTelemetryEnvironment()}) }).catch(()=>null);
}
