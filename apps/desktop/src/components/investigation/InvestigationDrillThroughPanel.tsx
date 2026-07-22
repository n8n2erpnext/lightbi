import React from 'react';
import { Activity, Download, FileSpreadsheet, X } from 'lucide-react';
import { formatValue, inferSemanticType } from '../../lib/display-formatter';
import { exportRowsAsCsv, exportRowsAsXlsx, type DrillThroughResult } from '../../lib/drill-through-export';
import type { DisplayPreferences } from '../../stores/display-preferences-store';

export interface InvestigationDrillThroughPanelProps {
  drillError: string | null;
  drillExportBaseName: string;
  drillResult: DrillThroughResult | null;
  isDrilling: boolean;
  onClose: () => void;
  preferences: DisplayPreferences;
  selectedDrillRows: Set<number>;
  selectedRows: Record<string, unknown>[];
  setSelectedDrillRows: React.Dispatch<React.SetStateAction<Set<number>>>;
}

export const InvestigationDrillThroughPanel: React.FC<InvestigationDrillThroughPanelProps> = ({
  drillError,
  drillExportBaseName,
  drillResult,
  isDrilling,
  onClose,
  preferences,
  selectedDrillRows,
  selectedRows,
  setSelectedDrillRows,
}) => {
  if (!isDrilling && !drillError && !drillResult) return null;
  const allSelected = Boolean(drillResult && selectedDrillRows.size === drillResult.rows.length);
  const selectAll = (selected: boolean) => setSelectedDrillRows(selected && drillResult ? new Set(drillResult.rows.map((_, index) => index)) : new Set());

  return <div className="mt-5 rounded-lg border border-black/10 bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-black/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0"><div className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-emerald-600" /><h3 className="text-sm font-semibold text-gray-900">Filtered rows from chart</h3></div><p className="mt-1 text-xs text-gray-500">{isDrilling ? 'Loading matching source rows...' : drillResult ? `${formatValue(drillResult.rowCount, 'number', preferences)} rows matched: ${drillResult.point.dimensionField} = ${drillResult.point.label}` : 'Unable to load matching rows.'}</p></div>
      <div className="flex flex-wrap items-center gap-2">{drillResult && drillResult.rows.length > 0 && <><button onClick={() => selectAll(!allSelected)} className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/65 transition-colors hover:bg-black/[0.035]">{allSelected ? 'Clear selection' : 'Select all'}</button><button onClick={() => exportRowsAsCsv(`${drillExportBaseName}.csv`, drillResult.columns, selectedRows)} disabled={selectedRows.length === 0} className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/65 transition-colors hover:bg-black/[0.035] disabled:opacity-40"><Download className="h-3.5 w-3.5" /> CSV</button><button onClick={() => exportRowsAsXlsx(`${drillExportBaseName}.xlsx`, drillResult.columns, selectedRows)} disabled={selectedRows.length === 0} className="inline-flex items-center gap-1.5 rounded-md bg-[#202123] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black disabled:opacity-40"><Download className="h-3.5 w-3.5" /> Excel</button></>}<button onClick={onClose} className="rounded-md p-1.5 text-black/45 transition-colors hover:bg-black/[0.04] hover:text-[#202123]" title="Close filtered rows"><X className="h-4 w-4" /></button></div>
    </div>
    {drillError && <div className="m-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{drillError}</div>}
    {isDrilling && <div className="flex h-32 items-center justify-center text-sm text-gray-500"><Activity className="mr-2 h-4 w-4 animate-pulse" />Filtering source rows...</div>}
    {drillResult && drillResult.rows.length > 0 && <div className="p-4">
      <div className="mb-3 flex items-center justify-between text-xs text-gray-500"><span>{formatValue(selectedRows.length, 'number', preferences)} of {formatValue(drillResult.rows.length, 'number', preferences)} rows selected for export</span>{drillResult.rows.length >= drillResult.maxRows && <span className="rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-700">Limited to {formatValue(drillResult.maxRows, 'number', preferences)} rows</span>}</div>
      <div className="max-h-[360px] overflow-auto rounded-md border border-gray-200"><table className="min-w-full divide-y divide-gray-200 text-left text-xs"><thead className="sticky top-0 z-10 bg-gray-50 shadow-sm"><tr><th className="w-10 px-3 py-2"><input type="checkbox" checked={allSelected && drillResult.rows.length > 0} onChange={event => selectAll(event.target.checked)} /></th>{drillResult.columns.map(column => <th key={column} className="whitespace-nowrap bg-gray-50 px-3 py-2 font-medium uppercase tracking-wider text-gray-500">{column}</th>)}</tr></thead><tbody className="divide-y divide-gray-200 bg-white">{drillResult.rows.slice(0, 500).map((row, rowIndex) => <tr key={rowIndex} className={selectedDrillRows.has(rowIndex) ? 'bg-blue-50/50' : undefined}><td className="px-3 py-2"><input type="checkbox" checked={selectedDrillRows.has(rowIndex)} onChange={event => setSelectedDrillRows(current => { const next = new Set(current); if (event.target.checked) next.add(rowIndex); else next.delete(rowIndex); return next; })} /></td>{drillResult.columns.map(column => <td key={column} className="whitespace-nowrap px-3 py-2 text-gray-900">{formatValue(row[column], inferSemanticType(column, row[column]), preferences)}</td>)}</tr>)}</tbody></table></div>
      {drillResult.rows.length > 500 && <p className="mt-2 text-xs text-gray-500">Showing first 500 rows in the browser table. Export includes all selected rows loaded in this drill-through result.</p>}
    </div>}
  </div>;
};
