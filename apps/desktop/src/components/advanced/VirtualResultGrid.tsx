import React, { useRef, useState } from 'react';
import type { QueryCellValue } from '@lightbi/core-types';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Braces, Columns, Copy, Database, Filter, ListTree, Pencil, Plus, Table2, Trash2 } from 'lucide-react';
import type { AdvancedQueryResult, AdvancedSort } from '../../lib/advanced-api';
import { advancedResultToCsv } from '../../lib/advanced-workspace';
import {
  copyTextToClipboard,
  displayCell,
  gridClipboardCell,
  parseClipboardRows,
  quoteIdentifier,
  readTextFromClipboard,
  sqlLiteral,
} from '../../lib/advanced-workspace-helpers';

const ROW_HEIGHT = 30;
const GRID_HEIGHT = 360;
const OVERSCAN = 8;

type GridPosition = { rowIndex: number; columnIndex: number };
type GridSelection = { anchor: GridPosition; focus: GridPosition };
export type GridForeignKeyAction = {
  id: string;
  columnNames: string[];
  label: string;
  onNavigate: (row: QueryCellValue[], result: AdvancedQueryResult) => void;
};

export const VirtualResultGrid: React.FC<{
  result: AdvancedQueryResult;
  sort?: AdvancedSort;
  onSort: (column: string) => void;
  columnWidths?: Record<string, number>;
  onColumnResize?: (columnId: string, width: number) => void;
  onColumnMove?: (columnId: string, direction: -1 | 1) => void;
  editable?: boolean;
  editedKeys?: Set<string>;
  deletedRows?: Set<number>;
  onEdit?: (rowIndex: number, columnIndex: number, oldValue: QueryCellValue, newValue: QueryCellValue) => void;
  onDuplicateRow?: (rowIndex: number) => void;
  onDeleteRow?: (rowIndex: number) => void;
  onRestoreRow?: (rowIndex: number) => void;
  copyTableName?: string;
  foreignKeyActions?: GridForeignKeyAction[];
  onRenameColumn?: (columnId: string, currentName: string) => void;
}> = ({ result, sort, onSort, columnWidths = {}, onColumnResize, onColumnMove, editable = false, editedKeys = new Set(), deletedRows = new Set(), onEdit, onDuplicateRow, onDeleteRow, onRestoreRow, copyTableName, foreignKeyActions = [], onRenameColumn }) => {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [editing, setEditing] = useState<{ rowIndex: number; columnIndex: number; value: string } | null>(null);
  const [selection, setSelection] = useState<GridSelection | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowIndex: number; columnIndex: number } | null>(null);
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const visibleCount = Math.ceil(GRID_HEIGHT / ROW_HEIGHT) + OVERSCAN * 2;
  const end = Math.min(result.rows.length, start + visibleCount);
  const resolvedColumnWidths = result.columns.map(column => Math.max(80, Math.min(520, columnWidths[column.id] ?? 180)));
  const gridWidth = Math.max(720, resolvedColumnWidths.reduce((sum, width) => sum + width, 0));
  const template = resolvedColumnWidths.length ? resolvedColumnWidths.map(width => `${width}px`).join(' ') : 'minmax(180px, 1fr)';
  const selectedRange = selection ? {
    rowStart: Math.min(selection.anchor.rowIndex, selection.focus.rowIndex),
    rowEnd: Math.max(selection.anchor.rowIndex, selection.focus.rowIndex),
    columnStart: Math.min(selection.anchor.columnIndex, selection.focus.columnIndex),
    columnEnd: Math.max(selection.anchor.columnIndex, selection.focus.columnIndex),
  } : null;
  const selectionSize = selectedRange ? {
    rows: selectedRange.rowEnd - selectedRange.rowStart + 1,
    columns: selectedRange.columnEnd - selectedRange.columnStart + 1,
  } : null;
  const isSelected = (rowIndex: number, columnIndex: number) => Boolean(
    selectedRange
    && rowIndex >= selectedRange.rowStart
    && rowIndex <= selectedRange.rowEnd
    && columnIndex >= selectedRange.columnStart
    && columnIndex <= selectedRange.columnEnd
  );
  const isActive = (rowIndex: number, columnIndex: number) => selection?.focus.rowIndex === rowIndex && selection.focus.columnIndex === columnIndex;
  const selectCell = (rowIndex: number, columnIndex: number, extend: boolean) => {
    const nextFocus = { rowIndex, columnIndex };
    setSelection(current => extend && current ? { anchor: current.anchor, focus: nextFocus } : { anchor: nextFocus, focus: nextFocus });
  };
  const moveSelection = (rowDelta: number, columnDelta: number, extend: boolean) => {
    setSelection(current => {
      const focus = current?.focus ?? { rowIndex: 0, columnIndex: 0 };
      const nextFocus = {
        rowIndex: Math.max(0, Math.min(result.rows.length - 1, focus.rowIndex + rowDelta)),
        columnIndex: Math.max(0, Math.min(result.columns.length - 1, focus.columnIndex + columnDelta)),
      };
      return extend && current ? { anchor: current.anchor, focus: nextFocus } : { anchor: nextFocus, focus: nextFocus };
    });
  };
  const copySelection = async () => {
    if (!selectedRange) return;
    const text = result.rows
      .slice(selectedRange.rowStart, selectedRange.rowEnd + 1)
      .map(row => row.slice(selectedRange.columnStart, selectedRange.columnEnd + 1).map(value => gridClipboardCell(value ?? null)).join('\t'))
      .join('\n');
    await copyTextToClipboard(text);
  };
  const selectedRowIndexes = (fallbackRow: number) => {
    if (!selectedRange) return [fallbackRow];
    const indexes: number[] = [];
    for (let index = selectedRange.rowStart; index <= selectedRange.rowEnd; index += 1) indexes.push(index);
    return indexes;
  };
  const selectedRowObjects = (fallbackRow: number) => selectedRowIndexes(fallbackRow).map(rowIndex => (
    Object.fromEntries(result.columns.map((column, columnIndex) => [column.name, result.rows[rowIndex]?.[columnIndex] ?? null]))
  ));
  const copyRowsAsJson = async (rowIndex: number) => {
    await copyTextToClipboard(JSON.stringify(selectedRowObjects(rowIndex), null, 2));
  };
  const copyRowsAsMarkdown = async (rowIndex: number) => {
    const rows = selectedRowIndexes(rowIndex).map(index => result.rows[index] ?? []);
    const header = `| ${result.columns.map(column => column.name).join(' | ')} |`;
    const divider = `| ${result.columns.map(() => '---').join(' | ')} |`;
    const body = rows.map(row => `| ${result.columns.map((_, index) => gridClipboardCell(row[index] ?? null).replaceAll('|', '\\|')).join(' | ')} |`);
    await copyTextToClipboard([header, divider, ...body].join('\n'));
  };
  const copyRowsAsInsert = async (rowIndex: number) => {
    const tableName = quoteIdentifier(copyTableName || 'target_table');
    const columns = result.columns.map(column => quoteIdentifier(column.name)).join(', ');
    const statements = selectedRowIndexes(rowIndex).map(index => {
      const row = result.rows[index] ?? [];
      return `INSERT INTO ${tableName} (${columns}) VALUES (${result.columns.map((_, columnIndex) => sqlLiteral(row[columnIndex] ?? null)).join(', ')});`;
    });
    await copyTextToClipboard(statements.join('\n'));
  };
  const copyRowsAsUpdate = async (rowIndex: number) => {
    if (result.columns.length === 0) return;
    const tableName = quoteIdentifier(copyTableName || 'target_table');
    const keyColumn = result.columns[0];
    const setColumns = result.columns.slice(1);
    const statements = selectedRowIndexes(rowIndex).map(index => {
      const row = result.rows[index] ?? [];
      const assignments = (setColumns.length ? setColumns : result.columns)
        .map((column, offset) => {
          const sourceIndex = setColumns.length ? offset + 1 : offset;
          return `${quoteIdentifier(column.name)} = ${sqlLiteral(row[sourceIndex] ?? null)}`;
        })
        .join(', ');
      return `UPDATE ${tableName} SET ${assignments} WHERE ${quoteIdentifier(keyColumn.name)} = ${sqlLiteral(row[0] ?? null)};`;
    });
    await copyTextToClipboard(statements.join('\n'));
  };
  const copyRowsAsCsv = async (rowIndex: number) => {
    const rows = selectedRowIndexes(rowIndex).map(index => result.rows[index] ?? []);
    await copyTextToClipboard(advancedResultToCsv(result.columns, rows));
  };
  const copyColumnAsInClause = async (rowIndex: number, columnIndex: number) => {
    const values = selectedRowIndexes(rowIndex).map(index => sqlLiteral(result.rows[index]?.[columnIndex] ?? null));
    await copyTextToClipboard(`${quoteIdentifier(result.columns[columnIndex]?.name || 'column')} IN (${values.join(', ')})`);
  };
  const copyColumnValues = async (rowIndex: number, columnIndex: number) => {
    const values = selectedRowIndexes(rowIndex).map(index => gridClipboardCell(result.rows[index]?.[columnIndex] ?? null));
    await copyTextToClipboard(values.join('\n'));
  };

  const coerceGridValue = (columnIndex: number, text: string): QueryCellValue => {
    const logicalType = result.columns[columnIndex]?.logicalType;
    let value: QueryCellValue = text;
    if (logicalType === 'number' && text.trim() !== '' && Number.isFinite(Number(text))) value = Number(text);
    else if (logicalType === 'boolean' && /^(true|false)$/i.test(text.trim())) value = text.trim().toLowerCase() === 'true';
    return value;
  };

  const commitEdit = (rowIndex: number, columnIndex: number, oldValue: QueryCellValue, text: string) => {
    const value = coerceGridValue(columnIndex, text);
    onEdit?.(rowIndex, columnIndex, oldValue, value);
    setEditing(null);
  };

  const pasteClipboardAt = async (rowIndex: number, columnIndex: number) => {
    if (!editable) return;
    if (deletedRows.has(rowIndex)) return;
    const matrix = parseClipboardRows(await readTextFromClipboard());
    if (matrix.length === 0) return;
    matrix.forEach((row, rowOffset) => {
      row.forEach((cell, columnOffset) => {
        const targetRow = rowIndex + rowOffset;
        const targetColumn = columnIndex + columnOffset;
        if (targetRow >= result.rows.length || targetColumn >= result.columns.length) return;
        if (deletedRows.has(targetRow)) return;
        const oldValue = result.rows[targetRow]?.[targetColumn] ?? null;
        onEdit?.(targetRow, targetColumn, oldValue, coerceGridValue(targetColumn, cell));
      });
    });
  };

  const startColumnResize = (event: React.PointerEvent, columnId: string, width: number) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const onMove = (moveEvent: PointerEvent) => {
      onColumnResize?.(columnId, Math.max(80, Math.min(520, width + moveEvent.clientX - startX)));
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label="Result grid"
      aria-rowcount={result.rows.length}
      aria-colcount={result.columns.length}
      tabIndex={0}
      className="h-full min-h-0 overflow-auto bg-white outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
      onScroll={event => setScrollTop(event.currentTarget.scrollTop)}
      onKeyDown={event => {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
          event.preventDefault();
          void copySelection();
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
          event.preventDefault();
          const focus = selection?.focus ?? { rowIndex: 0, columnIndex: 0 };
          void pasteClipboardAt(focus.rowIndex, focus.columnIndex);
          return;
        }
        if (event.key === 'Escape') setContextMenu(null);
        if (event.key === 'ArrowUp') { event.preventDefault(); moveSelection(-1, 0, event.shiftKey); }
        if (event.key === 'ArrowDown') { event.preventDefault(); moveSelection(1, 0, event.shiftKey); }
        if (event.key === 'ArrowLeft') { event.preventDefault(); moveSelection(0, -1, event.shiftKey); }
        if (event.key === 'ArrowRight') { event.preventDefault(); moveSelection(0, 1, event.shiftKey); }
      }}
    >
      <div style={{ width: gridWidth }}>
        <div role="row" className="sticky top-0 z-10 grid h-8 border-b border-gray-300 bg-gray-100 text-[11px] font-semibold text-gray-600" style={{ gridTemplateColumns: template }}>
          {result.columns.map((column, columnIndex) => (
            <button
              key={column.id}
              role="columnheader"
              className="group relative flex min-w-0 items-center gap-1 border-r border-gray-200 px-2 text-left hover:bg-gray-200"
              title={`Sort by ${column.name} · ${column.nativeType || column.logicalType}`}
              onClick={() => onSort(column.name)}
              onContextMenu={event => {
                event.preventDefault();
                gridRef.current?.focus();
                setContextMenu({ x: event.clientX, y: event.clientY, rowIndex: 0, columnIndex });
              }}
            >
              <span className="truncate">{column.name}</span>
              {sort?.column === column.name && (sort.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
              <span className="ml-auto hidden shrink-0 items-center gap-0.5 group-hover:flex">
                <span
                  role="button"
                  aria-label={`Move ${column.name} left`}
                  title={`Move ${column.name} left`}
                  className={`p-0.5 text-gray-400 hover:bg-gray-300 hover:text-gray-700 ${columnIndex === 0 ? 'pointer-events-none opacity-30' : ''}`}
                  onClick={event => { event.stopPropagation(); onColumnMove?.(column.id, -1); }}
                ><ArrowLeft className="h-3 w-3" /></span>
                <span
                  role="button"
                  aria-label={`Move ${column.name} right`}
                  title={`Move ${column.name} right`}
                  className={`p-0.5 text-gray-400 hover:bg-gray-300 hover:text-gray-700 ${columnIndex === result.columns.length - 1 ? 'pointer-events-none opacity-30' : ''}`}
                  onClick={event => { event.stopPropagation(); onColumnMove?.(column.id, 1); }}
                ><ArrowRight className="h-3 w-3" /></span>
              </span>
              <span className="ml-auto shrink-0 font-mono text-[9px] font-normal text-gray-400">{column.nativeType || column.logicalType}</span>
              <span
                className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                title={`Resize ${column.name}`}
                onPointerDown={event => startColumnResize(event, column.id, resolvedColumnWidths[columnIndex])}
              />
            </button>
          ))}
        </div>
        <div className="relative" style={{ height: result.rows.length * ROW_HEIGHT }}>
          {selectionSize && <div className="pointer-events-none sticky left-2 top-9 z-20 inline-flex bg-blue-600 px-1.5 py-0.5 text-[9px] font-semibold text-white shadow-sm">{selectionSize.rows}x{selectionSize.columns}</div>}
          {result.rows.slice(start, end).map((row, relativeIndex) => {
            const rowIndex = start + relativeIndex;
            const deleted = deletedRows.has(rowIndex);
            return (
              <div
                key={rowIndex}
                role="row"
                aria-disabled={deleted}
                className={`absolute grid border-b border-gray-100 text-[12px] hover:bg-blue-50 ${deleted ? 'bg-red-50 text-red-700 opacity-80' : 'text-gray-700'}`}
                style={{ top: rowIndex * ROW_HEIGHT, height: ROW_HEIGHT, width: gridWidth, gridTemplateColumns: template }}
              >
                {result.columns.map((column, columnIndex) => {
                  const value = row[columnIndex] ?? null;
                  const isEditing = editing?.rowIndex === rowIndex && editing.columnIndex === columnIndex;
                  const changed = editedKeys.has(`${rowIndex}:${columnIndex}`);
                  const selected = isSelected(rowIndex, columnIndex);
                  const active = isActive(rowIndex, columnIndex);
                  return (
                  <div
                    key={column.id}
                    role="gridcell"
                    aria-selected={selected}
                    aria-rowindex={rowIndex + 1}
                    aria-colindex={columnIndex + 1}
                    className={`min-w-0 truncate border-r px-2 py-1.5 font-mono ${value === null ? 'italic text-gray-400' : ''} ${changed ? 'bg-amber-100 text-amber-950' : ''} ${selected ? 'border-blue-300 bg-blue-100 text-blue-950' : 'border-gray-100'} ${active ? 'ring-2 ring-inset ring-blue-600' : ''} ${editable && !deleted ? 'cursor-text' : 'cursor-cell'} ${deleted ? 'line-through decoration-red-500 decoration-2' : ''}`}
                    title={editable ? `Edit ${column.name}` : displayCell(value)}
                    onClick={event => {
                      gridRef.current?.focus();
                      selectCell(rowIndex, columnIndex, event.shiftKey);
                      setContextMenu(null);
                    }}
                    onContextMenu={event => {
                      event.preventDefault();
                      gridRef.current?.focus();
                      if (!selected) selectCell(rowIndex, columnIndex, event.shiftKey);
                      setContextMenu({ x: event.clientX, y: event.clientY, rowIndex, columnIndex });
                    }}
                    onDoubleClick={() => editable && !deleted && setEditing({ rowIndex, columnIndex, value: value === null ? '' : String(value) })}
                  >
                    {isEditing ? <input autoFocus value={editing.value} onChange={event => setEditing({ ...editing, value: event.target.value })} onBlur={() => commitEdit(rowIndex, columnIndex, value, editing.value)} onKeyDown={event => { if (event.key === 'Enter') commitEdit(rowIndex, columnIndex, value, editing.value); if (event.key === 'Escape') setEditing(null); }} className="h-6 w-full border border-blue-500 bg-white px-1 font-mono text-[12px] not-italic text-gray-900 outline-none" /> : displayCell(value)}
                  </div>
                );})}
              </div>
            );
          })}
        </div>
      </div>
      {contextMenu && (
        <div className="fixed z-50 w-52 border border-gray-200 bg-white py-1 text-[11px] text-gray-700 shadow-lg" style={{ left: contextMenu.x, top: contextMenu.y }}>
          {foreignKeyActions.filter(action => action.columnNames.includes(result.columns[contextMenu.columnIndex]?.name || '')).map(action => (
            <button key={action.id} className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-purple-50 hover:text-purple-700" onClick={() => { action.onNavigate(result.rows[contextMenu.rowIndex] ?? [], result); setContextMenu(null); }}><ArrowRight className="h-3.5 w-3.5 text-purple-400" /> {action.label}</button>
          ))}
          {foreignKeyActions.some(action => action.columnNames.includes(result.columns[contextMenu.columnIndex]?.name || '')) && <div className="my-1 border-t border-gray-100" />}
          <button disabled={!onRenameColumn} className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100 disabled:opacity-40" onClick={() => {
            const column = result.columns[contextMenu.columnIndex];
            if (column) onRenameColumn?.(column.id, column.name);
            setContextMenu(null);
          }}><Pencil className="h-3.5 w-3.5 text-gray-400" /> Rename column alias</button>
          <div className="my-1 border-t border-gray-100" />
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copySelection(); setContextMenu(null); }}><Copy className="h-3.5 w-3.5 text-gray-400" /> Copy selection</button>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copyTextToClipboard(gridClipboardCell(result.rows[contextMenu.rowIndex]?.[contextMenu.columnIndex] ?? null)); setContextMenu(null); }}><Copy className="h-3.5 w-3.5 text-gray-400" /> Copy cell</button>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copyRowsAsJson(contextMenu.rowIndex); setContextMenu(null); }}><Braces className="h-3.5 w-3.5 text-gray-400" /> Copy rows JSON</button>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copyRowsAsCsv(contextMenu.rowIndex); setContextMenu(null); }}><Table2 className="h-3.5 w-3.5 text-gray-400" /> Copy rows CSV</button>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copyRowsAsMarkdown(contextMenu.rowIndex); setContextMenu(null); }}><ListTree className="h-3.5 w-3.5 text-gray-400" /> Copy rows Markdown</button>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copyRowsAsInsert(contextMenu.rowIndex); setContextMenu(null); }}><Database className="h-3.5 w-3.5 text-gray-400" /> Copy rows INSERT</button>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copyRowsAsUpdate(contextMenu.rowIndex); setContextMenu(null); }}><Database className="h-3.5 w-3.5 text-gray-400" /> Copy rows UPDATE</button>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copyColumnAsInClause(contextMenu.rowIndex, contextMenu.columnIndex); setContextMenu(null); }}><Filter className="h-3.5 w-3.5 text-gray-400" /> Copy IN clause</button>
          <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100" onClick={() => { void copyColumnValues(contextMenu.rowIndex, contextMenu.columnIndex); setContextMenu(null); }}><Columns className="h-3.5 w-3.5 text-gray-400" /> Copy column values</button>
          <button disabled={!editable || deletedRows.has(contextMenu.rowIndex)} className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100 disabled:opacity-40" onClick={() => { void pasteClipboardAt(contextMenu.rowIndex, contextMenu.columnIndex); setContextMenu(null); }}><Pencil className="h-3.5 w-3.5 text-gray-400" /> Paste cells</button>
          {editable && onDuplicateRow && <button disabled={deletedRows.has(contextMenu.rowIndex)} className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40" onClick={() => { onDuplicateRow(contextMenu.rowIndex); setContextMenu(null); }}><Plus className="h-3.5 w-3.5 text-emerald-500" /> Duplicate as insert</button>}
          {editable && onDeleteRow && onRestoreRow && <button className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-red-50 hover:text-red-700" onClick={() => { if (deletedRows.has(contextMenu.rowIndex)) onRestoreRow(contextMenu.rowIndex); else onDeleteRow(contextMenu.rowIndex); setContextMenu(null); }}><Trash2 className="h-3.5 w-3.5 text-red-400" /> {deletedRows.has(contextMenu.rowIndex) ? 'Restore row' : 'Mark row delete'}</button>}
          <div className="my-1 border-t border-gray-100" />
          <button disabled={contextMenu.columnIndex === 0} className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100 disabled:opacity-40" onClick={() => { onColumnMove?.(result.columns[contextMenu.columnIndex].id, -1); setContextMenu(null); }}><ArrowLeft className="h-3.5 w-3.5 text-gray-400" /> Move column left</button>
          <button disabled={contextMenu.columnIndex === result.columns.length - 1} className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-gray-100 disabled:opacity-40" onClick={() => { onColumnMove?.(result.columns[contextMenu.columnIndex].id, 1); setContextMenu(null); }}><ArrowRight className="h-3.5 w-3.5 text-gray-400" /> Move column right</button>
        </div>
      )}
    </div>
  );
};
