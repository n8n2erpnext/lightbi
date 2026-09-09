import { VISUALIZATION_PATTERN_LIBRARY_V1, type VisualizationPatternIdV1 } from './visualization-ontology';
import type { ChartType } from '@lightbi/core-types';
import { rendererCapabilityForPattern, type VisualizationRendererFamilyV1 } from './visualization-renderer-registry';

export const VISUALIZATION_CHART_TEMPLATE_LIBRARY_VERSION = 'lightbi.visualization-chart-template-library.v1' as const;

export type VisualizationChartTemplateV1 = {
  schemaVersion: typeof VISUALIZATION_CHART_TEMPLATE_LIBRARY_VERSION;
  patternId: VisualizationPatternIdV1;
  name: string;
  intent: string;
  bestFor: string;
  rendererFamily: VisualizationRendererFamilyV1;
  persistedChartType: ChartType | null;
  rendererReady: boolean;
};

const COPY: Record<VisualizationPatternIdV1, [string, string, string]> = {
  kpi_summary: ['KPI scorecard', 'Show one governed decision metric clearly', 'Totals, rates, current status and bounded scorecards'],
  sparkline: ['Compact sparkline', 'Show a tiny ordered trend beside a metric', 'Dense KPI bands and compact period context'],
  trend_line: ['Trend over time', 'Track movement across ordered time', 'Revenue, inventory, SLA, volume and recurring metrics'],
  trend_area: ['Area trend', 'Emphasize magnitude across an ordered trend', 'Volume, balance and cumulative-feeling time series'],
  category_compare: ['Compare categories', 'Compare observed values across categories', 'Products, branches, teams, warehouses and channels'],
  ranking_bar: ['Ranked horizontal bars', 'Rank categories where labels need room', 'Top customers, SKUs, routes, exceptions and contributors'],
  grouped_compare: ['Grouped comparison', 'Compare multiple governed series side by side', 'Actual/previous groups, channel or segment comparisons'],
  composition_stack: ['Stacked composition', 'Show category composition across groups or time', 'Channel mix, product mix and status composition'],
  composition_100: ['100% stacked composition', 'Compare proportional composition with an explicit whole', 'Share shifts across periods or groups'],
  target_combo: ['Actual vs target combo', 'Compare an observed measure with an explicit target', 'Performance, plan-vs-actual and target tracking'],
  composition_donut: ['Donut share of total', 'Show a small exhaustive composition with a governed denominator', 'Low-cardinality payment, channel or product-family share'],
  variance_waterfall: ['Variance waterfall', 'Show cumulative signed contributions to change', 'Finance bridges, revenue change and cost variance'],
  distribution_histogram: ['Distribution histogram', 'Show the shape of numeric observations', 'Latency, order value, duration, quantity and quality distributions'],
  distribution_box: ['Box distribution', 'Compare bounded distributions without hiding spread', 'Cycle time, price, service duration and grouped numeric spread'],
  relationship_scatter: ['Relationship scatter', 'Explore two measures at the same entity grain', 'Cost vs revenue, volume vs margin and operational relationships'],
  relationship_bubble: ['Relationship bubble', 'Add a third governed size measure to a scatter', 'Customer or segment impact analysis'],
  matrix_heatmap: ['Matrix heatmap', 'Show intensity across two governed dimensions', 'Warehouse/item, day/hour, category/period and quality matrices'],
  cohort_retention: ['Cohort retention heatmap', 'Follow a governed rate across cohort age', 'Retention, repeat use and lifecycle behavior'],
  process_funnel: ['Process funnel', 'Show ordered-stage progression', 'Pipeline, conversion and process-stage flow'],
  concentration_pareto: ['Pareto concentration', 'Rank contributors with cumulative concentration context', 'Defects, causes, products and supplier concentration'],
  target_bullet: ['Bullet target', 'Compare a measure with an explicit target or benchmark', 'Compact KPI target tracking'],
  variance_diverging: ['Diverging variance bars', 'Compare signed observed differences around zero', 'Variance, change and gap analysis without good/bad inference'],
  calendar_intensity: ['Calendar intensity', 'Show governed activity intensity by date', 'Tickets, orders, events and operational load'],
  geospatial_map: ['Geospatial map', 'Show a governed measure by recognized geography', 'Regional sales, service footprint and location metrics'],
  flow_sankey: ['Flow Sankey', 'Show governed source-to-target flow', 'Movement, routing and bounded process flows'],
  evidence_table: ['Evidence table', 'Keep source-bound rows close to the visual answer', 'Exceptions, drill-through and audit evidence'],
  event_timeline: ['Event timeline', 'Show ordered events for the same entity grain', 'Incidents, lifecycle events and operational history'],
  process_control: ['Control chart', 'Track a process measure against governed control limits', 'Quality and stable-process monitoring'],
  small_multiples: ['Small multiples', 'Repeat one comparable chart across governed facets', 'Branches, products, regions and cohort comparisons'],
  profile_radar: ['Normalized radar profile', 'Compare normalized profile dimensions on a common scale', 'Bounded score profiles with <=8 comparable dimensions'],
};

export const VISUALIZATION_CHART_TEMPLATE_LIBRARY_V1: VisualizationChartTemplateV1[] = VISUALIZATION_PATTERN_LIBRARY_V1.map(pattern => {
  const [name, intent, bestFor] = COPY[pattern.id];
  const capability = rendererCapabilityForPattern(pattern.id);
  return {
    schemaVersion: VISUALIZATION_CHART_TEMPLATE_LIBRARY_VERSION,
    patternId: pattern.id,
    name,
    intent,
    bestFor,
    rendererFamily: capability.family,
    persistedChartType: capability.persistedChartType,
    rendererReady: capability.surfaces.persistence && capability.surfaces.dashboard,
  };
});
