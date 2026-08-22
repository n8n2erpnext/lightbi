import * as XLSX from 'xlsx';
import type { Dispatch, SetStateAction } from 'react';
import type { QueryCellValue } from '@lightbi/core-types';
import { cancelAdvancedExportJob, cancelAdvancedImportJob, commitAdvancedMutation, downloadAdvancedExportJob, executeAdvancedDocumentQuery, executeAdvancedQuery, loadAdvancedExportJob, startAdvancedExport, type AdvancedConnection, type AdvancedFilter, type AdvancedFilterGroup, type AdvancedQueryResult, type AdvancedSort, type AdvancedTableNode } from '../lib/advanced-api';
import { advancedResultToCsv, createAdvancedId, createAdvancedTab, splitAdvancedStatements, type AdvancedHistoryEntry } from '../lib/advanced-workspace';
import { CREATE_NEW_IMPORT_TARGET, copyTextToClipboard, hydrateTab, importColumnSqlType, materializeSqlParameters, qualifiedTableReference, quoteIdentifier, quoteMysqlIdentifier, resultRowsAsObjects, sqlLiteral, type ImportDraft, type WorkspaceTab } from '../lib/advanced-workspace-helpers';
import type { AdvancedWorkspaceSource } from '../stores/advanced-source-store';
import type { AdvancedFileSession } from '../lib/advanced-file-session';
import { createInvestigationSession } from '../lib/investigation-session';
import { classifyAdvancedResultCompleteness, createAdvancedResultHandoff, materializeAdvancedResultPages } from '../lib/advanced-result-handoff';

type TabPatch = Partial<WorkspaceTab> | ((tab: WorkspaceTab) => Partial<WorkspaceTab>);

interface AdvancedResultTransferContext {
  activeTab: WorkspaceTab;
  addTab: (initial?: Partial<WorkspaceTab>) => WorkspaceTab;
  connection: AdvancedConnection | null;
  displayResult: AdvancedQueryResult | null;
  exportCancelRef: { current: boolean };
  exportJobIdRef: { current: string | null };
  fileSession: { current: AdvancedFileSession };
  fileSource: AdvancedWorkspaceSource | null;
  hasActivePendingChanges: boolean;
  importDraft: ImportDraft;
  importJobIdRef: { current: string | null };
  patchTab: (id: string, patch: TabPatch) => void;
  recordHistory: (entry: Omit<AdvancedHistoryEntry, 'id' | 'executedAt' | 'database'>) => void;
  refreshSchema: () => Promise<void>;
  runQuery: (tabId?: string, options?: { offset?: number; sort?: AdvancedSort; filters?: AdvancedFilter[]; sql?: string }) => Promise<void>;
  setActiveTabId: Dispatch<SetStateAction<string>>;
  setExportProgress: Dispatch<SetStateAction<{ format: string; rows: number } | null>>;
  setImportDraft: Dispatch<SetStateAction<ImportDraft>>;
  setIsExportingAll: Dispatch<SetStateAction<boolean>>;
  setTabs: Dispatch<SetStateAction<WorkspaceTab[]>>;
  sources: AdvancedWorkspaceSource[];
  tabs: WorkspaceTab[];
  workspaceProvider: AdvancedConnection['provider'] | 'duckdb';
  writableTables: Array<{ schemaName: string; table: AdvancedTableNode }>;
}

