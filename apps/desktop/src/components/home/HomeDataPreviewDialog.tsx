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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="dataset-preview-title" data-testid="dataset-preview-dialog">
      <div className="flex max-h-[85vh] w-full max-w-6xl flex-col rounded-xl border border-black/10 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
          <div>
            <h2 id="dataset-preview-title" className="text-[16px] font-semibold text-gray-900">{t('Data preview', 'Xem trước dữ liệu')}</h2>
            <p className="mt-1 text-[12px] text-gray-500">{t(`Showing ${Math.min(rows.length, 100).toLocaleString()} retained representative rows from ${Number(dataset.rows_count || 0).toLocaleString()} full-source rows. Analysis still runs against the governed full source when available.`, `Đang hiển thị ${Math.min(rows.length, 100).toLocaleString()} dòng đại diện trong tổng số ${Number(dataset.rows_count || 0).toLocaleString()} dòng của nguồn. Phân tích vẫn chạy trên toàn bộ nguồn có quản trị khi khả dụng.`)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100" aria-label={t('Close data preview', 'Đóng xem trước dữ liệu')}><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-auto p-4">
          {rows.length > 0 ? <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="sticky top-0 bg-gray-50"><tr>{columns.map(column => <th key={column} className="whitespace-nowrap px-3 py-2 font-medium text-gray-600">{column}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">{rows.slice(0, 100).map((row, rowIndex) => <tr key={rowIndex}>{columns.map(column => <td key={column} className="max-w-[280px] truncate px-3 py-2 text-gray-700" title={row[column] == null ? '' : String(row[column])}>{row[column] == null ? '—' : String(row[column])}</td>)}</tr>)}</tbody>
          </table> : <p className="py-8 text-center text-sm text-gray-500">{t('No representative rows are retained for browser preview.', 'Không có dòng đại diện nào được giữ lại để xem trước.')}</p>}
        </div>
      </div>
    </div>
  );
};
