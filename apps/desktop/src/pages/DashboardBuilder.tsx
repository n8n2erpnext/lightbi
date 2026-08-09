import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Edit2, Lightbulb, Plus, RefreshCw, Share2, ShieldCheck, Target } from 'lucide-react';
import { useAppRuntime } from '@lightbi/runtime';
import type { Chart, DashboardWidget } from '@lightbi/core-types';
import { DashboardKPIWidget } from '../components/dashboards/DashboardKPIWidget';
import { DashboardChartWidget } from '../components/dashboards/DashboardChartWidget';
import { useUiLanguage } from '../lib/ui-language';

type DashboardInsight = { id?: string; title?: string; statement?: string; severity?: 'positive' | 'neutral' | 'warning' | 'critical'; confidence?: number; evidence?: string[] };
type DashboardSuggestion = { title?: string; action?: string; priority?: 'high' | 'medium' | 'low' };
type DashboardDeepBA = { executiveSummary?: string; dataTrustScore?: number; decisionReadinessScore?: number; insights?: DashboardInsight[]; decisionSuggestions?: DashboardSuggestion[]; caveats?: string[] };
type DashboardPerspectiveBA = { analysisLabel?: string; sourceRowCount?: number; isRepresentativeSample?: boolean; trendChange?: number | null; findings?: string[]; recommendedActions?: string[]; limitations?: string[] };

const asRecord = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' ? value as Record<string, unknown> : null;
export const getDashboardBA = (metadata: Record<string, unknown> | undefined): { deep: DashboardDeepBA | null; perspective: DashboardPerspectiveBA | null } => ({
  deep: asRecord(metadata?.deepBA) as DashboardDeepBA | null,
  perspective: asRecord(metadata?.perspectiveBA) as DashboardPerspectiveBA | null,
});

type SavedChartPayload = {
  chartType?: 'bar' | 'line' | 'scatter' | 'table';
  xField?: string;
  yField?: string;
  seriesFields?: string[];
  rows?: Record<string, unknown>[];
  rowCount?: number;
  valueKind?: 'money' | 'number' | 'percent';
};

const getSavedChartPayload = (chart: Chart): SavedChartPayload | null => {
  const payload = chart.formatting?.lightbiData;
  if (!payload || typeof payload !== 'object') return null;
  if (!Array.isArray(payload.rows)) return null;
  return payload as SavedChartPayload;
};

const widgetGridStyle = (widget: DashboardWidget): React.CSSProperties => {
  const colSpan = Math.max(3, Math.min(20, widget.layout.w || 10));
  const rowSpan = Math.max(3, Math.min(14, widget.layout.h || 8));
  return { gridColumn: `span ${colSpan} / span ${colSpan}`, gridRow: `span ${rowSpan} / span ${rowSpan}` };
};

