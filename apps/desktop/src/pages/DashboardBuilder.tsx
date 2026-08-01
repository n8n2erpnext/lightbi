import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Edit2, Plus, RefreshCw, Share2 } from 'lucide-react';
import { useAppRuntime } from '@lightbi/runtime';
import type { Chart, DashboardWidget } from '@lightbi/core-types';
import { DashboardKPIWidget } from '../components/dashboards/DashboardKPIWidget';
import { DashboardChartWidget } from '../components/dashboards/DashboardChartWidget';

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
  if (!chart) {
    return <div data-testid="dashboard-widget" style={widgetGridStyle(widget)} className="rounded-md border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-400">Missing chart</div>;
  }
  const payload = getSavedChartPayload(chart);
  if (!payload || !payload.rows?.length) {
    return (
      <div data-testid="dashboard-widget" style={widgetGridStyle(widget)} className="flex h-full flex-col justify-center rounded-md border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
        <h3 className="font-semibold text-gray-800">{chart.name}</h3>
        <p className="mt-1 text-xs text-gray-400">Needs a saved BA or Advanced result before it can render real data.</p>
      </div>
    );
  }

  const xAxisKey = payload.xField || chart.xAxis?.[0]?.columnName || Object.keys(payload.rows[0] ?? {})[0] || 'name';
  const seriesKey = payload.yField || payload.seriesFields?.[0] || chart.yAxis?.[0]?.columnName || Object.keys(payload.rows[0] ?? {}).find(key => key !== xAxisKey) || 'value';

  if (chart.type === 'Number') {
    const value = Number(payload.rows[0]?.[seriesKey] ?? payload.rowCount ?? 0);
    const valueType = payload.valueKind === 'money' ? 'currency' : payload.valueKind === 'percent' ? 'percent' : 'number';
    return <div data-testid="dashboard-widget" style={widgetGridStyle(widget)}><DashboardKPIWidget title={chart.name} value={Number.isFinite(value) ? value : 0} valueType={valueType} className="h-full" colSpan={widget.layout.w} /></div>;
  }
  if (chart.type === 'Table') {
    const columns = Object.keys(payload.rows[0] ?? {}).slice(0, 6);
    return (
      <div data-testid="dashboard-widget" style={widgetGridStyle(widget)} className="rounded-md border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-[13px] font-semibold text-gray-800">{chart.name}</h3>
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
        title={chart.name}
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
  const { id } = useParams();
  const dashboards = useAppRuntime(s => s.dashboards);
  const charts = useAppRuntime(s => s.charts);
  const activeDashboardId = useAppRuntime(s => s.activeDashboardId);
  const dashboard = dashboards[id || activeDashboardId || ''] ?? null;

  return (
    <div data-testid="perspective-dashboard" className="flex h-full flex-1 flex-col bg-gray-50">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
        <div className="flex items-center space-x-3 text-gray-900">
          <div><h1 className="text-[15px] font-semibold">{dashboard ? dashboard.name : 'Select a dashboard'}</h1>{dashboard?.metadata?.perspective && <p className="mt-0.5 text-[11px] text-gray-500">Perspective: {String(dashboard.metadata.perspective)} · {String(dashboard.metadata.datasetId ?? '')}</p>}</div>
          <span className="rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-gray-500">{dashboard?.widgets.length ?? 0} cards</span>
        </div>
        <div className="flex items-center space-x-2">
          <button className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800" title="Refresh"><RefreshCw className="h-4 w-4" /></button>
          <button className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800" title="Edit"><Edit2 className="h-4 w-4" /></button>
          <button className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800" title="Share"><Share2 className="h-4 w-4" /></button>
          <div className="mx-2 h-5 w-px bg-gray-300" />
          <Link to="/charts" className="flex items-center rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"><Plus className="mr-1 h-4 w-4" /> Add chart</Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {!dashboard ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white text-sm text-gray-500">Choose or create a dashboard from the chart library.</div>
        ) : dashboard.widgets.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white text-center">
            <h2 className="text-base font-semibold text-gray-900">No chart cards yet</h2>
            <p className="mt-1 text-sm text-gray-500">Add reusable chart cards from the Chart Library.</p>
            <Link to="/charts" className="mt-4 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white">Open Chart Library</Link>
          </div>
        ) : (
          <div className="mx-auto max-w-[1500px]">
            {dashboard.metadata?.source === 'easy_mode_perspective' && <div className="mb-4 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Governed perspective dashboard</div><p className="mt-1 text-sm text-gray-700">This dashboard was composed from the same selected perspective, executed results and BA evidence.</p></div><div className="flex gap-2"><span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700">Governed</span><span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-700">{dashboard.metadata.evidenceScope === 'full_source' ? 'Full-source evidence' : 'Full-source result · representative BA sample'}</span></div></div>}
            <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-3" style={{ gridAutoRows: '30px' }}>
              {dashboard.widgets.map(widget => <DashboardWidgetCard key={widget.id} widget={widget} chart={widget.referenceId ? charts[widget.referenceId] : undefined} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
