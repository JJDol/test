import { useState, useEffect } from "react";
import { usePasswordReset } from "@/hooks/use-password-reset";

interface UseForgotPasswordProps {
  searchParams: Promise<any>;
}

interface UseForgotPasswordReturn {
  email: string;
  isSubmitting: boolean;
  handleEmailChange: (email: string) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

/**
 * Custom hook for forgot password functionality
 * 
 * PURPOSE: Manages all business logic for password reset requests
 * - Handles email input state
 * - Manages form submission
 * - Clears expired tokens for optimization
 * - Coordinates with password reset service
 */
export function useForgotPassword({ searchParams }: UseForgotPasswordProps): UseForgotPasswordReturn {
  const [email, setEmail] = useState("");
  const { sendPasswordReset, isSubmitting } = usePasswordReset();

  // Check if we need to clear existing tokens for optimization
  useEffect(() => {
    const checkClearParam = async () => {
      try {
        const params = await searchParams;
        if (params && 'clear' in params) {
          // Clear any existing tokens from database for optimization
          await fetch('/api/auth/clear-expired-tokens', { method: 'POST' });
        }
      } catch (error) {
        console.error('Error clearing expired tokens:', error);
        // Don't throw error - this is optimization, not critical functionality
      }
    };
    
    checkClearParam();
  }, [searchParams]);

  const handleEmailChange = (newEmail: string) => {
    setEmail(newEmail);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    await sendPasswordReset(email);
  };

  return {
    email,
    isSubmitting,
    handleEmailChange,
    handleSubmit,
  };
}
