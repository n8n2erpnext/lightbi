import { detectBusinessSignals } from './apps/desktop/src/lib/business-signal-detector';

const input = {
  columns: [
    { name: 'period', type: 'VARCHAR' },
    { name: 'revenue_total', type: 'number' },
    { name: 'cost_total', type: 'number' },
    { name: 'profit_net', type: 'number' },
    { name: 'margin_pct', type: 'number' },
    { name: 'expense_misc', type: 'number' },
    { name: 'discount_amt', type: 'number' },
    { name: 'purchase_cost_amt', type: 'number' },
    { name: 'operational_cost_amt', type: 'number' },
    { name: 'supplier_cost_amt', type: 'number' }
  ]
};

const registry = detectBusinessSignals(input);
console.log('Signals detected:', registry.signals.map(s => s.canonicalId).join(', '));
