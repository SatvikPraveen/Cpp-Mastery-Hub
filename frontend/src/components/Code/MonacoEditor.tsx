import loader from '@monaco-editor/loader';
import type * as Monaco from 'monaco-editor';
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import type { CodeEditorHandle, CodeEditorProps } from './CodeEditor';

/**
 * Browser-only Monaco instance. Never import this directly from a page; use
 * `components/Code/CodeEditor`, which loads it with `ssr: false`.
 */
const MonacoEditor = forwardRef<CodeEditorHandle, CodeEditorProps>((
  {
    value,
    onChange,
    onCursorMove,
    language = 'cpp',
    readOnly = false,
    height = '400px',
    theme = 'vs-dark',
    fontSize = 14,
    tabSize = 4,
    wordWrap = 'off',
    showLineNumbers = true,
    className = '',
  },
  ref
) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const onChangeRef = useRef(onChange);
  const onCursorMoveRef = useRef(onCursorMove);
  onChangeRef.current = onChange;
  onCursorMoveRef.current = onCursorMove;

  useImperativeHandle(ref, () => ({
    getEditor: () => editorRef.current,
    focus: () => editorRef.current?.focus(),
    setPosition: (lineNumber: number, column: number) => {
      editorRef.current?.setPosition({ lineNumber, column });
      editorRef.current?.revealLineInCenter(lineNumber);
    },
  }));

  // Create the editor once, after Monaco has been loaded in the browser.
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void loader.init().then((monaco) => {
      if (disposed || !containerRef.current) return;
      monacoRef.current = monaco;
      const editor = monaco.editor.create(containerRef.current, {
        value,
        language,
        readOnly,
        theme,
        fontSize,
        tabSize,
        wordWrap,
        lineNumbers: showLineNumbers ? 'on' : 'off',
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
      });
      editorRef.current = editor;

      const changeSub = editor.onDidChangeModelContent(() => {
        onChangeRef.current?.(editor.getValue());
      });
      const cursorSub = editor.onDidChangeCursorPosition((e) => {
        onCursorMoveRef.current?.({ lineNumber: e.position.lineNumber, column: e.position.column });
      });

      cleanup = () => {
        changeSub.dispose();
        cursorSub.dispose();
        editor.dispose();
        editorRef.current = null;
      };
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
    // The editor is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the model in sync with a controlled `value`.
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && value !== editor.getValue()) {
      editor.setValue(value);
    }
  }, [value]);

  useEffect(() => {
    editorRef.current?.updateOptions({
      readOnly,
      fontSize,
      tabSize,
      wordWrap,
      lineNumbers: showLineNumbers ? 'on' : 'off',
    });
  }, [readOnly, fontSize, tabSize, wordWrap, showLineNumbers]);

  useEffect(() => {
    monacoRef.current?.editor.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    const model = editorRef.current?.getModel();
    if (model) monacoRef.current?.editor.setModelLanguage(model, language);
  }, [language]);

  return <div ref={containerRef} style={{ height, width: '100%' }} className={className} />;
});

MonacoEditor.displayName = 'MonacoEditor';

export default MonacoEditor;
