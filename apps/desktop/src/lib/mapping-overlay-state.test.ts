import { applyMappingAction } from './mapping-overlay-state';
import type { MappingOverlayAction } from './mapping-overlay-state';
import { describe, it, expect } from 'vitest';

describe('applyMappingAction', () => {
  it('adds a new overlay action correctly without mutating input', () => {
    const initialState: MappingOverlayAction[] = [];
    const action: MappingOverlayAction = { actionType: 'ignore_mismatch', physicalColumn: 'col_1' };
    
    const newState = applyMappingAction(initialState, action);
    
    expect(newState.length).toBe(1);
    expect(newState[0]).toEqual(action);
    expect(initialState.length).toBe(0); // Proves no mutation
  });

  it('replaces an existing action for the same column without mutating', () => {
    const initialState: MappingOverlayAction[] = [
      { actionType: 'ignore_mismatch', physicalColumn: 'col_1' }
    ];
    const newAction: MappingOverlayAction = { actionType: 'map_temporary', physicalColumn: 'col_1', targetSignal: 'revenue' };
    
    const newState = applyMappingAction(initialState, newAction);
    
    expect(newState.length).toBe(1);
    expect(newState[0].actionType).toBe('map_temporary');
    expect(newState[0].targetSignal).toBe('revenue');
    expect(initialState[0].actionType).toBe('ignore_mismatch'); // Proves no mutation
  });

  it('keep_raw_unchanged removes any existing action for the column and does not add itself', () => {
    const initialState: MappingOverlayAction[] = [
      { actionType: 'map_temporary', physicalColumn: 'col_1', targetSignal: 'revenue' },
      { actionType: 'ignore_mismatch', physicalColumn: 'col_2' }
    ];
    
    const newAction: MappingOverlayAction = { actionType: 'keep_raw_unchanged', physicalColumn: 'col_1' };
    
    const newState = applyMappingAction(initialState, newAction);
    
    expect(newState.length).toBe(1);
    expect(newState[0].physicalColumn).toBe('col_2');
    // col_1 action should be completely gone
  });
});
