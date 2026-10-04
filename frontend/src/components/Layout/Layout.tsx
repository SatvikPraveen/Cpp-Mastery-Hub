import React from 'react';

import MainLayout from './MainLayout';

interface LayoutProps {
  children: React.ReactNode;
  title?: string | undefined;
  description?: string | undefined;
  /** When false the page renders without the app chrome (used by auth pages). */
  showNavigation?: boolean | undefined;
}

const Layout: React.FC<LayoutProps> = ({ children, title, description, showNavigation = true }) => {
  if (!showNavigation) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900">{children}</div>;
  }

  return (
    <MainLayout {...(title !== undefined ? { title } : {})} {...(description !== undefined ? { description } : {})}>
      {children}
    </MainLayout>
  );
};

export default Layout;
