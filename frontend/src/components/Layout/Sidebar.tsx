// File: frontend/src/components/Layout/Sidebar.tsx
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { cn } from '@/utils/cn';
import { 
  Home, 
  Code, 
  BookOpen, 
  Users, 
  Trophy, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  Play,
  Brain,
  MessageCircle,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/UI/Button';

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  collapsed = false, 
  onToggle 
}) => {
  const router = useRouter();
  const { user } = useAuth();

  const navigationItems = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: Home,
      description: 'Overview and quick access'
    },
    {
      title: 'Code Playground',
      href: '/code',
      icon: Code,
      description: 'Write and test C++ code'
    },
    {
      title: 'Learning Path',
      href: '/learn',
      icon: BookOpen,
      description: 'Structured courses and tutorials'
    },
    {
      title: 'Practice',
      href: '/practice',
      icon: Play,
      description: 'Coding challenges and exercises'
    },
    {
      title: 'AI Assistant',
      href: '/assistant',
      icon: Brain,
      description: 'Get help with C++ concepts'
    },
    {
      title: 'Community',
      href: '/community',
      icon: Users,
      description: 'Forums and discussions'
    },
    {
      title: 'Progress',
      href: '/progress',
      icon: BarChart3,
      description: 'Track your learning journey'
    },
    {
      title: 'Achievements',
      href: '/achievements',
      icon: Trophy,
      description: 'Badges and milestones'
    }
  ];

  const isActive = (href: string) => {
    return router.pathname === href || router.pathname.startsWith(href + '/');
  };

  return (
    <div className={cn(
      'flex flex-col h-full bg-background border-r border-border transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Code className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground">C++ Hub</span>
          </div>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-8 w-8 p-0"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                active && 'bg-accent text-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.title : undefined}
            >
              <Icon className={cn(
                'h-5 w-5',
                !collapsed && 'mr-3'
              )} />
              {!collapsed && (
                <div className="flex-1">
                  <div className="text-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.description}
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      {user && (
        <div className="p-4 border-t border-border">
          <Link
            href="/profile"
            className={cn(
              'flex items-center space-x-3 p-2 rounded-lg hover:bg-accent transition-colors',
              collapsed && 'justify-center space-x-0'
            )}
          >
            <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {user.email}
                </div>
              </div>
            )}
          </Link>
          
          {!collapsed && (
            <Link
              href="/settings"
              className="flex items-center space-x-3 p-2 mt-2 rounded-lg hover:bg-accent transition-colors text-sm"
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
