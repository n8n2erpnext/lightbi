import React from 'react';
import { FolderOpen, History, Trash2 } from 'lucide-react';
import type { WorkspaceSessionRecord } from '../../lib/workspace-session-api';

interface HomeSessionHistoryPanelProps {
  className?: string;
  sessions: WorkspaceSessionRecord[];
  activeSessionId?: string;
  status: string | null;
  formatRowCount: (value: number) => string;
  formatColumnCount: (value: number) => string;
  onOpen: (session: WorkspaceSessionRecord) => void;
  onDelete: (sessionId: string) => void;
}

export const HomeSessionHistoryPanel: React.FC<HomeSessionHistoryPanelProps> = ({
  className = '', sessions, activeSessionId, status, formatRowCount, formatColumnCount, onOpen, onDelete,
}) => (
  <div className={`bg-white border border-black/10 rounded-xl p-5 shadow-sm ${className}`}>
    <div className="mb-4 flex items-center justify-between gap-3">
      <h3 className="flex items-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
        <History className="mr-2 h-4 w-4 text-gray-400" /> Session history
      </h3>
      <span className="text-[11px] text-gray-400">{sessions.length}</span>
    </div>
    {sessions.length > 0 ? (
      <div className="grid gap-2">
        {sessions.slice(0, 6).map(session => {
          const isActive = activeSessionId === session.id;
          return (
            <div key={session.id} className={`rounded-lg border p-3 transition-colors ${isActive ? 'border-emerald-200 bg-emerald-50/70' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => onOpen(session)} className="min-w-0 flex-1 text-left" title="Open saved session">
                  <div className="truncate text-[13px] font-semibold text-gray-900">{session.title}</div>
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-gray-500">
                    <span>{formatRowCount(session.rowCount)} rows</span>
                    <span>{formatColumnCount(session.columnCount)} columns</span>
                    <span>{session.sourceType}</span>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => onOpen(session)} className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-700" title="Open session">
                    <FolderOpen className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onDelete(session.id)} className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-700" title="Delete session">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="rounded-lg border border-dashed border-gray-200 px-3 py-5 text-center">
        <div className="text-[13px] font-medium text-gray-700">No saved sessions yet</div>
        <div className="mt-1 text-[12px] text-gray-400">LightBI saves when you start an analysis or preview a chart.</div>
      </div>
    )}
    {status && <div className="mt-4 rounded-md bg-gray-50 px-3 py-2 text-[12px] text-gray-500">{status}</div>}
  </div>
);
