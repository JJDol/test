/**
 * Password requirements configuration
 * Centralized source of truth for password requirements across the application
 */

/**
 * Password requirements for UI display
 * These are extracted from our validation logic to avoid duplication
 */

export interface PasswordRequirement {
  id: string;
  description: string;
  test: (password: string) => boolean;
}

/**
 * Password requirements that match our validation logic
 * Used by UI components to show real-time feedback
 */
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: 'minLength',
    description: 'At least 8 characters long',
    test: (password: string) => password.length >= 8
  },
  {
    id: 'uppercase',
    description: 'At least one uppercase letter (A-Z)',
    test: (password: string) => /[A-Z]/.test(password)
  },
  {
    id: 'lowercase',
    description: 'At least one lowercase letter (a-z)',
    test: (password: string) => /[a-z]/.test(password)
  },
  {
    id: 'numbers',
    description: 'At least one number (0-9)',
    test: (password: string) => /\d/.test(password)
  },
  {
    id: 'specialChars',
    description: 'At least one special character (!@#$%^&*(),.?":{}|<>)',
    test: (password: string) => /[!@#$%^&*(),.?":{}|<>]/.test(password)
  }
];

/**
 * Get password requirements as a simple array of descriptions
 * Useful for UI components that just need to display the requirements
 */
export const getPasswordRequirementDescriptions = (): string[] => {
  return PASSWORD_REQUIREMENTS.map(req => req.description);
};

/**
 * Test a password against all requirements
 * Returns an object with requirement ID and whether it passes
 */
export const testPasswordRequirements = (password: string) => {
  return PASSWORD_REQUIREMENTS.map(req => ({
    id: req.id,
    description: req.description,
    passes: req.test(password)
  }));
};
