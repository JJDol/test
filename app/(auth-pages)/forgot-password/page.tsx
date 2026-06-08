/**
 * Forgot Password Page
 * 
 * PURPOSE: Password reset request page for authenticated users
 * - Allows users to request password reset via email
 * - Sends secure reset link to user's email address
 * 
 * WORKFLOW:
 * 1. User enters email address
 * 2. System validates email format
 * 3. Reset token generated and stored
 * 4. Email sent with secure reset link
 * 5. User clicks link to reset password
 * 6. Token validated and password updated
 * 
 * ROUTE: /forgot-password
 * 
 * ARCHITECTURE:
 * - Page: Thin container for composition and layout
 * - Custom Hook: Business logic and state management
 * - Components: Focused UI components with single responsibilities
 * - API Integration: Handled through custom hooks
 */
"use client";

import { useForgotPassword } from "@/hooks/use-forgot-password";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { AuthContentLayout } from "@/components/auth/auth-content-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { PasswordResetInstructions } from "@/components/auth/password-reset-instructions";
import { AuthNavigationLinks } from "@/components/auth/auth-navigation-links";
import { useTranslations } from "next-intl";

export default function ForgotPassword({ searchParams }: { searchParams: Promise<any> }) {
  const t = useTranslations("auth");
  
  // Use custom hook for all business logic
  const {
    email,
    isSubmitting,
    handleEmailChange,
    handleSubmit,
  } = useForgotPassword({ searchParams });

  return (
    <>
      <AuthPageHeader
        title={t("resetPassword")}
        description={t("resetPasswordDescription")}
      />
      
      <AuthContentLayout>
        {/* Form Component */}
        <ForgotPasswordForm
          email={email}
          isSubmitting={isSubmitting}
          onEmailChange={handleEmailChange}
          onSubmit={handleSubmit}
        />

        {/* Instructions Component */}
        <PasswordResetInstructions />

        {/* Navigation Links Component */}
        <AuthNavigationLinks />
      </AuthContentLayout>
    </>
  );
}

