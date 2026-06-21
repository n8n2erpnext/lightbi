import React from 'react';
import { BarChart2, TrendingUp, PieChart, GitMerge } from 'lucide-react';
import type { AnalysisAction } from '../../lib/analysis-opportunity-actions';

export interface AnalysisOpportunityCardProps {
  action: AnalysisAction;
  isSelected?: boolean;
  onSelect: (action: AnalysisAction) => void;
}

export const AnalysisOpportunityCard: React.FC<AnalysisOpportunityCardProps> = ({ action, isSelected, onSelect }) => {
  const getIcon = () => {
    switch (action.actionType) {
      case 'trend': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'distribution': return <PieChart className="w-4 h-4 text-purple-500" />;
      case 'relationship': return <GitMerge className="w-4 h-4 text-emerald-500" />;
      case 'group_by':
      default: return <BarChart2 className="w-4 h-4 text-indigo-500" />;
    }
  };

  const getLabel = () => {
    switch (action.actionType) {
      case 'trend': return 'Trend';
      case 'distribution': return 'Distribution';
      case 'relationship': return 'Relationship';
      case 'group_by':
      default: return 'Group By';
    }
  };

  return (
    <div 
      role="button"
      tabIndex={0}
      onClick={() => onSelect(action)}
      className={`relative p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 group ${
        isSelected 
          ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-500' 
          : 'border-gray-200 bg-white hover:border-indigo-200 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="p-1.5 bg-gray-50 border border-gray-100 rounded-md shadow-sm flex-shrink-0">
          {getIcon()}
        </div>
        <h4 className="text-[13px] font-semibold text-gray-900 leading-tight flex-grow mt-0.5">{action.label}</h4>
      </div>
      
      <p className="text-[12px] text-gray-500 mt-1">{action.description}</p>
      
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100/60">
        <div className="flex items-center gap-2 text-[10px] font-medium text-gray-500">
          <span className="bg-gray-100 px-1.5 py-0.5 rounded">Type: {getLabel()}</span>
          <span>Conf: {Math.round(action.confidenceScore)}%</span>
        </div>
        
        <button 
          className={`text-[11px] font-semibold px-2.5 py-1 rounded transition-colors ${
            isSelected 
              ? 'bg-indigo-600 text-white shadow-sm' 
              : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
          }`}
        >
          {isSelected ? 'Selected' : 'Investigate'}
        </button>
      </div>
    </div>
  );
};
