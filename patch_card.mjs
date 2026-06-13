import fs from 'fs';

const filePath = './DatasetUnderstandingCard.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add imports
const lucideImportOld = "import { CheckCircle2, AlertTriangle, XCircle, ChevronRight, Info, Database, Box, Layers, Table, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';";
const lucideImportNew = "import { CheckCircle2, AlertTriangle, XCircle, ChevronRight, Info, Database, Box, Layers, Table, HelpCircle, ChevronDown, ChevronUp, Download } from 'lucide-react';\nimport { generateAdvancedHandoff } from '../../lib/advanced-handoff-generator';";
content = content.replace(lucideImportOld, lucideImportNew);

// Add export function
const exportFn = `  const handleExportHandoff = () => {
    const rawColumns = understanding.mappingReview?.items.map(i => i.physicalColumn) || 
      understanding.detectedConcepts.flatMap(c => c.evidence);
    const uniqueColumns = Array.from(new Set(rawColumns));
    
    const artifact = generateAdvancedHandoff(understanding, uniqueColumns);
    const jsonStr = JSON.stringify(artifact, null, 2);
    
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = \`lightbi_handoff_\${understanding.datasetId}.json\`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const statusConfig = getStatusConfig();`;

content = content.replace("  const statusConfig = getStatusConfig();", exportFn);

// Add button to the top right corner
const rightColOld = `        <div className="flex flex-col items-end gap-1.5">
          <div className="\`flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium border \${statusConfig.bg} \${statusConfig.border} \${statusConfig.color}\`">
            <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
            {statusConfig.text}
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Confidence: {Math.round(understanding.confidenceScore)}%</span>
        </div>`;
        
const rightColNew = `        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportHandoff}
              className="flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm"
              title="Export Advanced Handoff JSON"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
              Export Advanced Handoff
            </button>
            <div className={\`flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium border \${statusConfig.bg} \${statusConfig.border} \${statusConfig.color}\`}>
              <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
              {statusConfig.text}
            </div>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Confidence: {Math.round(understanding.confidenceScore)}%</span>
        </div>`;

content = content.replace(rightColOld.replace(/`/g, '\\`'), rightColNew);

// Since my string replacement for rightCol might fail due to the template literal escaping, 
// I'll do a simpler replacement

const oldHeaderEnd = `        <div className="flex flex-col items-end gap-1.5">
          <div className={\`flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium border \${statusConfig.bg} \${statusConfig.border} \${statusConfig.color}\`}>
            <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
            {statusConfig.text}
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Confidence: {Math.round(understanding.confidenceScore)}%</span>
        </div>`;

const newHeaderEnd = `        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportHandoff}
              className="flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-colors"
              title="Export Advanced Handoff JSON for dbt/Python"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
              Export Handoff
            </button>
            <div className={\`flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium border \${statusConfig.bg} \${statusConfig.border} \${statusConfig.color}\`}>
              <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
              {statusConfig.text}
            </div>
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Confidence: {Math.round(understanding.confidenceScore)}%</span>
        </div>`;

content = content.replace(oldHeaderEnd, newHeaderEnd);

fs.writeFileSync(filePath, content);
console.log("DatasetUnderstandingCard.tsx patched!");
