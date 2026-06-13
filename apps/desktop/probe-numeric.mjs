import * as duckdb from '@duckdb/duckdb-wasm';
import fs from 'fs';

async function run() {
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
  const worker = new Worker(bundle.mainWorker);
  const logger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

  const conn = await db.connect();

  const data = [
    { id: 1, revenue: "1,000,000", quantity: 12 },
    { id: 2, revenue: "1.000.000đ", quantity: "45" },
    { id: 3, revenue: "N/A", quantity: "N/A" },
    { id: 4, revenue: "", quantity: null },
    { id: 5, revenue: "500000", quantity: 10 }
  ];

  await db.registerFileText('data.json', JSON.stringify(data));
  await conn.query(`CREATE TABLE test AS SELECT * FROM read_json_auto('data.json')`);

  console.log("--- RAW DATA ---");
  console.table((await conn.query(`SELECT * FROM test`)).toArray().map(r => r.toJSON()));

  console.log("--- CAST vs TRY_CAST ---");
  try {
    await conn.query(`SELECT CAST(revenue AS DOUBLE) FROM test`);
  } catch (e) {
    console.log("CAST(revenue) FAILED:", e.message);
  }

  const tryCastRes = await conn.query(`SELECT TRY_CAST(revenue AS DOUBLE) as try_rev, TRY_CAST(quantity AS DOUBLE) as try_qty FROM test`);
  console.table(tryCastRes.toArray().map(r => r.toJSON()));

  console.log("--- REPLACE + TRY_CAST ---");
  const cleanseRes = await conn.query(`
    SELECT 
      revenue,
      TRY_CAST(REPLACE(REPLACE(revenue, ',', ''), 'đ', '') AS DOUBLE) as clean_rev
    FROM test
  `);
  console.table(cleanseRes.toArray().map(r => r.toJSON()));

  console.log("--- AGGREGATIONS ---");
  const aggRes = await conn.query(`
    SELECT 
      SUM(TRY_CAST(REPLACE(REPLACE(revenue, ',', ''), 'đ', '') AS DOUBLE)) as sum_rev,
      AVG(TRY_CAST(REPLACE(REPLACE(revenue, ',', ''), 'đ', '') AS DOUBLE)) as avg_rev,
      SUM(TRY_CAST(quantity AS DOUBLE)) as sum_qty,
      AVG(TRY_CAST(quantity AS DOUBLE)) as avg_qty
    FROM test
  `);
  console.table(aggRes.toArray().map(r => r.toJSON()));

  await conn.close();
  await db.terminate();
  process.exit(0);
}

run().catch(console.error);
