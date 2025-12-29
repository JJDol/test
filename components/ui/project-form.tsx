"use client";

/**
 * ProjectForm - Modal dialog for creating new projects with template selection
 * 
 * Features:
 * - Basic project information (name, location, deadline, assigned user)
 * - Project template selection by document category (ARCHITECTURE, STRUCTURAL, etc.)
 * - Subscription limit validation with user-friendly error handling
 * - Background data loading with non-blocking UI
 * - Form state management with automatic reset on close/success
 * 
 * Future Improvements:
 * - Extract form field patterns into reusable FormField component
 * - Consolidate error handling into custom useErrorHandling hook
 * - Create useApi hook for consistent API call patterns
 * - Add form validation with react-hook-form or similar
 * - Implement optimistic updates for better UX
 * - Add keyboard shortcuts (Ctrl+Enter to submit, Esc to close)
 * - Consider useReducer for complex state management
 * - Add loading skeletons for better perceived performance
 * - Extract subscription logic into custom hook
 * 
 * @param onProjectCreated - Callback fired when project is successfully created
 */
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentCategory, getCategoryDisplayName } from "@/lib/types/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ChevronDown } from "lucide-react";
import { CategoryTabsList } from "./category-tabs-list";
import { ProjectTemplateDropdown } from "./project-template-dropdown";
import SubscriptionLimitDialog from "./subscription-limit-dialog";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface ProjectFormProps {
  onProjectCreated: () => void;
}

interface ProjectTemplate {
  name: string;
  category: DocumentCategory;
  description: string | null;
  variables: string[];
}

interface SubscriptionUsage {
  usage: {
    current_projects: number;
  };
  limits: {
    max_projects: number;
  };
  company: {
    name: string;
  };
}

