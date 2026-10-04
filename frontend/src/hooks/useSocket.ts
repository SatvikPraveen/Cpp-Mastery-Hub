import { useEffect, useMemo, useRef, useState } from 'react';

import { SocketService } from '../services/socket';
import type { ChatMessage, CollaborationUser } from '../types';

export interface EditorCursorPosition {
  lineNumber: number;
  column: number;
}

export interface CollaborationSocketHandlers {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onUserJoined?: (user: CollaborationUser) => void;
  onUserLeft?: (userId: string) => void;
  onCodeChange?: (code: string, userId: string) => void;
  onCursorMove?: (userId: string, position: EditorCursorPosition) => void;
  onMessage?: (message: ChatMessage) => void;
}

export interface CollaborationSocket {
  /** Send an event to the collaboration server for this session. */
  emit: (event: string, payload?: Record<string, unknown>) => void;
  isConnected: () => boolean;
}

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'ws://localhost:8000';

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/**
 * Connects to the collaboration WebSocket for `sessionId` (native WebSocket via
 * SocketService) and routes server events to the supplied handlers.
 * Returns null until a session id is available.
 */
export const useSocket = (
  sessionId: string | undefined,
  handlers: CollaborationSocketHandlers
): CollaborationSocket | null => {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const [service, setService] = useState<SocketService | null>(null);

  // A SocketService cannot be reused after disconnect(), so create one per effect run.
  useEffect(() => {
    if (!sessionId) return;

    const service = new SocketService({ url: `${WS_BASE_URL}/collaboration/${sessionId}` });
    setService(service);

    service.on('connected', () => handlersRef.current.onConnect?.());
    service.on('disconnected', () => handlersRef.current.onDisconnect?.());
    service.on('user-joined', (data: unknown) => {
      if (isObject(data) && typeof data.id === 'string' && typeof data.username === 'string') {
        handlersRef.current.onUserJoined?.(data as unknown as CollaborationUser);
      }
    });
    service.on('user-left', (data: unknown) => {
      if (isObject(data) && typeof data.userId === 'string') {
        handlersRef.current.onUserLeft?.(data.userId);
      }
    });
    service.on('code-change', (data: unknown) => {
      if (isObject(data) && typeof data.code === 'string' && typeof data.userId === 'string') {
        handlersRef.current.onCodeChange?.(data.code, data.userId);
      }
    });
    service.on('cursor-move', (data: unknown) => {
      if (isObject(data) && typeof data.userId === 'string' && isObject(data.position)) {
        handlersRef.current.onCursorMove?.(
          data.userId,
          data.position as unknown as EditorCursorPosition
        );
      }
    });
    service.on('chat-message', (data: unknown) => {
      if (isObject(data) && typeof data.content === 'string') {
        handlersRef.current.onMessage?.(data as unknown as ChatMessage);
      }
    });

    service.connect().catch((error: unknown) => {
      console.error('Collaboration socket failed to connect:', error);
    });

    return () => {
      service.disconnect();
      setService(null);
    };
  }, [sessionId]);

  return useMemo<CollaborationSocket | null>(
    () =>
      service
        ? {
            emit: (event, payload) => {
              service.send({ type: event, payload: { sessionId, ...payload } });
            },
            isConnected: () => service.isConnected(),
          }
        : null,
    [service, sessionId]
  );
};

export default useSocket;
