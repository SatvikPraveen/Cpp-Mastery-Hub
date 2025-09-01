// File: frontend/src/components/Notification/NotificationList.tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState, useEffect } from 'react';
import { Notification, NotificationData } from './Notification';
import { Loading } from '../UI/Loading';
import { Badge } from '../UI/Badge';

interface NotificationListProps {
  notifications?: NotificationData[];
  loading?: boolean;
  onRead: (id: string) => void;
  onUnread: (id: string) => void;
  onDelete: (id: string) => void;
  onAction?: (notification: NotificationData) => void;
  onMarkAllRead?: () => void;
  onClearAll?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  compact?: boolean;
  maxHeight?: string;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications = [],
  loading = false,
  onRead,
  onUnread,
  onDelete,
  onAction,
  onMarkAllRead,
  onClearAll,
  onLoadMore,
  hasMore = false,
  compact = false,
  maxHeight = '400px'
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(notification => {
    const matchesReadFilter = 
      filter === 'all' || 
      (filter === 'unread' && !notification.read) ||
      (filter === 'read' && notification.read);

    const matchesTypeFilter = 
      typeFilter === 'all' || notification.type === typeFilter;

    return matchesReadFilter && matchesTypeFilter;
  });

  const notificationTypes = Array.from(new Set(notifications.map(n => n.type)));

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loading text="Loading notifications..." />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
        <p className="text-gray-600">You're all caught up! No new notifications.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-gray-900">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <Badge variant="primary" size="sm">
              {unreadCount} unread
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {unreadCount > 0 && onMarkAllRead && (
            <button
              onClick={onMarkAllRead}
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              Mark all read
            </button>
          )}
          {onClearAll && (
            <button
              onClick={onClearAll}
              className="text-sm text-gray-600 hover:text-gray-700 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        {/* Read status filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unread' | 'read')}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All ({notifications.length})</option>
            <option value="unread">Unread ({unreadCount})</option>
            <option value="read">Read ({notifications.length - unreadCount})</option>
          </select>
        </div>

        {/* Type filter */}
        {notificationTypes.length > 1 && (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All types</option>
              {notificationTypes.map(type => (
                <option key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Notifications list */}
      <div 
        className="space-y-3 overflow-y-auto"
        style={{ maxHeight }}
      >
        {filteredNotifications.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">
              No notifications match the current filters.
            </p>
          </div>
        ) : (
          filteredNotifications.map(notification => (
            <Notification
              key={notification.id}
              notification={notification}
              onRead={onRead}
              onUnread={onUnread}
              onDelete={onDelete}
              onAction={onAction}
              compact={compact}
            />
          ))
        )}

        {/* Load more button */}
        {hasMore && onLoadMore && (
          <div className="text-center pt-4">
            <button
              onClick={onLoadMore}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center mx-auto"
            >
              {loading ? (
                <>
                  <Loading size="sm" />
                  <span className="ml-2">Loading...</span>
                </>
              ) : (
                'Load more notifications'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Notification dropdown component for header/navbar
export const NotificationDropdown: React.FC<{
  notifications: NotificationData[];
  onRead: (id: string) => void;
  onUnread: (id: string) => void;
  onDelete: (id: string) => void;
  onViewAll: () => void;
  onMarkAllRead?: () => void;
}> = ({
  notifications,
  onRead,
  onUnread,
  onDelete,
  onViewAll,
  onMarkAllRead
}) => {
  const unreadCount = notifications.filter(n => !n.read).length;
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="w-80 bg-white border border-gray-200 rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="primary" size="sm">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && onMarkAllRead && (
            <button
              onClick={onMarkAllRead}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="max-h-96 overflow-y-auto">
        {recentNotifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
            </svg>
            <p>No notifications</p>
          </div>
        ) : (
          <div className="py-2">
            {recentNotifications.map(notification => (
              <div
                key={notification.id}
                className={`
                  p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer
                  ${!notification.read ? 'bg-blue-50' : ''}
                `}
                onClick={() => {
                  if (!notification.read) {
                    onRead(notification.id);
                  }
                  if (notification.actionUrl) {
                    window.location.href = notification.actionUrl;
                  }
                }}
              >
                <div className="flex items-start space-x-3">
                  {!notification.read && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(notification.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(notification.id);
                    }}
                    className="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors p-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={onViewAll}
          className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700 py-2"
        >
          View all notifications
        </button>
      </div>
    </div>
  );
};