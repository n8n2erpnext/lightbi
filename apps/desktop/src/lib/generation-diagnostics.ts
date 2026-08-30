import type { LightBIGenerationDiagnostics, LightBIGenerationManifestV1 } from '@lightbi/core-types';
import { getApiBaseUrl } from './api-base';

type ProbeOptions = { fetcher?: typeof fetch; apiBaseUrl?: string };

type InternalControlPlaneDiagnostics = {
  generationId: string;
  controlPlaneCommit: string;
  schema: { status: 'current' | 'pending' };
  worker: { status: 'healthy' | 'unhealthy' | 'unknown' };
};

async function probeJson(fetcher: typeof fetch, url: string): Promise<boolean> {
  try {
    const response = await fetcher(url, { method: 'GET', headers: { accept: 'application/json' } });
    if (!response.ok) return false;
    const body = await response.json().catch(() => null) as { status?: unknown; ok?: unknown; data?: { status?: unknown } } | null;
    return body?.status === 'ok' || (body?.ok === true && body.data?.status === 'ok');
  } catch { return false; }
}

async function probeInternalControlPlane(fetcher: typeof fetch, url: string): Promise<InternalControlPlaneDiagnostics | null> {
  try {
    const response = await fetcher(url, { method:'GET', headers:{ accept:'application/json' } });
    if (!response.ok) return null;
    const envelope = await response.json() as { ok?: unknown; data?: unknown };
    if (envelope.ok !== true || !envelope.data || typeof envelope.data !== 'object') return null;
    const data = envelope.data as Record<string, unknown>;
    const schema = data.schema as Record<string, unknown> | undefined;
    const worker = data.worker as Record<string, unknown> | undefined;
    if (typeof data.generationId !== 'string' || typeof data.controlPlaneCommit !== 'string') return null;
    if (schema?.status !== 'current' && schema?.status !== 'pending') return null;
    if (worker?.status !== 'healthy' && worker?.status !== 'unhealthy' && worker?.status !== 'unknown') return null;
    return { generationId:data.generationId, controlPlaneCommit:data.controlPlaneCommit, schema:{ status:schema.status }, worker:{ status:worker.status } };
  } catch { return null; }
}

export async function probeGenerationDiagnostics(generation: LightBIGenerationManifestV1, options: ProbeOptions = {}): Promise<LightBIGenerationDiagnostics> {
  const fetcher = options.fetcher ?? fetch;
  const apiBase = (options.apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/u, '');
  const distribution = generation.distribution_origin.replace(/\/$/u, '');
  const [coreHealthy, controlPlaneHealthy, internal] = await Promise.all([
    probeJson(fetcher, `${apiBase}/api/health`),
    probeJson(fetcher, `${distribution}/api/v1/health`),
    generation.channel === 'internal' ? probeInternalControlPlane(fetcher, `${distribution}/api/v1/internal/diagnostics`) : Promise.resolve(null),
  ]);
  const generationMatches = internal == null || (internal.generationId === generation.generation_id && internal.controlPlaneCommit === generation.control_plane_commit);
  return {
    generation,
    coreApi: coreHealthy ? 'healthy' : 'unhealthy',
    controlPlane: controlPlaneHealthy && generationMatches ? 'healthy' : 'unhealthy',
    schema: internal?.schema.status ?? 'unknown',
    worker: internal?.worker.status ?? 'unknown',
  };
}
