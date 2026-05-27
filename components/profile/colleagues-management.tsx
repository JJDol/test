"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/ui/loading-state";
import { AddColleagueForm } from "@/components/ui/add-colleague-form";
import { DeleteColleagueDialog } from "@/components/ui/delete-colleague-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mail,
  RefreshCw,
  X,
  Loader2,
  MoreVertical,
  Search,
  LogOut,
  UserMinus,
} from "lucide-react";
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

type MemberRow =
  | { kind: "colleague"; data: Colleague }
  | { kind: "invitation"; data: Invitation };

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
  const [filterQuery, setFilterQuery] = useState("");

  const handleDeleteColleague = (colleague: Colleague) => {
    setColleagueToDelete(colleague);
    setDeleteDialogOpen(true);
  };

  const handleColleagueDeleted = () => {
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

  const allRows = useMemo<MemberRow[]>(() => {
    const rows: MemberRow[] = [
      ...colleagues.map((c) => ({ kind: "colleague" as const, data: c })),
      ...invitations.map((i) => ({ kind: "invitation" as const, data: i })),
    ];
    if (!filterQuery.trim()) return rows;
    const q = filterQuery.toLowerCase();
    return rows.filter((row) => {
      const d = row.data;
      return (
        (d.name?.toLowerCase().includes(q) ?? false) ||
        d.email.toLowerCase().includes(q)
      );
    });
  }, [colleagues, invitations, filterQuery]);

  const totalCount = colleagues.length + invitations.length;

  const header = (
    <div className="flex items-center justify-between pb-4">
      <div>
        <h2 className="text-xl font-semibold">Team Management</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage colleagues in your company
        </p>
      </div>
      <AddColleagueForm onColleagueAdded={onColleagueAdded} />
    </div>
  );

  if (isLoading) {
    return (
      <div>
        {header}
        <LoadingState variant="inline" message="Loading team members..." size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {header}
        <p className="text-destructive text-sm py-6 text-center">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div>
        {header}

        {/* Filter */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Filter members..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <div className="rounded-lg border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_160px_auto] bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b">
            <span>Member</span>
            <span>Role</span>
            <span className="w-36" />
          </div>

          {/* Rows */}
          {allRows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {filterQuery ? "No members match your filter." : "No team members yet."}
            </div>
          ) : (
            allRows.map((row) =>
              row.kind === "colleague" ? (
                <ColleagueRow
                  key={row.data.id}
                  colleague={row.data}
                  isCurrentUser={row.data.id === currentUserId}
                  canDelete={canDeleteColleague(row.data, currentUserId)}
                  onDelete={() => handleDeleteColleague(row.data)}
                />
              ) : (
                <InvitationRow
                  key={row.data.id}
                  invitation={row.data}
                  isActionPending={
                    isInvitationActionPending && pendingInvitationId === row.data.id
                  }
                  onRevoke={() => handleRevoke(row.data.id)}
                  onResend={() => handleResend(row.data.id)}
                />
              )
            )
          )}
        </div>

        {/* Footer count */}
        {totalCount > 0 && (
          <p className="text-xs text-muted-foreground mt-3 px-1">
            {totalCount} {totalCount === 1 ? "member" : "members"}
          </p>
        )}
      </div>

      {deleteDialogOpen && colleagueToDelete && (
        <DeleteColleagueDialog
          isOpen={deleteDialogOpen}
          colleague={colleagueToDelete}
          onUserDeleted={handleColleagueDeleted}
          onClose={() => {
            setDeleteDialogOpen(false);
            setColleagueToDelete(null);
          }}
        />
      )}
    </>
  );
}

/* ─────────── Colleague row ─────────── */

interface ColleagueRowProps {
  colleague: Colleague;
  isCurrentUser: boolean;
  canDelete: boolean;
  onDelete: () => void;
}

function ColleagueRow({ colleague, isCurrentUser, canDelete, onDelete }: ColleagueRowProps) {
  return (
    <div className="grid grid-cols-[1fr_160px_auto] items-center px-4 py-3.5 border-b last:border-b-0 hover:bg-muted/20 transition-colors">
      {/* Member */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">
            {colleague.name || colleague.email}
          </span>
          {isCurrentUser && (
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              You
            </span>
          )}
        </div>
        {colleague.name && (
          <span className="text-xs text-muted-foreground truncate">{colleague.email}</span>
        )}
      </div>

      {/* Role */}
      <div>
        <span className="text-sm">{colleague.role}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end w-36">
        {isCurrentUser ? (
          <Button variant="outline" size="sm" className="text-xs h-7 px-3 gap-1.5" disabled>
            <LogOut className="h-3 w-3" />
            Leave team
          </Button>
        ) : canDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={onDelete}
              >
                <UserMinus className="mr-2 h-4 w-4" />
                Remove member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-xs text-muted-foreground italic">Protected</span>
        )}
      </div>
    </div>
  );
}

/* ─────────── Invitation row ─────────── */

interface InvitationRowProps {
  invitation: Invitation;
  isActionPending: boolean;
  onRevoke: () => void;
  onResend: () => void;
}

function InvitationRow({ invitation, isActionPending, onRevoke, onResend }: InvitationRowProps) {
  const isExpired = invitation.status === "expired";
  const badgeClasses = isExpired
    ? "bg-red-100 text-red-700 border-red-200"
    : "bg-amber-100 text-amber-800 border-amber-200";
  const badgeLabel = isExpired ? "EXPIRED" : "PENDING";

  return (
    <div className="grid grid-cols-[1fr_160px_auto] items-center px-4 py-3.5 border-b last:border-b-0 hover:bg-muted/20 transition-colors">
      {/* Member */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm truncate">
            {invitation.name || invitation.email}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badgeClasses}`}
          >
            {badgeLabel}
          </span>
        </div>
        {invitation.name && (
          <span className="text-xs text-muted-foreground truncate pl-5">{invitation.email}</span>
        )}
      </div>

      {/* Role */}
      <div>
        <span className="text-sm">{invitation.role}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 justify-end w-36">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={isActionPending}>
              {isActionPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreVertical className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="cursor-pointer" onClick={onResend} disabled={isActionPending}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Resend
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive cursor-pointer"
              onClick={onRevoke}
              disabled={isActionPending}
            >
              <X className="mr-2 h-4 w-4" />
              Revoke
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
