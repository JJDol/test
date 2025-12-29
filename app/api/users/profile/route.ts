import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest, jwtUtils } from '@/lib/auth/auth-middleware';

/**
 * User Profile Management API Route
 * 
 * PURPOSE: Handle user profile operations including retrieval, creation, and updates
 * - Fetches user profile data with automatic profile creation for new users
 * - Updates user profile information and synchronizes JWT metadata
 * - Implements profile auto-creation for users without existing profiles
 * - Manages user role and company assignment metadata
 * 
 * TODO:
 * - Add profile picture upload and management functionality
 * - Implement profile completion workflow for new users
 * - Add profile validation rules and data sanitization
 * - Consider profile templates for different user types
 * - Add profile change history and audit logging
 * - Implement profile export functionality for compliance
 * - Add profile completion percentage tracking
 * - Consider profile backup and restore capabilities
 * - Add profile sharing and visibility controls
 * - Implement profile synchronization with external systems
 * 
 * ROUTE: /api/users/profile
 */

async function getProfileHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();

    // Check if the users table exists
    const { error: tableCheckError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (tableCheckError) {
      console.error('Error checking users table:', tableCheckError);
      return NextResponse.json({ 
        message: "Database configuration issue. The users table may not exist.", 
        error: tableCheckError.message 
      }, { status: 500 });
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('id, email, name, role, company_id, assigned_projects')
      .eq('id', request.user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      // Check if it's a "not found" error
      if (error.code === 'PGRST116') {
        // Try to create a profile for the user if they don't have one
        const { data: newProfile, error: createError } = await supabase
          .from('users')
          .insert({
            id: request.user.id,
            email: request.user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating profile:', createError);
          return NextResponse.json({ 
            message: "Failed to create profile", 
            error: createError.message 
          }, { status: 500 });
        }
        
        // Update JWT metadata after creating profile
        if (newProfile.role && newProfile.company_id) {
          await jwtUtils.updateCurrentUserMetadata(newProfile.role, newProfile.company_id);
        }
        
        return NextResponse.json(newProfile);
      }
      
      return NextResponse.json({ 
        message: "Failed to fetch profile", 
        error: error.message 
      }, { status: 500 });
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error("Error in profile fetch:", error);
    return NextResponse.json({ 
      message: "Failed to fetch profile", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

async function updateProfileHandler(request: AuthenticatedRequest) {
  try {
    const supabase = await createClient();

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ message: "Invalid JSON in request body" }, { status: 400 });
    }

    const { name } = body;
    if (!name) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
    }

    // Check if user exists first
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, role, company_id')
      .eq('id', request.user.id)
      .single();

    if (checkError) {
      // User doesn't exist, create a new profile
      const { data: newProfile, error: createError } = await supabase
        .from('users')
        .insert({
          id: request.user.id,
          email: request.user.email,
          name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating profile:', createError);
        return NextResponse.json({ 
          message: "Failed to create profile", 
          error: createError.message 
        }, { status: 500 });
      }
      
      // Update JWT metadata after creating profile
      if (newProfile.role && newProfile.company_id) {
        await jwtUtils.updateCurrentUserMetadata(newProfile.role, newProfile.company_id);
        console.log(`✅ JWT metadata updated for new user ${request.user.id}`);
      }
      
      return NextResponse.json(newProfile);
    }

    // User exists, update the profile
    const { data: profile, error } = await supabase
      .from('users')
      .update({ 
        name, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', request.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json({ 
        message: "Failed to update profile", 
        error: error.message 
      }, { status: 500 });
    }

    // Update JWT metadata if role or company changed (though name updates don't affect these)
    // This ensures JWT is in sync with database
    if (profile.role && profile.company_id) {
      await jwtUtils.updateCurrentUserMetadata(profile.role, profile.company_id);
      console.log(`✅ JWT metadata refreshed for user ${request.user.id} after profile update`);
    }

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error("Error in profile update:", error);
    return NextResponse.json({ 
      message: "Failed to update profile", 
      error: error?.message || "Unknown error" 
    }, { status: 500 });
  }
}

// Apply authentication wrappers
export const GET = withAuth(getProfileHandler);
export const PUT = withAuth(updateProfileHandler); 