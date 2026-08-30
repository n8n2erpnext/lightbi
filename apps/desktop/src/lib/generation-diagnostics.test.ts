import { describe, expect, it, vi } from 'vitest';
import type { LightBIGenerationManifestV1 } from '@lightbi/core-types';
import { probeGenerationDiagnostics } from './generation-diagnostics';

const manifest: LightBIGenerationManifestV1 = {
  schema_version:'lightbi.generation.v1', generation_id:'g-next', parent_generation_id:'g-current', channel:'internal',
  core_commit:'a'.repeat(40), control_plane_commit:'b'.repeat(40), control_plane_schema_version:'033_runtime_heartbeats',
  app_version:'0.9.2-beta.7', build_timestamp:'2026-08-30T10:00:00.000Z', test_pack_version:'lightbi.uat.v1',
  trust_status:'phase2a_unfrozen', trust_phase2a_head:'c'.repeat(40), release_update_channel:'internal',
  distribution_origin:'https://internal.example/distribution', analytics_namespace:'internal', release_namespace:'internal/lightbi',
  infrastructure_scope:{database:'internal',redis:'internal',data:'internal',analytics:'internal',releases:'internal',integrations:'internal'},
  build_provenance:{source_branch:'next',source_commit:'a'.repeat(40),builder:'test'},
};

describe('generation diagnostics', () => {
  it('binds runtime health to the exact internal generation', async () => {
    const fetcher = vi.fn<typeof fetch>(async input => {
      const url=String(input);
      if (url.endsWith('/api/health')) return new Response(JSON.stringify({status:'ok'}),{status:200});
      if (url.endsWith('/api/v1/health')) return new Response(JSON.stringify({ok:true,data:{status:'ok'}}),{status:200});
      return new Response(JSON.stringify({ok:true,data:{generationId:'g-next',controlPlaneCommit:'b'.repeat(40),schema:{status:'current'},worker:{status:'healthy'}}}),{status:200});
    });
    const result=await probeGenerationDiagnostics(manifest,{fetcher,apiBaseUrl:'http://core.internal'});
    expect(result).toMatchObject({coreApi:'healthy',controlPlane:'healthy',schema:'current',worker:'healthy'});
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('fails the control-plane health signal when the runtime belongs to another generation', async () => {
    const fetcher = vi.fn<typeof fetch>(async input => {
      const url=String(input);
      if (url.endsWith('/api/health')) return new Response(JSON.stringify({status:'ok'}),{status:200});
      if (url.endsWith('/api/v1/health')) return new Response(JSON.stringify({ok:true,data:{status:'ok'}}),{status:200});
      return new Response(JSON.stringify({ok:true,data:{generationId:'wrong',controlPlaneCommit:'d'.repeat(40),schema:{status:'current'},worker:{status:'healthy'}}}),{status:200});
    });
    const result=await probeGenerationDiagnostics(manifest,{fetcher,apiBaseUrl:'http://core.internal'});
    expect(result.controlPlane).toBe('unhealthy');
  });

  it('reports network failures instead of throwing', async () => {
    const fetcher=vi.fn<typeof fetch>(async()=>{throw new Error('offline')});
    const result=await probeGenerationDiagnostics(manifest,{fetcher,apiBaseUrl:'http://core.internal'});
    expect(result).toMatchObject({coreApi:'unhealthy',controlPlane:'unhealthy',schema:'unknown',worker:'unknown'});
  });
});
