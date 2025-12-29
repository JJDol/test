"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Project } from "@/lib/types/types";
import { createBrowserClient } from '@supabase/ssr';
import { Database } from "@/lib/database.types";
import { useToast } from "@/components/ui/toast";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface UpdateProjectFormProps {
  project: Project;
  onProjectUpdated: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UpdateProjectForm({ project, onProjectUpdated, open: controlledOpen, onOpenChange }: UpdateProjectFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(project.leader_id);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchUsers = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        throw new Error('Authentication error: ' + userError.message);
      }

      if (!user) {
        throw new Error('Please sign in to continue');
      }

      // First, get the current user's company_id
      // TODO: Use API route for this
      const { data: currentUserProfile, error: currentUserError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (currentUserError) {
        throw new Error('Error loading user profile: ' + currentUserError.message);
      }

      if (!currentUserProfile?.company_id) {
        throw new Error('User not assigned to a company. Please contact your administrator.');
      }

      // Fetch users from the same company only
      // TODO: Use API route for this
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, name, role')
        .eq('company_id', currentUserProfile.company_id) // 🔑 MULTI-TENANT FILTER
        .order('name');

      if (usersError) throw usersError;
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load users';
      setError(errorMessage);
      
      if (errorMessage?.toLowerCase().includes('sign in')) {
        window.location.href = '/sign-in?redirect=' + encodeURIComponent(window.location.pathname);
      }
    }
  };

  // Add useEffect to fetch users when dialog opens
  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const location = formData.get("location") as string;
    const deadline = formData.get("deadline") as string;

    try {
      // Add a safety timeout to avoid a stuck UI in case the network hangs
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort("Request timeout"), 20000);

      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          location,
          deadline,
          leader_id: selectedUserId,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update project");
      }

      onProjectUpdated();
      setOpen(false);
      toast({
        title: "Success",
        description: "Project updated successfully",
      });
    } catch (error) {
      console.error("Error updating project:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDialogContent = () => (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>Update Project</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid w-full items-center gap-2">
          <Label htmlFor="name">Project Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="Enter project name"
            defaultValue={project.name}
            required
          />
        </div>
        <div className="grid w-full items-center gap-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            placeholder="Enter project location"
            defaultValue={project.location}
            required
          />
        </div>
        <div className="grid w-full items-center gap-2">
          <Label htmlFor="deadline">Deadline</Label>
          <Input
            id="deadline"
            name="deadline"
            type="date"
            defaultValue={project.deadline?.split('T')[0]}
            required
          />
        </div>
        <div className="grid w-full items-center gap-2">
          <Label htmlFor="leader">Project Leader</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
            <SelectTrigger>
              <SelectValue placeholder="Select a user" />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{user.name || user.email}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {user.role.replace('_', ' ')}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Project"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );

  // If controlled (open prop provided), render only dialog content
  if (controlledOpen !== undefined) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {renderDialogContent()}
      </Dialog>
    );
  }

  // If not controlled, render with trigger
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem className="text-white-700 cursor-pointer" onSelect={(e) => e.preventDefault()}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Project
        </DropdownMenuItem>
      </DialogTrigger>
      {renderDialogContent()}
    </Dialog>
  );
} 