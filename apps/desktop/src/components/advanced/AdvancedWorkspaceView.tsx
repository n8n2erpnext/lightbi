import React from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import {
  ArrowLeft, ArrowRight, BarChart3, Braces, Clock3, Code2, Columns, Copy, Database, Download,
  EyeOff, FileUp, FileSearch, FileSpreadsheet, History, Filter, Loader2, Play, Plus, RefreshCw,
  Search, ShieldCheck, Sparkles, Star, StopCircle, Table2, ListTree, Pencil, Redo2, RotateCcw,
  Undo2, Unplug, X,
} from 'lucide-react';
import { clearAdvancedHistory, deleteAdvancedFavorite, type AdvancedConnectionProfile, type AdvancedFavorite, type AdvancedFilterOperator, type AdvancedMutationPreview, type AdvancedMutationRequest, type AdvancedProviderPlugin, type AdvancedQueryResult, type AdvancedSchema, type AdvancedScriptPreview, type AdvancedTableNode } from '../../lib/advanced-api';
import { splitAdvancedStatements, type AdvancedHistoryEntry } from '../../lib/advanced-workspace';
import { CREATE_NEW_IMPORT_TARGET, createBlankColumnDraft, createBlankStructureColumnDraft, defaultImportColumnMap, generateStructureSql, importColumnSqlType, reconcileSqlParameters, type CreateColumnDraft, type CreateTableDraft, type FileTableImportDraft, type ImportDraft, type QuickCommand, type SqlAssistantBrief, type StructureColumnDraft, type StructureTableDraft, type WorkspaceTab } from '../../lib/advanced-workspace-helpers';
import { redoAdvancedCellEdit, undoAdvancedCellEdit } from '../../lib/advanced-edit-session';
import type { AdvancedWorkspaceSource } from '../../stores/advanced-source-store';
import { AdvancedConnectionGate } from './AdvancedConnectionGate';
import { QueryPlanView, ResultChart, ResultJson, ResultStructure } from './AdvancedResultViews';
import { FavoritesPanel, HistoryPanel, SchemaTree } from './AdvancedSidePanels';
import { VirtualResultGrid, type GridForeignKeyAction } from './VirtualResultGrid';

type TabPatch = Partial<WorkspaceTab> | ((tab: WorkspaceTab) => Partial<WorkspaceTab>);
type MutationReview = { request: AdvancedMutationRequest; preview: AdvancedMutationPreview } | null;
type ScriptReview = { sql: string; preview: AdvancedScriptPreview } | null;

interface AdvancedWorkspaceViewModel {
  [key: string]: any;
  activeDeletedRows: Set<number>;
  activeResult: AdvancedQueryResult | null;
  activeTab: WorkspaceTab;
  activeTableNode: AdvancedTableNode | undefined;
  createTableDraft: CreateTableDraft;
  csvFileInputRef: RefObject<HTMLInputElement | null>;
  displayResult: AdvancedQueryResult | null;
  exactCounts: Record<string, { status: 'loading' | 'ready' | 'failed'; count?: number }>;
  favorites: AdvancedFavorite[];
  fileImportDraft: FileTableImportDraft;
  fileSource: AdvancedWorkspaceSource | null;
  foreignKeyActions: GridForeignKeyAction[];
  history: AdvancedHistoryEntry[];
  importDraft: ImportDraft;
  insertDraft: { open: boolean; values: Record<string, string> };
  mutationReview: MutationReview;
  orderedSources: AdvancedWorkspaceSource[];
  patchTab: (id: string, patch: TabPatch) => void;
  profiles: AdvancedConnectionProfile[];
  providerPlugins: AdvancedProviderPlugin[];
  schema: AdvancedSchema | null;
  scriptReview: ScriptReview;
  setCreateTableDraft: Dispatch<SetStateAction<CreateTableDraft>>;
  setFavorites: Dispatch<SetStateAction<AdvancedFavorite[]>>;
  setFileImportDraft: Dispatch<SetStateAction<FileTableImportDraft>>;
  setHistory: Dispatch<SetStateAction<AdvancedHistoryEntry[]>>;
  setImportDraft: Dispatch<SetStateAction<ImportDraft>>;
  setInsertDraft: Dispatch<SetStateAction<{ open: boolean; values: Record<string, string> }>>;
  setMutationReview: Dispatch<SetStateAction<MutationReview>>;
  setRenameColumnDraft: Dispatch<SetStateAction<{ tabId: string; columnId: string; currentName: string; nextName: string } | null>>;
  setSelectedCommandIndex: Dispatch<SetStateAction<number>>;
  setScriptReview: Dispatch<SetStateAction<ScriptReview>>;
  setShowColumnMenu: Dispatch<SetStateAction<boolean>>;
  setShowExportMenu: Dispatch<SetStateAction<boolean>>;
  setStructureDraft: Dispatch<SetStateAction<StructureTableDraft>>;
  setTabs?: Dispatch<SetStateAction<WorkspaceTab[]>>;
  sources: AdvancedWorkspaceSource[];
  sqlAssistant: SqlAssistantBrief | null;
  sqlFileInputRef: RefObject<HTMLInputElement | null>;
  structureDraft: StructureTableDraft;
  tabs: WorkspaceTab[];
  visibleQuickCommands: QuickCommand[];
  visibleResult: AdvancedQueryResult | null;
  writableTables: Array<{ schemaName: string; table: AdvancedTableNode }>;
}