export function ProjectForm({ onProjectCreated }: ProjectFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [useTemplates, setUseTemplates] = useState(false);
  const [projectTemplates, setProjectTemplates] = useState<ProjectTemplate[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<{ [key in DocumentCategory]?: string }>({});
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);
  
  // Subscription limit dialog state
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [subscriptionUsage, setSubscriptionUsage] = useState<SubscriptionUsage | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Use our new API route to fetch all form data in one request
      const response = await fetch('/api/projects/form-data');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch form data');
      }
      
      const data = await response.json();
      
      // Set the data
      setUsers(data.users || []);
      setProjectTemplates(data.templates || []);
      
    } catch (error) {
      console.error('Error in fetchData:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSubscriptionUsage = async () => {
    try {
      const response = await fetch('/api/subscription/usage');
      if (response.ok) {
        const data = await response.json();
        setSubscriptionUsage(data);
      }
    } catch (error) {
      console.error('Error fetching subscription usage:', error);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);


  const resetForm = () => {
    setError(null);
    setSelectedUserId("");
    setUseTemplates(false);
    setSelectedTemplates({});
    setIsLoading(false);
    setIsSubmitting(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const projectData = {
      name: formData.get("name"),
      location: formData.get("location"),
      deadline: formData.get("deadline"),
      assignedTo: selectedUserId,
      selectedTemplates: useTemplates ? selectedTemplates : null,
    };

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(projectData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle subscription limit errors specifically
        if (response.status === 402 && responseData.type === 'subscription_limit') {
          // Fetch subscription usage data and show the dialog
          await fetchSubscriptionUsage();
          setShowLimitDialog(true);
          return;
        }
        throw new Error(responseData.error || responseData.message || "Failed to create project");
      }

      resetForm();
      setOpen(false);
      onProjectCreated();
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button className="default" size="lg">
            + New Project
          </Button>
        </DialogTrigger>
        <DialogContent 
          className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Please fill out the form below to create a new project.
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
              <Button 
                onClick={fetchData} 
                variant="outline" 
                size="sm" 
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Project Information */}
              <div className="grid grid-cols-2 gap-4">
                {isLoading && (
                  <div className="col-span-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-sm text-blue-700">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span>Form data is loading in the background...</span>
                    </div>
                  </div>
                )}
                <div className="grid w-full items-center gap-2">
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter project name"
                    required
                  />
                </div>
                <div className="grid w-full items-center gap-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    placeholder="Enter project location"
                    required
                  />
                </div>
                <div className="grid w-full items-center gap-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input
                    id="deadline"
                    name="deadline"
                    type="date"
                    required
                  />
                </div>
                <div className="grid w-full items-center gap-2">
                  <Label htmlFor="assignedTo">Project Leader</Label>
                  <Select value={selectedUserId} onValueChange={setSelectedUserId} required>
                    <SelectTrigger className="flex items-center justify-between">
                      <SelectValue placeholder="Select a user" />
                      <ChevronDown className="h-4 w-4 text-muted-foreground ml-2" />
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
              </div>

              {/* Template Selection */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="use-templates" className="text-lg font-semibold">Project Templates</Label>
                  <Switch
                    id="use-templates"
                    checked={useTemplates}
                    onCheckedChange={setUseTemplates}
                  />
                </div>
                {/* The categories are split into two rows for better visual organization:
                The first TabsList displays the first 4 categories, and the second TabsList displays the remaining categories.
                This helps prevent overcrowding and keeps the UI clean and easy to navigate. 
                This has to be adapted if we add more categories.*/}
                {useTemplates && (
                  <div className="mt-4">
                    <Tabs defaultValue="ARCHITECTURE" className="w-full">
                      <div className="flex flex-col space-y-4">
                        <CategoryTabsList 
                          categories={Object.values(DocumentCategory).slice(0, 4)}
                          selectedTemplates={selectedTemplates}
                          gridCols={4}
                        />
                        <CategoryTabsList 
                          categories={Object.values(DocumentCategory).slice(4)}
                          selectedTemplates={selectedTemplates}
                          gridCols={3}
                        />
                      </div>

                      {Object.values(DocumentCategory).map((category) => (
                        <TabsContent key={category} value={category} className="mt-4">
                          <div className="grid gap-2">
                            <div className="flex gap-2">
                              <div className="flex-1">
                                <ProjectTemplateDropdown
                                  category={category}
                                  selectedTemplate={selectedTemplates[category]}
                                  projectTemplates={projectTemplates}
                                  onTemplateSelect={(templateName) => 
                                    setSelectedTemplates(prev => ({
                                      ...prev,
                                      [category]: templateName
                                    }))
                                  }
                                  onTemplateClear={() => 
                                    setSelectedTemplates(prev => {
                                      const updated = {...prev};
                                      delete updated[category];
                                      return updated;
                                    })
                                  }
                                />
                              </div>
                            </div>
                            {selectedTemplates[category] && (
                              <p className="text-xs text-muted-foreground">
                                Selected: <span className="font-medium">{selectedTemplates[category]}</span>
                              </p>
                            )}
                          </div>
                        </TabsContent>
                      ))}
                      
                      {/* Summary of selected templates */}
                      <div className="mt-6 border-t pt-4">
                        <h3 className="text-sm font-medium mb-2">Selected Templates Summary:</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(selectedTemplates)
                            .filter(([_, templateName]) => templateName && templateName !== 'none')
                            .map(([category, templateName]) => (
                              <div key={category} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{category.replace(/_/g, ' ')}:</p>
                                  <p className="text-sm">{templateName}</p>
                                </div>
                                <Button 
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                                  onClick={() => {
                                    // Remove from selectedTemplates state
                                    setSelectedTemplates(prev => {
                                      const updated = {...prev};
                                      delete updated[category as DocumentCategory];
                                      return updated;
                                    });
                                  }}
                                  aria-label={`Remove ${templateName} from ${category}`}
                                >
                                  ×
                                </Button>
                              </div>
                            ))}
                        </div>
                        {Object.keys(selectedTemplates).length === 0 && (
                          <p className="text-sm text-muted-foreground">No templates selected yet</p>
                        )}
                      </div>
                    </Tabs>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Project"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Subscription Limit Dialog */}
      {subscriptionUsage && (
        <SubscriptionLimitDialog
          open={showLimitDialog}
          onClose={() => setShowLimitDialog(false)}
          limitType="projects"
          currentCount={subscriptionUsage.usage.current_projects}
          maxCount={subscriptionUsage.limits.max_projects}
          companyName={subscriptionUsage.company.name}
        />
      )}
    </>
  );
} 