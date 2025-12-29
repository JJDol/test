/**
 * Validation types for the form validation system
 * Ensures type safety and consistency across all validation functions
 */

/**
 * Validation result structure
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Individual validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Password validation options
 */
export interface PasswordValidationOptions {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
  maxLength?: number;
}

/**
 * Email validation options
 */
export interface EmailValidationOptions {
  allowEmpty?: boolean;
  customDomains?: string[];
}

/**
 * Required field validation options
 */
export interface RequiredValidationOptions {
  trim?: boolean;
  allowWhitespace?: boolean;
}

/**
 * Form validation schema
 */
export interface ValidationSchema {
  [fieldName: string]: FieldValidationRule[];
}

/**
 * Individual field validation rule
 */
export interface FieldValidationRule {
  type: 'required' | 'email' | 'password' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  message: string;
  options?: PasswordValidationOptions | EmailValidationOptions | RequiredValidationOptions;
  pattern?: RegExp;
  customValidator?: (value: any, formData?: any) => boolean | string;
}

/**
 * Validation function signature
 */
export type ValidationFunction<T = any> = (value: T, options?: any, formData?: any) => ValidationResult;

/**
 * Form data type for validation
 */
export interface FormData {
  [key: string]: any;
}
