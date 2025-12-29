"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";

interface DeleteColleagueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  colleague: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onUserDeleted: () => void;
}

export function DeleteColleagueDialog({ 
  isOpen, 
  onClose, 
  colleague, 
  onUserDeleted 
}: DeleteColleagueDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    // Prevent deletion of company admins and system admins
    if (colleague.role === 'COMPANY_ADMIN' || colleague.role === 'ADMIN') {
      toast({
        title: "Cannot Delete",
        description: colleague.role === 'COMPANY_ADMIN' 
          ? "Company admins cannot be removed from the system. Please contact support if you need to modify this user's access."
          : "System administrators cannot be removed from the system.",
        variant: "destructive",
      });
      onClose();
      return;
    }

    setIsDeleting(true);

    try {
      console.log('Deleting colleague:', colleague);
      const response = await fetch('/api/users/delete-colleague', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: colleague.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete colleague');
      }

      toast({
        title: "Success",
        description: `${colleague.name || colleague.email} has been removed from your company.`,
      });

      onUserDeleted();
      onClose();

    } catch (error) {
      console.error('Error deleting colleague:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete colleague",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${colleague.role === 'COMPANY_ADMIN' || colleague.role === 'ADMIN' ? 'text-yellow-600' : 'text-destructive'}`}>
            <AlertTriangle className="h-5 w-5" />
            {colleague.role === 'COMPANY_ADMIN' || colleague.role === 'ADMIN' ? 'Cannot Remove Admin' : 'Remove Team Member'}
          </DialogTitle>
          <DialogDescription>
            {colleague.role === 'COMPANY_ADMIN' 
              ? 'Company administrators are protected from deletion. Please contact support if you need to modify this user\'s access.'
              : colleague.role === 'ADMIN'
              ? 'System administrators are protected from deletion for security reasons.'
              : 'This action cannot be undone. The user will lose access to the system immediately.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {colleague.role === 'COMPANY_ADMIN' || colleague.role === 'ADMIN' ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-yellow-800 mb-2">
                    Cannot Remove {colleague.role === 'COMPANY_ADMIN' ? 'Company Admin' : 'System Admin'}
                  </h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Email:</strong> {colleague.email}</p>
                    <p><strong>Role:</strong> {colleague.role}</p>
                  </div>
                  <p className="text-sm text-yellow-700 mt-3">
                    {colleague.role === 'COMPANY_ADMIN' 
                      ? 'Company administrators cannot be removed from the system. Please contact support if you need to modify this user\'s access.'
                      : 'System administrators cannot be removed from the system for security reasons.'
                    }
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-destructive mb-2">
                    Remove {colleague.name || colleague.email}?
                  </h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Email:</strong> {colleague.email}</p>
                    <p><strong>Role:</strong> {colleague.role}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    This will permanently delete their account and revoke all access to the system.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isDeleting}
          >
            {colleague.role === 'COMPANY_ADMIN' || colleague.role === 'ADMIN' ? 'Close' : 'Cancel'}
          </Button>
          {colleague.role !== 'COMPANY_ADMIN' && colleague.role !== 'ADMIN' && (
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove User
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 