import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { AdvancedQueryResult } from '../../lib/advanced-api';
import { displayCell } from '../../lib/advanced-workspace-helpers';

export const ResultChart: React.FC<{ result: AdvancedQueryResult }> = ({ result }) => {
  const numericIndex = result.columns.findIndex(column => column.logicalType === 'number');
  const categoryIndex = result.columns.findIndex((column, index) => index !== numericIndex && (column.logicalType === 'string' || column.logicalType === 'date'));
  if (numericIndex < 0 || categoryIndex < 0) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-500">A category/date column and numeric column are required.</div>;
  }
  const numeric = result.columns[numericIndex];
  const category = result.columns[categoryIndex];
  const rows = result.rows.slice(0, 100);
  const option = {
    animation: false,
    tooltip: { trigger: 'axis' },
    grid: { left: 56, right: 24, top: 32, bottom: 64 },
    xAxis: { type: 'category', name: category.name, data: rows.map(row => displayCell(row[categoryIndex] ?? null)), axisLabel: { color: '#6b7280', hideOverlap: true, rotate: rows.length > 18 ? 35 : 0 } },
    yAxis: { type: 'value', name: numeric.name, splitLine: { lineStyle: { color: '#e5e7eb' } } },
    series: [{ name: numeric.name, type: category.logicalType === 'date' ? 'line' : 'bar', data: rows.map(row => Number(row[numericIndex]) || 0), itemStyle: { color: '#2563eb' }, lineStyle: { color: '#2563eb' } }],
  };
  return <ReactECharts option={option} style={{ height: '100%', minHeight: 320 }} />;
};

export const ResultJson: React.FC<{ result: AdvancedQueryResult }> = ({ result }) => {
  const rows = result.rows.map(row => Object.fromEntries(result.columns.map((column, index) => [column.name, row[index] ?? null])));
  return <pre className="h-full min-h-0 overflow-auto bg-gray-950 p-4 font-mono text-[11px] leading-5 text-emerald-200">{JSON.stringify(rows, null, 2)}</pre>;
};

