// File: frontend/src/components/UI/Input.tsx
import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  className,
  type,
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  isPassword = false,
  id,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const actualType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const inputStyles = cn(
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium',
    'placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
    error && 'border-destructive focus-visible:ring-destructive',
    leftIcon && 'pl-10',
    (rightIcon || isPassword) && 'pr-10',
    className
  );

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 block"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {leftIcon}
          </div>
        )}
        
        <input
          type={actualType}
          className={inputStyles}
          ref={ref}
          id={inputId}
          {...props}
        />
        
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        
        {rightIcon && !isPassword && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            {rightIcon}
          </div>
        )}
      </div>
      
      {error && (
        <div className="flex items-center mt-1 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}
      
      {helper && !error && (
        <div className="mt-1 text-sm text-muted-foreground">
          {helper}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export { Input };
export type { InputProps };