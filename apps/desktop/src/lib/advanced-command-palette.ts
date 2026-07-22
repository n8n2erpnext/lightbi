import type { AdvancedFavorite, AdvancedSchema, AdvancedTableNode } from './advanced-api';
import type { AdvancedHistoryEntry } from './advanced-workspace';
import { compactCount, type QuickCommand, type WorkspaceTab } from './advanced-workspace-helpers';
import type { AdvancedWorkspaceSource } from '../stores/advanced-source-store';

interface AdvancedQuickCommandContext {
  activeTab: WorkspaceTab;
  addFavorite: () => void;
  addTab: () => WorkspaceTab;
  applyFavorite: (entry: AdvancedFavorite) => void;
  applyHistory: (entry: AdvancedHistoryEntry) => void;
  favorites: AdvancedFavorite[];
  history: AdvancedHistoryEntry[];
  onClose: () => void;
  openFileSource: (source: AdvancedWorkspaceSource) => Promise<void>;
  orderedSources: AdvancedWorkspaceSource[];
  runQuery: () => Promise<void>;
  schema: AdvancedSchema | null;
  selectTable: (schemaName: string, table: AdvancedTableNode) => void;
  setActiveTabId: (id: string) => void;
  tabs: WorkspaceTab[];
}

export function buildAdvancedQuickCommands(context: AdvancedQuickCommandContext): QuickCommand[] {
  const runAndClose = (run: () => void): (() => void) => () => {
    run();
    context.onClose();
  };
  return [
    { id: 'action:new-tab', kind: 'action', title: 'New query tab', subtitle: 'Workspace action', keywords: 'new query tab', run: runAndClose(() => context.addTab()) },
    { id: 'action:run-query', kind: 'action', title: 'Run current query', subtitle: 'Execute active tab', keywords: 'run execute current query', run: runAndClose(() => { void context.runQuery(); }) },
    { id: 'action:save-favorite', kind: 'action', title: 'Save current query', subtitle: 'Add to favorites', keywords: 'save favorite current query', run: runAndClose(context.addFavorite) },
    ...(context.schema?.schemas.flatMap(schemaNode => schemaNode.tables.map(table => ({
      id: `table:${schemaNode.name}.${table.name}`,
      kind: 'table' as const,
      title: table.name,
      subtitle: `${schemaNode.name} · ${table.kind}${table.estimatedRows !== undefined && table.estimatedRows !== null ? ` · ~${compactCount(table.estimatedRows)} rows` : ''}`,
      keywords: `${schemaNode.name} ${table.name} ${table.columns.map(column => column.name).join(' ')}`,
      run: runAndClose(() => context.selectTable(schemaNode.name, table)),
    }))) ?? []),
    ...context.tabs.map(tab => ({
      id: `tab:${tab.id}`,
      kind: 'tab' as const,
      title: tab.title,
      subtitle: tab.id === context.activeTab.id ? 'Current tab' : 'Open tab',
      keywords: `${tab.title} ${tab.sql}`,
      run: runAndClose(() => context.setActiveTabId(tab.id)),
    })),
    ...context.favorites.slice(0, 50).map(entry => ({
      id: `favorite:${entry.id}`,
      kind: 'favorite' as const,
      title: entry.name,
      subtitle: 'Favorite query',
      keywords: `${entry.name} ${entry.sql}`,
      run: runAndClose(() => context.applyFavorite(entry)),
    })),
    ...context.history.slice(0, 50).map(entry => ({
      id: `history:${entry.id}`,
      kind: 'history' as const,
      title: entry.sql.replace(/\s+/g, ' ').slice(0, 90),
      subtitle: `${entry.successful ? `${entry.rowCount} rows` : 'Failed'} · ${entry.executionMs} ms`,
      keywords: `${entry.sql} ${entry.database}`,
      run: runAndClose(() => context.applyHistory(entry)),
    })),
    ...context.orderedSources.map(source => ({
      id: `source:${source.id}`,
      kind: 'source' as const,
      title: source.name,
      subtitle: `${source.sourceKind === 'online_link' ? 'Online link' : 'Local file'} · ${source.tables.length} table${source.tables.length === 1 ? '' : 's'}`,
      keywords: `${source.name} ${source.tables.map(table => `${table.name} ${table.columns.join(' ')}`).join(' ')}`,
      run: runAndClose(() => { void context.openFileSource(source); }),
    })),
  ];
}

export function filterAdvancedQuickCommands(commands: QuickCommand[], query: string): QuickCommand[] {
  const needle = query.trim().toLocaleLowerCase();
  const filtered = needle
    ? commands.filter(command => `${command.title} ${command.subtitle} ${command.keywords}`.toLocaleLowerCase().includes(needle))
    : commands;
  return filtered.slice(0, 40);
}
