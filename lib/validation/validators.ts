import { 
  ValidationResult, 
  ValidationError, 
  PasswordValidationOptions, 
  EmailValidationOptions, 
  RequiredValidationOptions 
} from './types';

/**
 * Pure validation functions
 * These functions have no dependencies and can be used anywhere
 */

/**
 * Creates a validation result
 */
const createValidationResult = (isValid: boolean, errors: ValidationError[] = []): ValidationResult => ({
  isValid,
  errors
});

/**
 * Creates a validation error
 */
const createValidationError = (field: string, message: string, code?: string): ValidationError => ({
  field,
  message,
  code
});

/**
 * Validates required fields
 */
export const validateRequired = (
  value: string, 
  fieldName: string, 
  options: RequiredValidationOptions = {}
): ValidationResult => {
  const { trim = true, allowWhitespace = false } = options;
  
  let testValue = value;
  
  if (trim) {
    testValue = value.trim();
  }
  
  if (!testValue) {
    return createValidationResult(false, [
      createValidationError(fieldName, `${fieldName} is required`, 'REQUIRED')
    ]);
  }
  
  if (!allowWhitespace && testValue !== testValue.trim()) {
    return createValidationResult(false, [
      createValidationError(fieldName, `${fieldName} cannot be only whitespace`, 'WHITESPACE_ONLY')
    ]);
  }
  
  return createValidationResult(true);
};

/**
 * Validates email format
 */
export const validateEmail = (
  email: string, 
  fieldName: string = 'email',
  options: EmailValidationOptions = {}
): ValidationResult => {
  const { allowEmpty = false } = options;
  
  if (allowEmpty && !email) {
    return createValidationResult(true);
  }
  
  if (!email) {
    return createValidationResult(false, [
      createValidationError(fieldName, `${fieldName} is required`, 'REQUIRED')
    ]);
  }
  
  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(email)) {
    return createValidationResult(false, [
      createValidationError(fieldName, `Please enter a valid ${fieldName}`, 'INVALID_FORMAT')
    ]);
  }
  
  return createValidationResult(true);
};

/**
 * Validates password strength and requirements
 */
export const validatePassword = (
  password: string, 
  fieldName: string = 'password',
  options: PasswordValidationOptions = {}
): ValidationResult => {
  const {
    minLength = 8,
    requireUppercase = false,
    requireLowercase = false,
    requireNumbers = false,
    requireSpecialChars = false,
    maxLength
  } = options;
  
  // Use generic validators for length checks
  const minLengthResult = validateMinLength(password, minLength, fieldName);
  if (!minLengthResult.isValid) {
    return minLengthResult;
  }
  
  // Check maximum length if specified
  if (maxLength) {
    const maxLengthResult = validateMaxLength(password, maxLength, fieldName);
    if (!maxLengthResult.isValid) {
      return maxLengthResult;
    }
  }
  
  // Password-specific validations (not covered by generic validators)
  const errors: ValidationError[] = [];
  
  // Check for uppercase letters
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push(createValidationError(
      fieldName, 
      `${fieldName} must contain at least one uppercase letter`, 
      'REQUIRE_UPPERCASE'
    ));
  }
  
  // Check for lowercase letters
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push(createValidationError(
      fieldName, 
      `${fieldName} must contain at least one lowercase letter`, 
      'REQUIRE_LOWERCASE'
    ));
  }
  
  // Check for numbers
  if (requireNumbers && !/\d/.test(password)) {
    errors.push(createValidationError(
      fieldName, 
      `${fieldName} must contain at least one number`, 
      'REQUIRE_NUMBERS'
    ));
  }
  
  // Check for special characters
  if (requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push(createValidationError(
      fieldName, 
      `${fieldName} must contain at least one special character`, 
      'REQUIRE_SPECIAL_CHARS'
    ));
  }
  
  return createValidationResult(errors.length === 0, errors);
};

/**
 * Validates password confirmation
 */
export const validatePasswordConfirmation = (
  password: string,
  confirmPassword: string,
  passwordFieldName: string = 'password',
  confirmFieldName: string = 'confirmPassword'
): ValidationResult => {
  if (password !== confirmPassword) {
    return createValidationResult(false, [
      createValidationError(
        confirmFieldName, 
        `${confirmFieldName} does not match ${passwordFieldName}`, 
        'PASSWORD_MISMATCH'
      )
    ]);
  }
  
  return createValidationResult(true);
};

/**
 * Validates minimum length
 */
export const validateMinLength = (
  value: string,
  minLength: number,
  fieldName: string
): ValidationResult => {
  if (value.length < minLength) {
    return createValidationResult(false, [
      createValidationError(
        fieldName, 
        `${fieldName} must be at least ${minLength} characters long`, 
        'MIN_LENGTH'
      )
    ]);
  }
  
  return createValidationResult(true);
};

/**
 * Validates maximum length
 */
export const validateMaxLength = (
  value: string,
  maxLength: number,
  fieldName: string
): ValidationResult => {
  if (value.length > maxLength) {
    return createValidationResult(false, [
      createValidationError(
        fieldName, 
        `${fieldName} must be no more than ${maxLength} characters long`, 
        'MAX_LENGTH'
      )
    ]);
  }
  
  return createValidationResult(true);
};

/**
 * Validates pattern matching
 */
export const validatePattern = (
  value: string,
  pattern: RegExp,
  fieldName: string,
  message?: string
): ValidationResult => {
  if (!pattern.test(value)) {
    return createValidationResult(false, [
      createValidationError(
        fieldName, 
        message || `${fieldName} format is invalid`, 
        'PATTERN_MISMATCH'
      )
    ]);
  }
  
  return createValidationResult(true);
};

/**
 * Validates multiple fields at once
 */
export const validateForm = (
  validations: Record<string, ValidationResult>
): ValidationResult => {
  const allErrors: ValidationError[] = [];
  let isValid = true;
  
  Object.values(validations).forEach(validation => {
    if (!validation.isValid) {
      isValid = false;
      allErrors.push(...validation.errors);
    }
  });
  
  return createValidationResult(isValid, allErrors);
};

/**
 * Form-specific validation functions
 * These combine multiple validators for specific forms
 */

/**
 * Validates invitation form data
 * Used by both client and server for consistent invitation validation
 */
export const validateInvitationForm = (formData: {
  name: string;
  password: string;
  confirmPassword: string;
}): ValidationResult => {
  const validations = {
    name: validateRequired(formData.name, 'Full Name'),
    password: validatePassword(formData.password, 'Password'),
    confirmPassword: validatePasswordConfirmation(
      formData.password, 
      formData.confirmPassword, 
      'Password', 
      'Confirm Password'
    )
  };

  return validateForm(validations);
};

/**
 * Validates password reset form data
 * Used by both client and server for consistent password reset validation
 */
export const validatePasswordResetForm = (formData: {
  password: string;
  confirmPassword: string;
}): ValidationResult => {
  const validations = {
    password: validatePassword(formData.password, 'New Password'),
    confirmPassword: validatePasswordConfirmation(
      formData.password, 
      formData.confirmPassword, 
      'New Password', 
      'Confirm Password'
    )
  };

  return validateForm(validations);
};

/**
 * Validates sign-in form data
 * Used by both client and server for consistent sign-in validation
 */
export const validateSignInForm = (formData: {
  email: string;
  password: string;
}): ValidationResult => {
  const validations = {
    email: validateEmail(formData.email, 'Email'),
    password: validateRequired(formData.password, 'Password')
  };

  return validateForm(validations);
};
