import { SuccessCard } from "@/components/ui/success-card";

/**
 * Invitation Success Component
 * 
 * PURPOSE: Shows success state after account creation
 * - Uses standardized SuccessCard component
 * - Consistent with other success flows
 * - Professional success messaging
 */
export function InvitationSuccess() {
  return (
    <SuccessCard
      title="Welcome to the Team!"
      message="Your account has been created successfully. You'll be redirected to the sign-in page shortly."
      buttonText="Sign In Now"
      redirectPath="/sign-in"
      autoRedirect={true}
      autoRedirectDelay={3000}
    />
  );
}
