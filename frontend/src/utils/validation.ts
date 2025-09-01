// File: frontend/src/utils/validation.ts
// Extension: .ts
/**
 * Validation utility functions for forms and user input
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate required field
 */
export function validateRequired(value: any, fieldName: string): ValidationResult {
  const isValid = value !== null && value !== undefined && String(value).trim() !== '';
  return {
    isValid,
    errors: isValid ? [] : [`${fieldName} is required`]
  };
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  const length = value?.length || 0;
  const errors: string[] = [];
  
  if (length < min) {
    errors.push(`${fieldName} must be at least ${min} characters`);
  }
  
  if (length > max) {
    errors.push(`${fieldName} must be no more than ${max} characters`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  
  return {
    isValid,
    errors: isValid ? [] : ['Please enter a valid email address']
  };
}

/**
 * Validate password requirements
 */
export function validatePasswordRequirements(password: string): ValidationResult {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate password confirmation
 */
export function validatePasswordConfirmation(
  password: string,
  confirmation: string
): ValidationResult {
  const isValid = password === confirmation;
  
  return {
    isValid,
    errors: isValid ? [] : ['Passwords do not match']
  };
}

/**
 * Validate file upload
 */
export function validateFile(
  file: File,
  allowedTypes: string[],
  maxSize: number
): ValidationResult {
  const errors: string[] = [];
  
  // Check file type
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedTypes.includes(fileExtension)) {
    errors.push(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size too large. Maximum size: ${formatFileSize(maxSize)}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult {
  try {
    new URL(url);
    return { isValid: true, errors: [] };
  } catch {
    return { isValid: false, errors: ['Please enter a valid URL'] };
  }
}

/**
 * Validate number range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  const errors: string[] = [];
  
  if (value < min) {
    errors.push(`${fieldName} must be at least ${min}`);
  }
  
  if (value > max) {
    errors.push(`${fieldName} must be no more than ${max}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Combine multiple validation results
 */
export function combineValidations(...validations: ValidationResult[]): ValidationResult {
  const allErrors = validations.flatMap(v => v.errors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
}