/**
 * Utility functions for sign-in functionality
 * 
 * PURPOSE: Pure utility functions for sign-in logic
 * - URL parameter processing helpers
 * - Dialog content generators
 * - Message formatting utilities
 * 
 * RESPONSIBILITIES:
 * - Pure data transformation
 * - Helper functions
 * - No side effects or React hooks
 */
export function getDialogMessage(reason: string | null): string {
  switch (reason) {
    case 'session_expired':
      return 'Your session has expired. Please sign in again to continue.';
    case 'inactivity':
      return 'You have been signed out due to inactivity. Please sign in again to continue.';
    case 'session_error':
      return 'There was an issue with your session. Please sign in again to continue.';
    case 'signout':
      return 'You have been successfully signed out.';
    default:
      return 'Please sign in to continue.';
  }
}

export function getDialogTitle(reason: string | null): string {
  switch (reason) {
    case 'session_expired':
      return 'Session Expired';
    case 'inactivity':
      return 'Session Timeout';
    case 'session_error':
      return 'Session Error';
    case 'signout':
      return 'Signed Out';
    default:
      return 'Authentication Required';
  }
}

export function shouldShowDialog(reason: string | null): boolean {
  return reason === 'inactivity' || reason === 'session_expired';
}

export function getAuthToastMessage(reason: string | null): string {
  switch (reason) {
    case 'auth_required':
      return 'Please sign in to continue.';
    case 'reauth':
      return 'Your session is no longer valid. Please sign in again.';
    default:
      return 'Please sign in to continue.';
  }
}
