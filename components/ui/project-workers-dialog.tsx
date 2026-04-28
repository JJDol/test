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

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/components/ui/toast";
import { Users, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  discipline?: string | null;
}

interface ProjectWorkersDialogProps {
  projectId: number;
  currentWorkers: string[];
  onWorkersUpdated: () => void;
  leaderId: string;
}

export function ProjectWorkersDialog({ 
  projectId, 
  currentWorkers, 
  onWorkersUpdated,
  leaderId 
}: ProjectWorkersDialogProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>(currentWorkers);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchUsers = async () => {
    try {
      console.log('Fetching users via API route');
      
      const response = await fetch('/api/users/company-users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch users');
      }

      const usersData = result.users;
      console.log('Raw users data:', usersData);

      if (!usersData || usersData.length === 0) {
        console.log('No users found in the company');
        toast({
          title: "Info",
          description: "No users found in your company. Please make sure users have been added.",
        });
        return;
      }

      // Filter out the leader from the available users
      const filteredUsers = (usersData || []).filter((user: User) => user.id !== leaderId);
      console.log('Filtered users:', filteredUsers);
      console.log('Leader ID being filtered:', leaderId);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      if (errorMessage?.toLowerCase().includes('sign in')) {
        window.location.href = '/sign-in?redirect=' + encodeURIComponent(window.location.pathname);
      }
    }
  };

  useEffect(() => {
    if (open) {
      fetchUsers();
      // Filter out the leader from the current workers
      const filteredWorkers = currentWorkers.filter(id => id !== leaderId);
      setSelectedUsers(filteredWorkers);
      setSearchQuery("");
    }
  }, [open, currentWorkers, leaderId]);

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workers: selectedUsers }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update project workers');
      }

      toast({
        title: "Success",
        description: "Project workers updated successfully",
      });
      onWorkersUpdated();
      setOpen(false);
    } catch (error) {
      console.error('Error updating project workers:', error);
      toast({
        title: "Error",
        description: "Failed to update project workers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort users into assigned and unassigned
  const assignedUsers = users.filter(user => selectedUsers.includes(user.id));
  const unassignedUsers = users.filter(user => !selectedUsers.includes(user.id));
  
  // Filter unassigned users based on search query
  const filteredUnassignedUsers = unassignedUsers.filter(user => 
    (user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
    (user.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem 
          className="text-white-700 cursor-pointer" 
          onSelect={(e) => e.preventDefault()}
          onClick={() => setOpen(true)}
        >
          <Users className="h-4 w-4 mr-2" />
          Manage Workers
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Project Workers</DialogTitle>
        </DialogHeader>
        
        {/* Assigned Workers Section */}
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Assigned Workers</h3>
          <ScrollArea className="h-[150px] pr-4 border rounded-md p-2">
            <div className="space-y-2">
              {assignedUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`assigned-${user.id}`}
                    checked={true}
                    onCheckedChange={() => handleUserToggle(user.id)}
                  />
                  <Label htmlFor={`assigned-${user.id}`} className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{user.name || user.email}</span>
                      {user.discipline ? (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {user.discipline}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </Label>
                </div>
              ))}
              {assignedUsers.length === 0 && (
                <div className="text-sm text-gray-500 p-2">No workers assigned</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Search and Unassigned Workers Section */}
        <div>
          <h3 className="text-sm font-medium mb-2">Add Workers</h3>
          <div className="relative mb-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search workers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <ScrollArea className="h-[200px] pr-4 border rounded-md p-2">
            <div className="space-y-2">
              {filteredUnassignedUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`unassigned-${user.id}`}
                    checked={false}
                    onCheckedChange={() => handleUserToggle(user.id)}
                  />
                  <Label htmlFor={`unassigned-${user.id}`} className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{user.name || user.email}</span>
                      {user.discipline ? (
                        <Badge variant="secondary" className="text-xs font-normal">
                          {user.discipline}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </Label>
                </div>
              ))}
              {filteredUnassignedUsers.length === 0 && (
                <div className="text-sm text-gray-500 p-2">
                  {searchQuery ? "No matching workers found" : "No available workers"}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 