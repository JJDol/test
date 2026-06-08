import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordResetButton } from "@/components/ui/password-reset-button";
import { Mail } from "lucide-react";
import { AuthContentLayout } from "./auth-content-layout";
import { useTranslations } from "next-intl";

interface ForgotPasswordFormProps {
  email: string;
  isSubmitting: boolean;
  onEmailChange: (email: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

/**
 * Forgot Password Form Component
 * 
 * PURPOSE: Handles the password reset form UI and form-specific logic
 * - Manages form input state and validation
 * - Handles form submission
 * - Provides visual feedback during submission
 * 
 * RESPONSIBILITIES:
 * - Form input handling
 * - Form submission coordination
 * - Input validation feedback
 */
export function ForgotPasswordForm({
  email,
  isSubmitting,
  onEmailChange,
  onSubmit,
}: ForgotPasswordFormProps) {
  const t = useTranslations("auth");
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onEmailChange(e.target.value);
  };

  return (
    <form onSubmit={onSubmit} className="w-full">
      <AuthContentLayout>
      {/* Form fields section - Full width */}
      <div className="w-full space-y-4">
        <div className="w-full space-y-2">
          <Label htmlFor="email" className="w-full text-sm font-medium text-foreground">
            {t("emailAddress")}
          </Label>
          <div className="w-full relative">
            <Input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder={t("emailPlaceholder")}
              className="w-full pl-10"
              required
              disabled={isSubmitting}
            />
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Action button section - Full width */}
      <div className="w-full space-y-3">
        <PasswordResetButton
          type="submit"
          isSubmitting={isSubmitting}
          disabled={!email.trim() || isSubmitting}
          variant="full"
          className="w-full"
        />
      </div>
      </AuthContentLayout>
    </form>
  );
}
