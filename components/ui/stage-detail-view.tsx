"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentCategory, Project, ProjectStage } from "@/lib/types/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, FileText, Calendar, Image, Building2, User, Clock, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";


interface StageDetailViewProps {
  stage: ProjectStage;
  projects: Project[];
  onBackToKanban: () => void;
  onClearFilters?: () => void;
}

interface DocumentProgress {
  templateName: string;
  progress: number;
  assignee?: string;
  supervisor?: string;
  lastUpdated?: string;
}

export function StageDetailView({ stage, projects, onBackToKanban, onClearFilters }: StageDetailViewProps) {
  const router = useRouter();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const getStageDisplayName = (stage: ProjectStage) => {
    return stage.replace("_", " ");
  };

  const getDocumentProgress = (project: Project): DocumentProgress[] => {
    const templateVars = project.template_variables;
    const documentProgress: DocumentProgress[] = [];

    const categories  = Object.values(DocumentCategory);
    
    // Iterate through each category
    categories.forEach((category: DocumentCategory) => {
      // Iterate through each template in the category
      Object.entries(templateVars?.[category] || {}).forEach(([templateName, templateData]) => {
        let completedFields = 0;
        let totalFields = 0;
        
        if (templateData?.variables) {
          templateData.variables.forEach((variable) => {
            totalFields++;
            if (variable.value && variable.value !== null && variable.value !== undefined) {
              completedFields++;
            }
          });
        }
        
        const progress = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
        
        documentProgress.push({
          templateName: templateName,
          progress: progress,
          assignee: project.leader?.name || project.leader?.email || 'Unassigned',
          supervisor: 'Project Manager', // TODO: Replace with real supervisor data
          lastUpdated: project.updated_at || project.created_at || new Date().toLocaleDateString()
        });
      });
    });
    
    return documentProgress;
  };

  const handleViewProject = (projectId: string) => {
    setLoadingProjectId(projectId);
    router.push(`/protected/dashboard/project/${projectId}`);
  };

  const getVariableCounts = (project: Project) => {
    const templateVars = project.template_variables || {};
    
    let textCount = 0;
    let dateCount = 0;
    let imageCount = 0;
    let totalFields = 0;
    let completedFields = 0;
    
    // Iterate through each document template
    Object.values(templateVars).forEach((docTemplate: any) => {
      if (typeof docTemplate === 'object' && docTemplate !== null) {
        // Count each field in the document template
        Object.values(docTemplate).forEach((field: any) => {
          totalFields++;
          
          if (typeof field === 'object' && field !== null && field.type) {
            // Field has a type property
            switch (field.type) {
              case 'date':
                dateCount++;
                if (field.value && field.value !== null) completedFields++;
                break;
              case 'image':
                imageCount++;
                if (field.value && field.value !== null) completedFields++;
                break;
              default:
                // Most fields are text (emne, docid, doctitle, etc.)
                textCount++;
                if (field.value && field.value !== null) completedFields++;
            }
          } else if (typeof field === 'string') {
            // String fields are considered text
            textCount++;
            if (field && field !== null) completedFields++;
          } else if (field === null) {
            // Null fields are not completed
            textCount++; // Most null fields are text fields
          }
        });
      }
    });
    
    return {
      text: textCount,
      date: dateCount,
      image: imageCount,
      total: totalFields,
      completed: completedFields
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{getStageDisplayName(stage)} Projects</h1>
          <p className="text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? 's' : ''} in {getStageDisplayName(stage).toLowerCase()}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            onClearFilters?.();
            onBackToKanban();
          }}
        >
          ← Back to Kanban Board
        </Button>
      </div>

      {/* Projects List */}
      <div className="space-y-4">
        {projects.map((project) => {
          const isExpanded = expandedProjects.has(project.id.toString());
          const documentProgress = getDocumentProgress(project);
          const variableCounts = getVariableCounts(project);

          return (
            <Card key={project.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleProject(project.id.toString())}
                      className="p-1 h-6 w-6"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge variant="outline">Public</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Modified {new Date(project.updated_at || project.created_at || new Date()).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Project Summary */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground ml-9">
                  <div className="flex items-center gap-1">
                    <Building2 className="h-4 w-4" />
                    {project.location || 'No location'}
                  </div>
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    {project.leader?.name || project.leader?.email || 'Unassigned'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {project.current_phase_deadline
                      ? new Date(project.current_phase_deadline).toLocaleDateString()
                      : "—"}
                  </div>
                </div>

                {/* Overall Progress */}
                <div className="ml-9">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Overall Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  {/* Variable Counts with Progress */}
                  <div className="flex gap-2 mb-4">
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                      <FileText className="h-3 w-3 mr-1" />
                      Text - {variableCounts.text}
                    </Badge>
                    <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                      <Calendar className="h-3 w-3 mr-1" />
                      Date - {variableCounts.date}
                    </Badge>
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      <Image className="h-3 w-3 mr-1" />
                      Image - {variableCounts.image}
                    </Badge>
                    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                      Overall - {variableCounts.completed}/{variableCounts.total}
                    </Badge>
                  </div>

                  {/* Document Progress */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Document Progress</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {documentProgress.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-sm">{doc.templateName}</span>
                            <Badge variant="outline" className="text-xs">
                              {doc.assignee}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-32">
                              <Progress value={doc.progress} className="h-2" />
                            </div>
                            <span className="text-sm text-muted-foreground w-12 text-right">
                              {doc.progress}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleViewProject(project.id.toString())}
                    >
                      View Project Details
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Loading Modal */}
      <Dialog open={loadingProjectId !== null} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" hideCloseButton>
          <DialogTitle className="sr-only">Loading Project</DialogTitle>
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-lg font-semibold">Loading Project</h3>
              <p className="text-sm text-muted-foreground">
                Please wait while we load the project details...
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
