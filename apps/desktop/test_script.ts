import { runGuidedInvestigationPipeline } from './src/lib/guided-investigation-pipeline';
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
const result = runGuidedInvestigationPipeline(dataset);
console.log(JSON.stringify(result.mappingReview, null, 2));
