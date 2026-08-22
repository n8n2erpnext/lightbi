import type React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import * as XLSX from 'xlsx';
import type { QueryCellValue } from '@lightbi/core-types';
import { commitAdvancedMutation, loadAdvancedImportJob, previewAdvancedMutation, previewAdvancedScript, startAdvancedCsvImport, startAdvancedSqlImport, type AdvancedConnection, type AdvancedMutationPreview, type AdvancedMutationRequest, type AdvancedQueryResult, type AdvancedSchema, type AdvancedScriptPreview, type AdvancedTableNode } from '../lib/advanced-api';
import { buildAdvancedMutationRows, EMPTY_ADVANCED_EDIT_STATE, recordAdvancedCellEdit } from '../lib/advanced-edit-session';
import { buildDeleteMutationRows, buildInsertMutationRows, buildManualInsertMutationRows, coerceInsertDraftValue, materializeSqlParameters, type FileTableImportDraft, type WorkspaceTab } from '../lib/advanced-workspace-helpers';
import { trackFeatureUsage } from '../lib/app-usage-telemetry';

type MutationReview = { request: AdvancedMutationRequest; preview: AdvancedMutationPreview } | null;
type ScriptReview = { sql: string; preview: AdvancedScriptPreview } | null;
type TabPatch = Partial<WorkspaceTab> | ((tab: WorkspaceTab) => Partial<WorkspaceTab>);

interface AdvancedMutationContext {
  activeResult: AdvancedQueryResult | null;
  activeTab: WorkspaceTab;
  activeTableNode: AdvancedTableNode | undefined;
  addTab: (initial?: Partial<WorkspaceTab>) => WorkspaceTab;
  connection: AdvancedConnection | null;
  displayResult: AdvancedQueryResult | null;
  fileImportDraft: FileTableImportDraft;
  importJobIdRef: { current: string | null };
  insertDraft: { open: boolean; values: Record<string, string> };
  mutationReview: MutationReview;
  patchTab: (id: string, patch: TabPatch) => void;
  refreshSchema: () => Promise<void>;
  schema: AdvancedSchema | null;
  scriptReview: ScriptReview;
  setFileImportDraft: Dispatch<SetStateAction<FileTableImportDraft>>;
  setImportProgress: Dispatch<SetStateAction<{ executed: number; total: number } | null>>;
  setInsertDraft: Dispatch<SetStateAction<{ open: boolean; values: Record<string, string> }>>;
  setIsCommitting: Dispatch<SetStateAction<boolean>>;
  setMutationReview: Dispatch<SetStateAction<MutationReview>>;
  setScriptReview: Dispatch<SetStateAction<ScriptReview>>;
}

