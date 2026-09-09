import { Check, Table, BarChart2, PieChart } from 'lucide-react';
import { homeGuidance } from '../../content/home-guidance';
import { detectDatasetDomain } from '../../lib/dataset-capabilities';

interface DatasetSummaryStepProps {
  config: any;
  onClose: () => void;
}

export function DatasetSummaryStep({ config, onClose }: DatasetSummaryStepProps) {
  // Mock data for the summary
  const mockColumns = ["branch", "product", "revenue", "category", "date", "quantity", "profit"];
  const mockMeasures = ["Revenue", "Quantity", "Profit"];
  const mockDimensions = ["Branch", "Product", "Category", "Date"];
  const mockRows = "25,431";
  
  const detectedDomainResult = detectDatasetDomain(mockColumns);
  const summaryCopy = homeGuidance.datasetSummary;

  return (
    <div className="mx-auto w-full space-y-8 py-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border-l-2 border-green-400 bg-green-50">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-3xl font-semibold text-gray-900">{summaryCopy.title}</h2>
        <p className="text-lg text-gray-500">
          Connected to {config?.title || "Data Source"}
        </p>
      </div>

      {/* Dataset Metadata */}
      <div className="flex items-center justify-center space-x-12 border-y border-[var(--lb-divider)] bg-white py-6">
        <div className="text-center">
          <p className="text-3xl font-bold text-gray-900">{mockRows}</p>
          <p className="text-sm text-gray-500 uppercase tracking-wide font-medium mt-1">Rows</p>
        </div>
        <div className="w-px h-12 bg-gray-200"></div>
        <div className="text-center">
          <p className="text-3xl font-bold text-gray-900">{mockColumns.length}</p>
          <p className="text-sm text-gray-500 uppercase tracking-wide font-medium mt-1">Columns</p>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Opportunities */}
        <div className="border-y border-[var(--lb-divider)] bg-gray-50 px-3 py-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart2 className="w-4 h-4 mr-2 text-blue-500" />
            {summaryCopy.opportunitiesTitle}
          </h3>
          <ul className="space-y-3">
            {detectedDomainResult.suggestedActions.slice(0, 4).map((action, idx) => {
              return (
                <li key={idx} className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900 flex items-center">
                    <Check className="w-3.5 h-3.5 mr-2 text-green-500 flex-shrink-0" />
                    {action}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Measures */}
        <div className="border-y border-[var(--lb-divider)] bg-gray-50 px-3 py-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="w-4 h-4 mr-2 text-purple-500" />
            {summaryCopy.measuresTitle}
          </h3>
          <div className="flex flex-wrap gap-2">
            {mockMeasures.map(m => (
              <span key={m} className="border-l-2 border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Dimensions */}
        <div className="border-y border-[var(--lb-divider)] bg-gray-50 px-3 py-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Table className="w-4 h-4 mr-2 text-orange-500" />
            {summaryCopy.dimensionsTitle}
          </h3>
          <div className="flex flex-wrap gap-2">
            {mockDimensions.map(d => (
              <span key={d} className="border-l-2 border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700">
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
        <button
          onClick={onClose}
          className="lb-control w-full px-8 py-3 text-base font-medium text-gray-700 sm:w-auto"
        >
          {summaryCopy.viewDataset}
        </button>
        <button
          onClick={onClose}
          className="lb-action-primary w-full px-8 py-3 text-base sm:w-auto"
        >
          {summaryCopy.startExploring}
        </button>
      </div>
    </div>
  );
}
