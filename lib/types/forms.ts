/**
 * Form type definitions for the application
 * Ensures consistency and type safety across all forms
 */

/**
 * Invitation form data structure
 */
export interface InvitationFormData {
  name: string;
  password: string;
  confirmPassword: string;
}

/**
 * Sign-in form data structure
 */
export interface SignInFormData {
  email: string;
  password: string;
}

/**
 * Password reset form data structure
 */
export interface PasswordResetFormData {
  password: string;
  confirmPassword: string;
}

/**
 * Generic form field types
 */
export type FormFieldType = 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea';

/**
 * Form validation result
 */
export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Form field configuration
 */
export interface FormFieldConfig {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  };
}
