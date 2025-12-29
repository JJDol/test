import { redirect } from "next/navigation";
import { validateServerAuth } from "@/utils/server-auth";

/**
 * Home Page
 * 
 * PURPOSE: Entry point for the application
 * - Thorough auth validation to prevent stale session issues
 * - Prevents flash of dashboard before redirect on expired sessions
 * 
 * ARCHITECTURE:
 * - Uses shared server auth utility (no code duplication)
 * - Same validation logic as protected layout
 * - AuthSessionManager handles ongoing session management
 */
export default async function Home() {
  // Use shared server auth validation - handles all edge cases
  const authResult = await validateServerAuth();
  
  // If we get here, user is fully authenticated and validated
  // Redirect to dashboard
  redirect("/protected/dashboard");
}
