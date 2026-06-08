"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Eye, EyeOff, Shield, Lock, ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PasswordStrength } from "@/components/ui/password-strength";
import { useTranslations } from "next-intl";

interface ResetPasswordProps {
  params: Promise<{ token: string }>;
}

export default function ResetPasswordWithToken({ params }: ResetPasswordProps) {
  const t = useTranslations("auth");
  const tc = useTranslations("common");
  const [token, setToken] = useState<string>("");
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const router = useRouter();

  useEffect(() => {
    const getToken = async () => {
      try {
        const { token: tokenParam } = await params;
        setToken(tokenParam);
        
        console.log('Validating reset token...');
        
        // Validate token on page load
        const response = await fetch(`/api/auth/validate-reset-token?token=${encodeURIComponent(tokenParam)}`);
        const data = await response.json();
        
        console.log('Token validation response received');
        
        if (response.ok && data.valid) {
          setIsValid(true);
          console.log('Token is valid');
        } else {
          setIsValid(false);
          console.log('Token validation failed');
          setMessage({ 
            type: 'error', 
            text: t("invalidResetLinkDescription")
          });
        }
      } catch (error) {
        console.error('Error validating token');
        setIsValid(false);
        setMessage({ 
          type: 'error', 
          text: t("invalidResetLinkDescription")
        });
      } finally {
        setIsValidating(false);
      }
    };

    getToken();
  }, [params]);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      // Check if passwords match
      if (password !== confirmPassword) {
        setMessage({ type: 'error', text: t("passwordsDoNotMatch") });
        setIsSubmitting(false);
        return;
      }

      // Check password strength using enhanced validation
      if (password.length < 8) {
        setMessage({ type: 'error', text: t("passwordMinLength") });
        setIsSubmitting(false);
        return;
      }

      // Call the API directly
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password,
          confirmPassword
        }),
      });

      const data = await response.json();
      
      // If successful, redirect to sign-in
      if (response.ok) {
        setMessage({ type: 'success', text: t("passwordUpdatedSuccess") });
        setTimeout(() => {
          router.push('/sign-in?message=Password updated successfully. Please sign in with your new password.');
        }, 2000);
      } else {
        setMessage({ type: 'error', text: data.error || t("failedToUpdatePassword") });
      }
    } catch (error) {
      setMessage({ type: 'error', text: t("failedToUpdatePassword") });
    } finally {
      setIsSubmitting(false);
    }
  };



  // Show loading state while validating token
  if (isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">{t("validatingResetLink")}</h1>
          <p className="text-muted-foreground">{t("validatingResetMessage")}</p>
        </div>
      </div>
    );
  }

  // Show error if token is invalid
  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">{t("invalidResetLink")}</h1>
            <p className="text-muted-foreground mb-6">
              {message?.text || t("invalidResetLinkDescription")}
            </p>
          </div>

          <Card className="shadow-lg border-0 bg-card">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Button
                  onClick={() => {
                    // Clear any existing tokens for this user and redirect to forgot password
                    router.push('/forgot-password?clear=true');
                  }}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 rounded-lg"
                >
                  {t("requestNewResetLink")}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => router.push('/sign-in')}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t("backToSignIn")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">{t("resetPasswordTitle")}</h1>
          <p className="text-muted-foreground">
            {t("resetPasswordSubtitle")}
          </p>
        </div>

        {/* Main Form Card */}
        <Card className="shadow-lg border-0 bg-card">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Password Field */}
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  {t("newPassword")}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    placeholder={t("newPasswordPlaceholder")}
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-muted/50"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                
                {/* Enhanced Password Strength Indicator */}
                {password && (
                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                    <PasswordStrength password={password} />
                  </div>
                )}
                

              </div>

              {/* Confirm Password Field */}
              <div className="space-y-3">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  {t("confirmPassword")}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("confirmPasswordPlaceholder")}
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-muted/50"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                
                {/* Password Match Indicator - only show when user types */}
                {confirmPassword && (
                  <div className="flex items-center gap-2 text-sm">
                    {password === confirmPassword ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-600 dark:text-green-400">{tc("passwordsMatch")}</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        <span className="text-red-600 dark:text-red-400">{tc("passwordsDontMatch")}</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || password !== confirmPassword}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    {t("updatingPassword")}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    {t("updatePassword")}
                  </div>
                )}
              </Button>
            </form>

            {/* Messages - only show when there's actually a message */}
            {message && (
              <Alert className={`mt-6 border ${
                message.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200' 
                  : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {message.text}
                </AlertDescription>
              </Alert>
            )}

            {/* Back to Sign In */}
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => router.push('/sign-in')}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("backToSignIn")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 