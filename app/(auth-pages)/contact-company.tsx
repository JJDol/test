/**
 * Contact Company Message Component
 * 
 * PURPOSE: Displays a message instructing users to contact their company admin for signup
 * - Used in sign-up page when self-registration is disabled
 * - Provides clear guidance for enterprise users
 * - Maintains consistent styling with info icon
 * 
 * USED BY:
 * - /sign-up page (when self-registration is disabled)
 * 
 * ENTERPRISE CONTEXT: We are won't allow self-registration. Company Admin is created by our team, he can then invite colleagues.
 * 
 * ARCHITECTURE:
 * - Uses consistent styling and layout patterns
 * - Follows auth component design standards
 * - Maintains visual consistency across auth pages
 */
"use client";

import { useTranslations } from "next-intl";
import { InfoIcon } from "lucide-react";

export function ContactMessage() {
  const t = useTranslations("auth");
  return (
    <div className="w-full bg-muted/50 px-5 py-4 border rounded-lg flex gap-4 items-start">
      <InfoIcon size={20} className="mt-0.5 text-primary flex-shrink-0" />
      <div className="flex flex-col gap-2">
        <h4 className="font-medium text-foreground">
          {t("accountCreationRequired")}
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t("accountCreationDescription")}
        </p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• {t("adminWillCreate")}</p>
          <p>• {t("receiveInvitation")}</p>
          <p>• {t("contactIT")}</p>
        </div>
      </div>
    </div>
  );
}
