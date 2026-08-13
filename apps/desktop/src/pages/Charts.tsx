import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CheckCircle2, Gauge, LayoutDashboard, LineChart, PieChart, Plus, Search, Sparkles, Table2 } from 'lucide-react';
import { useAppRuntime } from '@lightbi/runtime';
import type { Chart, ChartType } from '@lightbi/core-types';
import { useUiLanguage } from '../lib/ui-language';

type ChartTemplate = {
  id: string;
  name: string;
  type: ChartType;
  intent: string;
  bestFor: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
};

const chartTemplates: ChartTemplate[] = [
  { id: 'trend', name: 'Trend over time', type: 'Line', intent: 'Track movement by date/time', bestFor: 'Revenue, inventory, delivery duration, open tickets', icon: LineChart },
  { id: 'group-bar', name: 'Compare groups', type: 'Bar', intent: 'Rank categories and spot concentration', bestFor: 'Top customers, routes, branches, users, SKUs', icon: BarChart3 },
  { id: 'share', name: 'Share of total', type: 'Donut', intent: 'Understand contribution by segment', bestFor: 'Status mix, channel mix, payment method, product family', icon: PieChart },
  { id: 'kpi', name: 'KPI scorecard', type: 'Number', intent: 'Show one decision metric clearly', bestFor: 'Total value, overdue count, completion rate, margin', icon: Gauge },
  { id: 'detail-table', name: 'Evidence table', type: 'Table', intent: 'Keep raw rows near the visual decision', bestFor: 'Exceptions, missing fields, duplicated records, drilldown', icon: Table2 },
];

