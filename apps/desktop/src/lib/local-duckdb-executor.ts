import type { RuntimePlanPreview } from './runtime-planner-preview';
import type { DuckDBPreviewResult } from './duckdb-preview-sandbox';
import type { SafeSqlPreview } from './safe-sql-preview';
import { initDuckDbWasm } from './duckdb-wasm-loader';
import { projectToCanonicalRows } from './canonical-row-projection';

export interface LocalDuckDBInput {
  runtimePlan: RuntimePlanPreview;
  safeSqlPreview: SafeSqlPreview;
  rows: Record<string, unknown>[];
  limit?: number;
}

export async function executeLocalDuckDB(input: LocalDuckDBInput): Promise<DuckDBPreviewResult> {
  const limit = input.limit || 100;
  
  try {
    // 1. Initialize WASM Engine
    const db = await initDuckDbWasm();
    const conn = await db.connect();
    
    // 2. Project data from raw schema to canonical schema
    const requiredCanonicalFields = input.runtimePlan.requiredColumns;
    const canonicalRows = projectToCanonicalRows(input.rows, requiredCanonicalFields);

    // 3. Load data from JS memory into DuckDB via virtual file
    const dataJson = JSON.stringify(canonicalRows);
    await db.registerFileText('data.json', dataJson);
    
    // 4. Create view using the exact name expected by the safe SQL planner
    await conn.query(`CREATE OR REPLACE VIEW __LIGHTBI_PREVIEW_TABLE__ AS SELECT * FROM read_json_auto('data.json')`);
    
    // 4. Run Analytical Query
    if (!input.safeSqlPreview.sql) {
      throw new Error("SQL preview is empty or blocked.");
    }
    
    const arrowResult = await conn.query(input.safeSqlPreview.sql);
    
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
      return jsonRow;
    });
    
    const warnings = [...input.runtimePlan.warnings];
    if (totalMalformedDropped > 0) {
      warnings.push(`Guarded SUM detected ${totalMalformedDropped} malformed values skipped during SUM aggregation.`);
    }
    
    await conn.close();

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
      source: 'local_duckdb_preview' as any
    };

  } catch (error: any) {
    const message = error instanceof Error ? error.message : String(error);
    
    let finalErrorMessage = message;
    const msgLower = message.toLowerCase();

    if (message.includes('CANONICAL_PROJECTION_CONFLICT') || message.includes('CANONICAL_PROJECTION_MISSING')) {
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
  }
}
