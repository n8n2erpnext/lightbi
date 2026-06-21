import React from 'react';
import type { RelationshipGraph } from '../../lib/relationship-graph';
import type { BusinessViewCandidate } from '../../lib/business-view-generator';
import type { DatasetFamily } from '../../lib/batch-inspection';
import { Database, Link, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export type MultiFileUnderstandingProofPanelProps = {
  graph: RelationshipGraph;
  businessViews?: BusinessViewCandidate[];
  selectedViewId?: string;
  families: DatasetFamily[];
};

export function MultiFileUnderstandingProofPanel({ graph, businessViews, selectedViewId, families }: MultiFileUnderstandingProofPanelProps) {
  if (families.length < 2) return null;

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 mb-8 text-slate-300">
      <div className="flex items-center gap-3 border-b border-slate-700 pb-4 mb-4">
        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
          <Database className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-white">Multi-File Understanding Proof</h2>
          <p className="text-sm text-slate-400">
            {graph.edges.length > 0
              ? "LightBI found relationship candidates across these files."
              : "LightBI detected multiple files, but no direct relationship keys were found yet."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Files Detected */}
        <div>
          <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            Files Detected & Roles
          </h3>
          <div className="space-y-3">
            {families.map(f => (
              <div key={f.id} className="bg-slate-800 rounded p-3 text-sm border border-slate-700">
                <div className="font-medium text-white">{f.name}</div>
                <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-1">
                   {f.files.map((fi, idx) => <span key={idx} className="bg-slate-700/50 px-1 py-0.5 rounded truncate max-w-full text-blue-200">{fi.file.name}</span>)}
                </div>
                <div className="text-xs text-slate-400 mt-1">Total Rows: {f.totalRows.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1 flex gap-1 flex-wrap">
                  {f.columns.slice(0, 3).map(c => (
                    <span key={c} className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">
                      {c}
                    </span>
                  ))}
                  {f.columns.length > 3 && <span className="px-1.5 py-0.5 text-slate-500">+{f.columns.length - 3}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Relationships & Execution */}
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Link className="w-4 h-4 text-blue-400" />
              Relationship Signals
            </h3>
            {graph.edges.length > 0 ? (
              <div className="space-y-2">
                {graph.edges.map((edge, i) => (
                  <div key={i} className="bg-slate-800 rounded p-3 text-sm border border-slate-700 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-300">{edge.leftDatasetId}</span>
                      <Link className="w-3 h-3 text-slate-500 mx-2" />
                      <span className="font-medium text-blue-300">{edge.rightDatasetId}</span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center justify-between mt-1">
                      <span>Keys: {edge.leftColumnId} ↔ {edge.rightColumnId}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold ${
                        edge.confidence === 'HIGH' ? 'bg-emerald-500/20 text-emerald-400' :
                        edge.confidence === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {edge.confidence}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-800 rounded p-3 text-sm border border-slate-700 flex items-center gap-2 text-slate-400">
                <XCircle className="w-4 h-4 text-red-400" />
                No direct relationship keys detected.
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-purple-400" />
              Business Interpretation & Execution
            </h3>
            <div className="bg-slate-800 rounded p-3 text-sm border border-slate-700 space-y-3">
              {selectedViewId && businessViews ? (() => {
                const view = businessViews.find(c => c.id === selectedViewId);
                return view ? (
                  <div>
                    <div className="font-medium text-purple-300">{view.title}</div>
                    <div className="text-xs text-slate-400 mt-1">{view.description}</div>
                  </div>
                ) : <span className="text-slate-400">Custom business view</span>;
              })() : (
                <div className="text-slate-400 italic">No business view selected.</div>
              )}
              
              <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  <strong className="text-amber-400">Real joined multi-file execution: not available in current local preview.</strong>
                  <br />
                  Current runtime evidence: local single-table / selected-family preview only.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
