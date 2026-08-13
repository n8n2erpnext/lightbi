import React from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Code2, Database } from 'lucide-react';
import type { RuntimeIntent } from '../../lib/analysis-runtime-contract';
import type { DuckDBPreviewResult } from '../../lib/duckdb-preview-sandbox';
import { formatValue, inferSemanticType } from '../../lib/display-formatter';
import type { ResultValidationResult } from '../../lib/result-validator-contract';
import type { RuntimePlanPreview } from '../../lib/runtime-planner-preview';
import type { SafeSqlPreview } from '../../lib/safe-sql-preview';
import type { DisplayPreferences } from '../../stores/display-preferences-store';

export interface InvestigationDiagnosticsProps {
  handoffCanExecute: boolean;
  isExecuting: boolean;
  onRunPreview: () => void;
  preferences: DisplayPreferences;
  previewResult: DuckDBPreviewResult | null;
  runtimeIntent: RuntimeIntent;
  runtimePlanPreview: RuntimePlanPreview;
  safeSqlPreview: SafeSqlPreview;
  showDiagnostics: boolean;
  validationResult: ResultValidationResult | null;
  onToggleDiagnostics: () => void;
}

export const InvestigationDiagnostics: React.FC<InvestigationDiagnosticsProps> = ({
  handoffCanExecute,
  isExecuting,
  onRunPreview,
  preferences,
  previewResult,
  runtimeIntent,
  runtimePlanPreview,
  safeSqlPreview,
  showDiagnostics,
  validationResult,
  onToggleDiagnostics,
}) => (
  <>
    <div className="flex flex-col gap-4 border-t border-black/5 bg-[#f7f7f6] px-6 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Preview execution</h3>
        <button onClick={onRunPreview} disabled={isExecuting || !handoffCanExecute} title={!handoffCanExecute ? 'Resolve the canonical preflight blockers before running this analysis.' : undefined} className="rounded-md bg-[#202123] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black disabled:opacity-50">
          {isExecuting ? 'Running...' : 'Execute preview'}
        </button>
      </div>
      {!previewResult && !isExecuting && <div className="text-xs text-slate-500 italic">Results not executed yet. Click "Run preview" to execute.</div>}
      {previewResult && <div className="flex flex-col gap-3">
        {previewResult.status === 'blocked' && <div className="mb-2 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-4"><div className="flex items-center gap-2 font-semibold text-amber-900"><AlertTriangle className="h-5 w-5" />Analysis Blocked</div><p className="text-sm text-amber-800">{previewResult.blockedReasons.join(', ') || 'Canonical preflight did not authorize execution.'}</p></div>}
        {previewResult.status === 'failed' && <div className="mb-2 flex flex-col gap-2 rounded-md border border-red-200 bg-red-50 p-4"><div className="flex items-center gap-2 font-semibold text-red-800"><AlertTriangle className="h-5 w-5" />Execution Failed</div><p className="text-sm text-red-700">{previewResult.errorMessage || 'The engine could not process the analysis request.'}</p>{validationResult?.warnings && validationResult.warnings.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-red-600">{validationResult.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>}</div>}
        {(() => {
          const cleansingWarnings = previewResult.warnings.filter(warning => warning.includes('underwent silent cleansing'));
          if (cleansingWarnings.length === 0) return null;
          return <div className="mb-1 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><h4 className="text-sm font-medium text-amber-800">Data Cleansing Active</h4><p className="mt-1 text-xs text-amber-700">The system has applied the <strong>Safe Numeric Guard</strong>. Dirty strings were automatically stripped of invalid characters or skipped to prevent execution failure during aggregation.</p><ul className="mt-1.5 list-disc pl-4 text-xs text-amber-700">{cleansingWarnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div></div>;
        })()}
        <div className="flex items-center gap-3 text-xs"><span className={`rounded px-2 py-0.5 font-medium ${previewResult.status === 'executed' ? 'bg-emerald-100 text-emerald-700' : previewResult.status === 'blocked' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'}`}>{previewResult.status.toUpperCase()}</span><span className="text-slate-500">Row count: {previewResult.rowCount}</span>{previewResult.executionScope && <span className="rounded bg-blue-50 px-2 py-0.5 font-medium text-blue-700">{previewResult.executionScope === 'full_file' ? 'Full file' : previewResult.executionScope === 'semantic_sample' ? 'Representative sample' : previewResult.executionScope === 'retained_rows' ? 'Retained rows' : 'Preview rows'}</span>}<span className="text-slate-400">•</span><span className="flex items-center gap-1 text-slate-500"><Database className="h-3 w-3" />Source: <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">{previewResult.source}</span></span></div>
        {previewResult.rows.length > 0 && <details className="group mb-2 mt-4"><summary className="mb-2 flex cursor-pointer list-none select-none items-center gap-2 text-sm font-semibold text-gray-800 transition-colors hover:text-indigo-600 [&::-webkit-details-marker]:hidden"><ChevronRight className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-90" /><Database className="h-4 w-4 text-gray-500 group-hover:text-indigo-500" />Raw rows evidence</summary><div className="pl-6"><p className="mb-3 text-xs text-gray-500">Scroll horizontally and vertically to inspect underlying raw data.</p><div className="max-h-[400px] overflow-auto rounded-md border border-gray-200"><table className="min-w-full divide-y divide-gray-200 text-left text-xs"><thead className="sticky top-0 z-10 bg-gray-50 shadow-sm"><tr>{previewResult.columns.map(column => <th key={column} className="bg-gray-50 px-3 py-2 font-medium uppercase tracking-wider text-gray-500">{column}</th>)}</tr></thead><tbody className="divide-y divide-gray-200 bg-white">{previewResult.rows.map((row, rowIndex) => <tr key={rowIndex}>{previewResult.columns.map(column => <td key={column} className="whitespace-nowrap px-3 py-2 text-gray-900">{formatValue(row[column], inferSemanticType(column, row[column]), preferences)}</td>)}</tr>)}</tbody></table></div></div></details>}
      </div>}
    </div>

    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300">
      <button onClick={onToggleDiagnostics} className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Code2 className="h-4 w-4" /></div><div><h3 className="mb-0.5 text-sm font-semibold text-gray-900">{showDiagnostics ? 'Hide developer diagnostics' : 'Show developer diagnostics'}</h3><p className="text-xs text-gray-500">Runtime intent, logical plan and SQL preview.</p></div></div><div className="text-gray-400">{showDiagnostics ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}</div></button>
      {showDiagnostics && <div className="border-t border-slate-800 bg-slate-900 p-0">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-2"><span className="font-mono text-[11px] uppercase tracking-wider text-slate-400">Pipeline State</span><div className="flex items-center gap-2"><span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${runtimeIntent.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>Intent: {runtimeIntent.status}</span><span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${runtimePlanPreview.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>Plan: {runtimePlanPreview.status}</span></div></div>
        <div className="grid grid-cols-1 gap-6 p-4 font-mono text-[11px] md:grid-cols-2">
          <div><h3 className="mb-2 font-semibold text-slate-500">Runtime Intent</h3><div className="space-y-1 text-slate-300"><p><span className="inline-block w-20 text-slate-500">Type:</span> <span className="text-pink-400">{runtimeIntent.type}</span></p><p><span className="inline-block w-20 text-slate-500">Shape:</span> <span className="text-emerald-400">{runtimeIntent.expectedShape}</span></p></div></div>
          <div>
            {previewResult?.warnings && previewResult.warnings.length > 0 && <div className="mb-4"><h3 className="mb-2 font-semibold text-slate-500">Execution Warnings</h3><div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 text-xs text-amber-500"><ul className="list-disc space-y-1 pl-4">{previewResult.warnings.map(warning => <li key={warning}>{warning}{warning === 'No dataset rows available for preview.' ? ' Execution wiring will be completed when dataset rows are passed into the investigation session.' : ''}</li>)}</ul></div></div>}
            <h3 className="mb-2 font-semibold text-slate-500">Runtime Plan</h3><div className="mb-4 space-y-1.5 rounded-lg border border-slate-800/50 bg-slate-950 p-3 text-slate-300">{runtimePlanPreview.logicalOperations.map((operation, index) => { let details = ''; if (operation.type === 'scan') details = operation.columns.join(', '); if (operation.type === 'group_by') details = `${operation.dimensions.join(', ')} / ${operation.measures.join(', ')}`; if (operation.type === 'trend') details = `${operation.timeDimension} / ${operation.measures.join(', ')}`; if (operation.type === 'distribution') details = operation.dimension; if (operation.type === 'relationship') details = operation.measures.join(', '); if (operation.type === 'limit') details = operation.rows.toString(); return <div key={index} className="flex"><span className="w-24 flex-shrink-0 text-pink-400">{operation.type}:</span><span className="text-slate-100">{details}</span></div>; })}</div>
            <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold text-slate-500">Safe SQL Preview</h3><span className={`rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${safeSqlPreview.status === 'ready' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{safeSqlPreview.status}</span></div>
            {safeSqlPreview.status === 'blocked' && <div className="mb-2 rounded-lg border border-red-900/50 bg-red-950/50 p-3 text-red-400"><p className="mb-1 font-semibold">Blocked Reasons:</p><ul className="list-disc space-y-0.5 pl-4">{safeSqlPreview.blockedReasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div>}
            {safeSqlPreview.sql && <div className="group relative"><div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"><span className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-500">{safeSqlPreview.dialect}</span></div><pre className="overflow-x-auto whitespace-pre rounded-lg border border-slate-800/50 bg-slate-950 p-3 font-mono text-[10px] leading-relaxed text-slate-300">{safeSqlPreview.sql}</pre><p className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500"><Database className="h-3 w-3" />SQL Preview only. Not executed yet.</p></div>}
          </div>
        </div>
      </div>}
    </div>
  </>
);
