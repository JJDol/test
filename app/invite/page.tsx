"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useInvitation } from "@/hooks/use-invitation";
import { InvitationLoading } from "@/components/invitation/invitation-loading";
import { InvitationError } from "@/components/invitation/invitation-error";
import { InvitationSuccess } from "@/components/invitation/invitation-success";
import { InvitationForm } from "@/components/invitation/invitation-form";

function InvitePageContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const {
    invitation,
    loading,
    submitting,
    error,
    success,
    formData,
    handleInputChange,
    handleSubmit
  } = useInvitation(token);

  // State-based rendering - clean and focused
  if (loading) {
    return <InvitationLoading />;
  }

  if (error) {
    return <InvitationError error={error} />;
  }

  if (success) {
    return <InvitationSuccess />;
  }

  if (!invitation) {
    return null;
  }

  return (
    <InvitationForm
      invitation={invitation}
      formData={formData}
      onInputChange={handleInputChange}
      onSubmit={handleSubmit}
      submitting={submitting}
    />
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<InvitationLoading />}>
      <InvitePageContent />
    </Suspense>
  );
}
