import React from 'react';
import { Code } from 'lucide-react';
import { VirtualDatasetPlanPreview } from '../analysis/VirtualDatasetPlanPreview';
import { RuntimePreviewCard } from '../analysis/RuntimePreviewCard';
import { ExecutionGuardNotice } from '../analysis/ExecutionGuardNotice';
import { DuckDBLogicalPlanPreview } from '../analysis/DuckDBLogicalPlanPreview';
import { ExpectedResultPreview } from '../analysis/ExpectedResultPreview';
import { CompiledQueryPreview } from '../analysis/CompiledQueryPreview';
import { SandboxPolicyPreview } from '../analysis/SandboxPolicyPreview';
import { PreviewResultContractCard } from '../analysis/PreviewResultContractCard';

export const HomePlanningDialogs: React.FC<{ workflow: any }> = ({ workflow }) => (
  <>
    {workflow.recipePreview && <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
      <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-6 w-full max-w-lg animate-in fade-in zoom-in-95 flex flex-col gap-6">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center"><Code className="w-5 h-5 text-indigo-600" /></div>
          <div><h3 className="text-lg font-semibold text-gray-900">Recipe Preview</h3><p className="text-sm text-gray-500">Plan formulation from question</p></div>
        </div>
        <div className="space-y-4">
          <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Question</span><p className="text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">{workflow.recipePreview.question}</p></div>
          <div><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Plan (AST)</span><div className="bg-gray-900 rounded-lg p-4 text-[13px] font-mono text-gray-300 overflow-x-auto"><pre>{JSON.stringify(workflow.recipePreview.intent, null, 2)}</pre></div></div>
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-md font-medium">Status: Preview only. Execution engine not connected yet.</div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => workflow.setRecipePreview(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors">Cancel</button>
          <button onClick={() => workflow.setRecipePreview(null)} className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-md shadow-sm transition-colors">Confirm later</button>
        </div>
      </div>
    </div>}
    {workflow.selectedVirtualPlan && !workflow.runtimePreview && !workflow.executionGuardResult && <Dialog width="max-w-2xl"><VirtualDatasetPlanPreview plan={workflow.selectedVirtualPlan} onClose={() => workflow.setSelectedVirtualPlan(null)} onPrepare={workflow.prepareRuntimePreview} /></Dialog>}
    {workflow.runtimePreview && !workflow.executionGuardResult && <Dialog width="max-w-2xl"><RuntimePreviewCard preview={workflow.runtimePreview} onReviewAgain={workflow.reviewRuntimePreview} onAcceptPlan={workflow.acceptRuntimePreview} /></Dialog>}
    {workflow.executionGuardResult && <Dialog width="max-w-2xl"><ExecutionGuardNotice result={workflow.executionGuardResult} onReviewPlan={workflow.reviewExecutionPlan} onContinue={workflow.continueExecutionGuard} /></Dialog>}
    {workflow.selectedLogicalPlan && !workflow.expectedResultContract && <Dialog width="max-w-2xl"><DuckDBLogicalPlanPreview plan={workflow.selectedLogicalPlan} onClose={workflow.closeLogicalPlan} /></Dialog>}
    {workflow.expectedResultContract && !workflow.compiledQueryContract && <Dialog width="max-w-2xl"><ExpectedResultPreview contract={workflow.expectedResultContract} questionText={workflow.expectedQuestionText} onClose={workflow.closeExpectedResult} /></Dialog>}
    {workflow.compiledQueryContract && !workflow.sandboxRequest && <Dialog width="max-w-2xl"><CompiledQueryPreview contract={workflow.compiledQueryContract} onClose={workflow.closeCompiledArtifacts} /></Dialog>}
    {workflow.sandboxRequest && workflow.sandboxEvaluation && <Dialog width="max-w-2xl"><SandboxPolicyPreview request={workflow.sandboxRequest} evaluation={workflow.sandboxEvaluation} onClose={workflow.closeSandbox} onContinue={workflow.continueSandbox} /></Dialog>}
    {workflow.previewResultContract && workflow.expectedResultContract && <Dialog width="max-w-4xl"><PreviewResultContractCard contract={workflow.previewResultContract} expectedResult={workflow.expectedResultContract} onClose={workflow.closePreviewResult} onContinue={workflow.closePreviewResult} /></Dialog>}
  </>
);

const Dialog: React.FC<{ width: string; children: React.ReactNode }> = ({ width, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4 overflow-y-auto">
    <div className={`w-full ${width} my-8 animate-in fade-in zoom-in-95`}>{children}</div>
  </div>
);
