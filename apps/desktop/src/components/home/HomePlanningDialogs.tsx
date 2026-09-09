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
    {workflow.recipePreview && <Dialog width="max-w-[var(--lb-dialog-width)]">
      <div className="border-y border-[var(--lb-divider)] bg-white">
        <div className="flex items-center gap-3 border-b border-[var(--lb-divider)] px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center border-l-2 border-indigo-500 bg-indigo-50"><Code className="h-4 w-4 text-indigo-600" /></div>
          <div><h3 className="text-[16px] font-semibold text-gray-900">Recipe Preview</h3><p className="text-[12px] text-gray-500">Plan formulation from question</p></div>
        </div>
        <div className="divide-y divide-[var(--lb-divider)] px-5">
          <div className="py-4"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Question</span><p className="text-[13px] font-medium leading-5 text-gray-900">{workflow.recipePreview.question}</p></div>
          <div className="py-4"><span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Plan (AST)</span><div className="overflow-x-auto bg-gray-950 p-4 text-[12px] font-mono text-gray-300"><pre>{JSON.stringify(workflow.recipePreview.intent, null, 2)}</pre></div></div>
          <div className="border-l-2 border-amber-400 bg-amber-50 px-3 py-3 text-xs font-medium text-amber-800">Status: Preview only. Execution engine not connected yet.</div>
        </div>
        <div className="flex justify-end gap-3 border-t border-[var(--lb-divider)] px-5 py-4">
          <button onClick={() => workflow.setRecipePreview(null)} className="px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-black/[0.035]">Cancel</button>
          <button onClick={() => workflow.setRecipePreview(null)} className="lb-action-primary">Confirm later</button>
        </div>
      </div>
    </Dialog>}
    {workflow.selectedVirtualPlan && !workflow.runtimePreview && !workflow.executionGuardResult && <Dialog><VirtualDatasetPlanPreview plan={workflow.selectedVirtualPlan} onClose={() => workflow.setSelectedVirtualPlan(null)} onPrepare={workflow.prepareRuntimePreview} /></Dialog>}
    {workflow.runtimePreview && !workflow.executionGuardResult && <Dialog><RuntimePreviewCard preview={workflow.runtimePreview} onReviewAgain={workflow.reviewRuntimePreview} onAcceptPlan={workflow.acceptRuntimePreview} /></Dialog>}
    {workflow.executionGuardResult && <Dialog><ExecutionGuardNotice result={workflow.executionGuardResult} onReviewPlan={workflow.reviewExecutionPlan} onContinue={workflow.continueExecutionGuard} /></Dialog>}
    {workflow.selectedLogicalPlan && !workflow.expectedResultContract && <Dialog><DuckDBLogicalPlanPreview plan={workflow.selectedLogicalPlan} onClose={workflow.closeLogicalPlan} /></Dialog>}
    {workflow.expectedResultContract && !workflow.compiledQueryContract && <Dialog><ExpectedResultPreview contract={workflow.expectedResultContract} questionText={workflow.expectedQuestionText} onClose={workflow.closeExpectedResult} /></Dialog>}
    {workflow.compiledQueryContract && !workflow.sandboxRequest && <Dialog><CompiledQueryPreview contract={workflow.compiledQueryContract} onClose={workflow.closeCompiledArtifacts} /></Dialog>}
    {workflow.sandboxRequest && workflow.sandboxEvaluation && <Dialog><SandboxPolicyPreview request={workflow.sandboxRequest} evaluation={workflow.sandboxEvaluation} onClose={workflow.closeSandbox} onContinue={workflow.continueSandbox} /></Dialog>}
    {workflow.previewResultContract && workflow.expectedResultContract && <Dialog width="max-w-5xl"><PreviewResultContractCard contract={workflow.previewResultContract} expectedResult={workflow.expectedResultContract} onClose={workflow.closePreviewResult} onContinue={workflow.closePreviewResult} /></Dialog>}
  </>
);

const Dialog: React.FC<{ width?: string; children: React.ReactNode }> = ({ width = 'max-w-[var(--lb-dialog-width)]', children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/40 px-4 py-8 backdrop-blur-sm md:px-8">
    <div className={`my-8 w-full ${width} animate-in fade-in zoom-in-95`}>{children}</div>
  </div>
);
