import { readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const required = [
  'scripts/ops/lightbi-chassis-backup.sh',
  'scripts/ops/lightbi-chassis-restore.sh',
  'scripts/ops/lightbi-chassis-restore-drill.sh',
  'scripts/ops/lightbi-chassis-preflight.sh',
  'scripts/ops/lightbi-build-engine-bundle.sh',
  'scripts/ops/lightbi-activate-engine-bundle.sh',
  'scripts/ops/lightbi-sync-internal-release.sh',
  'scripts/ops/lightbi-export-dr-bootstrap.sh',
  'scripts/ops/lightbi-unseal-dr-bootstrap.sh',
  'scripts/ops/lightbi-vps-restore-bootstrap.sh',
];
for (const file of required) {
  if (!statSync(file).isFile()) throw new Error(`missing_ops_contract:${file}`);
  const check=spawnSync('bash',['-n',file],{stdio:'inherit'});
  if (check.status !== 0) throw new Error(`invalid_shell:${file}`);
}
const workflow=readFileSync('.github/workflows/native-internal-update-acceptance.yml','utf8');
if (!workflow.includes('lightbi-next/releases')) throw new Error('internal_r2_prefix_missing');
if (workflow.includes('release/lightbi/')) throw new Error('internal_workflow_leaks_production_prefix');
if (!workflow.includes('https://lightbi-next.thaiduy.digital/internal-releases/')) throw new Error('next_release_edge_missing');
const chassis=readFileSync('deploy/chassis/chassis.env.example','utf8');
if (!chassis.includes('LIGHTBI_ENGINE_CURRENT_LINK=')) throw new Error('engine_chassis_contract_missing');
console.log(JSON.stringify({schema:'lightbi.preproduction-ops-check.v1',shellScripts:required.length,internalPrefix:'lightbi-next/releases',productionPrefixReferenced:false}));
