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
    <div className="space-y-8 max-w-4xl mx-auto py-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-3xl font-semibold text-gray-900">{summaryCopy.title}</h2>
        <p className="text-lg text-gray-500">
          Connected to {config?.title || "Data Source"}
        </p>
      </div>

      {/* Dataset Metadata */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-center space-x-12">
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
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
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
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="w-4 h-4 mr-2 text-purple-500" />
            {summaryCopy.measuresTitle}
          </h3>
          <div className="flex flex-wrap gap-2">
            {mockMeasures.map(m => (
              <span key={m} className="px-2.5 py-1 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700">
                {m}
              </span>
            ))}
          </div>
        </div>

        {/* Dimensions */}
        <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Table className="w-4 h-4 mr-2 text-orange-500" />
            {summaryCopy.dimensionsTitle}
          </h3>
          <div className="flex flex-wrap gap-2">
            {mockDimensions.map(d => (
              <span key={d} className="px-2.5 py-1 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-700">
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
          className="px-8 py-3 bg-white border border-gray-300 text-gray-700 text-base font-medium rounded-lg hover:bg-gray-50 transition-colors w-full sm:w-auto"
        >
          {summaryCopy.viewDataset}
        </button>
        <button
          onClick={onClose}
          className="px-8 py-3 bg-blue-600 text-white text-base font-medium rounded-lg hover:bg-blue-700 shadow-sm transition-colors w-full sm:w-auto"
        >
          {summaryCopy.startExploring}
        </button>
      </div>
    </div>
  );
}
