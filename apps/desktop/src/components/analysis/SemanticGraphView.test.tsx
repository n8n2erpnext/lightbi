/** @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SemanticGraphView } from './SemanticGraphView';
import type { SemanticGraph } from '../../lib/semantic-graph-model';

describe('SemanticGraphView', () => {
  it('renders null for empty graph', () => {
    const emptyGraph: SemanticGraph = { nodes: [], edges: [], grain: 'unknown' };
    const { container } = render(<SemanticGraphView graph={emptyGraph} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders exactly N circle elements for N nodes', () => {
    const graph: SemanticGraph = {
      nodes: [
        { id: 'n1', label: 'Node 1', type: 'dimension', domain: 'unknown', confidenceScore: 100 },
        { id: 'n2', label: 'Node 2', type: 'measure', domain: 'unknown', confidenceScore: 100 },
        { id: 'n3', label: 'Node 3', type: 'time', domain: 'unknown', confidenceScore: 100 }
      ],
      edges: [],
      grain: 'event'
    };
    
    const { container } = render(<SemanticGraphView graph={graph} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBe(3);
  });

  it('renders correct fill color for a node with domain=operations', () => {
    const graph: SemanticGraph = {
      nodes: [
        { id: 'n1', label: 'Node 1', type: 'dimension', domain: 'operations', confidenceScore: 100 }
      ],
      edges: [],
      grain: 'event'
    };
    
    const { container } = render(<SemanticGraphView graph={graph} />);
    const circle = container.querySelector('circle');
    expect(circle?.getAttribute('fill')).toBe('#4F86C6');
  });

  it('renders circle with white stroke border', () => {
    const graph: SemanticGraph = {
      nodes: [{ id: 'route', label: 'Route', type: 'dimension' as const, domain: 'operations', confidenceScore: 80 }],
      edges: [],
      grain: 'event'
    };
    const { container } = render(<SemanticGraphView graph={graph} />);
    const circle = container.querySelector('circle');
    expect(circle?.getAttribute('stroke')).toBe('#fff');
  });

  it('renders performance domain node with amber color', () => {
    const graph: SemanticGraph = {
      nodes: [{ id: 'kpi', label: 'KPI', type: 'dimension' as const, domain: 'performance', confidenceScore: 90 }],
      edges: [],
      grain: 'unknown'
    };
    const { container } = render(<SemanticGraphView graph={graph} />);
    const circle = container.querySelector('circle');
    expect(circle?.getAttribute('fill')).toBe('#F59E0B');
  });
});
