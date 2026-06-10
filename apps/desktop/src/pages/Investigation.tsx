import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, BarChart3, ChevronDown, ChevronRight, Activity, Code2 } from 'lucide-react';
import { getCurrentInvestigationSession } from '../lib/investigation-session';
import { createSafeSqlPreview } from '../lib/safe-sql-preview';

export const Investigation: React.FC = () => {
  const navigate = useNavigate();
  const session = getCurrentInvestigationSession();
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center max-w-md w-full">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Active Session</h2>
          <p className="text-sm text-gray-500 mb-4">Please select an analysis from the Home page.</p>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const { analysisAction, runtimeIntent, runtimePlanPreview } = session;
  const safeSqlPreview = React.useMemo(() => createSafeSqlPreview(runtimePlanPreview), [runtimePlanPreview]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 sticky top-0 z-10 shadow-sm">
        <button 
          onClick={() => navigate('/')}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-500 hover:text-gray-900"
          title="Back to Home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-[15px] font-semibold text-gray-900 leading-tight">
            {analysisAction.opportunityName}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-medium text-gray-500">Dataset: {session.datasetId}</span>
            <span className="text-gray-300">•</span>
            <span className="text-[11px] font-medium px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded">
              {analysisAction.actionType}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full flex flex-col gap-6">
        
        {/* Primary Analysis Surface */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 mb-1">Chart preview will appear here</h2>
              <p className="text-xs text-gray-500">LightBI has prepared this analysis. Execution will run in the next phase.</p>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 text-xs font-medium text-gray-700 rounded-md shadow-sm">
                <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                Expected chart: {runtimeIntent.expectedShape.replace('_', ' ')}
              </span>
            </div>
          </div>
          
          <div className="p-6 bg-white border-b border-gray-100">
             <div className="flex flex-wrap gap-4 mb-8">
               <div className="flex flex-col gap-1.5">
                 <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Dimensions</span>
                 <div className="flex flex-wrap gap-2">
                   {runtimeIntent.dimensions.map(d => (
                     <span key={d} className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs font-medium">
                       {d}
                     </span>
                   ))}
                 </div>
               </div>
               
               <div className="flex flex-col gap-1.5">
                 <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Measures</span>
                 <div className="flex flex-wrap gap-2">
                   {runtimeIntent.measures.map(m => (
                     <span key={m} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-xs font-medium">
                       {m}
                     </span>
                   ))}
                 </div>
               </div>
             </div>
             
             {/* Chart Placeholder Area */}
             <div className="w-full h-64 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400">
               <Activity className="w-8 h-8 text-slate-300 mb-2" />
               <span className="text-sm font-medium">Ready to execute</span>
             </div>
          </div>
          
          <div className="px-6 py-4 bg-slate-50/50 text-xs text-slate-500">
            Results not executed yet.
          </div>
        </div>

        {/* Developer Diagnostics Toggle */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mt-4 transition-all duration-300">
          <button 
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-0.5">Developer diagnostics</h3>
                <p className="text-xs text-gray-500">Runtime intent, logical plan and SQL preview.</p>
              </div>
            </div>
            <div className="text-gray-400">
              {showDiagnostics ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
          </button>
          
          {/* Developer Diagnostics Content */}
          {showDiagnostics && (
            <div className="bg-slate-900 border-t border-slate-800 p-0">
              <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Pipeline State</span>
                <div className="flex items-center gap-2">
                   <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${runtimeIntent.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                     Intent: {runtimeIntent.status}
                   </span>
                   <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${runtimePlanPreview.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                     Plan: {runtimePlanPreview.status}
                   </span>
                </div>
              </div>
              
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-[11px]">
                {/* Intent Column */}
                <div>
                  <h3 className="text-slate-500 mb-2 font-semibold">Runtime Intent</h3>
                  <div className="space-y-1 text-slate-300">
                    <p><span className="text-slate-500 w-20 inline-block">Type:</span> <span className="text-pink-400">{runtimeIntent.type}</span></p>
                    <p><span className="text-slate-500 w-20 inline-block">Shape:</span> <span className="text-emerald-400">{runtimeIntent.expectedShape}</span></p>
                  </div>
                </div>

                {/* Plan Column */}
                <div>
                  <h3 className="text-slate-500 mb-2 font-semibold">Runtime Plan</h3>
                  <div className="space-y-1.5 text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/50 mb-4">
                    {runtimePlanPreview.logicalOperations.map((op, i) => {
                      let details = '';
                      if (op.type === 'scan') details = op.columns.join(', ');
                      if (op.type === 'group_by') details = `${op.dimensions.join(', ')} / ${op.measures.join(', ')}`;
                      if (op.type === 'trend') details = `${op.timeDimension} / ${op.measures.join(', ')}`;
                      if (op.type === 'distribution') details = op.dimension;
                      if (op.type === 'relationship') details = op.measures.join(', ');
                      if (op.type === 'limit') details = op.rows.toString();
                      return (
                        <div key={i} className="flex">
                          <span className="text-pink-400 w-24 flex-shrink-0">{op.type}:</span>
                          <span className="text-slate-100">{details}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Safe SQL Preview */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-slate-500 font-semibold">Safe SQL Preview</h3>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${safeSqlPreview.status === 'ready' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {safeSqlPreview.status}
                    </span>
                  </div>
                  
                  {safeSqlPreview.status === 'blocked' && (
                    <div className="bg-red-950/50 border border-red-900/50 rounded-lg p-3 text-red-400 mb-2">
                      <p className="font-semibold mb-1">Blocked Reasons:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {safeSqlPreview.blockedReasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}

                  {safeSqlPreview.sql && (
                    <div className="relative group">
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                          {safeSqlPreview.dialect}
                        </span>
                      </div>
                      <pre className="bg-slate-950 text-slate-300 p-3 rounded-lg border border-slate-800/50 overflow-x-auto whitespace-pre font-mono text-[10px] leading-relaxed">
                        {safeSqlPreview.sql}
                      </pre>
                      <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1.5">
                        <Database className="w-3 h-3" />
                        SQL Preview only. Not executed yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </main>
    </div>
  );
};
