// File: frontend/src/components/CodeEditor/ToolBar.tsx
import { 
  Play, 
  Square, 
  Download, 
  Upload, 
  Save, 
  Share2, 
  Settings,
  Maximize2,
  Minimize2,
  RotateCcw,
  FileText,
  Bug
} from 'lucide-react';

interface ToolBarProps {
  onRun: () => void;
  onStop: () => void;
  onSave: () => void;
  onLoad: () => void;
  onShare: () => void;
  onSettings: () => void;
  onToggleFullscreen: () => void;
  onFormat: () => void;
  onAnalyze: () => void;
  isRunning: boolean;
  isFullscreen: boolean;
  hasUnsavedChanges: boolean;
}

export const ToolBar: React.FC<ToolBarProps> = ({
  onRun,
  onStop,
  onSave,
  onLoad,
  onShare,
  onSettings,
  onToggleFullscreen,
  onFormat,
  onAnalyze,
  isRunning,
  isFullscreen,
  hasUnsavedChanges
}) => {
  return (
    <div className="flex items-center justify-between p-3 bg-background border-b border-border">
      <div className="flex items-center space-x-2">
        {/* Execution Controls */}
        <div className="flex items-center space-x-1 border-r border-border pr-3">
          <Button
            variant={isRunning ? 'outline' : 'primary'}
            size="sm"
            onClick={isRunning ? onStop : onRun}
            leftIcon={isRunning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          >
            {isRunning ? 'Stop' : 'Run'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onAnalyze}
            leftIcon={<Bug className="h-4 w-4" />}
            title="Analyze Code"
          >
            Analyze
          </Button>
        </div>

        {/* File Operations */}
        <div className="flex items-center space-x-1 border-r border-border pr-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            leftIcon={<Save className="h-4 w-4" />}
            title="Save Code"
          >
            {hasUnsavedChanges && <span className="w-2 h-2 bg-orange-500 rounded-full mr-1" />}
            Save
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={onLoad}
            leftIcon={<Upload className="h-4 w-4" />}
            title="Load File"
          >
            Load
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onShare}
            leftIcon={<Share2 className="h-4 w-4" />}
            title="Share Code"
          >
            Share
          </Button>
        </div>

        {/* Code Operations */}
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onFormat}
            leftIcon={<FileText className="h-4 w-4" />}
            title="Format Code"
          >
            Format
          </Button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* View Controls */}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFullscreen}
          leftIcon={isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          title="Toggle Fullscreen"
        />

        <Button
          variant="outline"
          size="sm"
          onClick={onSettings}
          leftIcon={<Settings className="h-4 w-4" />}
          title="Editor Settings"
        />
      </div>
    </div>
  );
};