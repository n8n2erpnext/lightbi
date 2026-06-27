import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, BarChart3, ChevronDown, ChevronRight, Activity, Code2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getCurrentInvestigationSession } from '../lib/investigation-session';
import { isDataQualityReviewAction } from '../lib/understanding-next/action-adapter';
import { createSafeSqlPreview } from '../lib/safe-sql-preview';
import { executeDuckDBPreviewSandbox, type DuckDBPreviewResult } from '../lib/duckdb-preview-sandbox';
import { executeBackendPreview } from '../lib/backend-preview-executor';
import { createChartPreviewModel, type ChartPreviewModel } from '../lib/chart-preview-model';
import { ChartPreviewRenderer } from '../components/analysis/ChartPreviewRenderer';
import { validatePreviewAgainstIntent, type ResultValidationResult } from '../lib/result-validator-contract';
import { enhancePlanWithGuardedSum } from '../lib/guarded-sum-bridge';
import { useDisplayPreferences } from '../stores/display-preferences-store';
import { formatValue, inferSemanticType } from '../lib/display-formatter';
import { Settings } from 'lucide-react';
import { DisplayPreferencesModal } from '../components/settings/DisplayPreferencesModal';
import { DatasetInsightSummary } from '../components/analysis/DatasetInsightSummary';
import { BADecisionBriefPanel } from '../components/analysis/BADecisionBriefPanel';
import { createBADecisionBrief, createPreExecutionBADecisionBrief } from '../lib/ba-decision-engine';
import {
  createQueryResultBuffer,
  ExecutionRunCoordinator,
  queryResultBufferToRows
} from '@lightbi/runtime';

