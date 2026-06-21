import type { RuntimePlanPreview } from './runtime-planner-preview';
import type { DuckDBPreviewResult } from './duckdb-preview-sandbox';
import type { SafeSqlPreview } from './safe-sql-preview';
import { initDuckDbWasm } from './duckdb-wasm-loader';
import { projectToCanonicalRows } from './canonical-row-projection';
import { materializeRuntimeDatasetSource } from './full-file-runtime-materializer';
import type { RuntimeDatasetSource, RuntimeRowScope } from './runtime-dataset-source';

export interface LocalDuckDBInput {
  runtimePlan: RuntimePlanPreview;
  safeSqlPreview: SafeSqlPreview;
  rows?: Record<string, unknown>[];
  runtimeDatasetSource?: RuntimeDatasetSource;
  rowScope?: RuntimeRowScope;
  limit?: number;
  signal?: AbortSignal;
}

function normalizePhysicalKey(key: string): string {
  return key.toLowerCase();
}

function createPhysicalRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(row => {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[normalizePhysicalKey(key)] = value;
    }
    return normalized;
  });
}

function hasPhysicalColumns(rows: Record<string, unknown>[], requiredColumns: string[]): boolean {
  if (requiredColumns.length === 0) return true;
  const available = new Set<string>();
  for (const row of rows.slice(0, 50)) {
    for (const key of Object.keys(row)) {
      available.add(normalizePhysicalKey(key));
    }
  }
  return requiredColumns.every(column => available.has(normalizePhysicalKey(column)));
}

function createRowsForDuckDB(rows: Record<string, unknown>[], requiredColumns: string[]): Record<string, unknown>[] {
  if (hasPhysicalColumns(rows, requiredColumns)) {
    return createPhysicalRows(rows);
  }
  return projectToCanonicalRows(rows, requiredColumns);
}

function normalizeDuckDBValue(value: unknown): unknown {
  if (typeof value === 'bigint') {
    const asNumber = Number(value);
    return Number.isSafeInteger(asNumber) ? asNumber : value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(normalizeDuckDBValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
        key,
        normalizeDuckDBValue(nestedValue)
      ])
    );
  }
  return value;
}

