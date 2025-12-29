/**
 * Invitation Management Hook
 * 
 * PURPOSE: Handles invitation validation and account creation business logic
 * - Separates business logic from UI components
 * - Manages invitation state and API calls
 * - Provides clean interface for invitation operations
 * 
 * RESPONSIBILITIES:
 * - Invitation token validation
 * - Account creation process
 * - Error handling and state management
 * - API call coordination
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { useForm } from "@/hooks/forms/use-form";
import { useFormValidation } from "@/hooks/validation/use-form-validation";
import { InvitationFormData } from "@/lib/types/forms";

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

interface UseInvitationReturn {
  // State
  invitation: InvitationData | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  success: boolean;
  
  // Form data
  formData: InvitationFormData;
  
  // Actions
  handleInputChange: (field: keyof InvitationFormData, value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
}

export function useInvitation(token: string | null): UseInvitationReturn {
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { formData, setFormField } = useForm<InvitationFormData>({
    name: "",
    password: "",
    confirmPassword: ""
  });

  const { validateInvitationForm } = useFormValidation();
  const router = useRouter();
  const { toast } = useToast();

  // Validate invitation token on mount
  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link. Please check your email for the correct link.");
      setLoading(false);
      return;
    }

    validateInvitation();
  }, [token]);

  const validateInvitation = async () => {
    try {
      const response = await fetch(`/api/users/validate-invitation?token=${token}`);
      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Invalid or expired invitation");
        setLoading(false);
        return;
      }

      setInvitation(result.invitation);
      setFormField("name", result.invitation.name || "");
      setLoading(false);
    } catch (error) {
      console.error('Error validating invitation:', error);
      setError("Failed to validate invitation. Please try again.");
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof InvitationFormData, value: string) => {
    setFormField(field, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateInvitationForm(formData)) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/users/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          name: formData.name,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to accept invitation');
      }

      setSuccess(true);
      toast({
        title: "Account Created Successfully!",
        description: "You can now log in with your email and password.",
      });

      // Redirect to sign-in page after a short delay
      setTimeout(() => {
        router.push('/sign-in');
      }, 3000);

    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept invitation",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    invitation,
    loading,
    submitting,
    error,
    success,
    formData,
    handleInputChange,
    handleSubmit
  };
}