export const Investigation: React.FC = () => {
  const navigate = useNavigate();
  const session = getCurrentInvestigationSession();
  const { preferences } = useDisplayPreferences();
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [previewResult, setPreviewResult] = useState<DuckDBPreviewResult | null>(null);
  const [chartModel, setChartModel] = useState<ChartPreviewModel | null>(null);
  const [validationResult, setValidationResult] = useState<ResultValidationResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showAiContext, setShowAiContext] = useState(false);
  const executionRuns = useRef(new ExecutionRunCoordinator('simple-preview'));

  useEffect(() => () => executionRuns.current.cancel(), []);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center max-w-md w-full">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Active Session</h2>
          <p className="text-sm text-gray-500 mb-4">Please select an analysis from the Home page.</p>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const { analysisAction, runtimeIntent, runtimePlanPreview, rows, aiBriefing, runtimeDatasetSource, rowScope } = session;
  const readinessTier = aiBriefing?.readinessTier ?? 'exploratory_only';
  const isHighReadiness = readinessTier === 'production_ready' || readinessTier === 'decision_support';
  const isLowReadiness = readinessTier === 'exploratory_only';
  const readinessLabel = isHighReadiness
    ? 'High Readiness'
    : isLowReadiness
      ? 'Low Readiness (Exploratory Only)'
      : 'Moderate Readiness (Caution)';
  const readinessClass = isHighReadiness
    ? 'text-emerald-600'
    : isLowReadiness
      ? 'text-red-600'
      : 'text-amber-600';
  const readinessBannerClass = isLowReadiness
    ? 'bg-red-50 border-red-200 text-red-800'
    : 'bg-amber-50 border-amber-200 text-amber-800';
  const readinessIconClass = isLowReadiness ? 'text-red-500' : 'text-amber-500';
  const briefingRationale = aiBriefing?.caveats?.length
    ? aiBriefing.caveats.join(' ')
    : `Readiness score: ${aiBriefing?.readinessScore ?? 0}`;
  const safeActionHints = aiBriefing?.safeActionHints ?? [];
  const enhancedPlan = enhancePlanWithGuardedSum(runtimePlanPreview, rows || []);
  const safeSqlPreview = createSafeSqlPreview(enhancedPlan);
  const baDecisionBrief = previewResult
    ? createBADecisionBrief({
      datasetId: session.datasetId,
      previewResult,
      chartModel,
      aiBriefing,
      runtimeIntent
    })
    : createPreExecutionBADecisionBrief({
      datasetId: session.datasetId,
      rows,
      aiBriefing,
      runtimeIntent,
      rowScope
    });

  const handleRunPreview = async () => {
    const run = executionRuns.current.begin();
    setIsExecuting(true);
    setPreviewResult(null);
    setChartModel(null);
    setValidationResult(null);
    try {
      let result = await executeBackendPreview({
        runtimePlan: runtimePlanPreview,
        safeSqlPreview,
        rows: rows || [],
        runtimeDatasetSource,
        rowScope,
        signal: run.signal
      });

      if (!executionRuns.current.isCurrent(run)) return;

      const isInfraError = result.status === 'failed' && (
        result.errorMessage?.includes('NETWORK_UNAVAILABLE') || 
        result.errorMessage?.includes('LOCAL_EXECUTOR_UNAVAILABLE') ||
        result.errorMessage?.includes('DUCKDB_BOOTSTRAP_ERROR') ||
        result.errorMessage?.includes('DUCKDB_WORKER_ERROR') ||
        result.errorMessage?.includes('DUCKDB_MEMORY_ERROR')
      );
      const isMissingSourceWarning = result.status === 'blocked' && result.blockedReasons.some(r => r.includes('No active dataset source available') || r.includes('Only CSV current source is supported'));

      // Strict Sandbox Fallback Rule:
      // Only allow JS sandbox fallback if it is a missing source warning OR if it's an infrastructure error BUT the query is simple enough.
      // Complex intents like trend, group_by, relationship MUST fail transparently if the backend is dead.
      // Semantic errors like CANONICAL_PROJECTION_MISSING must NEVER fallback.
      const isSafeFallbackIntent = runtimeIntent.type === 'table_preview' || runtimeIntent.type === 'distribution';
      const needsFallback = isMissingSourceWarning || (isInfraError && isSafeFallbackIntent);

      if (needsFallback) {
        const fallbackResult = await executeDuckDBPreviewSandbox({
          runtimeIntent,
          runtimePlan: runtimePlanPreview,
          rows: rows || [],
          safeSqlPreview,
          signal: run.signal
        });
        fallbackResult.source = "js_sandbox_fallback";
        result = fallbackResult;
      }

      if (!executionRuns.current.isCurrent(run)) return;

      const validation = validatePreviewAgainstIntent(runtimeIntent, result);
      
      // Upgrade failure status based on boundary contract validation
      if (validation.status === 'failed' && result.status !== 'failed') {
        result.status = 'failed';
        result.errorMessage = "Validation boundary rejected the preview result due to insufficient quality or missing required data.";
      }
      if (result.rows.length === 0 && result.status === 'executed') {
        result.status = 'failed';
        result.errorMessage = "Execution completed but returned an empty dataset. Analysis unavailable.";
      }

      const resultBuffer = createQueryResultBuffer({
        runId: run.id,
        columns: result.columns,
        rows: result.rows,
        limit: result.maxRows,
        totalRowCount: result.rowCount,
        truncated: result.rowCount > result.rows.length
      });
      result = {
        ...result,
        columns: resultBuffer.columns.map(column => column.name),
        rows: queryResultBufferToRows(resultBuffer),
        resultBuffer
      };

      setPreviewResult(result);
      setValidationResult(validation);
      
      if (result.status !== 'failed') {
        const model = createChartPreviewModel({
          previewResult: result,
          runtimePlan: runtimePlanPreview,
          analysisLabel: analysisAction.opportunityName
        });
        setChartModel(model);
      } else {
        setChartModel(null);
      }
    } catch (error) {
      if (executionRuns.current.isCurrent(run) && !(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('Preview execution failed', error);
      }
    } finally {
      if (executionRuns.current.finish(run)) {
        setIsExecuting(false);
      }
    }
  };

  const isDataQualityReview = isDataQualityReviewAction(analysisAction);

  return (
    <div className="h-full min-h-0 overflow-y-auto flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button 
          onClick={() => navigate('/')}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500 hover:text-gray-900"
          title="Back to Home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-[15px] font-semibold text-gray-900 leading-tight">
            {analysisAction.opportunityName}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-medium text-gray-500">Dataset: {session.datasetId}</span>
            <span className="text-gray-300">•</span>
            <span className="text-[11px] font-medium px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded">
              {analysisAction.actionType}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500 hover:text-gray-900 flex items-center gap-2"
            title="Display Preferences"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium">Settings</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 pb-24 max-w-6xl mx-auto w-full flex flex-col gap-6">
        
        {/* Readiness Banner */}
        {aiBriefing && !isHighReadiness && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 ${readinessBannerClass}`}>
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${readinessIconClass}`} />
            <div>
              <h3 className="font-semibold text-sm">
                {readinessLabel}
              </h3>
              <p className="text-xs mt-1 opacity-90">{briefingRationale}</p>
            </div>
          </div>
        )}

        {/* AI Context Panel */}
        {aiBriefing && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden transition-all duration-300">
            <button 
              onClick={() => setShowAiContext(!showAiContext)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-0.5">AI Semantic Briefing</h3>
                  <p className="text-xs text-gray-500">Context, grain, and safe actions for execution</p>
                </div>
              </div>
              <div className="text-gray-400">
                {showAiContext ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>
            </button>
            
            {showAiContext && (
              <div className="p-6 pt-2 border-t border-gray-100 bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Grain & Trust</h4>
                    <div className="bg-white p-3 rounded border border-gray-200 text-sm mb-3">
                      <span className="font-semibold block mb-1">Grain: {aiBriefing.grain}</span>
                      <span className="text-gray-600">{aiBriefing.grainEvidence || 'No grain evidence recorded.'}</span>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200 text-sm">
                      <span className="font-semibold block mb-1">Readiness: <span className={readinessClass}>{readinessTier.toUpperCase()}</span></span>
                      <span className="text-gray-600">{briefingRationale}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Safe Actions</h4>
                    <ul className="space-y-2 mb-4">
                      {safeActionHints.length > 0 ? (
                        safeActionHints.map((action, i) => (
                          <li key={i} className="flex items-center text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                            <code className="bg-gray-100 px-1 rounded">{action}</code>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-500 bg-white p-2 rounded border border-gray-200">
                          No safe action hints recorded.
                        </li>
                      )}
                    </ul>
                    
                    {aiBriefing.caveats.length > 0 && (
                      <>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 mt-4">Caveats</h4>
                        <ul className="space-y-1">
                          {aiBriefing.caveats.map((c, i) => (
                            <li key={i} className="flex items-start text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mr-2 shrink-0 mt-0.5" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Primary Analysis Surface */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Analysis preview</h2>
              <p className="text-xs text-gray-500">LightBI has prepared this analysis. Execution will run in the next phase.</p>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 text-xs font-medium text-gray-700 rounded-md shadow-sm">
                <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                Expected chart: {runtimeIntent.expectedShape.replace('_', ' ')}
              </span>
            </div>
          </div>
          
          <div className="p-6 bg-white border-b border-gray-100">
             {isDataQualityReview ? (
               <div className="w-full mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg flex flex-col items-center justify-center text-amber-800 text-center">
                 <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
                 <span className="text-sm font-semibold">Data Quality Review Required</span>
                 <span className="text-xs text-amber-700 mt-1 max-w-md">
                   This dataset contains technical constraints or dirty signals (e.g. mixed types, formula errors, serial dates). Runtime execution is disabled until these are reviewed.
                 </span>
               </div>
             ) : (
               <div className="flex flex-wrap gap-4 mb-8">
                 <div className="flex flex-col gap-1.5">
                   <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Dimensions</span>
                   <div className="flex flex-wrap gap-2">
                     {runtimeIntent.dimensions.map(d => (
                       <span key={d} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs font-medium">
                         {d}
                       </span>
                     ))}
                   </div>
                 </div>
                 
                 <div className="flex flex-col gap-1.5">
                   <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Measures</span>
                   <div className="flex flex-wrap gap-2">
                     {[...runtimeIntent.measures, ...(runtimeIntent.derivedMeasures ?? []).flatMap(m => [m.numeratorLabel, m.denominatorLabel, m.label])].map(m => (
                       <span key={m} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-xs font-medium">
                         {m}
                       </span>
                     ))}
                   </div>
                 </div>
               </div>
             )}
             
             {/* Chart Placeholder / Renderer Area */}
             <div className="w-full mt-4">
               {previewResult?.status === 'failed' ? (
                 <div className="w-full h-64 bg-red-50/50 border-2 border-dashed border-red-200 rounded-lg flex flex-col items-center justify-center text-red-500 p-6 text-center">
                   <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
                   <span className="text-sm font-medium">Execution Failed</span>
                   <span className="text-xs text-red-400 mt-1">{previewResult.errorMessage || "Preview could not be rendered."}</span>
                 </div>
               ) : previewResult?.rows && previewResult.rows.length > 0 && runtimeIntent.expectedShape === 'table' ? (
                 <div className="space-y-5">
                   <DatasetInsightSummary columns={previewResult.columns} rows={previewResult.rows} rowCount={previewResult.rowCount} />
                   {chartModel && chartModel.chartType !== 'table' && (
                     <div className="border-t border-gray-100 pt-5">
                       <ChartPreviewRenderer model={chartModel} />
                     </div>
                   )}
                 </div>
               ) : chartModel && runtimeIntent.expectedShape !== 'table' ? (
                 <ChartPreviewRenderer model={chartModel} />
               ) : (
                 <div className="w-full h-64 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400">
                   <Activity className="w-8 h-8 text-slate-300 mb-2" />
                   <span className="text-sm font-medium">Ready to execute</span>
                 </div>
               )}
             </div>

             {baDecisionBrief && (
               <div className="mt-6">
                 <BADecisionBriefPanel brief={baDecisionBrief} />
               </div>
             )}
          </div>
          
          <div className="px-6 py-4 bg-slate-50 border-t border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Preview execution</h3>
              <button
                onClick={handleRunPreview}
                disabled={isExecuting || isDataQualityReview}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                title={isDataQualityReview ? "Execution disabled for Data Quality Review" : undefined}
              >
                {isExecuting ? 'Running...' : 'Run preview'}
              </button>
            </div>
            
            {!previewResult && !isExecuting && (
              <div className="text-xs text-slate-500 italic">
                Results not executed yet. Click "Run preview" to execute.
              </div>
            )}
            
            {previewResult && (
              <div className="flex flex-col gap-3">
                {previewResult.status === 'failed' && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-red-800 font-semibold">
                      <AlertTriangle className="w-5 h-5" />
                      Execution Failed
                    </div>
                    <p className="text-sm text-red-700">
                      {previewResult.errorMessage || "The engine could not process the analysis request."}
                    </p>
                    {validationResult?.warnings && validationResult.warnings.length > 0 && (
                      <ul className="list-disc pl-5 text-xs text-red-600 mt-2">
                        {validationResult.warnings.map(w => <li key={w}>{w}</li>)}
                      </ul>
                    )}
                  </div>
                )}
                
                {previewResult.source === 'js_sandbox_fallback' && previewResult.status !== 'failed' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-1 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">Degraded Execution Mode</h4>
                      <p className="text-xs text-amber-700 mt-1">
                        The backend execution pipeline is currently unavailable. This preview was generated using a constrained, in-browser sandbox fallback. Results may differ from full backend execution.
                      </p>
                    </div>
                  </div>
                )}
                
                {(() => {
                  const cleansingWarnings = previewResult.warnings.filter(w => w.includes('underwent silent cleansing'));
                  if (cleansingWarnings.length === 0) return null;
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-1 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-amber-800">Data Cleansing Active</h4>
                        <p className="text-xs text-amber-700 mt-1">
                          The system has applied the <strong>Safe Numeric Guard</strong>. Dirty strings were automatically stripped of invalid characters or skipped to prevent execution failure during aggregation.
                        </p>
                        <ul className="list-disc pl-4 mt-1.5 text-xs text-amber-700">
                          {cleansingWarnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-3 text-xs">
                  <span className={`px-2 py-0.5 rounded font-medium ${previewResult.status === 'executed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {previewResult.status.toUpperCase()}
                  </span>
                  <span className="text-slate-500">Row count: {previewResult.rowCount}</span>
                  {previewResult.executionScope && (
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                      {previewResult.executionScope === 'full_file'
                        ? 'Full file'
                        : previewResult.executionScope === 'semantic_sample'
                          ? 'Representative sample'
                          : previewResult.executionScope === 'retained_rows'
                            ? 'Retained rows'
                            : 'Preview rows'}
                    </span>
                  )}
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    Source: <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${previewResult.source === 'js_sandbox_fallback' ? 'bg-amber-100 text-amber-800 font-semibold' : 'bg-slate-100'}`}>{previewResult.source}</span>
                  </span>
                </div>
                


                {previewResult.rows.length > 0 && (
                  <details className="mt-4 mb-2 group">
                    <summary className="text-sm font-semibold text-gray-800 flex items-center gap-2 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden mb-2 hover:text-indigo-600 transition-colors">
                      <ChevronRight className="w-4 h-4 text-gray-500 group-open:rotate-90 transition-transform" />
                      <Database className="w-4 h-4 text-gray-500 group-hover:text-indigo-500" />
                      Raw rows evidence
                    </summary>
                    <div className="pl-6">
                      <p className="text-xs text-gray-500 mb-3">Scroll horizontally and vertically to inspect underlying raw data.</p>
                      <div className="max-h-[400px] overflow-auto border border-gray-200 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                      <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                        <tr>
                          {previewResult.columns.map(c => (
                            <th key={c} className="px-3 py-2 font-medium text-gray-500 uppercase tracking-wider bg-gray-50">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewResult.rows.map((row, i) => (
                          <tr key={i}>
                            {previewResult.columns.map(c => {
                              const semanticType = inferSemanticType(c, row[c]);
                              return (
                                <td key={c} className="px-3 py-2 text-gray-900 whitespace-nowrap">
                                  {formatValue(row[c], semanticType, preferences)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Developer Diagnostics Toggle */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mt-4 transition-all duration-300">
          <button 
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-0.5">
                  {showDiagnostics ? 'Hide developer diagnostics' : 'Show developer diagnostics'}
                </h3>
                <p className="text-xs text-gray-500">Runtime intent, logical plan and SQL preview.</p>
              </div>
            </div>
            <div className="text-gray-400">
              {showDiagnostics ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
          </button>
          
          {/* Developer Diagnostics Content */}
          {showDiagnostics && (
            <div className="bg-slate-900 border-t border-slate-800 p-0">
              <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Pipeline State</span>
                <div className="flex items-center gap-2">
                   <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${runtimeIntent.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                     Intent: {runtimeIntent.status}
                   </span>
                   <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${runtimePlanPreview.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                     Plan: {runtimePlanPreview.status}
                   </span>
                </div>
              </div>
              
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-[11px]">
                {/* Intent Column */}
                <div>
                  <h3 className="text-slate-500 mb-2 font-semibold">Runtime Intent</h3>
                  <div className="space-y-1 text-slate-300">
                    <p><span className="text-slate-500 w-20 inline-block">Type:</span> <span className="text-pink-400">{runtimeIntent.type}</span></p>
                    <p><span className="text-slate-500 w-20 inline-block">Shape:</span> <span className="text-emerald-400">{runtimeIntent.expectedShape}</span></p>
                  </div>
                </div>

                {/* Plan Column */}
                <div>
                  {previewResult?.warnings && previewResult.warnings.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-slate-500 mb-2 font-semibold">Execution Warnings</h3>
                      <div className="bg-amber-950/30 border border-amber-900/50 text-amber-500 p-3 rounded-lg text-xs">
                        <ul className="list-disc pl-4 space-y-1">
                          {previewResult.warnings.map((w, i) => {
                            if (w === "No dataset rows available for preview.") {
                              return <li key={i}>{w} Execution wiring will be completed when dataset rows are passed into the investigation session.</li>;
                            }
                            return <li key={i}>{w}</li>;
                          })}
                        </ul>
                      </div>
                    </div>
                  )}

                  <h3 className="text-slate-500 mb-2 font-semibold">Runtime Plan</h3>
                  <div className="space-y-1.5 text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/50 mb-4">
                    {runtimePlanPreview.logicalOperations.map((op, i) => {
                      let details = '';
                      if (op.type === 'scan') details = op.columns.join(', ');
                      if (op.type === 'group_by') details = `${op.dimensions.join(', ')} / ${op.measures.join(', ')}`;
                      if (op.type === 'trend') details = `${op.timeDimension} / ${op.measures.join(', ')}`;
                      if (op.type === 'distribution') details = op.dimension;
                      if (op.type === 'relationship') details = op.measures.join(', ');
                      if (op.type === 'limit') details = op.rows.toString();
                      return (
                        <div key={i} className="flex">
                          <span className="text-pink-400 w-24 flex-shrink-0">{op.type}:</span>
                          <span className="text-slate-100">{details}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Safe SQL Preview */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-slate-500 font-semibold">Safe SQL Preview</h3>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${safeSqlPreview.status === 'ready' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {safeSqlPreview.status}
                    </span>
                  </div>
                  
                  {safeSqlPreview.status === 'blocked' && (
                    <div className="bg-red-950/50 border border-red-900/50 rounded-lg p-3 text-red-400 mb-2">
                      <p className="font-semibold mb-1">Blocked Reasons:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {safeSqlPreview.blockedReasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}

                  {safeSqlPreview.sql && (
                    <div className="relative group">
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                          {safeSqlPreview.dialect}
                        </span>
                      </div>
                      <pre className="bg-slate-950 text-slate-300 p-3 rounded-lg border border-slate-800/50 overflow-x-auto whitespace-pre font-mono text-[10px] leading-relaxed">
                        {safeSqlPreview.sql}
                      </pre>
                      <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1.5">
                        <Database className="w-3 h-3" />
                        SQL Preview only. Not executed yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </main>
      
      <DisplayPreferencesModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
