import { spawnSync } from 'node:child_process';

const pnpm = 'pnpm';
const governed = [
  ['public release contract', ['test:release-contract']],
  ['public/private boundary', ['test:public-boundary']],
  ['generation contract', ['test:generation-contract']],
  ['routing authority contract', ['test:routing-authority']],
  ['pre-production operations contract', ['test:preproduction-ops']],
  ['owner UAT-pack contract', ['test:internal-uat-pack']],
  ['generation runtime diagnostics', ['--dir','apps/desktop','exec','vitest','run','src/lib/generation-manifest.test.ts','src/lib/generation-diagnostics.test.ts']],
  ['native updater capability contract', ['exec','node','scripts/validate-native-capabilities.mjs']],
  ['intelligence pack trust and runtime contract', ['test:intelligence-pack-contract']],
  ['workspace history durability', ['--dir','apps/desktop','exec','vitest','run','src/lib/project-source-file-api.test.ts','src/lib/home-workspace-persistence.test.ts','src/lib/investigation-persistence-actions.test.ts','src/hooks/useHomeWorkspaceSessions.test.tsx']],
  ['production source-size gate', ['test:source-module-size']],
  ['desktop production build', ['--filter','@lightbi/desktop','build']],
  ['governed product regression', ['--dir','apps/desktop','exec','vitest','run',
    'src/lib/analysis-workbook.test.ts',
    'src/lib/decision-visualization-plan.test.ts',
    'src/pages/Datasets.test.tsx',
    'src/lib/understanding-core/phase-8d1-production-multisource.test.ts',
    'src/components/analysis/PerspectiveCollectionResultCard.test.tsx',
    'src/components/investigation/InvestigationDeepAnalysis.test.tsx',
    'src/lib/understanding-core/phase-7r41-repository-corpus.test.ts',
    'src/lib/runtime-source-continuity.test.ts',
    'src/lib/distribution-pairing.test.ts',
    'src/lib/understanding-core/semantic-capability-matrix.test.ts',
    'src/lib/understanding-core/xomdata-sql-semantic.corpus.test.ts',
    '--maxWorkers=2']],
];

console.log('LightBI 1.0 release-authoritative platform-independent suite');
console.log('Historical full-desktop Vitest is diagnostic only and is intentionally excluded from release-green semantics.');
for (const [label,args] of governed) {
  console.log(`\n== ${label} ==`);
  const run=spawnSync(pnpm,args,{stdio:'inherit',env:process.env,shell:process.platform==='win32'});
  if (run.error) throw run.error;
  if (run.status!==0) process.exit(run.status ?? 1);
}
console.log('\nrelease_1_0_suite=passed');
