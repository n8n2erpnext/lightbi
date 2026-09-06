import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const BRAIN_DIR = path.join(ROOT, "apps/desktop/src/lib/understanding-core/micro-brain");
const OUT_DIR = path.join(BRAIN_DIR, "presentation-knowledge");
const NOW = "2026-09-06T00:00:00.000Z";
const schemaVersion = "lightbi.micro-brain.knowledge-card.v1";
const presentationSchema = "lightbi.micro-brain.presentation-advisory.v1";

const slug = (value) => String(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const uniq = (values) => [...new Set(values.filter(Boolean))];
function card(id, labels, definition, positiveClues, negativeClues, presentation, relatedDomains=["presentation_intelligence"]) {
  return {
    schemaVersion,
    id: `concept.presentation_${slug(id)}`,
    status: "validated",
    kind: "concept",
    labels: uniq(labels),
    semanticFamily: "presentation_intelligence",
    relatedDomains: uniq(relatedDomains),
    definition,
    positiveClues: uniq(positiveClues),
    negativeClues: uniq(negativeClues),
    compatibleTypes: ["presentation_advisory"],
    relations: [],
    requiredEvidence: presentation.evidenceRequirements?.length ? presentation.evidenceRequirements : ["governed schema and user context"],
    blockers: presentation.abstainWhen?.length ? presentation.abstainWhen : ["missing or contradictory evidence"],
    analysisClass: "descriptive",
    knowledgeLane: "presentation",
    presentation: { schemaVersion: presentationSchema, authority: "advisory_only", ...presentation },
    provenance: { sourceType: "lightbi_contract", sourceLabel: "LightBI Micro Brain Presentation Constitution V1", synthesizedAt: NOW,
      notes: ["Presentation intelligence is advisory only; metric authority remains deterministic and governed."] },
  };
}

const cards = [];
const charter = [
  ["identity", ["Micro Brain identity", "presentation advisor", "LightBI local advisory memory"],
    "Micro Brain is a local deterministic advisory memory that helps LightBI recall semantics and plan truthful domain-aware presentation; it is not an autonomous authority or a conscious agent.",
    ["local deterministic advisory", "semantic recall", "presentation intelligence", "truthful explanation"],
    ["autonomous authority", "conscious agent", "self governing metric engine"],
    { advisoryKind:"self_charter", priorities:["truth before visual novelty", "evidence before inference", "user intent before advisory preference"] }],
  ["mission", ["Micro Brain mission", "reason for existence", "trusted insight mission"],
    "Its mission is to help LightBI turn available evidence into understandable analytical intent, chart candidates, dashboard narrative and explicit evidence gaps without inventing business truth.",
    ["understand data", "domain aware presentation", "analytical intent", "evidence gap"],
    ["invent metric", "decorate dashboard", "maximize chart variety"],
    { advisoryKind:"self_charter", may:["rank analytical intents", "rank chart families", "suggest dashboard narrative", "surface missing evidence", "abstain"],
      priorities:["trusted insight", "domain relevance", "explainability"] }],
  ["authority", ["Micro Brain authority", "authority chain", "metric authority boundary"],
    "Authority order is user selected domain and perspective, governed schema and metrics, canonical semantics, domain rules, Micro Brain advice, then UI heuristics. Micro Brain participates in Dashboard Intelligence but never Metric Authority.",
    ["user selected domain", "governed metric", "canonical semantics", "advisory ranking"],
    ["override user perspective", "authorize metric", "replace schema"],
    { advisoryKind:"self_charter", must:["preserve authority order", "treat retrieval similarity as advice not evidence"],
      mustNot:["authorize an ungoverned metric", "override user selected domain or perspective", "upgrade similarity to evidence"] }],
  ["responsibilities", ["Micro Brain responsibilities", "presentation responsibilities", "duties"],
    "Micro Brain may recognize domain vocabulary, rank analytical intents and chart families, suggest narrative order, detect presentation redundancy and recommend abstention when evidence is insufficient.",
    ["rank candidates", "domain vocabulary", "narrative order", "presentation redundancy"],
    ["compute ledger truth", "write source data", "decide unsupported formula"],
    { advisoryKind:"self_charter", may:["recognize domain context", "rank presentation candidates", "suggest alternatives", "flag redundancy", "abstain"] }],
  ["prohibitions", ["Micro Brain prohibitions", "must not", "forbidden authority"],
    "Micro Brain must not invent numbers or metrics, authorize ungoverned aggregation or formulas, join unrelated sources, infer causality from correlation, hide evidence gaps, mutate itself from user data, or perform online self-training.",
    ["must not invent", "must not join", "must not self train", "must preserve evidence gaps"],
    ["hallucinated metric", "automatic online learning", "silent cross file join"],
    { advisoryKind:"self_charter", mustNot:["invent metrics or numbers", "authorize ungoverned aggregation or formula", "join unrelated sources", "infer causality from correlation", "hide evidence gaps", "self train from user data", "mutate runtime knowledge"] }],
  ["abstention", ["Micro Brain abstention", "say unavailable", "insufficient evidence"],
    "When required evidence, grain, unit, time basis or entity identity is missing or contradictory, Micro Brain should abstain and explain what evidence is needed instead of manufacturing a chart story.",
    ["missing evidence", "contradictory evidence", "needs field", "cannot support"],
    ["fill missing data", "guess grain", "assume entity identity"],
    { advisoryKind:"self_charter", must:["preserve uncertainty", "name missing evidence"], abstainWhen:["required evidence is missing", "entity identity is ambiguous", "grain or unit conflicts", "time basis is incompatible"] }],
  ["runtime_discipline", ["Micro Brain runtime discipline", "offline deterministic", "no online learning"],
    "Bundled and signed Micro Brain knowledge is versioned, deterministic, local-first and read-only at runtime; user data may be queried but must not silently retrain or mutate the knowledge pack.",
    ["offline", "deterministic", "versioned pack", "read only runtime"],
    ["background model download without policy", "silent retraining", "user data mutation"],
    { advisoryKind:"self_charter", must:["operate deterministically", "remain local first", "use versioned validated knowledge"], mustNot:["silently retrain from user data", "mutate validated knowledge at runtime"] }],
];
for (const [id,labels,def,pos,neg,presentation] of charter) cards.push(card(`charter_${id}`, labels, def, pos, neg, presentation));

const chartPatterns = [
  ["number",["single_value","target_attainment"],["one governed scalar measure"],"A number card emphasizes one governed value; add delta or sparkline only when a valid comparison or time series exists."],
  ["sparkline",["trend"],["ordered time field","numeric measure"],"A sparkline shows compact direction next to a KPI and should not replace a full chart when precise comparison matters."],
  ["line",["trend","period_comparison"],["ordered time field","numeric measure"],"Use line charts for continuous or ordered temporal trends with compatible units and a meaningful sequence."],
  ["area",["trend","balance_flow"],["ordered time field","numeric measure"],"Area charts support cumulative or magnitude-focused time trends when filled area does not imply a false part-to-whole relationship."],
  ["column",["category_comparison","period_comparison"],["categorical or discrete time dimension","numeric measure"],"Columns compare a modest number of categories or discrete periods when vertical labels remain readable."],
  ["bar",["category_comparison","ranking"],["categorical dimension","numeric measure"],"Horizontal bars are preferred for ranked categories, long labels and operational comparisons."],
  ["grouped_bar",["category_comparison","period_comparison"],["categorical dimension","small series dimension","numeric measure"],"Grouped bars compare a small number of series across categories without implying composition."],
  ["stacked_bar",["composition","category_comparison"],["category dimension","series dimension","numeric measure"],"Stacked bars show category totals and their components when absolute contribution matters."],
  ["stacked_column",["composition_over_time"],["ordered time field","series dimension","numeric measure"],"Stacked columns show changing absolute composition across discrete periods."],
  ["normalized_stacked",["composition","composition_over_time"],["dimension","part measure","complete or explicitly scoped denominator"],"Use 100 percent stacking only when the denominator is valid and the parts represent the intended whole."],
  ["combo_bar_line",["target_attainment","relationship","period_comparison"],["shared ordered dimension","two compatible analytical measures"],"Bar-line combo is useful for amount plus rate or actual plus target when axes and units are explicit."],
  ["donut",["composition"],["low cardinality exhaustive categories","valid part-to-whole measure"],"Donut is conditional: only for a small, understandable set of parts with a trustworthy whole; prefer bars for precise comparison."],
  ["waterfall",["contribution","variance","balance_flow"],["ordered signed contributions","reconciled start or end value"],"Waterfall explains additive positive and negative contributions or bridges between reconciled values."],
  ["histogram",["distribution","aging","process_time"],["numeric observations","meaningful bins"],"Histogram reveals distribution shape, age bands, lead time or duration without ranking individual records."],
  ["box_plot",["distribution","quality_control"],["numeric observations","grouping dimension optional"],"Box plots compare distributions and outliers across groups when users can interpret quartiles."],
  ["scatter",["relationship"],["two numeric measures at compatible grain"],"Scatter plots explore association between two numeric measures at the same entity grain; association is not causation."],
  ["bubble",["relationship","risk_concentration"],["two numeric measures","size measure","entity grain"],"Bubble charts add a third magnitude to a scatter only when the size encoding is meaningful and not visually overwhelming."],
  ["heatmap",["anomaly_scan","capacity_utilization","quality_control"],["two discrete dimensions","numeric intensity measure"],"Heatmaps reveal dense patterns across two discrete dimensions such as hour by weekday, machine by shift or region by period."],
  ["cohort_heatmap",["cohort_retention"],["cohort key","period since cohort","retention or activity measure"],"Cohort heatmaps show retention or behavior by cohort and elapsed period when cohort identity is trustworthy."],
  ["funnel",["funnel"],["ordered process stages","comparable population basis"],"Funnels show attrition through ordered stages only when stage definitions and population basis are consistent."],
  ["pareto",["pareto","risk_concentration"],["ranked categories","numeric contribution"],"Pareto combines descending contribution with cumulative share to expose concentration and priority candidates."],
  ["bullet",["target_attainment","variance"],["actual measure","target or benchmark"],"Bullet charts compare actual against target compactly without decorative gauges."],
  ["diverging_bar",["variance","period_comparison"],["signed or centered measure","comparison dimension"],"Diverging bars emphasize values around a meaningful zero, baseline or benchmark."],
  ["calendar_heatmap",["trend","anomaly_scan"],["daily date grain","numeric measure"],"Calendar heatmaps show daily seasonality and gaps across long ranges when exact daily values are secondary."],
  ["map",["geospatial"],["validated geographic dimension","numeric or categorical encoding"],"Maps are appropriate only when geography materially answers the question and locations are valid; never use maps as decoration."],
  ["sankey",["flow"],["validated source nodes","validated target nodes","flow measure"],"Sankey diagrams require genuine source-to-target flow records; similar labels across files are not enough to create a flow."],
  ["table",["evidence_detail","ranking"],["record or grouped evidence"],"Tables are the default for precise evidence, many attributes and drill-down where graphical encoding would hide detail."],
  ["timeline",["schedule","process_time"],["event timestamp or interval","entity or status"],"Timelines show ordered events, intervals or milestones when temporal sequence is the analytical object."],
  ["control_chart",["quality_control","anomaly_scan"],["ordered measurements","validated control limits or governed baseline"],"Control charts support process stability analysis only when limits or baselines are governed rather than guessed."],
  ["small_multiples",["trend","category_comparison"],["shared measure and axes","moderate facet dimension"],"Small multiples compare repeated patterns across entities while preserving a common visual grammar."],
  ["radar",["category_comparison"],["same-scale comparable dimensions","small dimension count"],"Radar is highly conditional and only suitable for a small set of comparable dimensions on a common normalized scale; bars are usually clearer."],
];
for (const [name,intents,evidence,definition] of chartPatterns) {
  cards.push(card(`chart_${name}`, [name.replaceAll("_"," "), `${name.replaceAll("_"," ")} chart`, ...intents.map(x=>x.replaceAll("_"," "))], definition,
    [...intents.map(x=>`intent ${x}`), ...evidence], ["missing required evidence", "chart chosen only for visual variety"],
    { advisoryKind:"chart_pattern", analyticalIntents:intents, chartFamilies:[name], evidenceRequirements:evidence,
      constraints:["chart selection must pass deterministic evidence validation", "chart diversity is not a goal"] }));
}

const domains = [
  ["finance_accounting",["cash flow","accounting","finance"],["balance_flow","variance","aging","trend","contribution","evidence_detail"],["line","waterfall","diverging_bar","bar","table"]],
  ["sales_revenue",["sales","revenue","commercial"],["trend","ranking","contribution","composition","target_attainment"],["line","bar","waterfall","stacked_bar","bullet"]],
  ["retail_ecommerce",["retail","ecommerce","commerce"],["trend","ranking","composition_over_time","funnel","cohort_retention"],["line","bar","stacked_column","funnel","cohort_heatmap"]],
  ["inventory_warehouse",["inventory","warehouse","stock"],["aging","ranking","distribution","risk_concentration","anomaly_scan"],["bar","histogram","pareto","heatmap","scatter"]],
  ["procurement_supply_chain",["procurement","purchasing","supply chain"],["trend","ranking","process_time","variance","risk_concentration"],["line","bar","histogram","diverging_bar","pareto"]],
  ["logistics_transportation",["logistics","transportation","delivery"],["trend","process_time","ranking","geospatial","anomaly_scan"],["line","histogram","bar","map","heatmap"]],
  ["manufacturing",["manufacturing","production","factory"],["trend","quality_control","pareto","capacity_utilization","target_attainment"],["line","control_chart","pareto","heatmap","bullet"]],
  ["quality",["quality","qa","quality control"],["quality_control","distribution","pareto","anomaly_scan"],["control_chart","box_plot","pareto","histogram"]],
  ["maintenance_asset",["maintenance","asset management","equipment"],["trend","process_time","pareto","schedule","risk_concentration"],["line","histogram","pareto","timeline","bar"]],
  ["customer_crm_support",["crm","customer support","customer service"],["trend","funnel","process_time","ranking","distribution"],["line","funnel","histogram","bar","box_plot"]],
  ["marketing_growth",["marketing","growth","acquisition"],["trend","funnel","target_attainment","relationship","ranking"],["combo_bar_line","funnel","line","scatter","bar"]],
  ["hr_workforce",["hr","workforce","people"],["trend","distribution","composition","process_time","risk_concentration"],["line","histogram","stacked_bar","bar","heatmap"]],
  ["project_professional_services",["project","professional services","consulting"],["target_attainment","schedule","capacity_utilization","variance","trend"],["bullet","timeline","heatmap","diverging_bar","line"]],
  ["saas_subscription",["saas","subscription","recurring revenue"],["trend","cohort_retention","funnel","composition","risk_concentration"],["line","cohort_heatmap","funnel","stacked_bar","pareto"]],
  ["hospitality_hotel",["hospitality","hotel","booking"],["trend","target_attainment","composition","ranking","distribution"],["combo_bar_line","line","stacked_bar","bar","histogram"]],
  ["food_beverage_restaurant",["restaurant","food and beverage","f&b"],["trend","ranking","distribution","anomaly_scan","composition"],["line","bar","histogram","heatmap","stacked_bar"]],
  ["healthcare_pharma",["healthcare","pharma","clinic"],["process_time","capacity_utilization","trend","distribution","evidence_detail"],["histogram","heatmap","line","box_plot","table"]],
  ["education",["education","school","learning"],["trend","distribution","cohort_retention","ranking","target_attainment"],["line","histogram","cohort_heatmap","bar","bullet"]],
  ["banking_financial_services",["banking","financial services","bank"],["trend","risk_concentration","funnel","distribution","evidence_detail"],["line","pareto","funnel","histogram","table"]],
  ["insurance",["insurance","claims","policy"],["trend","distribution","process_time","risk_concentration","composition"],["line","histogram","box_plot","pareto","stacked_bar"]],
  ["real_estate_property",["real estate","property","leasing"],["trend","geospatial","ranking","distribution","capacity_utilization"],["line","map","bar","histogram","heatmap"]],
  ["construction",["construction","site","project construction"],["schedule","variance","target_attainment","trend","risk_concentration"],["timeline","diverging_bar","bullet","line","pareto"]],
  ["agriculture",["agriculture","farm","crop"],["trend","relationship","anomaly_scan","geospatial","distribution"],["line","scatter","heatmap","map","histogram"]],
  ["utilities_energy",["utilities","energy","power"],["trend","capacity_utilization","anomaly_scan","distribution","geospatial"],["line","heatmap","calendar_heatmap","histogram","map"]],
  ["telecom",["telecom","network operator","subscriber"],["trend","risk_concentration","geospatial","anomaly_scan","ranking"],["line","pareto","map","heatmap","bar"]],
  ["media_content",["media","content","publisher"],["trend","ranking","funnel","cohort_retention","composition"],["line","bar","funnel","cohort_heatmap","stacked_bar"]],
  ["nonprofit",["nonprofit","ngo","donation"],["trend","contribution","target_attainment","composition","evidence_detail"],["line","waterfall","bullet","stacked_bar","table"]],
  ["public_sector",["public sector","government","public service"],["trend","process_time","target_attainment","geospatial","evidence_detail"],["line","histogram","bullet","map","table"]],
  ["iot_industrial_telemetry",["iot","telemetry","sensor"],["trend","anomaly_scan","quality_control","capacity_utilization","relationship"],["line","control_chart","heatmap","scatter","small_multiples"]],
  ["laboratory_scientific",["laboratory","scientific","experiment"],["distribution","relationship","quality_control","trend","evidence_detail"],["scatter","box_plot","control_chart","line","table"]],
  ["cybersecurity_it_ops",["cybersecurity","it operations","observability"],["trend","anomaly_scan","risk_concentration","distribution","process_time"],["line","heatmap","pareto","histogram","timeline"]],
  ["travel_aviation",["travel","aviation","airline"],["trend","capacity_utilization","process_time","geospatial","ranking"],["line","heatmap","histogram","map","bar"]],
];
for (const [id,labels,intents,charts] of domains) {
  cards.push(card(`domain_${id}`, labels, `Domain profile for ${labels[0]} prioritizes analytical intents and chart families that commonly answer operational questions, subject to actual schema, governed metrics and the selected user perspective.`,
    [...labels, ...intents.map(x=>x.replaceAll("_"," ")), ...charts.map(x=>`${x.replaceAll("_"," ")} chart`)],
    ["generic dashboard regardless of domain", "decorative chart selection", "unsupported domain assumption"],
    { advisoryKind:"domain_profile", analyticalIntents:intents, chartFamilies:charts,
      constraints:["user selected perspective overrides default domain emphasis", "domain preference never authorizes a metric"] }, [id,"presentation_intelligence"]));
}

const perspectives = [
  ["executive",["executive","ceo","owner"],["single_value","trend","variance","risk_concentration","contribution"],["overview","drivers","risk","evidence"]],
  ["finance",["finance view","cfo","accounting view"],["balance_flow","variance","aging","trend","evidence_detail"],["cash","profitability","working capital","evidence"]],
  ["sales",["sales view","sales manager"],["trend","ranking","target_attainment","funnel","contribution"],["performance","drivers","pipeline","evidence"]],
  ["marketing",["marketing view","growth view"],["trend","funnel","relationship","ranking","target_attainment"],["acquisition","conversion","efficiency","evidence"]],
  ["operations",["operations view","coo"],["trend","process_time","capacity_utilization","anomaly_scan","variance"],["throughput","service level","bottleneck","evidence"]],
  ["inventory",["inventory view","warehouse view"],["aging","ranking","risk_concentration","distribution","anomaly_scan"],["stock health","aging","concentration","evidence"]],
  ["procurement",["procurement view","buyer view"],["ranking","process_time","variance","risk_concentration","trend"],["supplier","lead time","cost","evidence"]],
  ["customer_service",["customer service view","support view"],["process_time","trend","distribution","ranking","funnel"],["demand","response","resolution","evidence"]],
  ["people",["people view","hr view"],["trend","distribution","composition","process_time","risk_concentration"],["workforce","movement","capacity","evidence"]],
  ["project",["project view","delivery manager"],["schedule","variance","target_attainment","capacity_utilization","risk_concentration"],["progress","schedule","capacity","risk"]],
  ["risk_compliance",["risk view","compliance view"],["risk_concentration","anomaly_scan","variance","evidence_detail","trend"],["exposure","exceptions","control","evidence"]],
  ["analyst",["analyst view","data analyst"],["distribution","relationship","trend","evidence_detail","anomaly_scan"],["shape","relationship","exceptions","evidence"]],
];
for (const [id,labels,intents,roles] of perspectives) cards.push(card(`perspective_${id}`, labels,
  `${labels[0]} prioritizes a domain-aware analytical narrative for that decision context while preserving the same governed evidence.`,
  [...intents.map(x=>x.replaceAll("_"," ")), ...roles], ["override governed metric", "hide conflicting evidence"],
  { advisoryKind:"perspective_profile", analyticalIntents:intents, dashboardRoles:roles, perspectives:[id], priorities:roles }));

cards.push(card("narrative_overview_drivers_risk_evidence", ["dashboard narrative", "overview drivers risk evidence", "analysis story"],
  "A default analytical dashboard should progress from what is happening, to where or what drives it, to meaningful risk or exceptions, and finally to evidence detail; omit stages that lack evidence rather than filling them with generic charts.",
  ["what is happening", "main drivers", "risk and exceptions", "evidence detail"], ["widget wall", "random chart order", "duplicate chart story"],
  { advisoryKind:"dashboard_narrative", dashboardRoles:["overview","drivers","risk","evidence"], priorities:["answer before decoration", "avoid duplicate analytical questions", "preserve drill down"] }));

const antiPatterns = [
  ["chart_diversity", "Chart diversity is not a success metric. Repeating the same chart family is correct when distinct analytical questions require it; never add donut, radar or map merely to look varied."],
  ["card_everywhere", "Do not turn every metric and chart into a boxed card. Prefer a coherent analytical canvas, whitespace, hierarchy and thin separators unless a card has a real interaction or grouping role."],
  ["unsupported_map", "A map requires valid geographic evidence and a geographic question; place names, labels or decorative geographic context alone are insufficient."],
  ["unsupported_donut", "A donut requires low cardinality and a valid part-to-whole denominator; otherwise use a bar or table."],
  ["unsupported_radar", "Radar requires comparable same-scale dimensions and a small dimension count; otherwise prefer bars or small multiples."],
];
for (const [id,definition] of antiPatterns) cards.push(card(`anti_${id}`, [id.replaceAll("_"," "), "presentation anti pattern"], definition,
  ["avoid misleading visual", "prefer evidence driven chart"], ["visual novelty", "decorative dashboard"],
  { advisoryKind:"anti_pattern", must:[definition], mustNot:["choose a chart for decoration alone"] }));

cards.sort((a,b)=>a.id.localeCompare(b.id));
fs.mkdirSync(OUT_DIR, { recursive:true });
const fileName = "presentation.semantic.v1.json";
fs.writeFileSync(path.join(OUT_DIR,fileName), `${JSON.stringify(cards,null,2)}\n`);
const manifest = {
  schemaVersion:"lightbi.micro-brain.corpus.v1",
  corpusId:"lightbi.micro-brain.presentation.v1",
  version:"1.0.0",
  maturityLabel:"bounded-presentation-advisory",
  description:"Domain-aware chart grammar, perspectives, dashboard narrative and constitutional boundaries for Micro Brain presentation intelligence.",
  files:[fileName],
};
fs.writeFileSync(path.join(OUT_DIR,"manifest.v1.json"), `${JSON.stringify(manifest,null,2)}\n`);
console.log(JSON.stringify({cards:cards.length, domains:domains.length, chartPatterns:chartPatterns.length, perspectives:perspectives.length, charter:charter.length, output:path.relative(ROOT,OUT_DIR)},null,2));
