import React from 'react';
import { AlertTriangle, Check, FileSpreadsheet, Layers, Table2 } from 'lucide-react';
import type { PendingLocalFileBatch } from '../../lib/home-multisource-candidate-review';
import { useUiLanguage } from '../../lib/ui-language';

type Props = {
  pending: PendingLocalFileBatch;
  onToggle: (fileIndex: number, sheetName: string) => void;
  onAnalyzeSelected: () => void;
  onAnalyzeAll: () => void;
  onCancel: () => void;
};

export const WorkbookSheetSelector: React.FC<Props> = ({ pending, onToggle, onAnalyzeSelected, onAnalyzeAll, onCancel }) => {
  const { language, t } = useUiLanguage();
  const selectedCount = Object.values(pending.selectedSheets ?? {}).reduce((sum, names) => sum + names.length, 0);
  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-4" data-testid="workbook-sheet-selector">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
            <Layers className="h-4 w-4 text-blue-600" />
            {t('Choose sheets to analyze')}
          </div>
          <p className="mt-1 max-w-3xl text-[12px] leading-5 text-slate-600">
            {t('Each sheet is inspected as a separate source. LightBI will not append or join sheets unless their structure and business relationship are supported by evidence.')}
          </p>
        </div>
        <button onClick={onCancel} className="text-[12px] font-medium text-slate-500 hover:text-slate-800">{t('Cancel')}</button>
      </div>

      <div className="mt-4 space-y-4">
        {pending.files.map((file, fileIndex) => {
          const result = pending.results[fileIndex];
          if (!result || result.status !== 'accessible' || !result.metadata.sheets) return null;
          return (
            <section key={`${file.name}:${fileIndex}`} className="rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2.5 text-[12px] font-semibold text-slate-800">
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> {file.name}
                <span className="font-normal text-slate-500">· {result.metadata.sheet_count ?? Object.keys(result.metadata.sheets).length} {t('sheets')}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {Object.entries(result.metadata.sheets).map(([sheetName, sheet]) => {
                  const selected = pending.selectedSheets?.[fileIndex]?.includes(sheetName) ?? false;
                  const warning = sheet.suitability === 'layout_or_sparse' || sheet.suitability === 'complex_table';
                  return (
                    <button
                      type="button"
                      key={sheetName}
                      onClick={() => onToggle(fileIndex, sheetName)}
                      className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-slate-50"
                      data-testid={`sheet-option-${fileIndex}-${sheetName}`}
                    >
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'}`}>
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-medium text-slate-900">{sheetName}</span>
                          <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">
                            {sheet.used_row_count ?? 0} × {sheet.used_column_count ?? 0}
                          </span>
                          {warning && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                        </span>
                        <span className="mt-1 block text-[11px] leading-4 text-slate-500">
                          {t(sheet.suitability_reasons?.[0] ?? 'Sheet summary is ready.')}
                        </span>
                      </span>
                      <Table2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button onClick={onAnalyzeAll} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-50" data-testid="analyze-all-sheets">
          {t('Analyze full workbook')}
        </button>
        <button disabled={selectedCount === 0} onClick={onAnalyzeSelected} className="rounded-md bg-slate-950 px-4 py-2 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40" data-testid="analyze-selected-sheets">
          {language === 'vi' ? `Phân tích ${selectedCount} sheet đã chọn` : `Analyze ${selectedCount} selected sheet${selectedCount === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
};
