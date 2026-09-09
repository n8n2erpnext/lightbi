// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceSessionRecord } from '../../lib/workspace-session-api';
import { HomeSessionHistoryPanel } from './HomeSessionHistoryPanel';

const session = {
  id: 'session-1',
  title: 'Inventory brief',
  sourceType: 'local_file',
  rowCount: 120,
  columnCount: 8,
  sourceSummary: {},
  snapshot: {},
  createdAt: '2026-09-08T00:00:00Z',
  updatedAt: '2026-09-08T00:00:00Z',
} as WorkspaceSessionRecord;

afterEach(() => cleanup());

const baseProps = {
  activeSessionId: undefined,
  status: null,
  formatRowCount: (value: number) => String(value),
  formatColumnCount: (value: number) => String(value),
};
describe('HomeSessionHistoryPanel', () => {
  it('keeps session open and delete actions while rendering a flat history list', () => {
    const onOpen = vi.fn();
    const onDelete = vi.fn();
    render(<HomeSessionHistoryPanel {...baseProps} sessions={[session]} onOpen={onOpen} onDelete={onDelete} />);
    expect(screen.getByTestId('session-history').getAttribute('data-layout')).toBe('session-history-list');
    expect(screen.getByTestId('session-history-item').textContent).toContain('Inventory brief');
    fireEvent.click(screen.getByTitle('Open saved session'));
    expect(onOpen).toHaveBeenCalledWith(session);
    fireEvent.click(screen.getByTitle('Delete session'));
    expect(onDelete).toHaveBeenCalledWith('session-1');
  });

  it('paginates the newest 30 sessions as six rows per page without deleting older records', () => {
    const sessions = Array.from({ length: 36 }, (_, index) => ({
      ...session,
      id: `session-${index + 1}`,
      title: `Session ${index + 1}`,
      updatedAt: new Date(Date.UTC(2026, 8, 9, 0, index)).toISOString(),
    }));
    render(<HomeSessionHistoryPanel {...baseProps} sessions={sessions} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getAllByTestId('session-history-item')).toHaveLength(6);
    expect(screen.getByTestId('session-history-count').textContent).toBe('30 / 36');
    expect(screen.getByTestId('session-history-pagination')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /Page [1-5]/ })).toHaveLength(5);
    expect(screen.getByText('Session 36')).toBeTruthy();
    fireEvent.click(screen.getByTestId('session-history-page-5'));
    expect(screen.getByText('Session 12')).toBeTruthy();
    expect(screen.queryByText('Session 6')).toBeNull();
  });

  it('labels a persisted multi-file session with its source count', () => {
    render(<HomeSessionHistoryPanel {...baseProps} sessions={[{ ...session, sourceType: 'canonical_perspective_collection', sourceSummary: [{ name: 'sales.xlsx' }, { name: 'accounting.xlsx' }] }]} onOpen={vi.fn()} onDelete={vi.fn()} />);
    const row = screen.getByTestId('session-history-item');
    expect(row.textContent).toContain('Multi-file');
    expect(row.textContent).toContain('2 sources');
  });

  it('keeps empty and connection-retry states inline and actionable', () => {
    const onRetry = vi.fn();
    render(<HomeSessionHistoryPanel {...baseProps} sessions={[]} status="Failed to fetch session history" onOpen={vi.fn()} onDelete={vi.fn()} onRetry={onRetry} />);
    expect(screen.getByTestId('session-history-empty')).toBeTruthy();
    expect(screen.getByTestId('session-history-status').textContent).toContain('temporarily unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
