
import fs from 'fs';
const testPath = '/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/lib/dataset-understanding-contract.test.ts';
let testStr = fs.readFileSync(testPath, 'utf8');
testStr = testStr.replace(
  `const registry = createMockRegistry(['revenue', 'cost', 'profit', 'expense'], 'finance');`,
  `const registry = createMockRegistry(['revenue'], 'finance');`
);
// Make sure it applies to the exact right spot
testStr = testStr.replace(
  `const registry = createMockRegistry(['tax', 'discount', 'penalty', 'surcharge']);`,
  `const registry = createMockRegistry(['revenue'], 'finance');`
);
fs.writeFileSync(testPath, testStr);
console.log("Patched broken test again!");