export async function executeLocalDuckDB(input: LocalDuckDBInput): Promise<DuckDBPreviewResult> {
  const limit = input.limit || 100;
  let conn: Awaited<ReturnType<(Awaited<ReturnType<typeof initDuckDbWasm>>)["connect"]>> | null = null;
  
  try {
    input.signal?.throwIfAborted();
    // 1. Initialize WASM Engine
    const db = await initDuckDbWasm();
    input.signal?.throwIfAborted();
    conn = await db.connect();
    input.signal?.throwIfAborted();
    
    // 2. Build the in-memory table schema expected by the SQL planner.
    // New local-first Question actions use physical upload headers directly.
    // Older legacy actions still rely on canonical aliases such as "route".
    let dataJson: string;
    let executionScope: RuntimeRowScope = input.rowScope ?? "retained_rows";
    if (input.runtimeDatasetSource) {
      const materialized = await materializeRuntimeDatasetSource(input.runtimeDatasetSource, input.signal);
      if (materialized.rowCount === 0) {
        throw new Error("No data rows available to query.");
      }
      dataJson = materialized.jsonText;
      executionScope = "full_file";
    } else {
      const queryRows = createRowsForDuckDB(input.rows ?? [], input.runtimePlan.requiredColumns);
      if (queryRows.length === 0) {
        throw new Error("No data rows available to query.");
      }
      if (Object.keys(queryRows[0]).length === 0) {
        throw new Error("Dataset rows have an empty schema. Cannot perform queries.");
      }
      dataJson = JSON.stringify(queryRows);
    }

    // 3. Load data into DuckDB via a virtual JSON file.
    await db.registerFileText('data.json', dataJson);
    input.signal?.throwIfAborted();
    
    // 4. Create view using the exact name expected by the safe SQL planner
    await conn.query(`CREATE OR REPLACE VIEW __LIGHTBI_PREVIEW_TABLE__ AS SELECT * FROM read_json_auto('data.json')`);
    input.signal?.throwIfAborted();
    
    // 4. Run Analytical Query
    if (!input.safeSqlPreview.sql) {
      throw new Error("SQL preview is empty or blocked.");
    }
    
    const arrowResult = await conn.query(input.safeSqlPreview.sql);
    input.signal?.throwIfAborted();
    
    // 5. Convert Arrow Table back to JS objects
    let totalMalformedDropped = 0;
    
    const columns = arrowResult.schema.fields
      .map(f => f.name)
      .filter(name => !name.startsWith('__malformed_'));
      
    const rows = arrowResult.toArray().map((row: any) => {
      const jsonRow = row.toJSON();
      
      for (const key of Object.keys(jsonRow)) {
        if (key.startsWith('__malformed_')) {
          if (typeof jsonRow[key] === 'number') {
            totalMalformedDropped += jsonRow[key];
          } else if (typeof jsonRow[key] === 'bigint') {
            totalMalformedDropped += Number(jsonRow[key]);
          }
          delete jsonRow[key];
        }
      }
      return normalizeDuckDBValue(jsonRow) as Record<string, unknown>;
    });
    
    const warnings = [...input.runtimePlan.warnings];
    if (executionScope === "full_file") {
      warnings.push("Preview executed against the full local file through the worker-backed DuckDB runtime.");
    }
    if (totalMalformedDropped > 0) {
      warnings.push(`Guarded SUM detected ${totalMalformedDropped} malformed values skipped during SUM aggregation.`);
    }
    
    return {
      id: `local_exec_${input.runtimePlan.id}`,
      sourceSqlPreviewId: input.safeSqlPreview.id,
      status: 'executed',
      columns,
      rows,
      rowCount: rows.length,
      maxRows: limit,
      warnings,
      blockedReasons: [],
      executionScope,
      source: 'local_duckdb_preview' as any
    };

  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    
    let finalErrorMessage = message;
    const msgLower = message.toLowerCase();

    if (input.signal?.aborted || error?.name === 'AbortError') {
      finalErrorMessage = 'EXECUTION_ABORTED: Preview execution was cancelled.';
    } else if (message.includes('CANONICAL_PROJECTION_CONFLICT') || message.includes('CANONICAL_PROJECTION_MISSING')) {
      // Preserve projection errors
      finalErrorMessage = message;
    } else if (msgLower.includes('parser error')) {
      finalErrorMessage = `DUCKDB_PARSER_ERROR: ${message}`;
    } else if (msgLower.includes('binder error')) {
      finalErrorMessage = `DUCKDB_BINDER_ERROR: ${message}`;
    } else if (msgLower.includes('catalog error')) {
      finalErrorMessage = `DUCKDB_CATALOG_ERROR: ${message}`;
    } else if (message.includes('DUCKDB_WASM_BOOTSTRAP_FAILED') || msgLower.includes('worker is not defined')) {
      finalErrorMessage = `DUCKDB_BOOTSTRAP_ERROR: ${message}`;
    } else if (msgLower.includes('out of memory') || msgLower.includes('memory limit')) {
      finalErrorMessage = `DUCKDB_MEMORY_ERROR: ${message}`;
    } else if (msgLower.includes('panic') || msgLower.includes('connection closed') || msgLower.includes('worker')) {
      finalErrorMessage = `DUCKDB_WORKER_ERROR: ${message}`;
    } else if (message.includes('No data rows available') || message.includes('empty schema')) {
      finalErrorMessage = message;
    } else {
      finalErrorMessage = `DUCKDB_UNKNOWN_RUNTIME_ERROR: ${message}`;
    }

    return {
      id: `local_exec_${input.runtimePlan.id}`,
      sourceSqlPreviewId: input.safeSqlPreview.id,
      status: 'failed',
      columns: [],
      rows: [],
      rowCount: 0,
      maxRows: limit,
      warnings: [...input.runtimePlan.warnings],
      blockedReasons: [],
      errorMessage: finalErrorMessage,
      source: 'local_duckdb_preview' as any
    };
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch {
        // Query failure is already represented by the execution result.
      }
    }
  }
}
