// File: frontend/src/components/Notification/NotificationSettings.tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState, useEffect } from 'react';
import { Button } from '../UI/Button';
import { Badge } from '../UI/Badge';

interface NotificationPreference {
  type: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
  sms?: boolean;
}

interface NotificationSettingsData {
  preferences: NotificationPreference[];
  globalSettings: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
    frequency: 'immediate' | 'daily' | 'weekly';
  };
}

interface NotificationSettingsProps {
  settings: NotificationSettingsData;
  onSave: (settings: NotificationSettingsData) => void;
  loading?: boolean;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  settings,
  onSave,
  loading = false
}) => {
  const [localSettings, setLocalSettings] = useState<NotificationSettingsData>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handlePreferenceChange = (
    index: number,
    field: keyof Omit<NotificationPreference, 'type' | 'label' | 'description'>,
    value: boolean
  ) => {
    const updated = { ...localSettings };
    updated.preferences[index][field] = value;
    setLocalSettings(updated);
    setHasChanges(true);
  };

  const handleGlobalSettingChange = (
    field: keyof NotificationSettingsData['globalSettings'],
    value: any
  ) => {
    const updated = {
      ...localSettings,
      globalSettings: {
        ...localSettings.globalSettings,
        [field]: value
      }
    };
    setLocalSettings(updated);
    setHasChanges(true);
  };

  const handleQuietHoursChange = (field: 'enabled' | 'start' | 'end', value: boolean | string) => {
    const updated = {
      ...localSettings,
      globalSettings: {
        ...localSettings.globalSettings,
        quietHours: {
          ...localSettings.globalSettings.quietHours,
          [field]: value
        }
      }
    };
    setLocalSettings(updated);
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(localSettings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
  };

  const defaultPreferences: NotificationPreference[] = [
    {
      type: 'course_updates',
      label: 'Course Updates',
      description: 'New lessons, course completions, and progress milestones',
      email: true,
      push: true,
      inApp: true
    },
    {
      type: 'forum_activity',
      label: 'Forum Activity',
      description: 'Replies to your posts, mentions, and new discussions',
      email: false,
      push: true,
      inApp: true
    },
    {
      type: 'achievements',
      label: 'Achievements',
      description: 'Badges earned, streaks, and learning milestones',
      email: true,
      push: true,
      inApp: true
    },
    {
      type: 'reminders',
      label: 'Study Reminders',
      description: 'Daily practice reminders and scheduled sessions',
      email: false,
      push: true,
      inApp: true
    },
    {
      type: 'social',
      label: 'Social Activity',
      description: 'Friend requests, follows, and social interactions',
      email: false,
      push: false,
      inApp: true
    },
    {
      type: 'system',
      label: 'System Notifications',
      description: 'Important updates, maintenance, and security alerts',
      email: true,
      push: true,
      inApp: true
    }
  ];

  const preferences = localSettings.preferences.length > 0 
    ? localSettings.preferences 
    : defaultPreferences;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Notification Settings</h2>
        <p className="text-gray-600">
          Manage how and when you receive notifications from C++ Mastery Hub.
        </p>
      </div>

      {/* Global Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Global Settings</h3>
        
        <div className="space-y-6">
          {/* Master toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                <p className="text-sm text-gray-500">Receive notifications via email</p>
              </div>
              <input
                type="checkbox"
                checked={localSettings.globalSettings.emailEnabled}
                onChange={(e) => handleGlobalSettingChange('emailEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Push Notifications</label>
                <p className="text-sm text-gray-500">Receive browser push notifications</p>
              </div>
              <input
                type="checkbox"
                checked={localSettings.globalSettings.pushEnabled}
                onChange={(e) => handleGlobalSettingChange('pushEnabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notification frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notification Frequency
            </label>
            <select
              value={localSettings.globalSettings.frequency}
              onChange={(e) => handleGlobalSettingChange('frequency', e.target.value)}
              className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="immediate">Immediate</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly summary</option>
            </select>
          </div>

          {/* Quiet hours */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                checked={localSettings.globalSettings.quietHours.enabled}
                onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <label className="text-sm font-medium text-gray-700">Quiet Hours</label>
                <p className="text-sm text-gray-500">Disable notifications during specified hours</p>
              </div>
            </div>

            {localSettings.globalSettings.quietHours.enabled && (
              <div className="grid grid-cols-2 gap-4 ml-7">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input
                    type="time"
                    value={localSettings.globalSettings.quietHours.start}
                    onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="time"
                    value={localSettings.globalSettings.quietHours.end}
                    onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Types</h3>
        
        <div className="space-y-6">
          {/* Header row */}
          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 border-b border-gray-200 pb-3">
            <div className="col-span-6">Notification Type</div>
            <div className="col-span-2 text-center">Email</div>
            <div className="col-span-2 text-center">Push</div>
            <div className="col-span-2 text-center">In-App</div>
          </div>

          {/* Preference rows */}
          {preferences.map((preference, index) => (
            <div key={preference.type} className="grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100 last:border-b-0">
              <div className="col-span-6">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-medium text-gray-900">{preference.label}</h4>
                  {preference.type === 'system' && <Badge variant="warning" size="sm">Required</Badge>}
                </div>
                <p className="text-sm text-gray-500 mt-1">{preference.description}</p>
              </div>

              <div className="col-span-2 flex justify-center">
                <input
                  type="checkbox"
                  checked={preference.email && localSettings.globalSettings.emailEnabled}
                  onChange={(e) => handlePreferenceChange(index, 'email', e.target.checked)}
                  disabled={!localSettings.globalSettings.emailEnabled || preference.type === 'system'}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              <div className="col-span-2 flex justify-center">
                <input
                  type="checkbox"
                  checked={preference.push && localSettings.globalSettings.pushEnabled}
                  onChange={(e) => handlePreferenceChange(index, 'push', e.target.checked)}
                  disabled={!localSettings.globalSettings.pushEnabled || preference.type === 'system'}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              <div className="col-span-2 flex justify-center">
                <input
                  type="checkbox"
                  checked={preference.inApp}
                  onChange={(e) => handlePreferenceChange(index, 'inApp', e.target.checked)}
                  disabled={preference.type === 'system'}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {hasChanges && 'You have unsaved changes'}
        </div>
        
        <div className="flex items-center space-x-3">
          {hasChanges && (
            <Button
              variant="secondary"
              onClick={handleReset}
              disabled={loading}
            >
              Reset Changes
            </Button>
          )}
          
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges}
            loading={loading}
          >
            Save Settings
          </Button>
        </div>
      </div>

      {/* Help text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">About notifications:</p>
            <ul className="space-y-1 text-blue-700">
              <li>• System notifications cannot be disabled for security reasons</li>
              <li>• Push notifications require browser permission</li>
              <li>• Email notifications respect your quiet hours settings</li>
              <li>• Changes are saved automatically to your profile</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};