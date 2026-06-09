import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRightLeft, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import type { RelationshipEdge } from '../../lib/relationship-graph';
import type { BusinessViewCandidate } from '../../lib/business-view-generator';

interface RelationshipEvidenceDrawerProps {
  view: BusinessViewCandidate | null;
  edges: RelationshipEdge[];
  onClose: () => void;
  onConfirmEdge: (edge: RelationshipEdge) => void;
  onRejectEdge: (edge: RelationshipEdge) => void;
}

export const RelationshipEvidenceDrawer: React.FC<RelationshipEvidenceDrawerProps> = ({
  view,
  edges,
  onClose,
  onConfirmEdge,
  onRejectEdge
}) => {
  if (!view) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-gray-200"
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Supporting Evidence</h3>
              <p className="text-sm text-gray-500">Why LightBI connected these datasets</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gray-50">
            {edges.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No supporting relationships found.
              </div>
            )}
            
            {edges.map(edge => {
              const isConfirmed = edge.status === 'confirmed';
              const isRejected = edge.status === 'rejected';

              return (
                <div key={edge.relationshipId} className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${isConfirmed ? 'border-emerald-200 ring-1 ring-emerald-50' : isRejected ? 'opacity-50 border-gray-200' : 'border-gray-200'}`}>
                  
                  <div className="p-4 border-b border-gray-100 flex flex-col gap-2 bg-blue-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[13px] font-semibold text-gray-900">Detected Link</h4>
                      <div className="flex flex-col items-end gap-1">
                        {edge.confidence === 'HIGH' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">HIGH CONFIDENCE</span>}
                        {edge.confidence === 'MEDIUM' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">MEDIUM CONFIDENCE</span>}
                        {edge.confidence === 'LOW' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700">LOW CONFIDENCE</span>}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {edge.evidence.map((ev, i) => (
                        <div key={i} className="flex justify-between items-start text-[13px]">
                          <span className="text-gray-700">{ev.message}</span>
                          <span className={`font-mono text-[11px] ${ev.score >= 10 ? 'text-green-600' : ev.score < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                            {ev.score > 0 ? `+${ev.score}` : ev.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="text-[12px] font-medium text-gray-600 truncate flex-1" title={edge.leftDatasetId}>
                        <span className="text-gray-400 font-normal">Dataset:</span> {edge.leftDatasetId}
                        <div className="text-[11px] text-gray-800 font-mono mt-1 bg-white px-2 py-1 rounded border">{edge.leftColumnId}</div>
                      </div>
                      <ArrowRightLeft className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="text-[12px] font-medium text-gray-600 truncate flex-1" title={edge.rightDatasetId}>
                        <span className="text-gray-400 font-normal">Dataset:</span> {edge.rightDatasetId}
                        <div className="text-[11px] text-gray-800 font-mono mt-1 bg-white px-2 py-1 rounded border">{edge.rightColumnId}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-4 text-[12px]">
                      <span className="text-gray-500">Cardinality: <strong className="text-gray-700">{edge.cardinality.replace(/_/g, ' ')}</strong></span>
                      {edge.risk === 'HIGH' ? (
                        <span className="flex items-center gap-1 text-red-600 font-medium"><AlertTriangle className="w-3.5 h-3.5" /> High Risk</span>
                      ) : edge.risk === 'MEDIUM' ? (
                        <span className="flex items-center gap-1 text-amber-600 font-medium"><Info className="w-3.5 h-3.5" /> Medium Risk</span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium"><ShieldCheck className="w-3.5 h-3.5" /> Low Risk</span>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                      {!isRejected && (
                        <button 
                          onClick={() => onRejectEdge(edge)}
                          className="px-3 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          Mark as wrong
                        </button>
                      )}
                      {!isConfirmed && (
                        <button 
                          onClick={() => onConfirmEdge(edge)}
                          className="px-3 py-1.5 text-[12px] font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm rounded-md transition-colors"
                        >
                          Confirm
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
