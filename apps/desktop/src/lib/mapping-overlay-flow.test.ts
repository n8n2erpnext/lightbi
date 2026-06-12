import { runGuidedInvestigationPipeline } from './guided-investigation-pipeline';
import { createDatasetUnderstanding } from './dataset-understanding-contract';
import { describe, it, expect } from 'vitest';

describe('Trust & Mapping Review Overlay Flow', () => {
  it('recomputes mappingReview, readiness, and opportunities when overlay action is applied', () => {
    // 1. Initial dataset with a confusing column
    const dataset = {
      status: 'ready' as const,
      file_name: 'test.csv',
      rows_count: 100,
      columns: [
        { name: 'route_id' },
        { name: 'revenue_amt' },
        { name: 'random_unrecognized' }
      ]
    };

    const initialResult = runGuidedInvestigationPipeline(dataset);
    const unrecognizedItem = initialResult.signals.mappingReview?.items?.find(i => i.physicalColumn === 'random_unrecognized');
    expect(unrecognizedItem?.issueType).toBe('unrecognized');
    
    // 2. Apply a keep_raw_unchanged action (should do nothing to it, just keeping it unrecognized)
    const datasetWithNoOpOverlay = {
      ...dataset,
      overlayActions: [
        { actionType: 'keep_raw_unchanged' as any, physicalColumn: 'random_unrecognized' }
      ]
    };
    const noOpResult = runGuidedInvestigationPipeline(datasetWithNoOpOverlay);
    expect(noOpResult.signals.mappingReview?.items?.find(i => i.physicalColumn === 'random_unrecognized')?.issueType).toBe('unrecognized');

    // 3. Apply a map_temporary action to 'random_unrecognized' to map it to 'warehouse'
    const datasetWithMapOverlay = {
      ...dataset,
      overlayActions: [
        { actionType: 'map_temporary' as any, physicalColumn: 'random_unrecognized', targetSignal: 'warehouse' }
      ]
    };

    const newResult = runGuidedInvestigationPipeline(datasetWithMapOverlay);
    const newUnderstanding = createDatasetUnderstanding({
      datasetName: dataset.file_name,
      rowCount: dataset.rows_count,
      columnCount: dataset.columns.length,
      signalRegistry: newResult.signals,
      perspectives: newResult.perspectives,
      businessViews: newResult.businessViews,
      questionSuggestions: newResult.questionSuggestions
    });

    // Assert new state
    const mappedItem = newResult.signals.mappingReview?.items?.find(i => i.physicalColumn === 'random_unrecognized');
    expect(mappedItem?.issueType).toBe('recognized');
    expect(mappedItem?.inferredSignal).toBe('warehouse');

    // Check if the signal is now in the pipeline result
    expect(newResult.signals.hasSignal('warehouse')).toBe(true);

    // Before mapping, random_unrecognized contributed nothing.
    // By mapping it to 'warehouse', the pipeline detects warehouse-related views
    // and opportunities. Let's assert they increased compared to initial.
    
    const initialUnderstanding = createDatasetUnderstanding({
      datasetName: dataset.file_name,
      rowCount: dataset.rows_count,
      columnCount: dataset.columns.length,
      signalRegistry: initialResult.signals,
      perspectives: initialResult.perspectives,
      businessViews: initialResult.businessViews,
      questionSuggestions: initialResult.questionSuggestions
    });

    // Score should increase because a new valid signal was injected
    const initialScore = initialUnderstanding.readiness?.score || 0;
    const newScore = newUnderstanding.readiness?.score || 0;
    expect(newScore).toBeGreaterThan(initialScore);

    // Opportunities should ideally increase or at least perspectives should change
    expect(newUnderstanding.opportunities.length).toBeGreaterThanOrEqual(initialUnderstanding.opportunities.length);
    
    // Status shouldn't break
    expect(newUnderstanding.status).toBeDefined();
  });
});
