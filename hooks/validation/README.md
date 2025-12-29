# Form Validation System

A comprehensive validation system for forms across the application, providing consistent validation patterns with toast integration.

## Overview

This validation system consists of three layers:

1. **Pure validation functions** (`lib/validation/validators.ts`) - No dependencies
2. **Validation schemas** (`lib/validation/schemas.ts`) - Declarative validation rules
3. **React validation hook** (`hooks/validation/use-form-validation.ts`) - With toast integration

## Quick Start

### Basic Usage

```typescript
import { useFormValidation } from '@/hooks/validation/use-form-validation';

export function MyForm() {
  const { validateInvitationForm } = useFormValidation();
  const { formData } = useForm({ name: "", password: "", confirmPassword: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateInvitationForm(formData)) {
      return; // Validation failed, toast shown automatically
    }
    
    // Process form submission
  };
}
```

### Field-Level Validation

```typescript
import { useFormValidation } from '@/hooks/validation/use-form-validation';

export function MyForm() {
  const { validateEmailWithToast, validatePasswordWithToast } = useFormValidation();

  const handleEmailChange = (email: string) => {
    if (!validateEmailWithToast(email, 'Email Address')) {
      return; // Validation failed, toast shown
    }
    // Update form data
  };
}
```

## Available Validators

### Form-Specific Validators

- `validateInvitationForm(formData)` - Validates invitation acceptance form
- `validatePasswordResetForm(formData)` - Validates password reset form
- `validateSignInForm(formData)` - Validates sign-in form

### Field-Specific Validators

- `validateRequiredWithToast(value, fieldName)` - Required field validation
- `validateEmailWithToast(email, fieldName)` - Email format validation
- `validatePasswordWithToast(password, fieldName)` - Password strength validation
- `validatePasswordConfirmationWithToast(password, confirmPassword)` - Password match validation
- `validateMinLengthWithToast(value, minLength, fieldName)` - Minimum length validation
- `validateMaxLengthWithToast(value, maxLength, fieldName)` - Maximum length validation
- `validatePatternWithToast(value, pattern, fieldName, message)` - Pattern validation

### Pure Validators (No Toast)

For advanced use cases, you can use the pure validation functions:

```typescript
import { validateEmail, validatePassword } from '@/lib/validation/validators';

const emailResult = validateEmail('test@example.com', 'Email');
if (!emailResult.isValid) {
  // Handle validation manually
  console.log(emailResult.errors);
}
```

## Validation Schemas

Pre-defined validation schemas for common forms:

```typescript
import { invitationFormSchema, passwordResetFormSchema } from '@/lib/validation/schemas';

// Use schemas for declarative validation
const schema = invitationFormSchema;
```

## Custom Validation

### Creating Custom Validators

```typescript
import { useFormValidation } from '@/hooks/validation/use-form-validation';

export function MyForm() {
  const { validatePatternWithToast } = useFormValidation();

  const validatePhoneNumber = (phone: string) => {
    const phonePattern = /^\+?[\d\s\-\(\)]{10,}$/;
    return validatePatternWithToast(
      phone, 
      phonePattern, 
      'Phone Number', 
      'Please enter a valid phone number'
    );
  };
}
```

### Custom Form Validation

```typescript
import { useFormValidation } from '@/hooks/validation/use-form-validation';
import { validateRequired, validateEmail } from '@/lib/validation/validators';

export function MyForm() {
  const { validateFormWithToast } = useFormValidation();

  const validateCustomForm = (formData: any) => {
    const validations = {
      name: validateRequired(formData.name, 'Name'),
      email: validateEmail(formData.email, 'Email'),
      phone: validateRequired(formData.phone, 'Phone')
    };

    return validateFormWithToast(formData, validations);
  };
}
```

## Error Handling

### Toast Integration

All validators with "WithToast" suffix automatically show error messages:

```typescript
const { validateEmailWithToast } = useFormValidation();

// This automatically shows a toast if validation fails
validateEmailWithToast('invalid-email', 'Email');
```

### Manual Error Handling

```typescript
import { validateEmail } from '@/lib/validation/validators';

const result = validateEmail('invalid-email', 'Email');
if (!result.isValid) {
  // Handle errors manually
  result.errors.forEach(error => {
    console.log(`${error.field}: ${error.message}`);
  });
}
```

## Validation Options

### Password Validation Options

```typescript
const passwordOptions = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  maxLength: 128
};

const { validatePasswordWithToast } = useFormValidation();
validatePasswordWithToast(password, 'Password', passwordOptions);
```

### Email Validation Options

```typescript
const emailOptions = {
  allowEmpty: false,
  customDomains: ['company.com', 'partner.com']
};

const { validateEmailWithToast } = useFormValidation();
validateEmailWithToast(email, 'Email', emailOptions);
```

## Best Practices

### 1. Use Form-Specific Validators

```typescript
// ✅ Good - Use pre-built form validators
const { validateInvitationForm } = useFormValidation();
if (!validateInvitationForm(formData)) return;

// ❌ Avoid - Manual validation
if (!formData.name.trim()) {
  toast({ title: "Error", description: "Name required" });
  return;
}
```

### 2. Validate on Submit, Not on Change

```typescript
// ✅ Good - Validate on form submission
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateInvitationForm(formData)) return;
  // Process form
};

// ❌ Avoid - Validate on every keystroke (unless needed for UX)
const handleNameChange = (name: string) => {
  validateRequiredWithToast(name, 'Name'); // Only if real-time feedback needed
};
```

### 3. Use Consistent Field Names

```typescript
// ✅ Good - Consistent naming
validateRequiredWithToast(formData.name, 'Full Name');
validateEmailWithToast(formData.email, 'Email Address');

// ❌ Avoid - Inconsistent naming
validateRequiredWithToast(formData.name, 'name');
validateEmailWithToast(formData.email, 'email');
```

## Testing

### Unit Testing Validators

```typescript
import { validateEmail, validatePassword } from '@/lib/validation/validators';

test('validateEmail accepts valid email', () => {
  const result = validateEmail('test@example.com', 'Email');
  expect(result.isValid).toBe(true);
});

test('validateEmail rejects invalid email', () => {
  const result = validateEmail('invalid-email', 'Email');
  expect(result.isValid).toBe(false);
  expect(result.errors[0].message).toContain('valid');
});
```

### Integration Testing

```typescript
import { renderHook } from '@testing-library/react';
import { useFormValidation } from '@/hooks/validation/use-form-validation';

test('validateInvitationForm validates all fields', () => {
  const { result } = renderHook(() => useFormValidation());
  
  const formData = {
    name: '',
    password: '123',
    confirmPassword: '456'
  };
  
  expect(result.current.validateInvitationForm(formData)).toBe(false);
});
```

## Migration Guide

### From Manual Validation

**Before:**
```typescript
const validateForm = () => {
  if (!formData.name.trim()) {
    toast({ title: "Error", description: "Name required" });
    return false;
  }
  if (formData.password.length < 8) {
    toast({ title: "Error", description: "Password too short" });
    return false;
  }
  return true;
};
```

**After:**
```typescript
const { validateInvitationForm } = useFormValidation();

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateInvitationForm(formData)) return;
  // Process form
};
```

## Performance Considerations

- All validation functions are memoized with `useCallback`
- Pure validation functions have no dependencies
- Toast integration is optimized to prevent unnecessary re-renders
- Validation schemas are statically defined

## Security Notes

- All validation is client-side only
- Server-side validation is still required
- Password validation follows industry standards
- Email validation uses RFC 5322 compliant regex
- No sensitive data is logged or stored in validation functions
