// File: frontend/src/components/Auth/ForgotPassword.tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState } from 'react';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';

interface ForgotPasswordProps {
  onSubmit: (email: string) => Promise<void>;
  loading?: boolean;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({ 
  onSubmit, 
  loading = false 
}) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await onSubmit(email);
      setSuccess(true);
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-6">
        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Check your email
          </h3>
          <p className="text-gray-600">
            We've sent a password reset link to{' '}
            <span className="font-medium">{email}</span>
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Didn't receive the email? Check your spam folder or{' '}
            <button
              onClick={() => setSuccess(false)}
              className="text-blue-600 hover:underline"
            >
              try again
            </button>
          </p>
          
          <div>
            <a
              href="/auth/login"
              className="text-blue-600 hover:underline text-sm"
            >
              Back to sign in
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Forgot your password?
        </h2>
        <p className="text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <Input
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
        placeholder="Enter your email"
        required
        autoFocus
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        loading={loading}
      >
        Send Reset Link
      </Button>

      <div className="text-center">
        <a
          href="/auth/login"
          className="text-sm text-blue-600 hover:underline"
        >
          Back to sign in
        </a>
      </div>
    </form>
  );
};