const chartTypeClass = (type: string) => {
  const normalized = type.toLowerCase();
  if (normalized.includes('line')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (normalized.includes('bar')) return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (normalized.includes('donut') || normalized.includes('pie')) return 'bg-violet-50 text-violet-700 border-violet-200';
  if (normalized.includes('number')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

const matchesSearch = (chart: Chart, search: string) => {
  const value = `${chart.name} ${chart.type} ${chart.datasetId}`.toLowerCase();
  return value.includes(search.toLowerCase());
};

type SavedChartPayload = {
  xField?: string;
  yField?: string;
  seriesFields?: string[];
  rows?: Record<string, unknown>[];
};

const getSavedChartPayload = (chart: Chart): SavedChartPayload | null => {
  const payload = chart.formatting?.lightbiData;
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.rows)) return null;
  return payload as SavedChartPayload;
};

const MiniChartPreview: React.FC<{ type: ChartType; payload?: SavedChartPayload | null }> = ({ type, payload }) => {
  if (payload?.rows?.length) {
    const xField = payload.xField || Object.keys(payload.rows[0] ?? {})[0];
    const yField = payload.yField || payload.seriesFields?.[0] || Object.keys(payload.rows[0] ?? {}).find(key => key !== xField);
    if (type === 'Number') {
      const value = Number(payload.rows[0]?.[yField ?? ''] ?? payload.rows.length);
      return <div className="flex h-full flex-col items-center justify-center"><div className="text-3xl font-semibold text-gray-900">{Number.isFinite(value) ? value.toLocaleString() : payload.rows.length.toLocaleString()}</div><div className="mt-1 text-[11px] text-emerald-600">real saved result</div></div>;
    }
    if (type === 'Table') {
      const columns = Object.keys(payload.rows[0] ?? {}).slice(0, 3);
      return (
        <div className="mx-auto w-full max-w-sm overflow-hidden rounded border border-gray-100 bg-white text-[10px] text-gray-500">
          {payload.rows.slice(0, 3).map((row, index) => <div key={index} className="grid grid-cols-3 border-b border-gray-100 px-2 py-1">{columns.map(column => <span key={column} className="truncate">{String(row[column] ?? '')}</span>)}</div>)}
        </div>
      );
    }
    if (type === 'Donut' || type === 'Pie') {
      return <div className="mx-auto h-20 w-20 rounded-full border-[18px] border-indigo-500 border-r-violet-300 border-t-emerald-300" />;
    }
    const values = payload.rows.slice(0, 8).map(row => Number(row[yField ?? ''] ?? 0));
    const max = Math.max(1, ...values.map(value => Math.abs(value)));
    return (
      <div className="flex h-full items-end justify-center gap-2 px-6 pb-5">
        {values.map((value, index) => (
          <div key={index} className={`w-8 rounded-t ${type === 'Line' ? 'bg-blue-500' : 'bg-indigo-500'}`} style={{ height: Math.max(8, Math.round((Math.abs(value) / max) * 86)) }} />
        ))}
      </div>
    );
  }

  if (type === 'Number') {
    return <div className="flex h-full flex-col items-center justify-center"><div className="text-3xl font-semibold text-gray-900">24.8K</div><div className="mt-1 text-[11px] text-emerald-600">+12% vs previous</div></div>;
  }
  if (type === 'Donut' || type === 'Pie') {
    return <div className="mx-auto h-20 w-20 rounded-full border-[18px] border-indigo-500 border-r-violet-300 border-t-emerald-300" />;
  }
  if (type === 'Table') {
    return (
      <div className="mx-auto w-full max-w-sm overflow-hidden rounded border border-gray-100 bg-white text-[10px] text-gray-500">
        {['Exception', 'Owner', 'Impact'].map(label => <div key={label} className="grid grid-cols-3 border-b border-gray-100 px-2 py-1"><span>{label}</span><span>Review</span><span>High</span></div>)}
      </div>
    );
  }
  const bars = type === 'Line' ? [28, 42, 36, 58, 52, 74, 68] : [34, 70, 48, 86, 62, 44, 76];
  return (
    <div className="flex h-full items-end justify-center gap-2 px-6 pb-5">
      {bars.map((height, index) => (
        <div key={index} className={`w-8 rounded-t ${type === 'Line' ? 'bg-blue-500' : 'bg-indigo-500'}`} style={{ height }} />
      ))}
    </div>
  );
};

export const Charts: React.FC = () => {
  const { t } = useUiLanguage();
  const chartsObj = useAppRuntime(s => s.charts);
  const datasetsObj = useAppRuntime(s => s.datasets);
  const dashboardsObj = useAppRuntime(s => s.dashboards);
  const createChart = useAppRuntime(s => s.createChart);
  const createDashboard = useAppRuntime(s => s.createDashboard);
  const addChartToDashboard = useAppRuntime(s => s.addChartToDashboard);
  const charts = Object.values(chartsObj);
  const datasets = Object.values(datasetsObj);
  const dashboards = Object.values(dashboardsObj);
  const [search, setSearch] = useState('');
  const [selectedDashboardId, setSelectedDashboardId] = useState(dashboards[0]?.id ?? '');
  const [selectedDatasetId, setSelectedDatasetId] = useState(datasets[0]?.id ?? '');
  const [newDashboardName, setNewDashboardName] = useState('');
  const [notice, setNotice] = useState('');

  const selectedDashboard = dashboardsObj[selectedDashboardId] ?? dashboards[0];
  const selectedDataset = datasetsObj[selectedDatasetId] ?? datasets[0];
  const selectedDashboardCharts = selectedDashboard?.widgets.flatMap(widget => widget.type === 'Chart' && widget.referenceId ? [chartsObj[widget.referenceId]].filter(Boolean) : []) ?? [];
  const filteredCharts = useMemo(() => charts.filter(chart => matchesSearch(chart, search)), [charts, search]);

  const ensureDashboard = () => {
    if (selectedDashboard?.id) return selectedDashboard.id;
    const id = createDashboard(t('Decision dashboard'));
    setSelectedDashboardId(id);
    return id;
  };

  const handleCreateDashboard = () => {
    const id = createDashboard(newDashboardName || t('Decision dashboard'));
    setSelectedDashboardId(id);
    setNewDashboardName('');
    setNotice(t('Dashboard created.'));
  };

  const handleAddChart = (chartId: string) => {
    const dashboardId = ensureDashboard();
    addChartToDashboard(dashboardId, chartId);
    setSelectedDashboardId(dashboardId);
    setNotice(t('Chart added to dashboard.'));
  };

  const handleCreateFromTemplate = (template: ChartTemplate) => {
    if (!selectedDataset) return;
    const chartId = createChart({
      projectId: selectedDataset.projectId,
      datasetId: selectedDataset.id,
      name: `${template.name} - ${selectedDataset.name}`,
      type: template.type,
      xAxis: [{ columnName: template.type === 'Line' ? 'Date' : 'Category' }],
      yAxis: [{ columnName: template.type === 'Number' ? 'Value' : 'Measure', aggregation: template.type === 'Number' ? 'Sum' : 'Count' }],
      formatting: {},
      filters: {},
    });
    handleAddChart(chartId);
    setNotice(t('Template saved as a chart card and added to dashboard.'));
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[#fbfbfa] text-[#202123]">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-5 px-5 py-8 md:px-8 lg:px-10">
        <header className="flex flex-col gap-4 border-b border-black/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-medium text-black/45"><BarChart3 className="h-4 w-4" strokeWidth={1.7} /> {t('Chart Library')}</div>
            <h1 className="text-[28px] font-semibold tracking-normal text-[#202123]">{t('Reusable charts for decision dashboards')}</h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-black/50">{t('Save chart cards from Easy BA or Advanced results, then place them into dashboards that refresh when the dataset changes.')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/investigation" className="rounded-md border border-black/10 bg-white px-3 py-2 text-[13px] font-medium text-black/65 shadow-sm transition-colors hover:bg-black/[0.035]">{t('Create from BA brief')}</Link>
            <Link to={selectedDashboard ? `/dashboards/${selectedDashboard.id}` : '/dashboards'} className="inline-flex items-center gap-2 rounded-md bg-[#202123] px-3 py-2 text-[13px] font-medium text-white transition-colors hover:bg-black"><LayoutDashboard className="h-4 w-4" strokeWidth={1.7} /> {t('Open dashboard')}</Link>
          </div>
        </header>

        {notice && <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {notice}</div>}

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm"><div className="text-[12px] font-medium text-black/45">{t('Saved charts')}</div><div className="mt-2 text-2xl font-semibold">{charts.length}</div></div>
          <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm"><div className="text-[12px] font-medium text-black/45">{t('Chart templates')}</div><div className="mt-2 text-2xl font-semibold">{chartTemplates.length}</div></div>
          <div className="rounded-lg border border-black/10 bg-white p-4 shadow-sm"><div className="text-[12px] font-medium text-black/45">{t('Dashboard cards placed')}</div><div className="mt-2 text-2xl font-semibold">{selectedDashboard?.widgets.length ?? 0}</div></div>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-lg border border-black/10 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-black/5 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div><h2 className="text-[15px] font-semibold">{t('Saved chart cards')}</h2><p className="mt-1 text-[13px] text-black/45">{t('Pick a chart card, then add it to the selected dashboard.')}</p></div>
              <div className="relative w-full md:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" strokeWidth={1.7} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t('Search saved charts')} className="h-9 w-full rounded-md border border-black/10 bg-white pl-9 pr-3 text-[13px] outline-none placeholder:text-black/30 focus:border-black/25" /></div>
            </div>
            <div className="grid grid-cols-1 gap-3 p-5 lg:grid-cols-2">
              {filteredCharts.map(chart => {
                const dataset = datasetsObj[chart.datasetId];
                const alreadyPlaced = Boolean(selectedDashboard?.widgets.some(widget => widget.type === 'Chart' && widget.referenceId === chart.id));
                return (
                  <div key={chart.id} className="rounded-lg border border-black/10 bg-[#fbfbfa] p-4 transition-colors hover:bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2"><h3 className="truncate text-[15px] font-semibold">{chart.name}</h3><span className={`rounded border px-2 py-0.5 text-[11px] font-medium ${chartTypeClass(chart.type)}`}>{chart.type}</span></div>
                        <p className="text-[13px] text-black/45">{t('Dataset')}: {dataset?.name ?? chart.datasetId}</p>
                      </div>
                      <button disabled={alreadyPlaced} onClick={() => handleAddChart(chart.id)} className="rounded-md border border-black/10 bg-white px-2.5 py-1.5 text-[12px] font-medium text-black/65 shadow-sm transition-colors hover:bg-black/[0.035] disabled:text-emerald-700 disabled:opacity-80">{alreadyPlaced ? t('Added') : t('Add')}</button>
                    </div>
                    <div className="mt-4 h-32 rounded-md border border-dashed border-black/10 bg-white">
                      {getSavedChartPayload(chart)
                        ? <MiniChartPreview type={chart.type} payload={getSavedChartPayload(chart)} />
                        : <div className="flex h-full items-center justify-center px-4 text-center text-[12px] text-black/35">{t('Needs data binding from a BA or Advanced result.')}</div>}
                    </div>
                  </div>
                );
              })}
              {filteredCharts.length === 0 && <div className="col-span-full flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-black/10 bg-[#fbfbfa] p-6 text-center"><Sparkles className="mb-3 h-5 w-5 text-black/35" strokeWidth={1.7} /><h3 className="text-[14px] font-semibold">{t('No saved chart matched')}</h3><p className="mt-1 max-w-sm text-[13px] text-black/45">{t('Create a chart from a template below or save one from an analysis result.')}</p></div>}
            </div>
          </div>

          <aside className="rounded-lg border border-black/10 bg-white shadow-sm">
            <div className="border-b border-black/5 px-5 py-4">
              <h2 className="text-[15px] font-semibold">{t('Dashboard target')}</h2>
              <p className="mt-1 text-[13px] text-black/45">{t('Choose where chart cards will be placed.')}</p>
            </div>
            <div className="space-y-3 p-5">
              <select value={selectedDashboard?.id ?? ''} onChange={event => setSelectedDashboardId(event.target.value)} className="h-9 w-full rounded-md border border-black/10 bg-white px-3 text-[13px] outline-none">
                {dashboards.map(dashboard => <option key={dashboard.id} value={dashboard.id}>{dashboard.name}</option>)}
              </select>
              <div className="flex gap-2">
                <input value={newDashboardName} onChange={event => setNewDashboardName(event.target.value)} placeholder={t('New dashboard name')} className="h-9 min-w-0 flex-1 rounded-md border border-black/10 px-3 text-[13px] outline-none" />
                <button onClick={handleCreateDashboard} className="inline-flex h-9 items-center gap-1 rounded-md bg-gray-900 px-3 text-[12px] font-medium text-white"><Plus className="h-3.5 w-3.5" /> {t('New')}</button>
              </div>
              <div className="rounded-md border border-black/10 bg-[#fbfbfa] p-3">
                <div className="mb-3 flex items-center justify-between text-[12px]"><span className="font-semibold">{selectedDashboard?.name ?? t('No dashboard')}</span><span className="text-black/40">{selectedDashboardCharts.length} {t('charts')}</span></div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedDashboardCharts.map(chart => <div key={chart.id} className="rounded border border-black/10 bg-white p-2"><div className="truncate text-[11px] font-semibold">{chart.name}</div><div className={`mt-1 inline-flex rounded border px-1.5 py-0.5 text-[10px] ${chartTypeClass(chart.type)}`}>{chart.type}</div></div>)}
                  {selectedDashboardCharts.length === 0 && <div className="col-span-2 rounded border border-dashed border-black/10 bg-white p-4 text-center text-[12px] text-black/40">{t('No chart cards placed yet.')}</div>}
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="rounded-lg border border-black/10 bg-white shadow-sm">
          <div className="grid gap-3 border-b border-black/5 px-5 py-4 md:grid-cols-[1fr_240px] md:items-end">
            <div><h2 className="text-[15px] font-semibold">{t('Chart templates')}</h2><p className="mt-1 text-[13px] text-black/45">{t('Create a reusable chart card from a pattern, then tune it later with real dataset fields.')}</p></div>
            <select value={selectedDataset?.id ?? ''} onChange={event => setSelectedDatasetId(event.target.value)} className="h-9 rounded-md border border-black/10 bg-white px-3 text-[13px] outline-none">
              {datasets.map(dataset => <option key={dataset.id} value={dataset.id}>{dataset.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
            {chartTemplates.map(template => {
              const Icon = template.icon;
              return (
                <div key={template.id} className="rounded-lg border border-black/10 bg-[#fbfbfa] p-4">
                  <div className="mb-4 flex items-start justify-between gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-black/65 shadow-sm"><Icon className="h-5 w-5" strokeWidth={1.7} /></div><span className={`rounded border px-2 py-0.5 text-[11px] font-medium ${chartTypeClass(template.type)}`}>{template.type}</span></div>
                      <h3 className="text-[15px] font-semibold">{t(template.name)}</h3>
                      <p className="mt-1 text-[13px] leading-5 text-black/50">{t(template.intent)}</p>
                      <div className="mt-4 rounded-md border border-black/5 bg-white p-3 text-[12px] leading-5 text-black/45">{t('Best for')}: {t(template.bestFor)}</div>
                  <button disabled={!selectedDataset} onClick={() => handleCreateFromTemplate(template)} className="mt-4 h-9 w-full rounded-md bg-gray-900 text-[12px] font-medium text-white hover:bg-black disabled:opacity-40">{t('Create chart card')}</button>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
