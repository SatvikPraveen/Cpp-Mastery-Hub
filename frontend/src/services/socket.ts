// File: frontend/src/services/socket.ts
// Extension: .ts (TypeScript Service)

interface SocketMessage {
  type: string;
  payload?: any;
  id?: string;
  timestamp?: string;
}

interface SocketEventHandler {
  (data: any): void;
}

interface SocketConfig {
  url: string;
  protocols?: string[];
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  debug?: boolean;
}

export class SocketService {
  private socket: WebSocket | null = null;
  private config: SocketConfig;
  private eventHandlers: Map<string, Set<SocketEventHandler>> = new Map();
  private reconnectCount = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;
  private isDestroyed = false;
  private messageQueue: SocketMessage[] = [];

  constructor(config: SocketConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectInterval: 3000,
      heartbeatInterval: 30000,
      debug: false,
      ...config
    };
  }

  // Connection management
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isDestroyed) {
        reject(new Error('Socket service has been destroyed'));
        return;
      }

      if (this.socket?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        this.once('connected', resolve);
        this.once('error', reject);
        return;
      }

      this.isConnecting = true;
      this.log('Connecting to WebSocket...');

      try {
        this.socket = new WebSocket(this.config.url, this.config.protocols);
        this.setupEventListeners(resolve, reject);
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.log('Disconnecting WebSocket...');
    this.isDestroyed = true;
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
    
    this.messageQueue = [];
    this.reconnectCount = 0;
    this.isConnecting = false;
  }

  // Event handling
  on(event: string, handler: SocketEventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  off(event: string, handler?: SocketEventHandler): void {
    if (!handler) {
      this.eventHandlers.delete(event);
    } else {
      this.eventHandlers.get(event)?.delete(handler);
    }
  }

  once(event: string, handler: SocketEventHandler): void {
    const onceHandler = (data: any) => {
      handler(data);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in socket event handler for '${event}':`, error);
        }
      });
    }
  }

  // Message sending
  send(message: SocketMessage): boolean {
    if (!this.isConnected()) {
      this.log('Socket not connected, queueing message:', message);
      this.messageQueue.push(message);
      this.connect(); // Try to reconnect
      return false;
    }

    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: new Date().toISOString(),
        id: message.id || this.generateMessageId()
      };

      this.socket!.send(JSON.stringify(messageWithTimestamp));
      this.log('Message sent:', messageWithTimestamp);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      this.messageQueue.push(message);
      return false;
    }
  }

  // Convenience methods for common message types
  sendAuth(token: string): boolean {
    return this.send({
      type: 'auth',
      payload: { token }
    });
  }

  sendHeartbeat(): boolean {
    return this.send({
      type: 'heartbeat',
      payload: { timestamp: Date.now() }
    });
  }

  joinRoom(room: string): boolean {
    return this.send({
      type: 'join_room',
      payload: { room }
    });
  }

  leaveRoom(room: string): boolean {
    return this.send({
      type: 'leave_room',
      payload: { room }
    });
  }

  // State checks
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  isConnecting(): boolean {
    return this.isConnecting;
  }

  getReadyState(): number | null {
    return this.socket?.readyState ?? null;
  }

  // Private methods
  private setupEventListeners(resolve: () => void, reject: (error: Error) => void): void {
    if (!this.socket) return;

    this.socket.onopen = (event) => {
      this.log('WebSocket connected');
      this.isConnecting = false;
      this.reconnectCount = 0;
      
      // Send auth token if available
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token) {
        this.sendAuth(token);
      }

      // Process queued messages
      this.processMessageQueue();
      
      // Start heartbeat
      this.startHeartbeat();
      
      this.emit('connected', event);
      resolve();
    };

    this.socket.onclose = (event) => {
      this.log('WebSocket closed:', event.code, event.reason);
      this.isConnecting = false;
      this.stopHeartbeat();
      
      this.emit('disconnected', { code: event.code, reason: event.reason });

      // Attempt reconnection if not intentionally closed
      if (!this.isDestroyed && event.code !== 1000) {
        this.attemptReconnect();
      }
    };

    this.socket.onerror = (event) => {
      console.error('WebSocket error:', event);
      this.isConnecting = false;
      this.emit('error', event);
      reject(new Error('WebSocket connection failed'));
    };

    this.socket.onmessage = (event) => {
      try {
        const message: SocketMessage = JSON.parse(event.data);
        this.log('Message received:', message);
        
        // Handle system messages
        this.handleSystemMessage(message);
        
        // Emit the message type as an event
        if (message.type) {
          this.emit(message.type, message.payload);
        }
        
        // Emit generic message event
        this.emit('message', message);
      } catch (error) {
        console.error('Failed to parse socket message:', error);
        this.emit('parse_error', { error, data: event.data });
      }
    };
  }

  private handleSystemMessage(message: SocketMessage): void {
    switch (message.type) {
      case 'auth_success':
        this.log('Authentication successful');
        this.emit('authenticated', message.payload);
        break;
      
      case 'auth_error':
        console.error('Authentication failed:', message.payload);
        this.emit('auth_error', message.payload);
        break;
      
      case 'heartbeat_response':
        this.log('Heartbeat response received');
        break;
      
      case 'error':
        console.error('Server error:', message.payload);
        this.emit('server_error', message.payload);
        break;
      
      case 'reconnect':
        this.log('Server requested reconnection');
        this.reconnect();
        break;
    }
  }

  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    this.log(`Processing ${this.messageQueue.length} queued messages`);
    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach(message => {
      this.send(message);
    });
  }

  private startHeartbeat(): void {
    if (this.config.heartbeatInterval && this.config.heartbeatInterval > 0) {
      this.stopHeartbeat();
      this.heartbeatTimer = setInterval(() => {
        if (this.isConnected()) {
          this.sendHeartbeat();
        }
      }, this.config.heartbeatInterval);
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private attemptReconnect(): void {
    if (this.isDestroyed || this.reconnectCount >= this.config.reconnectAttempts!) {
      this.log('Max reconnection attempts reached');
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectCount++;
    this.log(`Reconnection attempt ${this.reconnectCount}/${this.config.reconnectAttempts}`);
    
    setTimeout(() => {
      if (!this.isDestroyed) {
        this.emit('reconnecting', { attempt: this.reconnectCount });
        this.connect().catch(() => {
          // Reconnection failed, will try again automatically
        });
      }
    }, this.config.reconnectInterval! * Math.pow(1.5, this.reconnectCount - 1));
  }

  private reconnect(): void {
    if (this.socket) {
      this.socket.close();
    }
    this.reconnectCount = 0;
    this.connect();
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[SocketService]', ...args);
    }
  }
}

// Specialized socket services for different features
export class CodeExecutionSocket extends SocketService {
  constructor() {
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace('http', 'ws');
    super({
      url: `${wsUrl}/ws/code-execution`,
      debug: process.env.NODE_ENV === 'development'
    });
  }

  executeCode(code: string, language: string, input?: string): boolean {
    return this.send({
      type: 'execute_code',
      payload: { code, language, input }
    });
  }

  analyzeCode(code: string, language: string): boolean {
    return this.send({
      type: 'analyze_code',
      payload: { code, language }
    });
  }
}

export class CollaborationSocket extends SocketService {
  constructor() {
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace('http', 'ws');
    super({
      url: `${wsUrl}/ws/collaboration`,
      debug: process.env.NODE_ENV === 'development'
    });
  }

  joinSession(sessionId: string): boolean {
    return this.send({
      type: 'join_session',
      payload: { sessionId }
    });
  }

  leaveSession(sessionId: string): boolean {
    return this.send({
      type: 'leave_session',
      payload: { sessionId }
    });
  }

  sendCodeChange(sessionId: string, changes: any): boolean {
    return this.send({
      type: 'code_change',
      payload: { sessionId, changes }
    });
  }

  sendCursorPosition(sessionId: string, position: any): boolean {
    return this.send({
      type: 'cursor_position',
      payload: { sessionId, position }
    });
  }
}

export class NotificationSocket extends SocketService {
  constructor() {
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace('http', 'ws');
    super({
      url: `${wsUrl}/ws/notifications`,
      debug: process.env.NODE_ENV === 'development'
    });
  }

  subscribeToNotifications(): boolean {
    return this.send({
      type: 'subscribe_notifications'
    });
  }

  unsubscribeFromNotifications(): boolean {
    return this.send({
      type: 'unsubscribe_notifications'
    });
  }

  markNotificationRead(notificationId: string): boolean {
    return this.send({
      type: 'mark_notification_read',
      payload: { notificationId }
    });
  }
}

export class LearningSocket extends SocketService {
  constructor() {
    const wsUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace('http', 'ws');
    super({
      url: `${wsUrl}/ws/learning`,
      debug: process.env.NODE_ENV === 'development'
    });
  }

  updateProgress(courseId: string, lessonId: string, progress: number): boolean {
    return this.send({
      type: 'update_progress',
      payload: { courseId, lessonId, progress }
    });
  }

  completeLesson(courseId: string, lessonId: string): boolean {
    return this.send({
      type: 'complete_lesson',
      payload: { courseId, lessonId }
    });
  }

  startLesson(courseId: string, lessonId: string): boolean {
    return this.send({
      type: 'start_lesson',
      payload: { courseId, lessonId }
    });
  }
}

// Socket manager for handling multiple socket connections
export class SocketManager {
  private sockets: Map<string, SocketService> = new Map();
  private globalHandlers: Map<string, Set<SocketEventHandler>> = new Map();

  // Create or get socket service
  getSocket(name: string, config: SocketConfig): SocketService {
    if (!this.sockets.has(name)) {
      const socket = new SocketService(config);
      this.sockets.set(name, socket);
      this.setupGlobalEventForwarding(socket);
    }
    return this.sockets.get(name)!;
  }

  // Get specialized socket services
  getCodeExecutionSocket(): CodeExecutionSocket {
    if (!this.sockets.has('code_execution')) {
      const socket = new CodeExecutionSocket();
      this.sockets.set('code_execution', socket);
      this.setupGlobalEventForwarding(socket);
    }
    return this.sockets.get('code_execution') as CodeExecutionSocket;
  }

  getCollaborationSocket(): CollaborationSocket {
    if (!this.sockets.has('collaboration')) {
      const socket = new CollaborationSocket();
      this.sockets.set('collaboration', socket);
      this.setupGlobalEventForwarding(socket);
    }
    return this.sockets.get('collaboration') as CollaborationSocket;
  }

  getNotificationSocket(): NotificationSocket {
    if (!this.sockets.has('notifications')) {
      const socket = new NotificationSocket();
      this.sockets.set('notifications', socket);
      this.setupGlobalEventForwarding(socket);
    }
    return this.sockets.get('notifications') as NotificationSocket;
  }

  getLearningSocket(): LearningSocket {
    if (!this.sockets.has('learning')) {
      const socket = new LearningSocket();
      this.sockets.set('learning', socket);
      this.setupGlobalEventForwarding(socket);
    }
    return this.sockets.get('learning') as LearningSocket;
  }

  // Global event handling across all sockets
  on(event: string, handler: SocketEventHandler): void {
    if (!this.globalHandlers.has(event)) {
      this.globalHandlers.set(event, new Set());
    }
    this.globalHandlers.get(event)!.add(handler);
  }

  off(event: string, handler?: SocketEventHandler): void {
    if (!handler) {
      this.globalHandlers.delete(event);
    } else {
      this.globalHandlers.get(event)?.delete(handler);
    }
  }

  emit(event: string, data?: any): void {
    const handlers = this.globalHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in global socket event handler for '${event}':`, error);
        }
      });
    }
  }

  // Connect all sockets
  async connectAll(): Promise<void> {
    const connections = Array.from(this.sockets.values()).map(socket => 
      socket.connect().catch(console.error)
    );
    await Promise.all(connections);
  }

  // Disconnect all sockets
  disconnectAll(): void {
    this.sockets.forEach(socket => socket.disconnect());
    this.sockets.clear();
    this.globalHandlers.clear();
  }

  // Get connection status for all sockets
  getConnectionStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    this.sockets.forEach((socket, name) => {
      status[name] = socket.isConnected();
    });
    return status;
  }

  private setupGlobalEventForwarding(socket: SocketService): void {
    // Forward all events to global handlers
    socket.on('message', (data) => this.emit('message', data));
    socket.on('connected', (data) => this.emit('connected', data));
    socket.on('disconnected', (data) => this.emit('disconnected', data));
    socket.on('error', (data) => this.emit('error', data));
    socket.on('reconnecting', (data) => this.emit('reconnecting', data));
    socket.on('reconnect_failed', (data) => this.emit('reconnect_failed', data));
  }
}

// Create singleton socket manager
export const socketManager = new SocketManager();

// Export convenience functions
export const getCodeExecutionSocket = () => socketManager.getCodeExecutionSocket();
export const getCollaborationSocket = () => socketManager.getCollaborationSocket();
export const getNotificationSocket = () => socketManager.getNotificationSocket();
export const getLearningSocket = () => socketManager.getLearningSocket();

export default socketManager;