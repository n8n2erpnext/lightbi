import { createDatasetUnderstanding } from './dataset-understanding-contract';
const registry = {
  datasetId: 'ds1',
  signals: ['customer', 'segment', 'retention', 'order_count'].map(id => ({ canonicalId: id, domain: 'test', label: id, confidenceScore: 80, supportingEvidence: [] })),
  hasSignal: (id) => ['customer', 'segment', 'retention', 'order_count'].includes(id),
  getSignal: (id) => null,
  getSignalsByDomain: () => [],
  getOverallConfidence: () => 80
};
const du = createDatasetUnderstanding({ signalRegistry: registry as any, status: 'understood' });
console.log(JSON.stringify(du.availableAnalysis, null, 2));
