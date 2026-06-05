import { SuccessCard } from "@/components/ui/success-card";
import { useTranslations } from "next-intl";

/**
 * Invitation Success Component
 * 
 * PURPOSE: Shows success state after account creation
 * - Uses standardized SuccessCard component
 * - Consistent with other success flows
 * - Professional success messaging
 */
export function InvitationSuccess() {
  const t = useTranslations("invite");
  return (
    <SuccessCard
      title={t("welcomeToTeam")}
      message={t("accountCreated")}
      buttonText={t("signInNow")}
      redirectPath="/sign-in"
      autoRedirect={true}
      autoRedirectDelay={3000}
    />
  );
}
