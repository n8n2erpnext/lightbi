export interface SourceCapabilities {
  supportsRefresh: boolean;
  supportsLiveRefresh: boolean;
  supportsPushdownFiltering: boolean;
  supportsPushdownAggregation: boolean;
  supportsFileWatch: boolean;
  supportsWriteBack: boolean;
  supportsIncrementalSync: boolean;
  supportsSchemaDiscovery: boolean;
  supportsPreview: boolean;
  supportsSampling: boolean;
  supportsMaterializationHints: boolean;
}

export interface ConnectorMetadata {
  id: string;
  name: string;
  version: string;
  provider: string; // e.g., 'postgres', 'csv'
  configSchema: Record<string, any>;
}

export interface ConnectorSchema {
  tables: Array<{
    name: string;
    columns: Array<{
      name: string;
      type: string;
    }>;
  }>;
}

export type ConnectorHealthStatus = 'Healthy' | 'Degraded' | 'Unreachable';

export interface ConnectorHealth {
  status: ConnectorHealthStatus;
  lastCheckedAt: string;
  errorMessage?: string;
  latencyMs?: number;
}

export interface ConnectorContract {
  metadata: ConnectorMetadata;
  schema: ConnectorSchema;
  capabilities: SourceCapabilities;
  health: ConnectorHealth;
}
