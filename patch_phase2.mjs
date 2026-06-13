import fs from 'fs';

const viewPath = '/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/components/analysis/SemanticGraphView.tsx';
let viewStr = fs.readFileSync(viewPath, 'utf8');

// Fix 1: Node border
viewStr = viewStr.replace(/stroke="#333"/g, 'stroke="#fff"');

// Fix 2: Edge colors
const edgeStyleDef = `const getEdgeStyle = (type: string) => {
  if (type === 'relationship') return { stroke: '#818cf8', strokeWidth: 2, strokeDasharray: 'none', strokeOpacity: 0.6 };
  if (type === 'workflow')     return { stroke: '#34d399', strokeWidth: 1.5, strokeDasharray: '5,3', strokeOpacity: 0.7 };
  return { stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: 'none', strokeOpacity: 0.4 }; // co_occurrence
};

export const SemanticGraphView: React.FC<SemanticGraphViewProps> = ({ graph }) => {`;

viewStr = viewStr.replace('export const SemanticGraphView: React.FC<SemanticGraphViewProps> = ({ graph }) => {', edgeStyleDef);

const oldEdgeRender = `            <line
              key={edge.id}
              x1={sourcePos.x}
              y1={sourcePos.y}
              x2={targetPos.x}
              y2={targetPos.y}
              stroke="#999"
              strokeWidth="2"
              strokeOpacity="0.4"
            />`;
const newEdgeRender = `            {(() => {
              const style = getEdgeStyle(edge.type);
              return (
                <line
                  key={edge.id}
                  x1={sourcePos.x}
                  y1={sourcePos.y}
                  x2={targetPos.x}
                  y2={targetPos.y}
                  stroke={style.stroke}
                  strokeWidth={style.strokeWidth}
                  strokeDasharray={style.strokeDasharray}
                  strokeOpacity={style.strokeOpacity}
                />
              );
            })()}`;
viewStr = viewStr.replace(oldEdgeRender, newEdgeRender);

// Fix 3: Add performance to DOMAIN_COLORS
viewStr = viewStr.replace("customer: '#E05C7A',", "customer: '#E05C7A',\n  performance: '#F59E0B',");

// Fix 4: Tooltip using <title>
const oldTitleRender = `            <g key={node.id}>
              <circle`;
const newTitleRender = `            <g key={node.id}>
              <title>{\`\${node.label} (\${node.domain}) · \${Math.round(node.confidenceScore)}% confidence\`}</title>
              <circle`;
viewStr = viewStr.replace(oldTitleRender, newTitleRender);

fs.writeFileSync(viewPath, viewStr);

const testPath = '/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/components/analysis/SemanticGraphView.test.tsx';
let testStr = fs.readFileSync(testPath, 'utf8');

const newTests = `  it('renders circle with white stroke border', () => {
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
});`;

testStr = testStr.replace('});\n', newTests + '\n');
fs.writeFileSync(testPath, testStr);

console.log("Patched!");
