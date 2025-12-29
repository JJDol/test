import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { signInAction } from "@/app/(auth-pages)/actions";
import Link from "next/link";
import { AuthContentLayout } from "./auth-content-layout";

/**
 * Sign-In Form Component
 * 
 * PURPOSE: Handles the sign-in form UI and form-specific logic
 * - Manages form input presentation
 * - Handles form submission coordination
 * - Provides navigation links to related auth pages
 * 
 * RESPONSIBILITIES:
 * - Form input rendering
 * - Form submission handling
 * - Navigation link display
 * - Form validation feedback
 */
export function SignInForm() {
  return (
    <form className="w-full">
      <AuthContentLayout>
      {/* Header section - Full width */}
      <div className="w-full text-center">
        <p className="text-sm text-foreground">
          Don't have an account?{" "}
          <Link className="text-foreground font-medium underline" href="/sign-up">
            Sign up
          </Link>
        </p>
      </div>
      
      {/* Form fields section - Full width */}
      <div className="w-full space-y-4">
        <div className="w-full space-y-2">
          <Label htmlFor="email" className="w-full">Email</Label>
          <Input 
            name="email" 
            placeholder="you@example.com" 
            required 
            className="w-full"
          />
        </div>
        
        <div className="w-full space-y-2">
          <Label htmlFor="password" className="w-full">Password</Label>
          <Input
            type="password"
            name="password"
            placeholder="Your password"
            required
            className="w-full"
          />
        </div>
        
        <div className="w-full flex justify-end">
          <Link
            className="text-xs text-foreground underline"
            href="/forgot-password"
          >
            Forgot Password?
          </Link>
        </div>
      </div>
      
      {/* Action buttons section - Full width */}
      <div className="w-full space-y-3">
        <SubmitButton pendingText="Signing In..." formAction={signInAction} className="w-full">
          Sign in
        </SubmitButton>
        
        <Button asChild size="sm" variant="default" className="w-full opacity-50">
          <Link href="/sign-up">Sign up</Link>
        </Button>
      </div>
      
      {/* Additional content to match forgot password width - Full width */}
      <div className="w-full space-y-4">
        
        {/* Quick actions */}
        <div className="w-full text-center space-y-2">
          <p className="text-xs text-muted-foreground">Need help?</p>
          <div className="flex justify-center space-x-4 text-xs">
            <Link href="/forgot-password" className="text-primary hover:underline">
              Reset Password
            </Link>
            <Link href="/contact" className="text-primary hover:underline">
              Contact Support
            </Link>
          </div>
        </div>
      </div>
      
      {/* Spacer to fill remaining space */}
      <div className="flex-1 min-h-[40px]"></div>
      </AuthContentLayout>
    </form>
  );
}
