// File: frontend/src/hooks/useWebSocket.ts
// Extension: .ts (TypeScript Hook)

import { useState, useEffect, useRef, useCallback } from 'react';

export type ReadyState = {
  CONNECTING: 0;
  OPEN: 1;
  CLOSING: 2;
  CLOSED: 3;
};

export const READY_STATE: ReadyState = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

interface UseWebSocketOptions {
  onOpen?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  shouldReconnect?: (closeEvent: CloseEvent) => boolean;
  reconnectInterval?: number;
  reconnectAttempts?: number;
  protocols?: string | string[];
  share?: boolean;
  filter?: (message: MessageEvent) => boolean;
  retryOnError?: boolean;
  heartbeat?: {
    message: string | (() => string);
    interval: number;
    timeout: number;
  };
}

interface UseWebSocketReturn {
  sendMessage: (message: string | ArrayBuffer | Blob) => void;
  sendJsonMessage: (message: any) => void;
  lastMessage: MessageEvent | null;
  lastJsonMessage: any;
  readyState: number;
  isConnected: boolean;
  isConnecting: boolean;
  isClosed: boolean;
  error: Event | null;
  reconnect: () => void;
  close: () => void;
  getWebSocket: () => WebSocket | null;
}

// Shared WebSocket connections for the same URL
const sharedWebSockets = new Map<string, WebSocket>();
const sharedSubscribers = new Map<string, Set<(message: MessageEvent) => void>>();

