// File: frontend/src/pages/auth/forgot-password.tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import { authService } from '../../services/api';

interface ForgotPasswordPageProps {}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await authService.forgotPassword({ email: email.trim() });
      setSuccess(true);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (loading) return;
    
    setLoading(true);
    setError('');

    try {
      await authService.forgotPassword({ email: email.trim() });
      // Show success message without changing state
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to resend email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Layout showNavigation={false}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl rounded-lg sm:px-10"
            >
              {/* Success Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 mb-6">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>

              {/* Success Message */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Check Your Email
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  We've sent a password reset link to{' '}
                  <span className="font-medium text-gray-900 dark:text-white">{email}</span>
                </p>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Didn't receive the email? Check your spam folder or try resending.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={handleResendEmail}
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      'Resend Email'
                    )}
                  </button>
                  
                  <Link href="/auth/login">
                    <button className="w-full flex justify-center py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                      Back to Sign In
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showNavigation={false}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="mx-auto h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6">
              <span className="text-white font-bold text-xl">C++</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Forgot Password?
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              No worries! Enter your email and we'll send you a reset link.
            </p>
          </motion.div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white dark:bg-gray-800 py-8 px-4 shadow-xl rounded-lg sm:px-10"
          >
            {/* Back Button */}
            <div className="mb-6">
              <Link href="/auth/login">
                <button className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </button>
              </Link>
            </div>

            {/* Error Alert */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center"
              >
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mr-3" />
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </motion.div>
            )}

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError('');
                    }}
                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={!email.trim() || loading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </div>
            </form>

            {/* Help Section */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                    Need help?
                  </span>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Remember your password?{' '}
                  <Link href="/auth/login">
                    <span className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer">
                      Sign in
                    </span>
                  </Link>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Don't have an account?{' '}
                  <Link href="/auth/register">
                    <span className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer">
                      Sign up for free
                    </span>
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Help Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
        >
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              What happens next?
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• We'll send a secure link to your email</li>
              <li>• Click the link to create a new password</li>
              <li>• The link expires in 1 hour for security</li>
              <li>• Check your spam folder if you don't see it</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </Layout>
  );
};

export default ForgotPasswordPage;