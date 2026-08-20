import { useState } from 'react';
import { AlertTriangle, Check, Database, Eye, EyeOff, Loader2 } from 'lucide-react';
import { closeAdvancedConnection, createAdvancedConnection, executeAdvancedDocumentQuery, executeAdvancedQuery, loadAdvancedSchema, loadAdvancedTableCount, type AdvancedConnection } from '../../lib/advanced-api';
import { createAdvancedId } from '../../lib/advanced-workspace';
import { profileColumns } from '../../lib/column-profiler';
import type { SourceInspectionResult, SourceType } from '../../lib/source-preflight';
import { homeGuidance } from '../../content/home-guidance';

interface DatabaseStepProps {
  config: DatabaseConnectionConfig;
  onClose: () => void;
  onSourceInspected?: (result: SourceInspectionResult) => void;
}

type InspectStatus = SourceInspectionResult | null;
type DatabaseDriver = Extract<SourceType, 'postgresql' | 'mysql' | 'mariadb' | 'sqlserver' | 'mongodb_atlas' | 'sqlite'>;
type DatabaseConnectionConfig = {
  title: string;
  description?: string;
  driver?: DatabaseDriver;
  uriPlaceholder?: string;
  tablePlaceholder?: string;
  schemaPlaceholder?: string;
  databasePlaceholder?: string;
  collectionPlaceholder?: string;
  buttonText?: string;
  options?: { id: DatabaseDriver; label: string }[];
};

const SQL_DRIVERS = new Set(['postgresql', 'mysql', 'mariadb', 'sqlserver', 'sqlite']);

