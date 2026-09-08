import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = path.join(process.cwd(), 'src');
const read = (relativePath: string) => fs.readFileSync(path.join(SRC, relativePath), 'utf8');

describe('DPR-0 Web Live Demo product parity', () => {
  it('keeps /app on the same product router, Home workspace, and multi-file analysis surface as Desktop', () => {
    const routes = read('routes/index.tsx');
    const home = read('pages/Home.tsx');
    const workspace = read('components/home/HomeWorkspaceView.tsx');
    const multiFile = read('components/analysis/PerspectiveCollectionResultCard.tsx');

    expect(routes).toContain("window.location.pathname.startsWith('/app') ? '/app' : '/'");
    expect(routes).toContain("{ path: '/', element: <Home /> }");
    expect(home).toContain('<HomeWorkspaceView model={{');
    expect(workspace).toContain('<PerspectiveCollectionResultCard');
    expect(multiFile).toContain("type CollectionAnalysisView = 'decision_workspace' | 'evidence_drill' | 'deep_perspective' | 'deep_selected'");
    expect(multiFile).not.toContain('showSubsetDeepDive');
    expect(multiFile).not.toContain('showDeepDive');
    expect(routes).not.toContain('DemoHome');
    expect(routes).not.toContain('DemoWorkspace');
  });
});
