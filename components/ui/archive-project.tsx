"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Archive } from "lucide-react";
import { Project } from "@/lib/types/types";
import { useToast } from "@/components/ui/toast";

interface ArchiveProjectProps {
  project: Project;
  onArchived: () => void;
}

export function ArchiveProject({ project, onArchived }: ArchiveProjectProps) {
  const [open, setOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const { toast } = useToast();

  const handleArchive = async () => {
    if (!project?.id) return;
    
    setIsArchiving(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_archived: !project.is_archived
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to archive project");
      }

      onArchived();
      setOpen(false);
      toast({
        title: project.is_archived ? "Project Unarchived" : "Project Archived",
        description: `The project has been ${project.is_archived ? 'unarchived' : 'archived'} successfully.`,
      });
    } catch (error) {
      console.error("Error archiving project:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to archive project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsArchiving(false);
    }
  };

  // Only render the dialog if project exists
  if (!project) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <DropdownMenuItem 
        className="text-orange-600 cursor-pointer" 
        onSelect={(e) => e.preventDefault()}
        onClick={() => setOpen(true)}
      >
        <Archive className="h-4 w-4 mr-2" />
        {project.is_archived ? "Unarchive Project" : "Archive Project"}
      </DropdownMenuItem>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {project.is_archived ? "Unarchive Project" : "Archive Project"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {project.is_archived 
              ? `This will unarchive the project "${project?.name || 'Unknown'}" and make it visible again.`
              : `This will archive the project "${project?.name || 'Unknown'}". Archived projects are hidden from the main view but can be restored later.`
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleArchive} disabled={isArchiving}>
            {isArchiving 
              ? (project.is_archived ? "Unarchiving..." : "Archiving...") 
              : (project.is_archived ? "Unarchive Project" : "Archive Project")
            }
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
