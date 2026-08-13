export type ColumnDataType = 'String' | 'Number' | 'Date' | 'Boolean' | 'JSON';

export interface ColumnSchema {
  name: string;
  type: ColumnDataType;
  description?: string;
  isPrimary?: boolean;
}

export type DatasetOriginType = 'FileImport' | 'DatabaseTable' | 'QueryTransformation' | 'ERPNextResource';

export interface DatasetOrigin {
  type: DatasetOriginType;
  sourceId: string; // Refers to Datasource ID
  reference: string; // Table name, file path, or query
}

export interface Dataset {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  origin: DatasetOrigin;
  columns: ColumnSchema[];
  rowCount?: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
