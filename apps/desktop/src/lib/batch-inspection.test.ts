import { describe, it, expect } from 'vitest';
import { classifyDatasetFamilies } from './batch-inspection';
import type { SourceInspectionResult } from './source-preflight';

describe('classifyDatasetFamilies', () => {
  const createFile = (name: string) => new File([""], name);

  const createResult = (columns: string[], rows = 100): SourceInspectionResult => ({
    status: 'accessible',
    sourceType: 'local_csv',
    label: 'file',
    normalizedUrl: 'local',
    metadata: {
      name: 'test_file',
      rows_count: rows,
      columns,
      profiles: {}
    }
  });

  it('groups files with identical schemas into one family', () => {
    const items = [
      { file: createFile('file1.csv'), result: createResult(['id', 'name']) },
      { file: createFile('file2.csv'), result: createResult(['id', 'name']) }
    ];
    
    const families = classifyDatasetFamilies(items);
    expect(families.length).toBe(1);
    expect(families[0].files.length).toBe(2);
    expect(families[0].totalRows).toBe(200);
    expect(families[0].columns).toEqual(['id', 'name']);
  });

  it('separates files with different schemas', () => {
    const items = [
      { file: createFile('file1.csv'), result: createResult(['id', 'name']) },
      { file: createFile('file2.csv'), result: createResult(['id', 'name', 'age']) }
    ];
    
    const families = classifyDatasetFamilies(items);
    expect(families.length).toBe(2);
    expect(families[0].columns).toEqual(['id', 'name']);
    expect(families[1].columns).toEqual(['id', 'name', 'age']);
  });

  it('guesses family names based on keywords', () => {
    const logistics = { file: createFile('log.csv'), result: createResult(['mã tải kiện', 'chuyến xe']) };
    const inventory = { file: createFile('inv.csv'), result: createResult(['thời gian tồn', 'tiền thu hộ']) };
    const unknown = { file: createFile('unk.csv'), result: createResult(['col1', 'col2']) };

    const families = classifyDatasetFamilies([logistics, inventory, unknown]);
    expect(families.length).toBe(3);
    expect(families.find(f => f.columns.includes('mã tải kiện'))?.name).toBe('Delivery Performance Reports');
    expect(families.find(f => f.columns.includes('thời gian tồn'))?.name).toBe('Inventory Aging Reports');
    expect(families.find(f => f.columns.includes('col1'))?.name).toBe('Dataset Group C');
  });
});
