import { useCallback } from 'react';
import { useToast } from '@/components/ui/toast';
import { 
  validateRequired, 
  validateEmail, 
  validateMinLength,
  validateMaxLength,
  validatePattern,
  validateForm,
  validateInvitationForm,
  validatePasswordResetForm,
  validateSignInForm,
  validatePassword,
  validatePasswordConfirmation
} from '@/lib/validation/validators';
import { ValidationResult, ValidationError } from '@/lib/validation/types';

/**
 * React hook for form validation with toast integration
 * Provides consistent validation patterns across all forms
 */
export function useFormValidation() {
  const { toast } = useToast();

  /**
   * Shows validation errors as toast notifications
   */
  const showValidationErrors = useCallback((errors: ValidationError[]) => {
    errors.forEach(error => {
      toast({
        title: "Validation Error",
        description: error.message,
        variant: "destructive",
      });
    });
  }, [toast]);

  /**
   * Validates a single field with toast feedback
   */
  const validateFieldWithToast = useCallback((
    validationFn: () => ValidationResult,
    fieldName: string
  ): boolean => {
    const result = validationFn();
    
    if (!result.isValid) {
      showValidationErrors(result.errors);
      return false;
    }
    
    return true;
  }, [showValidationErrors]);

  /**
   * Validates invitation form with toast feedback
   */
  const validateInvitationFormWithToast = useCallback((formData: {
    name: string;
    password: string;
    confirmPassword: string;
  }): boolean => {
    const result = validateInvitationForm(formData);
    
    if (!result.isValid) {
      showValidationErrors(result.errors);
      return false;
    }
    
    return true;
  }, [showValidationErrors]);

  /**
   * Validates password reset form with toast feedback
   */
  const validatePasswordResetFormWithToast = useCallback((formData: {
    password: string;
    confirmPassword: string;
  }): boolean => {
    const result = validatePasswordResetForm(formData);
    
    if (!result.isValid) {
      showValidationErrors(result.errors);
      return false;
    }
    
    return true;
  }, [showValidationErrors]);

    /**
   * Validates sign-in form with toast feedback
   */
  const validateSignInFormWithToast = useCallback((formData: {
    email: string;
    password: string;
  }): boolean => {
    const result = validateSignInForm(formData);
    
    if (!result.isValid) {
      showValidationErrors(result.errors);
      return false;
    }
    
    return true;
  }, [showValidationErrors]);

  /**
   * Validates required field with toast feedback
   */
  const validateRequiredWithToast = useCallback((
    value: string, 
    fieldName: string
  ): boolean => {
    return validateFieldWithToast(
      () => validateRequired(value, fieldName),
      fieldName
    );
  }, [validateFieldWithToast]);

  /**
   * Validates email with toast feedback
   */
  const validateEmailWithToast = useCallback((
    email: string, 
    fieldName: string = 'Email'
  ): boolean => {
    return validateFieldWithToast(
      () => validateEmail(email, fieldName),
      fieldName
    );
  }, [validateFieldWithToast]);

  /**
   * Validates password with toast feedback
   */
  const validatePasswordWithToast = useCallback((
    password: string, 
    fieldName: string = 'Password'
  ): boolean => {
    return validateFieldWithToast(
      () => validatePassword(password),
      fieldName
    );
  }, [validateFieldWithToast]);

  /**
   * Validates password confirmation with toast feedback
   */
  const validatePasswordConfirmationWithToast = useCallback((
    password: string,
    confirmPassword: string,
    passwordFieldName: string = 'Password',
    confirmFieldName: string = 'Confirm Password'
  ): boolean => {
    return validateFieldWithToast(
      () => validatePasswordConfirmation(password, confirmPassword),
      confirmFieldName
    );
  }, [validateFieldWithToast]);

  /**
   * Validates minimum length with toast feedback
   */
  const validateMinLengthWithToast = useCallback((
    value: string,
    minLength: number,
    fieldName: string
  ): boolean => {
    return validateFieldWithToast(
      () => validateMinLength(value, minLength, fieldName),
      fieldName
    );
  }, [validateFieldWithToast]);

  /**
   * Validates maximum length with toast feedback
   */
  const validateMaxLengthWithToast = useCallback((
    value: string,
    maxLength: number,
    fieldName: string
  ): boolean => {
    return validateFieldWithToast(
      () => validateMaxLength(value, maxLength, fieldName),
      fieldName
    );
  }, [validateFieldWithToast]);

  /**
   * Validates pattern with toast feedback
   */
  const validatePatternWithToast = useCallback((
    value: string,
    pattern: RegExp,
    fieldName: string,
    message?: string
  ): boolean => {
    return validateFieldWithToast(
      () => validatePattern(value, pattern, fieldName, message),
      fieldName
    );
  }, [validateFieldWithToast]);

  /**
   * Generic form validation with toast feedback
   */
  const validateFormWithToast = useCallback((
    validations: Record<string, ValidationResult>
  ): boolean => {
    const result = validateForm(validations);
    
    if (!result.isValid) {
      showValidationErrors(result.errors);
      return false;
    }
    
    return true;
  }, [showValidationErrors]);

  return {
    // Form-specific validators with toast
    validateInvitationForm: validateInvitationFormWithToast,
    validatePasswordResetForm: validatePasswordResetFormWithToast,
    validateSignInForm: validateSignInFormWithToast,
    
    // Field-specific validators
    validateRequiredWithToast,
    validateEmailWithToast,
    validatePasswordWithToast,
    validatePasswordConfirmationWithToast,
    validateMinLengthWithToast,
    validateMaxLengthWithToast,
    validatePatternWithToast,
    
    // Generic validators
    validateFormWithToast,
    showValidationErrors,
    
    // Pure validators (for advanced use cases)
    validateRequired,
    validateEmail,
    validateMinLength,
    validateMaxLength,
    validatePattern,
    
    // Shared validators (for direct use)
    validatePassword,
    validatePasswordConfirmation
  };
}
