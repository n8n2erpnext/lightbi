import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Advanced SQL editor Monaco runtime contract', () => {
  it('loads the suggest contribution before registering contextual SQL completions', () => {
    const source = readFileSync(new URL('./AdvancedSqlEditor.tsx', import.meta.url), 'utf8');
    expect(source).toContain("import 'monaco-editor/editor/contrib/suggest/browser/suggestController';");
    expect(source).toContain("registerCompletionItemProvider('sql'");
    expect(source).toContain("quickSuggestionsDelay: 75");
    expect(source).toContain("suggestOnTriggerCharacters: provider !== 'mongodb'");
  });
});
