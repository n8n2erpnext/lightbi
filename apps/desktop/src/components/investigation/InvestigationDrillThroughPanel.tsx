import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ClipboardCheck, Download, FileSpreadsheet, Plus, SlidersHorizontal, X } from 'lucide-react';
import { formatValue, inferSemanticType } from '../../lib/display-formatter';
import { exportRowsAsCsv, exportRowsAsXlsx, type DrillThroughResult } from '../../lib/drill-through-export';
import type { DisplayPreferences } from '../../stores/display-preferences-store';
import { buildDrillBreakdowns } from '../../lib/drill-through-analysis';
import { pickUiText } from '../../lib/ui-language';
import {
  filterDrillThroughRows,
  getDrillThroughFilterSuggestions,
  type DrillThroughFilter,
  type DrillThroughFilterOperator,
} from '../../lib/drill-through-filter';

export interface FilteredDeepAnalysisScope {
  rows: Record<string, unknown>[];
  filters: DrillThroughFilter[];
  point: DrillThroughResult['point'];
  matchedRowCount: number;
  selectedRowCount: number;
  sourceResultRowCount: number;
  maxRows: number;
  isTruncated: boolean;
}

export interface InvestigationDrillThroughPanelProps {
  drillError: string | null;
  drillExportBaseName: string;
  drillResult: DrillThroughResult | null;
  isDrilling: boolean;
  onAnalyzeSelection?: (scope: FilteredDeepAnalysisScope) => void;
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
  onAnalyzeSelection,
  onClose,
  preferences,
  selectedDrillRows,
  setSelectedDrillRows,
}) => {
  const [filterColumn, setFilterColumn] = useState('');
  const [filterOperator, setFilterOperator] = useState<DrillThroughFilterOperator>('equals');
  const [filterValue, setFilterValue] = useState('');
  const [filters, setFilters] = useState<DrillThroughFilter[]>([]);
  const filteredEntries = useMemo(
    () => drillResult ? filterDrillThroughRows(drillResult.rows, filters) : [],
    [drillResult, filters],
  );
  const filteredRows = useMemo(() => filteredEntries.map(entry => entry.row), [filteredEntries]);
  const selectedFilteredRows = useMemo(
    () => filteredEntries.filter(entry => selectedDrillRows.has(entry.index)).map(entry => entry.row),
    [filteredEntries, selectedDrillRows],
  );
  const breakdowns = useMemo(() => drillResult
    ? buildDrillBreakdowns(drillResult.columns, filteredRows, drillResult.point.dimensionField)
    : [], [drillResult, filteredRows]);
  const filterSuggestions = useMemo(
    () => drillResult && filterColumn ? getDrillThroughFilterSuggestions(drillResult.rows, filterColumn) : [],
    [drillResult, filterColumn],
  );
  useEffect(() => {
    setFilters([]);
    setFilterColumn(drillResult?.columns[0] ?? '');
    setFilterOperator('equals');
    setFilterValue('');
  }, [drillResult]);
  useEffect(() => {
    if (!drillResult) return;
    setSelectedDrillRows(new Set(filteredEntries.map(entry => entry.index)));
  }, [drillResult, filteredEntries, setSelectedDrillRows]);
  if (!isDrilling && !drillError && !drillResult) return null;
  const t = (source: string) => pickUiText(preferences.language, source);
  const allSelected = filteredEntries.length > 0 && filteredEntries.every(entry => selectedDrillRows.has(entry.index));
  const selectAll = (selected: boolean) => setSelectedDrillRows(current => {
    const next = new Set(current);
    filteredEntries.forEach(entry => selected ? next.add(entry.index) : next.delete(entry.index));
    return next;
  });
  const addFilter = () => {
    if (!filterColumn || !filterValue.trim()) return;
    setFilters(current => [...current, {
      id: `${Date.now()}-${current.length}`,
      column: filterColumn,
      operator: filterOperator,
      value: filterValue.trim(),
    }]);
    setFilterValue('');
  };

  return <div data-testid="investigation-drill-through" className="mt-5 rounded-lg border border-black/10 bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-black/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0"><div className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4 text-emerald-600" /><h3 className="text-sm font-semibold text-gray-900">{t('Analysis of the selected chart group')}</h3></div><p className="mt-1 text-xs text-gray-500">{isDrilling ? t('Loading matching source rows...') : drillResult ? `${formatValue(drillResult.rowCount, 'number', preferences)} ${t('records matched')}: ${drillResult.point.dimensionField} = ${drillResult.point.label}` : t('Unable to load matching rows.')}</p></div>
      <div className="flex flex-wrap items-center gap-2">{drillResult && drillResult.rows.length > 0 && <><button data-testid="analyze-selected-rows" onClick={() => onAnalyzeSelection?.({ rows: selectedFilteredRows, filters: [...filters], point: drillResult.point, matchedRowCount: filteredRows.length, selectedRowCount: selectedFilteredRows.length, sourceResultRowCount: drillResult.rowCount, maxRows: drillResult.maxRows, isTruncated: drillResult.rows.length >= drillResult.maxRows })} disabled={!onAnalyzeSelection || selectedFilteredRows.length === 0} className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-40"><ClipboardCheck className="h-3.5 w-3.5" />{t('Deep analysis of selected data')}</button><button onClick={() => selectAll(!allSelected)} className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/65 transition-colors hover:bg-black/[0.035]">{allSelected ? t('Clear selection') : t('Select all')}</button><button onClick={() => exportRowsAsCsv(`${drillExportBaseName}.csv`, drillResult.columns, selectedFilteredRows)} disabled={selectedFilteredRows.length === 0} className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/65 transition-colors hover:bg-black/[0.035] disabled:opacity-40"><Download className="h-3.5 w-3.5" /> CSV</button><button onClick={() => exportRowsAsXlsx(`${drillExportBaseName}.xlsx`, drillResult.columns, selectedFilteredRows)} disabled={selectedFilteredRows.length === 0} className="inline-flex items-center gap-1.5 rounded-md bg-[#202123] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black disabled:opacity-40"><Download className="h-3.5 w-3.5" /> Excel</button></>}<button onClick={onClose} className="rounded-md p-1.5 text-black/45 transition-colors hover:bg-black/[0.04] hover:text-[#202123]" title={t('Close')}><X className="h-4 w-4" /></button></div>
    </div>
    {drillError && <div className="m-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{drillError}</div>}
    {isDrilling && <div className="flex h-32 items-center justify-center text-sm text-gray-500"><Activity className="mr-2 h-4 w-4 animate-pulse" />{t('Filtering source rows...')}</div>}
    {drillResult && drillResult.rows.length > 0 && <div className="p-4">
      <section className="mb-4 rounded-xl border border-blue-100 bg-blue-50/50 p-3" data-testid="drill-through-filters">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-900"><SlidersHorizontal className="h-4 w-4 text-blue-600" />{t('Quick filters')}</div>
        <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(180px,1fr)_150px_minmax(200px,1.3fr)_auto]">
          <select aria-label={t('Filter column')} value={filterColumn} onChange={event => { setFilterColumn(event.target.value); setFilterValue(''); }} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800">{drillResult.columns.map(column => <option key={column} value={column}>{column}</option>)}</select>
          <select aria-label={t('Filter condition')} value={filterOperator} onChange={event => setFilterOperator(event.target.value as DrillThroughFilterOperator)} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"><option value="equals">{t('Equals')}</option><option value="contains">{t('Contains')}</option><option value="not_equals">{t('Does not equal')}</option></select>
          <div><input aria-label={t('Filter value')} list="drill-through-filter-values" value={filterValue} onChange={event => setFilterValue(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') addFilter(); }} placeholder={t('Enter or choose a value')} className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400" /><datalist id="drill-through-filter-values">{filterSuggestions.map(value => <option key={value} value={value} />)}</datalist></div>
          <button onClick={addFilter} disabled={!filterColumn || !filterValue.trim()} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40"><Plus className="h-3.5 w-3.5" />{t('Add filter')}</button>
        </div>
        {filters.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2">{filters.map(filter => <button key={filter.id} onClick={() => setFilters(current => current.filter(item => item.id !== filter.id))} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2.5 py-1 text-[11px] font-medium text-blue-800" title={t('Remove filter')}>{filter.column} {filter.operator === 'contains' ? t('contains') : filter.operator === 'not_equals' ? '≠' : '='} {filter.value}<X className="h-3 w-3" /></button>)}<button onClick={() => setFilters([])} className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900">{t('Clear filters')}</button><span className="ml-auto text-[11px] font-semibold text-emerald-700">{formatValue(filteredRows.length, 'number', preferences)} / {formatValue(drillResult.rows.length, 'number', preferences)} {t('matching rows')}</span></div>}
      </section>
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {breakdowns.map(breakdown => <section key={breakdown.column} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between gap-2"><h4 className="truncate text-xs font-semibold text-slate-900">{t('Breakdown by')} {breakdown.column}</h4><span className="text-[10px] text-slate-500">{formatValue(breakdown.totalGroups, 'number', preferences)} {t('groups')}</span></div><ol className="mt-3 space-y-2">{breakdown.items.map((item, index) => <li key={`${item.label}-${index}`}><div className="flex items-center justify-between gap-3 text-[11px]"><span className="truncate text-slate-700">{index + 1}. {item.label}</span><span className="shrink-0 font-semibold text-slate-900">{formatValue(item.count, 'number', preferences)} · {formatValue(item.share * 100, 'number', preferences)}%</span></div><div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(2, item.share * 100)}%` }} /></div></li>)}</ol></section>)}
      </div>
      <div className="mb-3 flex items-center justify-between text-xs text-gray-500"><span>{formatValue(selectedFilteredRows.length, 'number', preferences)} / {formatValue(filteredRows.length, 'number', preferences)} {t('filtered rows selected for export')}</span>{drillResult.rows.length >= drillResult.maxRows && <span className="rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-700">{t('Limited to')} {formatValue(drillResult.maxRows, 'number', preferences)} {t('rows')}</span>}</div>
      {filteredEntries.length > 0 ? <div className="max-h-[360px] overflow-auto rounded-md border border-gray-200"><table className="min-w-full divide-y divide-gray-200 text-left text-xs"><thead className="sticky top-0 z-10 bg-gray-50 shadow-sm"><tr><th className="w-10 px-3 py-2"><input type="checkbox" checked={allSelected} onChange={event => selectAll(event.target.checked)} /></th>{drillResult.columns.map(column => <th key={column} className="whitespace-nowrap bg-gray-50 px-3 py-2 font-medium uppercase tracking-wider text-gray-500">{column}</th>)}</tr></thead><tbody className="divide-y divide-gray-200 bg-white">{filteredEntries.slice(0, 500).map(({ row, index: rowIndex }) => <tr key={rowIndex} className={selectedDrillRows.has(rowIndex) ? 'bg-blue-50/50' : undefined}><td className="px-3 py-2"><input type="checkbox" checked={selectedDrillRows.has(rowIndex)} onChange={event => setSelectedDrillRows(current => { const next = new Set(current); if (event.target.checked) next.add(rowIndex); else next.delete(rowIndex); return next; })} /></td>{drillResult.columns.map(column => <td key={column} className="whitespace-nowrap px-3 py-2 text-gray-900">{formatValue(row[column], inferSemanticType(column, row[column]), preferences)}</td>)}</tr>)}</tbody></table></div> : <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">{t('No rows match the current filters.')}</div>}
      {filteredEntries.length > 500 && <p className="mt-2 text-xs text-gray-500">{t('The table shows the first 500 filtered rows. Export includes every selected row matching the current filters.')}</p>}
    </div>}
  </div>;
};
