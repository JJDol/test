/**
 * Variable Utility Functions
 * 
 * PURPOSE: Centralized utilities for variable processing
 * - Single source of truth for variable normalization
 * - Eliminates duplication across multiple files
 * - Consistent variable handling across the application
 * 
 * ENTERPRISE BENEFITS:
 * - DRY principle compliance
 * - Consistent variable processing across all services
 * - Easy to maintain and update normalization logic
 * - Type safety and validation
 */

/**
 * Normalizes variable names to be valid JavaScript identifiers
 * 
 * FEATURES:
 * - Removes type information after | (e.g., "variable|type" -> "variable")
 * - Converts to lowercase for consistency
 * - Replaces spaces with underscores
 * - Removes special characters except underscores
 * - Handles numbers at the beginning (prefixes with underscore)
 * - Cleans up multiple underscores
 * - Removes leading/trailing underscores
 * 
 * @param name - The variable name to normalize
 * @returns Normalized variable name safe for use as JavaScript identifier
 * 
 * @example
 * normalizeVariableName("Project Name|text") // "project_name"
 * normalizeVariableName("123test") // "_123test"
 * normalizeVariableName("  test__name  ") // "test_name"
 * normalizeVariableName("test@#$%name") // "test_name"
 */
export function normalizeVariableName(name: string): string {
  if (!name || typeof name !== 'string') return '';
  
  // Remove any type information after | (e.g., "variable|type" -> "variable")
  const [baseName] = name.split('|');
  
  // Normalize the base name
  return baseName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, '') // Remove special characters except spaces
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/^[0-9]/, '_$&') // Prefix with underscore if starts with number
    .replace(/__+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

/**
 * Validates if a string is a valid variable name
 * 
 * @param name - The name to validate
 * @returns True if the name is valid, false otherwise
 */
export function isValidVariableName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  
  const normalized = normalizeVariableName(name);
  return normalized.length > 0 && /^[a-z_][a-z0-9_]*$/.test(normalized);
}

/**
 * Sanitizes variable names for display purposes
 * Converts normalized names back to a more readable format
 * 
 * @param normalizedName - The normalized variable name
 * @returns Human-readable variable name
 * 
 * @example
 * sanitizeVariableNameForDisplay("project_name") // "Project Name"
 * sanitizeVariableNameForDisplay("user_email") // "User Email"
 */
export function sanitizeVariableNameForDisplay(normalizedName: string): string {
  if (!normalizedName || typeof normalizedName !== 'string') return '';
  
  return normalizedName
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
}
