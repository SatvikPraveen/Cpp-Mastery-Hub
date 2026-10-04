import React, { useEffect, useState } from 'react';

import type { CollaborationUser } from '@/types';

import type { CodeEditorHandle, CursorPosition } from './CodeEditor';

interface UserCursorProps {
  user: CollaborationUser;
  position: CursorPosition;
  editorRef: React.RefObject<CodeEditorHandle>;
}

/** Remote collaborator caret, absolutely positioned over the Monaco editor. */
export const UserCursor: React.FC<UserCursorProps> = ({ user, position, editorRef }) => {
  const [coords, setCoords] = useState<{ top: number; left: number; height: number } | null>(
    null
  );

  useEffect(() => {
    const editor = editorRef.current?.getEditor();
    if (!editor) return;

    const update = () => {
      const visible = editor.getScrolledVisiblePosition(position);
      setCoords(visible);
    };
    update();
    const subscription = editor.onDidScrollChange(update);
    return () => subscription.dispose();
  }, [editorRef, position]);

  if (!coords) return null;
  const color = user.color ?? '#3B82F6';

  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{ top: coords.top, left: coords.left, height: coords.height }}
    >
      <div className="w-0.5 h-full" style={{ backgroundColor: color }} />
      <span
        className="absolute -top-5 left-0 whitespace-nowrap rounded px-1 text-xs text-white"
        style={{ backgroundColor: color }}
      >
        {user.username}
      </span>
    </div>
  );
};

export default UserCursor;