type QueryPlanNode = {
  operation: string;
  relation?: string;
  indexName?: string;
  startupCost?: number;
  totalCost?: number;
  estimatedRows?: number;
  actualTime?: number;
  children: QueryPlanNode[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function numberField(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parsePlanNode(value: unknown): QueryPlanNode | null {
  const record = asRecord(value);
  if (!record) return null;
  const childValues = Array.isArray(record.Plans) ? record.Plans : [];
  return {
    operation: typeof record['Node Type'] === 'string' ? record['Node Type'] : 'Plan node',
    relation: typeof record['Relation Name'] === 'string' ? record['Relation Name'] : undefined,
    indexName: typeof record['Index Name'] === 'string' ? record['Index Name'] : undefined,
    startupCost: numberField(record, 'Startup Cost'),
    totalCost: numberField(record, 'Total Cost'),
    estimatedRows: numberField(record, 'Plan Rows'),
    actualTime: numberField(record, 'Actual Total Time'),
    children: childValues.flatMap(child => {
      const node = parsePlanNode(child);
      return node ? [node] : [];
    }),
  };
}

function parseQueryPlan(plan: unknown): { root: QueryPlanNode | null; planningTime?: number; executionTime?: number } {
  const top = Array.isArray(plan) ? asRecord(plan[0]) : asRecord(plan);
  if (!top) return { root: null };
  const root = parsePlanNode(top.Plan ?? top);
  return {
    root,
    planningTime: numberField(top, 'Planning Time'),
    executionTime: numberField(top, 'Execution Time'),
  };
}

const QueryPlanTreeRow: React.FC<{ node: QueryPlanNode; depth?: number; maxCost: number }> = ({ node, depth = 0, maxCost }) => {
  const costRatio = maxCost > 0 && node.totalCost ? node.totalCost / maxCost : 0;
  const color = costRatio > 0.5 ? 'bg-red-500' : costRatio > 0.2 ? 'bg-amber-500' : costRatio > 0.05 ? 'bg-yellow-400' : 'bg-emerald-500';
  return (
    <>
      <div className="grid min-h-8 grid-cols-[minmax(220px,1fr)_120px_90px_90px] items-center border-b border-gray-100 text-[11px] text-gray-700 hover:bg-blue-50">
        <div className="flex min-w-0 items-center gap-2 px-3" style={{ paddingLeft: 12 + depth * 18 }}>
          <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
          <div className="min-w-0"><div className="truncate font-medium text-gray-900">{node.operation}</div>{(node.relation || node.indexName) && <div className="truncate text-[10px] text-gray-500">{node.relation}{node.indexName ? ` · ${node.indexName}` : ''}</div>}</div>
        </div>
        <div className="px-3 font-mono text-gray-500">{node.startupCost !== undefined && node.totalCost !== undefined ? `${node.startupCost.toFixed(2)}..${node.totalCost.toFixed(2)}` : '-'}</div>
        <div className="px-3 font-mono text-gray-500">{node.estimatedRows?.toLocaleString('en') ?? '-'}</div>
        <div className="px-3 font-mono text-gray-500">{node.actualTime !== undefined ? `${node.actualTime.toFixed(3)}ms` : '-'}</div>
      </div>
      {node.children.map((child, index) => <QueryPlanTreeRow key={`${depth}:${index}:${child.operation}:${child.relation ?? ''}`} node={child} depth={depth + 1} maxCost={maxCost} />)}
    </>
  );
};

export const QueryPlanView: React.FC<{ plan: unknown }> = ({ plan }) => {
  const parsed = useMemo(() => parseQueryPlan(plan), [plan]);
  const maxCost = useMemo(() => {
    const costs: number[] = [];
    const visit = (node: QueryPlanNode | null) => {
      if (!node) return;
      if (node.totalCost !== undefined) costs.push(node.totalCost);
      node.children.forEach(visit);
    };
    visit(parsed.root);
    return Math.max(0, ...costs);
  }, [parsed.root]);
  if (!parsed.root) return <pre className="min-h-0 flex-1 overflow-auto bg-gray-950 p-4 font-mono text-[11px] leading-5 text-emerald-300">{JSON.stringify(plan, null, 2)}</pre>;
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex h-9 shrink-0 items-center gap-3 border-b border-gray-200 bg-gray-50 px-3 text-[11px] text-gray-500">
        <span className="font-semibold text-gray-800">Plan tree</span>
        {parsed.planningTime !== undefined && <span>Planning {parsed.planningTime.toFixed(3)}ms</span>}
        {parsed.executionTime !== undefined && <span>Execution {parsed.executionTime.toFixed(3)}ms</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="grid h-8 min-w-[760px] grid-cols-[minmax(220px,1fr)_120px_90px_90px] items-center border-b border-gray-200 bg-gray-100 px-0 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          <div className="px-3">Operation</div><div className="px-3">Cost</div><div className="px-3">Rows</div><div className="px-3">Actual</div>
        </div>
        <div className="min-w-[760px]"><QueryPlanTreeRow node={parsed.root} maxCost={maxCost} /></div>
      </div>
      <details className="shrink-0 border-t border-gray-200 bg-gray-950 text-emerald-200">
        <summary className="cursor-pointer px-3 py-2 text-[11px] text-gray-300">Raw JSON</summary>
        <pre className="max-h-56 overflow-auto p-3 font-mono text-[11px] leading-5">{JSON.stringify(plan, null, 2)}</pre>
      </details>
    </div>
  );
};

export const ResultStructure: React.FC<{ result: AdvancedQueryResult }> = ({ result }) => {
  const profiles = useMemo(() => result.columns.map((column, columnIndex) => {
    const values = result.rows.map(row => row[columnIndex] ?? null);
    const present = values.filter(value => value !== null);
    const distinct = new Set(present.map(value => typeof value === 'object' ? JSON.stringify(value) : String(value)));
    const numeric = present.map(Number).filter(Number.isFinite);
    return {
      column,
      nulls: values.length - present.length,
      distinct: distinct.size,
      minimum: numeric.length ? Math.min(...numeric) : null,
      maximum: numeric.length ? Math.max(...numeric) : null,
      example: present[0] ?? null,
    };
  }), [result]);
  return (
    <div className="h-full overflow-auto bg-white">
      <table className="w-full min-w-[760px] border-collapse text-left text-[11px]">
        <thead className="sticky top-0 bg-gray-100 text-gray-600"><tr>{['Column', 'Logical type', 'Native type', 'Nulls', 'Distinct', 'Min', 'Max', 'Example'].map(label => <th key={label} className="border-b border-r border-gray-200 px-3 py-2 font-semibold">{label}</th>)}</tr></thead>
        <tbody>{profiles.map(profile => <tr key={profile.column.id} className="border-b border-gray-100 hover:bg-blue-50">
          <td className="border-r border-gray-100 px-3 py-2 font-medium text-gray-800">{profile.column.name}</td>
          <td className="border-r border-gray-100 px-3 py-2">{profile.column.logicalType}</td>
          <td className="border-r border-gray-100 px-3 py-2 font-mono text-gray-500">{profile.column.nativeType || '-'}</td>
          <td className="border-r border-gray-100 px-3 py-2 tabular-nums">{profile.nulls}</td>
          <td className="border-r border-gray-100 px-3 py-2 tabular-nums">{profile.distinct}</td>
          <td className="border-r border-gray-100 px-3 py-2 font-mono">{profile.minimum ?? '-'}</td>
          <td className="border-r border-gray-100 px-3 py-2 font-mono">{profile.maximum ?? '-'}</td>
          <td className="max-w-[260px] truncate px-3 py-2 font-mono" title={displayCell(profile.example)}>{displayCell(profile.example)}</td>
        </tr>)}</tbody>
      </table>
    </div>
  );
};
