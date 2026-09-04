// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MultiSourceFocusSubjectSelector } from './MultiSourceFocusSubjectSelector';

const focusCandidate = (field: string, values: string[]) => ({
  id: `product:${field}`, canonicalId: 'product', domain: 'inventory' as const,
  field, fieldLabel: 'Product', confidence: 0.9,
  options: values.map(value => ({ value, displayLabel: value, searchText: value.toLowerCase() })),
});

afterEach(cleanup);

describe('MultiSourceFocusSubjectSelector', () => {
  it('binds all imported sources while disclosing only the active perspective source states', () => {
    let selected: any = null;
    const sources = [
      { key: 'sales', name: 'sales.xlsx', focusCandidates: [focusCandidate('Product ID', ['P1', 'P2'])] },
      { key: 'accounting', name: 'accounting.xlsx', focusCandidates: [focusCandidate('Item Code', ['P1', 'P3'])] },
      { key: 'logistics', name: 'logistics.xlsx', focusCandidates: [] },
    ];
    const { rerender } = render(<MultiSourceFocusSubjectSelector sources={sources} activeSourceKeys={['sales', 'accounting']} selected={selected} onChange={value => { selected = value; }} />);
    fireEvent.click(screen.getByTestId('add-focus-button'));
    fireEvent.change(screen.getByLabelText('Search focus subject'), { target: { value: 'P1' } });
    fireEvent.click(screen.getByRole('button', { name: 'P1' }));
    expect(selected?.canonicalId).toBe('product');
    expect(selected?.bindings.map((item: any) => item.state)).toEqual(['matched_exact', 'matched_exact', 'concept_unavailable']);
    rerender(<MultiSourceFocusSubjectSelector sources={sources} activeSourceKeys={['sales', 'accounting']} selected={selected} onChange={value => { selected = value; }} />);
    expect(screen.getByText(/2 exact source matches/i)).toBeTruthy();
    expect(screen.queryByText(/source without a governed concept binding/i)).toBeNull();
    expect(screen.getByText(/Governed totals and source relationships remain unchanged/i)).toBeTruthy();
  });
});
