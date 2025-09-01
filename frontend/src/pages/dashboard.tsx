// File: frontend/src/pages/dashboard.tsx
// Extension: .tsx

import React, { useEffect } from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/hooks/useAuth';
import MainLayout from '@/components/Layout/MainLayout';
import Dashboard from '@/components/Dashboard/Dashboard';
import LoadingSpinner from '@/components/UI/Loading';

interface DashboardPageProps {
  title?: string;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ title = 'Dashboard' }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <>
      <Head>
        <title>{title} - C++ Mastery Hub</title>
        <meta 
          name="description" 
          content="Your personalized C++ learning dashboard with progress tracking, achievements, and quick actions." 
        />
        <meta name="keywords" content="C++, programming, learning, dashboard, progress tracking" />
        <meta property="og:title" content={`${title} - C++ Mastery Hub`} />
        <meta 
          property="og:description" 
          content="Track your C++ learning progress and access all your courses in one place." 
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="robots" content="noindex, nofollow" /> {/* Private dashboard */}
      </Head>

      <MainLayout>
        <Dashboard />
      </MainLayout>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Check for authentication on server side
  // This is a placeholder - implement actual server-side auth check
  const { req } = context;
  const authCookie = req.cookies['auth_token'];

  if (!authCookie) {
    return {
      redirect: {
        destination: '/auth/login?redirect=/dashboard',
        permanent: false,
      },
    };
  }

  return {
    props: {
      title: 'Dashboard',
    },
  };
};

export default DashboardPage;