/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { Investigation } from './Investigation';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock the investigation session
vi.mock('../lib/investigation-session', () => ({
  getCurrentInvestigationSession: vi.fn(),
}));

// Mock the preview executors
vi.mock('../lib/backend-preview-executor', () => ({
  executeBackendPreview: vi.fn(),
}));

vi.mock('../lib/duckdb-preview-sandbox', () => ({
  executeDuckDBPreviewSandbox: vi.fn(),
}));

// Mock the ChartPreviewRenderer to avoid ECharts/canvas crashes in jsdom
vi.mock('../components/analysis/ChartPreviewRenderer', () => ({
  ChartPreviewRenderer: () => <div data-testid="mock-chart-renderer">Mock Chart</div>
}));

// Mock the validator to not interfere too aggressively unless we want it to
vi.mock('../lib/result-validator-contract', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    validatePreviewAgainstIntent: vi.fn().mockReturnValue({ status: 'passed', warnings: [] })
  };
});

import { getCurrentInvestigationSession } from '../lib/investigation-session';
import { executeBackendPreview } from '../lib/backend-preview-executor';
import { executeDuckDBPreviewSandbox } from '../lib/duckdb-preview-sandbox';
import { validatePreviewAgainstIntent } from '../lib/result-validator-contract';

const mockSession = {
  id: 'test-session',
  datasetId: 'test-dataset',
  createdAt: Date.now(),
  analysisAction: {
    id: 'test-action',
    actionType: 'group_by',
    opportunityName: 'Test Analysis',
    dimensions: ['dim1'],
    measures: ['meas1']
  },
  runtimeIntent: {
    id: 'test-intent',
    type: 'distribution',
    dimensions: ['dim1'],
    measures: ['meas1'],
    expectedShape: 'bar_chart',
    status: 'ready'
  },
  runtimePlanPreview: {
    id: 'test-plan',
    status: 'ready',
    logicalOperations: [],
    requiredColumns: [],
    warnings: [],
    blockedReasons: [],
    expectedOutput: { 
      shape: 'bar_chart',
      dimensions: ['dim1'],
      measures: ['meas1']
    }
  },
  rows: []
};

