import { describe, expect, it } from 'vitest';
import type { DatasetUnderstandingResult, AnalysisAction, BusinessQuestion } from './understanding-next/contracts';
import { createPerspectiveAnalysisBundle } from './perspective-analysis-bundle';

function understanding(actions: AnalysisAction[], questions: BusinessQuestion[]): DatasetUnderstandingResult {
  return {
    source: { fileNames: ['arbitrary.xlsx'], sheetNames: ['Sheet1'], sourceRowCount: 10, sourceColumnCount: 5, parsedRowCount: 10, sampleRowCount: 10 },
    quality: { headerStatus: 'clean', dirtySignals: [], blockedReasons: [] },
    profile: { grain: 'event', documentType: 'generic_table', detectedDomains: ['operations', 'revenue'] },
    signals: [], stakeholderFits: [], lenses: [], perspectives: [], recommendedQuestions: questions,
    availableActions: actions, unavailableActions: [],
  };
}

const question = (id: string, domain: BusinessQuestion['domain'], actionKind: BusinessQuestion['actionKind'], dimensions: string[], measures: string[]): BusinessQuestion => ({
  id, label: id, userPrompt: id, domain, perspectiveId: domain, requiredSignals: [], optionalSignals: [], dimensions, measures,
  fitScore: 100, actionKind, executionScope: 'full_local_file', caveats: [],
});
const action = (id: string, questionId: string, actionKind: AnalysisAction['actionKind'], dimensions: string[], measures: string[]): AnalysisAction => ({
  id, questionId, label: id, actionKind, dimensions, measures, executionScope: 'full_local_file',
});

describe('perspective analysis bundle', () => {
  it('selects diverse supporting analyses from the same perspective without using filenames', () => {
    const questions = [
      question('universal:q1', 'operations', 'trend', ['date'], ['shipment_count']),
      question('universal:q2', 'operations', 'group_by', ['route'], ['shipment_count']),
      question('universal:q3', 'operations', 'group_by', ['vehicle'], ['shipment_count']),
      question('universal:q4', 'revenue', 'trend', ['date'], ['revenue']),
    ];
    const actions = [
      action('universal:a1', 'universal:q1', 'trend', ['date'], ['shipment_count']),
      action('universal:a2', 'universal:q2', 'group_by', ['route'], ['shipment_count']),
      action('universal:a3', 'universal:q3', 'group_by', ['vehicle'], ['shipment_count']),
      action('universal:a4', 'universal:q4', 'trend', ['date'], ['revenue']),
    ];
    const first = createPerspectiveAnalysisBundle(understanding(actions, questions), 'universal:a1', 'operations');
    const renamed = understanding(actions, questions);
    renamed.source.fileNames = ['completely-different-name.csv'];
    const second = createPerspectiveAnalysisBundle(renamed, 'universal:a1', 'operations');

    expect(first.supportingActions.map(item => item.id)).toEqual(['universal:a2', 'universal:a3']);
    expect(second.supportingActions.map(item => item.id)).toEqual(first.supportingActions.map(item => item.id));
  });

  it('includes registry and plugin actions without requiring a legacy universal prefix', () => {
    const questions = [
      question('shipment_backlog_by_location', 'operations', 'group_by', ['current_location'], ['record_count']),
      question('shipment_backlog_by_status', 'operations', 'group_by', ['status'], ['record_count']),
      question('shipment_value_exposure', 'operations', 'group_by', ['service'], ['cod']),
    ];
    const actions = [
      action('shipment_backlog_by_location', questions[0].id, 'group_by', ['current_location'], ['record_count']),
      action('shipment_backlog_by_status', questions[1].id, 'group_by', ['status'], ['record_count']),
      action('plugin:postal:value-exposure', questions[2].id, 'group_by', ['service'], ['cod']),
    ];

    const bundle = createPerspectiveAnalysisBundle(understanding(actions, questions), actions[0].id, 'operations');
    expect(bundle.supportingActions.map(item => item.id)).toEqual(['plugin:postal:value-exposure', 'shipment_backlog_by_status']);
  });
});
