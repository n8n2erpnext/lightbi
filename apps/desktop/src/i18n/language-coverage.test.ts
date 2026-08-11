import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

type ViCatalog = { messages?: Record<string, string> };

const i18nDir = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(i18nDir, '..');
const catalog = JSON.parse(
  fs.readFileSync(path.join(i18nDir, 'languages', 'vi.json'), 'utf8'),
) as ViCatalog;
const known = new Set(Object.keys(catalog.messages ?? {}));
const mixedLanguagePattern = /\b(?:dashboard|file|online|server|native|metadata|core|license(?: key)?|backend|easy mode|raw data|read-only|runtime|governed)\b/i;
const uiObjectKeys = new Set([
  'title', 'placeholder', 'aria-label', 'label', 'name', 'intent', 'bestFor',
  'description', 'subtitle', 'heading', 'action', 'emptyMessage',
]);

const sourceFiles: string[] = [];
function walk(directory: string) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\./.test(entry.name)) sourceFiles.push(fullPath);
  }
}

function isTechnicalToken(value: string) {
  return /^(https?:|[a-z0-9_.\-/]+\.(tsx?|jsx?|json|css)|[A-Z0-9_:-]+)$/.test(value)
    || /^[a-z0-9]+(?:_[a-z0-9]+)+$/.test(value)
    || /^https?:\/\/?$/.test(value)
    || /^(?:&gt;=?|&lt;=?|mock_|new_table|connection_option|compare_periods|explain_change|point_in_time|quality_review|rank_contributors|response_rate|status_breakdown|delivery_completion_rate|delivery_on_time_rate)$/.test(value);
}

describe('Vietnamese language coverage', () => {
  it('does not leave common English product terms inside Vietnamese messages', () => {
    const mixed = Object.entries(catalog.messages ?? {})
      .filter(([source, translated]) => !isTechnicalToken(source) && mixedLanguagePattern.test(translated))
      .map(([source, translated]) => `${JSON.stringify(source)} => ${JSON.stringify(translated)}`)
      .sort();
    expect(mixed, mixed.join('\n')).toEqual([]);
  });

  it('catalogs every static user-facing English string found in the desktop source', () => {
    walk(sourceRoot);
    const missing = new Map<string, string[]>();

    const add = (raw: string, file: string, node: ts.Node, sourceFile: ts.SourceFile) => {
      const value = raw.replace(/\s+/g, ' ').trim();
      if (!value || value.length < 2 || !/[A-Za-z]/.test(value) || known.has(value) || isTechnicalToken(value)) return;
      const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      const locations = missing.get(value) ?? [];
      locations.push(`${path.relative(sourceRoot, file)}:${line}`);
      missing.set(value, locations);
    };

    for (const file of sourceFiles) {
      const source = fs.readFileSync(file, 'utf8');
      const sourceFile = ts.createSourceFile(
        file,
        source,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      const visit = (node: ts.Node) => {
        if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)
          && ['t', 'localize', 'localizeUiSurfaceText'].includes(node.expression.text)) {
          const argument = node.arguments[0];
          if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
            add(argument.text, file, argument, sourceFile);
          }
        }
        if (ts.isJsxText(node)) add(node.text, file, node, sourceFile);
        if (ts.isJsxAttribute(node) && uiObjectKeys.has(node.name.text)
          && node.initializer && ts.isStringLiteral(node.initializer)) {
          add(node.initializer.text, file, node.initializer, sourceFile);
        }
        if (ts.isPropertyAssignment(node)) {
          const key = ts.isIdentifier(node.name) || ts.isStringLiteral(node.name) ? node.name.text : '';
          if (uiObjectKeys.has(key)
            && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) {
            add(node.initializer.text, file, node.initializer, sourceFile);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }

    const report = [...missing.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([text, locations]) => `${JSON.stringify(text)} at ${locations.slice(0, 3).join(', ')}`);
    expect(report, report.join('\n')).toEqual([]);
  });
});
