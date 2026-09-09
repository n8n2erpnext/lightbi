import React from 'react';
import { ChevronLeft, ChevronRight, FolderOpen, History, Trash2 } from 'lucide-react';
import type { WorkspaceSessionRecord } from '../../lib/workspace-session-api';
import { useUiLanguage } from '../../lib/ui-language';

const HISTORY_PAGE_SIZE = 6;
const HISTORY_MAX_PAGES = 5;
const HISTORY_VISIBLE_LIMIT = HISTORY_PAGE_SIZE * HISTORY_MAX_PAGES;

function sessionTimestamp(session: WorkspaceSessionRecord): number {
  const updated = Date.parse(session.updatedAt || session.createdAt);
  return Number.isFinite(updated) ? updated : 0;
}

function sessionSourceCount(session: WorkspaceSessionRecord): number {
  const summary = Array.isArray(session.sourceSummary) ? session.sourceSummary : [];
  if (summary.length > 0) return summary.length;
  const snapshotSources = (session.snapshot as any)?.currentDataset?.sourceFiles;
  return Array.isArray(snapshotSources) ? snapshotSources.length : 0;
}

interface HomeSessionHistoryPanelProps {
  className?: string;
  sessions: WorkspaceSessionRecord[];
  activeSessionId?: string;
  status: string | null;
  formatRowCount: (value: number) => string;
  formatColumnCount: (value: number) => string;
  onOpen: (session: WorkspaceSessionRecord) => void;
  onDelete: (sessionId: string) => void;
  onRetry?: () => void;
}

export const HomeSessionHistoryPanel: React.FC<HomeSessionHistoryPanelProps> = ({
  className = '', sessions, activeSessionId, status, formatRowCount, formatColumnCount, onOpen, onDelete, onRetry,
}) => {
  const { t } = useUiLanguage();
  const [page, setPage] = React.useState(0);
  const visibleSessions = React.useMemo(() => [...sessions]
    .sort((left, right) => sessionTimestamp(right) - sessionTimestamp(left) || right.id.localeCompare(left.id))
    .slice(0, HISTORY_VISIBLE_LIMIT), [sessions]);
  const pageCount = Math.max(1, Math.ceil(visibleSessions.length / HISTORY_PAGE_SIZE));
  React.useEffect(() => {
    setPage(current => Math.min(current, Math.max(0, pageCount - 1)));
  }, [pageCount]);
  const pageSessions = visibleSessions.slice(page * HISTORY_PAGE_SIZE, (page + 1) * HISTORY_PAGE_SIZE);
  const isConnectionFailure = Boolean(status && /failed to fetch|network|connection|api returned 5/i.test(status));
  const visibleStatus = isConnectionFailure
    ? t('Session history is temporarily unavailable. Check the local LightBI core, then try again.')
    : status ? t(status) : status;
  return (
  <section data-testid="session-history" data-layout="session-history-list" className={className}>
    <div className="mb-3 flex items-center justify-between gap-3 px-1">
      <h3 className="flex items-center text-[12px] font-semibold uppercase tracking-wider text-gray-500">
        <History className="mr-2 h-4 w-4 text-gray-400" /> {t('Session history')}
      </h3>
      <span data-testid="session-history-count" className="text-[11px] text-gray-400">{visibleSessions.length}{sessions.length > visibleSessions.length ? ` / ${sessions.length}` : ''}</span>
    </div>
    {sessions.length > 0 ? (
      <div className="border-y border-[var(--lb-divider)]">
        {pageSessions.map(session => {
          const isActive = activeSessionId === session.id;
          return (
            <div key={session.id} data-testid="session-history-item" data-session-id={session.id} data-source-type={session.sourceType} className={`border-b border-[var(--lb-divider)] px-1 py-3 transition last:border-b-0 ${isActive ? 'border-l-2 border-l-emerald-500 bg-emerald-50/60 pl-3' : 'hover:bg-black/[0.025]'}`}>
              <div className="flex items-start justify-between gap-2">
                <button onClick={() => onOpen(session)} className="min-w-0 flex-1 text-left" title={t('Open saved session')}>
                  <div className="truncate text-[13px] font-semibold text-gray-900">{session.title}</div>
                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-gray-500">
                    <span>{formatRowCount(session.rowCount)} {t('rows')}</span>
                    <span>{formatColumnCount(session.columnCount)} {t('columns')}</span>
                    {sessionSourceCount(session) > 1 ? <><span>{t('Multi-file')}</span><span>{sessionSourceCount(session)} {t('sources')}</span></> : <span>{session.sourceType}</span>}
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => onOpen(session)} className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-700" title={t('Open session')}>
                    <FolderOpen className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => onDelete(session.id)} className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-700" title={t('Delete session')}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <div data-testid="session-history-empty" className="border-y border-[var(--lb-divider)] px-2 py-5 text-center">
        <div className="text-[13px] font-medium text-gray-700">{t('No saved sessions yet')}</div>
        <div className="mt-1 text-[12px] text-gray-400">{t('LightBI saves this workspace as soon as the source is ready.')}</div>
      </div>
    )}
    {visibleSessions.length > HISTORY_PAGE_SIZE && <nav data-testid="session-history-pagination" aria-label={t('Session history pages')} className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--lb-divider)] px-1 pt-3">
      <button type="button" onClick={() => setPage(current => Math.max(0, current - 1))} disabled={page === 0} title={t('Previous page')} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30"><ChevronLeft className="h-3.5 w-3.5" />{t('Previous')}</button>
      <div className="flex items-center gap-1">{Array.from({ length: pageCount }, (_, index) => <button key={index} type="button" data-testid={`session-history-page-${index + 1}`} aria-current={page === index ? 'page' : undefined} aria-label={`${t('Page')} ${index + 1}`} onClick={() => setPage(index)} className={`h-7 min-w-7 px-2 text-[11px] font-semibold ${page === index ? 'border-b-2 border-gray-900 text-gray-900' : 'text-gray-400 hover:text-gray-700'}`}>{index + 1}</button>)}</div>
      <button type="button" onClick={() => setPage(current => Math.min(pageCount - 1, current + 1))} disabled={page >= pageCount - 1} title={t('Next page')} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-30">{t('Next')}<ChevronRight className="h-3.5 w-3.5" /></button>
    </nav>}
    {visibleStatus && <div data-testid="session-history-status" className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--lb-divider)] px-1 pt-3 text-[12px] text-gray-500"><span>{visibleStatus}</span>{isConnectionFailure && onRetry && <button type="button" onClick={onRetry} className="shrink-0 rounded-md border border-gray-200 bg-white px-2.5 py-1 font-semibold text-gray-700 hover:bg-gray-100">{t('Try again')}</button>}</div>}
  </section>
  );
};
