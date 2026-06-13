import { detectBusinessSignals } from './apps/desktop/src/lib/business-signal-detector';

const input1 = { columns: [{ name: 'report_date', type: 'VARCHAR' }] };
const input2 = { columns: [{ name: 'delivery date', type: 'VARCHAR' }] };
const input3 = { columns: [{ name: 'date', type: 'VARCHAR' }] };
const input4 = { columns: [{ name: 'order_date', type: 'VARCHAR' }] };

console.log('report_date ->', detectBusinessSignals(input1).signals.map(s => s.canonicalId));
console.log('delivery date ->', detectBusinessSignals(input2).signals.map(s => s.canonicalId));
console.log('date ->', detectBusinessSignals(input3).signals.map(s => s.canonicalId));
console.log('order_date ->', detectBusinessSignals(input4).signals.map(s => s.canonicalId));
