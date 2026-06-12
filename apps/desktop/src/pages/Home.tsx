import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, ChevronRight, Database, Plus, FileSpreadsheet, Database as DatabaseIcon, FileText, Link, Server, HardDrive, ArrowLeft, Monitor, Globe, Beaker, Table, Code, Sparkles, Layers } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { useDatasetUpload } from '../hooks/useDatasetUpload';
import { motion, AnimatePresence } from 'framer-motion';
import { homeGuidance } from '../content/home-guidance';
import { DataIntakeDrawer } from '../components/data-intake/DataIntakeDrawer';
import type { DataIntakeRequest } from '../lib/data-intake';
import { selectHeroSuggestionPool, getStructuredPool } from '../lib/home-persona';
import type { HeroSuggestionPrompt } from '../lib/home-persona';
import { createDataIntakeRequest } from '../lib/data-intake';
import { createSourceCandidate, createFileSourceCandidate } from '../lib/source-preflight';
import type { SourceCandidate, SourceInspectionResult } from '../lib/source-preflight';
import { inspectLocalFile } from '../lib/local-file-inspector';
import { createPreviewRows } from '../lib/data-intake-preview-rows';
import { classifyDatasetFamilies } from '../lib/batch-inspection';
import type { DatasetFamily } from '../lib/batch-inspection';
import { generateRecipePlan } from '../lib/recipe-planner';
import type { RecipePlan } from '../lib/recipe-planner';
import { detectKeyCandidates } from '../lib/business-key-detector';
import { discoverCollections } from '../lib/relationship-discovery';
import { generateBusinessViews } from '../lib/business-view-generator';
import type { BusinessViewCandidate } from '../lib/business-view-generator';
import type { RelationshipGraph } from '../lib/relationship-graph';
import { BusinessViewReviewStep } from '../components/data-intake/BusinessViewReviewStep';
import type { WorkspaceUnderstandingState } from '../lib/workspace-understanding-state';
import { createWorkspaceUnderstandingState, applyBusinessViewSelection, getActiveAnalysisContextLabel } from '../lib/workspace-understanding-state';
import { runGuidedInvestigationPipeline } from '../lib/guided-investigation-pipeline';
import { createDatasetUnderstanding } from '../lib/dataset-understanding-contract';
import { DatasetUnderstandingCard } from '../components/analysis/DatasetUnderstandingCard';
import type { AnalysisAction } from '../lib/analysis-opportunity-actions';
import { createRuntimeIntentFromAnalysisAction } from '../lib/analysis-runtime-contract';
import { createRuntimePlanPreview } from '../lib/runtime-planner-preview';
import { createInvestigationSession } from '../lib/investigation-session';
import { generateAIBriefing } from '../lib/ai-briefing-contract';
import { useNavigate } from 'react-router-dom';
import { createVirtualDatasetPlan } from '../lib/virtual-dataset-planner';
import type { VirtualDatasetPlan } from '../lib/virtual-dataset-planner';
import { VirtualDatasetPlanPreview } from '../components/analysis/VirtualDatasetPlanPreview';
import { createRuntimePreview } from '../lib/runtime-preview';
import type { RuntimePreview } from '../lib/runtime-preview';
import { RuntimePreviewCard } from '../components/analysis/RuntimePreviewCard';
import { evaluateExecutionGuard } from '../lib/execution-guard';
import type { ExecutionGuardResult } from '../lib/execution-guard';
import { ExecutionGuardNotice } from '../components/analysis/ExecutionGuardNotice';
import { createDuckDBLogicalPlan } from '../lib/duckdb-logical-plan';
import type { DuckDBLogicalPlan } from '../lib/duckdb-logical-plan';
import { DuckDBLogicalPlanPreview } from '../components/analysis/DuckDBLogicalPlanPreview';
import { createRuntimeBoundaryArtifact } from '../lib/runtime-boundary-contract';
import type { RuntimeBoundaryArtifact } from '../lib/runtime-boundary-contract';
import { createExpectedResultContract } from '../lib/expected-result-contract';
import type { ExpectedResultContract } from '../lib/expected-result-contract';
import { ExpectedResultPreview } from '../components/analysis/ExpectedResultPreview';
import { compileSafeQuery } from '../lib/safe-sql-compiler';
import type { CompiledQueryContract } from '../lib/safe-sql-compiler';
import { CompiledQueryPreview } from '../components/analysis/CompiledQueryPreview';
import { createSandboxExecutionRequest, evaluateSandboxPolicy } from '../lib/runtime-sandbox-policy';
import type { SandboxExecutionRequest, SandboxEvaluationResult } from '../lib/runtime-sandbox-policy';
import { SandboxPolicyPreview } from '../components/analysis/SandboxPolicyPreview';
import { createPreviewResultContract } from '../lib/preview-result-contract';
import type { PreviewResultContract } from '../lib/preview-result-contract';
import { calculateBusinessConfidence } from '../lib/business-confidence-engine';
import type { ConfidenceSignalRegistry } from '../lib/business-confidence-engine';
import { createDatasetHealthSignal, createRelationshipSignal, createBusinessViewSignal, createResultValidationSignal } from '../lib/confidence-signal-adapters';
import { PreviewResultContractCard } from '../components/analysis/PreviewResultContractCard';
import { calculateDatasetHealth } from '../lib/dataset-health-engine';
import { DataQualityCard } from '../components/data-intake/DataQualityCard';
import { BusinessViewSummaryCard } from '../components/analysis/BusinessViewSummaryCard';
import { DuckDBPreviewRuntimeCard } from '../components/analysis/DuckDBPreviewRuntimeCard';
import { executeDuckDBPreviewRuntime } from '../lib/duckdb-preview-runtime';
import type { PreviewRuntimeResult } from '../lib/duckdb-preview-runtime';
import { ResultValidationCard } from '../components/analysis/ResultValidationCard';
import { validatePreviewRuntimeResult } from '../lib/result-validator-contract';
import type { ResultValidationResult } from '../lib/result-validator-contract';
import type { MappingOverlayAction } from '../lib/mapping-overlay-state';
import { applyMappingAction } from '../lib/mapping-overlay-state';
import { useDisplayPreferences } from '../stores/display-preferences-store';
import { formatValue } from '../lib/display-formatter';

const getGreeting = () => {
    // TODO: Pass display_name when auth exists
    const display_name = null;
    if (display_name) return `Good morning, ${display_name} 👋`;
    return 'Good morning 👋';
};

