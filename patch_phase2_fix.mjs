import fs from 'fs';

const viewPath = '/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/components/analysis/SemanticGraphView.tsx';
let viewStr = fs.readFileSync(viewPath, 'utf8');

const invalidBlock = `          return (
            {(() => {
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
            })()}
          );`;

const validBlock = `          const style = getEdgeStyle(edge.type);
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
          );`;

viewStr = viewStr.replace(invalidBlock, validBlock);

fs.writeFileSync(viewPath, viewStr);
console.log("Patched syntax error!");
