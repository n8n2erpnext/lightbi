import { getSignalType } from './business-signal-detector';
['expense', 'liability', 'equity', 'tax', 'tax_rate'].forEach(s => console.log(s, getSignalType(s)));
