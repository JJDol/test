"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/ui/loading-state";
import { AddColleagueForm } from "@/components/ui/add-colleague-form";
import { DeleteColleagueDialog } from "@/components/ui/delete-colleague-dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import type { Colleague } from "@/hooks/use-colleagues";

interface ColleaguesManagementProps {
  colleagues: Colleague[];
  isLoading: boolean;
  error: string | null;
  currentUserId: string;
  onColleagueAdded: () => void;
  canDeleteColleague: (colleague: Colleague, currentUserId: string) => boolean;
  getDeletionBlockReason: (colleague: Colleague, currentUserId: string) => string | null;
}

export function ColleaguesManagement({
  colleagues,
  isLoading,
  error,
  currentUserId,
  onColleagueAdded,
  canDeleteColleague,
  getDeletionBlockReason,
}: ColleaguesManagementProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [colleagueToDelete, setColleagueToDelete] = useState<Colleague | null>(null);

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

  return (
    <>
      <Card>
        {renderHeader()}
        <CardContent>
          {colleagues.length > 0 ? (
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
