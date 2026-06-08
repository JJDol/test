"use client";

import React, { Suspense } from 'react';
import { useTranslations } from "next-intl";
import ProtectedPageWrapper from "@/components/auth/protected-page-wrapper";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  FileText, 
  FolderKanban, 
  Search, 
  Users, 
  FileIcon, 
  Plus,
  Upload,
  MessageSquare,
  Settings,
  CheckCircle,
  AlertCircle,
  Info,
  Lightbulb,
  Target,
  UserCheck
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DocumentationPage() {
  return (
    <Suspense>
      <DocumentationContent />
    </Suspense>
  );
}

function DocumentationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("manual");
  const currentTab = (searchParams?.get('tab') as 'getting-started' | 'projects' | 'templates' | 'ai-search' | 'team') || 'getting-started';

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set('tab', value);
    router.replace(`/protected/documentation?${params.toString()}`);
  };

  return (
    <ProtectedPageWrapper loadingMessage={t("loadingDocumentation")}>
      <div className="container mx-auto py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">{t("title")}</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t("subtitle")}
            </p>
          </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="getting-started">{t("gettingStarted")}</TabsTrigger>
            <TabsTrigger value="projects">{t("projects")}</TabsTrigger>
            <TabsTrigger value="templates">{t("templates")}</TabsTrigger>
            <TabsTrigger value="ai-search">{t("aiAssistant")}</TabsTrigger>
            <TabsTrigger value="team">{t("teamManagement")}</TabsTrigger>
          </TabsList>

          {/* Getting Started Tab */}
          <TabsContent value="getting-started" className="mt-6">
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    {t("welcomeToAticon")}
                  </CardTitle>
                  <CardDescription>
                    {t("welcomeDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <QuickStartCard 
                      icon={<FolderKanban className="h-8 w-8" />}
                      title={t("manageProjects")}
                      description={t("manageProjectsDescription")}
                      features={[t("projectTimelines"), t("teamAssignments"), t("progressTracking")]}
                    />
                    <QuickStartCard 
                      icon={<FileIcon className="h-8 w-8" />}
                      title={t("generateDocuments")}
                      description={t("generateDocumentsDescription")}
                      features={[t("preBuiltTemplates"), t("customVariables"), t("instantGeneration")]}
                    />
                    <QuickStartCard 
                      icon={<MessageSquare className="h-8 w-8" />}
                      title={t("aiAssistantTitle")}
                      description={t("aiAssistantDescription")}
                      features={[t("danishBR18"), t("projectContext"), t("smartSearch")]}
                    />
                    <QuickStartCard 
                      icon={<Users className="h-8 w-8" />}
                      title={t("teamCollaboration")}
                      description={t("teamCollaborationDescription")}
                      features={[t("roleBasedAccess"), t("taskAssignments"), t("progressUpdates")]}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("quickSetupChecklist")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <ChecklistItem 
                      icon={<UserCheck className="h-4 w-4" />}
                      title={t("completeProfile")}
                      description={t("completeProfileDescription")}
                    />
                    <ChecklistItem 
                      icon={<Users className="h-4 w-4" />}
                      title={t("inviteTeamMembers")}
                      description={t("inviteTeamMembersDescription")}
                    />
                    <ChecklistItem 
                      icon={<FolderKanban className="h-4 w-4" />}
                      title={t("createFirstProject")}
                      description={t("createFirstProjectDescription")}
                    />
                    <ChecklistItem 
                      icon={<FileIcon className="h-4 w-4" />}
                      title={t("exploreTemplates")}
                      description={t("exploreTemplatesDescription")}
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
                    {t("projectManagement")}
                  </CardTitle>
                  <CardDescription>
                    {t("projectManagementDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <StepSection
                      title={t("creatingNewProject")}
                      icon={<Plus className="h-5 w-5" />}
                      steps={[t("creatingStep1"), t("creatingStep2"), t("creatingStep3"), t("creatingStep4"), t("creatingStep5"), t("creatingStep6")]}
                      tipLabel={t("tip")}
                      tip={t("creatingTip")}
                    />

                    <StepSection
                      title={t("managingProgress")}
                      icon={<Target className="h-5 w-5" />}
                      steps={[t("managingStep1"), t("managingStep2"), t("managingStep3"), t("managingStep4"), t("managingStep5")]}
                      tipLabel={t("tip")}
                      tip={t("managingTip")}
                    />

                    <StepSection
                      title={t("workingWithVariables")}
                      icon={<Settings className="h-5 w-5" />}
                      steps={[t("variablesStep1"), t("variablesStep2"), t("variablesStep3"), t("variablesStep4"), t("variablesStep5")]}
                      tipLabel={t("tip")}
                      tip={t("variablesTip")}
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
                    {t("documentTemplates")}
                  </CardTitle>
                  <CardDescription>
                    {t("documentTemplatesDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <TemplateCategory 
                        title={t("architecture")}
                        description={t("architectureDescription")}
                        count={t("nTemplates", { count: 12 })}
                        color="bg-blue-100 text-blue-700"
                      />
                      <TemplateCategory 
                        title={t("constructions")}
                        description={t("constructionsDescription")}
                        count={t("nTemplates", { count: 8 })}
                        color="bg-orange-100 text-orange-700"
                      />
                      <TemplateCategory 
                        title={t("fireSafety")}
                        description={t("fireSafetyDescription")}
                        count={t("nTemplates", { count: 6 })}
                        color="bg-red-100 text-red-700"
                      />
                      <TemplateCategory 
                        title={t("authorityProcessing")}
                        description={t("authorityProcessingDescription")}
                        count={t("nTemplates", { count: 4 })}
                        color="bg-purple-100 text-purple-700"
                      />
                      <TemplateCategory 
                        title={t("energy")}
                        description={t("energyDescription")}
                        count={t("nTemplates", { count: 7 })}
                        color="bg-yellow-100 text-yellow-700"
                      />
                      <TemplateCategory 
                        title={t("hvac")}
                        description={t("hvacDescription")}
                        count={t("nTemplates", { count: 10 })}
                        color="bg-green-100 text-green-700"
                      />
                      <TemplateCategory 
                        title={t("executionControl")}
                        description={t("executionControlDescription")}
                        count={t("nTemplates", { count: 5 })}
                        color="bg-indigo-100 text-indigo-700"
                      />
                    </div>

                    <StepSection
                      title={t("usingTemplates")}
                      icon={<FileText className="h-5 w-5" />}
                      steps={[t("usingTemplatesStep1"), t("usingTemplatesStep2"), t("usingTemplatesStep3"), t("usingTemplatesStep4"), t("usingTemplatesStep5"), t("usingTemplatesStep6")]}
                      tipLabel={t("tip")}
                      tip={t("usingTemplatesTip")}
                    />

                    <StepSection
                      title={t("managingTemplateVariables")}
                      icon={<Settings className="h-5 w-5" />}
                      steps={[t("templateVariablesStep1"), t("templateVariablesStep2"), t("templateVariablesStep3"), t("templateVariablesStep4"), t("templateVariablesStep5")]}
                      tipLabel={t("tip")}
                      tip={t("templateVariablesTip")}
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
                    {t("aiAssistant")}
                  </CardTitle>
                  <CardDescription>
                    {t("aiAssistantPageDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <AIFeatureCard 
                        icon={<Search className="h-6 w-6" />}
                        title={t("smartSearchTitle")}
                        description={t("smartSearchDescription")}
                      />
                      <AIFeatureCard 
                        icon={<BookOpen className="h-6 w-6" />}
                        title={t("br18Regulations")}
                        description={t("br18RegulationsDescription")}
                      />
                      <AIFeatureCard 
                        icon={<Target className="h-6 w-6" />}
                        title={t("projectContextTitle")}
                        description={t("projectContextDescription")}
                      />
                    </div>

                    <StepSection
                      title={t("usingAIAssistant")}
                      icon={<MessageSquare className="h-5 w-5" />}
                      steps={[t("aiStep1"), t("aiStep2"), t("aiStep3"), t("aiStep4"), t("aiStep5"), t("aiStep6")]}
                      tipLabel={t("tip")}
                      tip={t("aiTip")}
                    />

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        {t("exampleQuestions")}
                      </h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• {t("exampleQ1")}</li>
                        <li>• {t("exampleQ2")}</li>
                        <li>• {t("exampleQ3")}</li>
                        <li>• {t("exampleQ4")}</li>
                      </ul>
                    </div>

                    <StepSection
                      title={t("uploadingDocuments")}
                      icon={<Upload className="h-5 w-5" />}
                      steps={[t("uploadStep1"), t("uploadStep2"), t("uploadStep3"), t("uploadStep4"), t("uploadStep5"), t("uploadStep6")]}
                      tipLabel={t("tip")}
                      tip={t("uploadTip")}
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
                    {t("teamManagement")}
                  </CardTitle>
                  <CardDescription>
                    {t("teamManagementDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <RoleCard 
                        title={t("admin")}
                        description={t("adminDescription")}
                        permissions={[t("adminPerm1"), t("adminPerm2"), t("adminPerm3"), t("adminPerm4")]}
                        color="bg-purple-100 text-purple-700"
                      />
                      <RoleCard 
                        title={t("companyAdmin")}
                        description={t("companyAdminDescription")}
                        permissions={[t("companyAdminPerm1"), t("companyAdminPerm2"), t("companyAdminPerm3"), t("companyAdminPerm4")]}
                        color="bg-blue-100 text-blue-700"
                      />
                      <RoleCard 
                        title={t("projectManager")}
                        description={t("projectManagerDescription")}
                        permissions={[t("projectManagerPerm1"), t("projectManagerPerm2"), t("projectManagerPerm3"), t("projectManagerPerm4")]}
                        color="bg-green-100 text-green-700"
                      />
                      <RoleCard 
                        title={t("user")}
                        description={t("userDescription")}
                        permissions={[t("userPerm1"), t("userPerm2"), t("userPerm3"), t("userPerm4")]}
                        color="bg-gray-100 text-gray-700"
                      />
                    </div>

                    <StepSection
                      title={t("addingTeamMembers")}
                      icon={<Users className="h-5 w-5" />}
                      steps={[t("addTeamStep1"), t("addTeamStep2"), t("addTeamStep3"), t("addTeamStep4"), t("addTeamStep5"), t("addTeamStep6")]}
                      tipLabel={t("tip")}
                      tip={t("addTeamTip")}
                    />

                    <StepSection
                      title={t("projectAssignments")}
                      icon={<Target className="h-5 w-5" />}
                      steps={[t("assignStep1"), t("assignStep2"), t("assignStep3"), t("assignStep4"), t("assignStep5"), t("assignStep6")]}
                      tipLabel={t("tip")}
                      tip={t("assignTip")}
                    />

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {t("bestPractices")}
                      </h4>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        <li>• {t("bestPractice1")}</li>
                        <li>• {t("bestPractice2")}</li>
                        <li>• {t("bestPractice3")}</li>
                        <li>• {t("bestPractice4")}</li>
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
              {t("needMoreHelp")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <HelpCard 
                icon={<MessageSquare className="h-6 w-6" />}
                title={t("contactSupport")}
                description={t("contactSupportDescription")}
              />
              <HelpCard 
                icon={<BookOpen className="h-6 w-6" />}
                title={t("trainingResources")}
                description={t("trainingResourcesDescription")}
              />
              <HelpCard 
                icon={<Users className="h-6 w-6" />}
                title={t("communityForum")}
                description={t("communityForumDescription")}
              />
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </ProtectedPageWrapper>
  );
}

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

function StepSection({ title, icon, steps, tip, tipLabel }: { 
  title: string; 
  icon: React.ReactNode; 
  steps: string[];
  tip?: string;
  tipLabel?: string;
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
            <span className="font-medium">💡 {tipLabel ?? "Tip:"}</span> {tip}
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
