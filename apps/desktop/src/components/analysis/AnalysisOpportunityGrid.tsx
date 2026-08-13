import React from 'react';
import type { AnalysisAction } from '../../lib/analysis-opportunity-actions';
import { AnalysisOpportunityCard } from './AnalysisOpportunityCard';

export interface AnalysisOpportunityGridProps {
  actions: AnalysisAction[];
  selectedActionId?: string;
  onSelectAction: (action: AnalysisAction) => void;
}

export const AnalysisOpportunityGrid: React.FC<AnalysisOpportunityGridProps> = ({ actions, selectedActionId, onSelectAction }) => {
  if (actions.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
      {actions.map(action => (
        <AnalysisOpportunityCard 
          key={action.id} 
          action={action} 
          isSelected={action.id === selectedActionId}
          onSelect={onSelectAction} 
        />
      ))}
    </div>
  );
};
