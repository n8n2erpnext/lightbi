import { useEffect, useMemo, useRef, useState } from 'react';
import Editor, { loader, type Monaco, type OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/editor/editor.api';
import 'monaco-editor/languages/definitions/sql/register';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import type { AdvancedConnection, AdvancedSchema } from '../../lib/advanced-api';
import { buildProSqlSuggestions, type SqlSuggestion } from '../../lib/advanced-sql-suggestions';

const workerScope = globalThis as typeof globalThis & {
  MonacoEnvironment?: { getWorker: () => Worker };
};

workerScope.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

const completionKind = (instance: Monaco, kind: SqlSuggestion['kind']) => {
  if (kind === 'schema') return instance.languages.CompletionItemKind.Module;
  if (kind === 'table') return instance.languages.CompletionItemKind.Struct;
  if (kind === 'column') return instance.languages.CompletionItemKind.Field;
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
  const suggestions = useMemo(() => buildProSqlSuggestions(schema, provider), [provider, schema]);

  useEffect(() => {
    if (!proSuggestions || provider === 'mongodb' || !monacoRef.current) return;
    const instance = monacoRef.current;
    const disposable = instance.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: ['.', ' '],
      provideCompletionItems(model: monaco.editor.ITextModel, position: monaco.Position) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        return {
          suggestions: suggestions.map(item => ({
            label: item.label,
            detail: item.detail,
            insertText: item.insertText,
            insertTextRules: item.kind === 'snippet' ? instance.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
            kind: completionKind(instance, item.kind),
            range,
          })),
        };
      },
    });
    return () => disposable.dispose();
  }, [editorReady, proSuggestions, provider, suggestions]);

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
          quickSuggestions: proSuggestions && provider !== 'mongodb',
          suggestOnTriggerCharacters: proSuggestions && provider !== 'mongodb',
          fixedOverflowWidgets: true,
          padding: { top: 10, bottom: 10 },
          ariaLabel: provider === 'mongodb' ? 'MongoDB document query' : 'SQL query',
        }}
      />
      {provider !== 'mongodb' && (
        <span className={`pointer-events-none absolute bottom-2 right-3 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${proSuggestions ? 'bg-violet-50 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
          {proSuggestions ? 'Pro schema suggestions' : 'SQL editor'}
        </span>
      )}
    </div>
  );
}
