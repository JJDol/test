/**
 * Service Health Check Utilities
 * 
 * PURPOSE: Check if critical services are available
 * - Production-safe service availability checking
 * - No exposure of environment variable details
 * - Graceful degradation when services unavailable
 */

/**
 * Check if authentication service is available
 * Returns false if Supabase is not properly configured
 */
export async function isAuthServiceAvailable(): Promise<boolean> {
  try {
    // Check if we have the minimum required config
    const hasConfig = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    
    if (!hasConfig) {
      // In development, show helpful message
      if (process.env.NODE_ENV === 'development') {
        console.warn('⚠️ Supabase configuration missing. Check your environment variables.');
      }
      return false;
    }

    // In production, we could add actual health check ping to Supabase
    // For now, having config means service is available
    return true;
  } catch (error) {
    // Only log detailed errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Auth service availability check failed:', error);
    } else {
      console.error('Auth service unavailable');
    }
    return false;
  }
}