export function DatabaseStep({ config, onClose, onSourceInspected }: DatabaseStepProps) {
  const [selectedDriver, setSelectedDriver] = useState<DatabaseDriver | null>(config.driver ?? null);
  const activeConfig = selectedDriver
    ? homeGuidance.connectionPanel[selectedDriver] as DatabaseConnectionConfig
    : config;
  const driver = activeConfig.driver;
  const isMongo = driver === 'mongodb_atlas';
  const isSql = Boolean(driver && SQL_DRIVERS.has(driver));
  const [connectionUrl, setConnectionUrl] = useState('');
  const [showConnectionUrl, setShowConnectionUrl] = useState(false);
  const [schemaName, setSchemaName] = useState(activeConfig.schemaPlaceholder === 'public' ? 'public' : '');
  const [tableName, setTableName] = useState('');
  const [databaseName, setDatabaseName] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [sampleLimit, setSampleLimit] = useState(1000);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<InspectStatus>(null);

  const canInspect = Boolean(driver && connectionUrl.trim()) && (
    isMongo
      ? Boolean(databaseName.trim() && collectionName.trim())
      : Boolean(tableName.trim())
  );

  const handleSelectDriver = (nextDriver: DatabaseDriver | null) => {
    setSelectedDriver(nextDriver);
    if (!nextDriver) {
      setConnectionUrl('');
      setSchemaName('');
      setTableName('');
      setDatabaseName('');
      setCollectionName('');
      setInspectionResult(null);
      return;
    }
    const nextConfig = homeGuidance.connectionPanel[nextDriver] as DatabaseConnectionConfig;
    setConnectionUrl('');
    setSchemaName(nextConfig.schemaPlaceholder === 'public' ? 'public' : '');
    setTableName('');
    setDatabaseName('');
    setCollectionName('');
    setInspectionResult(null);
  };

  const handleInspect = async () => {
    if (!canInspect || !driver) return;
    setIsInspecting(true);
    setInspectionResult(null);

    let session: AdvancedConnection | null = null;
    try {
      const provider = (driver === 'mongodb_atlas' ? 'mongodb' : driver) as AdvancedConnection['provider'];
      session = await createAdvancedConnection(activeConfig.title, connectionUrl.trim(), provider, databaseName.trim() || undefined);
      const catalog = await loadAdvancedSchema(session.connectionId);
      const entityName = isMongo ? collectionName.trim() : tableName.trim();
      const targetSchema = catalog.schemas.find(schema => schema.name === (schemaName.trim() || session!.database)) ?? catalog.schemas[0];
      const target = targetSchema?.tables.find(table => table.name === entityName);
      if (!target) throw new Error(`${isMongo ? 'Collection' : 'Table'} ${entityName} was not found in the discovered catalog.`);
      const result = isMongo
        ? await executeAdvancedDocumentQuery(session.connectionId, { runId: createAdvancedId(), collection: entityName, filter: {}, limit: sampleLimit })
        : await executeAdvancedQuery(session.connectionId, {
            runId: createAdvancedId(), limit: sampleLimit,
            sql: provider === 'mysql' || provider === 'mariadb'
              ? `SELECT * FROM \`${targetSchema.name.replaceAll('`', '``')}\`.\`${entityName.replaceAll('`', '``')}\``
              : provider === 'sqlite'
                ? `SELECT * FROM "${entityName.replaceAll('"', '""')}"`
                : provider === 'sqlserver'
                  ? `SELECT * FROM [${targetSchema.name.replaceAll(']', ']]')}].[${entityName.replaceAll(']', ']]')}]`
                : `SELECT * FROM "${targetSchema.name.replaceAll('"', '""')}"."${entityName.replaceAll('"', '""')}"`,
          });
      const columns = result.columns.map(column => column.name);
      const rows = result.rows.map(row => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? null])));
      const exact = await loadAdvancedTableCount(session.connectionId, targetSchema.name, entityName).catch(() => null);
      const inspection = {
        status: 'accessible' as const,
        sourceType: driver,
        label: activeConfig.title,
        normalizedUrl: `${provider}://connected`,
        metadata: {
          name: `${activeConfig.title} ${targetSchema.name}.${entityName}`,
          rows_count: exact?.exactRows ?? rows.length,
          sampled_rows_count: rows.length,
          columns,
          preview_rows: rows,
          profiles: profileColumns(columns, rows, exact?.exactRows ?? rows.length),
        },
      };
      setInspectionResult(inspection);
    } catch (error: unknown) {
      setInspectionResult({
        status: 'not_found',
        sourceType: driver,
        label: activeConfig.title,
        message: error instanceof Error ? error.message : 'Could not inspect this database source.'
      });
    } finally {
      if (session) await closeAdvancedConnection(session.connectionId).catch(() => undefined);
      setIsInspecting(false);
    }
  };

  const handleUseDataset = () => {
    if (inspectionResult?.status !== 'accessible') return;
    onSourceInspected?.(inspectionResult);
    onClose();
  };

  const inspectedRows = inspectionResult?.status === 'accessible'
    ? inspectionResult.metadata.rows_count ?? inspectionResult.metadata.preview_rows?.length ?? 0
    : 0;
  const inspectedColumns = inspectionResult?.status === 'accessible'
    ? inspectionResult.metadata.columns?.length ?? 0
    : 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-8">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900">{config.title}</h2>
        {config.description && (
          <p className="text-gray-500">{config.description}</p>
        )}
      </div>

      {!driver && config.options && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:grid-cols-2">
          {config.options.map(option => (
            <button
              key={option.id}
              onClick={() => handleSelectDriver(option.id)}
              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left transition-colors hover:border-gray-300 hover:bg-white"
            >
              <Database className="h-5 w-5 text-gray-500" />
              <div>
                <div className="text-sm font-semibold text-gray-900">{option.label}</div>
                <div className="mt-0.5 text-xs text-gray-500">Inspect a read-only sample</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {driver && (
      <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        {!config.driver && (
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">{activeConfig.title}</p>
              {activeConfig.description && <p className="mt-0.5 text-xs text-gray-500">{activeConfig.description}</p>}
            </div>
            <button
              onClick={() => handleSelectDriver(null)}
              className="rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              Change type
            </button>
          </div>
        )}
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Connection URI</span>
          <div className="relative mt-2">
            <input
              type={showConnectionUrl ? 'text' : 'password'}
              value={connectionUrl}
              onChange={(event) => setConnectionUrl(event.target.value)}
              placeholder={activeConfig.uriPlaceholder}
              className="block w-full rounded-lg border border-gray-300 py-2 pl-3 pr-11 font-mono text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
            <button
              type="button"
              aria-label={showConnectionUrl ? 'Hide connection URL' : 'Show connection URL'}
              title={showConnectionUrl ? 'Hide connection URL' : 'Show connection URL'}
              onClick={() => setShowConnectionUrl(current => !current)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-gray-500 hover:bg-gray-50 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gray-900"
            >
              {showConnectionUrl ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>

        {isSql && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {'schemaPlaceholder' in activeConfig && (
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Schema</span>
                <input
                  type="text"
                  value={schemaName}
                  onChange={(event) => setSchemaName(event.target.value)}
                  placeholder={activeConfig.schemaPlaceholder}
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </label>
            )}
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Table</span>
              <input
                type="text"
                value={tableName}
                onChange={(event) => setTableName(event.target.value)}
                placeholder={activeConfig.tablePlaceholder}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </label>
          </div>
        )}

        {isMongo && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Database</span>
              <input
                type="text"
                value={databaseName}
                onChange={(event) => setDatabaseName(event.target.value)}
                placeholder={activeConfig.databasePlaceholder}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Collection</span>
              <input
                type="text"
                value={collectionName}
                onChange={(event) => setCollectionName(event.target.value)}
                placeholder={activeConfig.collectionPlaceholder}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </label>
          </div>
        )}

        <label className="block max-w-[180px]">
          <span className="text-sm font-medium text-gray-700">Sample rows</span>
          <input
            type="number"
            min={1}
            max={1000}
            value={sampleLimit}
            onChange={(event) => setSampleLimit(Number(event.target.value) || 1000)}
            className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </label>
      </div>
      )}

      {isInspecting && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Inspecting schema and sampling rows...
        </div>
      )}

      {inspectionResult && inspectionResult.status !== 'accessible' && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">{inspectionResult.status.replace(/_/g, ' ')}</p>
            <p className="mt-1">{inspectionResult.message}</p>
          </div>
        </div>
      )}

      {inspectionResult?.status === 'accessible' && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-emerald-800">
            <Check className="h-4 w-4" />
            <span className="text-sm font-semibold">Database source inspected</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Rows</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{inspectedRows.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Columns</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{inspectedColumns.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700">
            <Database className="h-3.5 w-3.5" />
            <span>LightBI will analyze this read-only sample through the shared understanding core.</span>
          </div>
        </div>
      )}

      {driver && (
      <div className="pt-4 flex justify-end">
        {inspectionResult?.status === 'accessible' ? (
          <button
            onClick={handleUseDataset}
            className="px-6 py-3 bg-blue-600 text-white text-base font-medium rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
          >
            Use this dataset
          </button>
        ) : (
          <button
            onClick={handleInspect}
            disabled={!canInspect || isInspecting}
            className="px-6 py-3 bg-gray-900 text-white text-base font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
          >
            {isInspecting ? 'Inspecting...' : activeConfig.buttonText || 'Inspect'}
          </button>
        )}
      </div>
      )}
    </div>
  );
}