export const AdvancedWorkspaceView: React.FC<{ model: AdvancedWorkspaceViewModel }> = ({ model }) => {
  const {
    workspaceProvider, connection, fileSource, disconnect, orderedSources, preferredSourceId, isConnecting,
    profiles, providerPlugins, selectedProfileId, connectionProvider, connectionName, connectionUrl, databaseName,
    tlsMode, safeMode, profileGroupName, profileTagName, sshHost, sshUser, sshPort, saveProfile, connectionError,
    openFileSource, connect, handleProviderChange, handleProfileChange, setConnectionName, setConnectionUrl,
    setDatabaseName, setTlsMode, setSafeMode, setProfileGroupName, setProfileTagName, setSshHost, setSshUser,
    setSshPort, setSaveProfile, setSideView, sideView, refreshSchema, schema, selectTable, exactCounts,
    requestExactCount, history, applyHistory, setHistory, favorites, applyFavorite, setFavorites, tabs,
    tabHasPendingChanges, activeTab, setActiveTabId, closeTab, addTab, runQuery, runAllStatements, cancelQuery,
    explainQuery, reviewSqlScript, sqlFileInputRef, importSqlFile, csvFileInputRef, openFileImportDraft,
    canCommitActive, isCommitting, openSqlAssistant, openCreateTableDraft, activeTableNode, openStructureDraft,
    sources, openImportDraft, addFavorite, setCommandOpen, patchTab, statusText, displayResult,
    analyzeActiveResultInSimple, returnFullSourceToEasy, displayResultCompleteness, activeResult, setShowColumnMenu, visibleResult,
    showColumnMenu, openInsertDraft, hasActivePendingChanges, activeChangeCount, activeInsertCount,
    activeDeleteCount, discardEdits, reviewSourceChanges, copyResult, setShowExportMenu, isExportingAll,
    showExportMenu, exportResult, exportAllResult, exportProgress, cancelFullExport, applyFilter, removeFilter,
    applyMongoProjection, applyMongoBuilder, toggleSort, resizeVisibleColumn, moveVisibleColumn, visibleEditedKeys,
    activeDeletedRows, editVisibleCell, duplicateRowAsInsert, markRowDeleted, restoreDeletedRow, foreignKeyActions,
    renameResultColumnAlias, commandOpen, commandQuery, setCommandQuery, setSelectedCommandIndex,
    visibleQuickCommands, selectedCommandIndex, renameColumnDraft, setRenameColumnDraft,
    confirmRenameResultColumnAlias, createTableDraft, setCreateTableDraft, createTableSqlPreview, openCreateTableSql,
    structureDraft, setStructureDraft, openStructureSql, mutationReview, setMutationReview, commitSourceChanges,
    scriptReview, importProgress, cancelSqlImport, setScriptReview, commitSqlScript, fileImportDraft,
    setFileImportDraft, importFileDraftToCurrentTable, insertDraft, setInsertDraft, addInsertDraft,
    pendingCloseTabId, setPendingCloseTabId, performCloseTab, sqlAssistant, setSqlAssistant, importDraft,
    writableTables, setImportDraft, importSourceIntoTable,
  } = model;
  const databaseReadOnly = connection?.provider === 'mongodb' || connection?.provider === 'sqlserver';
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><h1 className="text-[15px] font-semibold text-gray-900">Advanced Data Workspace</h1><span className="border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-blue-700">{workspaceProvider}</span></div>
          <p className="truncate text-[11px] text-gray-500">{connection ? `${connection.name} · ${connection.database}` : fileSource ? `${fileSource.name} · ${fileSource.tables.length} table${fileSource.tables.length === 1 ? '' : 's'} · inherited Simple understanding` : 'Files, online sheets, and databases in one read-only workspace'}</p>
        </div>
        {(connection || fileSource) && <button className="flex h-8 items-center gap-2 px-2 text-[12px] text-gray-600 hover:bg-gray-100" onClick={disconnect} title="Close source session"><Unplug className="h-4 w-4" /> Disconnect</button>}
      </header>

      {!connection && !fileSource ? (
        <AdvancedConnectionGate
          orderedSources={orderedSources}
          preferredSourceId={preferredSourceId}
          isConnecting={isConnecting}
          profiles={profiles}
          providerPlugins={providerPlugins}
          selectedProfileId={selectedProfileId}
          connectionProvider={connectionProvider}
          connectionName={connectionName}
          connectionUrl={connectionUrl}
          databaseName={databaseName}
          tlsMode={tlsMode}
          safeMode={safeMode}
          profileGroupName={profileGroupName}
          profileTagName={profileTagName}
          sshHost={sshHost}
          sshUser={sshUser}
          sshPort={sshPort}
          saveProfile={saveProfile}
          connectionError={connectionError}
          onOpenFileSource={source => { void openFileSource(source); }}
          onSubmit={connect}
          onProviderChange={handleProviderChange}
          onProfileChange={handleProfileChange}
          onConnectionNameChange={setConnectionName}
          onConnectionUrlChange={setConnectionUrl}
          onDatabaseNameChange={setDatabaseName}
          onTlsModeChange={setTlsMode}
          onSafeModeChange={setSafeMode}
          onProfileGroupNameChange={setProfileGroupName}
          onProfileTagNameChange={setProfileTagName}
          onSshHostChange={setSshHost}
          onSshUserChange={setSshUser}
          onSshPortChange={setSshPort}
          onSaveProfileChange={setSaveProfile}
        />
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-64 shrink-0 flex-col border-r border-gray-200 bg-gray-50 lg:flex">
            <div className="flex h-9 items-center border-b border-gray-200 px-1">
              <button onClick={() => setSideView('schema')} className={`flex h-7 items-center gap-1 px-2 text-[10px] font-semibold uppercase ${sideView === 'schema' ? 'bg-gray-200 text-gray-800' : 'text-gray-500'}`}><Database className="h-3 w-3" /> Explorer</button>
              <button onClick={() => setSideView('history')} className={`flex h-7 items-center gap-1 px-2 text-[10px] font-semibold uppercase ${sideView === 'history' ? 'bg-gray-200 text-gray-800' : 'text-gray-500'}`}><History className="h-3 w-3" /> History</button>
              <button onClick={() => setSideView('favorites')} className={`flex h-7 items-center gap-1 px-2 text-[10px] font-semibold uppercase ${sideView === 'favorites' ? 'bg-gray-200 text-gray-800' : 'text-gray-500'}`} title="Favorites"><Star className="h-3 w-3" /></button>
              {sideView === 'schema' && <button className="ml-auto p-1 text-gray-500 hover:bg-gray-200" onClick={refreshSchema} title="Refresh schema"><RefreshCw className="h-3.5 w-3.5" /></button>}
            </div>
            <div className="min-h-0 flex-1 overflow-auto">{sideView === 'schema' ? (schema ? <SchemaTree schema={schema} onSelectTable={selectTable} exactCounts={exactCounts} onRequestCount={requestExactCount} /> : <div className="p-3 text-[12px] text-gray-500">Loading schema...</div>) : sideView === 'history' ? <HistoryPanel entries={history} onSelect={applyHistory} onClear={() => { void clearAdvancedHistory().then(() => setHistory([])); }} /> : <FavoritesPanel entries={favorites} onSelect={applyFavorite} onDelete={entry => { void deleteAdvancedFavorite(entry.id).then(() => setFavorites(current => current.filter(item => item.id !== entry.id))); }} />}</div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-9 shrink-0 items-end overflow-x-auto border-b border-gray-200 bg-gray-100 px-1">
              {tabs.map(tab => {
                const dirty = tabHasPendingChanges(tab);
                return <div key={tab.id} className={`flex h-8 min-w-[120px] max-w-[220px] items-center border-r border-gray-200 px-2 text-[11px] ${tab.id === activeTab.id ? 'bg-white text-gray-900' : 'text-gray-500 hover:bg-gray-50'}`}><button className="flex min-w-0 flex-1 items-center gap-1 truncate text-left" onClick={() => setActiveTabId(tab.id)}>{tab.isRunning && <Loader2 className="h-3 w-3 animate-spin" />}{dirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" title="Unsaved result changes" />}<span className="truncate">{tab.title}</span></button><button className="ml-2 p-0.5 hover:bg-gray-200" onClick={() => closeTab(tab.id)} title={dirty ? 'Close tab with unsaved changes' : 'Close tab'}><X className="h-3 w-3" /></button></div>;
              })}
              <button className="mb-1 ml-1 p-1.5 text-gray-500 hover:bg-gray-200" onClick={() => addTab()} title="New query tab"><Plus className="h-3.5 w-3.5" /></button>
            </div>

            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-gray-200 bg-gray-50 px-3">
              {schema && <select aria-label="Quick table switcher" defaultValue="" onChange={event => {
                const [schemaName, tableName] = JSON.parse(event.target.value) as [string, string];
                const table = schema.schemas.find(item => item.name === schemaName)?.tables.find(item => item.name === tableName);
                if (table) selectTable(schemaName, table);
                event.target.value = '';
              }} className="h-7 max-w-[120px] border border-gray-300 bg-white px-1 text-[10px] lg:hidden">
                <option value="" disabled>Table...</option>
                {schema.schemas.flatMap(schemaNode => schemaNode.tables.map(table => <option key={`${schemaNode.name}.${table.name}`} value={JSON.stringify([schemaNode.name, table.name])}>{table.name}</option>))}
              </select>}
              <button disabled={activeTab.isRunning} onClick={() => runQuery()} className="flex h-7 items-center gap-1.5 bg-blue-600 px-3 text-[12px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"><Play className="h-3.5 w-3.5 fill-current" /> Run</button>
              <button disabled={workspaceProvider === 'mongodb' || activeTab.isRunning || splitAdvancedStatements(activeTab.sql).length < 2} onClick={runAllStatements} className="hidden h-7 border border-gray-300 bg-white px-2 text-[11px] text-gray-600 hover:bg-gray-100 disabled:opacity-35 sm:block" title="Run up to five read-only statements into separate result tabs">Run all</button>
              <button disabled={!activeTab.isRunning} onClick={() => cancelQuery()} className="flex h-7 items-center gap-1.5 border border-gray-300 bg-white px-2 text-[12px] text-gray-600 hover:bg-gray-100 disabled:opacity-40" title="Cancel query"><StopCircle className="h-3.5 w-3.5" /><span className="hidden sm:inline">Cancel</span></button>
              <button disabled={workspaceProvider !== 'postgresql' || activeTab.isRunning} onClick={explainQuery} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40" title="Explain PostgreSQL query plan"><FileSearch className="h-3.5 w-3.5" /></button>
              <button disabled={!connection || databaseReadOnly || activeTab.isRunning || !activeTab.sql.trim()} onClick={() => void reviewSqlScript()} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40" title="Review SQL script transaction"><ShieldCheck className="h-3.5 w-3.5" /></button>
              <input ref={sqlFileInputRef} type="file" accept=".sql,.txt,text/plain,application/sql" className="hidden" aria-label="SQL import file" onChange={event => void importSqlFile(event)} />
              <button disabled={!connection || databaseReadOnly || activeTab.isRunning} onClick={() => sqlFileInputRef.current?.click()} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40" title="Import SQL file"><FileUp className="h-3.5 w-3.5" /></button>
              <input ref={csvFileInputRef} type="file" accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" aria-label="CSV or Excel import file" onChange={event => void openFileImportDraft(event)} />
              <button disabled={!canCommitActive || activeTab.isRunning || isCommitting} onClick={() => csvFileInputRef.current?.click()} className="hidden p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40 sm:block" title="Import CSV or Excel into current table"><FileSpreadsheet className="h-3.5 w-3.5" /></button>
              <button disabled={!activeTab.sql.trim()} onClick={openSqlAssistant} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40" title="AI explain and optimize SQL"><Sparkles className="h-3.5 w-3.5" /></button>
              <button disabled={!connection || databaseReadOnly} onClick={openCreateTableDraft} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40" title="Create table SQL"><Table2 className="h-3.5 w-3.5" /></button>
              <button disabled={!connection || databaseReadOnly || !activeTab.tableContext || !activeTableNode} onClick={openStructureDraft} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40" title="Edit table structure SQL"><ListTree className="h-3.5 w-3.5" /></button>
              <button disabled={!connection || databaseReadOnly || sources.length === 0} onClick={openImportDraft} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-40" title="Import understood file into DB table"><FileSpreadsheet className="h-3.5 w-3.5" /></button>
              <button onClick={addFavorite} className="p-1.5 text-gray-500 hover:bg-gray-200" title="Save query to favorites"><Star className="h-3.5 w-3.5" /></button>
              <button onClick={() => setCommandOpen(true)} className="flex h-7 items-center gap-1 border border-gray-300 bg-white px-2 text-[11px] text-gray-500 hover:bg-gray-100" title="Command switcher"><Search className="h-3.5 w-3.5" /><span className="hidden md:inline">Search</span><span className="hidden font-mono text-[9px] text-gray-400 lg:inline">Ctrl K</span></button>
              <div className="ml-2 hidden h-5 border-l border-gray-300 sm:block" />
              <label className="hidden text-[11px] text-gray-500 sm:block" htmlFor="advanced-limit">Rows</label>
              <select id="advanced-limit" value={activeTab.limit} onChange={event => patchTab(activeTab.id, { limit: Number(event.target.value), offset: 0 })} className="hidden h-7 border border-gray-300 bg-white px-2 text-[11px] outline-none sm:block">{[100, 200, 500, 1000].map(value => <option key={value} value={value}>{value}</option>)}</select>
              <span className="ml-auto hidden text-[11px] text-gray-500 sm:block">{statusText}</span>
            </div>

            <div className="h-[210px] shrink-0 border-b border-gray-200">
              <textarea aria-label={workspaceProvider === 'mongodb' ? 'MongoDB document query' : 'SQL query'} spellCheck={false} value={activeTab.sql} onChange={event => {
                const sql = event.target.value;
                patchTab(activeTab.id, tab => ({ sql, offset: 0, sort: undefined, filters: [], filterValue: '', plan: null, tableContext: undefined, parameters: reconcileSqlParameters(sql, tab.parameters) }));
              }} onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void runQuery(); } }} className="h-full w-full resize-none bg-[#fbfbfc] p-4 font-mono text-[13px] leading-6 text-gray-800 outline-none" />
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {workspaceProvider !== 'mongodb' && Object.keys(activeTab.parameters).length > 0 && (
                <div className="flex min-h-9 shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-2 py-1">
                  <Code2 className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-[10px] font-semibold uppercase text-gray-500">Parameters</span>
                  {Object.entries(activeTab.parameters).map(([name, value]) => (
                    <label key={name} className="flex h-7 items-center border border-gray-300 bg-gray-50 text-[11px]">
                      <span className="border-r border-gray-200 px-2 font-mono text-blue-700">:{name}</span>
                      <input
                        aria-label={`Parameter ${name}`}
                        value={value}
                        onChange={event => patchTab(activeTab.id, tab => ({ parameters: { ...tab.parameters, [name]: event.target.value } }))}
                        className="h-full w-32 bg-white px-2 font-mono text-gray-800 outline-none focus:bg-blue-50"
                      />
                    </label>
                  ))}
                  <button onClick={() => patchTab(activeTab.id, tab => ({ parameters: Object.fromEntries(Object.keys(tab.parameters).map(name => [name, ''])) }))} className="p-1 text-gray-500 hover:bg-gray-100" title="Clear parameter values"><RotateCcw className="h-3.5 w-3.5" /></button>
                </div>
              )}
              <div className="flex h-9 shrink-0 items-center border-b border-gray-200 px-2">
                <button onClick={() => patchTab(activeTab.id, { resultView: 'grid' })} className={`flex h-7 items-center gap-1.5 px-3 text-[11px] ${activeTab.resultView === 'grid' ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}><Columns className="h-3.5 w-3.5" /> Grid</button>
                <button onClick={() => patchTab(activeTab.id, { resultView: 'chart' })} className={`flex h-7 items-center gap-1.5 px-3 text-[11px] ${activeTab.resultView === 'chart' ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}><BarChart3 className="h-3.5 w-3.5" /> Chart</button>
                <button onClick={() => patchTab(activeTab.id, { resultView: 'json' })} className={`hidden h-7 items-center gap-1.5 px-3 text-[11px] sm:flex ${activeTab.resultView === 'json' ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}><Braces className="h-3.5 w-3.5" /> JSON</button>
                <button onClick={() => patchTab(activeTab.id, { resultView: 'structure' })} className={`hidden h-7 items-center gap-1.5 px-3 text-[11px] md:flex ${activeTab.resultView === 'structure' ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}><ListTree className="h-3.5 w-3.5" /> Structure</button>
                {activeTab.plan !== null && <button onClick={() => patchTab(activeTab.id, { resultView: 'plan' })} className={`flex h-7 items-center gap-1.5 px-3 text-[11px] ${activeTab.resultView === 'plan' ? 'bg-gray-200 font-medium text-gray-900' : 'text-gray-500 hover:bg-gray-100'}`}><FileSearch className="h-3.5 w-3.5" /> Plan</button>}
                {displayResult && <button onClick={analyzeActiveResultInSimple} disabled={displayResultCompleteness?.state !== 'complete'} aria-describedby={displayResultCompleteness?.state !== 'complete' ? 'advanced-result-completeness' : undefined} className="ml-1 flex h-7 items-center gap-1.5 border border-indigo-200 bg-indigo-50 px-3 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400" title={displayResultCompleteness?.state === 'complete' ? 'Create a Simple mode BA decision brief from this complete result' : 'Full-source governed analysis requires a complete result'}><Sparkles className="h-3.5 w-3.5" /> BA Brief</button>}
                {activeTab.tableContext && <button onClick={() => void returnFullSourceToEasy()} disabled={activeTab.isRunning || hasActivePendingChanges} className="ml-1 flex h-7 items-center gap-1.5 border border-emerald-200 bg-emerald-50 px-3 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:text-gray-400" title={hasActivePendingChanges ? 'Commit or discard pending edits first' : 'Refresh the complete post-edit source and return to Easy analysis'}><ArrowLeft className="h-3.5 w-3.5" /> Return to Easy</button>}
                {displayResultCompleteness && displayResultCompleteness.state !== 'complete' && <span id="advanced-result-completeness" role="status" data-testid="advanced-result-completeness" className="ml-2 text-[10px] text-amber-700">{displayResultCompleteness.state} result · {displayResultCompleteness.returnedRows} rows retained · full-source analysis unavailable</span>}
                {activeResult && <div className="relative">
                  <button onClick={() => setShowColumnMenu(value => !value)} className="flex h-7 items-center gap-1 px-2 text-[10px] text-gray-500 hover:bg-gray-100" title="Manage visible columns"><EyeOff className="h-3.5 w-3.5" /> {visibleResult?.columns.length}/{activeResult.columns.length}</button>
                  {showColumnMenu && <div className="absolute left-0 top-8 z-30 max-h-64 w-56 overflow-auto border border-gray-200 bg-white py-1 shadow-lg">
                    <div className="flex items-center justify-between border-b border-gray-100 px-2 py-1.5 text-[10px] font-semibold text-gray-600"><span>Visible columns</span><button onClick={() => patchTab(activeTab.id, { hiddenColumnIds: [] })} className="p-1 text-gray-400 hover:bg-gray-100" title="Show all columns"><RotateCcw className="h-3 w-3" /></button></div>
                    {activeResult.columns.map(column => {
                      const visible = !activeTab.hiddenColumnIds.includes(column.id);
                      return <label key={column.id} className="flex h-7 items-center gap-2 px-2 text-[10px] text-gray-700 hover:bg-gray-50"><input type="checkbox" checked={visible} disabled={visible && visibleResult?.columns.length === 1} onChange={() => patchTab(activeTab.id, tab => ({ hiddenColumnIds: visible ? [...tab.hiddenColumnIds, column.id] : tab.hiddenColumnIds.filter(id => id !== column.id) }))} /><span className="truncate">{column.name}</span><span className="ml-auto font-mono text-[8px] text-gray-400">{column.nativeType || column.logicalType}</span></label>;
                    })}
                  </div>}
                </div>}
                {activeResult && activeTab.resultView === 'grid' && <button onClick={() => patchTab(activeTab.id, { editMode: !activeTab.editMode })} className={`ml-1 p-1.5 ${activeTab.editMode ? 'bg-amber-100 text-amber-800' : 'text-gray-500 hover:bg-gray-100'}`} title="Toggle result edit mode"><Pencil className="h-3.5 w-3.5" /></button>}
                {activeResult && activeTab.resultView === 'grid' && activeTab.editMode && canCommitActive && <button onClick={openInsertDraft} className="p-1.5 text-emerald-700 hover:bg-emerald-50" title="Insert new row"><Plus className="h-3.5 w-3.5" /></button>}
                {(hasActivePendingChanges || activeTab.editState.redo.length > 0) && <>
                  {activeChangeCount > 0 && <span className="ml-1 bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">{activeChangeCount} changed</span>}
                  {activeInsertCount > 0 && <span className="ml-1 bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-800">{activeInsertCount} insert</span>}
                  {activeDeleteCount > 0 && <span className="ml-1 bg-red-100 px-1.5 py-0.5 text-[9px] font-semibold text-red-800">{activeDeleteCount} delete</span>}
                  <button disabled={activeTab.editState.undo.length === 0} onClick={() => patchTab(activeTab.id, tab => ({ editState: undoAdvancedCellEdit(tab.editState) }))} className="p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Undo edit"><Undo2 className="h-3.5 w-3.5" /></button>
                  <button disabled={activeTab.editState.redo.length === 0} onClick={() => patchTab(activeTab.id, tab => ({ editState: redoAdvancedCellEdit(tab.editState) }))} className="p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Redo edit"><Redo2 className="h-3.5 w-3.5" /></button>
                  <button onClick={discardEdits} className="p-1 text-gray-500 hover:bg-gray-100" title="Discard result edits"><RotateCcw className="h-3.5 w-3.5" /></button>
                  {canCommitActive && hasActivePendingChanges && <button onClick={() => void reviewSourceChanges()} className="flex h-7 items-center gap-1 bg-emerald-700 px-2 text-[10px] font-medium text-white hover:bg-emerald-800" title="Review source transaction"><ShieldCheck className="h-3.5 w-3.5" /> Review</button>}
                </>}
                {activeTab.result && <><div className="ml-3 h-5 border-l border-gray-200" /><button disabled={activeTab.offset === 0 || activeTab.isRunning} onClick={() => runQuery(activeTab.id, { offset: Math.max(0, activeTab.offset - activeTab.limit) })} className="p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Previous page"><ArrowLeft className="h-3.5 w-3.5" /></button><button disabled={!activeTab.result.page.hasMore || activeTab.isRunning} onClick={() => runQuery(activeTab.id, { offset: activeTab.offset + activeTab.limit })} className="p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30" title="Next page"><ArrowRight className="h-3.5 w-3.5" /></button><span className="ml-1 text-[10px] text-gray-400">Page {Math.floor(activeTab.offset / activeTab.limit) + 1}</span></>}
                {activeTab.warnings.map(warning => <span key={warning} className="ml-3 truncate text-[10px] text-amber-700">{warning}</span>)}
                {activeTab.result && <span className="ml-auto flex items-center gap-1 text-[10px] text-gray-400"><Clock3 className="h-3 w-3" /> {activeTab.result.executionMs} ms</span>}
                {activeResult && <button onClick={() => void copyResult()} className="ml-2 p-1 text-gray-500 hover:bg-gray-100" title="Copy current result as CSV"><Copy className="h-3.5 w-3.5" /></button>}
                {activeResult && <div className="relative ml-2">
                  <button
                    onClick={() => setShowExportMenu(value => !value)}
                    className={`flex h-7 items-center gap-1 px-2 text-[10px] font-medium ${isExportingAll ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                    title="Download result"
                  >
                    {isExportingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Download</span>
                  </button>
                  {showExportMenu && <div className="absolute right-0 top-8 z-40 w-52 border border-gray-200 bg-white py-1 text-[11px] text-gray-700 shadow-lg">
                    <div className="border-b border-gray-100 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Current page</div>
                    {(['csv', 'xlsx', 'json', 'sql'] as const).map(format => (
                      <button key={format} onClick={() => { exportResult(format); setShowExportMenu(false); }} className="flex h-7 w-full items-center justify-between px-2 text-left hover:bg-gray-100">
                        <span>{format.toUpperCase()}</span>
                        <span className="text-[9px] text-gray-400">{hasActivePendingChanges ? 'edited page' : 'page'}</span>
                      </button>
                    ))}
                    <div className="mt-1 border-b border-t border-gray-100 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Full result</div>
                    {(['csv', 'xlsx', 'json', 'sql'] as const).map(format => (
                      <button key={format} disabled={isExportingAll} onClick={() => { void exportAllResult(format); setShowExportMenu(false); }} className="flex h-7 w-full items-center justify-between px-2 text-left hover:bg-gray-100 disabled:opacity-40">
                        <span>All {format.toUpperCase()}</span>
                        <span className="text-[9px] text-gray-400">paged</span>
                      </button>
                    ))}
                    {(exportProgress || isExportingAll) && <div className="mt-1 border-t border-gray-100 px-2 py-1.5">
                      {exportProgress && <div className="mb-1 flex items-center gap-1 text-[10px] font-semibold text-blue-700"><Loader2 className="h-3 w-3 animate-spin" /> {exportProgress.format} {exportProgress.rows.toLocaleString('en')} rows</div>}
                      {isExportingAll && <button onClick={() => { cancelFullExport(); setShowExportMenu(false); }} className="h-7 w-full text-left text-[10px] font-semibold text-red-600 hover:bg-red-50">Cancel full export</button>}
                    </div>}
                  </div>}
                </div>}
              </div>
              {activeTab.result && workspaceProvider !== 'mongodb' && (
                <div className="hidden min-h-9 shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-2 py-1 md:flex">
                  <Filter className="h-3.5 w-3.5 text-gray-400" />
                  <select aria-label="Filter group combinator" value={activeTab.filterCombinator} onChange={event => patchTab(activeTab.id, { filterCombinator: event.target.value as 'and' | 'or' })} className="h-7 border border-gray-300 bg-white px-2 text-[11px]">
                    <option value="and">AND</option>
                    <option value="or">OR</option>
                  </select>
                  <select aria-label="Filter column" value={activeTab.filterColumn} onChange={event => patchTab(activeTab.id, { filterColumn: event.target.value })} className="h-7 max-w-[180px] border border-gray-300 bg-white px-2 text-[11px]">
                    {activeTab.result.columns.map(column => <option key={column.id} value={column.name}>{column.name}</option>)}
                  </select>
                  <select aria-label="Filter operator" value={activeTab.filterOperator} onChange={event => patchTab(activeTab.id, { filterOperator: event.target.value as AdvancedFilterOperator })} className="h-7 border border-gray-300 bg-white px-2 text-[11px]">
                    <option value="contains">contains</option>
                    <option value="not_contains">not contains</option>
                    <option value="equals">equals</option>
                    <option value="not_equals">not equals</option>
                    <option value="starts_with">starts with</option>
                    <option value="ends_with">ends with</option>
                    <option value="greater_than">&gt;</option>
                    <option value="greater_or_equal">&gt;=</option>
                    <option value="less_than">&lt;</option>
                    <option value="less_or_equal">&lt;=</option>
                    <option value="is_blank">is blank</option>
                    <option value="is_not_blank">is not blank</option>
                    <option value="in">in list</option>
                    <option value="not_in">not in list</option>
                  </select>
                  <input aria-label="Filter value" value={activeTab.filterValue} disabled={['is_blank', 'is_not_blank'].includes(activeTab.filterOperator)} onChange={event => patchTab(activeTab.id, { filterValue: event.target.value })} onKeyDown={event => { if (event.key === 'Enter') applyFilter(); }} className="h-7 min-w-0 flex-1 border border-gray-300 bg-white px-2 text-[11px] outline-none focus:border-blue-500 disabled:bg-gray-100" placeholder={activeTab.filterOperator === 'in' || activeTab.filterOperator === 'not_in' ? 'comma,separated,values' : ''} />
                  <button onClick={applyFilter} disabled={activeTab.isRunning} className="h-7 bg-gray-800 px-3 text-[11px] font-medium text-white disabled:opacity-40">Add</button>
                  <button onClick={() => { patchTab(activeTab.id, { filterValue: '', filters: [] }); void runQuery(activeTab.id, { offset: 0, filters: [] }); }} disabled={activeTab.filters.length === 0 || activeTab.isRunning} className="p-1.5 text-gray-500 hover:bg-gray-200 disabled:opacity-30" title="Clear filter"><X className="h-3.5 w-3.5" /></button>
                  {activeTab.filters.map((filter, index) => <span key={`${filter.column}:${filter.operator}:${index}`} className="inline-flex h-6 max-w-[260px] items-center gap-1 border border-blue-200 bg-blue-50 px-1.5 text-[10px] text-blue-800"><span className="truncate">{filter.column} {filter.operator.replaceAll('_', ' ')} {filter.value}</span><button onClick={() => removeFilter(index)} className="p-0.5 hover:bg-blue-100" title="Remove filter"><X className="h-3 w-3" /></button></span>)}
                </div>
              )}
              {workspaceProvider === 'mongodb' && schema && (
                <div className="hidden min-h-9 shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-2 py-1 md:flex">
                  <Braces className="h-3.5 w-3.5 text-gray-400" />
                  <select aria-label="Mongo filter field" value={activeTab.filterColumn} onChange={event => patchTab(activeTab.id, { filterColumn: event.target.value })} className="h-7 max-w-[180px] border border-gray-300 bg-white px-2 text-[11px]">
                    <option value="">Field...</option>
                    {activeTableNode?.columns.map(column => <option key={column.name} value={column.name}>{column.name}</option>)}
                  </select>
                  <select aria-label="Mongo filter operator" value={activeTab.filterOperator} onChange={event => patchTab(activeTab.id, { filterOperator: event.target.value as AdvancedFilterOperator })} className="h-7 border border-gray-300 bg-white px-2 text-[11px]">
                    <option value="equals">equals</option><option value="not_equals">not equals</option><option value="contains">contains</option><option value="greater_than">&gt;</option><option value="greater_or_equal">&gt;=</option><option value="less_than">&lt;</option><option value="less_or_equal">&lt;=</option><option value="is_blank">is blank</option><option value="is_not_blank">is not blank</option><option value="in">in list</option><option value="not_in">not in list</option>
                  </select>
                  <input aria-label="Mongo filter value" value={activeTab.filterValue} disabled={['is_blank', 'is_not_blank'].includes(activeTab.filterOperator)} onChange={event => patchTab(activeTab.id, { filterValue: event.target.value })} className="h-7 min-w-0 flex-1 border border-gray-300 bg-white px-2 text-[11px] outline-none focus:border-blue-500 disabled:bg-gray-100" />
                  <select aria-label="Mongo sort column" value={activeTab.sort?.column || ''} onChange={event => patchTab(activeTab.id, { sort: event.target.value ? { column: event.target.value, direction: activeTab.sort?.direction || 'asc' } : undefined })} className="h-7 max-w-[160px] border border-gray-300 bg-white px-2 text-[11px]">
                    <option value="">Sort...</option>
                    {activeTableNode?.columns.map(column => <option key={column.name} value={column.name}>{column.name}</option>)}
                  </select>
                  <select aria-label="Mongo sort direction" value={activeTab.sort?.direction || 'asc'} onChange={event => activeTab.sort && patchTab(activeTab.id, { sort: { ...activeTab.sort, direction: event.target.value as 'asc' | 'desc' } })} className="h-7 border border-gray-300 bg-white px-2 text-[11px]">
                    <option value="asc">ASC</option><option value="desc">DESC</option>
                  </select>
                  <select aria-label="Mongo projection field" value={activeTab.projectionColumn} onChange={event => patchTab(activeTab.id, { projectionColumn: event.target.value })} className="h-7 max-w-[160px] border border-gray-300 bg-white px-2 text-[11px]">
                    <option value="">Project...</option>
                    {activeTableNode?.columns.map(column => <option key={column.name} value={column.name}>{column.name}</option>)}
                  </select>
                  <button onClick={() => applyMongoProjection(1)} disabled={!activeTab.projectionColumn} className="h-7 border border-gray-300 bg-white px-2 text-[10px] font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-35">Include</button>
                  <button onClick={() => applyMongoProjection(0)} disabled={!activeTab.projectionColumn} className="h-7 border border-gray-300 bg-white px-2 text-[10px] font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-35">Exclude</button>
                  <button onClick={applyMongoBuilder} className="h-7 bg-gray-800 px-3 text-[11px] font-medium text-white">Apply</button>
                </div>
              )}
              {activeTab.error ? <div className="m-3 border-l-2 border-red-500 bg-red-50 px-3 py-2 font-mono text-[12px] text-red-700">{activeTab.error}</div> : activeTab.isRunning ? <div className="flex flex-1 items-center justify-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Executing read-only query...</div> : activeTab.resultView === 'plan' && activeTab.plan !== null ? <QueryPlanView plan={activeTab.plan} /> : displayResult ? <div className="min-h-0 flex-1">{activeTab.resultView === 'grid' ? <VirtualResultGrid result={displayResult} sort={activeTab.sort} onSort={workspaceProvider === 'mongodb' ? () => undefined : toggleSort} columnWidths={activeTab.columnWidths} onColumnResize={resizeVisibleColumn} onColumnMove={moveVisibleColumn} editable={activeTab.editMode} editedKeys={visibleEditedKeys} deletedRows={activeDeletedRows} onEdit={editVisibleCell} onDuplicateRow={canCommitActive ? duplicateRowAsInsert : undefined} onDeleteRow={canCommitActive ? markRowDeleted : undefined} onRestoreRow={canCommitActive ? restoreDeletedRow : undefined} copyTableName={activeTab.tableContext?.table} foreignKeyActions={foreignKeyActions} onRenameColumn={workspaceProvider === 'mongodb' ? undefined : renameResultColumnAlias} /> : activeTab.resultView === 'chart' ? <ResultChart result={displayResult} /> : activeTab.resultView === 'json' ? <ResultJson result={displayResult} /> : <ResultStructure result={displayResult} />}</div> : <div className="flex flex-1 items-center justify-center text-sm text-gray-400">No result set.</div>}
            </div>
          </section>
        </div>
      )}
      {commandOpen && <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 p-4 pt-[10vh]" role="dialog" aria-modal="true" aria-label="Command switcher">
        <div className="flex max-h-[78vh] w-full max-w-2xl flex-col border border-gray-300 bg-white shadow-xl">
          <label className="flex h-12 shrink-0 items-center gap-2 border-b border-gray-200 px-3 text-gray-400">
            <Search className="h-4 w-4" />
            <input
              autoFocus
              aria-label="Command search"
              value={commandQuery}
              onChange={event => setCommandQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setCommandOpen(false);
                  return;
                }
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setSelectedCommandIndex(index => Math.min(visibleQuickCommands.length - 1, index + 1));
                  return;
                }
                if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setSelectedCommandIndex(index => Math.max(0, index - 1));
                  return;
                }
                if (event.key === 'Enter') {
                  event.preventDefault();
                  visibleQuickCommands[selectedCommandIndex]?.run();
                }
              }}
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none"
              placeholder="Search tables, tabs, history, favorites, sources"
            />
            <button onClick={() => setCommandOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100" title="Close"><X className="h-4 w-4" /></button>
          </label>
          <div className="min-h-0 flex-1 overflow-auto py-1">
            {visibleQuickCommands.map((command, index) => (
              <button
                key={command.id}
                onMouseEnter={() => setSelectedCommandIndex(index)}
                onClick={command.run}
                className={`flex min-h-11 w-full items-center gap-3 px-3 text-left ${index === selectedCommandIndex ? 'bg-blue-50 text-blue-900' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center ${index === selectedCommandIndex ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  {command.kind === 'table' ? <Table2 className="h-3.5 w-3.5" /> : command.kind === 'tab' ? <Columns className="h-3.5 w-3.5" /> : command.kind === 'history' ? <History className="h-3.5 w-3.5" /> : command.kind === 'favorite' ? <Star className="h-3.5 w-3.5" /> : command.kind === 'source' ? <FileSpreadsheet className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-medium">{command.title}</span>
                  <span className="block truncate text-[10px] text-gray-500">{command.subtitle}</span>
                </span>
                <span className="shrink-0 text-[9px] uppercase text-gray-400">{command.kind}</span>
              </button>
            ))}
            {visibleQuickCommands.length === 0 && <div className="px-4 py-8 text-center text-[12px] text-gray-400">No commands found.</div>}
          </div>
        </div>
      </div>}
      {renameColumnDraft && <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/45 p-4 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-label="Rename column alias"
        onMouseDown={event => {
          if (event.target === event.currentTarget) setRenameColumnDraft(null);
        }}
      >
        <form
          className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
          onSubmit={event => {
            event.preventDefault();
            confirmRenameResultColumnAlias();
          }}
        >
          <div className="flex items-start gap-3 border-b border-gray-100 px-5 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Pencil className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-gray-950">Rename column alias</h2>
              <p className="mt-1 text-[12px] leading-5 text-gray-500">This changes the result view alias only. Source data stays untouched.</p>
            </div>
            <button
              type="button"
              onClick={() => setRenameColumnDraft(null)}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 px-5 py-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Current column</div>
              <div className="mt-1 truncate font-mono text-[12px] text-gray-700">{renameColumnDraft.currentName}</div>
            </div>
            <label className="grid gap-1.5 text-[12px] font-medium text-gray-700">
              New alias
              <input
                autoFocus
                value={renameColumnDraft.nextName}
                onChange={event => setRenameColumnDraft(current => current ? { ...current, nextName: event.target.value } : current)}
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setRenameColumnDraft(null);
                  }
                }}
                className="h-11 rounded-xl border border-gray-300 bg-white px-3 font-mono text-[13px] text-gray-950 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                placeholder="Column alias"
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 bg-gray-50 px-5 py-4">
            <button
              type="button"
              onClick={() => setRenameColumnDraft(null)}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-[12px] font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!renameColumnDraft.nextName.trim() || renameColumnDraft.nextName.trim() === renameColumnDraft.currentName}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-gray-950 px-3 text-[12px] font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </button>
          </div>
        </form>
      </div>}
      {createTableDraft.open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Create table SQL">
        <div className="flex max-h-[86vh] w-full max-w-5xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><Table2 className="h-4 w-4 text-blue-700" /><div><h2 className="text-sm font-semibold text-gray-900">Create table SQL</h2><p className="text-[11px] text-gray-500">Columns, primary keys, indexes, foreign keys, and reviewable DDL.</p></div></div>
          <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
            <div className="min-h-0 overflow-auto p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                <label className="grid gap-1 text-[11px] text-gray-600"><span className="font-semibold uppercase">Schema</span><input aria-label="Create table schema" value={createTableDraft.schemaName} onChange={event => setCreateTableDraft(current => ({ ...current, schemaName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[12px] outline-none focus:border-blue-500" /></label>
                <label className="grid gap-1 text-[11px] text-gray-600"><span className="font-semibold uppercase">Table</span><input aria-label="Create table name" value={createTableDraft.tableName} onChange={event => setCreateTableDraft(current => ({ ...current, tableName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[12px] outline-none focus:border-blue-500" placeholder="new_table" /></label>
              </div>
              <div className="overflow-x-auto border border-gray-200">
                <div className="grid min-w-[920px] grid-cols-[160px_130px_70px_60px_70px_170px_130px_40px] border-b border-gray-200 bg-gray-100 px-2 py-2 text-[10px] font-semibold uppercase text-gray-500">
                  <span>Name</span><span>Type</span><span>Nullable</span><span>PK</span><span>Index</span><span>References table</span><span>Ref column</span><span />
                </div>
                {createTableDraft.columns.map(column => {
                  const updateColumn = (patch: Partial<CreateColumnDraft>) => setCreateTableDraft(current => ({ ...current, columns: current.columns.map(item => item.id === column.id ? { ...item, ...patch } : item) }));
                  return <div key={column.id} className="grid min-w-[920px] grid-cols-[160px_130px_70px_60px_70px_170px_130px_40px] items-center gap-0 border-b border-gray-100 px-2 py-1.5">
                    <input aria-label="Column name" value={column.name} onChange={event => updateColumn({ name: event.target.value })} className="mr-2 h-8 border border-gray-300 px-2 font-mono text-[11px] outline-none focus:border-blue-500" />
                    <input aria-label="Column type" value={column.nativeType} onChange={event => updateColumn({ nativeType: event.target.value })} className="mr-2 h-8 border border-gray-300 px-2 font-mono text-[11px] outline-none focus:border-blue-500" />
                    <label className="flex justify-center"><input aria-label="Column nullable" type="checkbox" checked={column.nullable} onChange={event => updateColumn({ nullable: event.target.checked })} /></label>
                    <label className="flex justify-center"><input aria-label="Column primary key" type="checkbox" checked={column.primaryKey} onChange={event => updateColumn({ primaryKey: event.target.checked, nullable: event.target.checked ? false : column.nullable })} /></label>
                    <label className="flex justify-center"><input aria-label="Column indexed" type="checkbox" checked={column.indexed} onChange={event => updateColumn({ indexed: event.target.checked })} /></label>
                    <input aria-label="References table" value={column.referencesTable} onChange={event => updateColumn({ referencesTable: event.target.value })} className="mr-2 h-8 border border-gray-300 px-2 font-mono text-[11px] outline-none focus:border-blue-500" placeholder="public.parent" />
                    <input aria-label="References column" value={column.referencesColumn} onChange={event => updateColumn({ referencesColumn: event.target.value })} className="mr-2 h-8 border border-gray-300 px-2 font-mono text-[11px] outline-none focus:border-blue-500" placeholder="id" />
                    <button onClick={() => setCreateTableDraft(current => ({ ...current, columns: current.columns.length === 1 ? current.columns : current.columns.filter(item => item.id !== column.id) }))} disabled={createTableDraft.columns.length === 1} className="p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30" title="Remove column"><X className="h-3.5 w-3.5" /></button>
                  </div>;
                })}
              </div>
              <button onClick={() => setCreateTableDraft(current => ({ ...current, columns: [...current.columns, createBlankColumnDraft()] }))} className="mt-3 flex h-8 items-center gap-1.5 border border-gray-300 px-3 text-[11px] text-gray-700 hover:bg-gray-50"><Plus className="h-3.5 w-3.5" /> Add column</button>
            </div>
            <div className="flex min-h-0 flex-col border-t border-gray-200 lg:border-l lg:border-t-0">
              <div className="flex h-9 shrink-0 items-center border-b border-gray-200 bg-gray-50 px-3 text-[10px] font-semibold uppercase text-gray-500">SQL preview</div>
              <pre className="min-h-0 flex-1 overflow-auto bg-gray-950 p-4 font-mono text-[11px] leading-5 text-emerald-200">{createTableSqlPreview}</pre>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button onClick={() => setCreateTableDraft(current => ({ ...current, open: false }))} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50">Close</button><button onClick={openCreateTableSql} className="flex h-8 items-center gap-1.5 bg-blue-700 px-3 text-[11px] font-medium text-white hover:bg-blue-800"><Code2 className="h-3.5 w-3.5" /> Open SQL in tab</button></div>
        </div>
      </div>}
      {structureDraft.open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Edit table structure SQL">
        <div className="flex max-h-[86vh] w-full max-w-5xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><ListTree className="h-4 w-4 text-blue-700" /><div><h2 className="text-sm font-semibold text-gray-900">Edit table structure SQL</h2><p className="text-[11px] text-gray-500">{structureDraft.schemaName}.{structureDraft.originalTableName} · reviewable ALTER script</p></div></div>
          <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
            <div className="min-h-0 overflow-auto p-4">
              <div className="mb-3 grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                <label className="grid gap-1 text-[11px] text-gray-600"><span className="font-semibold uppercase">Schema</span><input aria-label="Structure schema" value={structureDraft.schemaName} onChange={event => setStructureDraft(current => ({ ...current, schemaName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[12px] outline-none focus:border-blue-500" /></label>
                <label className="grid gap-1 text-[11px] text-gray-600"><span className="font-semibold uppercase">Table</span><input aria-label="Structure table name" value={structureDraft.tableName} onChange={event => setStructureDraft(current => ({ ...current, tableName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[12px] outline-none focus:border-blue-500" /></label>
              </div>
              <div className="overflow-x-auto border border-gray-200">
                <div className="grid min-w-[1120px] grid-cols-[170px_140px_80px_70px_160px_220px_80px_40px] border-b border-gray-200 bg-gray-100 px-2 py-2 text-[10px] font-semibold uppercase text-gray-500">
                  <span>Name</span><span>Type</span><span>Nullable</span><span>PK</span><span>Default</span><span>Comment</span><span>Drop</span><span />
                </div>
                {structureDraft.columns.map(column => {
                  const updateColumn = (patch: Partial<StructureColumnDraft>) => setStructureDraft(current => ({ ...current, columns: current.columns.map(item => item.id === column.id ? { ...item, ...patch } : item) }));
                  return <div key={column.id} className={`grid min-w-[1120px] grid-cols-[170px_140px_80px_70px_160px_220px_80px_40px] items-center border-b border-gray-100 px-2 py-1.5 ${column.drop ? 'bg-red-50 opacity-80' : column.added ? 'bg-emerald-50' : ''}`}>
                    <input aria-label={column.added ? 'New structure column name' : `Structure column ${column.originalName} name`} value={column.name} disabled={column.drop} onChange={event => updateColumn({ name: event.target.value })} className="mr-2 h-8 border border-gray-300 px-2 font-mono text-[11px] outline-none focus:border-blue-500 disabled:bg-gray-100" />
                    <input aria-label={column.added ? 'New structure column type' : `Structure column ${column.originalName} type`} value={column.nativeType} disabled={column.drop} onChange={event => updateColumn({ nativeType: event.target.value })} className="mr-2 h-8 border border-gray-300 px-2 font-mono text-[11px] outline-none focus:border-blue-500 disabled:bg-gray-100" />
                    <label className="flex justify-center"><input aria-label={column.added ? 'New structure column nullable' : `Structure column ${column.originalName} nullable`} type="checkbox" checked={column.nullable} disabled={column.drop || column.primaryKey} onChange={event => updateColumn({ nullable: event.target.checked })} /></label>
                    <span className="text-center text-[10px] text-gray-500">{column.primaryKey ? 'PK' : column.added ? '-' : ''}</span>
                    <input aria-label={column.added ? 'New structure column default' : `Structure column ${column.originalName} default`} value={column.defaultValue} disabled={column.drop} onChange={event => updateColumn({ defaultValue: event.target.value })} className="mr-2 h-8 border border-gray-300 px-2 font-mono text-[11px] outline-none focus:border-blue-500 disabled:bg-gray-100" placeholder="NULL / now()" />
                    <input aria-label={column.added ? 'New structure column comment' : `Structure column ${column.originalName} comment`} value={column.comment} disabled={column.drop} onChange={event => updateColumn({ comment: event.target.value })} className="mr-2 h-8 border border-gray-300 px-2 text-[11px] outline-none focus:border-blue-500 disabled:bg-gray-100" />
                    <label className="flex justify-center"><input aria-label={column.added ? 'Remove new structure column' : `Drop structure column ${column.originalName}`} type="checkbox" checked={column.drop} onChange={event => column.added ? setStructureDraft(current => ({ ...current, columns: current.columns.filter(item => item.id !== column.id) })) : updateColumn({ drop: event.target.checked })} /></label>
                    <span className="text-[9px] uppercase text-gray-400">{column.added ? 'new' : column.name !== column.originalName || column.nativeType !== column.originalType || column.nullable !== column.originalNullable || column.defaultValue !== column.originalDefault || column.comment !== column.originalComment || column.drop ? 'chg' : ''}</span>
                  </div>;
                })}
              </div>
              <button onClick={() => setStructureDraft(current => ({ ...current, columns: [...current.columns, createBlankStructureColumnDraft()] }))} className="mt-3 flex h-8 items-center gap-1.5 border border-gray-300 px-3 text-[11px] text-gray-700 hover:bg-gray-50"><Plus className="h-3.5 w-3.5" /> Add column</button>
              <div className="mt-4 grid gap-3 border border-gray-200 bg-gray-50 p-3">
                <label className="grid gap-1 text-[11px] text-gray-600"><span className="font-semibold uppercase">Table comment</span><input value={structureDraft.tableComment} onChange={event => setStructureDraft(current => ({ ...current, tableComment: event.target.value }))} className="h-8 border border-gray-300 px-2 text-[11px] outline-none focus:border-blue-500" /></label>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_90px]">
                  <input value={structureDraft.newIndexName} onChange={event => setStructureDraft(current => ({ ...current, newIndexName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="new index name" />
                  <input value={structureDraft.newIndexColumns} onChange={event => setStructureDraft(current => ({ ...current, newIndexColumns: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="index columns: a,b" />
                  <label className="flex items-center gap-2 text-[11px] text-gray-600"><input type="checkbox" checked={structureDraft.newIndexUnique} onChange={event => setStructureDraft(current => ({ ...current, newIndexUnique: event.target.checked }))} /> Unique</label>
                </div>
                <input value={structureDraft.dropIndexName} onChange={event => setStructureDraft(current => ({ ...current, dropIndexName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="drop index name" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <input value={structureDraft.newForeignKeyName} onChange={event => setStructureDraft(current => ({ ...current, newForeignKeyName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="new FK name" />
                  <input value={structureDraft.foreignKeyColumns} onChange={event => setStructureDraft(current => ({ ...current, foreignKeyColumns: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="FK columns: customer_id" />
                  <input value={structureDraft.foreignKeyReferenceTable} onChange={event => setStructureDraft(current => ({ ...current, foreignKeyReferenceTable: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="reference table: public.customers" />
                  <input value={structureDraft.foreignKeyReferenceColumns} onChange={event => setStructureDraft(current => ({ ...current, foreignKeyReferenceColumns: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="reference columns: id" />
                </div>
                <input value={structureDraft.dropForeignKeyName} onChange={event => setStructureDraft(current => ({ ...current, dropForeignKeyName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="drop foreign key / constraint name" />
                <div className="grid gap-2">
                  <input value={structureDraft.triggerName} onChange={event => setStructureDraft(current => ({ ...current, triggerName: event.target.value }))} className="h-8 border border-gray-300 px-2 font-mono text-[11px]" placeholder="trigger name" />
                  <textarea value={structureDraft.triggerSql} onChange={event => setStructureDraft(current => ({ ...current, triggerSql: event.target.value }))} className="min-h-20 border border-gray-300 px-2 py-1 font-mono text-[11px] outline-none focus:border-blue-500" placeholder="CREATE TRIGGER ..." />
                </div>
              </div>
            </div>
            <div className="flex min-h-0 flex-col border-t border-gray-200 lg:border-l lg:border-t-0">
              <div className="flex h-9 shrink-0 items-center border-b border-gray-200 bg-gray-50 px-3 text-[10px] font-semibold uppercase text-gray-500">SQL preview</div>
              <pre className="min-h-0 flex-1 overflow-auto bg-gray-950 p-4 font-mono text-[11px] leading-5 text-emerald-200">{generateStructureSql(structureDraft, workspaceProvider)}</pre>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button onClick={() => setStructureDraft(current => ({ ...current, open: false }))} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50">Close</button><button onClick={openStructureSql} className="flex h-8 items-center gap-1.5 bg-blue-700 px-3 text-[11px] font-medium text-white hover:bg-blue-800"><Code2 className="h-3.5 w-3.5" /> Open SQL in tab</button></div>
        </div>
      </div>}
      {mutationReview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Review source transaction">
        <div className="flex max-h-[80vh] w-full max-w-2xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><ShieldCheck className="h-4 w-4 text-emerald-700" /><div><h2 className="text-sm font-semibold text-gray-900">Review source transaction</h2><p className="text-[11px] text-gray-500">{mutationReview.preview.rowCount} row{mutationReview.preview.rowCount === 1 ? '' : 's'} · optimistic concurrency · one transaction</p></div></div>
          <pre className="min-h-0 flex-1 overflow-auto bg-gray-950 p-4 font-mono text-[11px] leading-5 text-emerald-200">{mutationReview.preview.statements.join('\n\n')}</pre>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button disabled={isCommitting} onClick={() => setMutationReview(null)} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-40">Cancel</button><button disabled={isCommitting || !mutationReview.preview.canCommit} onClick={() => void commitSourceChanges()} className="flex h-8 items-center gap-1.5 bg-emerald-700 px-3 text-[11px] font-medium text-white hover:bg-emerald-800 disabled:opacity-40">{isCommitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Commit transaction</button></div>
        </div>
      </div>}
      {scriptReview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Review SQL script transaction">
        <div className="flex max-h-[80vh] w-full max-w-2xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><ShieldCheck className="h-4 w-4 text-blue-700" /><div><h2 className="text-sm font-semibold text-gray-900">Review SQL script transaction</h2><p className="text-[11px] text-gray-500">{importProgress ? `${importProgress.executed}/${importProgress.total} statements executed` : `${scriptReview.preview.statementCount} statement${scriptReview.preview.statementCount === 1 ? '' : 's'} · rollback on failure`}</p></div></div>
          <pre className="min-h-0 flex-1 overflow-auto bg-gray-950 p-4 font-mono text-[11px] leading-5 text-emerald-200">{scriptReview.preview.statements.join('\n\n')}</pre>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button onClick={isCommitting ? cancelSqlImport : () => setScriptReview(null)} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-40">{isCommitting ? 'Cancel import' : 'Cancel'}</button><button disabled={isCommitting || !scriptReview.preview.canCommit} onClick={() => void commitSqlScript()} className="flex h-8 items-center gap-1.5 bg-blue-700 px-3 text-[11px] font-medium text-white hover:bg-blue-800 disabled:opacity-40">{isCommitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />} Commit script</button></div>
        </div>
      </div>}
      {fileImportDraft.open && activeTableNode && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Import CSV or Excel into current table">
        <div className="flex max-h-[82vh] w-full max-w-3xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><FileSpreadsheet className="h-4 w-4 text-blue-700" /><div><h2 className="text-sm font-semibold text-gray-900">Import CSV or Excel</h2><p className="text-[11px] text-gray-500">{fileImportDraft.fileName} to {fileImportDraft.schema}.{fileImportDraft.table}</p></div></div>
          <div className="min-h-0 flex-1 overflow-auto p-4 text-[11px]">
            <div className="mb-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <div className="truncate rounded-sm border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600">Detected columns: {fileImportDraft.headers.join(', ') || 'none'}</div>
              <label className="grid gap-1 text-gray-600"><span className="font-semibold uppercase">Error mode</span><select value={fileImportDraft.errorMode} disabled={fileImportDraft.running} onChange={event => setFileImportDraft(current => ({ ...current, errorMode: event.target.value as FileTableImportDraft['errorMode'] }))} className="h-8 border border-gray-300 bg-white px-2"><option value="stop_rollback">Stop + rollback</option><option value="stop_commit">Stop + commit inserted</option><option value="skip_continue">Skip + continue</option></select></label>
            </div>
            <div className="rounded-sm border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-gray-500"><span>Column mapping</span><span>{Object.values(fileImportDraft.columnMap).filter(Boolean).length}/{activeTableNode.columns.filter(column => !column.primaryKey).length} mapped</span></div>
              <div className="grid gap-2">
                {activeTableNode.columns.filter(column => !column.primaryKey).map(column => <label key={column.name} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
                  <span className="truncate font-mono text-gray-700">{column.name}</span>
                  <select value={fileImportDraft.columnMap[column.name] ?? ''} disabled={fileImportDraft.running} onChange={event => setFileImportDraft(current => ({ ...current, columnMap: { ...current.columnMap, [column.name]: event.target.value } }))} className="h-7 border border-gray-300 bg-white px-2 font-mono text-[10px]"><option value="">Skip</option>{fileImportDraft.headers.map(header => <option key={header} value={header}>{header}</option>)}</select>
                </label>)}
              </div>
            </div>
            {fileImportDraft.running && <div className="mt-3 flex items-center gap-2 text-blue-700"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Imported {fileImportDraft.importedRows.toLocaleString('en')} / skipped {fileImportDraft.skippedRows.toLocaleString('en')}</div>}
            {fileImportDraft.error && <div className="mt-3 border-l-2 border-red-500 bg-red-50 px-3 py-2 text-red-700">{fileImportDraft.error}</div>}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button disabled={fileImportDraft.running} onClick={() => setFileImportDraft(current => ({ ...current, open: false }))} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-40">Close</button><button disabled={fileImportDraft.running || !fileImportDraft.file || Object.values(fileImportDraft.columnMap).every(value => !value)} onClick={() => void importFileDraftToCurrentTable()} className="flex h-8 items-center gap-1.5 bg-blue-700 px-3 text-[11px] font-medium text-white hover:bg-blue-800 disabled:opacity-40">{fileImportDraft.running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />} Import rows</button></div>
        </div>
      </div>}
      {insertDraft.open && activeTableNode && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Insert new row">
        <div className="flex max-h-[82vh] w-full max-w-xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><Plus className="h-4 w-4 text-emerald-700" /><div><h2 className="text-sm font-semibold text-gray-900">Insert new row</h2><p className="text-[11px] text-gray-500">{activeTab.tableContext?.schema}.{activeTab.tableContext?.table} · primary keys use database defaults</p></div></div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <div className="grid gap-3">
              {activeTableNode.columns.filter(column => !column.primaryKey).map(column => (
                <label key={column.name} className="grid gap-1 text-[11px] text-gray-600">
                  <span className="flex items-center gap-2"><span className="font-medium text-gray-800">{column.name}</span><span className="font-mono text-[9px] text-gray-400">{column.nativeType}</span>{column.nullable && <span className="text-[9px] text-gray-400">nullable</span>}</span>
                  <input value={insertDraft.values[column.name] ?? ''} onChange={event => setInsertDraft(current => ({ ...current, values: { ...current.values, [column.name]: event.target.value } }))} className="h-8 border border-gray-300 px-2 font-mono text-[12px] text-gray-800 outline-none focus:border-emerald-600" />
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button onClick={() => setInsertDraft({ open: false, values: {} })} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50">Cancel</button><button onClick={addInsertDraft} className="flex h-8 items-center gap-1.5 bg-emerald-700 px-3 text-[11px] font-medium text-white hover:bg-emerald-800"><Plus className="h-3.5 w-3.5" /> Add pending row</button></div>
        </div>
      </div>}
      {pendingCloseTabId && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Unsaved tab changes">
        <div className="w-full max-w-sm border border-gray-300 bg-white shadow-xl">
          <div className="border-b border-gray-200 px-4 py-3"><h2 className="text-sm font-semibold text-gray-900">Unsaved changes</h2><p className="mt-1 text-[12px] text-gray-500">Closing this tab will discard pending result edits, inserts, or deletes.</p></div>
          <div className="flex items-center justify-end gap-2 px-4 py-3"><button onClick={() => setPendingCloseTabId(null)} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50">Cancel</button><button onClick={() => { const tabId = pendingCloseTabId; setPendingCloseTabId(null); performCloseTab(tabId); }} className="h-8 bg-red-600 px-3 text-[11px] font-medium text-white hover:bg-red-700">Discard and close</button></div>
        </div>
      </div>}
      {sqlAssistant && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="SQL assistant">
        <div className="flex max-h-[82vh] w-full max-w-2xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><Sparkles className="h-4 w-4 text-blue-600" /><div><h2 className="text-sm font-semibold text-gray-900">SQL assistant</h2><p className="text-[11px] text-gray-500">{sqlAssistant.intent} · {sqlAssistant.risk} risk · static inspection</p></div></div>
          <div className="min-h-0 flex-1 overflow-auto p-4 text-[12px]">
            <div className="mb-4 grid gap-2 rounded-sm border border-gray-200 bg-gray-50 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Observations</div>
              {sqlAssistant.observations.map(item => <div key={item} className="text-gray-700">{item}</div>)}
            </div>
            <div className="mb-4 grid gap-2 rounded-sm border border-blue-200 bg-blue-50 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">Optimize / safety hints</div>
              {sqlAssistant.recommendations.map(item => <div key={item} className="text-blue-900">{item}</div>)}
            </div>
            {sqlAssistant.optimizedSketch && <div className="rounded-sm border border-gray-200"><div className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Sketch</div><pre className="overflow-auto bg-gray-950 p-3 font-mono text-[11px] leading-5 text-emerald-200">{sqlAssistant.optimizedSketch}</pre></div>}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button onClick={() => setSqlAssistant(null)} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50">Close</button></div>
        </div>
      </div>}
      {importDraft.open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4" role="dialog" aria-modal="true" aria-label="Import source into database">
        <div className="flex max-h-[82vh] w-full max-w-2xl flex-col border border-gray-300 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3"><FileSpreadsheet className="h-4 w-4 text-blue-600" /><div><h2 className="text-sm font-semibold text-gray-900">Import source into database</h2><p className="text-[11px] text-gray-500">Batched inserts from a Simple-understood source into a writable DB table.</p></div></div>
          <div className="min-h-0 flex-1 space-y-3 overflow-auto p-4 text-[12px]">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1 text-gray-600"><span className="text-[10px] font-semibold uppercase">Source</span><select value={importDraft.sourceId} disabled={importDraft.running} onChange={event => { const source = sources.find(item => item.id === event.target.value); const sourceTable = source?.tables[0]; const [schemaName, tableName] = importDraft.target.split('.'); const targetTable = writableTables.find(item => item.schemaName === schemaName && item.table.name === tableName)?.table; setImportDraft(current => ({ ...current, sourceId: event.target.value, tableName: sourceTable?.name ?? '', newTableName: sourceTable?.name ? sourceTable.name.replace(/[^a-zA-Z0-9_]+/g, '_').toLocaleLowerCase() : current.newTableName, columnMap: sourceTable && targetTable ? defaultImportColumnMap(sourceTable.columns, targetTable.columns) : {} })); }} className="h-8 border border-gray-300 bg-white px-2 text-[11px]">{sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}</select></label>
              <label className="grid gap-1 text-gray-600"><span className="text-[10px] font-semibold uppercase">Source table</span><select value={importDraft.tableName} disabled={importDraft.running} onChange={event => { const source = sources.find(item => item.id === importDraft.sourceId); const sourceTable = source?.tables.find(table => table.name === event.target.value); const [schemaName, tableName] = importDraft.target.split('.'); const targetTable = writableTables.find(item => item.schemaName === schemaName && item.table.name === tableName)?.table; setImportDraft(current => ({ ...current, tableName: event.target.value, newTableName: sourceTable?.name ? sourceTable.name.replace(/[^a-zA-Z0-9_]+/g, '_').toLocaleLowerCase() : current.newTableName, columnMap: sourceTable && targetTable ? defaultImportColumnMap(sourceTable.columns, targetTable.columns) : {} })); }} className="h-8 border border-gray-300 bg-white px-2 text-[11px]">{sources.find(source => source.id === importDraft.sourceId)?.tables.map(table => <option key={table.name} value={table.name}>{table.name}</option>)}</select></label>
              <label className="grid gap-1 text-gray-600"><span className="text-[10px] font-semibold uppercase">Target table</span><select value={importDraft.target} disabled={importDraft.running} onChange={event => { const sourceTable = sources.find(source => source.id === importDraft.sourceId)?.tables.find(table => table.name === importDraft.tableName); const [schemaName, tableName] = event.target.value.split('.'); const targetTable = writableTables.find(item => item.schemaName === schemaName && item.table.name === tableName)?.table; setImportDraft(current => ({ ...current, target: event.target.value, columnMap: sourceTable && targetTable ? defaultImportColumnMap(sourceTable.columns, targetTable.columns) : {} })); }} className="h-8 border border-gray-300 bg-white px-2 text-[11px]"><option value={CREATE_NEW_IMPORT_TARGET}>Create new table script</option>{writableTables.map(item => <option key={`${item.schemaName}.${item.table.name}`} value={`${item.schemaName}.${item.table.name}`}>{item.schemaName}.{item.table.name}</option>)}</select></label>
            </div>
            {importDraft.target === CREATE_NEW_IMPORT_TARGET && <div className="grid gap-3 rounded-sm border border-blue-100 bg-blue-50 p-3 sm:grid-cols-[160px_minmax(0,1fr)]">
              <label className="grid gap-1 text-[11px] text-blue-900"><span className="font-semibold uppercase">New schema</span><input aria-label="Import new schema" value={importDraft.newSchemaName} disabled={importDraft.running} onChange={event => setImportDraft(current => ({ ...current, newSchemaName: event.target.value }))} className="h-8 border border-blue-200 bg-white px-2 font-mono text-[12px] outline-none focus:border-blue-500" /></label>
              <label className="grid gap-1 text-[11px] text-blue-900"><span className="font-semibold uppercase">New table</span><input aria-label="Import new table" value={importDraft.newTableName} disabled={importDraft.running} onChange={event => setImportDraft(current => ({ ...current, newTableName: event.target.value }))} className="h-8 border border-blue-200 bg-white px-2 font-mono text-[12px] outline-none focus:border-blue-500" /></label>
            </div>}
            {(() => {
              const sourceTable = sources.find(source => source.id === importDraft.sourceId)?.tables.find(table => table.name === importDraft.tableName);
              const [schemaName, tableName] = importDraft.target.split('.');
              const targetTable = writableTables.find(item => item.schemaName === schemaName && item.table.name === tableName)?.table;
              const targets = targetTable?.columns.filter(column => !column.primaryKey) ?? [];
              const mappedCount = targets.filter(column => importDraft.columnMap[column.name]).length;
              if (importDraft.target === CREATE_NEW_IMPORT_TARGET) {
                return <div className="rounded-sm border border-gray-200 bg-gray-50 p-3"><div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-gray-500"><span>Generated columns</span><span>{sourceTable?.columns.length ?? 0}</span></div>{sourceTable ? <div className="grid gap-1">{sourceTable.columns.map(column => <div key={column} className="grid grid-cols-[minmax(0,1fr)_120px] gap-2 text-[11px]"><span className="truncate font-mono text-gray-700">{column}</span><span className="font-mono text-gray-500">{importColumnSqlType(sourceTable.profiles[column]?.dataType)}</span></div>)}</div> : <div className="text-red-700">Choose a source table.</div>}</div>;
              }
              return <div className="rounded-sm border border-gray-200 bg-gray-50 p-3"><div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-gray-500"><span>Column mapping</span><span>{mappedCount}/{targets.length} mapped</span></div>{sourceTable && targetTable && targets.length ? <div className="grid gap-2">{targets.map(column => <label key={column.name} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 text-[11px]"><span className="truncate font-mono text-gray-700">{column.name}</span><select value={importDraft.columnMap[column.name] ?? ''} disabled={importDraft.running} onChange={event => setImportDraft(current => ({ ...current, columnMap: { ...current.columnMap, [column.name]: event.target.value } }))} className="h-7 border border-gray-300 bg-white px-2 font-mono text-[10px]"><option value="">Skip</option>{sourceTable.columns.map(sourceColumn => <option key={sourceColumn} value={sourceColumn}>{sourceColumn}</option>)}</select></label>)}</div> : <div className="text-red-700">Choose a source and target table.</div>}</div>;
            })()}
            {importDraft.running && <div className="flex items-center gap-2 text-blue-700"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Imported {importDraft.importedRows.toLocaleString('en')} rows...</div>}
            {importDraft.error && <div className="border-l-2 border-red-500 bg-red-50 px-3 py-2 text-red-700">{importDraft.error}</div>}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3"><button disabled={importDraft.running} onClick={() => setImportDraft(current => ({ ...current, open: false }))} className="h-8 border border-gray-300 px-3 text-[11px] text-gray-600 hover:bg-gray-50 disabled:opacity-40">Close</button><button disabled={importDraft.running || !importDraft.sourceId || !importDraft.tableName || !importDraft.target || (importDraft.target === CREATE_NEW_IMPORT_TARGET && !importDraft.newTableName.trim())} onClick={() => void importSourceIntoTable()} className="flex h-8 items-center gap-1.5 bg-blue-700 px-3 text-[11px] font-medium text-white hover:bg-blue-800 disabled:opacity-40">{importDraft.running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />} {importDraft.target === CREATE_NEW_IMPORT_TARGET ? 'Generate SQL' : 'Import'}</button></div>
        </div>
      </div>}
    </div>
  );
};
