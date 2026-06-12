/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DatasetUnderstandingCard } from './DatasetUnderstandingCard';
import type { DatasetUnderstanding } from '../../lib/dataset-understanding-contract';

describe('DatasetUnderstandingCard', () => {
  it('renders Truth & Mapping Review panel and triggers mapping actions', () => {
    const mockUnderstanding: DatasetUnderstanding = {
      id: 'test-id',
      status: 'understood',
      confidenceScore: 80,
      grainHint: 'event',
      narrative: 'Test narrative',
      sourceTrace: {
        signalIds: [],
        perspectiveIds: [],
        businessViewIds: [],
        questionSuggestionIds: []
      },
      createdAt: new Date().toISOString(),
      summary: {
        signalCount: 2,
        perspectiveCount: 1,
        businessViewCount: 0,
        questionCount: 0
      },
      capabilities: [],
      opportunities: [],
      availableAnalysis: [],
      unavailableAnalysis: [],
      inferredEntities: [],
      detectedConcepts: [],
      workflowHints: [],
      relationshipHints: [],
      caveats: [],
      mappingReview: {
        items: [
          {
            physicalColumn: 'route_id',
            inferredSignal: 'route',
            issueType: 'ambiguous',
            confidence: 40,
            suggestedActions: ['map_temporary', 'ignore_mismatch', 'keep_raw_unchanged']
          },
          {
            physicalColumn: 'random_unrecognized',
            issueType: 'unrecognized',
            confidence: 0,
            suggestedActions: ['ignore_mismatch']
          }
        ]
      }
    };

    const handleMappingAction = vi.fn();

    render(
      <DatasetUnderstandingCard 
        understanding={mockUnderstanding} 
        onSelectAction={() => {}} 
        onMappingAction={handleMappingAction} 
      />
    );

    // Verify Truth & Mapping Review section is rendered
    expect(screen.getByText('Truth & Mapping Review')).toBeDefined();

    // Verify ambiguous item actions
    expect(screen.getByText('route_id')).toBeDefined();
    
    // There should be a "Map to route" button
    const mapBtn = screen.getByText('Map to route');
    expect(mapBtn).toBeDefined();

    // Fire map action
    fireEvent.click(mapBtn);
    expect(handleMappingAction).toHaveBeenCalledWith({
      actionType: 'map_temporary',
      physicalColumn: 'route_id',
      targetSignal: 'route'
    });

    // There should be an "Ignore" button for the unrecognized one
    const ignoreBtns = screen.getAllByText('Ignore');
    expect(ignoreBtns.length).toBeGreaterThan(0);
    
    // Verify unrecognized item renders custom map select
    expect(screen.getByText('random_unrecognized')).toBeDefined();
    
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBe(2); // One for ambiguous, one for unrecognized
    
    // Select custom signal 'revenue' for 'random_unrecognized'
    const unrecognizedSelect = selects[1] as HTMLSelectElement;
    fireEvent.change(unrecognizedSelect, { target: { value: 'revenue' } });
    
    const applyBtns = screen.getAllByText('Apply');
    expect((applyBtns[1] as HTMLButtonElement).disabled).toBe(false);
    
    fireEvent.click(applyBtns[1]);
    expect(handleMappingAction).toHaveBeenCalledWith({
      actionType: 'map_temporary',
      physicalColumn: 'random_unrecognized',
      targetSignal: 'revenue'
    });
  });

  it('shows feedback toast when readiness improves or opportunities are unlocked', () => {
    const mockUnderstanding1: DatasetUnderstanding = {
      id: 'test-id-1',
      status: 'partial',
      confidenceScore: 50,
      grainHint: 'unknown',
      narrative: 'Initial',
      sourceTrace: { signalIds: [], perspectiveIds: [], businessViewIds: [], questionSuggestionIds: [] },
      createdAt: new Date().toISOString(),
      summary: { signalCount: 1, perspectiveCount: 0, businessViewCount: 0, questionCount: 0 },
      capabilities: [],
      opportunities: [], // 0 initially
      availableAnalysis: [],
      unavailableAnalysis: [],
      inferredEntities: [],
      detectedConcepts: [],
      workflowHints: [],
      relationshipHints: [],
      caveats: [],
      readiness: {
         tier: 'exploratory_only',
         score: 40,
         missingnessScore: 100,
         caveats: []
      }
    };

    const { rerender } = render(
      <DatasetUnderstandingCard understanding={mockUnderstanding1} />
    );

    // Toast should not be there initially
    expect(screen.queryByText(/Readiness improved/i)).toBeNull();

    // Now update understanding to simulate the recomputation effect
    const mockUnderstanding2: DatasetUnderstanding = {
      ...mockUnderstanding1,
      id: 'test-id-2',
      status: 'understood',
      opportunities: [
         { id: 'opp-1', label: 'New Opp 1', requiredSignals: [], domain: 'revenue' },
         { id: 'opp-2', label: 'New Opp 2', requiredSignals: [], domain: 'revenue' }
      ], // increased to 2
      readiness: {
         tier: 'decision_support',
         score: 85, // increased from 40
         missingnessScore: 100,
         caveats: []
      }
    };

    rerender(<DatasetUnderstandingCard understanding={mockUnderstanding2} />);

    // Toast should now appear
    const toast = screen.getByText(/Readiness improved: 40 -> 85\. Unlocked opportunities: 0 -> 2\./i);
    expect(toast).toBeDefined();
  });
});