export const Home: React.FC = () => {
  const { preferences } = useDisplayPreferences();
  const navigate = useNavigate();
  const [currentDataset, setCurrentDataset] = useState<any>(null);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceUnderstandingState | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [analysisIntent, setAnalysisIntent] = useState<string | null>(null);
  type PendingLocalFileBatch = {
    files: File[];
    status: "reading" | "ready" | "error";
    results: (SourceInspectionResult | null)[];
    families: DatasetFamily[];
    selectedFamilyId: string | null;
    isRestored?: boolean;
    step: "family_selection" | "business_view_review";
    graph?: RelationshipGraph;
    businessViews?: BusinessViewCandidate[];
  };
  const [pendingLocalBatch, setPendingLocalBatch] = useState<PendingLocalFileBatch | null>(null);
  const [lastInspectedFamilies, setLastInspectedFamilies] = useState<DatasetFamily[] | null>(null);
  const [mappingOverlayActions, setMappingOverlayActions] = useState<MappingOverlayAction[]>([]);
  const inspectionRunId = useRef(0);


  const [isAsking, setIsAsking] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const questionInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [questionPlaceholder, setQuestionPlaceholder] = useState("Ask a question about your data...");

  // Debounce input: detect source candidate from URL pattern only.
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = inputValue.trim();
      if (!trimmed) {
        setAnalysisIntent(null);
        return;
      }
      const candidateOrError = createSourceCandidate(trimmed);
      if (!('status' in candidateOrError)) {
        // Valid candidate recognized, open Data Intake Drawer
        setActiveConnection({
          sourceKind: "online_link",
          sourceType: candidateOrError.sourceType,
          label: candidateOrError.label,
          requiresInput: true,
          nextStep: "url_input",
          initialUrl: trimmed
        });
        setInputValue("");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const { isUploading, uploadError } = useDatasetUpload();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const handleSelectAnalysisAction = (action: AnalysisAction) => {
    const intent = createRuntimeIntentFromAnalysisAction(action);
    const plan = createRuntimePlanPreview(intent);
    
    // Attempt to extract rows if available from current dataset state
    const datasetRows = currentDataset?.previewRows || currentDataset?.rows;
    console.log("TRACE [OPPORTUNITY] selectedAction.id:", action.id);

    const aiBriefing = datasetUnderstanding ? generateAIBriefing(datasetUnderstanding) : undefined;

    createInvestigationSession(
      currentDataset?.file_name || 'dataset',
      action,
      intent,
      plan,
      datasetRows,
      aiBriefing
    );
    navigate('/investigation');
  };

  const [previewActionId, setPreviewActionId] = useState<string | null>(null);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isReplaceMenuOpen, setIsReplaceMenuOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [activeConnection, setActiveConnection] = useState<DataIntakeRequest | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [recipePreview, setRecipePreview] = useState<RecipePlan | null>(null);
  const [selectedVirtualPlan, setSelectedVirtualPlan] = useState<VirtualDatasetPlan | null>(null);
  const [runtimePreview, setRuntimePreview] = useState<RuntimePreview | null>(null);
  const [acceptedRuntimePreview, setAcceptedRuntimePreview] = useState<RuntimePreview | null>(null);
  const [executionGuardResult, setExecutionGuardResult] = useState<ExecutionGuardResult | null>(null);
  const [selectedLogicalPlan, setSelectedLogicalPlan] = useState<DuckDBLogicalPlan | null>(null);
  const [runtimeBoundaryArtifact, setRuntimeBoundaryArtifact] = useState<RuntimeBoundaryArtifact | null>(null);
  const [expectedResultContract, setExpectedResultContract] = useState<ExpectedResultContract | null>(null);
  const [compiledQueryContract, setCompiledQueryContract] = useState<CompiledQueryContract | null>(null);
  const [sandboxRequest, setSandboxRequest] = useState<SandboxExecutionRequest | null>(null);
  const [sandboxEvaluation, setSandboxEvaluation] = useState<SandboxEvaluationResult | null>(null);
  const [previewResultContract, setPreviewResultContract] = useState<PreviewResultContract | null>(null);
  const [previewRuntimeResult, setPreviewRuntimeResult] = useState<PreviewRuntimeResult | null>(null);
  const [resultValidationResult, setResultValidationResult] = useState<ResultValidationResult | null>(null);

  const datasetHealthResult = React.useMemo(() => {
    if (currentDataset?.status === 'ready' && currentDataset.sourceType !== "virtual_business_view" && currentDataset.profiles) {
      const pseudoFamily: DatasetFamily = {
        id: currentDataset.file_name || 'dataset_1',
        name: currentDataset.file_name || 'Dataset 1',
        schemaFingerprint: "hash",
        files: [],
        columns: Object.keys(currentDataset.profiles),
        profiles: currentDataset.profiles,
        totalRows: 1000
      };
      return calculateDatasetHealth(pseudoFamily);
    }
    return null;
  }, [currentDataset]);

  const businessConfidenceResult = React.useMemo(() => {
    if (!expectedResultContract || !workspaceState?.businessViewState || !datasetHealthResult) return null;

    const businessView = workspaceState.businessViewState.confirmedBusinessViews.find(v => v.id === expectedResultContract.businessViewId) || null;
    const isMultiDataset = false;

    const signals = [
      createDatasetHealthSignal(datasetHealthResult),
      createRelationshipSignal(null, isMultiDataset),
      createBusinessViewSignal(businessView),
      createResultValidationSignal(resultValidationResult)
    ];

    const registry: ConfidenceSignalRegistry = {
      version: "1.0",
      isMultiDataset,
      signals
    };

    return calculateBusinessConfidence(registry);
  }, [expectedResultContract, workspaceState, datasetHealthResult, resultValidationResult]);

  type AnalysisMode = "explore" | "investigate" | "ask";
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>("explore");
  const [selectedPerspective, setSelectedPerspective] = useState<string | null>(null);
  const [selectedBusinessView, setSelectedBusinessView] = useState<string | null>(null);
  
  const activeAnalysisIntent = analysisIntent || selectedTopic || null;

  useEffect(() => {
    if (!isPlusMenuOpen && !isReplaceMenuOpen) setActiveSubmenu(null);
  }, [isPlusMenuOpen, isReplaceMenuOpen]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPlusMenuOpen(false);
        setIsReplaceMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) {
        return;
      }
      const target = e.target as HTMLElement;
      if (target.closest('.source-picker-toggle')) {
         return;
      }
      setIsPlusMenuOpen(false);
      setIsReplaceMenuOpen(false);
    };

    if (isPlusMenuOpen || isReplaceMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlusMenuOpen, isReplaceMenuOpen]);

  const renderSourcePickerMenu = (isOpen: boolean, setIsOpen: (val: boolean) => void, positionClass: string) => {
    if (!isOpen) return null;
    return (
      <div ref={menuRef} className={`absolute ${positionClass} w-64 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-2 animate-in fade-in slide-in-from-top-2 duration-200 text-left overflow-hidden`}>
        <AnimatePresence mode="wait">
          {activeSubmenu ? (
            <motion.div
              key="submenu"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className="px-2 pb-2 border-b border-gray-100 flex items-center">
                <button onClick={() => setActiveSubmenu(null)} className="p-1.5 hover:bg-gray-100 rounded-md text-gray-500 mr-1">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-[12px] font-medium text-gray-700">
                  {homeGuidance.plusMenu.submenus[activeSubmenu as keyof typeof homeGuidance.plusMenu.submenus]?.title}
                </span>
              </div>
              <div className="pt-1">
                {homeGuidance.plusMenu.submenus[activeSubmenu as keyof typeof homeGuidance.plusMenu.submenus]?.items.map((item) => {
                  const Icon = { Database: DatabaseIcon, Server, HardDrive, FileSpreadsheet, Table, Link, Code, FileText }[item.icon as string] || DatabaseIcon;
                  return (
                    <button 
                      key={item.id} 
                      onClick={() => {
                        setIsOpen(false);
                        const request = createDataIntakeRequest(item);
                        if (request.nextStep === "file_picker") {
                          fileInputRef.current?.click();
                        } else if (request.nextStep === "url_input") {
                          if (currentDataset?.status === 'ready') {
                            setActiveConnection(request);
                          } else {
                            const ph = homeGuidance.inlineLinkIntake.placeholders[request.sourceType as keyof typeof homeGuidance.inlineLinkIntake.placeholders];
                            setQuestionPlaceholder(ph || "Paste your link here...");
                            setTimeout(() => questionInputRef.current?.focus(), 50);
                          }
                        } else if (request.nextStep === "load_sample") {
                          alert(`Sample data loading for ${request.label} coming soon`);
                        } else {
                          setActiveConnection(request);
                        }
                      }} 
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <Icon className="w-4 h-4 mr-2 text-gray-400"/> {item.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="main-menu"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="py-1"
            >
              {homeGuidance.plusMenu.mainMenu.map((item) => {
                const Icon = { Monitor, Globe, Server, Beaker }[item.icon as string] || Server;
                return (
                  <button 
                    key={item.id} 
                    onClick={() => {
                      if (item.hasSubmenu) {
                        setActiveSubmenu(item.submenuId);
                      } else {
                        setIsOpen(false);
                      }
                    }} 
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between font-medium"
                  >
                    <span className="flex items-center"><Icon className="w-4 h-4 mr-2 text-gray-500"/> {item.label}</span>
                    {item.hasSubmenu && <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Pool selection ONLY uses real dataset columns (status === "ready").
  const selectedPoolKey = React.useMemo(() => {
    if (currentDataset?.status !== 'ready') return 'default';
    const columns = currentDataset?.columns || [];
    return selectHeroSuggestionPool({ dataColumns: columns });
  }, [currentDataset]);

  const guidedInvestigationResult = React.useMemo(() => {
    if (currentDataset?.status === 'ready' && currentDataset.columns) {
      const columnsForPipeline = currentDataset.columns.map((c: string) => ({ 
        name: c, 
        type: currentDataset.profiles?.[c]?.inferredType || currentDataset.profiles?.[c]?.type || 'string',
        distinctRatio: currentDataset.profiles?.[c]?.distinct_ratio,
        uniqueValuesCount: currentDataset.profiles?.[c]?.unique_count
      }));
      return runGuidedInvestigationPipeline({ columns: columnsForPipeline, overlayActions: mappingOverlayActions });
    }
    return null;
  }, [currentDataset, mappingOverlayActions]);

  const datasetUnderstanding = React.useMemo(() => {
    if (!currentDataset || !guidedInvestigationResult) return null;
    return createDatasetUnderstanding({
      datasetName: currentDataset.file_name,
      rowCount: currentDataset.rows_count,
      columnCount: Array.isArray(currentDataset.columns) ? currentDataset.columns.length : 0,
      signalRegistry: guidedInvestigationResult.signals,
      perspectives: guidedInvestigationResult.perspectives,
      businessViews: guidedInvestigationResult.businessViews,
      questionSuggestions: guidedInvestigationResult.questionSuggestions,
      health: datasetHealthResult || undefined,
    });
  }, [currentDataset, guidedInvestigationResult, datasetHealthResult]);

  const activeBusinessViews = selectedPerspective && guidedInvestigationResult
    ? guidedInvestigationResult.businessViews.filter(v => v.perspectiveId === selectedPerspective)
    : [];
  const selectedViewData = activeBusinessViews.find(v => v.id === selectedBusinessView) || null;

  useEffect(() => {
    if (selectedBusinessView && activeBusinessViews) {
      if (!activeBusinessViews.some(v => v.id === selectedBusinessView)) {
        setSelectedBusinessView(null);
      }
    }
  }, [selectedBusinessView, activeBusinessViews]);

  const visibleQuestionSuggestions = React.useMemo(() => {
    if (!guidedInvestigationResult || !selectedPerspective || !selectedBusinessView) return [];
    
    return guidedInvestigationResult.questionSuggestions.filter(q => 
      q.perspectiveId === selectedPerspective &&
      q.businessViewId === selectedBusinessView
    );
  }, [guidedInvestigationResult, selectedPerspective, selectedBusinessView]);

  const activePool = React.useMemo(() => getStructuredPool(selectedPoolKey), [selectedPoolKey]);
  
  const [activeChips, setActiveChips] = useState<HeroSuggestionPrompt[]>(() => {
    const defaultPool = getStructuredPool('default');
    const shuffled = [...defaultPool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 4);
  });

  useEffect(() => {
    if (selectedPerspective && guidedInvestigationResult) {
      if (!guidedInvestigationResult.perspectives.some(p => p.id === selectedPerspective)) {
        setSelectedPerspective(null);
      }
    }
  }, [selectedPerspective, guidedInvestigationResult]);

  useEffect(() => {
    if (currentDataset?.status !== 'ready') return; // Keep default chips if no ready dataset
    const shuffled = [...activePool].sort(() => 0.5 - Math.random());
    setActiveChips(shuffled.slice(0, 4));
  }, [activePool, currentDataset]);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5172';

  useEffect(() => {
    const fetchCurrentSource = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/project/current-source`);
        if (res.ok) {
          const data = await res.json();
          if (data.has_source) {
            setCurrentDataset(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch current source", err);
      }
    };
    fetchCurrentSource();
    
    // Rotate prompts every 5 seconds
    const interval = setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % homeGuidance.rotatingPrompts.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [API_BASE_URL]);

  useEffect(() => {
    if (isInputFocused) return;

    // Rotate 1 chip every 8 seconds
    const interval = setInterval(() => {
      setActiveChips(current => {
        const candidates = activePool.filter(c => !current.some(ch => ch.text === c.text));
        if (candidates.length === 0) return current;
        
        const indexToReplace = Math.floor(Math.random() * current.length);
        const replacement = candidates[Math.floor(Math.random() * candidates.length)];
        
        const next = [...current];
        next[indexToReplace] = replacement;
        return next;
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [isInputFocused, activePool]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setResult(null);
    setSelectedTopic(null);
    setPreviewActionId(null);

    // Close menus if they are open
    setIsPlusMenuOpen(false);
    setIsReplaceMenuOpen(false);

    // Clear any previously stored inspected families because we are starting a new batch.
    setLastInspectedFamilies(null);

    setPendingLocalBatch({
      files,
      status: "reading",
      results: new Array(files.length).fill(null),
      families: [],
      selectedFamilyId: null,
      step: "family_selection"
    });
    
    const runId = ++inspectionRunId.current;

    // Inspect files concurrently
    const inspectionPromises = files.map(file => {
      const candidateOrError = createFileSourceCandidate(file);
      if ('status' in candidateOrError) {
        return Promise.resolve(candidateOrError as SourceInspectionResult);
      }
      return inspectLocalFile(candidateOrError as SourceCandidate).catch(() => ({
        status: 'not_found', sourceType: candidateOrError.sourceType, label: candidateOrError.label, message: "Error reading file."
      } as SourceInspectionResult));
    });

    const results = await Promise.all(inspectionPromises);
    
    if (runId !== inspectionRunId.current) return;
    
    const hasError = results.every(r => r.status !== 'accessible');
    
    setPendingLocalBatch({
      files,
      status: hasError ? "error" : "ready",
      results,
      families: [],
      selectedFamilyId: null,
      step: "family_selection"
    });

    if (!hasError) {
      const items = files.map((file, idx) => ({ file, result: results[idx] as SourceInspectionResult }));
      const families = classifyDatasetFamilies(items, 'strict');
      
      let graph: RelationshipGraph | undefined = undefined;
      let businessViews: BusinessViewCandidate[] | undefined = undefined;
      let nextStep: "family_selection" | "business_view_review" = "family_selection";

      try {
        if (families.length > 1) {
          const keyCandidatesMap: Record<string, any> = {};
          const datasetMap: Record<string, DatasetFamily> = {};
          for (const f of families) {
            keyCandidatesMap[f.id] = detectKeyCandidates(f, {});
            datasetMap[f.id] = f;
          }
          const { graph: g } = discoverCollections(families, keyCandidatesMap);
          graph = g;
          businessViews = generateBusinessViews(graph, datasetMap);
          if (businessViews.length > 0) {
            nextStep = "business_view_review";
          }
        }
      } catch (e) {
        console.error("Discovery error:", e);
      }
      
      setPendingLocalBatch({
        files,
        status: "ready",
        results,
        families,
        selectedFamilyId: families.length === 1 ? families[0].id : null,
        step: nextStep,
        graph,
        businessViews
      });
      setLastInspectedFamilies(families);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancelInspection = () => {
    inspectionRunId.current += 1;
    setPendingLocalBatch(null);
  };

  const handleUseLocalDataset = () => {
    if (!pendingLocalBatch || pendingLocalBatch.status !== 'ready') return;
    
    let familyId = pendingLocalBatch.selectedFamilyId;
    if (!familyId && pendingLocalBatch.families.length === 1) {
      familyId = pendingLocalBatch.families[0].id;
    }
    
    if (!familyId) return;

    const family = pendingLocalBatch.families.find(f => f.id === familyId);
    if (!family) return;

    const newState = createWorkspaceUnderstandingState({ type: 'dataset', datasetId: family.id });
    setWorkspaceState(newState);

    // Build sourceFiles lineage with fingerprint
    const sourceFiles = family.files.map(item => {
      const isAccessible = item.result.status === 'accessible';
      const md = isAccessible ? (item.result as any).metadata : null;
      let rows = 0;
      let colsCount = 0;
      if (md) {
        rows = md.rows_count || 0;
        colsCount = (md.columns || []).length;
        if (md.is_workbook && md.default_sheet && md.sheets) {
          const sheet = md.sheets[md.default_sheet];
          if (sheet) {
            rows = sheet.rows_count || 0;
            colsCount = (sheet.columns || []).length;
          }
        }
      }
      return {
        name: item.file.name,
        rows,
        columns: colsCount,
        fingerprint: family.schemaFingerprint
      };
    });

    const firstAccessible = family.files.find(item => item.result.status === 'accessible');
    const firstMd = firstAccessible ? (firstAccessible.result as any).metadata : null;
    let rawPreviewRows: any[] = [];
    if (firstMd) {
      if (firstMd.is_workbook && firstMd.default_sheet && firstMd.sheets) {
        rawPreviewRows = firstMd.sheets[firstMd.default_sheet]?.preview_rows || [];
      } else {
        rawPreviewRows = firstMd.preview_rows || [];
      }
    }
    const finalPreviewRows = createPreviewRows(rawPreviewRows, family.columns);
    console.log("TRACE [HOME] currentDataset.previewRows.length:", finalPreviewRows.length);

    setCurrentDataset({
      status: 'ready',
      file_name: pendingLocalBatch.families.length > 1 ? family.name : (family.files.length > 1 ? `Combined dataset (${family.files.length} files)` : family.files[0].file.name),
      rows_count: family.totalRows,
      columns: family.columns,
      profiles: family.profiles,
      sourceType: (family.files[0].result as any).sourceType,
      normalizedUrl: (family.files[0].result as any).normalizedUrl,
      sourceFiles: sourceFiles as any, // Storing extended metadata format here
      selected_sheet: null,
      file_reference: null,
      previewRows: finalPreviewRows
    });

    handleCancelInspection();
  };

  const askQuestion = async (q: string) => {
    if (!currentDataset) {
      setSelectedTopic(q);
      return;
    }
    
    setIsAsking(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/question/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q })
      });
      const data = await res.json();
      setResult({ ...data, originalQuestion: q });
    } catch (e) {
      console.error(e);
      alert("Failed to ask question.");
    } finally {
      setIsAsking(false);
    }
  };

  const getEChartsOption = (chartData: any) => {
    if (!chartData || !chartData.theme_metadata || !chartData.theme_metadata.data) return {};
    const meta = chartData.theme_metadata;
    const xAxisData = meta.data.map((row: any) => row[meta.xAxis]);
    const seriesData = meta.data.map((row: any) => Number(row[meta.yAxis[0]]));
    return {
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: xAxisData, axisLine: { lineStyle: { color: '#e5e7eb' } }, axisLabel: { color: '#4b5563' } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { color: '#4b5563' } },
      series: [{ data: seriesData, type: 'line', smooth: true, areaStyle: { opacity: 0.1 }, itemStyle: { color: '#111827' } }]
    };
  };


  return (
    <div className="flex-1 flex flex-col items-center pt-20 px-6 overflow-y-auto bg-gray-50/30 text-gray-900 font-sans" onClick={() => isPlusMenuOpen && setIsPlusMenuOpen(false)}>
      
      {/* Global Data Intake Drawer */}
      <DataIntakeDrawer 
        request={activeConnection} 
        onClose={() => setActiveConnection(null)} 
      />

      <div className="w-full max-w-6xl flex flex-col items-center relative" onClick={e => e.stopPropagation()}>
        {!result && !isAsking && !selectedTopic && (
          <>
            {currentDataset?.status !== 'ready' && (
              <div className="w-full mb-12 flex flex-col items-center text-center">
                <h2 className="text-xl text-gray-500 mb-2">{getGreeting()}</h2>
                <div className="h-[40px] relative w-full max-w-2xl overflow-hidden flex justify-center mb-8">
                  <AnimatePresence mode="wait">
                    <motion.h1
                      key={promptIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="text-3xl font-medium text-gray-900 tracking-tight absolute"
                    >
                      {homeGuidance.rotatingPrompts[promptIndex]}
                    </motion.h1>
                  </AnimatePresence>
                </div>

                <div className="w-full relative flex flex-col items-center max-w-3xl">
                  <div className="w-full relative flex items-center">
                    <button 
                      onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                      className="source-picker-toggle absolute left-3 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors z-10"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    
                    {renderSourcePickerMenu(isPlusMenuOpen, setIsPlusMenuOpen, "top-14 left-0")}

                    <input 
                      ref={questionInputRef}
                      type="text" 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onFocus={() => setIsInputFocused(true)}
                      onBlur={() => setIsInputFocused(false)}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter' && inputValue.trim()) {
                              askQuestion(activeAnalysisIntent || inputValue.trim());
                              setInputValue("");
                          }
                      }}
                      placeholder={questionPlaceholder}
                      className="w-full pl-14 pr-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm text-base focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 transition-all placeholder:text-gray-400"
                    />
                  </div>

                  <div className="flex flex-wrap justify-center content-start gap-2 mt-4 min-h-[76px]">
                    {activeChips.map((chip, idx) => {
                      const style = homeGuidance.heroChipCategoryStyles[chip.category] || homeGuidance.heroChipCategoryStyles.general;
                      return (
                        <div key={`slot-${idx}`} className="relative flex items-center justify-center">
                          <AnimatePresence mode="wait">
                            <motion.button 
                              key={chip.text} 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              onClick={() => {
                                setInputValue(chip.text);
                                setAnalysisIntent(chip.text);
                                askQuestion(chip.text);
                              }} 
                              className={`group flex items-center gap-2 text-[13px] text-gray-500 hover:text-gray-900 bg-white border border-gray-200 hover:border-gray-300 px-4 py-1.5 rounded-full transition-colors shadow-sm whitespace-nowrap ${style.hover}`}
                            >
                              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${style.dot}`} />
                              <span>{chip.text}</span>
                            </motion.button>
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <input 
          type="file" 
          ref={fileInputRef} 
          multiple
          accept=".csv,.xlsx,.xls,.txt,.tsv,.json" 
          className="hidden" 
          onChange={handleFileChange} 
        />

        {uploadError && <div className="mb-4 text-[13px] text-red-500 bg-red-50 px-3 py-1.5 rounded-md border border-red-100">{uploadError}</div>}
        {isUploading && <div className="mb-4 flex items-center text-sm text-gray-500"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading and analyzing data...</div>}

        {!result && !isAsking && !selectedTopic && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-8 items-start pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Main Column */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              
              {/* Data Status Card – only rendered when currentDataset.status === "ready" */}
              {currentDataset?.status === 'ready' && (
                <div className="w-full p-4 bg-white border border-gray-200 rounded-xl flex justify-between items-center shadow-sm">
                  <div className="flex items-center">
                    <Database className="w-5 h-5 text-emerald-500 mr-3" />
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-medium text-gray-900">Connected Data: {workspaceState ? getActiveAnalysisContextLabel(workspaceState, currentDataset.file_name) : currentDataset.file_name}</p>
                        {(currentDataset.sourceType === "virtual_business_view" || workspaceState?.activeContext.type === "business_view") && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">Business View</span>
                        )}
                      </div>
                      {(currentDataset.sourceType === "virtual_business_view" || workspaceState?.activeContext.type === "business_view") ? (
                        <p className="text-[12px] text-gray-500">Business view · {formatValue(currentDataset.selectedBusinessView?.datasets?.length || 0, 'number', preferences, { compact: true })} datasets · {formatValue(Array.isArray(currentDataset.columns) ? currentDataset.columns.length : 0, 'number', preferences, { compact: true })} columns</p>
                      ) : (
                        <p className="text-[12px] text-gray-500">{formatValue(currentDataset.rows_count, 'number', preferences, { compact: true })} rows · {formatValue(Array.isArray(currentDataset.columns) ? currentDataset.columns.length : 0, 'number', preferences, { compact: true })} columns</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {}} className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-md text-[12px] font-medium hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200">View Data</button>
                    {lastInspectedFamilies && lastInspectedFamilies.length > 1 && (
                      <button 
                        onClick={() => {
                          setPendingLocalBatch({
                            files: [],
                            status: "ready",
                            results: [],
                            families: lastInspectedFamilies,
                            selectedFamilyId: null,
                            isRestored: true,
                            step: "family_selection"
                          });
                        }} 
                        className="px-3 py-1.5 bg-gray-50 text-gray-600 rounded-md text-[12px] font-medium hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
                      >
                        Change Group
                      </button>
                    )}
                    <div className="relative">
                      <button onClick={() => setIsReplaceMenuOpen(!isReplaceMenuOpen)} className="source-picker-toggle px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md text-[12px] font-medium hover:bg-gray-50 transition-colors shadow-sm">Replace Data</button>
                      {renderSourcePickerMenu(isReplaceMenuOpen, setIsReplaceMenuOpen, "top-10 right-0")}
                    </div>
                  </div>
                </div>
              )}

              {datasetHealthResult && (
                <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-4">
                  <DataQualityCard health={datasetHealthResult} />
                  
                  {/* Dataset Understanding Layer */}
                  {datasetUnderstanding && (
                    <DatasetUnderstandingCard 
                      understanding={datasetUnderstanding} 
                      onSelectAction={handleSelectAnalysisAction}
                      onMappingAction={(action) => {
                         setMappingOverlayActions(prev => applyMappingAction(prev, action));
                      }}
                    />
                  )}

                  {/* Global Perspective Selector */}
                  <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-500 mt-2">
                    <div>
                      <h3 className="text-[16px] font-semibold text-gray-900 mb-1">Optional: Choose a deeper business perspective</h3>
                      <p className="text-[13px] text-gray-500">LightBI already understands the dataset. Choose a perspective only if you want advanced guided analysis.</p>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {!guidedInvestigationResult?.perspectives || guidedInvestigationResult.perspectives.length === 0 ? (
                        <div className="col-span-2 md:col-span-3 p-5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center">
                          <p className="text-sm text-gray-500">No reliable business perspectives found for this data yet.</p>
                        </div>
                      ) : (
                        guidedInvestigationResult.perspectives.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelectedPerspective(p.id);
                              setSelectedBusinessView(null);
                            }}
                            className={`p-4 rounded-xl border text-left transition-all flex flex-col ${
                              selectedPerspective === p.id 
                                ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-500' 
                                : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`font-semibold text-[14px] mb-1 ${selectedPerspective === p.id ? 'text-blue-900' : 'text-gray-800'}`}>
                              {p.label}
                            </div>
                            <div className={`text-[11px] leading-snug mb-2 ${selectedPerspective === p.id ? 'text-blue-700/80' : 'text-gray-500'}`}>
                              {p.description}
                            </div>
                            <div className="text-[10px] text-gray-400 font-medium border-t border-gray-100 pt-1.5 mt-auto w-full">
                              Detected from: {p.supportingSignals.join(", ")}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Business View Selector (Dynamic based on Perspective) */}
                  {selectedPerspective && activeBusinessViews.length > 0 && (
                    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-500 mt-2">
                      <div>
                        <h3 className="text-[16px] font-semibold text-gray-900 mb-1">Business Views</h3>
                        <p className="text-[13px] text-gray-500">How should LightBI interpret this business process?</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {!activeBusinessViews || activeBusinessViews.length === 0 ? (
                          <div className="col-span-1 md:col-span-2 p-5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center">
                            <p className="text-sm text-gray-500">No reliable business views found for this perspective.</p>
                          </div>
                        ) : (
                          activeBusinessViews.map(v => (
                            <button
                              key={v.id}
                              onClick={() => setSelectedBusinessView(v.id)}
                              className={`p-4 rounded-xl border text-left transition-all ${
                                selectedBusinessView === v.id 
                                  ? 'bg-indigo-50 border-indigo-500 shadow-sm ring-1 ring-indigo-500' 
                                  : 'bg-white border-gray-200 hover:border-indigo-300 hover:bg-slate-50'
                              }`}
                            >
                              <div className={`font-semibold text-[14px] mb-1 ${selectedBusinessView === v.id ? 'text-indigo-900' : 'text-gray-800'}`}>
                                {v.label}
                              </div>
                              <div className={`text-[11px] leading-snug mb-2 ${selectedBusinessView === v.id ? 'text-indigo-700/80' : 'text-gray-500'}`}>
                                {v.description}
                              </div>
                              <div className="text-[10px] text-gray-400 font-medium border-t border-gray-100 pt-1.5 mt-auto">
                                Confidence: {v.confidenceScore}% | Reqs met: {v.matchedRequiredSignals.length}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Inline Pending Local Batch Inspection Card */}
              {pendingLocalBatch && (
                <div className="w-full p-5 bg-white border border-blue-200 rounded-xl shadow-sm animate-in fade-in zoom-in-95 flex flex-col gap-4 relative overflow-hidden">
                  {pendingLocalBatch.status === "reading" && (
                    <div className="absolute top-0 left-0 h-1 bg-blue-500 w-full animate-pulse" />
                  )}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        {pendingLocalBatch.status === "reading" ? (
                          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                        ) : pendingLocalBatch.status === "error" ? (
                          <div className="w-5 h-5 text-red-500 flex items-center justify-center font-bold">!</div>
                        ) : (
                          <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-[14px] font-semibold text-gray-900">
                          {pendingLocalBatch.isRestored ? "Choose dataset group" : 
                           pendingLocalBatch.status === "reading" ? `Inspecting ${pendingLocalBatch.files.length} files...` : 
                           pendingLocalBatch.status === "error" ? "Inspection failed" : `${pendingLocalBatch.files.length} files detected`}
                        </h3>
                        {!pendingLocalBatch.isRestored && pendingLocalBatch.files.length > 0 && (
                          <p className="text-[12px] text-gray-500 line-clamp-1">
                            {pendingLocalBatch.files.length === 1 ? pendingLocalBatch.files[0].name : `${pendingLocalBatch.files[0].name} and ${pendingLocalBatch.files.length - 1} more`}
                          </p>
                        )}
                      </div>
                    </div>
                    {pendingLocalBatch.status === "reading" && (
                      <button onClick={handleCancelInspection} className="text-[12px] text-gray-500 hover:text-gray-700 font-medium px-3 py-1.5 border border-gray-200 rounded-md transition-colors">
                        Cancel
                      </button>
                    )}
                  </div>

                  {pendingLocalBatch.status === "reading" && (
                    <div className="text-[13px] text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <p>Large files may take a moment. You can cancel and keep your current dataset.</p>
                    </div>
                  )}

                  {pendingLocalBatch.status === "error" && (
                    <div className="text-[13px] text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex justify-between items-center">
                      <p>Failed to read some files.</p>
                      <button onClick={handleCancelInspection} className="px-3 py-1.5 bg-white text-red-700 border border-red-200 rounded-md shadow-sm font-medium hover:bg-red-50 transition-colors">Dismiss</button>
                    </div>
                  )}

                  {pendingLocalBatch.status === "ready" && pendingLocalBatch.step === "family_selection" && (
                    <div className="flex flex-col gap-4 pt-2 border-t border-gray-100">
                      
                      <div className="flex flex-col gap-2">
                        <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          {pendingLocalBatch.families.length} Dataset Groups Detected
                        </label>
                        
                        {pendingLocalBatch.families.length > 1 && !pendingLocalBatch.isRestored && (
                          <div className="text-[13px] text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200 mb-2">
                            Files use different schemas and will be analyzed separately. Please select a dataset group to use.
                          </div>
                        )}
                        {pendingLocalBatch.isRestored && (
                          <div className="text-[13px] text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200 mb-2">
                            These groups come from your last inspected files. No files will be re-read.
                          </div>
                        )}

                        <div className="flex flex-col gap-3">
                          {pendingLocalBatch.families.map((fam) => (
                            <div 
                              key={fam.id}
                              onClick={() => setPendingLocalBatch({ ...pendingLocalBatch, selectedFamilyId: fam.id })}
                              className={`border rounded-lg p-3 cursor-pointer transition-colors ${pendingLocalBatch.selectedFamilyId === fam.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${pendingLocalBatch.selectedFamilyId === fam.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'}`}>
                                  {pendingLocalBatch.selectedFamilyId === fam.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <div className="flex-1">
                                  <div className="flex justify-between items-center mb-1">
                                    <h4 className="text-[13px] font-semibold text-gray-900">{fam.name}</h4>
                                    <span className="text-[12px] text-gray-500">{fam.files.length} files</span>
                                  </div>
                                  <div className="text-[12px] text-gray-500 flex gap-3">
                                    <span>{formatValue(fam.totalRows, 'number', preferences, { compact: true })} rows</span>
                                    <span>{formatValue(fam.columns.length, 'number', preferences, { compact: true })} columns</span>
                                    {fam.files.length > 1 && <span className="text-emerald-600 flex items-center gap-1"><span className="text-emerald-500">✓</span> Compatible for append</span>}
                                  </div>
                                  <div className="mt-2 text-[11px] text-gray-400 truncate">
                                    {fam.files.map(f => f.file.name).join(', ')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-gray-100">
                        <button 
                          onClick={handleUseLocalDataset}
                          disabled={!pendingLocalBatch.selectedFamilyId && pendingLocalBatch.families.length > 1}
                          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {pendingLocalBatch.families.length === 1 ? 'Use this dataset' : 'Use selected dataset'} <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {pendingLocalBatch.status === "ready" && pendingLocalBatch.step === "business_view_review" && pendingLocalBatch.graph && pendingLocalBatch.businessViews && (
                    <BusinessViewReviewStep
                      graph={pendingLocalBatch.graph}
                      initialViews={pendingLocalBatch.businessViews}
                      datasetCount={pendingLocalBatch.families.length}
                      onComplete={(views) => {
                        const confirmedView = views.find(v => v.status === 'confirmed');
                        if (confirmedView) {
                          const initial = createWorkspaceUnderstandingState({ type: 'dataset_group', datasetGroupId: 'group-1' });
                          const newState = applyBusinessViewSelection(initial, confirmedView, pendingLocalBatch.graph!);
                          setWorkspaceState(newState);

                          const allColumns: string[] = [];
                          confirmedView.datasets.forEach(dsId => {
                            const fam = pendingLocalBatch.families.find(f => f.id === dsId);
                            if (fam) {
                              fam.columns.forEach(c => allColumns.push(`${fam.name}.${c}`));
                            }
                          });
                          
                          setCurrentDataset({
                            status: 'ready',
                            file_name: confirmedView.title,
                            rows_count: null,
                            columns: allColumns,
                            profiles: {},
                            sourceType: "virtual_business_view",
                            selectedBusinessView: confirmedView
                          });
                          setPendingLocalBatch(null);
                        } else {
                          setPendingLocalBatch({
                            ...pendingLocalBatch,
                            step: "family_selection"
                          });
                        }
                      }}
                    />
                  )}
                </div>
              )}


              {/* Detected Opportunities – only when currentDataset.status === 'ready' and domains exist */}
              {currentDataset?.status === 'ready' && currentDataset.columns && currentDataset.columns.length > 0 ? (
                <>
                  <div className="flex flex-col gap-4">
                    <div className="flex bg-gray-100 p-1 rounded-lg self-start">
                      <button 
                        onClick={() => setAnalysisMode("explore")}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${analysisMode === "explore" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Explore
                      </button>
                      <button 
                        onClick={() => setAnalysisMode("investigate")}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${analysisMode === "investigate" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Investigate
                      </button>
                      <button 
                        onClick={() => setAnalysisMode("ask")}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${analysisMode === "ask" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Ask
                      </button>
                    </div>
                    {guidedInvestigationResult && (
                      <div className="text-[11px] text-gray-400 font-mono mt-1 mb-2 border border-gray-100 p-2 rounded-md bg-gray-50 flex gap-4">
                        <span>Understanding Debug:</span>
                        <span>Signals: {guidedInvestigationResult.signals.signals.length}</span>
                        <span>Perspectives: {guidedInvestigationResult.perspectives.length}</span>
                        <span>Advanced Views: {guidedInvestigationResult.businessViews.length}</span>
                        <span>Optional Questions: {guidedInvestigationResult.questionSuggestions.length}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mb-2">
                      {analysisMode === "explore" && "Dataset First - What is inside this data?"}
                      {analysisMode === "investigate" && "Business View First - What business process is happening?"}
                      {analysisMode === "ask" && "Question First - What do you want to know?"}
                    </div>
                  </div>

                  {analysisMode === "explore" && (
                    !selectedPerspective ? (
                      <div className="w-full p-8 bg-slate-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center mt-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">Questions Hidden</h3>
                          <p className="text-xs text-gray-500 max-w-[250px]">Select a perspective to continue.</p>
                        </div>
                      </div>
                    ) : !selectedBusinessView ? (
                      <div className="w-full p-8 bg-slate-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center mt-4 animate-in fade-in zoom-in-95">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400">
                            <Layers className="w-6 h-6" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">Advanced guided views unavailable</h3>
                          <p className="text-xs text-gray-500 max-w-sm mt-1">LightBI understands this dataset and can suggest basic analysis, but no advanced Business View is available yet because required signals are missing.</p>
                          {datasetUnderstanding && datasetUnderstanding.unavailableAnalysis.length > 0 && (
                            <div className="mt-4 text-left w-full bg-red-50/50 p-3 rounded-md border border-red-100/60">
                              <p className="text-[11px] font-semibold text-red-800 mb-1.5 uppercase tracking-wider">Missing required signals</p>
                              <div className="flex flex-wrap gap-1.5">
                                {Array.from(new Set(datasetUnderstanding.unavailableAnalysis.flatMap(ua => ua.missingSignals))).map(sig => (
                                  <span key={sig} className="text-[11px] font-medium bg-white border border-red-200 shadow-sm text-red-600 px-2 py-0.5 rounded-md">{sig}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : visibleQuestionSuggestions.length > 0 ? (
                      <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
                          {selectedViewData && (
                            <BusinessViewSummaryCard
                              title={selectedViewData.label}
                              purpose={selectedViewData.description}
                              evidence={selectedViewData.evidence.map(e => e.label)}
                              relationships={[]} // Auto-relationships not extracted from views yet
                              coverage={{ datasets: 1, businessKeys: selectedViewData.matchedRequiredSignals.length, views: 1 }}
                              belief={`LightBI believes this data supports the ${selectedViewData.label} business view with ${selectedViewData.confidenceScore}% confidence, matching ${selectedViewData.matchedRequiredSignals.length} required signals.`}
                            />
                          )}
                          
                          <div className="w-full p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl shadow-sm flex flex-col gap-5">
                            <div>
                              <h3 className="text-[15px] font-semibold text-blue-900 mb-1 flex items-center">
                                <Code className="w-4 h-4 mr-2 text-blue-600" />
                                What can I learn from this data?
                              </h3>
                              <p className="text-[13px] text-blue-700/80 mb-4">
                                LightBI generated these questions based on the {selectedViewData?.label || selectedPerspective} context.
                              </p>
                            </div>
                          
                          <div className="flex flex-col gap-3">
                            <h4 className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">{selectedViewData?.label || selectedPerspective} Questions</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {visibleQuestionSuggestions.map((suggestion, idx) => (
                                <div key={idx} className="bg-white border border-blue-200 rounded-lg p-4 hover:bg-blue-50 transition-colors flex flex-col justify-between shadow-sm">
                                  <button
                                    onClick={() => {
                                      if (workspaceState?.activeContext.type === "business_view" && workspaceState.businessViewState) {
                                        const viewId = (workspaceState.activeContext as any).businessViewId;
                                        const view = workspaceState.businessViewState.confirmedBusinessViews.find(v => v.id === viewId);
                                        if (view && workspaceState.relationshipState?.graph) {
                                          const plan = createVirtualDatasetPlan({
                                            businessView: view,
                                            question: suggestion as any,
                                            graph: workspaceState.relationshipState.graph,
                                            workspaceState
                                          });
                                          setSelectedVirtualPlan(plan);
                                          return;
                                        }
                                      }
                                      setRecipePreview(generateRecipePlan(suggestion.text));
                                    }}
                                    className="w-full text-left flex items-start justify-between group mb-3"
                                  >
                                    <span className="text-[14px] text-blue-900 font-medium leading-snug pr-4">{suggestion.text}</span>
                                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 mt-0.5 shrink-0" />
                                  </button>
                                  
                                  <div className="flex flex-col gap-2 mt-auto">
                                    <div className="text-[11px] text-slate-500 font-medium flex flex-wrap items-center gap-1">
                                      <span>Detected from:</span>
                                      {suggestion.evidenceSignals.join(", ")}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                        suggestion.confidenceScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                        suggestion.confidenceScore >= 50 ? 'bg-amber-100 text-amber-700' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>
                                        Question Match: {suggestion.confidenceScore >= 80 ? 'Strong Signal' : suggestion.confidenceScore >= 50 ? 'Moderate Signal' : 'Weak Signal'}
                                      </span>
                                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-semibold border border-indigo-100">
                                        Source: Domain Catalog
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full p-5 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center mt-4">
                        <p className="text-sm text-gray-500">No reliable questions found for this Business View.</p>
                      </div>
                    )
                  )}

                  {analysisMode === "investigate" && (
                    !selectedBusinessView || !selectedViewData ? (
                      <div className="w-full p-8 bg-slate-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center text-center mt-4">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400">
                            <Layers className="w-6 h-6" />
                          </div>
                          <h3 className="text-sm font-semibold text-gray-900">Workspace Locked</h3>
                          <p className="text-xs text-gray-500 max-w-[250px]">Select a Perspective and Business View above to inspect relationships.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                            <Layers className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div>
                            <h3 className="text-[16px] font-semibold text-gray-900">Business View Inspector</h3>
                            <p className="text-[13px] text-gray-500">Inspecting: {selectedViewData.label}</p>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
                          <div>
                            <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1">Purpose</h4>
                            <p className="text-[14px] text-slate-800">{selectedViewData.description}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <h4 className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2">Evidence</h4>
                              <ul className="space-y-1">
                                {selectedViewData.evidence.map((ev, i) => (
                                  <li key={i} className="text-[13px] text-slate-700 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                    {ev.label}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  )}

                  {analysisMode === "ask" && (
                    <div className="w-full p-5 bg-white border border-gray-200 rounded-xl shadow-sm space-y-4">
                      {selectedPerspective && (
                        <div className="flex gap-2 mb-2">
                          <span className="text-[10px] px-2 py-1 bg-purple-100 text-purple-800 font-semibold uppercase tracking-wider rounded">Detected Perspective: {selectedPerspective}</span>
                          {selectedViewData && (
                            <span className="text-[10px] px-2 py-1 bg-blue-100 text-blue-800 font-semibold uppercase tracking-wider rounded">Detected View: {selectedViewData.label}</span>
                          )}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3 mb-4">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">Ask anything about this dataset</h3>
                          <p className="text-xs text-gray-500">AI will generate an analysis plan based on the chosen perspective.</p>
                        </div>
                      </div>
                      
                      <div className="relative">
                        <textarea 
                          className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm min-h-[100px] resize-none"
                          placeholder="e.g. Can you show me the delivery status trend over time grouped by route?"
                        />
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-2">
                        <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors">
                          Clear
                        </button>
                        <button className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-purple-700 transition-colors flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Generate plan
                        </button>
                      </div>
                    </div>
                  )}

                </>
              ) : (
                currentDataset?.status === 'ready' && (
                  <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
                    <p className="text-sm text-amber-800 flex items-center">
                      <Search className="w-4 h-4 mr-2" />
                      No columns detected. Cannot suggest analysis capabilities.
                    </p>
                  </div>
                )
              )}


              {currentDataset?.status !== 'ready' && (
                <>
                  {/* Suggested Actions */}
                  <div>
                    <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-4">{homeGuidance.sections.suggestedActions}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {homeGuidance.homeStates.noData.actions.map(a => ({ id: "", label: a })).map((action, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => {
                            if (action.id && homeGuidance.actionPreviews[action.id as keyof typeof homeGuidance.actionPreviews]) {
                              setPreviewActionId(previewActionId === action.id ? null : action.id);
                            } else {
                              askQuestion(action.label);
                            }
                          }} 
                          className={`p-4 bg-white border rounded-xl text-left transition-all group flex items-center justify-between shadow-sm ${previewActionId === action.id ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
                        >
                          <span className="text-[14px] font-medium text-gray-800 group-hover:text-emerald-600 transition-colors">{action.label}</span>
                          <ChevronRight className={`w-4 h-4 text-gray-300 transition-all ${previewActionId === action.id ? 'text-emerald-500 translate-x-0 opacity-100' : 'opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0'}`} />
                        </button>
                      ))}
                    </div>

                    {/* Action Preview Panel */}
                    <AnimatePresence>
                      {previewActionId && homeGuidance.actionPreviews[previewActionId as keyof typeof homeGuidance.actionPreviews] && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 overflow-hidden"
                        >
                          <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl flex flex-col gap-4">
                            {(() => {
                              const preview = homeGuidance.actionPreviews[previewActionId as keyof typeof homeGuidance.actionPreviews];
                              const actionLabel = "Ask Question";
                              return (
                                <>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Question</div>
                                      <div className="text-[13px] text-gray-900 font-medium leading-snug">{preview.question}</div>
                                    </div>
                                    <div>
                                      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Using</div>
                                      <div className="flex flex-wrap gap-1.5">
                                        {preview.using.map((field, i) => (
                                          <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 text-gray-600 rounded text-[11px]">{field}</span>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Expected Output</div>
                                      <div className="text-[13px] text-gray-600 leading-snug">{preview.expectedOutput}</div>
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-200">
                                    <button 
                                      onClick={() => setPreviewActionId(null)}
                                      className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-[13px] font-medium hover:bg-gray-50 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button 
                                      onClick={() => {
                                        setPreviewActionId(null);
                                        askQuestion(actionLabel);
                                      }}
                                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-[13px] font-medium hover:bg-gray-800 transition-colors flex items-center shadow-sm"
                                    >
                                      {preview.primaryAction} <ChevronRight className="w-4 h-4 ml-1" />
                                    </button>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Quick Start */}
                  <div>
                    <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-4">
                      {homeGuidance.sections.quickStartEmpty}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {homeGuidance.noDataCards.map((card, idx) => (
                        <button 
                          key={idx}
                          onClick={() => setSelectedTopic(card.title)}
                          className="text-left group transition-all rounded-xl p-4 bg-white shadow-sm hover:shadow-md"
                        >
                          <h4 className="text-[14px] font-semibold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">{card.title}</h4>
                          <p className="text-[13px] text-gray-500">{card.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Sidebar (Recent Insights) */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <div className="bg-white border border-transparent rounded-xl p-6 shadow-sm flex flex-col h-full">
                <h3 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-5 flex items-center">
                  <Search className="w-4 h-4 mr-2 text-gray-400" /> {homeGuidance.recentInsights.title}
                </h3>
                {homeGuidance.recentInsights.items.length > 0 ? (
                  <>
                    <div className="flex flex-col gap-4">
                      {homeGuidance.recentInsights.items.map((insight) => (
                        <div key={insight.id} className="flex flex-col gap-1 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                          <div className="flex justify-between items-start">
                            <span className="text-[13px] font-semibold text-gray-900">{insight.title}</span>
                            <span className="text-[11px] text-gray-400 whitespace-nowrap ml-2">{insight.timestamp}</span>
                          </div>
                          <p className="text-[13px] text-gray-500 leading-relaxed">{insight.description}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-auto pt-4 border-t border-gray-100 text-center">
                      <button className="text-[12px] font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                        {homeGuidance.recentInsights.viewHistoryAction}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center h-full opacity-60">
                    <p className="text-[13px] font-medium text-gray-900 mb-2">
                      {currentDataset ? homeGuidance.homeStates.dataLoaded.recentInsightsEmpty.title : homeGuidance.homeStates.noData.recentInsightsEmpty.title}
                    </p>
                    <p className="text-[12px] text-gray-500 max-w-[200px] leading-relaxed">
                      {currentDataset ? homeGuidance.homeStates.dataLoaded.recentInsightsEmpty.message : homeGuidance.homeStates.noData.recentInsightsEmpty.message}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {isAsking && (
          <div className="mt-16 flex flex-col items-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mb-3" />
            <p className="text-sm">Analyzing data and generating insights...</p>
          </div>
        )}

        {result && !isAsking && (
          <div className="w-full mt-4 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-6 mb-16">
            
            <div className="flex flex-col bg-white p-4 rounded-md border border-gray-200 shadow-sm w-full relative">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Execution Pipeline</div>
              <div className="flex items-center w-full">
                
                <div className="flex flex-col items-start px-2 w-1/4">
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Question</span>
                  <span className="text-[13px] text-gray-900 font-medium line-clamp-1" title={result.originalQuestion || "Analyzed Query"}>"{result.originalQuestion || "Analyzed Query"}"</span>
                </div>
                
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                
                <div className="flex flex-col items-start px-4 w-1/4">
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Template</span>
                  <span className="text-[13px] text-gray-900 font-medium">{result.template.name}</span>
                </div>
                
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                
                <div className="flex flex-col items-start px-4 w-1/4">
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Chart</span>
                  <span className="text-[13px] text-gray-900 font-medium capitalize">{result.chart.chart_type}</span>
                </div>
                
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                
                <div className="flex flex-col items-start pl-4 w-1/4">
                  <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1">Insight</span>
                  <span className="text-[13px] text-emerald-600 font-medium">{Math.round(result.insight.confidence * 100)}% Confidence</span>
                </div>
                
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 bg-white border border-transparent hover:border-gray-300 rounded-md p-5 shadow-sm flex flex-col transition-colors border-gray-200">
                <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Key Insight
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed flex-1">
                  {result.insight.observation_text}
                </p>
                <div className="mt-4 pt-3 border-t border-gray-100 text-[12px] text-gray-500 flex justify-between items-center">
                  <span>Confidence Score</span>
                  <span className="font-medium text-emerald-600">{Math.round(result.insight.confidence * 100)}%</span>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white border border-transparent hover:border-gray-300 rounded-md p-5 shadow-sm flex flex-col transition-colors border-gray-200">
                <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-4">
                  {result.chart.theme_metadata.title}
                </h3>
                <div className="w-full flex-1 min-h-[300px]">
                  <ReactECharts 
                    option={getEChartsOption(result.chart)} 
                    style={{ height: '100%', width: '100%' }} 
                    notMerge={true}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-100 pt-8 flex flex-col items-center">
              <h3 className="text-xl font-medium text-gray-900 mb-6">{homeGuidance.sections.followUpActions}</h3>
              <div className="flex flex-wrap gap-3 justify-center">
                {homeGuidance.homeStates.analysisReady.actions.map((suggestion, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => {
                      if (suggestion.startsWith("Compare") || suggestion.startsWith("Explain")) askQuestion(suggestion);
                    }} 
                    className="px-5 py-2.5 bg-white border border-gray-200 rounded-md text-[14px] font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
            
          </div>
        )}
      </div>


      {recipePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
          <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-lg animate-in fade-in zoom-in-95 flex flex-col gap-6">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                <Code className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recipe Preview</h3>
                <p className="text-sm text-gray-500">Plan formulation from question</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Question</span>
                <p className="text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {recipePreview.question}
                </p>
              </div>
              
              <div>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Plan (AST)</span>
                <div className="bg-gray-900 rounded-lg p-4 text-[13px] font-mono text-gray-300 overflow-x-auto">
                  <pre>{JSON.stringify(recipePreview.intent, null, 2)}</pre>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-md font-medium">
                Status: Preview only. Execution engine not connected yet.
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setRecipePreview(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => setRecipePreview(null)}
                className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-md shadow-sm transition-colors"
              >
                Confirm later
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedVirtualPlan && !runtimePreview && !executionGuardResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 animate-in fade-in zoom-in-95">
            <VirtualDatasetPlanPreview
              plan={selectedVirtualPlan}
              onClose={() => setSelectedVirtualPlan(null)}
              onPrepare={() => {
                const preview = createRuntimePreview(selectedVirtualPlan);
                setRuntimePreview(preview);
              }}
            />
          </div>
        </div>
      )}

      {runtimePreview && !executionGuardResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 animate-in fade-in zoom-in-95">
            <RuntimePreviewCard
              preview={runtimePreview}
              onReviewAgain={() => {
                setRuntimePreview(null);
              }}
              onAcceptPlan={() => {
                setAcceptedRuntimePreview(runtimePreview);
                const guardResult = evaluateExecutionGuard({
                  preview: runtimePreview,
                  previewAccepted: true,
                  plan: selectedVirtualPlan,
                  workspaceState: workspaceState || undefined
                });
                setExecutionGuardResult(guardResult);
                setRuntimePreview(null);
              }}
            />
          </div>
        </div>
      )}

      {executionGuardResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 animate-in fade-in zoom-in-95">
            <ExecutionGuardNotice
              result={executionGuardResult}
              onReviewPlan={() => {
                setExecutionGuardResult(null);
                setAcceptedRuntimePreview(null);
                setSelectedVirtualPlan(null); // Completely reset plan state
              }}
              onContinue={() => {
                if (selectedVirtualPlan && acceptedRuntimePreview && executionGuardResult) {
                  const logicalPlan = createDuckDBLogicalPlan({
                    plan: selectedVirtualPlan,
                    preview: acceptedRuntimePreview,
                    guard: executionGuardResult
                  });
                  setSelectedLogicalPlan(logicalPlan);
                  
                  // Phase M.5 + Phase N: Also generate the boundary artifact and expected result
                  const businessView = workspaceState?.businessViewState?.confirmedBusinessViews.find(v => v.id === selectedVirtualPlan.businessViewId);
                  const question = businessView?.suggestedQuestions.find(q => q.id === selectedVirtualPlan.questionId);
                  
                  if (businessView && question) {
                     const artifact = createRuntimeBoundaryArtifact({
                        businessView,
                        question,
                        virtualPlan: selectedVirtualPlan,
                        runtimePreview: acceptedRuntimePreview,
                        executionGuard: executionGuardResult,
                        logicalPlan,
                        runtimePreviewAccepted: true
                     });
                     setRuntimeBoundaryArtifact(artifact);
                     
                     const expectedResult = createExpectedResultContract({
                       question,
                       businessView,
                       logicalPlan
                     });
                     setExpectedResultContract(expectedResult);
                     
                     // Phase O: Compile safe query right after
                     const compiledQuery = compileSafeQuery({
                        artifact,
                        expectedResult
                     });
                     setCompiledQueryContract(compiledQuery);
                     
                     // Phase P: Generate Sandbox policy
                     const request = createSandboxExecutionRequest({
                        compiledQuery,
                        boundaryArtifact: artifact,
                        expectedResult
                     });
                     const evaluation = evaluateSandboxPolicy({
                        request,
                        compiledQuery,
                        boundaryArtifact: artifact,
                        expectedResult
                     });
                     setSandboxRequest(request);
                     setSandboxEvaluation(evaluation);
                  }
                }
                setExecutionGuardResult(null);
                setSelectedVirtualPlan(null); // Handed off, reset ui
              }}
            />
          </div>
        </div>
      )}

      {selectedLogicalPlan && !expectedResultContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 animate-in fade-in zoom-in-95">
            <DuckDBLogicalPlanPreview
              plan={selectedLogicalPlan}
              onClose={() => setSelectedLogicalPlan(null)}
            />
          </div>
        </div>
      )}

      {expectedResultContract && !compiledQueryContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 animate-in fade-in zoom-in-95">
            <ExpectedResultPreview
              contract={expectedResultContract}
              questionText={workspaceState?.businessViewState?.confirmedBusinessViews.find(v => v.id === expectedResultContract.businessViewId)?.suggestedQuestions.find(q => q.id === expectedResultContract.questionId)?.question || "Target Question"}
              onClose={() => {
                setExpectedResultContract(null);
                setSelectedLogicalPlan(null);
              }}
            />
          </div>
        </div>
      )}

      {compiledQueryContract && !sandboxRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 animate-in fade-in zoom-in-95">
            <CompiledQueryPreview
              contract={compiledQueryContract}
              onClose={() => {
                setCompiledQueryContract(null);
                setExpectedResultContract(null);
                setSelectedLogicalPlan(null);
              }}
            />
          </div>
        </div>
      )}

      {sandboxRequest && sandboxEvaluation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-2xl my-8 animate-in fade-in zoom-in-95">
            <SandboxPolicyPreview
              request={sandboxRequest}
              evaluation={sandboxEvaluation}
              onClose={() => {
                setSandboxRequest(null);
                setSandboxEvaluation(null);
                setCompiledQueryContract(null);
                setExpectedResultContract(null);
                setSelectedLogicalPlan(null);
              }}
              onContinue={() => {
                // Phase Q: Prepare the expected preview result contract before runtime
                if (compiledQueryContract && expectedResultContract && sandboxRequest && sandboxEvaluation) {
                   const previewContract = createPreviewResultContract({
                      compiledQuery: compiledQueryContract,
                      expectedResult: expectedResultContract,
                      sandboxRequest,
                      sandboxEvaluation
                   });
                   setPreviewResultContract(previewContract);
                }
              }}
            />
          </div>
        </div>
      )}

      {previewResultContract && expectedResultContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
          <div className="w-full max-w-4xl my-8 animate-in fade-in zoom-in-95 grid grid-cols-1 gap-6">
            <PreviewResultContractCard
              contract={previewResultContract}
              expectedResult={expectedResultContract}
              onClose={() => {
                setPreviewResultContract(null);
                setSandboxRequest(null);
                setSandboxEvaluation(null);
                setCompiledQueryContract(null);
                setExpectedResultContract(null);
                setSelectedLogicalPlan(null);
              }}
              onContinue={() => {
                // Now we don't reset state here because we continue to preview runtime below
              }}
            />
            {businessConfidenceResult && (
              <div className="space-y-6">
                
                {!previewRuntimeResult ? (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        if (
                          runtimeBoundaryArtifact &&
                          expectedResultContract &&
                          compiledQueryContract &&
                          sandboxRequest &&
                          sandboxEvaluation &&
                          previewResultContract
                        ) {
                          const res = executeDuckDBPreviewRuntime({
                            artifact: runtimeBoundaryArtifact,
                            expectedResult: expectedResultContract,
                            compiledQuery: compiledQueryContract,
                            sandboxRequest,
                            sandboxEvaluation,
                            previewContract: previewResultContract,
                            businessConfidence: businessConfidenceResult
                          });
                          setPreviewRuntimeResult(res);

                          const valRes = validatePreviewRuntimeResult({
                            expectedResult: expectedResultContract,
                            previewResult: res
                          });
                          setResultValidationResult(valRes);
                        }
                      }}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition shadow-lg border border-blue-500/50 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Run limited preview
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <DuckDBPreviewRuntimeCard result={previewRuntimeResult} />
                    {resultValidationResult && <ResultValidationCard result={resultValidationResult} />}
                    <div className="text-sm text-gray-500 italic mt-2 text-center">
                      Business Confidence remains provisional as Coverage signal is not available yet.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
