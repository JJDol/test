"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { AddColleagueForm } from "@/components/ui/add-colleague-form";
import { DeleteColleagueDialog } from "@/components/ui/delete-colleague-dialog";
import { Trash2, AlertTriangle, Mail, RefreshCw, X, Loader2 } from "lucide-react";
import type { Colleague, Invitation } from "@/hooks/use-colleagues";

interface ColleaguesManagementProps {
  colleagues: Colleague[];
  invitations: Invitation[];
  isLoading: boolean;
  isInvitationActionPending: boolean;
  error: string | null;
  currentUserId: string;
  onColleagueAdded: () => void;
  onRevokeInvitation: (invitationId: string) => Promise<boolean>;
  onResendInvitation: (invitationId: string) => Promise<boolean>;
  canDeleteColleague: (colleague: Colleague, currentUserId: string) => boolean;
  getDeletionBlockReason: (colleague: Colleague, currentUserId: string) => string | null;
}

export function ColleaguesManagement({
  colleagues,
  invitations,
  isLoading,
  isInvitationActionPending,
  error,
  currentUserId,
  onColleagueAdded,
  onRevokeInvitation,
  onResendInvitation,
  canDeleteColleague,
  getDeletionBlockReason,
}: ColleaguesManagementProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [colleagueToDelete, setColleagueToDelete] = useState<Colleague | null>(null);
  const [pendingInvitationId, setPendingInvitationId] = useState<string | null>(null);

  const handleDeleteColleague = (colleague: Colleague) => {
    setColleagueToDelete(colleague);
    setDeleteDialogOpen(true);
  };

  const handleColleagueDeleted = () => {
    // Just close the dialog - deletion already happened in the dialog
    // No need to call onDeleteColleague again as it would fail
    handleCloseDeleteDialog();
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setColleagueToDelete(null);
  };

  const handleRevoke = async (invitationId: string) => {
    setPendingInvitationId(invitationId);
    try {
      await onRevokeInvitation(invitationId);
    } finally {
      setPendingInvitationId(null);
    }
  };

  const handleResend = async (invitationId: string) => {
    setPendingInvitationId(invitationId);
    try {
      await onResendInvitation(invitationId);
    } finally {
      setPendingInvitationId(null);
    }
  };

  /**
   * Extract the common header to avoid duplication
   */
  const renderHeader = () => (
    <CardHeader>
      <div className="flex justify-between items-center">
        <div>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>
            Manage colleagues in your company
          </CardDescription>
        </div>
        <AddColleagueForm onColleagueAdded={onColleagueAdded} />
      </div>
    </CardHeader>
  );

  if (isLoading) {
    return (
      <Card>
        {renderHeader()}
        <CardContent>
          <LoadingState 
            variant="inline" 
            message="Loading team members..." 
            size="sm"
          />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        {renderHeader()}
        <CardContent>
          <div className="text-center py-6">
            <p className="text-destructive">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasAny = colleagues.length > 0 || invitations.length > 0;

  return (
    <>
      <Card>
        {renderHeader()}
        <CardContent>
          {hasAny ? (
            <div className="grid gap-4">
              {colleagues.map((colleague) => (
                <ColleagueCard
                  key={colleague.id}
                  colleague={colleague}
                  onDelete={() => handleDeleteColleague(colleague)}
                  canDelete={canDeleteColleague(colleague, currentUserId)}
                  deletionBlockReason={getDeletionBlockReason(colleague, currentUserId)}
                />
              ))}
              {invitations.map((invitation) => (
                <InvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  isActionPending={
                    isInvitationActionPending && pendingInvitationId === invitation.id
                  }
                  onRevoke={() => handleRevoke(invitation.id)}
                  onResend={() => handleResend(invitation.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">
                No colleagues found. Add some team members to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {deleteDialogOpen && colleagueToDelete && (
        <DeleteColleagueDialog
          isOpen={deleteDialogOpen}
          colleague={colleagueToDelete}
          onUserDeleted={handleColleagueDeleted}
          onClose={handleCloseDeleteDialog}
        />
      )}
    </>
  );
}

interface ColleagueCardProps {
  colleague: Colleague;
  onDelete: () => void;
  canDelete: boolean;
  deletionBlockReason: string | null;
}

function ColleagueCard({ 
  colleague, 
  onDelete, 
  canDelete, 
  deletionBlockReason 
}: ColleagueCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium">
          {colleague.name || colleague.email}
        </h3>
        <span className="px-2 py-1 text-xs rounded-full bg-secondary text-secondary-foreground">
          {colleague.role}
        </span>
      </div>
      <div className="text-sm text-muted-foreground">
        <p>Email: {colleague.email}</p>
        <p>Added: {new Date(colleague.created_at).toLocaleDateString()}</p>
      </div>
      <div className="mt-3">
        {canDelete ? (
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
          </Button>
        ) : (
          <div className="text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {deletionBlockReason}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface InvitationCardProps {
  invitation: Invitation;
  isActionPending: boolean;
  onRevoke: () => void;
  onResend: () => void;
}

function InvitationCard({ invitation, isActionPending, onRevoke, onResend }: InvitationCardProps) {
  const isExpired = invitation.status === 'expired';
  const badgeClasses = isExpired
    ? 'bg-red-100 text-red-700 border border-red-200'
    : 'bg-amber-100 text-amber-800 border border-amber-200';
  const badgeLabel = isExpired ? 'EXPIRED' : 'PENDING';

  const sentDate = new Date(invitation.created_at).toLocaleDateString();
  const expiryDate = new Date(invitation.expires_at).toLocaleDateString();

  return (
    <div className="border rounded-lg p-4 bg-muted/20">
      <div className="flex justify-between items-center mb-2 gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
          <h3 className="text-lg font-medium truncate">
            {invitation.name || invitation.email}
          </h3>
          <span className={`px-2 py-0.5 text-[10px] font-semibold tracking-wide rounded-full shrink-0 ${badgeClasses}`}>
            {badgeLabel}
          </span>
        </div>
        <span className="px-2 py-1 text-xs rounded-full bg-secondary text-secondary-foreground shrink-0">
          {invitation.role}
        </span>
      </div>
      <div className="text-sm text-muted-foreground space-y-0.5">
        <p>Email: {invitation.email}</p>
        <p>Invited: {sentDate}</p>
        <p>
          {isExpired ? 'Expired on: ' : 'Expires on: '}
          {expiryDate}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onResend}
          disabled={isActionPending}
        >
          {isActionPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {isExpired ? 'Resend Invitation' : 'Resend'}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onRevoke}
          disabled={isActionPending}
        >
          <X className="mr-2 h-4 w-4" />
          Revoke
        </Button>
      </div>
    </div>
  );
}
