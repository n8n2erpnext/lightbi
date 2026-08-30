export type LightBIGenerationChannel = 'internal' | 'production';

export type LightBITrustStatus =
  | 'phase2a_unfrozen'
  | 'phase2a_frozen'
  | 'trust1_enabled';

export type LightBIGenerationManifestV1 = {
  schema_version: 'lightbi.generation.v1';
  generation_id: string;
  parent_generation_id: string | null;
  channel: LightBIGenerationChannel;
  core_commit: string;
  control_plane_commit: string;
  control_plane_schema_version: string;
  app_version: string;
  build_timestamp: string;
  test_pack_version: string;
  trust_status: LightBITrustStatus;
  trust_phase2a_head: string;
  release_update_channel: 'internal' | 'beta' | 'stable';
  distribution_origin: string;
  analytics_namespace: string;
  release_namespace: string;
  infrastructure_scope: {
    database: LightBIGenerationChannel;
    redis: LightBIGenerationChannel;
    data: LightBIGenerationChannel;
    analytics: LightBIGenerationChannel;
    releases: LightBIGenerationChannel;
    integrations: LightBIGenerationChannel;
  };
  build_provenance: {
    source_branch: string;
    source_commit: string;
    builder: string | null;
  };
};

export type LightBIGenerationDiagnostics = {
  generation: LightBIGenerationManifestV1;
  coreApi: 'healthy' | 'unhealthy' | 'unknown';
  controlPlane: 'healthy' | 'unhealthy' | 'unknown';
  schema: 'current' | 'pending' | 'unknown';
  worker: 'healthy' | 'unhealthy' | 'unknown';
};
