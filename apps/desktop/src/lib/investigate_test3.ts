import { createDatasetUnderstanding } from './dataset-understanding-contract';

const signals = ['revenue'].map(id => ({
  canonicalId: id,
  domain: 'finance',
  label: id,
  confidenceScore: 80,
  supportingEvidence: []
}));

const registry = {
  datasetId: 'ds1',
  signals,
  hasSignal: (id: string) => ['revenue'].includes(id),
  getSignal: (id: string) => signals.find(s => s.canonicalId === id),
  getSignalsByDomain: () => signals,
  getOverallConfidence: () => 80
};

const du = createDatasetUnderstanding({ 
  signalRegistry: registry as any,
  businessViews: [{ id: 'profitability_analysis' }, { id: 'margin_analysis' }] 
});

console.log('Status:', du.status);
console.log('Opportunities count:', du.opportunities.length);
console.log('Available count:', du.availableAnalysis.length);
console.log(JSON.stringify(du.opportunities, null, 2));
console.log(JSON.stringify(du.availableAnalysis, null, 2));
