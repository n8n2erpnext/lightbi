import { useState } from 'react';
import { AlertTriangle, Check, Database, Loader2 } from 'lucide-react';
import { closeAdvancedConnection, createAdvancedConnection, executeAdvancedDocumentQuery, executeAdvancedQuery, loadAdvancedSchema, loadAdvancedTableCount, type AdvancedConnection } from '../../lib/advanced-api';
import { profileColumns } from '../../lib/column-profiler';
import type { SourceInspectionResult, SourceType } from '../../lib/source-preflight';

interface DatabaseStepProps {
  config: any;
  onClose: () => void;
  onSourceInspected?: (result: SourceInspectionResult) => void;
}

type InspectStatus = SourceInspectionResult | null;

const SQL_DRIVERS = new Set(['postgresql', 'mysql', 'mariadb', 'sqlite']);

export function DatabaseStep({ config, onClose, onSourceInspected }: DatabaseStepProps) {
  const driver = config.driver as SourceType;
  const isMongo = driver === 'mongodb_atlas';
  const isSql = SQL_DRIVERS.has(driver);
  const [connectionUrl, setConnectionUrl] = useState('');
  const [schemaName, setSchemaName] = useState(config.schemaPlaceholder === 'public' ? 'public' : '');
  const [tableName, setTableName] = useState('');
  const [databaseName, setDatabaseName] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [sampleLimit, setSampleLimit] = useState(1000);
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<InspectStatus>(null);

  const canInspect = Boolean(connectionUrl.trim()) && (
    isMongo
      ? Boolean(databaseName.trim() && collectionName.trim())
      : Boolean(tableName.trim())
  );

  const handleInspect = async () => {
    if (!canInspect) return;
    setIsInspecting(true);
    setInspectionResult(null);

    let session: AdvancedConnection | null = null;
    try {
      const provider = (driver === 'mongodb_atlas' ? 'mongodb' : driver) as AdvancedConnection['provider'];
      session = await createAdvancedConnection(config.title, connectionUrl.trim(), provider, databaseName.trim() || undefined);
      const catalog = await loadAdvancedSchema(session.connectionId);
      const entityName = isMongo ? collectionName.trim() : tableName.trim();
      const targetSchema = catalog.schemas.find(schema => schema.name === (schemaName.trim() || session!.database)) ?? catalog.schemas[0];
      const target = targetSchema?.tables.find(table => table.name === entityName);
      if (!target) throw new Error(`${isMongo ? 'Collection' : 'Table'} ${entityName} was not found in the discovered catalog.`);
      const result = isMongo
        ? await executeAdvancedDocumentQuery(session.connectionId, { runId: crypto.randomUUID(), collection: entityName, filter: {}, limit: sampleLimit })
        : await executeAdvancedQuery(session.connectionId, {
            runId: crypto.randomUUID(), limit: sampleLimit,
            sql: provider === 'mysql' || provider === 'mariadb'
              ? `SELECT * FROM \`${targetSchema.name.replaceAll('`', '``')}\`.\`${entityName.replaceAll('`', '``')}\``
              : provider === 'sqlite'
                ? `SELECT * FROM "${entityName.replaceAll('"', '""')}"`
                : `SELECT * FROM "${targetSchema.name.replaceAll('"', '""')}"."${entityName.replaceAll('"', '""')}"`,
          });
      const columns = result.columns.map(column => column.name);
      const rows = result.rows.map(row => Object.fromEntries(columns.map((column, index) => [column, row[index] ?? null])));
      const exact = await loadAdvancedTableCount(session.connectionId, targetSchema.name, entityName).catch(() => null);
      const inspection = {
        status: 'accessible' as const,
        sourceType: driver,
        label: config.title,
        normalizedUrl: `${provider}://connected`,
        metadata: {
          name: `${config.title} ${targetSchema.name}.${entityName}`,
          rows_count: exact?.exactRows ?? rows.length,
          sampled_rows_count: rows.length,
          columns,
          preview_rows: rows,
          profiles: profileColumns(columns, rows, exact?.exactRows ?? rows.length),
        },
      };
      setInspectionResult(inspection);
    } catch (error: any) {
      setInspectionResult({
        status: 'not_found',
        sourceType: driver,
        label: config.title,
        message: error?.message ?? 'Could not inspect this database source.'
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

      <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Connection URI</span>
          <input
            type="password"
            value={connectionUrl}
            onChange={(event) => setConnectionUrl(event.target.value)}
            placeholder={config.uriPlaceholder}
            className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </label>

        {isSql && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {'schemaPlaceholder' in config && (
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Schema</span>
                <input
                  type="text"
                  value={schemaName}
                  onChange={(event) => setSchemaName(event.target.value)}
                  placeholder={config.schemaPlaceholder}
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
                placeholder={config.tablePlaceholder}
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
                placeholder={config.databasePlaceholder}
                className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Collection</span>
              <input
                type="text"
                value={collectionName}
                onChange={(event) => setCollectionName(event.target.value)}
                placeholder={config.collectionPlaceholder}
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
            {isInspecting ? 'Inspecting...' : config.buttonText || 'Inspect'}
          </button>
        )}
      </div>
    </div>
  );
}
