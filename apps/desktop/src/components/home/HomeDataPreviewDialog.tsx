import React from 'react';
import { X } from 'lucide-react';
import { useUiLanguage } from '../../lib/ui-language';

interface HomeDataPreviewDialogProps {
  dataset: any;
  rows: Record<string, unknown>[];
  onClose: () => void;
}

export const HomeDataPreviewDialog: React.FC<HomeDataPreviewDialogProps> = ({ dataset, rows, onClose }) => {
  const { t } = useUiLanguage();
  const columns: string[] = dataset.understandingColumns ?? dataset.columns ?? [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4 py-8 backdrop-blur-sm md:px-8" role="dialog" aria-modal="true" aria-labelledby="dataset-preview-title" data-testid="dataset-preview-dialog">
      <div className="flex max-h-[85vh] w-full max-w-[var(--lb-dialog-width)] flex-col overflow-hidden rounded-[var(--lb-radius-strong)] border border-[var(--lb-divider)] bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--lb-divider)] px-5 py-4">
          <div>
            <h2 id="dataset-preview-title" className="text-[16px] font-semibold text-gray-900">{t('Data preview')}</h2>
            <p className="mt-1 text-[12px] leading-5 text-gray-500">{t(`Showing ${Math.min(rows.length, 100).toLocaleString()} retained representative rows from ${Number(dataset.rows_count || 0).toLocaleString()} full-source rows. Analysis still runs against the governed full source when available.`)}</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-500 transition-colors hover:bg-black/[0.035]" aria-label={t('Close data preview')}><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-auto">
          {rows.length > 0 ? <table className="min-w-full divide-y divide-[var(--lb-divider)] text-left text-xs">
            <thead className="sticky top-0 bg-[var(--lb-surface-subtle)]"><tr>{columns.map(column => <th key={column} className="whitespace-nowrap px-4 py-3 font-medium text-gray-600">{column}</th>)}</tr></thead>
            <tbody className="divide-y divide-[var(--lb-divider)]">{rows.slice(0, 100).map((row, rowIndex) => <tr key={rowIndex} className="hover:bg-black/[0.02]">{columns.map(column => <td key={column} className="max-w-[280px] truncate px-4 py-3 text-gray-700" title={row[column] == null ? '' : String(row[column])}>{row[column] == null ? '—' : String(row[column])}</td>)}</tr>)}</tbody>
          </table> : <p className="py-8 text-center text-sm text-gray-500">{t('No representative rows are retained for browser preview.')}</p>}
        </div>
      </div>
    </div>
  );
};
