// File: frontend/src/components/CodeEditor/SettingsPanel.tsx
import React, { useState } from 'react';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { 
  Settings, 
  Palette, 
  Type, 
  Grid, 
  Eye,
  Save,
  RotateCcw
} from 'lucide-react';

interface EditorSettings {
  theme: 'vs-dark' | 'vs-light' | 'hc-black';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  formatOnSave: boolean;
  insertSpaces: boolean;
}

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EditorSettings;
  onSettingsChange: (settings: EditorSettings) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange
}) => {
  const [localSettings, setLocalSettings] = useState<EditorSettings>(settings);

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  const handleReset = () => {
    const defaultSettings: EditorSettings = {
      theme: 'vs-dark',
      fontSize: 14,
      tabSize: 4,
      wordWrap: true,
      minimap: true,
      lineNumbers: true,
      autoSave: true,
      formatOnSave: true,
      insertSpaces: true
    };
    setLocalSettings(defaultSettings);
  };

  const updateSetting = <K extends keyof EditorSettings>(
    key: K, 
    value: EditorSettings[K]
  ) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background rounded-lg border shadow-lg w-full max-w-md max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Editor Settings</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Appearance */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <h3 className="font-medium">Appearance</h3>
            </div>
            
            <div className="space-y-3 pl-6">
              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <select
                  value={localSettings.theme}
                  onChange={(e) => updateSetting('theme', e.target.value as EditorSettings['theme'])}
                  className="w-full p-2 border rounded-md bg-background"
                >
                  <option value="vs-dark">Dark</option>
                  <option value="vs-light">Light</option>
                  <option value="hc-black">High Contrast</option>
                </select>
              </div>

              <Input
                type="number"
                label="Font Size"
                value={localSettings.fontSize}
                onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                min={10}
                max={24}
              />
            </div>
          </div>

          {/* Editor Behavior */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Type className="h-4 w-4" />
              <h3 className="font-medium">Editor Behavior</h3>
            </div>
            
            <div className="space-y-3 pl-6">
              <Input
                type="number"
                label="Tab Size"
                value={localSettings.tabSize}
                onChange={(e) => updateSetting('tabSize', parseInt(e.target.value))}
                min={2}
                max={8}
              />

              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={localSettings.wordWrap}
                    onChange={(e) => updateSetting('wordWrap', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Word Wrap</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={localSettings.insertSpaces}
                    onChange={(e) => updateSetting('insertSpaces', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Insert Spaces (not tabs)</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={localSettings.autoSave}
                    onChange={(e) => updateSetting('autoSave', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Auto Save</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={localSettings.formatOnSave}
                    onChange={(e) => updateSetting('formatOnSave', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Format on Save</span>
                </label>
              </div>
            </div>
          </div>

          {/* UI Elements */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <h3 className="font-medium">UI Elements</h3>
            </div>
            
            <div className="space-y-2 pl-6">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={localSettings.lineNumbers}
                  onChange={(e) => updateSetting('lineNumbers', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Line Numbers</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={localSettings.minimap}
                  onChange={(e) => updateSetting('minimap', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Minimap</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            leftIcon={<RotateCcw className="h-4 w-4" />}
          >
            Reset to Default
          </Button>
          
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSave}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

