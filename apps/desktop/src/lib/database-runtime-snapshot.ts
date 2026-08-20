import type { AdvancedQueryResult } from './advanced-api';

export const DATABASE_RUNTIME_MAX_ROWS = 250_000;

type MaterializeDatabaseRowsArgs = {
  firstPage: AdvancedQueryResult;
  expectedRows?: number | null;
  pageSize: number;
  fetchPage: (offset: number, limit: number) => Promise<AdvancedQueryResult>;
  maxRows?: number;
};

export async function materializeDatabaseRows({
  firstPage,
  expectedRows,
  pageSize,
  fetchPage,
  maxRows = DATABASE_RUNTIME_MAX_ROWS,
}: MaterializeDatabaseRowsArgs): Promise<AdvancedQueryResult> {
  if (expectedRows != null && expectedRows > maxRows) {
    throw new Error(`This table has ${expectedRows.toLocaleString()} rows. Easy Mode currently supports complete database snapshots up to ${maxRows.toLocaleString()} rows.`);
  }

  const columns = firstPage.columns;
  const rows = [...firstPage.rows];
  let page = firstPage;
  let offset = rows.length;

  while (page.page.hasMore || (expectedRows != null && offset < expectedRows)) {
    if (offset >= maxRows) {
      throw new Error(`This table exceeds the Easy Mode complete-snapshot limit of ${maxRows.toLocaleString()} rows.`);
    }
    page = await fetchPage(offset, Math.min(pageSize, maxRows - offset));
    if (page.columns.length !== columns.length || page.columns.some((column, index) => column.name !== columns[index]?.name)) {
      throw new Error('The database schema changed while LightBI was materializing the table. Inspect the source again.');
    }
    if (page.rows.length === 0) {
      throw new Error('The database stopped returning rows before the complete table snapshot was available.');
    }
    rows.push(...page.rows);
    offset += page.rows.length;
  }

  if (expectedRows != null && rows.length !== expectedRows) {
    throw new Error(`The complete database snapshot is inconsistent: expected ${expectedRows.toLocaleString()} rows but received ${rows.length.toLocaleString()}.`);
  }

  return {
    ...firstPage,
    rows,
    page: { ...firstPage.page, offset: 0, limit: rows.length, hasMore: false, estimatedTotal: rows.length },
    truncated: false,
    warnings: [...firstPage.warnings, 'Complete read-only database snapshot materialized for governed Easy Mode analysis.'],
  };
}
