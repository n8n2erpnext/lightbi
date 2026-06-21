import { useState } from 'react';
import { AlertTriangle, Check, Link as LinkIcon, Loader2 } from 'lucide-react';
import { createSourceCandidate, type SourceInspectionResult } from '../../lib/source-preflight';
import { inspectOnlineSource } from '../../lib/online-source-inspector';

interface UrlStepProps {
  config: any;
  onClose: () => void;
  initialUrl?: string;
  onSourceInspected?: (result: SourceInspectionResult) => void;
}

export function GoogleSheetsStep({ config, onClose, initialUrl, onSourceInspected }: UrlStepProps) {
  const [inputValue, setInputValue] = useState(initialUrl || "");
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<SourceInspectionResult | null>(null);

  const accessibleMetadata = inspectionResult?.status === "accessible"
    ? inspectionResult.metadata
    : null;
  const defaultSheet = accessibleMetadata?.is_workbook && accessibleMetadata.default_sheet && accessibleMetadata.sheets
    ? accessibleMetadata.sheets[accessibleMetadata.default_sheet]
    : null;
  const inspectedRowCount = defaultSheet?.rows_count ?? accessibleMetadata?.rows_count ?? 0;
  const inspectedColumnCount = defaultSheet?.columns?.length ?? accessibleMetadata?.columns?.length ?? 0;

  const handleContinue = async () => {
    const candidateOrError = createSourceCandidate(inputValue);
    if ('status' in candidateOrError) {
      setInspectionResult(candidateOrError);
      return;
    }

    setIsInspecting(true);
    setInspectionResult(null);
    const result = await inspectOnlineSource(candidateOrError);
    setInspectionResult(result);
    setIsInspecting(false);
  };

  const handleUseDataset = () => {
    if (inspectionResult?.status !== "accessible") return;
    onSourceInspected?.(inspectionResult);
    onClose();
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto py-8">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900">{config.title}</h2>
        {config.description && (
          <p className="text-gray-500">{config.description}</p>
        )}
      </div>

      <div className="space-y-3 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <LinkIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="url"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
            placeholder="https://"
          />
        </div>
        {config.example && (
          <p className="text-sm text-gray-500 ml-1">Example: {config.example}</p>
        )}
      </div>

      {isInspecting && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Inspecting source and sampling rows...
        </div>
      )}

      {inspectionResult && inspectionResult.status !== "accessible" && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">
              {inspectionResult.status.replace(/_/g, " ")}
            </p>
            <p className="mt-1">{inspectionResult.message}</p>
          </div>
        </div>
      )}

      {inspectionResult?.status === "accessible" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-emerald-800">
            <Check className="h-4 w-4" />
            <span className="text-sm font-semibold">Source inspected</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Rows</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{inspectedRowCount.toLocaleString()}</p>
            </div>
            <div className="rounded-lg bg-white p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Columns</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{inspectedColumnCount.toLocaleString()}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-emerald-700">
            LightBI will use a representative sample for quick understanding.
          </p>
        </div>
      )}

      <div className="pt-4 flex justify-end">
        {inspectionResult?.status === "accessible" ? (
          <button
            onClick={handleUseDataset}
            className="px-6 py-3 bg-blue-600 text-white text-base font-medium rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
          >
            Use this dataset
          </button>
        ) : (
          <button
          onClick={handleContinue}
          disabled={!inputValue || isInspecting}
          className="px-6 py-3 bg-gray-900 text-white text-base font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
        >
            {isInspecting ? "Inspecting..." : config.buttonText || "Continue"}
          </button>
        )}
      </div>
    </div>
  );
}
