// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataIntakeDrawer } from './DataIntakeDrawer';

vi.mock('./GoogleSheetsStep', () => ({ GoogleSheetsStep: () => <div data-testid="online-intake-content">Online intake content</div> }));
vi.mock('./DatabaseStep', () => ({ DatabaseStep: () => <div data-testid="database-intake-content">Database intake content</div> }));
vi.mock('./ApiStep', () => ({ ApiStep: () => null }));
vi.mock('./WarehouseStep', () => ({ WarehouseStep: () => null }));

afterEach(cleanup);

describe('DataIntakeDrawer native-safe layering', () => {
  it('keeps Online Link content above a non-blurring backdrop', () => {
    render(<DataIntakeDrawer request={{ sourceType: 'online_link' } as any} onClose={vi.fn()} />);
    expect(screen.getByTestId('online-intake-content')).toBeTruthy();
    expect(screen.getByTestId('data-intake-panel').className).toContain('z-10');
    expect(screen.getByTestId('data-intake-backdrop').className).not.toContain('backdrop-blur');
  });

  it('keeps Database System content above the same explicit layer boundary', () => {
    render(<DataIntakeDrawer request={{ sourceType: 'database' } as any} onClose={vi.fn()} />);
    expect(screen.getByTestId('database-intake-content')).toBeTruthy();
    expect(screen.getByTestId('data-intake-modal').className).toContain('isolate');
    expect(screen.getByTestId('data-intake-panel').className).toContain('bg-white');
  });
});
