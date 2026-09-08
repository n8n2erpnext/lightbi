import React, { useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import { ArrowLeft, CheckCircle2, ChevronRight, Download, FileImage, FileText, LayoutDashboard, Lightbulb, Search, ShieldCheck, Sparkles } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { useNavigate } from "react-router-dom";
import { useAppRuntime } from "@lightbi/runtime";
import type { DomainComparisonBrief } from "../../lib/ba-comparison-engine";
import type { AISemanticField } from "../../lib/ai-briefing-contract";
import { createSingleSourceBAOverview, sampleSingleSourceBARows } from "../../lib/single-source-ba-overview";
import { BusinessComparisonBriefCard } from "./BusinessComparisonBriefCard";
import { SelectedSubjectInvestigationBoard } from "../investigation/SelectedSubjectInvestigationBoard";
import { buildSelectedSubjectInvestigationPlan } from "../../lib/selected-subject-investigation";
import { useDisplayPreferences } from "../../stores/display-preferences-store";
import { formatValue } from "../../lib/display-formatter";
import { createAnalysisWorkbookPlan, saveExcelAnalysisWorkbook, type AnalysisWorkbookPlanV1 } from "../../lib/analysis-workbook";
import { createDecisionVisualizationPlan, type DecisionVisualizationPlanV1 } from "../../lib/decision-visualization-plan";
import { createDashboardCompositionPlan, type DashboardCompositionCandidateV1 } from "../../lib/dashboard-composition-plan";
import { adviseDashboardComposition } from "../../lib/dashboard-composition-advice";
import { createDashboardBreakdownVisualizationPlan, createExecutiveDashboardInformationBudget, dashboardAdvisoryRoles, dashboardDecisionVisualizationMetadata, persistedDashboardChartType } from "../../lib/dashboard-composition-writer";
import { useAnalysisExportStore } from "../../stores/analysis-export-store";
import { useUiLanguage } from "../../lib/ui-language";
import { saveBlobWithUserChoice, saveDataUrlWithUserChoice } from "../../lib/native-capabilities";
import { filterRowsForMultiSourceFocus, type MultiSourceFocusSourceBindingV1, type MultiSourceFocusSubjectSelectionV1 } from "../../lib/multisource-focus-subject";

type Row = Record<string, string | number>;

export interface PerspectiveCollectionEvidenceSource {
  period: string;
  role: string;
  sourceId?: string;
  sourceName: string;
  sourceRowCount: number;
  rows: Record<string, unknown>[];
  semanticFields: AISemanticField[];
  focusBinding?: MultiSourceFocusSourceBindingV1 | null;
}

type ChartSelection = { period: string; metricId: string };
type CollectionAnalysisView = 'decision_workspace' | 'evidence_drill' | 'deep_perspective' | 'deep_selected';

function rolesForMetric(metricId: string): string[] {
  if (metricId === "sales_revenue") return ["sales"];
  if (metricId === "delivery_count") return ["logistics"];
  if (metricId === "gross_profit") return ["sales", "accounting"];
  return [];
}

function selectedMeasure(metricId: string, role: string, fields: AISemanticField[]): string {
  if (metricId === "delivery_count") return "record_count";
  const preferred = metricId === "gross_profit" && role === "accounting"
    ? /cost|expense|purchase|payable|debit/i
    : /revenue|sales|amount|total|profit|margin/i;
  return fields.find(field => preferred.test(field.canonicalId))?.physicalColumn ?? "record_count";
}

function selectedDimensions(fields: AISemanticField[]): string[] {
  const useful = /customer|product|sku|category|brand|branch|territory|region|warehouse|salesperson|employee|driver|route|status|channel|payment/i;
  return [...new Set(fields
    .filter(field => useful.test(field.canonicalId) && typeof field.physicalColumn === "string")
    .map(field => field.physicalColumn as string))].slice(0, 4);
}

const metricLabel = (value: string) =>
  value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

export const PerspectiveCollectionResultCard: React.FC<{
  perspectiveId: string;
  rows: Row[];
  sourceCount: number;
  deepDiveBrief?: DomainComparisonBrief | null;
  focusDeepDiveBrief?: DomainComparisonBrief | null;
  focusSubject?: MultiSourceFocusSubjectSelectionV1 | null;
  evidenceSources?: PerspectiveCollectionEvidenceSource[];
}> = ({ perspectiveId, rows, sourceCount, deepDiveBrief, focusDeepDiveBrief, focusSubject = null, evidenceSources = [] }) => {
  const [analysisView, setAnalysisView] = useState<CollectionAnalysisView>('decision_workspace');
  const [chartSelection, setChartSelection] = useState<ChartSelection | null>(null);
  const [activeEvidenceIndex, setActiveEvidenceIndex] = useState(0);
  const [exportState, setExportState] = useState<"idle" | "image" | "pdf" | "excel">("idle");
  const [exportError, setExportError] = useState("");
  const deepExportRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const createDashboard = useAppRuntime(state => state.createDashboard);
  const createChart = useAppRuntime(state => state.createChart);
  const setAnalysisExportPlan = useAnalysisExportStore(state => state.setPlan);
  const addChartToDashboard = useAppRuntime(state => state.addChartToDashboard);
  const preferences = useDisplayPreferences((state) => state.preferences);
  const { t } = useUiLanguage();
  const effectiveDeepDiveBrief = focusSubject ? focusDeepDiveBrief ?? null : deepDiveBrief ?? null;
  const rowsForEvidence = (source: PerspectiveCollectionEvidenceSource) =>
    filterRowsForMultiSourceFocus(source.rows, focusSubject, source.focusBinding);
  const displayMetricLabel = (metricId: string) => {
    const english = metricLabel(metricId);
    return t(english);
  };
  const displayPerspectiveLabel = t(
    metricLabel(perspectiveId),
  );
  const formatMetric = (metricId: string, value: number) => formatValue(
    value,
    /(revenue|profit|cost|amount|margin)/i.test(metricId) ? "currency" : "number",
    preferences,
    { compact: true },
  );
  if (rows.length === 0) return null;
  const metricIds = [...new Set(rows.flatMap((row) =>
    Object.keys(row).filter((key) => key !== "reporting_period")))];
  const distinctPeriodCount = new Set(rows.map(row => String(row.reporting_period ?? ''))).size;
  const hasPeriodComparison = distinctPeriodCount >= 2;
  const baseDecisionVisualizationPlan = createDecisionVisualizationPlan({
    perspectiveId, rows, sourceCount, dimensionField: 'reporting_period', metricIds,
    analyticalIntent: hasPeriodComparison ? 'trend' : 'category_comparison',
    availableRoles: hasPeriodComparison
      ? ['ordered_time','measure', ...(metricIds.length > 1 ? ['series' as const] : [])]
      : ['category','measure', ...(metricIds.length > 1 ? ['series' as const] : [])],
    cardinality: { points: rows.length, categories: distinctPeriodCount, series: metricIds.length },
    requiredSurfaces: ['preview','persistence','dashboard'],
    sourceRefs: evidenceSources.map(source => ({
      sourceId: source.sourceId ?? null, sourceName: source.sourceName, role: source.role, period: source.period, sourceRowCount: source.sourceRowCount,
    })),
  });
  const movements = metricIds.map((metricId) => {
    const first = Number(rows[0]?.[metricId] ?? 0);
    const last = Number(rows[rows.length - 1]?.[metricId] ?? 0);
    const delta = last - first;
    return {
      metricId,
      first,
      last,
      delta,
      percent: first === 0 ? null : delta / Math.abs(first),
    };
  });
  const largestMovement = hasPeriodComparison
    ? [...movements].sort((left, right) => Math.abs(right.percent ?? 0) - Math.abs(left.percent ?? 0))[0]
    : movements[0];
  const firstPeriod = String(rows[0]?.reporting_period ?? "the first period");
  const lastPeriod = String(rows[rows.length - 1]?.reporting_period ?? "the latest period");
  const questions = largestMovement
    ? hasPeriodComparison
      ? [
        t(`What drove the change in ${displayMetricLabel(largestMovement.metricId)} from ${firstPeriod} to ${lastPeriod}?`),
        t(`Break down ${displayMetricLabel(largestMovement.metricId)} by the most useful business dimensions.`),
        t(`Which segments should I investigate first for ${displayMetricLabel(largestMovement.metricId)}?`),
      ]
      : [
        t(`What explains the composition of ${displayMetricLabel(largestMovement.metricId)} in ${firstPeriod}?`),
        t(`Break down ${displayMetricLabel(largestMovement.metricId)} by the most useful business dimensions.`),
        t(`Which segments should I investigate first for ${displayMetricLabel(largestMovement.metricId)}?`),
      ]
    : [];
  const option = {
    animation: false,
    tooltip: { trigger: "axis" },
    legend: { bottom: 0, textStyle: { color: "#475569" } },
    grid: { left: 70, right: 28, top: 25, bottom: 58 },
    xAxis: {
      type: "category",
      data: baseDecisionVisualizationPlan.result.rows.map((row) => String(row[baseDecisionVisualizationPlan.result.dimensionField] ?? '')),
      axisLabel: { color: "#475569" },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "#64748b", formatter: (value: number) => formatMetric(largestMovement?.metricId ?? "", value) },
      splitLine: { lineStyle: { color: "#e2e8f0" } },
    },
    series: metricIds.map((metricId, index) => ({
      name: displayMetricLabel(metricId),
      type: baseDecisionVisualizationPlan.primaryVisualization.type,
      smooth: baseDecisionVisualizationPlan.primaryVisualization.type === 'line',
      symbolSize: baseDecisionVisualizationPlan.primaryVisualization.type === 'line' ? 8 : undefined,
      barMaxWidth: baseDecisionVisualizationPlan.primaryVisualization.type === 'line' ? undefined : 56,
      data: rows.map((row) => Number(row[metricId] ?? 0)),
      lineStyle: { width: 3 },
      itemStyle: { color: ["#2563eb", "#059669", "#d97706"][index % 3] },
    })),
  };
  const selectedEvidence = useMemo(() => {
    if (!chartSelection) return [];
    const roles = rolesForMetric(chartSelection.metricId);
    return evidenceSources.filter(source => source.period === chartSelection.period && (roles.length === 0 || roles.includes(source.role)));
  }, [chartSelection, evidenceSources]);
  const activeEvidence = selectedEvidence[Math.min(activeEvidenceIndex, Math.max(0, selectedEvidence.length - 1))];
  const subsetOverviews = useMemo(() => {
    if (!chartSelection || analysisView !== 'deep_selected') return [];
    return selectedEvidence.flatMap(source => {
      const scopedRows = rowsForEvidence(source);
      if (scopedRows.length === 0) return [];
      const overview = createSingleSourceBAOverview(sampleSingleSourceBARows(scopedRows, 1000), {
        sourceRowCount: focusSubject ? scopedRows.length : source.sourceRowCount,
        selectedPerspective: perspectiveId,
        semanticFields: source.semanticFields,
        analysisAction: {
          id: `collection_subset_${source.role}_${chartSelection.metricId}`,
          label: `${displayMetricLabel(chartSelection.metricId)} · ${source.role} · ${chartSelection.period}`,
          dimensions: selectedDimensions(source.semanticFields),
          measures: [selectedMeasure(chartSelection.metricId, source.role, source.semanticFields)],
        },
      });
      return overview ? [{ source, overview }] : [];
    });
  }, [analysisView, chartSelection, displayMetricLabel, focusSubject, perspectiveId, selectedEvidence]);
  const selectedSubjectInvestigationPlan = useMemo(() => {
    if (!chartSelection || analysisView !== 'deep_selected' || subsetOverviews.length === 0) return null;
    return buildSelectedSubjectInvestigationPlan({
      dimensionField: 'reporting_period',
      label: chartSelection.period,
      period: chartSelection.period,
      metricId: chartSelection.metricId,
      focusLabel: focusSubject?.displayLabel ?? null,
    }, subsetOverviews.map(({ source, overview }) => {
      const selectedRows = rowsForEvidence(source).length;
      const availableRows = source.rows.length;
      return {
        sourceKey: `${source.period}:${source.role}:${source.sourceName}`,
        sourceName: source.sourceName,
        role: source.role,
        selectedRowCount: selectedRows,
        matchedRowCount: focusSubject ? selectedRows : availableRows,
        referenceRowCount: source.sourceRowCount,
        referenceScope: 'source_rows' as const,
        isTruncated: availableRows < source.sourceRowCount,
        overview,
      };
    }), { perspectiveId });
  }, [analysisView, chartSelection, focusSubject?.displayLabel, perspectiveId, subsetOverviews]);
  const previewRows = activeEvidence ? rowsForEvidence(activeEvidence).slice(0, 100) : [];
  const previewColumns = [...new Set(previewRows.flatMap(row => Object.keys(row)))].slice(0, 12);
  const exportFileStem = `${displayPerspectiveLabel}${chartSelection ? `-${chartSelection.period}-${displayMetricLabel(chartSelection.metricId)}` : ""}`
    .replace(/[\\/:*?"<>|]+/g, "-").slice(0, 100) || "LightBI-multifile-BA";

  const renderAnalysisImage = async () => {
    if (!deepExportRef.current) throw new Error(t("The analysis is not ready to export."));
    return toPng(deepExportRef.current, { backgroundColor: "#fbfbfa", cacheBust: true, pixelRatio: 2 });
  };
  const exportImage = async () => {
    setExportState("image"); setExportError("");
    try {
      const dataUrl = await renderAnalysisImage();
      await saveDataUrlWithUserChoice(dataUrl, { suggestedName: `${exportFileStem}-BA.png`, description: "PNG image", extensions: ["png"] });
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : t("Could not export the image.")); }
    finally { setExportState("idle"); }
  };
  const exportPdf = async () => {
    setExportState("pdf"); setExportError("");
    try {
      const dataUrl = await renderAnalysisImage();
      const image = new Image(); image.src = dataUrl; await image.decode();
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      const margin = 8; const pageWidth = pdf.internal.pageSize.getWidth(); const pageHeight = pdf.internal.pageSize.getHeight();
      const width = pageWidth - margin * 2; const height = image.height * width / image.width; const printable = pageHeight - margin * 2;
      for (let offset = 0, page = 0; offset < height; offset += printable, page += 1) {
        if (page > 0) pdf.addPage();
        pdf.addImage(dataUrl, "PNG", margin, margin - offset, width, height, undefined, "FAST");
      }
      await saveBlobWithUserChoice(pdf.output("blob"), { suggestedName: `${exportFileStem}-BA.pdf`, description: "PDF document", extensions: ["pdf"] });
    } catch (cause) { setExportError(cause instanceof Error ? cause.message : t("Could not export the PDF.")); }
    finally { setExportState("idle"); }
  };

  const buildDecisionVisualizationPlan = (): DecisionVisualizationPlanV1 => {
    const scopedEvidence = chartSelection ? selectedEvidence : evidenceSources;
    const selected = Boolean(chartSelection);
    return createDecisionVisualizationPlan({
      perspectiveId, rows, sourceCount, dimensionField: 'reporting_period',
      metricIds: selected && chartSelection ? [chartSelection.metricId] : metricIds,
      selectedScope: chartSelection ? { dimensionField: 'reporting_period', dimensionValue: chartSelection.period, metricId: chartSelection.metricId } : null,
      analyticalIntent: selected ? 'category_comparison' : hasPeriodComparison ? 'trend' : 'category_comparison',
      availableRoles: selected
        ? ['category','measure']
        : hasPeriodComparison
          ? ['ordered_time','measure', ...(metricIds.length > 1 ? ['series' as const] : [])]
          : ['category','measure', ...(metricIds.length > 1 ? ['series' as const] : [])],
      cardinality: selected
        ? { points: 1, categories: 1, series: 1 }
        : { points: rows.length, categories: distinctPeriodCount, series: metricIds.length },
      requiredSurfaces: ['preview','persistence','dashboard'],
      sourceRefs: scopedEvidence.map(source => ({
        sourceId: source.sourceId ?? null, sourceName: source.sourceName, role: source.role, period: source.period, sourceRowCount: source.sourceRowCount,
      })),
    });
  };

  const buildExcelAnalysisPlan = (): AnalysisWorkbookPlanV1 => {
    const scopedEvidence = chartSelection ? selectedEvidence : evidenceSources;
    const decisionVisualizationPlan = buildDecisionVisualizationPlan();
    return createAnalysisWorkbookPlan({
      title: displayPerspectiveLabel,
      perspectiveId,
      sourceCount,
      summaryRows: rows,
      selectedScope: chartSelection ? { ...chartSelection } : null,
      decisionVisualizationPlan,
      evidenceSources: scopedEvidence.flatMap(source => {
        const evidenceRows = rowsForEvidence(source);
        if (focusSubject && evidenceRows.length === 0) return [];
        return [{
          sourceName: source.sourceName, role: source.role, period: source.period,
          sourceRowCount: focusSubject ? evidenceRows.length : source.sourceRowCount, rows: evidenceRows,
        }];
      }),
      findings: effectiveDeepDiveBrief?.narrativeSections.flatMap(section => [section.summary, ...section.bullets]) ?? [],
      recommendedActions: effectiveDeepDiveBrief?.reasonCodes.map(reason => reason.statement) ?? [],
      caveats: effectiveDeepDiveBrief?.caveats ?? [],
      notes: [
        t('Analysis summary rows are governed LightBI metric results.'),
        t('Source evidence is kept in separate sheets; LightBI does not blindly join unrelated raw rows.'),
        ...(focusSubject ? [t(`Focus Subject: ${focusSubject.displayLabel}. Evidence sheets contain only exact matched rows; summary metrics remain full-population governed results.`)] : []),
      ],
    });
  };

  const exportExcelAnalysis = async () => {
    setExportState("excel"); setExportError("");
    try { await saveExcelAnalysisWorkbook(buildExcelAnalysisPlan()); }
    catch (cause) { setExportError(cause instanceof Error ? cause.message : t("Could not export the Excel analysis workbook.")); }
    finally { setExportState("idle"); }
  };

  const openCleanExportWithAnalysis = () => {
    setAnalysisExportPlan(buildExcelAnalysisPlan());
    navigate('/datasets');
  };

  const createCollectionDashboard = () => {
    const visualizationPlan = buildDecisionVisualizationPlan();
    const scopedRows = visualizationPlan.result.rows as Row[];
    const scopedMetricIds = visualizationPlan.result.metricIds;
    const scopeSources = chartSelection ? selectedEvidence : evidenceSources;
    const overviewFindings = subsetOverviews.flatMap(item => item.overview.findings);
    const overviewActions = subsetOverviews.flatMap(item => item.overview.recommendedActions);
    const overviewLimitations = subsetOverviews.flatMap(item => item.overview.limitations);
    const domainId = effectiveDeepDiveBrief?.domainId
      ?? subsetOverviews[0]?.overview.investigation?.domain
      ?? subsetOverviews[0]?.overview.mode
      ?? null;
    const candidates: DashboardCompositionCandidateV1[] = [];
    const materializers = new Map<string, () => string>();
    const deepBACandidateId = 'narrative:deep_ba';
    const perspectiveBACandidateId = 'narrative:perspective_context';
    const evidenceScope = chartSelection ? 'selected_period' : 'full_source_metric_results';

    if (effectiveDeepDiveBrief) {
      candidates.push({
        id: deepBACandidateId,
        managementQuestion: `What is the evidence-backed decision answer for ${displayPerspectiveLabel}?`,
        semanticRole: 'primary_answer', artifactKind: 'narrative', evidenceBacked: true,
        evidenceRefs: [`domain-comparison:${effectiveDeepDiveBrief.domainId}:${perspectiveId}`], decisionImportance: 97,
        advisoryRoles: dashboardAdvisoryRoles('primary_answer', [effectiveDeepDiveBrief.domainId, perspectiveId]),
        placementGroup: 'primary_canvas', reasonForInclusion: 'Keeps the evidence-backed comparison answer ahead of supporting visual detail.',
      });
    }

    candidates.push({
      id: perspectiveBACandidateId,
      managementQuestion: `What governed source scope and supporting context back ${displayPerspectiveLabel}?`,
      semanticRole: 'primary_answer', artifactKind: 'narrative', evidenceBacked: scopeSources.length > 0,
      evidenceRefs: scopeSources.map(source => `source:${source.sourceName}:${source.role}:${source.period}`),
      decisionImportance: 86,
      advisoryRoles: dashboardAdvisoryRoles('primary_answer', [domainId ?? '', perspectiveId, ...scopeSources.map(source => source.role)]),
      placementGroup: 'primary_canvas', reasonForInclusion: 'Preserves source scope, findings, actions and limitations without merging unrelated raw rows.',
    });

    const primaryCandidateId = 'visual:primary';
    const primaryMeasure = scopedMetricIds[0] ?? 'record_count';
    candidates.push({
      id: primaryCandidateId,
      managementQuestion: `How does ${displayMetricLabel(primaryMeasure)} vary across the governed reporting scope?`,
      semanticRole: 'primary_answer', artifactKind: 'visual', evidenceBacked: scopedRows.length > 0,
      evidenceRefs: [`decision-visualization:${visualizationPlan.planId}`, ...scopeSources.map(source => `source:${source.sourceName}:${source.role}:${source.period}`)],
      decisionImportance: 94,
      analysisShape: { dimension: visualizationPlan.result.dimensionField, measure: primaryMeasure },
      advisoryRoles: dashboardAdvisoryRoles('primary_answer', [domainId ?? '', perspectiveId, visualizationPlan.visualizationPlan.analyticalIntent]),
      visualizationPlanId: visualizationPlan.visualizationPlan.planId,
      placementGroup: 'primary_canvas', reasonForInclusion: 'Primary governed visual for the selected multi-source perspective and reporting scope.',
    });
    materializers.set(primaryCandidateId, () => createChart({
      projectId: 'proj-1', datasetId: `multifile:${perspectiveId}`, name: displayPerspectiveLabel,
      type: persistedDashboardChartType(visualizationPlan),
      xAxis: [{ columnName: visualizationPlan.primaryVisualization.xField }],
      yAxis: scopedMetricIds.map(columnName => ({ columnName, aggregation: 'None' as const })), filters: {},
      formatting: { lightbiData: {
        source: 'multifile_perspective_dashboard', perspective: displayPerspectiveLabel,
        chartType: visualizationPlan.primaryVisualization.type,
        xField: visualizationPlan.primaryVisualization.xField, yField: scopedMetricIds[0], seriesFields: scopedMetricIds,
        rows: scopedRows, rowCount: scopedRows.length, governed: true, evidenceScope,
        decisionVisualizationPlan: dashboardDecisionVisualizationMetadata(visualizationPlan), savedAt: new Date().toISOString(),
      } },
    }));

    const latest = scopedRows[scopedRows.length - 1];
    scopedMetricIds.forEach((metricId, index) => {
      const value = Number(latest?.[metricId]);
      if (!Number.isFinite(value)) return;
      const candidateId = `metric:${metricId}`;
      candidates.push({
        id: candidateId,
        managementQuestion: index === 0 ? `What is the current governed ${displayMetricLabel(metricId)}?` : `What supporting value does ${displayMetricLabel(metricId)} add?`,
        semanticRole: index === 0 ? 'hero_metric' : 'context_metric', artifactKind: 'metric', evidenceBacked: true,
        evidenceRefs: [`governed-metric:${metricId}:${chartSelection?.period ?? 'all-periods'}`], decisionImportance: 100 - index,
        advisoryRoles: dashboardAdvisoryRoles(index === 0 ? 'hero_metric' : 'context_metric', [metricId, domainId ?? '']),
        placementGroup: index === 0 ? 'hero' : 'support_band', reasonForInclusion: index === 0 ? 'Primary governed metric for this dashboard scope.' : 'Bounded supporting metric for the same governed scope.',
      });
      materializers.set(candidateId, () => createChart({
        projectId: 'proj-1', datasetId: `multifile:${perspectiveId}`, name: displayMetricLabel(metricId), type: 'Number', xAxis: [],
        yAxis: [{ columnName: 'value', aggregation: 'None' }], filters: {},
        formatting: { lightbiData: { source: 'multifile_perspective_dashboard_kpi', perspective: displayPerspectiveLabel, valueKind: /(revenue|profit|cost|amount|margin)/i.test(metricId) ? 'money' : 'number', yField: 'value', seriesFields: ['value'], rows: [{ value }], rowCount: 1, governed: true, evidenceScope, savedAt: new Date().toISOString() } },
      }));
    });

    subsetOverviews.flatMap(item => item.overview.breakdowns.map(breakdown => ({ source: item.source, overview: item.overview, breakdown }))).forEach(({ source, overview, breakdown }, index) => {
      if (!breakdown.top.length) return;
      const breakdownRows = breakdown.top.slice(0, 10).map(item => ({ label: item.label, value: item.value, share: item.share, row_count: item.rowCount }));
      const decisionPlan = createDashboardBreakdownVisualizationPlan({ perspectiveId, sourceCount: 1, rows: breakdownRows });
      const candidateId = `visual:breakdown:${source.period}:${source.role}:${source.sourceName}:${breakdown.id}`;
      candidates.push({
        id: candidateId,
        managementQuestion: `Which ${breakdown.label} groups have the highest observed values in ${source.role} evidence?`,
        semanticRole: 'ranked_driver', artifactKind: 'visual', evidenceBacked: true,
        evidenceRefs: [`source:${source.sourceName}:${source.role}:${source.period}`, `breakdown:${breakdown.id}`], decisionImportance: 72 - index,
        analysisShape: { dimension: breakdown.physicalColumn, measure: overview.bindings.selectedMeasure ?? chartSelection?.metricId ?? primaryMeasure },
        advisoryRoles: dashboardAdvisoryRoles('ranked_driver', [domainId ?? '', source.role, breakdown.physicalColumn, breakdown.label]),
        visualizationPlanId: decisionPlan.visualizationPlan.planId,
        placementGroup: 'supporting', reasonForInclusion: 'Adds a distinct source-bound ranked driver only when composition and visualization gates both pass.',
      });
      materializers.set(candidateId, () => createChart({
        projectId: 'proj-1', datasetId: `multifile:${perspectiveId}`, name: `${breakdown.label} · ${source.role}`,
        type: persistedDashboardChartType(decisionPlan), xAxis: [{ columnName: 'label' }],
        yAxis: [{ columnName: 'value', aggregation: 'None' }], filters: {},
        formatting: { lightbiData: {
          source: 'multifile_selected_scope_ba_breakdown', perspective: displayPerspectiveLabel,
          valueKind: breakdown.valueKind, xField: 'label', yField: 'value', seriesFields: ['value'],
          rows: breakdownRows, rowCount: breakdownRows.length, governed: false,
          evidenceScope: 'representative_selected_source', physicalColumn: breakdown.physicalColumn,
          sourceName: source.sourceName, sourceRole: source.role,
          decisionVisualizationPlan: dashboardDecisionVisualizationMetadata(decisionPlan), savedAt: new Date().toISOString(),
        } },
      }));
    });

    const advice = adviseDashboardComposition({
      domainId, perspectiveId,
      userQuestion: effectiveDeepDiveBrief?.businessQuestion ?? displayPerspectiveLabel,
      semanticSignals: [...scopedMetricIds, ...scopeSources.map(source => source.role), ...subsetOverviews.flatMap(item => Object.keys(item.overview.bindings))],
      availableRoles: candidates.flatMap(candidate => candidate.advisoryRoles ?? []),
    });
    const compositionPlan = createDashboardCompositionPlan({
      candidates,
      informationBudget: createExecutiveDashboardInformationBudget(candidates),
      decisionPerspective: perspectiveId,
      audience: null,
      domainId,
      advisoryRoleOrder: advice.roleOrder,
    });
    const admitted = new Set(compositionPlan.items.map(item => item.candidateId));

    const dashboardId = createDashboard(`${displayPerspectiveLabel}${chartSelection ? ` · ${chartSelection.period}` : ''}`, {
      source: 'easy_mode_perspective',
      datasetId: `multifile:${perspectiveId}`,
      perspective: displayPerspectiveLabel,
      governed: true,
      multiSource: true,
      evidenceScope: chartSelection ? 'governed_selected_period_source_evidence' : 'full_source_metric_results',
      generatedAt: new Date().toISOString(),
      decisionVisualizationPlan: { schemaVersion: visualizationPlan.schemaVersion, planId: visualizationPlan.planId, governance: visualizationPlan.governance },
      dashboardCompositionPlan: compositionPlan,
      dashboardCompositionAdvice: advice,
      selectedScope: chartSelection ? { period: chartSelection.period, metricId: chartSelection.metricId, sources: scopeSources.map(source => ({ role: source.role, sourceName: source.sourceName, sourceRowCount: source.sourceRowCount, focusMatchedRowCount: focusSubject ? rowsForEvidence(source).length : undefined })) } : null,
      focusSubject: focusSubject ? { canonicalId: focusSubject.canonicalId, value: focusSubject.value, displayLabel: focusSubject.displayLabel } : null,
      deepBA: effectiveDeepDiveBrief && admitted.has(deepBACandidateId) ? {
        executiveSummary: effectiveDeepDiveBrief.headline,
        dataTrustScore: effectiveDeepDiveBrief.trustScore,
        decisionReadinessScore: effectiveDeepDiveBrief.decisionReadinessScore,
        insights: effectiveDeepDiveBrief.narrativeSections.map(section => ({ id: section.id, title: section.title, statement: section.summary, severity: section.severity, evidence: section.bullets })),
        caveats: effectiveDeepDiveBrief.caveats,
      } : null,
      perspectiveBA: admitted.has(perspectiveBACandidateId) ? {
        analysisLabel: chartSelection ? `${displayMetricLabel(chartSelection.metricId)} · ${chartSelection.period}` : displayPerspectiveLabel,
        sourceRowCount: scopeSources.reduce((sum, source) => sum + (focusSubject ? rowsForEvidence(source).length : source.sourceRowCount), 0),
        isRepresentativeSample: subsetOverviews.some(item => item.overview.isRepresentativeSample),
        findings: overviewFindings,
        recommendedActions: overviewActions,
        limitations: overviewLimitations,
      } : null,
    });
    for (const item of compositionPlan.items) {
      const materialize = materializers.get(item.candidateId);
      if (!materialize) continue;
      addChartToDashboard(dashboardId, materialize());
    }
    navigate(`/dashboards/${dashboardId}`);
  };

  const renderCollectionActionBar = (includeDeepExport: boolean) => (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-white px-5 py-3 md:px-6">
      <span className="mr-auto inline-flex items-center gap-2 text-xs text-slate-500"><Download className="h-4 w-4" />{t('Export this perspective analysis')}</span>
      <button type="button" onClick={openCleanExportWithAnalysis} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"><Sparkles className="h-4 w-4" />{t('Clean and export sources')}</button>
      <button data-testid="collection-export-excel-analysis" type="button" onClick={() => void exportExcelAnalysis()} disabled={exportState !== 'idle'} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Download className="h-4 w-4" />{exportState === 'excel' ? t('Exporting…') : t('Export Excel analysis')}</button>
      {includeDeepExport && <><button data-testid="collection-deep-export-image" type="button" onClick={() => void exportImage()} disabled={exportState !== 'idle'} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><FileImage className="h-4 w-4" />{exportState === 'image' ? t('Exporting…') : t('Export image')}</button>
      <button data-testid="collection-deep-export-pdf" type="button" onClick={() => void exportPdf()} disabled={exportState !== 'idle'} className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><FileText className="h-4 w-4" />{exportState === 'pdf' ? t('Exporting…') : t('Export PDF')}</button></>}
      <button data-testid="collection-create-dashboard" type="button" onClick={createCollectionDashboard} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white"><LayoutDashboard className="h-4 w-4" />{t('Create perspective dashboard')}</button>
    </div>
  );

  if (analysisView === 'evidence_drill' && chartSelection) {
    return (
      <section data-testid="perspective-collection-result" className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
        <div data-testid="collection-evidence-drill-surface" className="bg-white">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-slate-950 px-5 py-5 text-white md:px-6">
            <div className="flex items-start gap-3">
              <button data-testid="collection-evidence-back" type="button" onClick={() => setAnalysisView('decision_workspace')} className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"><ArrowLeft className="h-4 w-4" />{t('Back')}</button>
              <div><div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-300"><Search className="h-4 w-4" />{t('Evidence drill')}</div><h3 className="mt-1 text-lg font-semibold">{chartSelection.period} · {displayMetricLabel(chartSelection.metricId)}</h3><p className="mt-1 text-xs leading-5 text-slate-300">{displayPerspectiveLabel} · {t('Governed source evidence remains separated by source.')}</p></div>
            </div>
            {focusSubject && <span data-testid="collection-focus-badge" className="rounded-full border border-violet-300/30 bg-violet-300/10 px-3 py-1.5 text-[10px] font-semibold text-violet-100">Focus: {focusSubject.displayLabel}</span>}
          </div>
          <div data-testid="collection-chart-drill" className="p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-700">{t('Selected evidence scope')}</p><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">{t('LightBI keeps each governed source separate and bounds the investigation to the period and metric selected on the chart.')}</p></div>
              <button type="button" disabled={selectedEvidence.every(source => rowsForEvidence(source).length === 0)} onClick={() => setAnalysisView('deep_selected')} className="rounded-lg bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{t('Investigate selected evidence')}</button>
            </div>
            {selectedEvidence.length === 0 ? <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{t('No source-bound row evidence is available for this chart point.')}</p> : <>
              <div className="mt-4 flex flex-wrap gap-2">{selectedEvidence.map((source, index) => <button key={`${source.period}:${source.role}:${source.sourceName}`} type="button" data-testid={`collection-evidence-source-${index}`} aria-pressed={index === activeEvidenceIndex} onClick={() => setActiveEvidenceIndex(index)} className={`rounded-lg border px-3 py-2 text-xs font-medium ${index === activeEvidenceIndex ? 'border-blue-500 bg-white text-blue-800' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>{t(source.role)} · {source.sourceName} · {source.sourceRowCount.toLocaleString(preferences.locale)} {t('rows')}{focusSubject ? ` · ${rowsForEvidence(source).length} focus match${rowsForEvidence(source).length === 1 ? '' : 'es'}` : ''}</button>)}</div>
              {activeEvidence && focusSubject && previewRows.length === 0 && <p data-testid="collection-focus-unavailable" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">This source has no exact evidence for the selected Focus Subject. LightBI will not infer a cross-source identity match.</p>}
              {activeEvidence && previewRows.length > 0 && <div className="mt-4 max-h-[420px] overflow-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-full text-left text-[11px]"><thead className="sticky top-0 bg-slate-50 text-slate-500"><tr>{previewColumns.map(column => <th key={column} className="whitespace-nowrap border-b border-slate-200 px-3 py-2 font-semibold">{column}</th>)}</tr></thead><tbody>{previewRows.map((row, rowIndex) => <tr key={rowIndex} className="border-b border-slate-100 last:border-0">{previewColumns.map(column => <td key={column} className="max-w-[240px] truncate whitespace-nowrap px-3 py-2 text-slate-700">{String(row[column] ?? '')}</td>)}</tr>)}</tbody></table><p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">{t(focusSubject ? 'Preview shows the first 100 exact Focus Subject matches; the investigation uses that exact matched row scope. The source chip keeps the full source-row count visible.' : 'Preview shows the first 100 selected rows; the investigation keeps the full source-row scope disclosed.')}</p></div>}
            </>}
          </div>
          {renderCollectionActionBar(false)}
          {exportError && <p role="alert" className="border-t border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700 md:px-6">{exportError}</p>}
        </div>
      </section>
    );
  }

  if (analysisView === 'deep_selected' && chartSelection) {
    return (
      <section data-testid="perspective-collection-result" className="bg-white">
        <div data-testid="collection-deep-selected-surface" data-layout="focused-investigation">
          <header className="flex items-start gap-3 border-y border-[var(--lb-divider)] px-5 py-4 md:px-6"><button data-testid="collection-deep-selected-back" type="button" onClick={() => setAnalysisView('evidence_drill')} className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/60 hover:bg-black/[0.035]"><ArrowLeft className="h-4 w-4" />{t('Back')}</button><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">{t('Selected-subject investigation')}</p><h3 className="mt-1 text-lg font-semibold text-slate-950">{chartSelection.period} · {displayMetricLabel(chartSelection.metricId)}</h3><p className="mt-1 max-w-4xl text-xs leading-5 text-slate-500">{t('This surface investigates only the selected evidence scope; source evidence remains separate and the governed summary remains unchanged.')}</p></div></header>
          {renderCollectionActionBar(true)}
          {exportError && <p role="alert" className="border-t border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700 md:px-6">{exportError}</p>}
          <div ref={deepExportRef} data-testid="collection-deep-analysis-export-surface" data-layout="focused-investigation" className="px-5 py-4 md:px-6">
            <div data-testid="collection-subset-deep-ba">
              {selectedSubjectInvestigationPlan ? <SelectedSubjectInvestigationBoard plan={selectedSubjectInvestigationPlan} sourceOverviews={subsetOverviews.map(({ source, overview }) => ({ sourceKey: `${source.period}:${source.role}:${source.sourceName}`, overview }))} preferences={preferences} /> : <p className="border-y border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">{t('No eligible selected evidence is available for this investigation.')}</p>}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (analysisView === 'deep_perspective' && effectiveDeepDiveBrief) {
    return (
      <section data-testid="perspective-collection-result" data-layout="management-document" className="bg-white">
        <div data-testid="collection-deep-perspective-surface" data-layout="management-document">
          <header className="flex items-start gap-3 border-y border-[var(--lb-divider)] px-5 py-4 md:px-6"><button data-testid="collection-deep-perspective-back" type="button" onClick={() => setAnalysisView('decision_workspace')} className="mt-0.5 inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/60 hover:bg-black/[0.035]"><ArrowLeft className="h-4 w-4" />{t('Back')}</button><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">{t('Deep analysis')}</p><h3 className="mt-1 text-lg font-semibold text-slate-950">{displayPerspectiveLabel}</h3><p className="mt-1 max-w-4xl text-xs leading-5 text-slate-500">{t(focusSubject ? 'Driver rankings use only exact Focus Subject matches from governed source evidence; the summary remains the full population.' : 'Driver rankings use the complete period sources behind this governed result. Observations remain separated from unsupported causal claims.')}</p></div></header>
          {renderCollectionActionBar(true)}
          {exportError && <p role="alert" className="border-t border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700 md:px-6">{exportError}</p>}
          <div ref={deepExportRef} data-testid="collection-deep-analysis-export-surface" data-layout="management-document" className="px-5 py-4 md:px-6"><div data-testid="governed-ba-deep-dive"><BusinessComparisonBriefCard brief={effectiveDeepDiveBrief} /></div></div>
        </div>
      </section>
    );
  }

  return (
    <section data-testid="perspective-collection-result" data-layout="answer-first-canvas" className="bg-white">
      <header className="border-y border-[var(--lb-divider)] px-5 py-4 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700"><CheckCircle2 className="h-4 w-4" />{t('Analysis ready')}</div>
            <h3 className="mt-1 text-[19px] font-semibold text-slate-950">{displayPerspectiveLabel}</h3>
            <p className="mt-1 text-[12px] text-slate-500">{t(`LightBI analyzed ${sourceCount} complete source${sourceCount === 1 ? '' : 's'} across ${rows.length} reporting period${rows.length === 1 ? '' : 's'}.`)}</p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {focusSubject && <span data-testid="collection-focus-badge" className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-semibold text-violet-700">Focus: {focusSubject.displayLabel}</span>}
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-700">{t('Full-file governed')}</span>
          </div>
        </div>
      </header>

      <div data-testid="collection-decision-workspace" data-layout="answer-first-canvas" className="space-y-5 px-5 py-5 md:px-6">
        <section data-testid="collection-main-answer" className="border-b border-[var(--lb-divider)] pb-4">
          <div className="flex items-center gap-2 text-amber-800"><Lightbulb className="h-4 w-4" /><p className="text-[11px] font-semibold uppercase tracking-wide">{t('Key attention')}</p></div>
          <p className="mt-2 max-w-4xl text-[13px] leading-6 text-slate-700">
            {largestMovement
              ? hasPeriodComparison
                ? t(`${displayMetricLabel(largestMovement.metricId)} has the largest relative movement (${Math.abs((largestMovement.percent ?? 0) * 100).toFixed(1)}%). This is the strongest place to begin; it is an observation, not yet a cause.`)
                : t(`This view contains one reporting period (${firstPeriod}), so period movement cannot be calculated. Select a metric to inspect its governed source evidence and run Deep BA Step 2.`)
              : t('No measurable period movement was found. Review mix, segments, and data coverage before drawing a conclusion.')}
          </p>
        </section>

        {largestMovement && <section data-testid="collection-key-number" className="border-b border-[var(--lb-divider)] pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{displayMetricLabel(largestMovement.metricId)}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{formatMetric(largestMovement.metricId, largestMovement.last)}</p>
          <p className="mt-1 text-[11px] text-slate-500">{hasPeriodComparison ? <>{largestMovement.delta >= 0 ? '+' : '−'}{formatMetric(largestMovement.metricId, Math.abs(largestMovement.delta))}{largestMovement.percent === null ? '' : ` (${Math.abs(largestMovement.percent * 100).toFixed(1)}%)`} {t('vs first period')}</> : t('Single-period snapshot')}</p>
        </section>}

        <section data-testid="collection-primary-visual" className="min-w-0">
          <div className="min-h-[430px] rounded-xl border border-slate-100 bg-slate-50/40 p-3">
            <ReactECharts option={option} style={{ height: '390px', width: '100%' }} notMerge onEvents={{ click: (params: { dataIndex?: number; seriesIndex?: number }) => { const dataIndex = Number(params.dataIndex); const seriesIndex = Number(params.seriesIndex); if (!Number.isInteger(dataIndex) || !Number.isInteger(seriesIndex) || !metricIds[seriesIndex]) return; setChartSelection({ period: String(rows[dataIndex]?.reporting_period ?? ''), metricId: metricIds[seriesIndex] }); setActiveEvidenceIndex(0); setAnalysisView('evidence_drill'); } }} />
            <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label={t('Select a chart point to inspect evidence')}>
              {rows.flatMap(row => metricIds.map(metricId => { const period = String(row.reporting_period ?? ''); const active = chartSelection?.period === period && chartSelection.metricId === metricId; return <button key={`${period}:${metricId}`} type="button" data-testid={`collection-chart-point-${period}-${metricId}`} onClick={() => { setChartSelection({ period, metricId }); setActiveEvidenceIndex(0); setAnalysisView('evidence_drill'); }} className={`rounded-md border px-2 py-1 text-[10px] font-medium ${active ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300'}`}>{period} · {displayMetricLabel(metricId)}</button>; }))}
            </div>
          </div>
        </section>

        {questions.length > 0 && <section data-testid="collection-explanation" className="border-t border-[var(--lb-divider)] pt-4">
          <div className="space-y-1">{questions.map(question => <button key={question} type="button" onClick={() => { if (effectiveDeepDiveBrief) { setChartSelection(null); setAnalysisView('deep_perspective'); return; } if (!hasPeriodComparison && largestMovement) { setChartSelection({ period: firstPeriod, metricId: largestMovement.metricId }); setActiveEvidenceIndex(0); setAnalysisView('evidence_drill'); } }} disabled={!effectiveDeepDiveBrief && (hasPeriodComparison || !largestMovement || evidenceSources.length === 0)} className="flex w-full items-center justify-between gap-3 border-b border-[var(--lb-divider)] px-1 py-2.5 text-left text-[12px] font-medium leading-5 text-slate-700 transition last:border-b-0 hover:bg-black/[0.025] disabled:cursor-default"><span>{question}</span><ChevronRight className="h-3.5 w-3.5 shrink-0 text-amber-600" /></button>)}</div>
        </section>}

        {movements.length > 1 && <section data-testid="collection-supporting-metrics" className="border-t border-[var(--lb-divider)] pt-4">
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
            {movements.filter(movement => movement.metricId !== largestMovement?.metricId).map(movement => <div key={movement.metricId} className="flex items-baseline justify-between gap-4 border-b border-[var(--lb-divider)] pb-2 text-xs"><span className="font-medium text-slate-600">{displayMetricLabel(movement.metricId)}</span><span className="font-semibold text-slate-900">{formatMetric(movement.metricId, movement.last)}</span></div>)}
          </div>
        </section>}

        <section data-testid="collection-next-action" className="border-t border-[var(--lb-divider)] pt-3">{renderCollectionActionBar(false)}</section>

        <details data-testid="collection-evidence-details" className="border-t border-[var(--lb-divider)] pt-4 text-xs text-slate-600">
          <summary className="cursor-pointer font-semibold text-slate-800">{t('Full-file governed')}</summary>
          <div className="mt-3 flex items-start gap-2 leading-5 text-blue-800"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />{t(focusSubject ? 'Summary metrics remain full-population governed results. Focus scopes only source evidence and Deep BA where an exact entity match exists.' : 'Results were computed per governed source relationship and period. LightBI combined metrics, not unrelated raw rows.')}</div>
        </details>
        {exportError && <p role="alert" className="border-t border-red-100 bg-red-50 px-5 py-2 text-xs text-red-700 md:px-6">{exportError}</p>}
      </div>
    </section>
  );
};
