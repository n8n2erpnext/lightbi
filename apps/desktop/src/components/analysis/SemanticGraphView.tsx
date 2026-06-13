import React from 'react';
import { SemanticGraph, SemanticNodeType } from '../../lib/semantic-graph-model';

interface SemanticGraphViewProps {
  graph: SemanticGraph;
}

const DOMAIN_COLORS: Record<string, string> = {
  operations: '#4F86C6',
  finance: '#5EAA7B',
  inventory: '#E08A3C',
  revenue: '#9B6BC9',
  customer: '#E05C7A',
  performance: '#F59E0B',
  unknown: '#888888'
};

function getNodeStyle(type: SemanticNodeType) {
  switch (type) {
    case 'dimension': return { strokeWidth: 2, strokeDasharray: 'none' };
    case 'measure': return { strokeWidth: 3, strokeDasharray: 'none' };
    case 'time': return { strokeWidth: 2, strokeDasharray: '4,4' };
    default: return { strokeWidth: 2, strokeDasharray: '2,2' }; // unknown
  }
}

function truncateLabel(label: string) {
  return label.length > 10 ? label.slice(0, 9) + '…' : label;
}

const getEdgeStyle = (type: string) => {
  if (type === 'relationship') return { stroke: '#818cf8', strokeWidth: 2, strokeDasharray: 'none', strokeOpacity: 0.6 };
  if (type === 'workflow')     return { stroke: '#34d399', strokeWidth: 1.5, strokeDasharray: '5,3', strokeOpacity: 0.7 };
  return { stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: 'none', strokeOpacity: 0.4 }; // co_occurrence
};

export const SemanticGraphView: React.FC<SemanticGraphViewProps> = ({ graph }) => {
  if (!graph || graph.nodes.length === 0) return null;

  const width = 600;
  const height = 240;
  
  // Calculate positions
  const nodePositions = new Map<string, { x: number, y: number }>();
  
  if (graph.nodes.length <= 5) {
    // Single row
    const spacing = width / (graph.nodes.length + 1);
    graph.nodes.forEach((node, idx) => {
      nodePositions.set(node.id, { x: spacing * (idx + 1), y: height / 2 });
    });
  } else {
    // Two rows
    const topRowNodes = Math.ceil(graph.nodes.length / 2);
    const bottomRowNodes = graph.nodes.length - topRowNodes;
    
    const topSpacing = width / (topRowNodes + 1);
    const bottomSpacing = width / (bottomRowNodes + 1);
    
    graph.nodes.forEach((node, idx) => {
      if (idx < topRowNodes) {
        nodePositions.set(node.id, { x: topSpacing * (idx + 1), y: height / 3 });
      } else {
        nodePositions.set(node.id, { x: bottomSpacing * ((idx - topRowNodes) + 1), y: (height / 3) * 2 });
      }
    });
  }

  return (
    <div style={{ width: '100%', height: '240px', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" style={{ backgroundColor: '#fafafa' }}>
        {/* Grain Badge */}
        <text x={width - 10} y={20} textAnchor="end" fontSize="12" fill="#666">
          Grain: {graph.grain}
        </text>

        {/* Edges */}
        {graph.edges.map(edge => {
          const sourcePos = nodePositions.get(edge.sourceId);
          const targetPos = nodePositions.get(edge.targetId);
          if (!sourcePos || !targetPos) return null;

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
        })}

        {/* Nodes */}
        {graph.nodes.map(node => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;
          const color = DOMAIN_COLORS[node.domain] || DOMAIN_COLORS.unknown;
          const style = getNodeStyle(node.type);

          return (
            <g key={node.id}>
              <title>{`${node.label} (${node.domain}) · ${Math.round(node.confidenceScore)}% confidence`}</title>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={18}
                fill={color}
                stroke="#fff"
                strokeWidth={style.strokeWidth}
                strokeDasharray={style.strokeDasharray}
              />
              <text
                x={pos.x}
                y={pos.y + 30}
                textAnchor="middle"
                fontSize="11"
                fill="#333"
                fontWeight="500"
              >
                {truncateLabel(node.label)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
