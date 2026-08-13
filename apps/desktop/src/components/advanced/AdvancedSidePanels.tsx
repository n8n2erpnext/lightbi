import React, { useState } from 'react';
import { Braces, ChevronDown, ChevronRight, Database, Loader2, Search, Table2, X } from 'lucide-react';
import type { AdvancedFavorite, AdvancedSchema, AdvancedTableNode } from '../../lib/advanced-api';
import type { AdvancedHistoryEntry } from '../../lib/advanced-workspace';
import { compactCount } from '../../lib/advanced-workspace-helpers';

export const SchemaTree: React.FC<{
  schema: AdvancedSchema;
  onSelectTable: (schemaName: string, table: AdvancedTableNode) => void;
  exactCounts: Record<string, { status: 'loading' | 'ready' | 'failed'; count?: number }>;
  onRequestCount: (schemaName: string, table: AdvancedTableNode) => void;
}> = ({ schema, onSelectTable, exactCounts, onRequestCount }) => {
  const [expandedSchemas, setExpandedSchemas] = useState<Record<string, boolean>>({ public: true });
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLocaleLowerCase();
  return (
    <div className="py-1 text-[12px]">
      <label className="mx-2 mb-1 flex h-7 items-center gap-1.5 border border-gray-200 bg-white px-2 text-gray-400"><Search className="h-3 w-3" /><input aria-label="Search tables" value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[11px] text-gray-700 outline-none" placeholder="Search tables" /></label>
      {schema.schemas.map(schemaNode => {
        const visibleTables = normalizedSearch ? schemaNode.tables.filter(table => table.name.toLocaleLowerCase().includes(normalizedSearch)) : schemaNode.tables;
        if (normalizedSearch && visibleTables.length === 0) return null;
        const schemaOpen = expandedSchemas[schemaNode.name] ?? false;
        return (
          <div key={schemaNode.name}>
            <button className="flex h-7 w-full items-center gap-1 px-2 text-left font-medium text-gray-700 hover:bg-gray-100" onClick={() => setExpandedSchemas(current => ({ ...current, [schemaNode.name]: !schemaOpen }))}>
              {schemaOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              <Database className="h-3.5 w-3.5 text-gray-400" />
              <span className="truncate">{schemaNode.name}</span>
              <span className="ml-auto text-[10px] font-normal text-gray-400">{schemaNode.tables.length}</span>
            </button>
            {(schemaOpen || normalizedSearch) && visibleTables.map(table => {
              const key = `${schemaNode.name}.${table.name}`;
              const tableOpen = expandedTables[key] ?? false;
              const indexCount = table.indexes?.length ?? 0;
              const foreignKeyCount = table.foreignKeys?.length ?? 0;
              return (
                <div key={key}>
                  <div className="flex h-7 items-center pl-6 pr-2 text-gray-600 hover:bg-blue-50 hover:text-blue-700">
                    <button className="p-1" onClick={() => {
                      setExpandedTables(current => ({ ...current, [key]: !tableOpen }));
                      if (!tableOpen) onRequestCount(schemaNode.name, table);
                    }} title="Toggle columns">
                      {tableOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    </button>
                    <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => onSelectTable(schemaNode.name, table)} title={`Open ${key}`}>
                      <Table2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{table.name}</span>
                      {(indexCount > 0 || foreignKeyCount > 0) && <span className="shrink-0 font-mono text-[8px] text-blue-500">{indexCount}i/{foreignKeyCount}fk</span>}
                      <span className="ml-auto shrink-0 text-[10px] text-gray-400">
                        {exactCounts[key]?.status === 'loading' ? <Loader2 className="h-3 w-3 animate-spin" /> : exactCounts[key]?.status === 'ready' ? compactCount(exactCounts[key].count) : table.estimatedRows !== undefined && table.estimatedRows !== null ? `~${compactCount(table.estimatedRows)}` : ''}
                      </span>
                    </button>
                  </div>
                  {tableOpen && table.comment && <div className="truncate pl-12 pr-2 text-[10px] italic text-gray-400" title={table.comment}>{table.comment}</div>}
                  {tableOpen && table.columns.map(column => (
                    <div key={`${key}.${column.name}`} className="flex h-6 items-center gap-2 pl-12 pr-2 text-[11px] text-gray-500" title={[column.comment, column.defaultValue ? `default ${column.defaultValue}` : ''].filter(Boolean).join(' · ') || undefined}>
                      <span className="truncate">{column.name}</span>
                      {column.primaryKey && <span className="shrink-0 bg-amber-100 px-1 text-[8px] font-semibold text-amber-800">PK</span>}
                      {column.defaultValue && <span className="shrink-0 bg-gray-100 px-1 text-[8px] text-gray-500">DEF</span>}
                      <span className="ml-auto shrink-0 font-mono text-[9px] text-gray-400">{column.nativeType}{column.nullable ? '?' : ''}</span>
                    </div>
                  ))}
                  {tableOpen && indexCount > 0 && <div className="pl-12 pr-2 text-[10px] text-blue-500">Indexes: {table.indexes!.slice(0, 3).map(index => index.name).join(', ')}{indexCount > 3 ? ` +${indexCount - 3}` : ''}</div>}
                  {tableOpen && foreignKeyCount > 0 && <div className="pl-12 pr-2 text-[10px] text-purple-500">FK: {table.foreignKeys!.slice(0, 2).map(fk => fk.name).join(', ')}{foreignKeyCount > 2 ? ` +${foreignKeyCount - 2}` : ''}</div>}
                </div>
              );
            })}
          </div>
        );
      })}
      {schema.schemas.some(schemaNode => (schemaNode.routines?.length ?? 0) > 0) && <div className="mt-2 border-t border-gray-200 pt-2">
        {schema.schemas.flatMap(schemaNode => (schemaNode.routines || []).slice(0, 5).map(routine => (
          <div key={`${schemaNode.name}.${routine.name}`} className="flex h-6 items-center gap-2 px-3 text-[10px] text-gray-500"><Braces className="h-3 w-3 text-gray-400" /><span className="truncate">{routine.name}</span><span className="ml-auto uppercase text-[8px] text-gray-400">{routine.kind}</span></div>
        )))}
      </div>}
    </div>
  );
};

export const HistoryPanel: React.FC<{
  entries: AdvancedHistoryEntry[];
  onSelect: (entry: AdvancedHistoryEntry) => void;
  onClear: () => void;
}> = ({ entries, onSelect, onClear }) => (
  <div className="flex h-full flex-col">
    <div className="flex h-8 items-center justify-between border-b border-gray-200 px-2 text-[10px] text-gray-500">
      <span>{entries.length} executions</span>
      <button className="px-1.5 py-1 hover:bg-gray-200" onClick={onClear}>Clear</button>
    </div>
    <div className="flex-1 overflow-auto">
      {entries.map(entry => (
        <button key={entry.id} className="block w-full border-b border-gray-200 px-3 py-2 text-left hover:bg-gray-100" onClick={() => onSelect(entry)}>
          <div className="truncate font-mono text-[11px] text-gray-700">{entry.sql.replace(/\s+/g, ' ')}</div>
          <div className="mt-1 flex items-center gap-2 text-[9px] text-gray-400">
            <span className={entry.successful ? 'text-emerald-600' : 'text-red-600'}>{entry.successful ? `${entry.rowCount} rows` : 'Failed'}</span>
            <span>{entry.executionMs} ms</span>
            <span className="ml-auto">{new Date(entry.executedAt).toLocaleTimeString()}</span>
          </div>
        </button>
      ))}
      {entries.length === 0 && <div className="p-3 text-[11px] text-gray-400">No query history.</div>}
    </div>
  </div>
);

export const FavoritesPanel: React.FC<{
  entries: AdvancedFavorite[];
  onSelect: (entry: AdvancedFavorite) => void;
  onDelete: (entry: AdvancedFavorite) => void;
}> = ({ entries, onSelect, onDelete }) => (
  <div className="h-full overflow-auto">
    {entries.map(entry => (
      <div key={entry.id} className="flex border-b border-gray-200 hover:bg-gray-100">
        <button className="min-w-0 flex-1 px-3 py-2 text-left" onClick={() => onSelect(entry)}>
          <div className="truncate text-[11px] font-medium text-gray-700">{entry.name}</div>
          <div className="mt-1 truncate font-mono text-[9px] text-gray-400">{entry.sql.replace(/\s+/g, ' ')}</div>
        </button>
        <button className="shrink-0 p-2 text-gray-400 hover:text-red-600" onClick={() => onDelete(entry)} title="Delete favorite"><X className="h-3.5 w-3.5" /></button>
      </div>
    ))}
    {entries.length === 0 && <div className="p-3 text-[11px] text-gray-400">No saved queries.</div>}
  </div>
);

