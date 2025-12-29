/**
 * 🏢 Document Delete Dialog - Reusable Delete Confirmation Component
 * 
 * PURPOSE: Standardized delete confirmation dialog
 * - Clear warning about permanent deletion
 * - Special handling for public documents
 * - Loading state during deletion
 * - Reusable across different document contexts
 */

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2, AlertCircle, Loader2 } from 'lucide-react';

interface DocumentMetadata {
  id: string;
  name: string;
  company_id: string;
}

interface DocumentDeleteDialogProps {
  open: boolean;
  document: DocumentMetadata | null;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DocumentDeleteDialog({
  open,
  document,
  isDeleting = false,
  onConfirm,
  onCancel
}: DocumentDeleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Delete Document
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{document?.name}"? This action cannot be undone.
            {document?.company_id === 'public' && (
              <span className="block mt-2 text-amber-600 font-medium">
                ⚠️ This is a public document. Deleting it will affect all users.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="text-sm text-red-700">
                <p className="font-medium mb-1">This will permanently remove:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>The document from your knowledge base</li>
                  <li>All associated text chunks and embeddings</li>
                  <li>Any AI responses that reference this document</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={isDeleting || !document}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Document
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
