// File: frontend/src/components/Auth/RegisterForm.tsx
// Extension: .tsx (TypeScript React Component)

import React, { useState } from 'react';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';

interface RegisterFormProps {
  onSubmit: (data: RegisterData) => Promise<void>;
  loading?: boolean;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSubmit, loading = false }) => {
  const [formData, setFormData] = useState<RegisterData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  const [errors, setErrors] = useState<Partial<RegisterData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterData> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      await onSubmit(formData);
    }
  };

  const handleChange = (field: keyof RegisterData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Input
            label="First Name"
            type="text"
            value={formData.firstName}
            onChange={handleChange('firstName')}
            error={errors.firstName}
            placeholder="Enter your first name"
            required
          />
        </div>
        <div>
          <Input
            label="Last Name"
            type="text"
            value={formData.lastName}
            onChange={handleChange('lastName')}
            error={errors.lastName}
            placeholder="Enter your last name"
            required
          />
        </div>
      </div>

      <Input
        label="Username"
        type="text"
        value={formData.username}
        onChange={handleChange('username')}
        error={errors.username}
        placeholder="Choose a username"
        required
      />

      <Input
        label="Email"
        type="email"
        value={formData.email}
        onChange={handleChange('email')}
        error={errors.email}
        placeholder="Enter your email"
        required
      />

      <Input
        label="Password"
        type="password"
        value={formData.password}
        onChange={handleChange('password')}
        error={errors.password}
        placeholder="Create a password"
        required
      />

      <Input
        label="Confirm Password"
        type="password"
        value={formData.confirmPassword}
        onChange={handleChange('confirmPassword')}
        error={errors.confirmPassword}
        placeholder="Confirm your password"
        required
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        loading={loading}
      >
        Create Account
      </Button>

      <div className="text-center text-sm text-gray-600">
        Already have an account?{' '}
        <a href="/auth/login" className="text-blue-600 hover:underline">
          Sign in
        </a>
      </div>
    </form>
  );
};