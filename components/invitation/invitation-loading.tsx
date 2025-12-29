import { LoadingState } from "@/components/ui/loading-state";

/**
 * Invitation Loading Component
 * 
 * PURPOSE: Shows loading state while validating invitation token
 * - Uses standardized LoadingState component
 * - Consistent with other loading flows
 * - Professional loading indicator
 */
export function InvitationLoading() {
  return (
    <LoadingState
      title="Validating Invitation"
      message="Please wait while we verify your invitation link..."
      variant="card"
      size="md"
    />
  );
}
