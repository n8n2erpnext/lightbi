import { spawnSync } from 'node:child_process';

const runs = [
  ['cargo', ['test', '-p', 'lightbi-intelligence-pack', '--quiet']],
  ['pnpm', ['--dir', 'apps/desktop', 'exec', 'vitest', 'run', 'src/lib/intelligence-pack-runtime.test.ts']],
];
for (const [command, args] of runs) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: process.env, shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('intelligence_pack_contract=passed');
