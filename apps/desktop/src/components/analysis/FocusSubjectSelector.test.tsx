// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FocusSubjectSelector } from './FocusSubjectSelector';
import type { FocusSubjectCandidate } from '../../lib/focus-subject-analysis';

const candidate: FocusSubjectCandidate = {
  id: 'employee_id:MSNV QUẢN LÝ', canonicalId: 'employee_id', domain: 'performance',
  field: 'MSNV QUẢN LÝ', fieldLabel: 'Employee ID', labelField: 'HỌ TÊN QUẢN LÝ', confidence: 0.99,
  options: [{ value: '24128', displayLabel: '24128 — Thái Đăng Duy', searchText: '24128 thái đăng duy' }],
};

afterEach(cleanup);

describe('FocusSubjectSelector optional UX', () => {
  it('stays collapsed by default so the legacy perspective workflow remains visually primary', () => {
    render(<FocusSubjectSelector candidates={[candidate]} selected={null} onSelect={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByText(/Skip this to analyze the whole dataset as usual/i)).toBeTruthy();
    expect(screen.queryByLabelText('Search focus subject')).toBeNull();
    expect(screen.getByTestId('add-focus-button')).toBeTruthy();
  });

  it('reveals focus controls only after the user explicitly opts in', () => {
    render(<FocusSubjectSelector candidates={[candidate]} selected={null} onSelect={vi.fn()} onClear={vi.fn()} />);
    fireEvent.click(screen.getByTestId('add-focus-button'));
    expect(screen.getByLabelText('Search focus subject')).toBeTruthy();
    expect(screen.getByText(/Focus on something specific/i)).toBeTruthy();
  });
});
