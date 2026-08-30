import { useEffect, useMemo, useRef, useState } from 'react';
import { ExecutionRunCoordinator } from '@lightbi/runtime';
import type { AnalysisAction } from '../lib/analysis-opportunity-actions';
import type { ChartPreviewModel } from '../lib/chart-preview-model';
import {
  executeDrillThrough,
  type DrillThroughPoint,
  type DrillThroughResult,
} from '../lib/drill-through-export';
import type { RuntimeDatasetSource, RuntimeRowScope } from '../lib/runtime-dataset-source';
import type { RuntimePlanPreview } from '../lib/runtime-planner-preview';

export type InvestigationDrillOrigin = {
  analysisAction: AnalysisAction;
  runtimePlan: RuntimePlanPreview;
  chartModel: ChartPreviewModel;
};

export function useInvestigationDrillThrough(input: {
  datasetId: string;
  rows: Record<string, unknown>[];
  runtimeDatasetSource?: RuntimeDatasetSource;
  rowScope?: RuntimeRowScope;
  fieldBindings?: Array<{ canonicalId: string; physicalColumn?: string; label?: string; role?: string; confidence?: number }>;
}) {
  const [drillResult, setDrillResult] = useState<DrillThroughResult | null>(null);
  const [drillOrigin, setDrillOrigin] = useState<InvestigationDrillOrigin | null>(null);
  const [selectedDrillRows, setSelectedDrillRows] = useState<Set<number>>(new Set());
  const [isDrilling, setIsDrilling] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);
  const runs = useRef(new ExecutionRunCoordinator('simple-drill-through'));

  useEffect(() => () => runs.current.cancel(), []);

  const runDrillThrough = async (point: DrillThroughPoint, origin: InvestigationDrillOrigin) => {
    const run = runs.current.begin();
    setDrillOrigin(origin);
    setIsDrilling(true);
    setDrillError(null);
    setDrillResult(null);
    setSelectedDrillRows(new Set());
    try {
      const result = await executeDrillThrough({
        runtimePlan: origin.runtimePlan,
        point,
        rows: input.rows,
        runtimeDatasetSource: input.runtimeDatasetSource,
        rowScope: input.rowScope,
        fieldBindings: input.fieldBindings,
        limit: 50_000,
        signal: run.signal,
      });
      if (!runs.current.isCurrent(run)) return;
      if (result.status === 'failed') {
        setDrillError(result.errorMessage || 'Unable to load matching rows.');
        return;
      }
      setDrillResult(result);
      setSelectedDrillRows(new Set(result.rows.map((_, index) => index)));
    } catch (error) {
      if (runs.current.isCurrent(run) && !(error instanceof DOMException && error.name === 'AbortError')) {
        setDrillError(error instanceof Error ? error.message : 'Unable to load matching rows.');
      }
    } finally {
      if (runs.current.finish(run)) setIsDrilling(false);
    }
  };

  const closeDrillThrough = () => {
    runs.current.cancel();
    setIsDrilling(false);
    setDrillError(null);
    setDrillResult(null);
    setDrillOrigin(null);
    setSelectedDrillRows(new Set());
  };

  const selectedRows = useMemo(
    () => drillResult ? drillResult.rows.filter((_, index) => selectedDrillRows.has(index)) : [],
    [drillResult, selectedDrillRows],
  );
  const drillExportBaseName = drillResult
    ? `${input.datasetId}_${drillResult.point.dimensionField}_${drillResult.point.label}`
      .replace(/[^a-z0-9_-]+/gi, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 90) || 'lightbi_filtered_rows'
    : 'lightbi_filtered_rows';

  return {
    closeDrillThrough,
    drillError,
    drillExportBaseName,
    drillOrigin,
    drillResult,
    isDrilling,
    runDrillThrough,
    selectedDrillRows,
    selectedRows,
    setSelectedDrillRows,
  };
}
