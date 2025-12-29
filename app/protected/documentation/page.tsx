"use client";

import React from 'react';
import ProtectedPageWrapper from "@/components/auth/protected-page-wrapper";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  FileText, 
  FolderKanban, 
  Search, 
  Users, 
  FileIcon, 
  Plus,
  Download,
  Upload,
  MessageSquare,
  Settings,
  CheckCircle,
  AlertCircle,
  Info,
  Lightbulb,
  Target,
  Clock,
  UserCheck
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DocumentationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = (searchParams?.get('tab') as 'getting-started' | 'projects' | 'templates' | 'ai-search' | 'team') || 'getting-started';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('tab', value);
    router.replace(`/protected/documentation?${params.toString()}`);
  };

  return (
    <ProtectedPageWrapper loadingMessage="Loading documentation...">
      <div className="container mx-auto py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">User Manual</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Everything you need to know to effectively use Aticon for managing your architecture and construction projects
            </p>
          </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="ai-search">AI Assistant</TabsTrigger>
            <TabsTrigger value="team">Team Management</TabsTrigger>
          </TabsList>

          {/* Getting Started Tab */}
          <TabsContent value="getting-started" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Welcome to Aticon
                  </CardTitle>
                  <CardDescription>
                    Your complete platform for managing construction and architecture projects
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <QuickStartCard 
                      icon={<FolderKanban className="h-8 w-8" />}
                      title="Manage Projects"
                      description="Create, organize, and track your construction and architecture projects from start to finish"
                      features={["Project timelines", "Team assignments", "Progress tracking"]}
                    />
                    <QuickStartCard 
                      icon={<FileIcon className="h-8 w-8" />}
                      title="Generate Documents"
                      description="Use professional templates to create consistent, high-quality project documents"
                      features={["Pre-built templates", "Custom variables", "Instant generation"]}
                    />
                    <QuickStartCard 
                      icon={<MessageSquare className="h-8 w-8" />}
                      title="AI Assistant"
                      description="Get instant answers about building regulations and project requirements"
                      features={["Danish BR18 regulations", "Project context", "Smart search"]}
                    />
                    <QuickStartCard 
                      icon={<Users className="h-8 w-8" />}
                      title="Team Collaboration"
                      description="Work together with your team members and manage permissions"
                      features={["Role-based access", "Task assignments", "Progress updates"]}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Setup Checklist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <ChecklistItem 
                      icon={<UserCheck className="h-4 w-4" />}
                      title="Complete your profile"
                      description="Add your name and company information"
                    />
                    <ChecklistItem 
                      icon={<Users className="h-4 w-4" />}
                      title="Invite team members"
                      description="Add colleagues to your company workspace"
                    />
                    <ChecklistItem 
                      icon={<FolderKanban className="h-4 w-4" />}
                      title="Create your first project"
                      description="Set up a project to start organizing your work"
                    />
                    <ChecklistItem 
                      icon={<FileIcon className="h-4 w-4" />}
                      title="Explore templates"
                      description="Browse available document templates for your projects"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5" />
                    Project Management
                  </CardTitle>
                  <CardDescription>
                    Create, organize, and track your construction and architecture projects
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <StepSection
                      title="Creating a New Project"
                      icon={<Plus className="h-5 w-5" />}
                      steps={[
                        "Navigate to the Dashboard and click 'Create New Project'",
                        "Enter project details: name, location, client information",
                        "Set project deadline and select the project stage",
                        "Assign a project leader from your team",
                        "Choose which document templates you'll need",
                        "Save the project to start working"
                      ]}
                      tip="Choose templates carefully - you can always add more later, but it's easier to select them upfront."
                    />

                    <StepSection
                      title="Managing Project Progress"
                      icon={<Target className="h-5 w-5" />}
                      steps={[
                        "Use the Kanban board to track project stages: To Do, In Progress, Review, Done",
                        "Update project status as work progresses",
                        "Assign specific documents to team members",
                        "Monitor deadlines and progress on the dashboard",
                        "Archive completed projects to keep your workspace organized"
                      ]}
                      tip="Regular status updates help keep everyone on the same page and ensure deadlines are met."
                    />

                    <StepSection
                      title="Working with Project Variables"
                      icon={<Settings className="h-5 w-5" />}
                      steps={[
                        "Access project variables from the project detail page",
                        "Fill in general variables that apply to all documents (client name, address, etc.)",
                        "Set specific variables for individual templates",
                        "Use the 'General Variables' tab to manage shared information",
                        "Generate documents with pre-filled project information"
                      ]}
                      tip="Setting up general variables saves time when generating multiple documents for the same project."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileIcon className="h-5 w-5" />
                    Document Templates
                  </CardTitle>
                  <CardDescription>
                    Professional templates for all your project documentation needs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <TemplateCategory 
                        title="Architecture"
                        description="Building design and planning documents"
                        count="12 templates"
                        color="bg-blue-100 text-blue-700"
                      />
                      <TemplateCategory 
                        title="Constructions"
                        description="Construction planning and execution"
                        count="8 templates"
                        color="bg-orange-100 text-orange-700"
                      />
                      <TemplateCategory 
                        title="Fire Safety"
                        description="Fire safety plans and documentation"
                        count="6 templates"
                        color="bg-red-100 text-red-700"
                      />
                      <TemplateCategory 
                        title="Authority Processing"
                        description="Municipal and authority documentation"
                        count="4 templates"
                        color="bg-purple-100 text-purple-700"
                      />
                      <TemplateCategory 
                        title="Energy"
                        description="Energy efficiency and sustainability"
                        count="7 templates"
                        color="bg-yellow-100 text-yellow-700"
                      />
                      <TemplateCategory 
                        title="HVAC"
                        description="Heating, ventilation, and air conditioning"
                        count="10 templates"
                        color="bg-green-100 text-green-700"
                      />
                      <TemplateCategory 
                        title="Execution Control"
                        description="Quality control and execution monitoring"
                        count="5 templates"
                        color="bg-indigo-100 text-indigo-700"
                      />
                    </div>

                    <StepSection
                      title="Using Templates"
                      icon={<FileText className="h-5 w-5" />}
                      steps={[
                        "Browse templates by category or search by name",
                        "Select a template that matches your project needs",
                        "Review the required variables and information needed",
                        "Fill in project-specific information in the variable fields",
                        "Generate the document and download or save to your project",
                        "Edit the generated document as needed for your specific requirements"
                      ]}
                      tip="Templates are designed to be starting points - feel free to customize the generated documents for your specific needs."
                    />

                    <StepSection
                      title="Managing Template Variables"
                      icon={<Settings className="h-5 w-5" />}
                      steps={[
                        "Each template has predefined variables (placeholders for information)",
                        "Variables can be text, numbers, dates, or even images",
                        "Some variables are marked as 'general' and can be shared across templates",
                        "Fill in variables at the project level to speed up document generation",
                        "Use the Enhanced Variables tab to see all variables across templates"
                      ]}
                      tip="Setting up project-level variables once saves time when generating multiple documents."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Search Tab */}
          <TabsContent value="ai-search" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    AI Assistant
                  </CardTitle>
                  <CardDescription>
                    Get instant answers about building regulations, project requirements, and uploaded documents
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <AIFeatureCard 
                        icon={<Search className="h-6 w-6" />}
                        title="Smart Search"
                        description="Ask questions in natural language and get relevant answers from your documents"
                      />
                      <AIFeatureCard 
                        icon={<BookOpen className="h-6 w-6" />}
                        title="BR18 Regulations"
                        description="Access Danish building regulations with instant explanations and references"
                      />
                      <AIFeatureCard 
                        icon={<Target className="h-6 w-6" />}
                        title="Project Context"
                        description="Get answers specific to your current projects and their requirements"
                      />
                    </div>

                    <StepSection
                      title="Using the AI Assistant"
                      icon={<MessageSquare className="h-5 w-5" />}
                      steps={[
                        "Navigate to the 'Semantic Engine' section",
                        "Type your question in natural language (e.g., 'What are the fire safety requirements for office buildings?')",
                        "The AI will search through building regulations and your uploaded documents",
                        "Review the answer and check the source references provided",
                        "Click on source links to view the original documents",
                        "Start a new chat for different topics or continue the conversation"
                      ]}
                      tip="Be specific in your questions for better results. Include context like building type, location, or specific requirements."
                    />

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Example Questions
                      </h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• "What are the minimum ceiling heights for residential buildings?"</li>
                        <li>• "Show me fire safety requirements for this project"</li>
                        <li>• "What ventilation standards apply to office spaces?"</li>
                        <li>• "Find information about accessibility requirements"</li>
                      </ul>
                    </div>

                    <StepSection
                      title="Uploading Documents"
                      icon={<Upload className="h-5 w-5" />}
                      steps={[
                        "In the AI Assistant, click the upload button (paperclip icon)",
                        "Select PDF or Word documents from your computer",
                        "Choose whether files are temporary (deleted after session) or permanent",
                        "Wait for the documents to be processed and indexed",
                        "Ask questions about the uploaded content",
                        "Use 'New Chat' to remove temporary files and start fresh"
                      ]}
                      tip="Upload project-specific documents to get more relevant answers about your particular requirements."
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Team Management Tab */}
          <TabsContent value="team" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Management
                  </CardTitle>
                  <CardDescription>
                    Collaborate effectively with your team members and manage permissions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <RoleCard 
                        title="Admin"
                        description="Full system access and company management"
                        permissions={["Manage all projects", "Add/remove users", "System settings", "All templates"]}
                        color="bg-purple-100 text-purple-700"
                      />
                      <RoleCard 
                        title="Company Admin"
                        description="Manage company users and projects"
                        permissions={["Manage company projects", "Add/remove colleagues", "Company templates", "User roles"]}
                        color="bg-blue-100 text-blue-700"
                      />
                      <RoleCard 
                        title="Project Manager"
                        description="Lead projects and manage team assignments"
                        permissions={["Create projects", "Assign team members", "Manage documents", "Track progress"]}
                        color="bg-green-100 text-green-700"
                      />
                      <RoleCard 
                        title="User"
                        description="Work on assigned projects and documents"
                        permissions={["View assigned projects", "Generate documents", "Use AI assistant", "Update progress"]}
                        color="bg-gray-100 text-gray-700"
                      />
                    </div>

                    <StepSection
                      title="Adding Team Members"
                      icon={<Users className="h-5 w-5" />}
                      steps={[
                        "Navigate to your Profile page",
                        "Click on 'Manage Colleagues' or 'Add Team Member'",
                        "Enter the new member's email address and name",
                        "Select their role (User, Project Manager, or Company Admin)",
                        "Send the invitation - they'll receive an email to join",
                        "Once they accept, they'll appear in your team list"
                      ]}
                      tip="Start with 'User' role and upgrade permissions as needed. You can always change roles later."
                    />

                    <StepSection
                      title="Project Assignments"
                      icon={<Target className="h-5 w-5" />}
                      steps={[
                        "Open a project and go to the 'Assignments' tab",
                        "Assign specific documents to team members",
                        "Set supervisors for quality control and review",
                        "Monitor progress through the project dashboard",
                        "Team members receive notifications about their assignments",
                        "Track completion status and review submitted work"
                      ]}
                      tip="Clear assignments help ensure accountability and prevent work duplication."
                    />

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Best Practices
                      </h4>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        <li>• Assign clear roles and responsibilities from the start</li>
                        <li>• Use project leaders to coordinate team efforts</li>
                        <li>• Regular check-ins help keep projects on track</li>
                        <li>• Document assignments prevent confusion and overlap</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Need More Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <HelpCard 
                icon={<MessageSquare className="h-6 w-6" />}
                title="Contact Support"
                description="Reach out to our support team for assistance with any questions or issues"
              />
              <HelpCard 
                icon={<BookOpen className="h-6 w-6" />}
                title="Training Resources"
                description="Access additional training materials and video tutorials"
              />
              <HelpCard 
                icon={<Users className="h-6 w-6" />}
                title="Community Forum"
                description="Connect with other users and share best practices"
              />
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </ProtectedPageWrapper>
  );
}

