import { useState } from 'react';
import type { WorkspaceUnderstandingState } from '../lib/workspace-understanding-state';
import type { RecipePlan } from '../lib/recipe-planner';
import type { VirtualDatasetPlan } from '../lib/virtual-dataset-planner';
import { createRuntimePreview, type RuntimePreview } from '../lib/runtime-preview';
import { evaluateExecutionGuard, type ExecutionGuardResult } from '../lib/execution-guard';
import { createDuckDBLogicalPlan, type DuckDBLogicalPlan } from '../lib/duckdb-logical-plan';
import { createRuntimeBoundaryArtifact } from '../lib/runtime-boundary-contract';
import { createExpectedResultContract, type ExpectedResultContract } from '../lib/expected-result-contract';
import { compileSafeQuery, type CompiledQueryContract } from '../lib/safe-sql-compiler';
import { createSandboxExecutionRequest, evaluateSandboxPolicy, type SandboxExecutionRequest, type SandboxEvaluationResult } from '../lib/runtime-sandbox-policy';
import { createPreviewResultContract, type PreviewResultContract } from '../lib/preview-result-contract';

export function useHomePlanningWorkflow(workspaceState: WorkspaceUnderstandingState | null) {
  const [recipePreview, setRecipePreview] = useState<RecipePlan | null>(null);
  const [selectedVirtualPlan, setSelectedVirtualPlan] = useState<VirtualDatasetPlan | null>(null);
  const [runtimePreview, setRuntimePreview] = useState<RuntimePreview | null>(null);
  const [acceptedRuntimePreview, setAcceptedRuntimePreview] = useState<RuntimePreview | null>(null);
  const [executionGuardResult, setExecutionGuardResult] = useState<ExecutionGuardResult | null>(null);
  const [selectedLogicalPlan, setSelectedLogicalPlan] = useState<DuckDBLogicalPlan | null>(null);
  const [expectedResultContract, setExpectedResultContract] = useState<ExpectedResultContract | null>(null);
  const [compiledQueryContract, setCompiledQueryContract] = useState<CompiledQueryContract | null>(null);
  const [sandboxRequest, setSandboxRequest] = useState<SandboxExecutionRequest | null>(null);
  const [sandboxEvaluation, setSandboxEvaluation] = useState<SandboxEvaluationResult | null>(null);
  const [previewResultContract, setPreviewResultContract] = useState<PreviewResultContract | null>(null);

  const closeCompiledArtifacts = () => {
    setCompiledQueryContract(null);
    setExpectedResultContract(null);
    setSelectedLogicalPlan(null);
  };
  const closeSandbox = () => {
    setSandboxRequest(null);
    setSandboxEvaluation(null);
    closeCompiledArtifacts();
  };
  const closePreviewResult = () => {
    setPreviewResultContract(null);
    closeSandbox();
  };

  const prepareRuntimePreview = () => {
    if (selectedVirtualPlan) setRuntimePreview(createRuntimePreview(selectedVirtualPlan));
  };
  const acceptRuntimePreview = () => {
    if (!runtimePreview) return;
    setAcceptedRuntimePreview(runtimePreview);
    setExecutionGuardResult(evaluateExecutionGuard({
      preview: runtimePreview, previewAccepted: true, plan: selectedVirtualPlan, workspaceState: workspaceState || undefined,
    }));
    setRuntimePreview(null);
  };
  const reviewExecutionPlan = () => {
    setExecutionGuardResult(null);
    setAcceptedRuntimePreview(null);
    setSelectedVirtualPlan(null);
  };
  const continueExecutionGuard = () => {
    if (selectedVirtualPlan && acceptedRuntimePreview && executionGuardResult) {
      const logicalPlan = createDuckDBLogicalPlan({ plan: selectedVirtualPlan, preview: acceptedRuntimePreview, guard: executionGuardResult });
      setSelectedLogicalPlan(logicalPlan);
      const businessView = workspaceState?.businessViewState?.confirmedBusinessViews.find(view => view.id === selectedVirtualPlan.businessViewId);
      const question = businessView?.suggestedQuestions.find(item => item.id === selectedVirtualPlan.questionId);
      if (businessView && question) {
        const artifact = createRuntimeBoundaryArtifact({
          businessView, question, virtualPlan: selectedVirtualPlan, runtimePreview: acceptedRuntimePreview,
          executionGuard: executionGuardResult, logicalPlan, runtimePreviewAccepted: true,
        });
        const expectedResult = createExpectedResultContract({ question, businessView, logicalPlan });
        const compiledQuery = compileSafeQuery({ artifact, expectedResult });
        const request = createSandboxExecutionRequest({ compiledQuery, boundaryArtifact: artifact, expectedResult });
        setExpectedResultContract(expectedResult);
        setCompiledQueryContract(compiledQuery);
        setSandboxRequest(request);
        setSandboxEvaluation(evaluateSandboxPolicy({ request, compiledQuery, boundaryArtifact: artifact, expectedResult }));
      }
    }
    setExecutionGuardResult(null);
    setSelectedVirtualPlan(null);
  };
  const continueSandbox = () => {
    if (compiledQueryContract && expectedResultContract && sandboxRequest && sandboxEvaluation) {
      setPreviewResultContract(createPreviewResultContract({ compiledQuery: compiledQueryContract, expectedResult: expectedResultContract, sandboxRequest, sandboxEvaluation }));
    }
  };

  const expectedQuestionText = expectedResultContract
    ? workspaceState?.businessViewState?.confirmedBusinessViews.find(view => view.id === expectedResultContract.businessViewId)?.suggestedQuestions.find(question => question.id === expectedResultContract.questionId)?.question || 'Target Question'
    : 'Target Question';

  return {
    recipePreview, setRecipePreview, selectedVirtualPlan, setSelectedVirtualPlan, runtimePreview,
    executionGuardResult, selectedLogicalPlan, expectedResultContract, compiledQueryContract,
    sandboxRequest, sandboxEvaluation, previewResultContract, expectedQuestionText,
    prepareRuntimePreview, reviewRuntimePreview: () => setRuntimePreview(null), acceptRuntimePreview,
    reviewExecutionPlan, continueExecutionGuard, closeLogicalPlan: () => setSelectedLogicalPlan(null),
    closeExpectedResult: () => { setExpectedResultContract(null); setSelectedLogicalPlan(null); },
    closeCompiledArtifacts, closeSandbox, continueSandbox, closePreviewResult,
  };
}
