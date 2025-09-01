// File: frontend/src/hooks/useNotifications.ts
// Extension: .ts (TypeScript Hook)

import { useState, useEffect, useCallback } from 'react';
import { NotificationData } from '../components/Notification/Notification';

interface NotificationFilters {
  type?: string;
  read?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

interface UseNotificationsReturn {
  notifications: NotificationData[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  addNotification: (notification: Omit<NotificationData, 'id' | 'timestamp'>) => void;
  filterNotifications: (filters: NotificationFilters) => NotificationData[];
  refreshNotifications: () => Promise<void>;
  subscribeToUpdates: () => void;
  unsubscribeFromUpdates: () => void;
}

// Mock API functions - replace with actual API calls
const notificationAPI = {
  fetchNotifications: async (): Promise<NotificationData[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock notifications
    return [
      {
        id: '1',
        type: 'course',
        title: 'New lesson available',
        message: 'Advanced Pointers lesson is now available in C++ Fundamentals',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        read: false,
        priority: 'medium',
        actionUrl: '/learn/cpp-fundamentals/advanced-pointers',
        actionText: 'View Lesson'
      },
      {
        id: '2',
        type: 'achievement',
        title: 'Achievement unlocked!',
        message: 'You completed 5 lessons in a row. Keep up the great work!',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        read: false,
        priority: 'high',
        actionUrl: '/profile/achievements',
        actionText: 'View Achievements'
      },
      {
        id: '3',
        type: 'forum',
        title: 'New reply to your post',
        message: 'Someone replied to your question about memory allocation',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        read: true,
        priority: 'medium',
        actionUrl: '/community/posts/123',
        actionText: 'View Reply'
      },
      {
        id: '4',
        type: 'system',
        title: 'Platform maintenance',
        message: 'Scheduled maintenance will occur this weekend from 2-4 AM UTC',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        read: true,
        priority: 'low'
      },
      {
        id: '5',
        type: 'reminder',
        title: 'Daily coding reminder',
        message: "Don't forget to practice coding today! You're on a 7-day streak.",
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        read: false,
        priority: 'low',
        actionUrl: '/code',
        actionText: 'Start Coding'
      }
    ];
  },

  markAsRead: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`Marked notification ${id} as read`);
  },

  markAsUnread: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`Marked notification ${id} as unread`);
  },

  markAllAsRead: async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Marked all notifications as read');
  },

  deleteNotification: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log(`Deleted notification ${id}`);
  },

  clearAllNotifications: async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Cleared all notifications');
  }
};

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WebSocket connection for real-time updates
  const [ws, setWs] = useState<WebSocket | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notificationAPI.fetchNotifications();
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read');
    }
  }, []);

  const markAsUnread = useCallback(async (id: string) => {
    try {
      await notificationAPI.markAsUnread(id);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, read: false }
            : notification
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as unread');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read');
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      await notificationAPI.deleteNotification(id);
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notification');
    }
  }, []);

  const clearAllNotifications = useCallback(async () => {
    try {
      await notificationAPI.clearAllNotifications();
      setNotifications([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear all notifications');
    }
  }, []);

  const addNotification = useCallback((notification: Omit<NotificationData, 'id' | 'timestamp'>) => {
    const newNotification: NotificationData = {
      ...notification,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString()
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const filterNotifications = useCallback((filters: NotificationFilters) => {
    return notifications.filter(notification => {
      if (filters.type && notification.type !== filters.type) return false;
      if (filters.read !== undefined && notification.read !== filters.read) return false;
      if (filters.priority && notification.priority !== filters.priority) return false;
      return true;
    });
  }, [notifications]);

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  const subscribeToUpdates = useCallback(() => {
    if (ws) return; // Already connected

    try {
      const websocket = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/notifications');
      
      websocket.onopen = () => {
        console.log('Connected to notification WebSocket');
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'new_notification':
              addNotification(data.notification);
              break;
            case 'notification_read':
              setNotifications(prev => 
                prev.map(n => n.id === data.id ? { ...n, read: true } : n)
              );
              break;
            case 'notification_deleted':
              setNotifications(prev => prev.filter(n => n.id !== data.id));
              break;
            default:
              console.log('Unknown WebSocket message type:', data.type);
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Failed to connect to notification updates');
      };

      websocket.onclose = () => {
        console.log('Disconnected from notification WebSocket');
        setWs(null);
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (!ws) subscribeToUpdates();
        }, 5000);
      };

      setWs(websocket);
    } catch (err) {
      console.error('Failed to establish WebSocket connection:', err);
      setError('Failed to connect to notification updates');
    }
  }, [ws, addNotification]);

  const unsubscribeFromUpdates = useCallback(() => {
    if (ws) {
      ws.close();
      setWs(null);
    }
  }, [ws]);

  // Calculate unread count
  const unreadCount = notifications.filter(notification => !notification.read).length;

  // Initial fetch on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  // Auto-subscribe to updates when component mounts
  useEffect(() => {
    subscribeToUpdates();
    
    return () => {
      unsubscribeFromUpdates();
    };
  }, []);

  // Browser notification permission and display
  useEffect(() => {
    // Request notification permission if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Show browser notifications for new unread notifications
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const newUnreadNotifications = notifications.filter(
        n => !n.read && new Date(n.timestamp) > new Date(Date.now() - 5000) // Last 5 seconds
      );

      newUnreadNotifications.forEach(notification => {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: notification.id,
          silent: false,
          requireInteraction: notification.priority === 'high'
        });

        browserNotification.onclick = () => {
          window.focus();
          if (notification.actionUrl) {
            window.location.href = notification.actionUrl;
          }
          browserNotification.close();
        };

        // Auto-close after 5 seconds unless it's high priority
        if (notification.priority !== 'high') {
          setTimeout(() => {
            browserNotification.close();
          }, 5000);
        }
      });
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    addNotification,
    filterNotifications,
    refreshNotifications,
    subscribeToUpdates,
    unsubscribeFromUpdates
  };
};