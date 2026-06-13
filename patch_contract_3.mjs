import fs from 'fs';
import path from 'path';

const contractPath = '/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/lib/dataset-understanding-contract.ts';
let contractStr = fs.readFileSync(contractPath, 'utf8');

const badBlock = `
  if (has('report_date') && has('route') && has('driver') && has('shipment') && has('satisfaction')) {
    const feedback = inferredEntities.find(e => e.conceptSignals.includes('satisfaction'));
    if (feedback) feedback.label = 'Customer Feedback';
  }`;

contractStr = contractStr.replace(badBlock, '');

const goodBlock = `
  const has = (id: string) => signalIds.includes(id);

  if (has('report_date') && has('route') && has('driver') && has('shipment') && has('satisfaction')) {
    const feedback = inferredEntities.find(e => e.conceptSignals.includes('satisfaction'));
    if (feedback) feedback.label = 'Customer Feedback';
  }`;

contractStr = contractStr.replace(`const has = (id: string) => signalIds.includes(id);`, goodBlock);

fs.writeFileSync(contractPath, contractStr);
console.log("Moved has check!");
