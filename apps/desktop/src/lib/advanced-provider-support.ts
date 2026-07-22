import type { AdvancedProviderId, AdvancedProviderPlugin } from './advanced-api';
import { ADVANCED_TABS_STORAGE_KEY } from './advanced-workspace';
import { loadAdvancedWorkspaceTabs, type WorkspaceTab } from './advanced-workspace-helpers';

export function loadAdvancedTabs(): WorkspaceTab[] {
  return loadAdvancedWorkspaceTabs(localStorage.getItem(ADVANCED_TABS_STORAGE_KEY));
}

function createFallbackProviderPlugin(id: AdvancedProviderId, displayName: string): AdvancedProviderPlugin {
  return {
    manifest: {
      apiVersion: 'lightbi.plugin.v1',
      id,
      displayName,
      version: '0.1.0',
      providerKind: id === 'mongodb' ? 'document' : 'relational',
      description: 'Fallback built-in provider manifest used when the backend plugin registry is unavailable.',
      defaultPort: id === 'postgresql' ? 5432 : id === 'mysql' || id === 'mariadb' ? 3306 : id === 'mongodb' ? 27017 : null,
      urlSchemes: [id],
      connectionFields: [],
      capabilities: {
        connect: true,
        schemaDiscovery: true,
        readOnlyQuery: true,
        cancellableQuery: true,
        streamingQuery: false,
        writeback: id !== 'mongodb',
        ddl: id !== 'mongodb',
        importRows: id !== 'mongodb',
        exportRows: true,
        explain: id !== 'mongodb',
        serverDashboard: false,
        semanticHints: false,
      },
    },
    exposureGate: { canExpose: true, missingCapabilities: [], warnings: ['Using frontend fallback provider manifest.'] },
    source: 'frontend_fallback',
  };
}

export const FALLBACK_PROVIDER_PLUGINS: AdvancedProviderPlugin[] = [
  createFallbackProviderPlugin('postgresql', 'PostgreSQL'),
  createFallbackProviderPlugin('mysql', 'MySQL'),
  createFallbackProviderPlugin('mariadb', 'MariaDB'),
  createFallbackProviderPlugin('sqlite', 'SQLite'),
  createFallbackProviderPlugin('mongodb', 'MongoDB'),
];

export function providerDisplayName(providers: AdvancedProviderPlugin[], providerId: AdvancedProviderId): string {
  return providers.find(provider => provider.manifest.id === providerId)?.manifest.displayName
    ?? FALLBACK_PROVIDER_PLUGINS.find(provider => provider.manifest.id === providerId)?.manifest.displayName
    ?? providerId;
}
