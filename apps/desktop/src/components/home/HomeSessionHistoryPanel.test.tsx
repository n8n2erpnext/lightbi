// @vitest-environment jsdom
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

  it('keeps empty and connection-retry states inline and actionable', () => {
    const onRetry = vi.fn();
    render(<HomeSessionHistoryPanel {...baseProps} sessions={[]} status="Failed to fetch session history" onOpen={vi.fn()} onDelete={vi.fn()} onRetry={onRetry} />);
    expect(screen.getByTestId('session-history-empty')).toBeTruthy();
    expect(screen.getByTestId('session-history-status').textContent).toContain('temporarily unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
