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
import { Trash2 } from "lucide-react";
import { Project } from "@/lib/types/types";
import { useToast } from "@/components/ui/toast";

interface DeleteProjectProps {
  project: Project;
  onDeleted: () => void;
}

export function DeleteProject({ project, onDeleted }: DeleteProjectProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!project?.id) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete project");
      }

      onDeleted();
      setOpen(false);
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Only render the dialog if project exists
  if (!project) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <DropdownMenuItem 
        className="text-red-700 cursor-pointer" 
        onSelect={(e) => e.preventDefault()}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete Project
      </DropdownMenuItem>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            project "{project?.name || 'Unknown'}" and all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Delete Project"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 