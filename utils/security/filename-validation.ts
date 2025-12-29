import path from 'path';

/**
 * Validates a filename for security purposes
 * Prevents path traversal attacks and ensures safe filenames
 * 
 * TODO: Consider expanding this utility when more file operations are added:
 * - File size validation
 * - File type validation (whitelist approach)
 * - Virus scanning integration
 * - File content validation
 * 
 * Current usage patterns:
 * - app/api/chat/files/[fileName]/route.ts
 * - app/api/chat/uploads/[...path]/route.ts
 * 
 * @param fileName - The filename to validate
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateFilename(fileName: string): { isValid: boolean; error?: string } {
  if (!fileName || typeof fileName !== 'string') {
    return { isValid: false, error: 'Filename is required and must be a string' };
  }

  // Normalize the path to handle different path separators
  const normalizedFileName = path.normalize(fileName);

  // Check for path traversal attempts
  if (normalizedFileName.includes('..')) {
    return { isValid: false, error: 'Path traversal not allowed' };
  }

  // Check for directory separators
  if (normalizedFileName.includes('/') || normalizedFileName.includes('\\')) {
    return { isValid: false, error: 'Directory separators not allowed in filename' };
  }

  // Check for null bytes (common in path traversal attacks)
  if (normalizedFileName.includes('\0')) {
    return { isValid: false, error: 'Null bytes not allowed in filename' };
  }

  // Check for reserved characters (Windows)
  const reservedChars = /[<>:"|?*]/;
  if (reservedChars.test(normalizedFileName)) {
    return { isValid: false, error: 'Filename contains reserved characters' };
  }

  // Check filename length
  if (normalizedFileName.length > 255) {
    return { isValid: false, error: 'Filename too long' };
  }

  // Check for empty filename after normalization
  if (normalizedFileName.trim() === '') {
    return { isValid: false, error: 'Filename cannot be empty' };
  }

  return { isValid: true };
}

/**
 * Validates a filename and throws an error if invalid
 * Convenience function for use in API routes
 * 
 * @param fileName - The filename to validate
 * @throws Error if filename is invalid
 */
export function validateFilenameOrThrow(fileName: string): void {
  const validation = validateFilename(fileName);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid filename');
  }
}

/**
 * Sanitizes a filename by removing dangerous characters
 * Use this when you want to clean a filename rather than reject it
 * 
 * @param fileName - The filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(fileName: string): string {
  if (!fileName || typeof fileName !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = fileName.replace(/\0/g, '');
  
  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');
  
  // Replace directory separators with underscores
  sanitized = sanitized.replace(/[\/\\]/g, '_');
  
  // Replace reserved characters with underscores
  sanitized = sanitized.replace(/[<>:"|?*]/g, '_');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length
  if (sanitized.length > 255) {
    sanitized = sanitized.substring(0, 255);
  }
  
  return sanitized || 'unnamed_file';
}
