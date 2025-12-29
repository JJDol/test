/**
 * Authentication Server Actions
 * 
 * PURPOSE: Form handlers for authentication pages
 * - Co-located with auth pages for better organization
 * - Simple form processing for sign-in and sign-out
 * - Complex operations handled by dedicated API routes
 * 
 * ENTERPRISE ARCHITECTURE:
 * - Server Actions: Simple form processing (this file)
 * - API Routes: Complex business logic (/api/auth/*)
 * - This separation provides better maintainability and testing
 * 
 * LOCATION RATIONALE:
 * - Co-located with auth pages that use these actions
 * - Clear separation from other application actions
 * - Easy to find and maintain auth-specific functionality
 */

"use server";

import { encodedRedirect } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Sign In Server Action
 * 
 * PURPOSE: Handle user authentication via form submission
 * - Simple Supabase authentication
 * - Form validation and error handling
 * - Redirect to dashboard on success
 * 
 * USAGE: Used by sign-in form component
 */
export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  if (!email || !password) {
    return encodedRedirect("error", "/sign-in", "Email and password are required");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/protected/dashboard");
};

/**
 * Sign Out Server Action
 * 
 * PURPOSE: Handle user logout
 * - Simple Supabase sign out
 * - Redirect to sign-in page
 * 
 * USAGE: Used by header auth component
 */
export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};
