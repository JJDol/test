import { SuccessCard } from "@/components/ui/success-card";

/**
 * Password Reset Success Component
 * 
 * PURPOSE: Shows success state after password reset
 * - Uses standardized SuccessCard component  
 * - Consistent with other success flows
 * - Professional success messaging
 */
export function PasswordResetSuccess() {
  return (
    <SuccessCard
      title="Password Updated Successfully!"
      message="Your password has been updated. You can now sign in with your new password."
      buttonText="Sign In Now"
      redirectPath="/sign-in?message=Password updated successfully. Please sign in with your new password."
      autoRedirect={true}
      autoRedirectDelay={2000}
    />
  );
}