// Helper Components
function QuickStartCard({ icon, title, description, features }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  features: string[];
}) {
  return (
    <div className="p-6 border rounded-lg bg-card hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-primary">{icon}</div>
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      <p className="text-muted-foreground mb-4">{description}</p>
      <ul className="space-y-1">
        {features.map((feature, index) => (
          <li key={index} className="text-sm flex items-center gap-2">
            <CheckCircle className="h-3 w-3 text-green-500" />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChecklistItem({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <div className="text-primary mt-0.5">{icon}</div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function StepSection({ title, icon, steps, tip }: { 
  title: string; 
  icon: React.ReactNode; 
  steps: string[];
  tip?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="text-primary">{icon}</div>
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <ol className="list-decimal list-inside space-y-2 mb-4">
        {steps.map((step, index) => (
          <li key={index} className="text-sm">{step}</li>
        ))}
      </ol>
      {tip && (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <span className="font-medium">💡 Tip:</span> {tip}
          </p>
        </div>
      )}
    </div>
  );
}

function TemplateCategory({ title, description, count, color }: { 
  title: string; 
  description: string; 
  count: string;
  color: string;
}) {
  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${color}`}>
        {count}
      </div>
      <h3 className="font-medium mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function AIFeatureCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="p-4 border rounded-lg bg-card text-center">
      <div className="text-primary mb-2 flex justify-center">{icon}</div>
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function RoleCard({ title, description, permissions, color }: { 
  title: string; 
  description: string; 
  permissions: string[];
  color: string;
}) {
  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${color}`}>
        {title}
      </div>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <ul className="space-y-1">
        {permissions.map((permission, index) => (
          <li key={index} className="text-xs flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            {permission}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HelpCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow cursor-pointer">
      <div className="text-primary mb-2">{icon}</div>
      <h3 className="font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