describe('Investigation Boundary Contract & Truth Truth', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (getCurrentInvestigationSession as any).mockReturnValue(mockSession);
    (validatePreviewAgainstIntent as any).mockReturnValue({ status: 'passed', warnings: [] });
  });

  afterEach(() => {
    cleanup();
  });

  it('0.1 renders Run preview when AI briefing uses current readiness contract', () => {
    (getCurrentInvestigationSession as any).mockReturnValue({
      ...mockSession,
      aiBriefing: {
        datasetId: 'test-dataset',
        generatedAt: '2026-06-14T00:00:00.000Z',
        grain: 'event',
        grainEvidence: 'Contains shipment rows',
        readinessTier: 'caution',
        readinessScore: 72,
        semanticFields: [],
        caveats: ['No stable time dimension detected.'],
        safeActionHints: ['Can inspect dataset structure']
      }
    });

    render(<Investigation />);

    expect(screen.getByRole('button', { name: /Run preview/i })).toBeDefined();
    expect(screen.getByText('Moderate Readiness (Caution)')).toBeDefined();
    expect(screen.getByText(/No stable time dimension detected/)).toBeDefined();
  });

  it('1. Upgrades empty executed result to failed truth state', async () => {
    (executeBackendPreview as any).mockResolvedValue({
      status: 'executed',
      rows: [],
      rowCount: 0,
      columns: ['dim1', 'meas1'],
      source: 'backend_duckdb_preview',
      warnings: [],
      blockedReasons: []
    });

    render(<Investigation />);
    
    // Click "Run preview"
    const runBtn = screen.getByRole('button', { name: /Run preview/i });
    fireEvent.click(runBtn);

    // Wait for the empty state upgrade
    await waitFor(() => {
      expect(screen.getByText('Execution Failed')).toBeDefined();
    });
    
    expect(screen.getAllByText('Execution completed but returned an empty dataset. Analysis unavailable.')[0]).toBeDefined();
    
    // Should not render the actual chart area
    expect(screen.queryByText('Ready to execute')).toBeNull(); 
  });

  it('2. distribution + DUCKDB_BOOTSTRAP_ERROR: allows fallback and expresses degraded messaging', async () => {
    // Backend fails with bootstrap error
    (executeBackendPreview as any).mockResolvedValue({
      status: 'failed',
      rows: [],
      rowCount: 0,
      columns: [],
      source: 'backend_duckdb_preview',
      warnings: [],
      blockedReasons: [],
      errorMessage: 'DUCKDB_BOOTSTRAP_ERROR: Worker is not defined'
    });

    // Fallback succeeds
    (executeDuckDBPreviewSandbox as any).mockResolvedValue({
      status: 'executed',
      rows: [{ dim1: 'A', meas1: 10 }],
      rowCount: 1,
      columns: ['dim1', 'meas1'],
      source: 'js_sandbox_fallback', // Critical to trigger degraded
      warnings: [],
      blockedReasons: []
    });

    render(<Investigation />);
    
    const runBtn = screen.getByRole('button', { name: /Run preview/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText(/Degraded Execution Mode/)).toBeDefined();
    });
    expect(screen.getByText('EXECUTED')).toBeDefined(); // The fallback succeeded
  });

  it('2.0.1 distribution + DUCKDB_PARSER_ERROR: never falls back for sql logic errors', async () => {
    // Backend fails with parser error
    (executeBackendPreview as any).mockResolvedValue({
      status: 'failed',
      rows: [],
      rowCount: 0,
      columns: [],
      source: 'local_duckdb_preview',
      warnings: [],
      blockedReasons: [],
      errorMessage: 'DUCKDB_PARSER_ERROR: syntax error'
    });

    render(<Investigation />);
    
    const runBtn = screen.getByRole('button', { name: /Run preview/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Execution Boundary Failed')[0]).toBeDefined();
    });
    
    expect(screen.getAllByText('DUCKDB_PARSER_ERROR: syntax error')[0]).toBeDefined();
    expect(executeDuckDBPreviewSandbox).not.toHaveBeenCalled();
  });

  it('2.0.2 table_preview + DUCKDB_MEMORY_ERROR: allows fallback for simple intent with infra error', async () => {
    (getCurrentInvestigationSession as any).mockReturnValue({
      ...mockSession,
      runtimeIntent: { ...mockSession.runtimeIntent, type: 'table_preview' }
    });

    // Backend fails with memory error
    (executeBackendPreview as any).mockResolvedValue({
      status: 'failed',
      rows: [],
      rowCount: 0,
      columns: [],
      source: 'backend_duckdb_preview',
      warnings: [],
      blockedReasons: [],
      errorMessage: 'DUCKDB_MEMORY_ERROR: Out of Memory'
    });

    (executeDuckDBPreviewSandbox as any).mockResolvedValue({
      status: 'executed',
      rows: [{ dim1: 'A', meas1: 10 }],
      rowCount: 1,
      columns: ['dim1', 'meas1'],
      source: 'js_sandbox_fallback',
      warnings: [],
      blockedReasons: []
    });

    render(<Investigation />);
    const runBtn = screen.getByRole('button', { name: /Run preview/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getByText(/Degraded Execution Mode/)).toBeDefined();
    });
  });

  it('2.0 distribution + CANONICAL_PROJECTION_MISSING: never falls back for semantic schema errors', async () => {
    // Backend fails with projection error
    (executeBackendPreview as any).mockResolvedValue({
      status: 'failed',
      rows: [],
      rowCount: 0,
      columns: [],
      source: 'local_duckdb_preview',
      warnings: [],
      blockedReasons: [],
      errorMessage: 'CANONICAL_PROJECTION_MISSING: Required field "revenue" is missing from dataset'
    });

    render(<Investigation />);
    
    const runBtn = screen.getByRole('button', { name: /Run preview/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      // It should NOT fall back, so it should show the execution boundary failed
      expect(screen.getAllByText('Execution Boundary Failed')[0]).toBeDefined();
    });
    
    expect(screen.getAllByText('CANONICAL_PROJECTION_MISSING: Required field "revenue" is missing from dataset')[0]).toBeDefined();
    expect(executeDuckDBPreviewSandbox).not.toHaveBeenCalled();
  });

  it('2.1 group_by + DUCKDB_BOOTSTRAP_ERROR: does not fallback and honestly surfaces backend failure for complex intent', async () => {
    // Override the session to have a complex intent
    (getCurrentInvestigationSession as any).mockReturnValue({
      ...mockSession,
      runtimeIntent: { ...mockSession.runtimeIntent, type: 'group_by' }
    });

    // Backend fails with BOOTSTRAP error
    (executeBackendPreview as any).mockResolvedValue({
      status: 'failed',
      rows: [],
      rowCount: 0,
      columns: [],
      source: 'backend_duckdb_preview',
      warnings: [],
      blockedReasons: [],
      errorMessage: 'DUCKDB_BOOTSTRAP_ERROR: Worker not found'
    });

    render(<Investigation />);
    
    const runBtn = screen.getByRole('button', { name: /Run preview/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Execution Boundary Failed')[0]).toBeDefined();
    });
    
    expect(screen.getAllByText('DUCKDB_BOOTSTRAP_ERROR: Worker not found')[0]).toBeDefined();
    expect(executeDuckDBPreviewSandbox).not.toHaveBeenCalled();
  });

  it('2.1b trend + LOCAL_EXECUTOR_UNAVAILABLE: does not fallback for complex intent even if infra error', async () => {
    // Override the session to have a complex intent
    (getCurrentInvestigationSession as any).mockReturnValue({
      ...mockSession,
      runtimeIntent: { ...mockSession.runtimeIntent, type: 'trend' }
    });

    // Backend fails with LOCAL_EXECUTOR_UNAVAILABLE
    (executeBackendPreview as any).mockResolvedValue({
      status: 'failed',
      rows: [],
      rowCount: 0,
      columns: [],
      source: 'local_duckdb_preview',
      warnings: [],
      blockedReasons: [],
      errorMessage: 'LOCAL_EXECUTOR_UNAVAILABLE: WASM memory limit'
    });

    render(<Investigation />);
    
    const runBtn = screen.getByRole('button', { name: /Run preview/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Execution Boundary Failed')[0]).toBeDefined();
    });
    
    expect(screen.getAllByText('LOCAL_EXECUTOR_UNAVAILABLE: WASM memory limit')[0]).toBeDefined();
    expect(executeDuckDBPreviewSandbox).not.toHaveBeenCalled();
  });

  it('2.3 Surfaces transparent local DuckDB unknown runtime error without fallback', async () => {
    (getCurrentInvestigationSession as any).mockReturnValue({
      ...mockSession,
      runtimeIntent: { ...mockSession.runtimeIntent, type: 'distribution' }
    });

    (executeBackendPreview as any).mockResolvedValue({
      status: 'failed',
      rows: [],
      rowCount: 0,
      columns: [],
      source: 'local_duckdb_preview',
      warnings: [],
      blockedReasons: [],
      errorMessage: 'DUCKDB_UNKNOWN_RUNTIME_ERROR: some weird panic'
    });

    render(<Investigation />);
    const runBtn = screen.getByRole('button', { name: /Run preview/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Execution Boundary Failed')[0]).toBeDefined();
    });
    
    expect(screen.getAllByText('DUCKDB_UNKNOWN_RUNTIME_ERROR: some weird panic')[0]).toBeDefined();
    expect(executeDuckDBPreviewSandbox).not.toHaveBeenCalled();
  });

  it('3. Does not render chart placeholder as success when preview boundary fails', async () => {
    (executeBackendPreview as any).mockResolvedValue({
      status: 'executed',
      rows: [{ dim1: 'A', meas1: 10 }],
      rowCount: 1,
      columns: ['dim1', 'meas1'],
      source: 'backend_duckdb_preview',
      warnings: [],
      blockedReasons: []
    });

    // Validator rejects it!
    (validatePreviewAgainstIntent as any).mockReturnValue({
      status: 'failed',
      warnings: ['Insufficient quality']
    });

    render(<Investigation />);
    
    const runBtn = screen.getByRole('button', { name: /Run preview/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Execution Boundary Failed')[0]).toBeDefined();
    });
    
    expect(screen.getAllByText('Validation boundary rejected the preview result due to insufficient quality or missing required data.')[0]).toBeDefined();
    expect(screen.getByText('Insufficient quality')).toBeDefined();
    
    // Chart placeholder should be gone/replaced by error
    expect(screen.queryByText('Ready to execute')).toBeNull();
  });
});
