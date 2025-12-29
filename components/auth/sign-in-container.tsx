"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Message } from "@/components/form-message";
import { SignInForm } from "./sign-in-form";
import { SessionDialog } from "./session-dialog";
import { 
  getDialogMessage, 
  getDialogTitle, 
  shouldShowDialog, 
  getAuthToastMessage 
} from "@/hooks/use-sign-in";

interface SignInContainerProps {
  message?: Message;
}

/**
 * Sign-In Container Component
 * 
 * PURPOSE: Coordinates sign-in functionality and session management
 * - Manages all React hooks and client-side logic
 * - Handles toast notifications and dialog state
 * - Coordinates between form and session components
 * 
 * RESPONSIBILITIES:
 * - Component coordination
 * - Client-side state management
 * - Toast and dialog logic
 * - URL parameter handling
 */
export function SignInContainer({ message }: SignInContainerProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const shownErrorRef = useRef<string | null>(null);
  const dialogShownRef = useRef(false);
  const reasonToastShownRef = useRef(false);
  
  const [showInactivityDialog, setShowInactivityDialog] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const reason = urlParams.get('reason');
      const shouldShow = shouldShowDialog(reason);
      if (shouldShow && !dialogShownRef.current) {
        dialogShownRef.current = true;
        return true;
      }
    }
    return false;
  });

  // Check searchParams when it becomes available
  useEffect(() => {
    const reason = searchParams.get('reason');
    const shouldShow = shouldShowDialog(reason);
    if (shouldShow && !showInactivityDialog && !dialogShownRef.current) {
      dialogShownRef.current = true;
      setShowInactivityDialog(true);
    }
  }, [searchParams, showInactivityDialog]);

  // Handle error messages from props
  useEffect(() => {
    if (message && "error" in message && message.error) {
      const errorMessage = Array.isArray(message.error) ? message.error[0] : message.error;
      
      if (shownErrorRef.current !== errorMessage) {
        shownErrorRef.current = errorMessage;
        
        toast({
          title: "Authentication Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  }, [message, toast]);

  // Handle success messages from URL parameters
  useEffect(() => {
    const successMessage = searchParams.get('message');
    if (successMessage && !shownErrorRef.current) {
      shownErrorRef.current = successMessage;
      
      toast({
        title: "Success",
        description: successMessage,
        variant: "default",
      });
      
      // Clear the message from URL
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('message');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams, toast]);

  // Show toast for auth-required redirects (non-dialog reasons)
  useEffect(() => {
    const reason = searchParams.get('reason');
    if (!reason || reasonToastShownRef.current) return;
    
    // Only show toast for reasons that don't have a dialog
    if (reason === 'auth_required' || reason === 'reauth') {
      reasonToastShownRef.current = true;
      const description = getAuthToastMessage(reason);

      toast({
        title: 'Authentication Required',
        description,
        variant: 'default',
      });

      // Remove the reason from URL so the toast doesn't repeat on refresh
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('reason');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [searchParams, toast]);

  const handleInactivityDialogClose = () => {
    setShowInactivityDialog(false);
    // Remove the reason parameter from URL to prevent dialog from showing again
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('reason');
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Get current dialog content
  const currentReason = searchParams.get('reason');
  const dialogTitle = getDialogTitle(currentReason);
  const dialogMessage = getDialogMessage(currentReason);

  return (
    <>
      <SignInForm />
      
      <SessionDialog
        open={showInactivityDialog}
        title={dialogTitle}
        message={dialogMessage}
        onClose={handleInactivityDialogClose}
      />
    </>
  );
}
