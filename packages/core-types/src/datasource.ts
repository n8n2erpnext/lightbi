export type DatasourceType = 
  | 'CSV'
  | 'Excel'
  | 'JSON'
  | 'SQLite'
  | 'PostgreSQL'
  | 'MySQL'
  | 'MariaDB'
  | 'MongoDB'
  | 'ERPNext';

export interface DatasourceConfig {
  [key: string]: any;
}

export interface Datasource {
  id: string;
  projectId: string;
  name: string;
  type: DatasourceType;
  config: DatasourceConfig;
  status: 'Connected' | 'Disconnected' | 'Error';
  createdAt: string;
  updatedAt: string;
}
