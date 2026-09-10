import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Edit2, Lightbulb, Plus, RefreshCw, Share2, ShieldCheck, Target } from 'lucide-react';
import { useAppRuntime } from '@lightbi/runtime';
import type { Chart, DashboardWidget } from '@lightbi/core-types';
import { DashboardKPIWidget } from '../components/dashboards/DashboardKPIWidget';
import { DashboardChartWidget } from '../components/dashboards/DashboardChartWidget';
import { useUiLanguage } from '../lib/ui-language';
import { VISUALIZATION_RENDERER_CAPABILITIES_V1, type VisualizationRendererFamilyV1 } from '../lib/visualization-renderer-registry';
import { VISUALIZATION_PATTERN_BY_ID_V1, type VisualizationColorSemanticsV1, type VisualizationPatternIdV1 } from '../lib/visualization-ontology';

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

export const resolveDashboardRendererType = (chartType: Chart['type']): 'bar' | 'row' | 'line' | 'donut' | 'scatter' => {
  if (chartType === 'Line') return 'line';
  if (chartType === 'Scatter' || chartType === 'Bubble') return 'scatter';
  if (chartType === 'Donut' || chartType === 'Pie') return 'donut';
  if (chartType === 'Row') return 'row';
  return 'bar';
};

export const resolveDashboardVisualizationMetadata = (chart: Chart): {
  rendererFamily: VisualizationRendererFamilyV1;
  patternId: VisualizationPatternIdV1 | null;
  colorSemantics: VisualizationColorSemanticsV1[] | null;
} => {
  const lightbiData = (chart.formatting?.lightbiData as any) ?? {};
  const visual = lightbiData?.decisionVisualizationPlan?.visualizationPlan;
  const narrativeOverride = typeof lightbiData?.visualNarrativeRendererFamily === 'string'
    && lightbiData.visualNarrativeRendererFamily in VISUALIZATION_RENDERER_CAPABILITIES_V1
    ? lightbiData.visualNarrativeRendererFamily as VisualizationRendererFamilyV1
    : null;
  const rendererFamily = narrativeOverride
    ?? (typeof visual?.rendererFamily === 'string' && visual.rendererFamily in VISUALIZATION_RENDERER_CAPABILITIES_V1
    ? visual.rendererFamily as VisualizationRendererFamilyV1
    : chart.type === 'Bubble' ? 'bubble'
      : chart.type === 'Funnel' ? 'funnel'
      : resolveDashboardRendererType(chart.type) as VisualizationRendererFamilyV1);
  const patternId = typeof visual?.patternId === 'string' && VISUALIZATION_PATTERN_BY_ID_V1.has(visual.patternId as VisualizationPatternIdV1)
    ? visual.patternId as VisualizationPatternIdV1 : null;
  const colorSemantics = Array.isArray(visual?.patternRules?.colorSemantics)
    ? visual.patternRules.colorSemantics as VisualizationColorSemanticsV1[] : null;
  return { rendererFamily, patternId, colorSemantics };
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
    return <div data-testid="dashboard-widget" style={widgetGridStyle(widget)} className="rounded-md border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-400">{t('Missing chart')}</div>;
  }
  const payload = getSavedChartPayload(chart);
  if (!payload || !payload.rows?.length) {
    return (
      <div data-testid="dashboard-widget" style={widgetGridStyle(widget)} className="flex h-full flex-col justify-center rounded-md border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
        <h3 className="font-semibold text-gray-800">{localize(chart.name)}</h3>
        <p className="mt-1 text-xs text-gray-400">{t('A saved BA or Advanced result is required to render real data.')}</p>
      </div>
    );
  }

  const visualization = resolveDashboardVisualizationMetadata(chart);
  const relationshipFields = ['scatter', 'bubble'].includes(visualization.rendererFamily) ? payload.seriesFields?.slice(0, 3) ?? [] : [];
  const xAxisKey = ['scatter', 'bubble'].includes(visualization.rendererFamily)
    ? relationshipFields[0] || chart.xAxis?.[0]?.columnName || Object.keys(payload.rows[0] ?? {})[0] || 'x'
    : payload.xField || chart.xAxis?.[0]?.columnName || Object.keys(payload.rows[0] ?? {})[0] || 'name';
  const seriesKey = ['scatter', 'bubble'].includes(visualization.rendererFamily)
    ? relationshipFields[1] || chart.yAxis?.[0]?.columnName || Object.keys(payload.rows[0] ?? {}).find(key => key !== xAxisKey) || 'y'
    : payload.yField || payload.seriesFields?.[0] || chart.yAxis?.[0]?.columnName || Object.keys(payload.rows[0] ?? {}).find(key => key !== xAxisKey) || 'value';
  const seriesKeys = payload.seriesFields?.length ? payload.seriesFields : [seriesKey];

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
        chartType={resolveDashboardRendererType(chart.type)}
        rendererFamily={visualization.rendererFamily}
        patternId={visualization.patternId}
        colorSemantics={visualization.colorSemantics}
        data={payload.rows}
        xAxisKey={xAxisKey}
        seriesKey={seriesKey}
        seriesKeys={seriesKeys}
        valueType={payload.valueKind === 'money' ? 'currency' : 'number'}
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
  const perspectiveFindings = (ba.perspective?.findings ?? []).filter(Boolean).slice(0, 6);
  const actions = [...(ba.perspective?.recommendedActions ?? []), ...(ba.deep?.decisionSuggestions ?? []).map(item => item.action || item.title || '')].filter(Boolean).slice(0, 5);
  const caveats = [...(ba.perspective?.limitations ?? []), ...(ba.deep?.caveats ?? [])].filter(Boolean).slice(0, 5);

  return (
    <div data-testid="perspective-dashboard" className="flex h-full flex-1 flex-col bg-[var(--lb-canvas)]">
      <header className="lb-inline-gutter flex min-h-16 shrink-0 items-center justify-between border-b border-[var(--lb-divider)] bg-white py-3">
        <div className="flex min-w-0 items-center gap-3 text-[var(--lb-ink)]">
          <button data-testid="dashboard-back" onClick={() => navigate(-1)} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-[var(--lb-radius-default)] border border-[var(--lb-divider)] bg-white px-3 text-xs font-semibold text-black/65 hover:bg-black/[0.025]" title={t('Back to analysis')}><ArrowLeft className="h-4 w-4" />{t('Back')}</button>
          <div className="min-w-0"><h1 className="truncate text-[15px] font-semibold">{dashboard ? localize(dashboard.name) : t('Select a dashboard')}</h1>{dashboard?.metadata?.perspective && <p className="mt-0.5 truncate text-[11px] text-black/45">{t('Perspective')}: {localize(String(dashboard.metadata.perspective))} · {String(dashboard.metadata.datasetId ?? '')}</p>}</div>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-widest text-black/35">{dashboard?.widgets.length ?? 0} {t('cards')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div data-testid="dashboard-view-controls" className="flex overflow-hidden rounded-[var(--lb-radius-default)] border border-[var(--lb-divider)] bg-white divide-x divide-[var(--lb-divider)]">
            <button className="p-2 text-black/45 transition-colors hover:bg-black/[0.035] hover:text-black/75" title={t('Refresh')}><RefreshCw className="h-4 w-4" /></button>
            <button className="p-2 text-black/45 transition-colors hover:bg-black/[0.035] hover:text-black/75" title={t('Edit')}><Edit2 className="h-4 w-4" /></button>
            <button className="p-2 text-black/45 transition-colors hover:bg-black/[0.035] hover:text-black/75" title={t('Share')}><Share2 className="h-4 w-4" /></button>
          </div>
          <Link to="/charts" className="lb-action-primary text-[13px]"><Plus className="mr-1 h-4 w-4" />{t('Add chart')}</Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        {!dashboard ? (
          <div className="lb-page-gutter flex h-full items-center justify-center text-sm text-black/45">{t('Choose or create a dashboard from the chart library.')}</div>
        ) : dashboard.widgets.length === 0 ? (
          <div className="lb-page-gutter flex h-full flex-col items-center justify-center text-center">
            <h2 className="text-base font-semibold text-[var(--lb-ink)]">{t('No chart cards yet')}</h2>
            <p className="mt-1 text-sm text-black/45">{t('Add reusable chart cards from the Chart Library.')}</p>
            <Link to="/charts" className="lb-action-primary mt-4">{t('Open Chart Library')}</Link>
          </div>
        ) : (
          <div className="lb-page-gutter">
            {dashboard.metadata?.source === 'easy_mode_perspective' && <div className="mb-5 flex flex-col gap-2 border-y border-[var(--lb-divider)] py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-wider text-black/45">{t('Governed perspective dashboard')}</div><p className="mt-1 text-[13px] text-black/55">{t('This dashboard was composed from the selected perspective, executed results, and BA evidence.')}</p></div><div className="flex gap-3 text-[11px] font-semibold text-black/50"><span>{t('Governed')}</span><span aria-hidden="true">·</span><span>{dashboard.metadata.evidenceScope === 'full_source' ? t('Full-source evidence') : t('Full-source result · representative BA sample')}</span></div></div>}

            {ba.deep && <section data-testid="dashboard-executive-brief" className="mb-5 grid border-b border-[var(--lb-divider)] pb-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:divide-x lg:divide-[var(--lb-divider)]">
              <div className="min-w-0 pr-0 lg:pr-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-700"><ShieldCheck className="h-4 w-4" />{t('Executive BA brief')}</div>
                <h2 className="mt-2 text-xl font-semibold text-[var(--lb-ink)]">{localize(ba.perspective?.analysisLabel || String(dashboard.metadata?.perspective ?? ''))}</h2>
                <p data-testid="dashboard-executive-summary" className="mt-2 max-w-4xl text-sm leading-6 text-black/60">{localize(ba.deep.executiveSummary)}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 divide-x divide-[var(--lb-divider)] border-y border-[var(--lb-divider)] lg:mt-0 lg:border-y-0 lg:pl-6">
                <div className="py-3 pr-4"><div className="text-[10px] font-semibold uppercase tracking-wider text-black/35">{t('Decision readiness')}</div><div className="mt-1 text-2xl font-semibold text-[var(--lb-ink)]">{ba.deep.decisionReadinessScore ?? '—'}<span className="text-xs font-medium text-black/35">/100</span></div></div>
                <div className="py-3 pl-4"><div className="text-[10px] font-semibold uppercase tracking-wider text-black/35">{t('Data trust')}</div><div className="mt-1 text-2xl font-semibold text-[var(--lb-ink)]">{ba.deep.dataTrustScore ?? '—'}<span className="text-xs font-medium text-black/35">/100</span></div></div>
              </div>
            </section>}

            {(ba.perspective || ba.deep) && <section data-testid="dashboard-decision-context" className="mb-5 grid border-y border-[var(--lb-divider)] lg:grid-cols-3 lg:divide-x lg:divide-[var(--lb-divider)]">
              <div className="px-1 py-5 lg:pr-6">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{t('Selected decision perspective')}</div>
                <h2 className="mt-2 text-[17px] font-semibold">{localize(ba.perspective?.analysisLabel || String(dashboard.metadata?.perspective ?? dashboard.name))}</h2>
                <p className="mt-2 text-[13px] leading-5 text-black/50">{t('Every KPI, chart, finding and action below is scoped to this perspective and its governed evidence.')}</p>
                <p className="mt-3 text-[11px] text-black/40">{(ba.perspective?.sourceRowCount ?? 0).toLocaleString()} {t('source rows')} · {primaryInsights.length + perspectiveFindings.length} {t('BA findings')} · {actions.length} {t('recommended actions')}</p>
              </div>
              <div className="px-1 py-5 lg:px-6">
                <div className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-700" /><h2 className="text-sm font-semibold">{t('What the evidence says')}</h2></div>
                {perspectiveFindings.length > 0 ? <ol className="mt-3 divide-y divide-[var(--lb-divider)]">{perspectiveFindings.slice(0, 4).map((finding, index) => <li key={index} className="flex gap-3 py-2.5 text-xs leading-5 text-black/60"><span className="font-semibold tabular-nums text-amber-700">{String(index + 1).padStart(2, '0')}</span>{localize(finding)}</li>)}</ol> : <p className="mt-3 text-sm leading-6 text-black/55">{localize(ba.deep?.executiveSummary) || t('Run the selected analysis to generate evidence-backed findings.')}</p>}
              </div>
              <div className="px-1 py-5 lg:pl-6">
                <div className="flex items-center gap-2"><Target className="h-4 w-4 text-blue-700" /><h2 className="text-sm font-semibold">{t('Decision priority')}</h2></div>
                <p className="mt-3 text-sm leading-6 text-black/65">{actions[0] ? localize(actions[0]) : t('Review the strongest driver first, then open its supporting rows before taking action.')}</p>
                <div className="mt-4 border-l-2 border-blue-300 bg-blue-50/40 px-3 py-2 text-xs leading-5 text-black/55">{caveats.length > 0 ? t(`${caveats.length} evidence limitations remain visible below.`) : t('No additional evidence limitation was recorded for this dashboard.')}</div>
              </div>
            </section>}

            <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-3" style={{ gridAutoRows: '30px' }}>
              {dashboard.widgets.map(widget => <DashboardWidgetCard key={widget.id} widget={widget} chart={widget.referenceId ? charts[widget.referenceId] : undefined} />)}
            </div>

            {(primaryInsights.length > 0 || actions.length > 0 || caveats.length > 0) && <section data-testid="dashboard-deep-ba" className="mt-6 grid border-t border-[var(--lb-divider)] xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] xl:divide-x xl:divide-[var(--lb-divider)]">
              <div className="py-5 xl:pr-6">
                <div className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-600" /><h2 className="text-sm font-semibold">{t('BA findings for this perspective')}</h2></div>
                <div className="mt-3 divide-y divide-[var(--lb-divider)] border-y border-[var(--lb-divider)]">{primaryInsights.map((insight, index) => <article key={insight.id || index} className="py-3">
                  <div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold text-[var(--lb-ink)]">{localize(insight.title)}</h3>{typeof insight.confidence === 'number' && <span className="text-[10px] font-semibold text-black/40">{insight.confidence}%</span>}</div>
                  <p className="mt-1.5 text-xs leading-5 text-black/60">{localize(insight.statement)}</p>
                  {insight.evidence?.[0] && <p className="mt-2 border-l-2 border-[var(--lb-divider)] pl-3 text-[11px] leading-5 text-black/45">{localize(insight.evidence[0])}</p>}
                </article>)}</div>
              </div>
              <div className="py-5 xl:pl-6">
                {actions.length > 0 && <div className="border-l-2 border-blue-400 bg-blue-50/35 px-4 py-3"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-blue-700" /><h2 className="text-sm font-semibold text-blue-950">{t('Recommended actions')}</h2></div><ol className="mt-3 divide-y divide-blue-100">{actions.map((action, index) => <li key={index} className="flex gap-3 py-2 text-xs leading-5 text-black/65"><span className="font-semibold tabular-nums text-blue-700">{String(index + 1).padStart(2, '0')}</span>{localize(action)}</li>)}</ol></div>}
                {caveats.length > 0 && <div className="mt-4 border-l-2 border-amber-400 bg-amber-50/35 px-4 py-3"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-700" /><h2 className="text-sm font-semibold text-amber-950">{t('Evidence limits')}</h2></div><ul className="mt-3 divide-y divide-amber-100">{caveats.map((caveat, index) => <li key={index} className="flex gap-2 py-2 text-xs leading-5 text-black/65"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />{localize(caveat)}</li>)}</ul></div>}
              </div>
            </section>}
          </div>
        )}
      </div>
    </div>
  );
};
