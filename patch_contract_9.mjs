import fs from 'fs';

const testPath = '/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/src/lib/dataset-understanding-contract.test.ts';
let testStr = fs.readFileSync(testPath, 'utf8');

// The original line we need to find might be unknown1, unknown2...
if (testStr.includes("const registry = createMockRegistry(['unknown1', 'unknown2', 'unknown3', 'unknown4']);")) {
  testStr = testStr.replace(
    `const registry = createMockRegistry(['unknown1', 'unknown2', 'unknown3', 'unknown4']);`,
    `const registry = createMockRegistry(['revenue'], 'finance');`
  );
} else if (testStr.includes("const registry = createMockRegistry(['tax', 'discount', 'penalty', 'surcharge']);")) {
  testStr = testStr.replace(
    `const registry = createMockRegistry(['tax', 'discount', 'penalty', 'surcharge']);`,
    `const registry = createMockRegistry(['revenue'], 'finance');`
  );
} else {
  // Try to find the exact line using regex
  testStr = testStr.replace(/const registry = createMockRegistry\(\[.*?\].*?\);/g, (match, offset) => {
    // Only replace the one in the specific test block
    if (offset > testStr.indexOf('downgrades to exploratory_only when signals/views are present but no actionable opportunities exist')) {
      if (offset < testStr.indexOf('downgrades to exploratory_only when only time or entity signals exist but no measures/dimensions')) {
        return `const registry = createMockRegistry(['revenue']);`;
      }
    }
    return match;
  });
}

fs.writeFileSync(testPath, testStr);
console.log("Patched correctly!");
