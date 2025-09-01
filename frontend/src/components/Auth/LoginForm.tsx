// File: frontend/src/components/Auth/LoginForm.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/UI/Button';
import { Input } from '@/components/UI/Input';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Lock, Github, Chrome } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface LoginFormProps {
  onSuccess?: () => void;
  redirectTo?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  onSuccess, 
  redirectTo = '/dashboard' 
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { login } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const success = await login({ email, password });
      
      if (success) {
        toast.success('Welcome back!');
        onSuccess?.();
        router.push(redirectTo);
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
        <p className="text-muted-foreground mt-2">
          Sign in to your C++ Mastery Hub account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          label="Email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          leftIcon={<Mail className="h-4 w-4" />}
          required
        />

        <Input
          type="password"
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          leftIcon={<Lock className="h-4 w-4" />}
          isPassword
          required
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-muted-foreground">Remember me</span>
          </label>
          
          <Link 
            href="/auth/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={isLoading}
        >
          Sign In
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-background text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="w-full">
          <Github className="h-4 w-4 mr-2" />
          GitHub
        </Button>
        <Button variant="outline" className="w-full">
          <Chrome className="h-4 w-4 mr-2" />
          Google
        </Button>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <Link 
          href="/auth/register"
          className="text-blue-600 hover:text-blue-500 font-medium"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
};

// File: frontend/src/components/Auth/RegisterForm.tsx
export const RegisterForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { register } = useAuth();
  const router = useRouter();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      const success = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password
      });
      
      if (success) {
        toast.success('Account created successfully!');
        onSuccess?.();
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
        <p className="text-muted-foreground mt-2">
          Join C++ Mastery Hub and start your journey
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            placeholder="John"
            value={formData.firstName}
            onChange={handleInputChange('firstName')}
            error={errors.firstName}
            required
          />
          <Input
            label="Last Name"
            placeholder="Doe"
            value={formData.lastName}
            onChange={handleInputChange('lastName')}
            error={errors.lastName}
            required
          />
        </div>

        <Input
          type="email"
          label="Email"
          placeholder="john@example.com"
          value={formData.email}
          onChange={handleInputChange('email')}
          error={errors.email}
          leftIcon={<Mail className="h-4 w-4" />}
          required
        />

        <Input
          type="password"
          label="Password"
          placeholder="Create a strong password"
          value={formData.password}
          onChange={handleInputChange('password')}
          error={errors.password}
          leftIcon={<Lock className="h-4 w-4" />}
          isPassword
          helper="At least 8 characters with uppercase, lowercase, and number"
          required
        />

        <Input
          type="password"
          label="Confirm Password"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={handleInputChange('confirmPassword')}
          error={errors.confirmPassword}
          leftIcon={<Lock className="h-4 w-4" />}
          isPassword
          required
        />

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            required
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-muted-foreground">
            I agree to the{' '}
            <Link href="/terms" className="text-blue-600 hover:text-blue-500">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
              Privacy Policy
            </Link>
          </span>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={isLoading}
        >
          Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link 
          href="/auth/login"
          className="text-blue-600 hover:text-blue-500 font-medium"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
};