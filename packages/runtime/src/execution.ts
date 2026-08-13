import type {
  QueryCellValue,
  QueryResultBuffer,
  QueryResultColumn
} from '@lightbi/core-types';

export type ExecutionRun = {
  id: string;
  generation: number;
  signal: AbortSignal;
};

export class ExecutionRunCoordinator {
  private generation = 0;
  private active: { run: ExecutionRun; controller: AbortController } | null = null;
  private readonly scope: string;

  constructor(scope: string) {
    this.scope = scope;
  }

  begin(): ExecutionRun {
    if (this.active) {
      this.active.controller.abort();
      this.active = null;
    }
    const controller = new AbortController();
    const generation = ++this.generation;
    const run = {
      id: `${this.scope}:${generation}`,
      generation,
      signal: controller.signal
    };
    this.active = { run, controller };
    return run;
  }

  isCurrent(run: ExecutionRun): boolean {
    return this.active?.run.id === run.id && !run.signal.aborted;
  }

  finish(run: ExecutionRun): boolean {
    if (!this.isCurrent(run)) return false;
    this.active = null;
    return true;
  }

  cancel(): void {
    if (this.active) {
      this.active.controller.abort();
      this.active = null;
    }
    this.generation += 1;
  }
}

type CreateQueryResultBufferInput = {
  runId: string;
  columns: string[];
  rows: Record<string, unknown>[];
  limit: number;
  totalRowCount?: number;
  truncated?: boolean;
};

function normalizeCell(value: unknown): QueryCellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  return JSON.stringify(value) ?? String(value);
}

function inferLogicalType(rows: Record<string, unknown>[], column: string): QueryResultColumn['logicalType'] {
  for (const row of rows) {
    const value = row[column];
    if (value === null || value === undefined) continue;
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (typeof value === 'string') return 'string';
    return 'unknown';
  }
  return 'unknown';
}

export function createQueryResultBuffer(input: CreateQueryResultBufferInput): QueryResultBuffer {
  const columns = input.columns.map((name, index) => ({
    id: `column:${index}:${name}`,
    name,
    logicalType: inferLogicalType(input.rows, name)
  }));
  const rows = input.rows.map(row => columns.map(column => normalizeCell(row[column.name])));
  const total = input.totalRowCount ?? rows.length;
  const truncated = input.truncated ?? total > rows.length;

  return {
    runId: input.runId,
    columns,
    rows,
    page: {
      offset: 0,
      limit: input.limit,
      hasMore: truncated,
      estimatedTotal: input.totalRowCount
    },
    truncated
  };
}

export function queryResultBufferToRows(buffer: QueryResultBuffer): Record<string, QueryCellValue>[] {
  return buffer.rows.map(values => Object.fromEntries(
    buffer.columns.map((column, index) => [column.name, values[index] ?? null])
  ));
}
