import { useState } from 'react';
import { HardDrive } from 'lucide-react';
import { DatasetSummaryStep } from './DatasetSummaryStep';

interface OptionsStepProps {
  config: any;
  onClose: () => void;
}

export function WarehouseStep({ config, onClose }: OptionsStepProps) {
  const [step, setStep] = useState<"input" | "summary">("input");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {config.options?.map((opt: any) => (
          <label 
            key={opt.id} 
            className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
              selectedOption === opt.id 
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="connection_option"
              value={opt.id}
              checked={selectedOption === opt.id}
              onChange={() => setSelectedOption(opt.id)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <span className="ml-3 text-base font-medium text-gray-900 flex items-center">
              <HardDrive className="w-4 h-4 mr-2 text-gray-400" />
              {opt.label}
            </span>
          </label>
        ))}
      </div>

      <div className="pt-6 flex justify-end">
        <button
          onClick={handleContinue}
          disabled={!selectedOption}
          className="px-6 py-3 bg-gray-900 text-white text-base font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
        >
          {config.buttonText || "Continue"}
        </button>
      </div>
    </div>
  );
}
