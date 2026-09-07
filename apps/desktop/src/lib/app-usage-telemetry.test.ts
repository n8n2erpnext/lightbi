import { describe, expect, it } from 'vitest';
import { buildMicroBrainObservationBatchPayload } from './app-usage-telemetry';

describe('Micro Brain aggregate observation telemetry', () => {
  it('builds an aggregate-only payload with no raw business-data fields', () => {
    const payload = buildMicroBrainObservationBatchPayload({
      installationId:'native-installation-1234567890', retrievals:8, candidateHits:50, abstentions:1,
      startedAt:'2026-09-07T00:00:00.000Z', endedAt:'2026-09-07T00:01:00.000Z',
      appVersion:'0.9.2-next.test', platform:'Win32', generationId:'g-2026-09-07-next-test', environment:'internal', batchId:'mbb-1234567890abcdef',
    });
    expect(payload).toEqual(expect.objectContaining({ retrievals:8, candidateHits:50, abstentions:1, schemaVersion:'lightbi.micro-brain.observation-batch.v1' }));
    expect(payload.batchId).toBe('mbb-1234567890abcdef');
    expect(Object.keys(payload).sort()).toEqual(['schemaVersion','batchId','installationId','appVersion','platform','generationId','environment','retrievals','candidateHits','abstentions','batchStartedAt','batchEndedAt'].sort());
  });
});