export const useWebSocket = (
  url: string | null,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const {
    onOpen,
    onClose,
    onMessage,
    onError,
    shouldReconnect = () => true,
    reconnectInterval = 3000,
    reconnectAttempts = 3,
    protocols,
    share = false,
    filter,
    retryOnError = true,
    heartbeat
  } = options;

  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [lastJsonMessage, setLastJsonMessage] = useState<any>(null);
  const [readyState, setReadyState] = useState<number>(READY_STATE.CONNECTING);
  const [error, setError] = useState<Event | null>(null);

  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldCloseRef = useRef(false);

  // Clear reconnect timeout
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Clear heartbeat timers
  const clearHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // Setup heartbeat
  const setupHeartbeat = useCallback(() => {
    if (!heartbeat || !webSocketRef.current) return;

    clearHeartbeat();

    heartbeatIntervalRef.current = setInterval(() => {
      if (webSocketRef.current?.readyState === READY_STATE.OPEN) {
        const message = typeof heartbeat.message === 'function' 
          ? heartbeat.message() 
          : heartbeat.message;
        
        webSocketRef.current.send(message);

        // Set timeout to detect if server responds
        heartbeatTimeoutRef.current = setTimeout(() => {
          console.warn('WebSocket heartbeat timeout - connection may be stale');
          // Optionally close and reconnect
          if (webSocketRef.current) {
            webSocketRef.current.close();
          }
        }, heartbeat.timeout);
      }
    }, heartbeat.interval);
  }, [heartbeat, clearHeartbeat]);

  // Handle shared WebSocket message
  const handleSharedMessage = useCallback((message: MessageEvent) => {
    if (!filter || filter(message)) {
      setLastMessage(message);
      
      try {
        const data = JSON.parse(message.data);
        setLastJsonMessage(data);
      } catch {
        // Not JSON, ignore
      }
      
      onMessage?.(message);
    }
  }, [filter, onMessage]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!url || shouldCloseRef.current) return;

    try {
      setError(null);

      // Handle shared connections
      if (share && sharedWebSockets.has(url)) {
        const sharedWs = sharedWebSockets.get(url)!;
        webSocketRef.current = sharedWs;
        setReadyState(sharedWs.readyState);

        // Subscribe to shared messages
        if (!sharedSubscribers.has(url)) {
          sharedSubscribers.set(url, new Set());
        }
        sharedSubscribers.get(url)!.add(handleSharedMessage);

        if (sharedWs.readyState === READY_STATE.OPEN) {
          onOpen?.(new Event('open'));
        }
        return;
      }

      // Create new WebSocket
      const ws = new WebSocket(url, protocols);
      webSocketRef.current = ws;

      ws.addEventListener('open', (event) => {
        setReadyState(READY_STATE.OPEN);
        setError(null);
        reconnectAttemptsRef.current = 0;
        clearReconnectTimeout();
        
        if (share) {
          sharedWebSockets.set(url, ws);
        }
        
        setupHeartbeat();
        onOpen?.(event);
      });

      ws.addEventListener('close', (event) => {
        setReadyState(READY_STATE.CLOSED);
        clearHeartbeat();
        
        if (share) {
          sharedWebSockets.delete(url);
          sharedSubscribers.delete(url);
        }
        
        onClose?.(event);

        // Attempt to reconnect if conditions are met
        if (
          !shouldCloseRef.current &&
          shouldReconnect(event) &&
          reconnectAttemptsRef.current < reconnectAttempts
        ) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      });

      ws.addEventListener('message', (event) => {
        // Reset heartbeat timeout on any message
        if (heartbeatTimeoutRef.current) {
          clearTimeout(heartbeatTimeoutRef.current);
          heartbeatTimeoutRef.current = null;
        }

        if (share) {
          // Broadcast to all subscribers
          const subscribers = sharedSubscribers.get(url);
          if (subscribers) {
            subscribers.forEach(callback => callback(event));
          }
        } else {
          if (!filter || filter(event)) {
            setLastMessage(event);
            
            try {
              const data = JSON.parse(event.data);
              setLastJsonMessage(data);
            } catch {
              // Not JSON, ignore
            }
            
            onMessage?.(event);
          }
        }
      });

      ws.addEventListener('error', (event) => {
        setError(event);
        onError?.(event);
        
        if (retryOnError && reconnectAttemptsRef.current < reconnectAttempts) {
          setTimeout(connect, reconnectInterval);
        }
      });

      // Update ready state during connection
      setReadyState(READY_STATE.CONNECTING);

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError(err as Event);
    }
  }, [
    url,
    protocols,
    share,
    onOpen,
    onClose,
    onMessage,
    onError,
    shouldReconnect,
    reconnectInterval,
    reconnectAttempts,
    retryOnError,
    filter,
    setupHeartbeat,
    clearHeartbeat,
    clearReconnectTimeout,
    handleSharedMessage
  ]);

  // Send message
  const sendMessage = useCallback((message: string | ArrayBuffer | Blob) => {
    if (webSocketRef.current?.readyState === READY_STATE.OPEN) {
      webSocketRef.current.send(message);
    } else {
      console.warn('WebSocket is not connected. Unable to send message.');
    }
  }, []);

  // Send JSON message
  const sendJsonMessage = useCallback((message: any) => {
    try {
      const jsonMessage = JSON.stringify(message);
      sendMessage(jsonMessage);
    } catch (err) {
      console.error('Failed to stringify message:', err);
    }
  }, [sendMessage]);

  // Manually reconnect
  const reconnect = useCallback(() => {
    if (webSocketRef.current) {
      shouldCloseRef.current = false;
      webSocketRef.current.close();
    }
    setTimeout(connect, 100);
  }, [connect]);

  // Close connection
  const close = useCallback(() => {
    shouldCloseRef.current = true;
    clearReconnectTimeout();
    clearHeartbeat();
    
    if (share && url) {
      const subscribers = sharedSubscribers.get(url);
      if (subscribers) {
        subscribers.delete(handleSharedMessage);
        if (subscribers.size === 0) {
          const sharedWs = sharedWebSockets.get(url);
          if (sharedWs) {
            sharedWs.close();
            sharedWebSockets.delete(url);
            sharedSubscribers.delete(url);
          }
        }
      }
    } else if (webSocketRef.current) {
      webSocketRef.current.close();
    }
  }, [clearReconnectTimeout, clearHeartbeat, share, url, handleSharedMessage]);

  // Get WebSocket instance
  const getWebSocket = useCallback(() => webSocketRef.current, []);

  // Connect on mount or URL change
  useEffect(() => {
    if (url) {
      shouldCloseRef.current = false;
      connect();
    }

    return () => {
      close();
    };
  }, [url, connect, close]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      close();
    };
  }, [close]);

  return {
    sendMessage,
    sendJsonMessage,
    lastMessage,
    lastJsonMessage,
    readyState,
    isConnected: readyState === READY_STATE.OPEN,
    isConnecting: readyState === READY_STATE.CONNECTING,
    isClosed: readyState === READY_STATE.CLOSED,
    error,
    reconnect,
    close,
    getWebSocket
  };
};

// Hook for JSON-only WebSocket communication
export const useJsonWebSocket = (
  url: string | null,
  options: Omit<UseWebSocketOptions, 'onMessage'> & {
    onJsonMessage?: (message: any) => void;
  } = {}
) => {
  const { onJsonMessage, ...wsOptions } = options;

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      onJsonMessage?.(data);
    } catch (err) {
      console.error('Failed to parse JSON message:', err);
    }
  }, [onJsonMessage]);

  return useWebSocket(url, {
    ...wsOptions,
    onMessage: handleMessage
  });
};