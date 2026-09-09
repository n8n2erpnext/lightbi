import { useState } from 'react';
import { AlertTriangle, Check, Link as LinkIcon, Loader2 } from 'lucide-react';
import { createSourceCandidate, type SourceInspectionResult } from '../../lib/source-preflight';
import { inspectOnlineSource } from '../../lib/online-source-inspector';
import { useUiLanguage } from '../../lib/ui-language';

interface UrlStepProps {
  config: any;
  onClose: () => void;
  initialUrl?: string;
  onSourceInspected?: (result: SourceInspectionResult) => void | Promise<void>;
}

export function GoogleSheetsStep({ config, onClose, initialUrl, onSourceInspected }: UrlStepProps) {
  const { t, localize } = useUiLanguage();
  const [inputValue, setInputValue] = useState(initialUrl || "");
  const [isInspecting, setIsInspecting] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<SourceInspectionResult | null>(null);
  const [isUsingDataset, setIsUsingDataset] = useState(false);
  const [useError, setUseError] = useState<string | null>(null);

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

  const handleUseDataset = async () => {
    if (inspectionResult?.status !== "accessible") return;
    setIsUsingDataset(true);
    setUseError(null);
    try {
      await onSourceInspected?.(inspectionResult);
      onClose();
    } catch (error) {
      setUseError(error instanceof Error ? localize(error.message) : t("Could not save this online source."));
    } finally {
      setIsUsingDataset(false);
    }
  };

  return (
    <div className="mx-auto w-full py-6">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900">{t(config.title)}</h2>
        {config.description && (
          <p className="text-gray-500">{t(config.description)}</p>
        )}
      </div>

      <div className="space-y-3 border-y border-[var(--lb-divider)] bg-white py-5">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <LinkIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="url"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="lb-control w-full pl-12 pr-4 py-3 text-base"
            placeholder="https://"
          />
        </div>
        {config.example && (
          <p className="text-sm text-gray-500 ml-1">{t("Example")}: {config.example}</p>
        )}
      </div>

      {isInspecting && (
        <div className="flex items-center gap-2 border-l-2 border-blue-400 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("Inspecting source and sampling rows...")}
        </div>
      )}

      {inspectionResult && inspectionResult.status !== "accessible" && (
        <div className="flex items-start gap-3 border-l-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">
              {localize(inspectionResult.status.replace(/_/g, " "))}
            </p>
            <p className="mt-1">{localize(inspectionResult.message)}</p>
          </div>
        </div>
      )}

      {inspectionResult?.status === "accessible" && (
        <div className="border-y border-emerald-200 bg-emerald-50/60 py-4">
          <div className="mb-3 flex items-center gap-2 text-emerald-800">
            <Check className="h-4 w-4" />
            <span className="text-sm font-semibold">{t("Source inspected")}</span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-emerald-200 border-y border-emerald-200 text-sm">
            <div className="bg-white/70 px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("Rows")}</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{inspectedRowCount.toLocaleString()}</p>
            </div>
            <div className="bg-white/70 px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("Columns")}</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{inspectedColumnCount.toLocaleString()}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-emerald-700">
            {t("LightBI will use a representative sample for quick understanding.")}
          </p>
        </div>
      )}

      {useError && <div className="border-l-2 border-red-400 bg-red-50 px-4 py-3 text-sm text-red-700">{useError}</div>}

      <div className="pt-4 flex justify-end">
        {inspectionResult?.status === "accessible" ? (
          <button
            onClick={handleUseDataset}
            disabled={isUsingDataset}
            className="lb-action-primary w-full px-6 py-3 text-base sm:w-auto"
          >
            {isUsingDataset ? t("Saving source...") : t("Use this dataset")}
          </button>
        ) : (
          <button
          onClick={handleContinue}
          disabled={!inputValue || isInspecting}
          className="lb-action-primary w-full px-6 py-3 text-base disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
            {isInspecting ? t("Inspecting...") : t(config.buttonText || "Continue")}
          </button>
        )}
      </div>
    </div>
  );
}
