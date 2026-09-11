export const VISUALIZATION_ONTOLOGY_VERSION = 'lightbi.visualization-ontology.v1' as const;

export type VisualizationAnalyticalIntentV1 =
  | 'single_value' | 'target_attainment' | 'trend' | 'period_comparison'
  | 'balance_flow' | 'category_comparison' | 'ranking' | 'composition'
  | 'composition_over_time' | 'relationship' | 'contribution' | 'variance'
  | 'aging' | 'process_time' | 'distribution' | 'quality_control'
  | 'risk_concentration' | 'anomaly_scan' | 'capacity_utilization'
  | 'cohort_retention' | 'funnel' | 'pareto' | 'geospatial' | 'flow'
  | 'evidence_detail' | 'schedule';

export type VisualizationEvidenceRoleV1 =
  | 'measure' | 'comparison_measure' | 'rate' | 'target' | 'benchmark'
  | 'signed_measure' | 'part_measure' | 'denominator' | 'size_measure'
  | 'ordered_time' | 'calendar_date' | 'ordered_step' | 'ordered_stage'
  | 'category' | 'series' | 'facet' | 'entity_key' | 'profile_dimension'
  | 'numeric_observation' | 'matrix_row' | 'matrix_column' | 'cohort_key'
  | 'period_index' | 'geo_key' | 'source_node' | 'target_node'
  | 'flow_measure' | 'event_time' | 'status' | 'control_limit';

export type VisualizationPatternFamilyV1 =
  | 'summary' | 'trend' | 'comparison' | 'composition' | 'distribution'
  | 'relationship' | 'matrix' | 'process' | 'target' | 'geospatial'
  | 'flow' | 'evidence' | 'profile';

export type VisualizationColorSemanticsV1 =
  | 'neutral' | 'categorical' | 'sequential' | 'diverging' | 'status';

export type VisualizationUnitPolicyV1 =
  | 'single_unit' | 'compatible_units' | 'explicit_multi_unit'
  | 'normalized_common_scale' | 'none';

export type MetricDesirabilityV1 =
  | 'higher_is_favorable' | 'lower_is_favorable' | 'target_range'
  | 'neutral' | 'context_dependent' | 'unknown';

export type VisualizationPatternIdV1 =
  | 'kpi_summary' | 'sparkline' | 'trend_line' | 'trend_area'
  | 'category_compare' | 'ranking_bar' | 'grouped_compare'
  | 'composition_stack' | 'composition_100' | 'target_combo'
  | 'composition_donut' | 'variance_waterfall'
  | 'distribution_histogram' | 'distribution_box'
  | 'relationship_scatter' | 'relationship_bubble' | 'matrix_heatmap'
  | 'cohort_retention' | 'process_funnel' | 'concentration_pareto'
  | 'target_bullet' | 'variance_diverging' | 'calendar_intensity'
  | 'geospatial_map' | 'flow_sankey' | 'evidence_table'
  | 'event_timeline' | 'process_control' | 'small_multiples' | 'profile_radar';

export type VisualizationCardinalityV1 = {
  maxCategories?: number;
  maxSeries?: number;
  maxPoints?: number;
  maxFacets?: number;
  maxStages?: number;
  maxDimensions?: number;
  maxNodes?: number;
  maxLinks?: number;
  maxMatrixRows?: number;
  maxMatrixColumns?: number;
};

export type VisualizationPatternDefinitionV1 = {
  id: VisualizationPatternIdV1;
  label: string;
  family: VisualizationPatternFamilyV1;
  intents: VisualizationAnalyticalIntentV1[];
  oneOfRequiredRoleSets: VisualizationEvidenceRoleV1[][];
  optionalRoles: VisualizationEvidenceRoleV1[];
  unitPolicy: VisualizationUnitPolicyV1;
  cardinality: VisualizationCardinalityV1;
  colorSemantics: VisualizationColorSemanticsV1[];
  labelRules: string[];
  axisRules: string[];
  tooltipRules: string[];
  negativeRules: string[];
  fallbacks: VisualizationPatternIdV1[];
};

export const VISUALIZATION_ONTOLOGY_POLICY_V1 = {
  rendererBindingAllowed: false,
  mbMayAuthorizePattern: false,
  chartDiversityIsGoal: false,
  highLowImpliesGoodBad: false,
  statusColorRequiresExplicitDesirability: true,
  defaultDesirability: 'unknown' as MetricDesirabilityV1,
  fallbackMayPreferTable: true,
} as const;

