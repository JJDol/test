import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { signInAction } from "@/app/(auth-pages)/actions";
import Link from "next/link";
import { AuthContentLayout } from "./auth-content-layout";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  return (
    <form className="w-full">
      <AuthContentLayout>
      {/* Header section - Full width */}
      <div className="w-full text-center">
        <p className="text-sm text-foreground">
          {t("dontHaveAccount")}{" "}
          <Link className="text-foreground font-medium underline" href="/sign-up">
            {t("signUp")}
          </Link>
        </p>
      </div>
      
      {/* Form fields section - Full width */}
      <div className="w-full space-y-4">
        <div className="w-full space-y-2">
          <Label htmlFor="email" className="w-full">{t("email")}</Label>
          <Input 
            name="email" 
            placeholder={t("emailPlaceholder")} 
            required 
            className="w-full"
          />
        </div>
        
        <div className="w-full space-y-2">
          <Label htmlFor="password" className="w-full">{t("password")}</Label>
          <Input
            type="password"
            name="password"
            placeholder={t("passwordPlaceholder")}
            required
            className="w-full"
          />
        </div>
        
        <div className="w-full flex justify-end">
          <Link
            className="text-xs text-foreground underline"
            href="/forgot-password"
          >
            {t("forgotPassword")}
          </Link>
        </div>
      </div>
      
      {/* Action buttons section - Full width */}
      <div className="w-full space-y-3">
        <SubmitButton pendingText={t("signingIn")} formAction={signInAction} className="w-full">
          {t("signIn")}
        </SubmitButton>
        
        <Button asChild size="sm" variant="default" className="w-full opacity-50">
          <Link href="/sign-up">{t("signUp")}</Link>
        </Button>
      </div>
      
      {/* Additional content to match forgot password width - Full width */}
      <div className="w-full space-y-4">
        
        {/* Quick actions */}
        <div className="w-full text-center space-y-2">
          <p className="text-xs text-muted-foreground">{tc("needHelp")}</p>
          <div className="flex justify-center space-x-4 text-xs">
            <Link href="/forgot-password" className="text-primary hover:underline">
              {t("resetPassword")}
            </Link>
            <Link href="/contact" className="text-primary hover:underline">
              {t("contactSupport")}
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
