/**
 * Clear Expired Tokens API
 * 
 * PURPOSE: Clean up expired and used password reset tokens
 * - POST: Delete expired/used tokens for database optimization
 * 
 * SECURITY: Service role access only
 * ROUTE: /api/auth/clear-expired-tokens
 */
import { NextResponse } from 'next/server';
import { createServiceRoleClient as createServiceClient } from '@/lib/supabase/service-role';

export async function POST() {
  try {
    console.log('Clearing expired password reset tokens...');
    
    // Use service role client to bypass RLS policies
    const supabaseService = createServiceClient();

    // Delete expired and used tokens
    const { error } = await supabaseService
      .from('password_reset_tokens')
      .delete()
      .or('expires_at.lt.' + new Date().toISOString() + ',used.eq.true');

    if (error) {
      console.error('Error clearing expired tokens');
      return NextResponse.json({ 
        error: 'Failed to clear expired tokens' 
      }, { status: 500 });
    }

    console.log('Successfully cleared expired password reset tokens');

    return NextResponse.json({ 
      success: true, 
      message: 'Expired tokens cleared successfully' 
    });

  } catch (error) {
    console.error('Error in clear expired tokens API');
    return NextResponse.json({ 
      error: 'An error occurred while clearing tokens' 
    }, { status: 500 });
  }
} 