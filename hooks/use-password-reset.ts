import { useState } from 'react';
import { useToast } from '@/components/ui/toast';

interface UsePasswordResetOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function usePasswordReset(options: UsePasswordResetOptions = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const sendPasswordReset = async (email: string) => {
    
    if (!email) {
      const errorMessage = "Email is required";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      options.onError?.(errorMessage);
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody = { email };
      
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Password Reset Email Sent",
          description: "Check your email for a link to reset your password.",
        });
        options.onSuccess?.();
      } else {
        const errorMessage = data.error || "Failed to send password reset email. Please contact support.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        options.onError?.(errorMessage);
      }
    } catch (error) {
      const errorMessage = "An error occurred. Please contact support.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      options.onError?.(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    sendPasswordReset,
    isSubmitting,
  };
}
