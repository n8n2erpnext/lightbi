import type { AsyncDuckDB, DuckDBBundles } from '@duckdb/duckdb-wasm';
// @ts-ignore
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url';
// @ts-ignore
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url';
// @ts-ignore
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url';
// @ts-ignore
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url';

export interface BootstrapError {
  isBootstrapError: true;
  message: string;
}

const MANUAL_BUNDLES: DuckDBBundles = {
    mvp: {
        mainModule: duckdb_wasm,
        mainWorker: mvp_worker,
    },
    eh: {
        mainModule: duckdb_wasm_eh,
        mainWorker: eh_worker,
    },
};

let dbInstance: AsyncDuckDB | null = null;
let initPromise: Promise<AsyncDuckDB> | null = null;

export async function initDuckDbWasm(): Promise<AsyncDuckDB> {
    if (dbInstance) return dbInstance;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        try {
            // The package evaluates a Worker shim during module import. Guard
            // first, then load the browser runtime only inside a real browser.
            if (typeof Worker === 'undefined') {
                 throw new Error("Worker is not defined in this environment (likely a Node test env).");
            }
            // Keep this import deferred so Node-based tests never evaluate the
            // browser Worker runtime.
            // @ts-ignore DuckDB's browser declarations are omitted from the
            // exports map in some supported package-manager/TypeScript pairs.
            const duckdb = await import('@duckdb/duckdb-wasm/dist/duckdb-browser');
            // Select a bundle based on browser checks
            const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
            if (!bundle.mainWorker) {
                 throw new Error("Missing mainWorker asset in selected bundle.");
            }
            // Instantiate the asynchronus version of DuckDB-wasm
            const worker = new Worker(bundle.mainWorker);
            const logger = new duckdb.ConsoleLogger();
            const db = new duckdb.AsyncDuckDB(logger, worker);
            await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
            dbInstance = db;
            return db;
        } catch (error: any) {
            initPromise = null;
            dbInstance = null;
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`DUCKDB_WASM_BOOTSTRAP_FAILED: ${message}`);
        }
    })();

    return initPromise;
}
