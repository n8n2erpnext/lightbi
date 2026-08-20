import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'sample-corpus', 'ground-truth', 'xomdata-sql-corpus.json');
const apiBase = (process.env.LIGHTBI_XOMDATA_API_BASE || 'http://100.94.184.141:5173').replace(/\/$/, '');
const connectionUrl = process.env.LIGHTBI_XOMDATA_CONNECTION;

if (!connectionUrl) {
  throw new Error('LIGHTBI_XOMDATA_CONNECTION is required and is never written to the corpus.');
}

const includedSchemas = new Set([
  'adventure_works',
  'banking',
  'coffee_shop',
  'crm_analytics',
  'e_commerce',
  'education',
  'employees_churn',
  'fmcg_sales',
  'hospital_survey',
  'logistics',
  'mobile_games',
  'nyc_green_taxi',
  'retails',
  'skytrax',
  'social_media',
  'vietnam_ecommerce',
  'web_analytics',
]);

function quoteIdentifier(value) {
  return `[${String(value).replace(/]/g, ']]')}]`;
}

async function request(route, init = {}) {
  const response = await fetch(`${apiBase}${route}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(`${route}: ${body.message || response.statusText}`);
  }
  return response.status === 204 ? null : response.json();
}

const connection = await request('/api/advanced/connections', {
  method: 'POST',
  body: JSON.stringify({
    name: 'xomdata-semantic-corpus',
    connectionUrl,
    provider: 'sqlserver',
    databaseName: 'xomdata_dataset',
    safeMode: 'read_only',
  }),
});

try {
  const discovered = await request(`/api/advanced/connections/${encodeURIComponent(connection.connectionId)}/schema?refresh=true`);
  const schemas = [];
  for (const schema of discovered.schemas.filter((item) => includedSchemas.has(item.name))) {
    const tables = [];
    for (const table of schema.tables) {
      const runId = `xomdata-corpus-${schema.name}-${table.name}`.replace(/[^a-z0-9_-]/gi, '-');
      const result = await request(`/api/advanced/connections/${encodeURIComponent(connection.connectionId)}/query`, {
        method: 'POST',
        body: JSON.stringify({
          runId,
          sql: `SELECT * FROM ${quoteIdentifier(schema.name)}.${quoteIdentifier(table.name)}`,
          limit: 5,
          offset: 0,
        }),
      });
      tables.push({
        table: table.name,
        estimatedRows: table.estimatedRows ?? null,
        columns: table.columns.map((column) => ({
          name: column.name,
          nativeType: column.nativeType,
          nullable: column.nullable,
          primaryKey: Boolean(column.primaryKey),
        })),
        sampleRows: result.rows.map((row) => Object.fromEntries(
          result.columns.map((column, index) => [column.name, row[index] ?? null]),
        )),
      });
      process.stdout.write(`sampled ${schema.name}.${table.name}\n`);
    }
    schemas.push({ schema: schema.name, tables });
  }

  const missingSchemas = [...includedSchemas].filter((name) => !schemas.some((schema) => schema.schema === name));
  if (missingSchemas.length > 0) {
    throw new Error(`Missing expected schemas: ${missingSchemas.join(', ')}`);
  }

  const corpus = {
    schemaVersion: 'lightbi.xomdata-sql-semantic-corpus.v1',
    generatedOn: new Date().toISOString(),
    source: {
      provider: 'Xom Dataset',
      catalogUrl: 'https://dataset.xomdata.com/datasets',
      license: 'https://creativecommons.org/licenses/by/4.0/',
      access: 'read-only sample',
    },
    policy: {
      sampleRowsPerTable: 5,
      connectionSecretPersisted: false,
      datasetNamesAllowedInRecognitionRules: false,
      observedValuesAllowedInRecognitionRules: false,
      purpose: 'Regression corpus for generic semantic recognition across database and local-file source kinds.',
    },
    counts: {
      schemas: schemas.length,
      tables: schemas.reduce((sum, schema) => sum + schema.tables.length, 0),
      columns: schemas.reduce((sum, schema) => sum + schema.tables.reduce((tableSum, table) => tableSum + table.columns.length, 0), 0),
      sampledRows: schemas.reduce((sum, schema) => sum + schema.tables.reduce((tableSum, table) => tableSum + table.sampleRows.length, 0), 0),
    },
    schemas,
  };

  await fs.writeFile(outputPath, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8');
  process.stdout.write(`wrote ${outputPath}\n`);
  process.stdout.write(`${JSON.stringify(corpus.counts)}\n`);
} finally {
  await request(`/api/advanced/connections/${encodeURIComponent(connection.connectionId)}`, { method: 'DELETE' }).catch(() => null);
}
