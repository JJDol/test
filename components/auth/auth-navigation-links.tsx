import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface AuthNavigationLinksProps {
  showBackToSignIn?: boolean;
  showSignUp?: boolean;
  backToSignInHref?: string;
  signUpHref?: string;
}

/**
 * Authentication Navigation Links Component
 * 
 * PURPOSE: Provides consistent navigation between authentication pages
 * - Back to sign in link
 * - Sign up link for new users
 * - Reusable across different auth pages
 * 
 * RESPONSIBILITIES:
 * - Navigation link rendering
 * - Consistent styling and behavior
 * - Accessibility with proper link text
 */
export function AuthNavigationLinks({
  showBackToSignIn = true,
  showSignUp = true,
  backToSignInHref = "/sign-in",
  signUpHref = "/sign-up",
}: AuthNavigationLinksProps) {
  return (
    <div className="mt-6 space-y-3">
      {showBackToSignIn && (
        <div className="text-center">
          <Link 
            href={backToSignInHref}
            className="text-primary hover:text-primary/80 transition-colors text-sm flex items-center justify-center gap-1"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Sign In
          </Link>
        </div>
      )}
      
      {showSignUp && (
        <div className="text-center">
          <span className="text-muted-foreground text-sm">
            Don't have an account?{" "}
          </span>
          <Link 
            href={signUpHref}
            className="text-primary hover:text-primary/80 transition-colors text-sm"
          >
            Sign up
          </Link>
        </div>
      )}
    </div>
  );
}
