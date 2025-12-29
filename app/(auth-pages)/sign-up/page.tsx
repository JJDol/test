/**
 * Sign Up Page
 * 
 * PURPOSE: User registration page (currently disabled for enterprise use)
 * - Shows contact company message instead of registration form
 * - Redirects users to contact their company admin for account creation
 * 
 * ENTERPRISE CONTEXT:
 * - Self-registration is disabled for security and control
 * - Company administrators manage user accounts
 * - Prevents unauthorized access to the system
 * 
 * ROUTE: /sign-up
 * 
 * ARCHITECTURE:
 * - Page: Thin container for composition and layout
 * - Uses unified AuthPageLayout for consistency
 * - Follows same pattern as sign-in and forgot password pages
 */
import { FormMessage, Message } from "@/components/form-message";
import Link from "next/link";
import { ContactMessage } from "../contact-company";
import { Button } from "@/components/ui/button";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { AuthContentLayout } from "@/components/auth/auth-content-layout";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  
  // Handle message display with consistent layout
  if ("message" in searchParams) {
    return (
      <>
        <AuthPageHeader
          title="Sign Up"
          description="Account creation"
        />
        
        <AuthContentLayout>
          <div className="w-full flex items-center justify-center">
            <FormMessage message={searchParams} />
          </div>
        </AuthContentLayout>
      </>
    );
  }

  return (
    <>
      <AuthPageHeader
        title="Sign Up"
        description="Contact your company administrator to create an account"
      />
      
      <AuthContentLayout>
        {/* Contact message section */}
        <div className="w-full">
          <ContactMessage />
        </div>
        
        {/* Navigation section */}
        <div className="w-full space-y-4">
          <Button asChild size="sm" variant="default" className="w-full">
            <Link href="/sign-in">Back to Sign In</Link>
          </Button>
          
          {/* Additional info for enterprise users */}
          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              Need help? Contact your IT department
            </p>
          </div>
        </div>
        
        {/* Spacer to fill remaining space */}
        <div className="flex-1 min-h-[80px]"></div>
      </AuthContentLayout>
    </>
  );
}
