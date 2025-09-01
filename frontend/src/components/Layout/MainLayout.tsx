// File: frontend/src/components/Layout/MainLayout.tsx
// Extension: .tsx

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { 
  Home, 
  Code, 
  BookOpen, 
  Users, 
  Settings, 
  Search,
  Bell,
  User,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
  ChevronDown,
  LogOut,
  Zap
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import SearchModal from '../Search/SearchModal';
import NotificationPanel from '../Notification/NotificationList';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  subItems?: Array<{
    name: string;
    href: string;
    description?: string;
  }>;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  title = 'C++ Mastery Hub',
  description 
}) => {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);

  // Navigation items
  const navigation: NavigationItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: Home
    },
    {
      name: 'Code Editor',
      href: '/code',
      icon: Code,
      subItems: [
        { name: 'Playground', href: '/code', description: 'Write and execute C++ code' },
        { name: 'Snippets', href: '/code/snippets', description: 'Your saved code snippets' },
        { name: 'Templates', href: '/code/templates', description: 'Starter templates' }
      ]
    },
    {
      name: 'Learning',
      href: '/learn',
      icon: BookOpen,
      subItems: [
        { name: 'Courses', href: '/learn', description: 'Structured learning paths' },
        { name: 'Exercises', href: '/learn/exercises', description: 'Practice problems' },
        { name: 'Tutorials', href: '/learn/tutorials', description: 'Step-by-step guides' },
        { name: 'Progress', href: '/learn/progress', description: 'Track your journey' }
      ]
    },
    {
      name: 'Community',
      href: '/community',
      icon: Users,
      subItems: [
        { name: 'Forums', href: '/community', description: 'Discussion forums' },
        { name: 'Leaderboard', href: '/community/leaderboard', description: 'Top contributors' },
        { name: 'Events', href: '/community/events', description: 'Coding challenges' }
      ]
    }
  ];

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-menu')) {
        setUserMenuOpen(false);
      }
      if (!target.closest('.theme-menu')) {
        setThemeMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
      
      // Escape to close modals
      if (event.key === 'Escape') {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
        setThemeMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  const isActivePath = (href: string) => {
    if (href === '/dashboard') {
      return router.pathname === href;
    }
    return router.pathname.startsWith(href);
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Zap className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              C++ Mastery
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-md lg:hidden hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = isActivePath(item.href);
              const Icon = item.icon;
              
              return (
                <div key={item.name}>
                  <Link
                    href={item.href}
                    className={`
                      group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                      ${isActive 
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }
                    `}
                  >
                    <Icon className={`
                      mr-3 h-5 w-5 transition-colors duration-200
                      ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'}
                    `} />
                    {item.name}
                    {item.badge && (
                      <span className="ml-auto bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs rounded-full px-2 py-1">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                  
                  {/* Sub-navigation */}
                  {item.subItems && isActive && (
                    <div className="mt-2 ml-8 space-y-1">
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className="group flex items-center px-3 py-2 text-sm text-gray-600 dark:text-gray-400 rounded-md hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <span className="truncate">{subItem.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* User info in sidebar (mobile) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 lg:hidden">
          {user && (
            <div className="flex items-center">
              <img
                className="h-8 w-8 rounded-full"
                src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=3B82F6&color=fff`}
                alt={user.username}
              />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>

            {/* Page title */}
            <div className="flex-1 min-w-0 lg:ml-0 ml-4">
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {title}
              </h1>
              {description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  {description}
                </p>
              )}
            </div>

            {/* Header actions */}
            <div className="flex items-center space-x-4">
              {/* Search button */}
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                title="Search (⌘K)"
              >
                <Search className="h-5 w-5" />
              </button>

              {/* Theme switcher */}
              <div className="relative theme-menu">
                <button
                  onClick={() => setThemeMenuOpen(!themeMenuOpen)}
                  className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                  title="Change theme"
                >
                  <ThemeIcon className="h-5 w-5" />
                </button>

                {themeMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    {[
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'system', label: 'System', icon: Monitor }
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => {
                          setTheme(value as 'light' | 'dark' | 'system');
                          setThemeMenuOpen(false);
                        }}
                        className={`
                          w-full flex items-center px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200
                          ${theme === value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}
                        `}
                      >
                        <Icon className="mr-3 h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Notifications */}
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {/* Notification badge */}
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white dark:ring-gray-800"></span>
              </button>

              {/* User menu */}
              {user && (
                <div className="relative user-menu">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <img
                      className="h-8 w-8 rounded-full"
                      src={user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=3B82F6&color=fff`}
                      alt={user.username}
                    />
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user.username}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                      </div>
                      
                      <Link
                        href="/profile"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="mr-3 h-4 w-4" />
                        Profile
                      </Link>
                      
                      <Link
                        href="/settings"
                        className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <Settings className="mr-3 h-4 w-4" />
                        Settings
                      </Link>
                      
                      <hr className="my-1 border-gray-200 dark:border-gray-700" />
                      
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* Search Modal */}
      <SearchModal 
        isOpen={searchOpen} 
        onClose={() => setSearchOpen(false)} 
      />

      {/* Notifications Panel */}
      <NotificationPanel 
        isOpen={notificationsOpen} 
        onClose={() => setNotificationsOpen(false)} 
      />
    </div>
  );
};

export default MainLayout;