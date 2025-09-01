// File: frontend/src/components/Layout/Header.tsx
import { Search, Bell, Moon, Sun, Menu } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useState } from 'react';

interface HeaderProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onMenuClick, 
  showMenuButton = false 
}) => {
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center space-x-4">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuClick}
            className="h-8 w-8 p-0 md:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>
        )}
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tutorials, exercises, or ask a question..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-96 pl-10 pr-4 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className="h-8 w-8 p-0"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 relative"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
            3
          </span>
        </Button>

        {/* User Menu */}
        {user && (
          <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium cursor-pointer">
            {user.firstName[0]}{user.lastName[0]}
          </div>
        )}
      </div>
    </header>
  );
};