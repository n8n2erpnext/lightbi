import type { Datasource } from './datasource';
import type { Dataset } from './dataset';
import type { Chart } from './chart';
import type { Dashboard } from './dashboard';

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  
  datasources: Datasource[];
  datasets: Dataset[];
  charts: Chart[];
  dashboards: Dashboard[];
}
