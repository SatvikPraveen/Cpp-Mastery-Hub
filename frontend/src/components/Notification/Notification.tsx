// File: frontend/src/components/Notification/Notification.tsx
// Extension: .tsx (TypeScript React Component)

import React from 'react';
import { Badge } from '../UI/Badge';

export interface NotificationData {
  id: string;
  type: 'system' | 'course' | 'forum' | 'achievement' | 'reminder' | 'social';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  actionText?: string;
  metadata?: {
    courseId?: string;
    lessonId?: string;
    postId?: string;
    userId?: string;
    achievementId?: string;
    [key: string]: any;
  };
}

interface NotificationProps {
  notification: NotificationData;
  onRead: (id: string) => void;
  onUnread: (id: string) => void;
  onDelete: (id: string) => void;
  onAction?: (notification: NotificationData) => void;
  compact?: boolean;
}

export const Notification: React.FC<NotificationProps> = ({
  notification,
  onRead,
  onUnread,
  onDelete,
  onAction,
  compact = false
}) => {
  const getTypeIcon = () => {
    const iconClass = "w-5 h-5";
    
    switch (notification.type) {
      case 'system':
        return (
          <svg className={`${iconClass} text-blue-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'course':
        return (
          <svg className={`${iconClass} text-green-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'forum':
        return (
          <svg className={`${iconClass} text-orange-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a2 2 0 01-2-2v-6a2 2 0 012-2h8z" />
          </svg>
        );
      case 'achievement':
        return (
          <svg className={`${iconClass} text-yellow-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        );
      case 'reminder':
        return (
          <svg className={`${iconClass} text-purple-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'social':
        return (
          <svg className={`${iconClass} text-pink-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      default:
        return (
          <svg className={`${iconClass} text-gray-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
          </svg>
        );
    }
  };

  const getPriorityBadge = () => {
    switch (notification.priority) {
      case 'high':
        return <Badge variant="error" size="sm">High</Badge>;
      case 'medium':
        return <Badge variant="warning" size="sm">Medium</Badge>;
      case 'low':
        return <Badge variant="secondary" size="sm">Low</Badge>;
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  const handleActionClick = () => {
    if (onAction) {
      onAction(notification);
    } else if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    
    // Mark as read when action is taken
    if (!notification.read) {
      onRead(notification.id);
    }
  };

  const handleMarkRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.read) {
      onUnread(notification.id);
    } else {
      onRead(notification.id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  return (
    <div
      className={`
        p-4 border border-gray-200 rounded-lg transition-all duration-200
        ${!notification.read ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50'}
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      <div className="flex items-start space-x-3">
        {/* Unread indicator */}
        <div className="flex-shrink-0 mt-1">
          {!notification.read && (
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
          )}
        </div>

        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getTypeIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className={`font-medium ${compact ? 'text-sm' : 'text-base'} text-gray-900`}>
                  {notification.title}
                </h4>
                <Badge variant="secondary" size="sm">
                  {notification.type}
                </Badge>
                {notification.priority !== 'low' && getPriorityBadge()}
              </div>

              <p className={`text-gray-600 ${compact ? 'text-sm' : 'text-base'} mb-2`}>
                {notification.message}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {formatTimestamp(notification.timestamp)}
                </span>

                {notification.actionText && notification.actionUrl && (
                  <button
                    onClick={handleActionClick}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    {notification.actionText}
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={handleMarkRead}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title={notification.read ? 'Mark as unread' : 'Mark as read'}
              >
                {notification.read ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.83 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </button>

              <button
                onClick={handleDelete}
                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                title="Delete notification"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};