export function createAdvancedMutationActions(context: AdvancedMutationContext) {
  const { activeResult, activeTab, activeTableNode, addTab, connection, displayResult, fileImportDraft, importJobIdRef, insertDraft, mutationReview, patchTab, refreshSchema, schema, scriptReview, setFileImportDraft, setImportProgress, setInsertDraft, setIsCommitting, setMutationReview, setScriptReview } = context;
  const editCell = (rowIndex: number, columnIndex: number, oldValue: QueryCellValue, newValue: QueryCellValue) => {
    patchTab(activeTab.id, tab => ({ editState: recordAdvancedCellEdit(tab.editState, { rowIndex, columnIndex, oldValue, newValue }), error: '' }));
  };

  const editVisibleCell = (rowIndex: number, visibleColumnIndex: number, oldValue: QueryCellValue, newValue: QueryCellValue) => {
    if (!activeResult || !displayResult) return;
    const columnId = displayResult.columns[visibleColumnIndex]?.id;
    const sourceColumnIndex = activeResult.columns.findIndex(column => column.id === columnId);
    if (sourceColumnIndex >= 0) editCell(rowIndex, sourceColumnIndex, oldValue, newValue);
  };

  const duplicateRowAsInsert = (rowIndex: number) => {
    patchTab(activeTab.id, tab => ({ insertRowIndexes: [...tab.insertRowIndexes, rowIndex], error: '' }));
  };

  const openInsertDraft = () => {
    const values = Object.fromEntries((activeTableNode?.columns ?? []).filter(column => !column.primaryKey).map(column => [column.name, '']));
    setInsertDraft({ open: true, values });
  };

  const addInsertDraft = () => {
    if (!activeTableNode) return;
    const changes = Object.fromEntries(activeTableNode.columns.flatMap(column => {
      if (column.primaryKey) return [];
      const raw = insertDraft.values[column.name] ?? '';
      const value = coerceInsertDraftValue(column.nativeType, raw);
      return value === null ? [] : [[column.name, value]];
    }));
    if (Object.keys(changes).length === 0) {
      patchTab(activeTab.id, { error: 'Add at least one value for the new row.' });
      return;
    }
    patchTab(activeTab.id, tab => ({ insertRows: [...tab.insertRows, changes], error: '' }));
    setInsertDraft({ open: false, values: {} });
  };

  const markRowDeleted = (rowIndex: number) => {
    patchTab(activeTab.id, tab => ({
      deletedRowIndexes: tab.deletedRowIndexes.includes(rowIndex) ? tab.deletedRowIndexes : [...tab.deletedRowIndexes, rowIndex],
      error: '',
    }));
  };

  const restoreDeletedRow = (rowIndex: number) => {
    patchTab(activeTab.id, tab => ({ deletedRowIndexes: tab.deletedRowIndexes.filter(index => index !== rowIndex), error: '' }));
  };

  const discardEdits = () => patchTab(activeTab.id, { editState: EMPTY_ADVANCED_EDIT_STATE, insertRowIndexes: [], insertRows: [], deletedRowIndexes: [], editMode: false, error: '' });

  const reviewSourceChanges = async () => {
    if (!connection || !['sqlite', 'postgresql', 'mysql', 'mariadb'].includes(connection.provider) || !activeTab.result || !activeTab.tableContext) return;
    const schemaNode = schema?.schemas.find(item => item.name === activeTab.tableContext!.schema);
    const table = schemaNode?.tables.find(item => item.name === activeTab.tableContext!.table);
    const primaryKeys = table?.columns.filter(column => column.primaryKey).map(column => column.name) ?? [];
    try {
      const deletedRows = new Set(activeTab.deletedRowIndexes);
      const editableState = {
        ...activeTab.editState,
        changes: Object.fromEntries(Object.entries(activeTab.editState.changes).filter(([, edit]) => !deletedRows.has(edit.rowIndex))),
      };
      const request: AdvancedMutationRequest = {
        schema: activeTab.tableContext.schema,
        table: activeTab.tableContext.table,
        rows: [
          ...buildManualInsertMutationRows(activeTab.insertRows),
          ...buildInsertMutationRows(activeTab.result, activeTab.insertRowIndexes, primaryKeys),
          ...buildAdvancedMutationRows(activeTab.result, editableState, primaryKeys),
          ...buildDeleteMutationRows(activeTab.result, activeTab.deletedRowIndexes, primaryKeys),
        ],
      };
      if (request.rows.length === 0) return;
      const preview = await previewAdvancedMutation(connection.connectionId, request);
      setMutationReview({ request, preview });
    } catch (cause) {
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'Could not prepare source changes.' });
    }
  };

  const commitSourceChanges = async () => {
    if (!connection || !mutationReview) return;
    setIsCommitting(true);
    try {
      const committed = await commitAdvancedMutation(connection.connectionId, mutationReview.request);
      trackFeatureUsage('advanced_database_edit');
      setMutationReview(null);
      patchTab(activeTab.id, { editState: EMPTY_ADVANCED_EDIT_STATE, insertRowIndexes: [], insertRows: [], deletedRowIndexes: [], editMode: false, result: null, warnings: [`Committed ${committed.updatedRows} row${committed.updatedRows === 1 ? '' : 's'} in one transaction. Run the query to reload source data.`], error: '' });
      await refreshSchema();
    } catch (cause) {
      setMutationReview(null);
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'Source commit failed and was rolled back.' });
    } finally {
      setIsCommitting(false);
    }
  };

  const reviewSqlScript = async () => {
    if (!connection || connection.provider === 'mongodb' || connection.provider === 'sqlserver' || !activeTab.sql.trim()) return;
    try {
      const sql = materializeSqlParameters(activeTab.sql, activeTab.parameters);
      const preview = await previewAdvancedScript(connection.connectionId, sql);
      setScriptReview({ sql, preview });
    } catch (cause) {
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'Could not review SQL script.' });
    }
  };

  const importSqlFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !connection || connection.provider === 'mongodb' || connection.provider === 'sqlserver') return;
    const title = file.name.replace(/\.(sql|txt)$/i, '') || 'SQL import';
    const tab = addTab({ title, sql: '', limit: activeTab.limit, parameters: {} });
    try {
      if (file.size > 8 * 1024 * 1024) {
        throw new Error('SQL import file is too large for interactive review. Use a smaller script or split the file.');
      }
      const sql = await file.text();
      if (!sql.trim()) throw new Error('SQL import file is empty.');
      patchTab(tab.id, { sql, error: '', warnings: [`Loaded ${file.name} for transaction review.`], parameters: {} });
      const preview = await previewAdvancedScript(connection.connectionId, sql);
      setScriptReview({ sql, preview });
    } catch (cause) {
      patchTab(tab.id, { error: cause instanceof Error ? cause.message : 'Could not import SQL file.' });
    }
  };

  const normalizeImportFile = async (file: File): Promise<{ file: File; headers: string[] }> => {
    if (/\.(xlsx|xls)$/i.test(file.name)) {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) throw new Error('Excel workbook does not contain any sheets.');
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet], { blankrows: false });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: '', raw: false });
      const headers = rows[0] ? Object.keys(rows[0]) : csv.split(/\r?\n/, 1)[0]?.split(',').map(item => item.trim()).filter(Boolean) ?? [];
      return { file: new File([csv], file.name.replace(/\.(xlsx|xls)$/i, '.csv'), { type: 'text/csv' }), headers };
    }
    const text = await file.text();
    const headerLine = text.split(/\r?\n/, 1)[0] ?? '';
    const headers = headerLine.split(',').map(item => item.trim().replace(/^"|"$/g, '')).filter(Boolean);
    return { file, headers };
  };

  const openFileImportDraft = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !connection || !activeTab.tableContext || connection.provider === 'mongodb' || connection.provider === 'sqlserver') return;
    try {
      const normalized = await normalizeImportFile(file);
      const targetColumns = activeTableNode?.columns.filter(column => !column.primaryKey) ?? [];
      const normalizedHeaders = new Map(normalized.headers.map(header => [header.toLocaleLowerCase(), header]));
      setFileImportDraft({
        open: true,
        file: normalized.file,
        fileName: file.name,
        headers: normalized.headers,
        schema: activeTab.tableContext.schema,
        table: activeTab.tableContext.table,
        columnMap: Object.fromEntries(targetColumns.map(column => [column.name, normalizedHeaders.get(column.name.toLocaleLowerCase()) ?? ''])),
        errorMode: 'stop_rollback',
        running: false,
        importedRows: 0,
        skippedRows: 0,
        error: '',
      });
    } catch (cause) {
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'Could not read import file.' });
    }
  };

  const importFileDraftToCurrentTable = async () => {
    if (!fileImportDraft.file || !connection) return;
    setIsCommitting(true);
    setFileImportDraft(current => ({ ...current, running: true, importedRows: 0, skippedRows: 0, error: '' }));
    setImportProgress({ executed: 0, total: 0 });
    importJobIdRef.current = null;
    try {
      const started = await startAdvancedCsvImport(connection.connectionId, {
        file: fileImportDraft.file,
        schema: fileImportDraft.schema,
        table: fileImportDraft.table,
        mapping: fileImportDraft.columnMap,
        errorMode: fileImportDraft.errorMode,
      });
      importJobIdRef.current = started.jobId;
      let completed = 0;
      let skipped = 0;
      for (let attempt = 0; attempt < 600; attempt += 1) {
        const job = await loadAdvancedImportJob(started.jobId);
        completed = job.executedStatements;
        skipped = job.skippedStatements;
        setFileImportDraft(current => ({ ...current, importedRows: completed, skippedRows: skipped }));
        setImportProgress({ executed: job.executedStatements + job.skippedStatements, total: job.statementCount });
        if (job.status === 'failed') throw new Error(job.error || 'CSV import failed and was rolled back.');
        if (job.status === 'cancelled') throw new Error('CSV import was cancelled.');
        if (job.status === 'completed') break;
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      setFileImportDraft(current => ({ ...current, open: false, running: false }));
      patchTab(activeTab.id, { result: null, warnings: [`Imported ${completed.toLocaleString('en')} row${completed === 1 ? '' : 's'} into ${fileImportDraft.schema}.${fileImportDraft.table}${skipped ? `; skipped ${skipped.toLocaleString('en')}` : ''}.`], error: '' });
      await refreshSchema();
    } catch (cause) {
      setFileImportDraft(current => ({ ...current, running: false, error: cause instanceof Error ? cause.message : 'File import failed.' }));
    } finally {
      setIsCommitting(false);
      setImportProgress(null);
      importJobIdRef.current = null;
    }
  };

  const commitSqlScript = async () => {
    if (!connection || !scriptReview) return;
    setIsCommitting(true);
    setImportProgress({ executed: 0, total: scriptReview.preview.statementCount });
    importJobIdRef.current = null;
    try {
      const started = await startAdvancedSqlImport(connection.connectionId, scriptReview.sql);
      importJobIdRef.current = started.jobId;
      let committed = 0;
      for (let attempt = 0; attempt < 600; attempt += 1) {
        const job = await loadAdvancedImportJob(started.jobId);
        committed = job.executedStatements;
        setImportProgress({ executed: job.executedStatements, total: job.statementCount });
        if (job.status === 'failed') throw new Error(job.error || 'SQL import failed and was rolled back.');
        if (job.status === 'cancelled') throw new Error('SQL import was cancelled and rolled back.');
        if (job.status === 'completed') break;
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      setScriptReview(null);
      trackFeatureUsage('advanced_database_edit');
      patchTab(activeTab.id, { result: null, warnings: [`Executed ${committed} statement${committed === 1 ? '' : 's'} in one import transaction.`], error: '' });
      await refreshSchema();
    } catch (cause) {
      setScriptReview(null);
      patchTab(activeTab.id, { error: cause instanceof Error ? cause.message : 'SQL script failed and was rolled back.' });
    } finally {
      setIsCommitting(false);
      setImportProgress(null);
      importJobIdRef.current = null;
    }
  };


  return { addInsertDraft, commitSourceChanges, commitSqlScript, discardEdits, duplicateRowAsInsert, editVisibleCell, importFileDraftToCurrentTable, importSqlFile, markRowDeleted, openFileImportDraft, openInsertDraft, restoreDeletedRow, reviewSourceChanges, reviewSqlScript };
}
