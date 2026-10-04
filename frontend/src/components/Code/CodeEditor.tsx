import type * as monaco from 'monaco-editor';
import dynamic from 'next/dynamic';
import React, { forwardRef } from 'react';

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  onCursorMove?: (position: CursorPosition) => void;
  language?: string;
  readOnly?: boolean;
  height?: string;
  theme?: 'vs' | 'vs-dark' | 'hc-black';
  fontSize?: number;
  tabSize?: number;
  wordWrap?: 'on' | 'off';
  showLineNumbers?: boolean;
  /** Reserved for live-collaboration decorations; currently informational only. */
  collaborative?: boolean;
  className?: string;
}

export interface CodeEditorHandle {
  getEditor: () => monaco.editor.IStandaloneCodeEditor | null;
  focus: () => void;
  setPosition: (lineNumber: number, column: number) => void;
}

const Placeholder: React.FC<{ height?: string }> = ({ height = '400px' }) => (
  <div
    style={{ height }}
    className="w-full rounded-md bg-gray-900 text-gray-400 flex items-center justify-center text-sm"
  >
    Loading editor...
  </div>
);

// Monaco touches `window` at import time, so it must only load in the browser.
const MonacoEditor = dynamic(() => import('./MonacoEditor'), {
  ssr: false,
  loading: () => <Placeholder />,
});

/**
 * Lightweight controlled Monaco editor used by the playground, snippets, lessons
 * and collaboration pages. For the full IDE-style editor with toolbar/output see
 * `components/CodeEditor/CodeEditor`.
 */
const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>((props, ref) => {
  // next/dynamic forwards refs at runtime, but its return type omits `ref`; widen it here.
  const Editor = MonacoEditor as unknown as React.ComponentType<
    CodeEditorProps & { ref?: React.Ref<CodeEditorHandle> }
  >;
  return <Editor {...props} ref={ref} />;
});

CodeEditor.displayName = 'CodeEditor';

export default CodeEditor;
