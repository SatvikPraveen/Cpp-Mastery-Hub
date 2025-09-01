// File: backend/src/types/validation.ts
// Extension: .ts
// Location: backend/src/types/validation.ts

export interface ValidationSchema {
  [key: string]: ValidationRule | ValidationRule[];
}

export interface ValidationRule {
  type: ValidationType;
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  message?: string;
  sanitize?: boolean;
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
}

export enum ValidationType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  EMAIL = 'EMAIL',
  URL = 'URL',
  UUID = 'UUID',
  DATE = 'DATE',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT',
  ENUM = 'ENUM',
  FILE = 'FILE'
}

export interface ValidationOptions {
  allowUnknown?: boolean;
  stripUnknown?: boolean;
  abortEarly?: boolean;
  skipFunctions?: boolean;
  context?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  value?: any;
}

export interface SanitizationOptions {
  trim?: boolean;
  escape?: boolean;
  stripTags?: boolean;
  normalizeEmail?: boolean;
  blacklist?: string[];
  whitelist?: string[];
}