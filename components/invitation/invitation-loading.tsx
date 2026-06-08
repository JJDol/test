import { LoadingState } from "@/components/ui/loading-state";
import { useTranslations } from "next-intl";

/**
 * Invitation Loading Component
 * 
 * PURPOSE: Shows loading state while validating invitation token
 * - Uses standardized LoadingState component
 * - Consistent with other loading flows
 * - Professional loading indicator
 */
export function InvitationLoading() {
  const t = useTranslations("invite");
  return (
    <LoadingState
      title={t("validatingInvitation")}
      message={t("validatingMessage")}
      variant="card"
      size="md"
    />
  );
}
