import React, { useState } from 'react';
import { DataUnderstandingSummary } from './DataUnderstandingSummary';
import { BusinessViewReviewCard } from './BusinessViewReviewCard';
import { RelationshipEvidenceDrawer } from './RelationshipEvidenceDrawer';
import type { RelationshipGraph, RelationshipEdge } from '../../lib/relationship-graph';
import type { BusinessViewCandidate } from '../../lib/business-view-generator';
import { 
  confirmBusinessView, 
  ignoreBusinessView, 
  confirmRelationship, 
  rejectRelationship 
} from '../../lib/business-view-generator';

interface BusinessViewReviewStepProps {
  graph: RelationshipGraph;
  initialViews: BusinessViewCandidate[];
  datasetCount: number;
  onComplete: (views: BusinessViewCandidate[], edges: RelationshipEdge[]) => void;
}

export const BusinessViewReviewStep: React.FC<BusinessViewReviewStepProps> = ({
  graph,
  initialViews,
  datasetCount,
  onComplete
}) => {
  const [views, setViews] = useState<BusinessViewCandidate[]>(initialViews);
  const [edges, setEdges] = useState<RelationshipEdge[]>(graph.edges);
  const [reviewingView, setReviewingView] = useState<BusinessViewCandidate | null>(null);

  const handleUseView = (view: BusinessViewCandidate) => {
    setViews(views.map(v => v.id === view.id ? confirmBusinessView(v) : v));
  };

  const handleIgnoreView = (view: BusinessViewCandidate) => {
    setViews(views.map(v => v.id === view.id ? ignoreBusinessView(v) : v));
  };

  const handleConfirmEdge = (edge: RelationshipEdge) => {
    setEdges(edges.map(e => e.relationshipId === edge.relationshipId ? confirmRelationship(e) : e));
  };

  const handleRejectEdge = (edge: RelationshipEdge) => {
    setEdges(edges.map(e => e.relationshipId === edge.relationshipId ? rejectRelationship(e) : e));
  };

  const handleComplete = () => {
    onComplete(views, edges);
  };

  const edgesForReviewingView = reviewingView 
    ? edges.filter(e => reviewingView.supportingRelationshipIds.includes(e.relationshipId))
    : [];

  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      <DataUnderstandingSummary 
        datasetCount={datasetCount}
        relationshipCount={edges.length}
        businessViews={views}
      />

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Review Business Views</h2>
        <button 
          onClick={handleComplete}
          className="px-5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-[14px] font-semibold shadow-sm transition-colors"
        >
          Continue to Analysis
        </button>
      </div>

      <div className="space-y-4">
        {views.length === 0 && (
          <div className="text-center p-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No multi-dataset business views automatically detected.</p>
            <p className="text-sm text-gray-400 mt-2">You can still analyze your datasets individually.</p>
          </div>
        )}
        
        {views.map(view => (
          <BusinessViewReviewCard 
            key={view.id}
            view={view}
            onUseView={handleUseView}
            onIgnoreView={handleIgnoreView}
            onReviewRelationships={setReviewingView}
          />
        ))}
      </div>

      <RelationshipEvidenceDrawer
        view={reviewingView}
        edges={edgesForReviewingView}
        onClose={() => setReviewingView(null)}
        onConfirmEdge={handleConfirmEdge}
        onRejectEdge={handleRejectEdge}
      />
    </div>
  );
};
