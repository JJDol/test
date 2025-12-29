import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface SessionDialogProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

/**
 * Session Dialog Component
 * 
 * PURPOSE: Displays session-related information to users
 * - Shows session timeout messages
 * - Informs users about authentication requirements
 * - Provides clear next steps for users
 * 
 * RESPONSIBILITIES:
 * - Dialog display and styling
 * - User interaction handling
 * - Consistent dialog appearance
 */
export function SessionDialog({ open, title, message, onClose }: SessionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Button onClick={onClose} className="w-full">
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