const common = {
  labels: ['Use concise labels; preserve source meaning and units.'],
  axes: ['Show units and ordering explicitly when an axis exists.'],
  tips: ['Expose exact values, units and evidence scope without causal wording.'],
};

function pattern(input: Omit<VisualizationPatternDefinitionV1, 'optionalRoles' | 'labelRules' | 'axisRules' | 'tooltipRules'> & {
  optionalRoles?: VisualizationEvidenceRoleV1[];
  labelRules?: string[];
  axisRules?: string[];
  tooltipRules?: string[];
}): VisualizationPatternDefinitionV1 {
  return {
    ...input,
    optionalRoles: input.optionalRoles ?? [],
    labelRules: input.labelRules ?? common.labels,
    axisRules: input.axisRules ?? common.axes,
    tooltipRules: input.tooltipRules ?? common.tips,
  };
}

export const VISUALIZATION_PATTERN_LIBRARY_V1: VisualizationPatternDefinitionV1[] = [
  pattern({ id:'kpi_summary', label:'KPI summary', family:'summary', intents:['single_value','target_attainment'],
    oneOfRequiredRoleSets:[['measure']], optionalRoles:['comparison_measure','target','benchmark'], unitPolicy:'single_unit', cardinality:{maxPoints:2}, colorSemantics:['neutral','status'],
    axisRules:['No axis; show the metric unit beside the value.'], negativeRules:['Do not fabricate a delta, target or favorable status without corresponding evidence.'], fallbacks:['evidence_table'] }),
  pattern({ id:'sparkline', label:'Compact trend', family:'trend', intents:['trend'],
    oneOfRequiredRoleSets:[['ordered_time','measure']], optionalRoles:['benchmark'], unitPolicy:'single_unit', cardinality:{maxSeries:1,maxPoints:60}, colorSemantics:['neutral','sequential'],
    negativeRules:['Do not use an unordered category field as time or replace a precise comparison that needs labels.'], fallbacks:['trend_line','evidence_table'] }),
  pattern({ id:'trend_line', label:'Ordered trend', family:'trend', intents:['trend','period_comparison'],
    oneOfRequiredRoleSets:[['ordered_time','measure']], optionalRoles:['series','benchmark'], unitPolicy:'compatible_units', cardinality:{maxSeries:6,maxPoints:120}, colorSemantics:['categorical','neutral'],
    negativeRules:['Do not connect unordered categories or incompatible units as one continuous trend.'], fallbacks:['category_compare','evidence_table'] }),
  pattern({ id:'trend_area', label:'Magnitude trend', family:'trend', intents:['trend','balance_flow'],
    oneOfRequiredRoleSets:[['ordered_time','measure']], optionalRoles:['series'], unitPolicy:'compatible_units', cardinality:{maxSeries:4,maxPoints:120}, colorSemantics:['sequential','categorical'],
    negativeRules:['Do not use filled area when it would imply a false part-to-whole relationship.'], fallbacks:['trend_line','evidence_table'] }),
  pattern({ id:'category_compare', label:'Category comparison', family:'comparison', intents:['category_comparison','period_comparison'],
    oneOfRequiredRoleSets:[['category','measure']], optionalRoles:['benchmark'], unitPolicy:'single_unit', cardinality:{maxCategories:16,maxSeries:1}, colorSemantics:['categorical','neutral'],
    negativeRules:['Do not imply ranking unless order is explicitly meaningful; avoid unreadable category counts.'], fallbacks:['ranking_bar','evidence_table'] }),
  pattern({ id:'ranking_bar', label:'Ranked comparison', family:'comparison', intents:['ranking','category_comparison'],
    oneOfRequiredRoleSets:[['category','measure']], optionalRoles:['benchmark'], unitPolicy:'single_unit', cardinality:{maxCategories:25,maxSeries:1}, colorSemantics:['neutral','sequential'],
    axisRules:['Use a common quantitative baseline and make the ranking direction explicit.'], negativeRules:['Do not label highest or lowest as best or worst without desirability evidence.'], fallbacks:['category_compare','evidence_table'] }),
  pattern({ id:'grouped_compare', label:'Grouped comparison', family:'comparison', intents:['category_comparison','period_comparison'],
    oneOfRequiredRoleSets:[['category','series','measure']], optionalRoles:['benchmark'], unitPolicy:'single_unit', cardinality:{maxCategories:12,maxSeries:4}, colorSemantics:['categorical'],
    negativeRules:['Do not group many series or imply composition when series are independent comparisons.'], fallbacks:['small_multiples','category_compare','evidence_table'] }),
  pattern({ id:'composition_stack', label:'Absolute composition', family:'composition', intents:['composition','composition_over_time'],
    oneOfRequiredRoleSets:[['category','series','part_measure'],['ordered_time','series','part_measure']], optionalRoles:['denominator'], unitPolicy:'single_unit', cardinality:{maxCategories:12,maxSeries:6}, colorSemantics:['categorical'],
    negativeRules:['Do not stack incompatible units or unrelated series merely to reduce chart count.'], fallbacks:['grouped_compare','evidence_table'] }),
  pattern({ id:'composition_100', label:'Normalized composition', family:'composition', intents:['composition','composition_over_time'],
    oneOfRequiredRoleSets:[['category','series','part_measure','denominator'],['ordered_time','series','part_measure','denominator']], optionalRoles:[], unitPolicy:'single_unit', cardinality:{maxCategories:12,maxSeries:6}, colorSemantics:['categorical'],
    negativeRules:['Do not normalize without a valid denominator or when parts do not describe the intended whole.'], fallbacks:['composition_stack','evidence_table'] }),
  pattern({ id:'target_combo', label:'Actual and target trend', family:'target', intents:['target_attainment','period_comparison','relationship'],
    oneOfRequiredRoleSets:[['ordered_time','measure','target'],['category','measure','target'],['ordered_time','measure','rate']], optionalRoles:['comparison_measure'], unitPolicy:'explicit_multi_unit', cardinality:{maxSeries:3,maxPoints:60}, colorSemantics:['neutral','categorical'],
    negativeRules:['Do not combine unrelated measures or hide a secondary unit behind an unlabeled axis.'], fallbacks:['trend_line','target_bullet','evidence_table'] }),
  pattern({ id:'composition_donut', label:'Part-to-whole composition', family:'composition', intents:['composition'],
    oneOfRequiredRoleSets:[['category','part_measure','denominator']], optionalRoles:[], unitPolicy:'single_unit', cardinality:{maxCategories:6,maxSeries:1}, colorSemantics:['categorical'],
    axisRules:['No axis; expose the denominator and scoped whole in adjacent evidence.'], negativeRules:['Do not use without an exhaustive or explicitly scoped whole; do not exceed six categories.'], fallbacks:['ranking_bar','composition_stack','evidence_table'] }),
  pattern({ id:'variance_waterfall', label:'Additive contribution bridge', family:'comparison', intents:['contribution','variance','balance_flow'],
    oneOfRequiredRoleSets:[['ordered_step','signed_measure']], optionalRoles:['benchmark'], unitPolicy:'single_unit', cardinality:{maxCategories:16}, colorSemantics:['diverging','neutral'],
    negativeRules:['Do not imply reconciliation unless signed contributions genuinely bridge governed start/end values.'], fallbacks:['variance_diverging','evidence_table'] }),
  pattern({ id:'distribution_histogram', label:'Distribution histogram', family:'distribution', intents:['distribution','aging','process_time'],
    oneOfRequiredRoleSets:[['numeric_observation']], optionalRoles:['benchmark'], unitPolicy:'single_unit', cardinality:{maxCategories:30,maxPoints:5000}, colorSemantics:['sequential','neutral'],
    negativeRules:['Do not rank individual records or choose arbitrary bins that manufacture a distribution story.'], fallbacks:['distribution_box','evidence_table'] }),
  pattern({ id:'distribution_box', label:'Distribution summary', family:'distribution', intents:['distribution','quality_control'],
    oneOfRequiredRoleSets:[['numeric_observation']], optionalRoles:['category'], unitPolicy:'single_unit', cardinality:{maxCategories:12,maxPoints:5000}, colorSemantics:['categorical','neutral'],
    negativeRules:['Do not use when quartiles are not meaningful or when the audience needs exact record-level evidence first.'], fallbacks:['distribution_histogram','evidence_table'] }),
  pattern({ id:'relationship_scatter', label:'Numeric relationship', family:'relationship', intents:['relationship'],
    oneOfRequiredRoleSets:[['entity_key','measure','comparison_measure']], optionalRoles:['category'], unitPolicy:'compatible_units', cardinality:{maxPoints:1000,maxCategories:8}, colorSemantics:['categorical','neutral'],
    negativeRules:['Require both measures at the same entity grain; association must never be presented as causation.'], fallbacks:['evidence_table'] }),
  pattern({ id:'relationship_bubble', label:'Three-variable relationship', family:'relationship', intents:['relationship','risk_concentration'],
    oneOfRequiredRoleSets:[['entity_key','measure','comparison_measure','size_measure']], optionalRoles:['category'], unitPolicy:'explicit_multi_unit', cardinality:{maxPoints:500,maxCategories:8}, colorSemantics:['categorical','neutral'],
    negativeRules:['Do not add bubble size unless its magnitude is governed and visually interpretable; association is not causation.'], fallbacks:['relationship_scatter','evidence_table'] }),
  pattern({ id:'matrix_heatmap', label:'Two-dimensional intensity', family:'matrix', intents:['anomaly_scan','capacity_utilization','quality_control'],
    oneOfRequiredRoleSets:[['matrix_row','matrix_column','measure']], optionalRoles:['benchmark'], unitPolicy:'single_unit', cardinality:{maxMatrixRows:30,maxMatrixColumns:31}, colorSemantics:['sequential','diverging'],
    negativeRules:['Do not encode favorable/adverse meaning with color unless metric desirability or a signed baseline is explicit.'], fallbacks:['small_multiples','evidence_table'] }),
  pattern({ id:'cohort_retention', label:'Cohort retention matrix', family:'matrix', intents:['cohort_retention'],
    oneOfRequiredRoleSets:[['cohort_key','period_index','rate']], optionalRoles:['benchmark'], unitPolicy:'single_unit', cardinality:{maxMatrixRows:24,maxMatrixColumns:24}, colorSemantics:['sequential'],
    negativeRules:['Do not infer cohort identity or retention when cohort key, elapsed period or denominator is ambiguous.'], fallbacks:['matrix_heatmap','evidence_table'] }),
  pattern({ id:'process_funnel', label:'Ordered stage funnel', family:'process', intents:['funnel'],
    oneOfRequiredRoleSets:[['ordered_stage','measure']], optionalRoles:['denominator'], unitPolicy:'single_unit', cardinality:{maxStages:10}, colorSemantics:['sequential','neutral'],
    negativeRules:['Do not fabricate stage order or compare stages with incompatible population bases.'], fallbacks:['category_compare','evidence_table'] }),
  pattern({ id:'concentration_pareto', label:'Concentration Pareto', family:'comparison', intents:['pareto','risk_concentration'],
    oneOfRequiredRoleSets:[['category','measure']], optionalRoles:['denominator'], unitPolicy:'single_unit', cardinality:{maxCategories:25}, colorSemantics:['neutral','sequential'],
    negativeRules:['Do not call high contribution adverse unless desirability is independently established.'], fallbacks:['ranking_bar','evidence_table'] }),
  pattern({ id:'target_bullet', label:'Actual versus target', family:'target', intents:['target_attainment','variance'],
    oneOfRequiredRoleSets:[['measure','target'],['measure','benchmark']], optionalRoles:[], unitPolicy:'single_unit', cardinality:{maxPoints:2}, colorSemantics:['neutral','status'],
    negativeRules:['Do not assign status color when target direction or desirability is unknown.'], fallbacks:['kpi_summary','evidence_table'] }),
  pattern({ id:'variance_diverging', label:'Centered variance comparison', family:'comparison', intents:['variance','period_comparison'],
    oneOfRequiredRoleSets:[['category','signed_measure']], optionalRoles:['benchmark'], unitPolicy:'single_unit', cardinality:{maxCategories:25}, colorSemantics:['diverging','neutral'],
    negativeRules:['Require a meaningful zero or governed baseline; positive and negative signs are not automatically favorable/adverse.'], fallbacks:['ranking_bar','evidence_table'] }),
  pattern({ id:'calendar_intensity', label:'Calendar intensity', family:'matrix', intents:['trend','anomaly_scan'],
    oneOfRequiredRoleSets:[['calendar_date','measure']], optionalRoles:['benchmark'], unitPolicy:'single_unit', cardinality:{maxPoints:370}, colorSemantics:['sequential','diverging'],
    negativeRules:['Require daily date grain; do not use calendar layout when exact time-series comparison is the primary task.'], fallbacks:['trend_line','evidence_table'] }),
  pattern({ id:'geospatial_map', label:'Geospatial distribution', family:'geospatial', intents:['geospatial'],
    oneOfRequiredRoleSets:[['geo_key','measure']], optionalRoles:['category','status'], unitPolicy:'single_unit', cardinality:{maxCategories:12,maxPoints:500}, colorSemantics:['sequential','categorical','status'],
    negativeRules:['Geography must materially answer the question and locations must be validated; never use a map as decoration.'], fallbacks:['ranking_bar','evidence_table'] }),
  pattern({ id:'flow_sankey', label:'Source-to-target flow', family:'flow', intents:['flow'],
    oneOfRequiredRoleSets:[['source_node','target_node','flow_measure']], optionalRoles:['category'], unitPolicy:'single_unit', cardinality:{maxNodes:30,maxLinks:100}, colorSemantics:['categorical','neutral'],
    negativeRules:['Require genuine source-to-target records; same labels across files never establish a flow or join.'], fallbacks:['evidence_table'] }),
  pattern({ id:'evidence_table', label:'Evidence table', family:'evidence', intents:['evidence_detail','ranking'],
    oneOfRequiredRoleSets:[['entity_key'],['category','measure']], optionalRoles:['status','event_time'], unitPolicy:'none', cardinality:{maxPoints:200}, colorSemantics:['neutral','status'],
    axisRules:['No graphical axis; preserve field names, units and source-bound row identity.'], negativeRules:['Do not hide material evidence fields merely to make the table visually sparse.'], fallbacks:[] }),
  pattern({ id:'event_timeline', label:'Event timeline', family:'process', intents:['schedule','process_time'],
    oneOfRequiredRoleSets:[['entity_key','event_time']], optionalRoles:['status','ordered_step'], unitPolicy:'none', cardinality:{maxPoints:200}, colorSemantics:['categorical','status','neutral'],
    negativeRules:['Require trustworthy event time or interval ordering; do not infer missing milestones.'], fallbacks:['evidence_table'] }),
  pattern({ id:'process_control', label:'Process control', family:'trend', intents:['quality_control','anomaly_scan'],
    oneOfRequiredRoleSets:[['ordered_time','measure','control_limit']], optionalRoles:['benchmark'], unitPolicy:'single_unit', cardinality:{maxSeries:3,maxPoints:200}, colorSemantics:['neutral','diverging'],
    negativeRules:['Control limits or baselines must be governed; never invent limits from presentation heuristics.'], fallbacks:['trend_line','evidence_table'] }),
  pattern({ id:'small_multiples', label:'Small multiples', family:'comparison', intents:['trend','category_comparison'],
    oneOfRequiredRoleSets:[['facet','ordered_time','measure'],['facet','category','measure']], optionalRoles:['benchmark'], unitPolicy:'single_unit', cardinality:{maxFacets:12,maxSeries:1,maxPoints:120}, colorSemantics:['neutral','categorical'],
    negativeRules:['Facets must share comparable scales and one analytical question; do not use facets to hide incompatible measures.'], fallbacks:['trend_line','ranking_bar','evidence_table'] }),
  pattern({ id:'profile_radar', label:'Normalized profile', family:'profile', intents:['category_comparison'],
    oneOfRequiredRoleSets:[['entity_key','profile_dimension','measure']], optionalRoles:['benchmark'], unitPolicy:'normalized_common_scale', cardinality:{maxSeries:4,maxDimensions:8}, colorSemantics:['categorical','neutral'],
    negativeRules:['Require a small set of comparable normalized dimensions; prefer bars when precise comparison matters.'], fallbacks:['grouped_compare','evidence_table'] }),
];

export const VISUALIZATION_PATTERN_BY_ID_V1 = new Map(
  VISUALIZATION_PATTERN_LIBRARY_V1.map(definition => [definition.id, definition] as const),
);
