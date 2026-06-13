import fs from 'fs';

const contractPath = '/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/lib/dataset-understanding-contract.ts';
let contractStr = fs.readFileSync(contractPath, 'utf8');

// The new function definition to insert
const newFunc = fs.readFileSync('/home/ubuntu/n8n2erpnext/LightBI/generate_domain_opps.ts', 'utf8');

// Find the old generateDomainOpportunities function
const startIdx = contractStr.indexOf('function generateDomainOpportunities(');
const endIdx = contractStr.indexOf('function generateNarrative(');

if (startIdx === -1 || endIdx === -1) {
  console.log("Could not find function boundaries");
  process.exit(1);
}

// Replace it
contractStr = contractStr.slice(0, startIdx) + newFunc + '\n' + contractStr.slice(endIdx);

fs.writeFileSync(contractPath, contractStr);
console.log("Injected new generateDomainOpportunities!");