const DashboardWidgetCard: React.FC<{ widget: DashboardWidget; chart?: Chart }> = ({ widget, chart }) => {
  const { t, localize } = useUiLanguage();
  if (!chart) {
    return <div data-testid="dashboard-widget" style={widgetGridStyle(widget)} className="rounded-md border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-400">{t('Missing chart', 'Thiếu biểu đồ')}</div>;
  }
  const payload = getSavedChartPayload(chart);
  if (!payload || !payload.rows?.length) {
    return (
      <div data-testid="dashboard-widget" style={widgetGridStyle(widget)} className="flex h-full flex-col justify-center rounded-md border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
        <h3 className="font-semibold text-gray-800">{localize(chart.name)}</h3>
        <p className="mt-1 text-xs text-gray-400">{t('A saved BA or Advanced result is required to render real data.', 'Cần lưu kết quả BA hoặc Nâng cao để hiển thị dữ liệu thực.')}</p>
      </div>
    );
  }

  const xAxisKey = payload.xField || chart.xAxis?.[0]?.columnName || Object.keys(payload.rows[0] ?? {})[0] || 'name';
  const seriesKey = payload.yField || payload.seriesFields?.[0] || chart.yAxis?.[0]?.columnName || Object.keys(payload.rows[0] ?? {}).find(key => key !== xAxisKey) || 'value';

  if (chart.type === 'Number') {
    const value = Number(payload.rows[0]?.[seriesKey] ?? payload.rowCount ?? 0);
    const valueType = payload.valueKind === 'money' ? 'currency' : payload.valueKind === 'percent' ? 'percent' : 'number';
    return <div data-testid="dashboard-widget" style={widgetGridStyle(widget)}><DashboardKPIWidget title={localize(chart.name)} value={Number.isFinite(value) ? value : 0} valueType={valueType} className="h-full" colSpan={widget.layout.w} /></div>;
  }
  if (chart.type === 'Table') {
    const columns = Object.keys(payload.rows[0] ?? {}).slice(0, 6);
    return (
      <div data-testid="dashboard-widget" style={widgetGridStyle(widget)} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[13px] font-semibold text-gray-800">{localize(chart.name)}</h3>
        <table className="w-full text-left text-[11px] text-gray-600">
          <thead className="text-gray-400"><tr>{columns.map(column => <th key={column} className="py-1 pr-2">{column}</th>)}</tr></thead>
          <tbody>{payload.rows.slice(0, 8).map((row, index) => <tr key={index} className="border-t border-gray-100">{columns.map(column => <td key={column} className="max-w-40 truncate py-2 pr-2">{String(row[column] ?? '')}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
  }
  return (
    <div data-testid="dashboard-widget" style={widgetGridStyle(widget)}>
      <DashboardChartWidget
        title={localize(chart.name)}
        chartType={chart.type === 'Line' ? 'line' : chart.type === 'Donut' || chart.type === 'Pie' ? 'donut' : 'bar'}
        data={payload.rows}
        xAxisKey={xAxisKey}
        seriesKey={seriesKey}
        valueType="number"
        className="h-full"
        colSpan={widget.layout.w}
      />
    </div>
  );
};

export const DashboardBuilder: React.FC = () => {
  const { t, localize } = useUiLanguage();
  const navigate = useNavigate();
  const { id } = useParams();
  const dashboards = useAppRuntime(s => s.dashboards);
  const charts = useAppRuntime(s => s.charts);
  const activeDashboardId = useAppRuntime(s => s.activeDashboardId);
  const dashboard = dashboards[id || activeDashboardId || ''] ?? null;
  const ba = getDashboardBA(dashboard?.metadata);
  const primaryInsights = (ba.deep?.insights ?? []).slice(0, 6);
  const actions = [...(ba.perspective?.recommendedActions ?? []), ...(ba.deep?.decisionSuggestions ?? []).map(item => item.action || item.title || '')].filter(Boolean).slice(0, 5);
  const caveats = [...(ba.perspective?.limitations ?? []), ...(ba.deep?.caveats ?? [])].filter(Boolean).slice(0, 5);

  return (
    <div data-testid="perspective-dashboard" className="flex h-full flex-1 flex-col bg-gray-50">
      <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-3">
        <div className="flex items-center space-x-3 text-gray-900">
          <button data-testid="dashboard-back" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50" title={t('Back to analysis', 'Quay lại phân tích')}><ArrowLeft className="h-4 w-4" />{t('Back', 'Quay lại')}</button>
          <div><h1 className="text-[15px] font-semibold">{dashboard ? localize(dashboard.name) : t('Select a dashboard', 'Chọn dashboard')}</h1>{dashboard?.metadata?.perspective && <p className="mt-0.5 text-[11px] text-gray-500">{t('Perspective', 'Góc nhìn')}: {localize(String(dashboard.metadata.perspective))} · {String(dashboard.metadata.datasetId ?? '')}</p>}</div>
          <span className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-gray-500">{dashboard?.widgets.length ?? 0} {t('cards', 'thẻ')}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800" title={t('Refresh', 'Làm mới')}><RefreshCw className="h-4 w-4" /></button>
          <button className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800" title={t('Edit', 'Chỉnh sửa')}><Edit2 className="h-4 w-4" /></button>
          <button className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800" title={t('Share', 'Chia sẻ')}><Share2 className="h-4 w-4" /></button>
          <div className="mx-2 h-5 w-px bg-gray-300" />
          <Link to="/charts" className="flex items-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"><Plus className="mr-1 h-4 w-4" />{t('Add chart', 'Thêm biểu đồ')}</Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {!dashboard ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white text-sm text-gray-500">{t('Choose or create a dashboard from the chart library.', 'Chọn hoặc tạo dashboard từ thư viện biểu đồ.')}</div>
        ) : dashboard.widgets.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white text-center">
            <h2 className="text-base font-semibold text-gray-900">{t('No chart cards yet', 'Chưa có thẻ biểu đồ')}</h2>
            <p className="mt-1 text-sm text-gray-500">{t('Add reusable chart cards from the Chart Library.', 'Thêm các thẻ biểu đồ có thể tái sử dụng từ Thư viện biểu đồ.')}</p>
            <Link to="/charts" className="mt-4 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white">{t('Open Chart Library', 'Mở thư viện biểu đồ')}</Link>
          </div>
        ) : (
          <div className="mx-auto max-w-[1500px]">
            {dashboard.metadata?.source === 'easy_mode_perspective' && <div className="mb-4 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">{t('Governed perspective dashboard', 'Dashboard theo góc nhìn có quản trị')}</div><p className="mt-1 text-sm text-gray-700">{t('This dashboard was composed from the selected perspective, executed results, and BA evidence.', 'Dashboard được tổng hợp từ góc nhìn đã chọn, kết quả thực thi và bằng chứng BA tương ứng.')}</p></div><div className="flex gap-2"><span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">{t('Governed', 'Có quản trị')}</span><span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700">{dashboard.metadata.evidenceScope === 'full_source' ? t('Full-source evidence', 'Bằng chứng toàn bộ nguồn') : t('Full-source result · representative BA sample', 'Kết quả toàn bộ nguồn · mẫu BA đại diện')}</span></div></div>}
            {ba.deep && <section data-testid="dashboard-executive-brief" className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-4xl">
                  <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-700"><ShieldCheck className="h-4 w-4" />{t('Executive BA brief', 'Bản phân tích BA điều hành')}</div>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">{localize(ba.perspective?.analysisLabel || String(dashboard.metadata?.perspective ?? ''))}</h2>
                  <p data-testid="dashboard-executive-summary" className="mt-2 text-sm leading-6 text-slate-700">{localize(ba.deep.executiveSummary)}</p>
                </div>
                <div className="grid min-w-72 grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">{t('Decision readiness', 'Sẵn sàng quyết định')}</div><div className="mt-1 text-2xl font-bold text-emerald-800">{ba.deep.decisionReadinessScore ?? '—'}<span className="text-xs font-medium text-emerald-600">/100</span></div></div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">{t('Data trust', 'Độ tin cậy dữ liệu')}</div><div className="mt-1 text-2xl font-bold text-blue-800">{ba.deep.dataTrustScore ?? '—'}<span className="text-xs font-medium text-blue-600">/100</span></div></div>
                </div>
              </div>
            </section>}
            <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-3" style={{ gridAutoRows: '30px' }}>
              {dashboard.widgets.map(widget => <DashboardWidgetCard key={widget.id} widget={widget} chart={widget.referenceId ? charts[widget.referenceId] : undefined} />)}
            </div>
            {(primaryInsights.length > 0 || actions.length > 0 || caveats.length > 0) && <section data-testid="dashboard-deep-ba" className="mt-4 grid gap-4 xl:grid-cols-12">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-7">
                <div className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-600" /><h2 className="text-sm font-semibold text-slate-900">{t('BA findings for this perspective', 'Phát hiện BA theo góc nhìn đã chọn')}</h2></div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">{primaryInsights.map((insight, index) => <article key={insight.id || index} className={`rounded-xl border p-4 ${insight.severity === 'critical' ? 'border-red-200 bg-red-50' : insight.severity === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-emerald-100 bg-emerald-50'}`}>
                  <div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold text-slate-900">{localize(insight.title)}</h3>{typeof insight.confidence === 'number' && <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">{insight.confidence}%</span>}</div>
                  <p className="mt-2 text-xs leading-5 text-slate-700">{localize(insight.statement)}</p>
                  {insight.evidence?.[0] && <p className="mt-2 border-t border-black/5 pt-2 text-[11px] text-slate-500">{localize(insight.evidence[0])}</p>}
                </article>)}</div>
              </div>
              <div className="space-y-4 xl:col-span-5">
                {actions.length > 0 && <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-blue-700" /><h2 className="text-sm font-semibold text-blue-950">{t('Recommended actions', 'Hành động đề xuất')}</h2></div><ol className="mt-3 space-y-2">{actions.map((action, index) => <li key={index} className="flex gap-3 rounded-lg bg-white/80 p-3 text-xs leading-5 text-slate-700"><span className="font-bold text-blue-700">{index + 1}</span>{localize(action)}</li>)}</ol></div>}
                {caveats.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-700" /><h2 className="text-sm font-semibold text-amber-950">{t('Evidence limits', 'Giới hạn bằng chứng')}</h2></div><ul className="mt-3 space-y-2">{caveats.map((caveat, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-amber-900"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />{localize(caveat)}</li>)}</ul></div>}
              </div>
            </section>}
          </div>
        )}
      </div>
    </div>
  );
};
