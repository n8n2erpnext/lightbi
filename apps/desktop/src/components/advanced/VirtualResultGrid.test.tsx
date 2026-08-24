// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VirtualResultGrid } from './VirtualResultGrid';

const result = {
  runId: 'grid-test', columns: [{ id: 'name', name: 'Name', logicalType: 'string' as const }], rows: [['Alpha']],
  page: { offset: 0, limit: 1, hasMore: false, estimatedTotal: 1 }, truncated: false, warnings: [], executionMs: 1,
};

describe('Advanced result context menu', () => {
  it('dismisses on outside pointer interaction and Escape', () => {
    render(<VirtualResultGrid result={result} onSort={vi.fn()} />);
    const cell = screen.getByRole('gridcell');
    fireEvent.contextMenu(cell, { clientX: 30, clientY: 40 });
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.contextMenu(cell, { clientX: 30, clientY: 40 });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
