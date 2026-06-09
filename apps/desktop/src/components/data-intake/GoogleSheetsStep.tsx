import { useState } from 'react';
import { Link as LinkIcon } from 'lucide-react';
import { DatasetSummaryStep } from './DatasetSummaryStep';

interface UrlStepProps {
  config: any;
  onClose: () => void;
  initialUrl?: string;
}

export function GoogleSheetsStep({ config, onClose, initialUrl }: UrlStepProps) {
  const [step, setStep] = useState<"input" | "summary">("input");
  const [inputValue, setInputValue] = useState(initialUrl || "");

  const handleContinue = () => {
    setStep("summary");
  };

  if (step === "summary") {
    return <DatasetSummaryStep config={config} onClose={onClose} />;
  }

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

      <div className="pt-4 flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!inputValue}
          className="px-6 py-3 bg-gray-900 text-white text-base font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
        >
          {config.buttonText || "Continue"}
        </button>
      </div>
    </div>
  );
}
