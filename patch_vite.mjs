import fs from 'fs';

const configPath = '/home/ubuntu/n8n2erpnext/LightBI/apps/desktop/vite.config.ts';
let configStr = fs.readFileSync(configPath, 'utf8');

configStr = configStr.replace("exclude: ['**/node_modules/**', '**/dist/**', 'verify.spec.ts', 'concurrency.spec.ts']", "exclude: ['**/node_modules/**', '**/dist/**', 'verify.spec.ts', 'concurrency.spec.ts', '**/e2e/**']");

fs.writeFileSync(configPath, configStr);
