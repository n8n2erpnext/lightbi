import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAdvancedConnection, createAdvancedConnectionFromProfile, executeAdvancedQuery, loadAdvancedProfiles, loadAdvancedProviderPlugins, loadAdvancedTableCount, touchAdvancedProfile } from './advanced-api';

describe('advanced api', () => {
  afterEach(() => vi.restoreAllMocks());

  it('opens a session without exposing credentials in the response contract', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      connectionId: 'connection-1',
      name: 'Warehouse',
      database: 'analytics',
      provider: 'postgresql'
    }), { status: 201, headers: { 'content-type': 'application/json' } }));

    const connection = await createAdvancedConnection('Warehouse', 'postgresql://user:secret@db/analytics');

    expect(connection).toEqual({ connectionId: 'connection-1', name: 'Warehouse', database: 'analytics', provider: 'postgresql' });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/advanced/connections'), expect.objectContaining({ method: 'POST' }));
  });

  it('reconnects saved profiles by profileId without sending a URL or password', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      connectionId: 'connection-profile-1', name: 'Saved Warehouse', database: 'analytics', provider: 'postgresql'
    }), { status: 201, headers: { 'content-type': 'application/json' } }));
    const profile = {
      id: 'profile-1', name: 'Saved Warehouse', provider: 'postgresql' as const, database: 'analytics', tlsMode: 'verify-full',
      safeMode: 'confirm_writes' as const, createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z'
    };

    await createAdvancedConnectionFromProfile(profile.name, profile);

    const init = fetchMock.mock.calls[0][1];
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    expect(body.profileId).toBe('profile-1');
    expect(body).not.toHaveProperty('connectionUrl');
    expect(JSON.stringify(body)).not.toMatch(/password|secret/i);
  });

  it('touches only profile metadata and accepts a secret-free public profile response', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      id: 'profile-1', name: 'Saved Warehouse', provider: 'postgresql', database: 'analytics', tlsMode: 'verify-full',
      safeMode: 'confirm_writes', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-04T00:00:00Z'
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const touched = await touchAdvancedProfile('profile-1');

    expect(touched.updatedAt).toBe('2026-09-04T00:00:00Z');
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/advanced/profiles/profile-1/touch'), { method: 'POST' });
    expect(JSON.stringify(touched)).not.toMatch(/credential|cipher|nonce|password|connectionUrl/i);
  });

  it('keeps loaded profile contracts secret-free', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([{
      id: 'profile-1', name: 'Saved Warehouse', provider: 'postgresql', database: 'analytics', tlsMode: 'driver-default',
      safeMode: 'confirm_writes', createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-02T00:00:00Z'
    }]), { status: 200, headers: { 'content-type': 'application/json' } }));

    const profiles = await loadAdvancedProfiles();
    expect(JSON.stringify(profiles)).not.toMatch(/credential|cipher|nonce|password|connectionUrl/i);
  });

  it('keeps query results in matrix form with native column metadata', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      runId: 'advanced-query:1',
      columns: [{ id: 'column:0:amount', name: 'amount', logicalType: 'string', nativeType: 'NUMERIC' }],
      rows: [['9007199254740993.25']],
      page: { offset: 0, limit: 200, hasMore: false },
      truncated: false,
      warnings: [],
      executionMs: 12
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const result = await executeAdvancedQuery('connection-1', {
      runId: 'advanced-query:1', sql: 'SELECT amount FROM ledger', limit: 200, offset: 200,
      sort: { column: 'amount', direction: 'desc' },
      filters: [{ column: 'amount', operator: 'starts_with', value: '9' }],
      filterTree: { combinator: 'or', children: [{ column: 'amount', operator: 'greater_or_equal', value: '9' }] }
    });

    expect(result.rows[0][0]).toBe('9007199254740993.25');
    expect(result.columns[0].nativeType).toBe('NUMERIC');
    expect(result.executionMs).toBe(12);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/query'), expect.objectContaining({
      body: expect.stringContaining('"offset":200')
    }));
    expect(fetchMock.mock.calls[0][1]?.body).toContain('"operator":"starts_with"');
    expect(fetchMock.mock.calls[0][1]?.body).toContain('"filterTree"');
    expect(fetchMock.mock.calls[0][1]?.body).toContain('"greater_or_equal"');
  });

  it('requests exact counts with encoded schema and table names', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      schema: 'sales data', table: 'order/items', exactRows: 42, cached: false
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const count = await loadAdvancedTableCount('connection-1', 'sales data', 'order/items');

    expect(count.exactRows).toBe(42);
    expect(fetchMock.mock.calls[0][0]).toContain('schema=sales+data&table=order%2Fitems');
  });

  it('loads only exposable supported provider plugins for the Advanced dropdown', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify([
      {
        manifest: {
          apiVersion: 'lightbi.plugin.v1',
          id: 'postgresql',
          displayName: 'PostgreSQL',
          version: '0.1.0',
          providerKind: 'relational',
          description: 'Built in',
          urlSchemes: ['postgresql'],
          connectionFields: [],
          capabilities: {
            connect: true,
            schemaDiscovery: true,
            readOnlyQuery: true,
            cancellableQuery: true,
            streamingQuery: false,
            writeback: true,
            ddl: true,
            importRows: true,
            exportRows: true,
            explain: true,
            serverDashboard: false,
            semanticHints: false,
          },
        },
        exposureGate: { canExpose: true, missingCapabilities: [], warnings: [] },
        source: 'core_builtin',
      },
      {
        manifest: {
          apiVersion: 'lightbi.plugin.v1',
          id: 'sqlserver',
          displayName: 'SQL Server',
          version: '0.1.0',
          providerKind: 'relational',
          description: 'Built-in read-only provider',
          urlSchemes: ['sqlserver', 'mssql'],
          connectionFields: [],
          capabilities: {
            connect: true,
            schemaDiscovery: true,
            readOnlyQuery: true,
            cancellableQuery: true,
            streamingQuery: false,
            writeback: false,
            ddl: false,
            importRows: false,
            exportRows: true,
            explain: false,
            serverDashboard: false,
            semanticHints: false,
          },
        },
        exposureGate: { canExpose: true, missingCapabilities: [], warnings: [] },
        source: 'core_builtin',
      },
    ]), { status: 200, headers: { 'content-type': 'application/json' } }));

    const providers = await loadAdvancedProviderPlugins();

    expect(providers.map(provider => provider.manifest.id)).toEqual(['postgresql', 'sqlserver']);
    expect(providers[1].manifest.capabilities).toMatchObject({
      readOnlyQuery: true,
      writeback: false,
      ddl: false,
      importRows: false,
      exportRows: true,
    });
  });
});
