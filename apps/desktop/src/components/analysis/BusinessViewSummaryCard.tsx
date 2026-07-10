import { Layers, CheckCircle2, Link as LinkIcon, Box, BrainCircuit } from 'lucide-react';
import { useDisplayPreferences } from '../../stores/display-preferences-store';
import { formatValue } from '../../lib/display-formatter';

interface BusinessViewSummaryProps {
  title: string;
  purpose: string;
  evidence: string[];
  relationships: string[];
  coverage: {
    datasets: number;
    businessKeys: number;
    views: number;
  };
  belief: string;
}

export function BusinessViewSummaryCard({ title, purpose, evidence, relationships, coverage, belief }: BusinessViewSummaryProps) {
  const { preferences } = useDisplayPreferences();

  return (
    <div className="w-full bg-white border border-indigo-100 rounded-2xl shadow-md overflow-hidden mb-8">
      <div className="bg-indigo-50 border-b border-indigo-100 p-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        </div>
        <p className="text-sm font-medium text-indigo-900 mt-1">
          <span className="uppercase tracking-wider text-[11px] font-bold text-indigo-500 block mb-1">Purpose</span>
          {purpose}
        </p>
      </div>
      
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Detected Business Evidence</h3>
          <ul className="space-y-2">
            {evidence.map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Business Relationships</h3>
          <ul className="space-y-2">
            {relationships.map((rel, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                <LinkIcon className="w-4 h-4 text-indigo-400" />
                {rel}
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Box className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-600">{formatValue(coverage.datasets, 'number', preferences, { compact: true })} datasets connected</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-600">{formatValue(coverage.businessKeys, 'number', preferences, { compact: true })} business keys detected</span>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-600">{formatValue(coverage.views, 'number', preferences, { compact: true })} business view generated</span>
        </div>
      </div>
      
      <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-t border-indigo-100">
        <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-2">
          <BrainCircuit className="w-4 h-4" />
          What LightBI believes
        </h3>
        <p className="text-sm text-indigo-900 leading-relaxed font-medium">
          {belief}
        </p>
      </div>
    </div>
  );
}
