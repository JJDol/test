/**
 * Storage Bucket Management Route
 * 
 * PURPOSE: Ensure company storage buckets exist for file operations
 * - Creates company-specific storage buckets if they don't exist
 * - Supports both private and public bucket types
 * - Ensures multi-tenant storage isolation
 * 
 * TODO:
 * - Add bucket size monitoring and limits
 * - Consider bucket lifecycle management (cleanup, archiving)
 * - Add bucket access logging for audit purposes
 * - Consider bucket policy management (CORS, public access)
 * 
 * ROUTE: POST /api/storage/ensure-buckets
 */
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth/auth-middleware';
import { storageService } from '@/lib/services/integrations/storage-service';
import { createClient } from '@/lib/supabase/server';

async function ensureBucketsHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();

    // Get current user profile (auth middleware already verified user exists)
    const { data: currentUserProfile, error: currentUserError } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', request.user.id)
      .single();

    if (currentUserError) throw currentUserError;

    // Ensure user has a company_id (multi-tenancy requirement) unless they're ADMIN
    if (!currentUserProfile.company_id && currentUserProfile.role !== 'ADMIN') {
      return NextResponse.json({ error: "User not assigned to a company" }, { status: 403 });
    }

    // Ensure buckets exist for the user's company
    await storageService.ensureCompanyBucketsExist(currentUserProfile.company_id);

    return NextResponse.json({ 
      message: 'Buckets ensured successfully',
      companyId: currentUserProfile.company_id,
      buckets: [
        storageService.getCompanyBucketName(currentUserProfile.company_id, false),
        storageService.getCompanyBucketName(currentUserProfile.company_id, true)
      ]
    });

  } catch (error) {
    console.error('Error ensuring buckets:', error);
    return NextResponse.json({ 
      message: 'Failed to ensure buckets',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export const POST = withAuth(ensureBucketsHandler); 