export function createAdvancedResultTransferActions(context: AdvancedResultTransferContext) {
  const { activeTab, addTab, connection, displayResult, exportCancelRef, exportJobIdRef, fileSession, fileSource, hasActivePendingChanges, importDraft, importJobIdRef, patchTab, recordHistory, refreshSchema, runQuery, setActiveTabId, setExportProgress, setImportDraft, setIsExportingAll, setTabs, sources, tabs, workspaceProvider, writableTables } = context;
  const importSourceIntoTable = async () => {
    if (!connection || connection.provider === 'mongodb') return;
    const source = sources.find(item => item.id === importDraft.sourceId);
    const sourceTable = source?.tables.find(table => table.name === importDraft.tableName);
    if (importDraft.target === CREATE_NEW_IMPORT_TARGET) {
      if (!source || !sourceTable || !importDraft.newTableName.trim()) {
        setImportDraft(current => ({ ...current, error: 'Choose a source table and new target table name.' }));
        return;
      }
      setImportDraft(current => ({ ...current, running: true, importedRows: 0, error: '' }));
      try {
        await fileSession.current.open(source);
        const targetRef = qualifiedTableReference(workspaceProvider, importDraft.newSchemaName || 'public', importDraft.newTableName.trim());
        const columns = sourceTable.columns;
        const createSql = `CREATE TABLE ${targetRef} (\n${columns.map(column => `  ${workspaceProvider === 'mysql' || workspaceProvider === 'mariadb' ? quoteMysqlIdentifier(column) : quoteIdentifier(column)} ${importColumnSqlType(sourceTable.profiles[column]?.dataType)}`).join(',\n')}\n);`;
        const insertColumns = columns.map(column => workspaceProvider === 'mysql' || workspaceProvider === 'mariadb' ? quoteMysqlIdentifier(column) : quoteIdentifier(column)).join(', ');
        const statements: string[] = [createSql];
        let offset = 0;
        let importedRows = 0;
        for (let batch = 0; batch < 1000; batch += 1) {
          const page = await fileSession.current.execute({ runId: createAdvancedId(), sql: `SELECT * FROM ${quoteIdentifier(sourceTable.name)}`, limit: 100, offset });
          if (page.rows.length === 0) break;
          const columnIndex = new Map(page.columns.map((column, index) => [column.name, index]));
          statements.push(...page.rows.map(row => `INSERT INTO ${targetRef} (${insertColumns}) VALUES (${columns.map(column => sqlLiteral(row[columnIndex.get(column)!] ?? null)).join(', ')});`));
          importedRows += page.rows.length;
          setImportDraft(current => ({ ...current, importedRows }));
          if (!page.page.hasMore) break;
          offset += page.rows.length;
        }
        addTab({ title: `${importDraft.newTableName.trim()} import`, sql: statements.join('\n'), limit: activeTab.limit, parameters: {} });
        setImportDraft(current => ({ ...current, running: false, open: false, error: '' }));
      } catch (cause) {
        setImportDraft(current => ({ ...current, running: false, error: cause instanceof Error ? cause.message : 'Import script failed.' }));
      }
      return;
    }
    const [schemaName, tableName] = importDraft.target.split('.');
    const targetTable = writableTables.find(item => item.schemaName === schemaName && item.table.name === tableName)?.table;
    if (!source || !sourceTable || !targetTable) {
      setImportDraft(current => ({ ...current, error: 'Choose a source table and writable DB target.' }));
      return;
    }
    const mappedColumns = targetTable.columns
      .filter(column => !column.primaryKey)
      .flatMap(column => {
        const sourceColumn = importDraft.columnMap[column.name];
        return sourceColumn && sourceTable.columns.includes(sourceColumn) ? [{ target: column.name, source: sourceColumn }] : [];
      });
    if (mappedColumns.length === 0) {
      setImportDraft(current => ({ ...current, error: 'Map at least one source column to a target column.' }));
      return;
    }
    setImportDraft(current => ({ ...current, running: true, importedRows: 0, error: '' }));
    try {
      await fileSession.current.open(source);
      let offset = 0;
      let importedRows = 0;
      for (let batch = 0; batch < 1000; batch += 1) {
        const page = await fileSession.current.execute({ runId: createAdvancedId(), sql: `SELECT * FROM ${quoteIdentifier(sourceTable.name)}`, limit: 100, offset });
        if (page.rows.length === 0) break;
        const columnIndex = new Map(page.columns.map((column, index) => [column.name, index]));
        await commitAdvancedMutation(connection.connectionId, {
          schema: schemaName,
          table: tableName,
          rows: page.rows.map(row => ({
            action: 'insert',
            key: {},
            expected: {},
            changes: Object.fromEntries(mappedColumns.map(column => [column.target, row[columnIndex.get(column.source)!] ?? null])),
          })),
        });
        importedRows += page.rows.length;
        setImportDraft(current => ({ ...current, importedRows }));
        if (!page.page.hasMore) break;
        offset += page.rows.length;
      }
      setImportDraft(current => ({ ...current, running: false, error: '' }));
      patchTab(activeTab.id, { warnings: [`Imported ${importedRows.toLocaleString('en')} rows into ${schemaName}.${tableName}.`] });
      await refreshSchema();
    } catch (cause) {
      setImportDraft(current => ({ ...current, running: false, error: cause instanceof Error ? cause.message : 'Import failed.' }));
    }
  };

  const runAllStatements = async () => {
    if ((!connection && !fileSource) || connection?.provider === 'mongodb') return;
    const statements = splitAdvancedStatements(materializeSqlParameters(activeTab.sql, activeTab.parameters));
    if (statements.length <= 1) { void runQuery(); return; }
    patchTab(activeTab.id, { isRunning: true, error: '' });
    const completed: WorkspaceTab[] = [];
    for (const [index, sql] of statements.entries()) {
      const tab = hydrateTab(createAdvancedTab(tabs.length + index + 1, { title: `Result ${index + 1}`, sql, limit: activeTab.limit }));
      try {
        tab.result = fileSource
          ? await fileSession.current.execute({ runId: createAdvancedId(), sql, limit: tab.limit })
          : await executeAdvancedQuery(connection!.connectionId, { runId: createAdvancedId(), sql, limit: tab.limit });
        tab.filterColumn = tab.result.columns[0]?.name || '';
        recordHistory({ sql, executionMs: tab.result.executionMs, rowCount: tab.result.rows.length, successful: true });
      } catch (cause) {
        tab.error = cause instanceof Error ? cause.message : 'Query failed.';
        recordHistory({ sql, executionMs: 0, rowCount: 0, successful: false, error: tab.error });
      }
      completed.push(tab);
    }
    patchTab(activeTab.id, { isRunning: false });
    setTabs(current => [...current, ...completed].slice(0, 12));
    if (completed.length) setActiveTabId(completed[completed.length - 1].id);
  };

  const downloadBlob = (name: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const cancelFullExport = () => {
    exportCancelRef.current = true;
    if (exportJobIdRef.current) void cancelAdvancedExportJob(exportJobIdRef.current);
  };

  const cancelSqlImport = () => {
    if (importJobIdRef.current) void cancelAdvancedImportJob(importJobIdRef.current);
  };

  const exportResult = (format: 'csv' | 'xlsx' | 'json' | 'sql' = 'csv') => {
    if (!displayResult) return;
    const baseName = activeTab.title.replace(/[^a-z0-9_-]+/gi, '_') || 'lightbi-result';
    if (format === 'xlsx') {
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(resultRowsAsObjects(displayResult));
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Result');
      const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
      downloadBlob(`${baseName}.xlsx`, new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      return;
    }
    if (format === 'json') {
      downloadBlob(`${baseName}.json`, new Blob([JSON.stringify(resultRowsAsObjects(displayResult), null, 2)], { type: 'application/json;charset=utf-8' }));
      return;
    }
    if (format === 'sql') {
      const tableName = quoteIdentifier(activeTab.tableContext?.table || baseName);
      const columns = displayResult.columns.map(column => quoteIdentifier(column.name)).join(', ');
      const statements = displayResult.rows.map(row => `INSERT INTO ${tableName} (${columns}) VALUES (${row.map(sqlLiteral).join(', ')});`).join('\n');
      downloadBlob(`${baseName}.sql`, new Blob([statements], { type: 'application/sql;charset=utf-8' }));
      return;
    }
    downloadBlob(`${baseName}.csv`, new Blob([advancedResultToCsv(displayResult.columns, displayResult.rows)], { type: 'text/csv;charset=utf-8' }));
  };

  const openResultInSimple = (result: AdvancedQueryResult, sql: string, title = activeTab.title) => {
    const handoff = createAdvancedResultHandoff({
      datasetId: `advanced:${title}:${Date.now()}`,
      title,
      provider: workspaceProvider,
      sql,
      configuration: {
        resultView: activeTab.resultView,
        visibleColumns: displayResult.columns.map(column => column.name),
        filters: activeTab.filters.map(filter => ({ ...filter })),
        filterCombinator: activeTab.filterCombinator,
        sort: activeTab.sort ? { ...activeTab.sort } : null,
        tableContext: activeTab.tableContext ? { ...activeTab.tableContext } : null,
      },
    }, result);
    createInvestigationSession(
      handoff.datasetId,
      handoff.analysisAction,
      handoff.runtimeIntent,
      handoff.runtimePlanPreview,
      handoff.rows,
      handoff.aiBriefing,
      undefined,
      handoff.rowScope,
      undefined,
      undefined,
      handoff.canonicalHandoff
    );
    const investigationPath = window.location.pathname.startsWith('/app') ? '/app/investigation' : '/investigation';
    window.history.pushState(null, '', investigationPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const analyzeActiveResultInSimple = () => {
    if (!displayResult) return;
    if (displayResult.rows.length === 0) {
      patchTab(activeTab.id, { warnings: ['Run a query with rows before creating a Simple BA brief.'] });
      return;
    }
    const completeness = classifyAdvancedResultCompleteness(displayResult);
    if (completeness.state !== 'complete') {
      patchTab(activeTab.id, { warnings: [`This result is ${completeness.state}. Full-source governed analysis is unavailable until a complete result is materialized.`] });
      return;
    }
    openResultInSimple(displayResult, materializeSqlParameters(activeTab.sql, activeTab.parameters));
  };

  const fetchQueryPage = async (tab: WorkspaceTab, offset: number, limit: number, runId: string): Promise<AdvancedQueryResult> => {
    const filters = tab.filters;
    const filterTree: AdvancedFilterGroup | undefined = filters.length ? { combinator: tab.filterCombinator, children: filters } : undefined;
    const executableSql = materializeSqlParameters(tab.sql, tab.parameters);
    if (fileSource) return fileSession.current.execute({ runId, sql: executableSql, limit, offset, sort: tab.sort, filters, filterTree });
    if (!connection) throw new Error('No active connection.');
    if (connection.provider === 'mongodb') return executeAdvancedDocumentQuery(connection.connectionId, { ...JSON.parse(tab.sql), runId, limit, offset });
    return executeAdvancedQuery(connection.connectionId, { runId, sql: executableSql, limit, offset, sort: tab.sort, filters, filterTree });
  };

  const returnFullSourceToEasy = async () => {
    if (hasActivePendingChanges) {
      patchTab(activeTab.id, { warnings: ['Commit or discard pending edits before returning to Easy analysis.'] });
      return;
    }
    if (!activeTab.tableContext) {
      patchTab(activeTab.id, { warnings: ['Choose a source table before returning to Easy analysis.'] });
      return;
    }
    const sql = workspaceProvider === 'mongodb'
      ? activeTab.sql
      : `SELECT * FROM ${qualifiedTableReference(workspaceProvider, activeTab.tableContext.schema, activeTab.tableContext.table)}`;
    const materializeTab = { ...activeTab, sql, filters: [], sort: undefined, offset: 0 } as WorkspaceTab;
    patchTab(activeTab.id, { isRunning: true, warnings: ['Refreshing the complete post-edit source for Easy analysis…'], error: '' });
    try {
      const pages: AdvancedQueryResult[] = [];
      let offset = 0;
      const pageSize = 1000;
      for (let pageIndex = 0; pageIndex < 1000; pageIndex += 1) {
        const page = await fetchQueryPage(materializeTab, offset, pageSize, createAdvancedId());
        pages.push(page);
        if (!page.page.hasMore) break;
        offset += page.rows.length;
        if (page.rows.length === 0 || pageIndex === 999) throw new Error('The refreshed source exceeds the safe full-source materialization boundary.');
      }
      const complete = materializeAdvancedResultPages(pages);
      if (complete.rows.length === 0) throw new Error('The refreshed source contains no rows to analyze.');
      patchTab(activeTab.id, { isRunning: false, result: complete, warnings: [`Refreshed ${complete.rows.length.toLocaleString('en')} post-edit rows and returned them to Easy analysis.`] });
      openResultInSimple(complete, sql, `${activeTab.tableContext.schema}.${activeTab.tableContext.table}`);
    } catch (cause) {
      patchTab(activeTab.id, { isRunning: false, error: cause instanceof Error ? cause.message : 'Could not refresh the post-edit source for Easy analysis.' });
    }
  };

  const exportAllResult = async (format: 'csv' | 'xlsx' | 'json' | 'sql' = 'csv') => {
    if ((!connection && !fileSource) || !activeTab.sql.trim()) return;
    if (hasActivePendingChanges) {
      patchTab(activeTab.id, { warnings: ['Discard or commit pending edits before exporting the full result.'] });
      return;
    }
    const baseName = activeTab.title.replace(/[^a-z0-9_-]+/gi, '_') || 'lightbi-result';
    exportCancelRef.current = false;
    exportJobIdRef.current = null;
    setIsExportingAll(true);
    setExportProgress({ format: format.toUpperCase(), rows: 0 });
    try {
      if (connection && connection.provider !== 'mongodb') {
        const filters = activeTab.filters;
        const filterTree: AdvancedFilterGroup | undefined = filters.length ? { combinator: activeTab.filterCombinator, children: filters } : undefined;
        const started = await startAdvancedExport(connection.connectionId, {
          sql: materializeSqlParameters(activeTab.sql, activeTab.parameters),
          format,
          fileName: baseName,
          tableName: activeTab.tableContext?.table || baseName,
          sort: activeTab.sort,
          filters,
          filterTree,
        });
        exportJobIdRef.current = started.jobId;
        for (let attempt = 0; attempt < 600; attempt += 1) {
          if (exportCancelRef.current) {
            await cancelAdvancedExportJob(started.jobId).catch(() => undefined);
            patchTab(activeTab.id, { warnings: [`Cancelled ${format.toUpperCase()} export.`] });
            return;
          }
          const job = await loadAdvancedExportJob(started.jobId);
          setExportProgress({ format: format.toUpperCase(), rows: job.rows });
          if (job.status === 'failed') throw new Error(job.error || 'Backend export failed.');
          if (job.status === 'cancelled') {
            patchTab(activeTab.id, { warnings: [`Cancelled ${format.toUpperCase()} export after ${job.rows.toLocaleString('en')} rows.`] });
            return;
          }
          if (job.status === 'completed') {
            const blob = await downloadAdvancedExportJob(started.jobId);
            downloadBlob(job.fileName, blob);
            patchTab(activeTab.id, { warnings: [`Exported ${job.rows.toLocaleString('en')} rows to ${format.toUpperCase()} with backend worker.`] });
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        throw new Error('Backend export did not finish in time.');
      }
      const pageSize = Math.max(1000, activeTab.limit);
      const chunks: string[] = [];
      const allRows: QueryCellValue[][] = [];
      let columns = activeTab.result?.columns ?? [];
      let offset = 0;
      let totalRows = 0;
      for (let page = 0; page < 200; page += 1) {
        if (exportCancelRef.current) {
          patchTab(activeTab.id, { warnings: [`Cancelled ${format.toUpperCase()} export after ${totalRows.toLocaleString('en')} rows.`] });
          return;
        }
        const result = await fetchQueryPage(activeTab, offset, pageSize, createAdvancedId());
        if (page === 0) columns = result.columns;
        if (format === 'csv') {
          const csv = advancedResultToCsv(result.columns, result.rows);
          chunks.push(page === 0 ? csv : csv.split(/\r?\n/).slice(1).join('\n'));
        } else {
          allRows.push(...result.rows);
        }
        totalRows += result.rows.length;
        setExportProgress({ format: format.toUpperCase(), rows: totalRows });
        if (!result.page.hasMore || result.rows.length === 0) break;
        offset = result.page.offset + result.rows.length;
      }
      if (exportCancelRef.current) {
        patchTab(activeTab.id, { warnings: [`Cancelled ${format.toUpperCase()} export after ${totalRows.toLocaleString('en')} rows.`] });
        return;
      }
      if (format === 'xlsx') {
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(allRows.map(row => Object.fromEntries(columns.map((column, index) => [column.name, row[index] ?? null]))));
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Result');
        const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
        downloadBlob(`${baseName}.full.xlsx`, new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      } else if (format === 'json') {
        const objects = allRows.map(row => Object.fromEntries(columns.map((column, index) => [column.name, row[index] ?? null])));
        downloadBlob(`${baseName}.full.json`, new Blob([JSON.stringify(objects, null, 2)], { type: 'application/json;charset=utf-8' }));
      } else if (format === 'sql') {
        const tableName = quoteIdentifier(activeTab.tableContext?.table || baseName);
        const names = columns.map(column => quoteIdentifier(column.name)).join(', ');
        const statements = allRows.map(row => `INSERT INTO ${tableName} (${names}) VALUES (${row.map(sqlLiteral).join(', ')});`).join('\n');
        downloadBlob(`${baseName}.full.sql`, new Blob([statements], { type: 'application/sql;charset=utf-8' }));
      } else {
        downloadBlob(`${baseName}.full.csv`, new Blob([chunks.join('\n')], { type: 'text/csv;charset=utf-8' }));
      }
      patchTab(activeTab.id, { warnings: [`Exported ${totalRows.toLocaleString('en')} rows to ${format.toUpperCase()}.`] });
    } catch (cause) {
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'Full export failed.' });
    } finally {
      setIsExportingAll(false);
      setExportProgress(null);
      exportCancelRef.current = false;
      exportJobIdRef.current = null;
    }
  };

  const copyResult = async () => {
    if (!displayResult) return;
    const text = advancedResultToCsv(displayResult.columns, displayResult.rows);
    await copyTextToClipboard(text);
  };


  return { analyzeActiveResultInSimple, cancelFullExport, cancelSqlImport, copyResult, exportAllResult, exportResult, importSourceIntoTable, returnFullSourceToEasy, runAllStatements };
}
