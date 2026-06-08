import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { PasswordStrength } from "@/components/ui/password-strength";
import { InvitationFormData } from "@/lib/types/forms";
import { useTranslations } from "next-intl";

interface InvitationData {
  id: string;
  email: string;
  name: string;
  role: string;
  company_id: string;
  invited_by: string;
  expires_at: string;
  status: string;
}

interface InvitationFormProps {
  invitation: InvitationData;
  formData: InvitationFormData;
  onInputChange: (field: keyof InvitationFormData, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
}

/**
 * Invitation Form Component
 * 
 * PURPOSE: Account setup form for invited users
 * - Handles user input for account creation
 * - Password strength validation and confirmation
 * - Professional form layout and validation feedback
 * 
 * RESPONSIBILITIES:
 * - Form input rendering and validation
 * - Password visibility toggle
 * - Real-time password confirmation feedback
 * - Submit button state management
 */
export function InvitationForm({ 
  invitation, 
  formData, 
  onInputChange, 
  onSubmit, 
  submitting 
}: InvitationFormProps) {
  const t = useTranslations("invite");
  const tc = useTranslations("common");
  const [showPassword, setShowPassword] = useState(false);

  // Helper functions for password validation
  const passwordsMatch = formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;
  const passwordsDontMatch = formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword;

  return (
    <div className="w-full flex items-center justify-center p-4 bg-gray-50 min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">{t("completeSetup")}</CardTitle>
          <CardDescription className="text-base">
            {t("invitedDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("emailInvited")}</Label>
              <Input
                id="email"
                type="email"
                value={invitation.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => onInputChange("name", e.target.value)}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("createPassword")} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => onInputChange("password", e.target.value)}
                  placeholder="Create a secure password"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <PasswordStrength password={formData.password} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t("confirmPasswordPlaceholder")} <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => onInputChange("confirmPassword", e.target.value)}
                  placeholder={t("confirmPasswordPlaceholder")}
                  required
                  className={`pr-10 ${
                    formData.confirmPassword 
                      ? passwordsMatch 
                        ? "border-green-500 focus:border-green-500" 
                        : passwordsDontMatch 
                        ? "border-red-500 focus:border-red-500" 
                        : "border-input"
                      : "border-input"
                  }`}
                />
                {formData.confirmPassword && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {passwordsMatch ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : passwordsDontMatch ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                )}
              </div>
              {formData.confirmPassword && (
                <div className="text-sm">
                  {passwordsMatch ? (
                    <p className="text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      {tc("passwordsMatch")}
                    </p>
                  ) : passwordsDontMatch ? (
                    <p className="text-red-600 flex items-center gap-1">
                      <X className="h-3 w-3" />
                      {tc("passwordsDontMatch")}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>{t("role")}:</strong> {invitation.role}
              </p>
            </div>

            <Button 
              type="submit" 
              disabled={submitting || (formData.confirmPassword ? !passwordsMatch : false)} 
              className="w-full"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("creatingAccount")}
                </>
              ) : (
                t("createAccount")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
