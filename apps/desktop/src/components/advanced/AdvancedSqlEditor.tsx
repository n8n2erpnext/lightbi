import { useEffect, useRef, useState } from 'react';
import Editor, { loader, type Monaco, type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/editor/editor.api';
import 'monaco-editor/editor/contrib/suggest/browser/suggestController';
import 'monaco-editor/languages/definitions/sql/register';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import type { AdvancedConnection, AdvancedSchema } from '../../lib/advanced-api';
import type { SqlSuggestion } from '../../lib/advanced-sql-suggestions';
import { buildContextualSqlCompletions } from '../../lib/advanced-sql-completion';

const workerScope = globalThis as typeof globalThis & {
  MonacoEnvironment?: { getWorker: () => Worker };
};

workerScope.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

const completionKind = (instance: Monaco, kind: SqlSuggestion['kind']) => {
  if (kind === 'schema') return instance.languages.CompletionItemKind.Module;
  if (kind === 'table') return instance.languages.CompletionItemKind.Struct;
  if (kind === 'column') return instance.languages.CompletionItemKind.Field;
  if (kind === 'keyword') return instance.languages.CompletionItemKind.Keyword;
  if (kind === 'function') return instance.languages.CompletionItemKind.Function;
  return instance.languages.CompletionItemKind.Snippet;
};

export function AdvancedSqlEditor({
  value,
  onChange,
  onRun,
  onRunAll,
  provider,
  schema,
  proSuggestions,
}: {
  value: string;
  onChange: (value: string) => void;
  onRun: () => void;
  onRunAll: () => void;
  provider: AdvancedConnection['provider'] | 'duckdb';
  schema: AdvancedSchema | null;
  proSuggestions: boolean;
}) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [editorReady, setEditorReady] = useState(false);
  useEffect(() => {
    if (provider === 'mongodb' || !monacoRef.current) return;
    const instance = monacoRef.current;
    const disposable = instance.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: ['.', ' '],
      provideCompletionItems(model: monaco.editor.ITextModel, position: monaco.Position) {
        const beforeCursor = model.getValueInRange({
          startLineNumber: 1, startColumn: 1,
          endLineNumber: position.lineNumber, endColumn: position.column,
        });
        const completion = buildContextualSqlCompletions({
          beforeCursor, documentText: model.getValue(), provider, schema, schemaSuggestionsEnabled: proSuggestions,
        });
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: Math.max(1, position.column - completion.prefix.length),
          endColumn: position.column,
        };
        return {
          suggestions: completion.suggestions.map(item => ({
            label: item.label,
            detail: item.detail,
            insertText: item.insertText,
            filterText: item.filterText,
            sortText: item.sortText,
            preselect: item.preselect,
            insertTextRules: item.kind === 'snippet' || item.kind === 'function' ? instance.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
            kind: completionKind(instance, item.kind),
            range,
          })),
        };
      },
    });
    return () => disposable.dispose();
  }, [editorReady, proSuggestions, provider, schema]);

  const handleMount: OnMount = (editor, instance) => {
    editorRef.current = editor;
    monacoRef.current = instance;
    setEditorReady(true);
    editor.addCommand(instance.KeyMod.CtrlCmd | instance.KeyCode.Enter, onRun);
    editor.addCommand(instance.KeyMod.CtrlCmd | instance.KeyMod.Shift | instance.KeyCode.Enter, onRunAll);
  };

  return (
    <div className="relative h-full bg-[#fbfbfc]" data-testid="advanced-sql-editor">
      <Editor
        height="100%"
        language={provider === 'mongodb' ? 'plaintext' : 'sql'}
        value={value}
        onChange={next => onChange(next ?? '')}
        onMount={handleMount}
        theme="vs"
        loading={<div className="p-4 font-mono text-[12px] text-gray-400">Loading local editor...</div>}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          fontFamily: "'Cascadia Code', 'SFMono-Regular', Consolas, monospace",
          fontSize: 13,
          lineHeight: 22,
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          scrollBeyondLastLine: false,
          tabSize: 2,
          wordWrap: 'off',
          quickSuggestions: provider === 'mongodb' ? false : { other: true, comments: false, strings: false },
          quickSuggestionsDelay: 75,
          suggestOnTriggerCharacters: provider !== 'mongodb',
          suggestSelection: 'recentlyUsedByPrefix',
          wordBasedSuggestions: 'off',
          acceptSuggestionOnEnter: 'smart',
          suggest: { preview: true, localityBonus: true, showWords: false },
          fixedOverflowWidgets: true,
          padding: { top: 10, bottom: 10 },
          ariaLabel: provider === 'mongodb' ? 'MongoDB document query' : 'SQL query',
        }}
      />
      {provider !== 'mongodb' && (
        <span className={`pointer-events-none absolute bottom-2 right-3 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${proSuggestions ? 'bg-violet-50 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
          {proSuggestions ? 'Pro schema suggestions' : 'SQL suggestions'}
        </span>
      )}
    </div>
  );
}
