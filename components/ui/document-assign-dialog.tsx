import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DocumentCategory } from "@/lib/types/types"
import { Check } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { toast } from "@/components/ui/toast"
import { Database } from "@/lib/database.types"

interface ProjectLeader {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ProjectResponse {
  workers: string[];
  leader: ProjectLeader;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface DocumentAssignDialogProps {
  projectId: number;
  templateName: string;
  category: string;
  onAssignmentUpdate: (templateName: string, assignments: {
    assignee_id?: string;
    assignee_name?: string;
    supervisor_id?: string;
    supervisor_name?: string;
  }) => Promise<void>;
  currentAssignments?: {
    assignee_id?: string;
    assignee_name?: string;
    supervisor_id?: string;
    supervisor_name?: string;
  };
}

export function DocumentAssignDialog({ 
  projectId, 
  templateName, 
  category, 
  onAssignmentUpdate,
  currentAssignments = {}
}: DocumentAssignDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [assigneeId, setAssigneeId] = React.useState(currentAssignments.assignee_id || "")
  const [supervisorId, setSupervisorId] = React.useState(currentAssignments.supervisor_id || "")
  const [assigneeSearchResults, setAssigneeSearchResults] = React.useState<User[]>([])
  const [supervisorSearchResults, setSupervisorSearchResults] = React.useState<User[]>([])
  const [assigneeSearchValue, setAssigneeSearchValue] = React.useState("")
  const [supervisorSearchValue, setSupervisorSearchValue] = React.useState("")
  const [projectUsers, setProjectUsers] = React.useState<User[]>([])

  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch project workers and leader
  const fetchProjectUsers = React.useCallback(async () => {
    console.log('[DocumentAssignDialog] fetchProjectUsers called for projectId:', projectId)
    // TODO: Use API route for this
    try {
      // First get the project details
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select(`
          workers,
          leader:leader_id (
            id,
            name,
            email,
            role
          )
        `)
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      // Then get the workers' details
      let users: User[] = [];
      
      // Handle leader
      const projectData = project as unknown as { 
        workers: string[]; 
        leader: { id: string; name: string; email: string; role: string; } 
      };

      if (projectData && projectData.leader) {
        users.push({
          id: projectData.leader.id,
          name: projectData.leader.name,
          email: projectData.leader.email,
          role: projectData.leader.role
        });
      }

      // Handle workers
      // TODO: Use API route for this
      if (projectData && projectData.workers && projectData.workers.length > 0) {
        const { data: workers, error: workersError } = await supabase
          .from('users')
          .select('id, name, email, role')
          .in('id', projectData.workers);

        if (workersError) throw workersError;
        if (workers) {
          const mappedWorkers: User[] = workers.map(w => ({
            id: w.id,
            name: w.name,
            email: w.email,
            role: w.role
          }));
          users = [...users, ...mappedWorkers];
        }
      }

      console.log('[DocumentAssignDialog] Setting project users:', users.length)
      setProjectUsers(users);
    } catch (error) {
      console.error('Error fetching project users:', error);
      toast({
        title: "Error",
        description: "Failed to load project users",
        variant: "destructive",
      });
    }
  }, [projectId]); // Removed supabase dependency

  React.useEffect(() => {
    console.log('[DocumentAssignDialog] Dialog open state changed:', open)
    if (open) {
      console.log('[DocumentAssignDialog] Fetching project users...')
      fetchProjectUsers()
    }
  }, [open, fetchProjectUsers])

  // Filter users based on search query
  const filterUsers = (query: string) => {
    if (!query.trim()) return projectUsers
    
    return projectUsers.filter(user => 
      (user.name?.toLowerCase().includes(query.toLowerCase()) || false) ||
      (user.email?.toLowerCase().includes(query.toLowerCase()) || false)
    )
  }

  React.useEffect(() => {
    console.log('[DocumentAssignDialog] Filtering assignee results:', { assigneeSearchValue, projectUsersCount: projectUsers.length })
    const results = filterUsers(assigneeSearchValue)
    setAssigneeSearchResults(results)
    console.log('[DocumentAssignDialog] Assignee results:', results.length)
  }, [assigneeSearchValue, projectUsers])

  React.useEffect(() => {
    console.log('[DocumentAssignDialog] Filtering supervisor results:', { supervisorSearchValue, projectUsersCount: projectUsers.length })
    const results = filterUsers(supervisorSearchValue)
    setSupervisorSearchResults(results)
    console.log('[DocumentAssignDialog] Supervisor results:', results.length)
  }, [supervisorSearchValue, projectUsers])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Get the selected users' names
      const assignee = projectUsers.find(u => u.id === assigneeId);
      const supervisor = projectUsers.find(u => u.id === supervisorId);
      
      // Call the parent's assignment update function
      // name 이 null 이면 email 을 표시 이름으로 사용
      await onAssignmentUpdate(templateName, {
        assignee_id: assigneeId || undefined,
        assignee_name: assignee ? (assignee.name || assignee.email) : undefined,
        supervisor_id: supervisorId || undefined,
        supervisor_name: supervisor ? (supervisor.name || supervisor.email) : undefined,
      });
      
      setOpen(false)
    } catch (error) {
      console.error('Error updating document assignments:', error)
      toast({
        title: "Error",
        description: "Failed to update document assignments",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        console.log('[DocumentAssignDialog] onOpenChange called with:', newOpen)
        setOpen(newOpen)
      }}
    >
      <DialogTrigger asChild>
        <DropdownMenuItem 
          className="text-white-700 cursor-pointer" 
          onSelect={(e) => e.preventDefault()}
          onClick={() => setOpen(true)}
        >
          <Check className="h-4 w-4 mr-2" />
          Assign to
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign People to Document</DialogTitle>
          <DialogDescription>
            Set the responsible person and supervisor for {templateName}. Only project workers and leader can be assigned.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Responsible Person</Label>
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={assigneeSearchValue}
                onChange={(e) => setAssigneeSearchValue(e.target.value)}
              />
              {assigneeSearchResults.length > 0 && (
                <div className="border rounded-md mt-1">
                  {assigneeSearchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 hover:bg-accent cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('[DocumentAssignDialog] Assignee selected:', user.name || user.email)
                        setAssigneeId(user.id)
                        setAssigneeSearchValue(user.name || user.email)
                        console.log('[DocumentAssignDialog] Assignee ID set to:', user.id)
                      }}
                    >
                      <span>{user.name || user.email}</span>
                      {assigneeId === user.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Supervisor</Label>
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={supervisorSearchValue}
                onChange={(e) => setSupervisorSearchValue(e.target.value)}
              />
              {supervisorSearchResults.length > 0 && (
                <div className="border rounded-md mt-1">
                  {supervisorSearchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 hover:bg-accent cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('[DocumentAssignDialog] Supervisor selected:', user.name || user.email)
                        setSupervisorId(user.id)
                        setSupervisorSearchValue(user.name || user.email)
                        console.log('[DocumentAssignDialog] Supervisor ID set to:', user.id)
                      }}
                    >
                      <span>{user.name || user.email}</span>
                      {supervisorId === user.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 