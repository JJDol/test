import { BaseVariable, DocumentVariable, DocumentVariables } from "@/lib/types/variable-types";

export enum ProjectStage {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  DONE = 'DONE'
}

export enum VariablePropagationScope {
  GLOBAL = 'GLOBAL',
  LOCAL = 'LOCAL',
  CATEGORY = 'CATEGORY'
}

export enum DocumentCategory {
  ARCHITECTURE = 'ARCHITECTURE',
  CONSTRUCTIONS = 'CONSTRUCTIONS',
  FIRE = 'FIRE',
  AUTHORITY_PROCESSING = 'AUTHORITY_PROCESSING',
  ENERGY = 'ENERGY',
  HVAC = 'HVAC',
  EXECUTION_CONTROL = 'EXECUTION_CONTROL'
}

export enum ProjectPhase {
  PHASE_1 = 'PHASE_1',
  PHASE_2 = 'PHASE_2',
  PHASE_3 = 'PHASE_3',
  PHASE_4 = 'PHASE_4',
  PHASE_5 = 'PHASE_5',
  PHASE_6 = 'PHASE_6'
}

// Helper function to get display names for categories
export const getCategoryDisplayName = (category: DocumentCategory): string => {
  const displayNames: Record<DocumentCategory, string> = {
    [DocumentCategory.ARCHITECTURE]: 'Architecture',
    [DocumentCategory.CONSTRUCTIONS]: 'Constructions',
    [DocumentCategory.FIRE]: 'Fire Safety',
    [DocumentCategory.AUTHORITY_PROCESSING]: 'Authority Processing',
    [DocumentCategory.ENERGY]: 'Energy',
    [DocumentCategory.HVAC]: 'HVAC',
    [DocumentCategory.EXECUTION_CONTROL]: 'Execution Control'
  };
  return displayNames[category];
};

// Helper function to get Danish names for categories
// TODO: This will be used in the future
export const getCategoryDanishName = (category: DocumentCategory): string => {
  const danishNames: Record<DocumentCategory, string> = {
    [DocumentCategory.ARCHITECTURE]: 'ARKITEKTUR',
    [DocumentCategory.CONSTRUCTIONS]: 'KONSTRUKTIONER',
    [DocumentCategory.FIRE]: 'BRAND',
    [DocumentCategory.AUTHORITY_PROCESSING]: 'MYN. BEHANDLING',
    [DocumentCategory.ENERGY]: 'ENERGI',
    [DocumentCategory.HVAC]: 'VVS',
    [DocumentCategory.EXECUTION_CONTROL]: 'UDFØRELSESKONTROL'
  };
  return danishNames[category];
};



export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  assigned_projects: string[];
  company_id: string;
  created_at: string;
  updated_at: string;
}



export interface DocumentTemplate {
  name: string; // Primary key
  category: DocumentCategory;
  description: string | null;
  variables: DocumentVariable[];
  file_name: string;
  original_file_name: string | null;
  is_public: boolean;
  user_id?: string | null; // TODO: consider this to be mandatory
  created_at?: string;
  updated_at?: string;
}

export interface ProjectTemplate {
  name: string;
  category: DocumentCategory;
  templates: string[]; // This is document template names
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  deadline: string;
  leader_id: string;
  leaderName: string;
  leader?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  workers: string[];
  workers_names: string[];
  progress: number; // this is progress of whole project, should be calculated based on the templates and variables
  is_archived: boolean;
  company_id: string;
  stage: ProjectStage;
  architecture_templates: string[];
  constructions_templates: string[];
  fire_templates: string[];
  authority_processing_templates: string[];
  energy_templates: string[];
  hvac_templates: string[];
  execution_control_templates: string[];
  template_variables?: {
    [category in DocumentCategory]: {
      [templateName: string]: {
        variables: DocumentVariable[];
      };
    };
  };
  document_assignments?: {
    [templateName: string]: {
      assignee_id?: string;
      assignee_name?: string;
      supervisor_id?: string;
      supervisor_name?: string;
      supervisor_checked?: boolean;
    };
  };
  global_variables?: {
    variables:DocumentVariable[];
  };
  variable_propagation_settings?: {
    [category in DocumentCategory]: {
      [templateName: string]: {
        [variableName: string]: {possibleScopes: VariablePropagationScope[], currentScope: VariablePropagationScope, isOverridden: boolean};
      };
    };
  };
  category_variables?: {
    [category in DocumentCategory]: {      
        variables: DocumentVariable[];
    };
  };
  created_at?: string;
  updated_at?: string;
  phase: ProjectPhase;
  previous_phase_vars?: {
    [category in DocumentCategory]: {
      [templateName: string]: {
        variables: DocumentVariable[];
      };
    };
  };
};


// Loading Action Types
export type LoadingAction = "none" | "download" | "navigation" | "generate";

// Project Data Hook Types
export interface ProjectDataState {
  project: Project | null;
  currentUser: User | null;
  workers: any[];
  activeCategory: DocumentCategory;
  templates: DocumentTemplate[];
  allTemplates: DocumentTemplate[];
}

export interface ProjectDataActions {
  fetchProject: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  fetchTemplatesForCategory: (category: DocumentCategory) => Promise<void>;
  setActiveCategory: (category: DocumentCategory) => void;
  refreshProject: (silent?: boolean) => Promise<void>;
  updateProjectState: (updater: (prev: ProjectDataState) => ProjectDataState) => void;
}

export interface UseProjectDataReturn {
  // State
  project: Project | null;
  currentUser: User | null;
  workers: any[];
  activeCategory: DocumentCategory;
  templates: DocumentTemplate[];
  allTemplates: DocumentTemplate[];
  
  // Loading states
  loading: {
    project: boolean;
    workers: boolean;
    currentUser: boolean;
    templates: boolean;
    overall: boolean;
  };
  
  // Error states
  error: {
    project: string | null;
    workers: string | null;
    currentUser: string | null;
    templates: string | null;
    overall: string | null;
  };
  
  // Actions
  actions: ProjectDataActions;
}

export interface ProjectVariablesState {
  templateVariables: {
    [category in DocumentCategory]: {
      [templateName: string]: {
        variables: DocumentVariable[];
      };
    };
  };
  collapsedTemplates: { [key in DocumentCategory]: boolean };
  collapsedGlobalSection: boolean;
  collapsedCategorySections: { [key in DocumentCategory]: boolean };
}

export interface ProjectVariablesActions {
  handleVariableChange: (templateName: string, variable: string, value: any, category: DocumentCategory, isGlobal: boolean, isCategory: boolean) => Promise<void>;
  handlePropagationChange: (templateCategory: DocumentCategory, templateName: string, variableName: string, useCategory: boolean, useLocal: boolean) => Promise<void>;
  updateGeneralVariables: () => Promise<void>;
  cleanupCrossCategoryVariables: () => Promise<void>;
  toggleTemplateCollapse: (templateName: string) => void;
  toggleGlobalSectionCollapse: () => void;
  toggleCategorySectionCollapse: (category: DocumentCategory) => void;
  setTemplateVariables: (variables: {
    [category in DocumentCategory]: {
      [templateName: string]: {
        variables: DocumentVariable[];
      };
    };
  }) => void;
  updateProjectProgress: () => Promise<void>;
}

export interface UseProjectVariablesReturn {
  // State
  templateVariables: {
    [category in DocumentCategory]: {
      [templateName: string]: {
        variables: DocumentVariable[];
      };
    };
  };
  collapsedTemplates: { [key in DocumentCategory]: boolean };
  collapsedGlobalSection: boolean;
  collapsedCategorySections: { [key in DocumentCategory]: boolean };
  
  // Computed values
  calculateTemplateProgress: (templateName: string, template: DocumentTemplate) => number;
  calculateOverallProgress: () => number;
  calculateCheckedProgress: () => number;
  getVariableType: (templateName: string, variableName: string) => string;
  
  // Actions
  actions: ProjectVariablesActions;
}

// Project Actions Hook Types
export interface ProjectActionsState {
  loadingAction: LoadingAction;
}

export interface ProjectActionsActions {
  handleDownloadProject: () => Promise<void>;
  handleGenerateDocument: (templateName: string, category: DocumentCategory) => Promise<void>;
  handleTemplateSelected: (template: DocumentTemplate) => Promise<void>;
  handleTemplateRemove: (template: string, category: DocumentCategory) => Promise<void>;
  handleSupervisorCheck: (templateName: string, checked: boolean) => Promise<void>;
  handleAssignmentUpdate: (templateName: string, assignments: {
    assignee_id?: string;
    assignee_name?: string;
    supervisor_id?: string;
    supervisor_name?: string;
  }) => Promise<void>;
  handleArchiveProject: () => Promise<void>;
  handleProjectDeleted: () => void;
  handleBackToDashboard: () => void;
  handleCleanupVariables: () => Promise<void>;
  handlePropagateGeneralValues: () => Promise<void>;
}

export interface UseProjectActionsReturn {
  // State
  loadingAction: LoadingAction;
  
  // Actions
  actions: ProjectActionsActions;
}

// Main Project Details Hook Types
export interface UseProjectDetailsReturn {
  // State from data hook
  project: Project | null;
  currentUser: User | null;
  workers: any[];
  activeCategory: DocumentCategory;
  templates: DocumentTemplate[];
  allTemplates: DocumentTemplate[];
  
  // State from variables hook
  templateVariables: { [category in DocumentCategory]: {
      [templateName: string]: {
        [variableName: string]: DocumentVariable;
      };
      };
    } | {};
  collapsedTemplates: { [key in DocumentCategory]: boolean };
  collapsedGlobalSection: boolean;
  collapsedCategorySections: { [key in DocumentCategory]: boolean };
  
  // State from actions hook
  loadingAction: LoadingAction;
  
  // Loading states
  loading: {
    project: boolean;
    workers: boolean;
    currentUser: boolean;
    templates: boolean;
    overall: boolean;
  };
  
  // Error states
  error: {
    project: string | null;
    workers: string | null;
    currentUser: string | null;
    templates: string | null;
    overall: string | null;
  };
  
  // Computed values
  canEditVariables: (templateName: string) => boolean;
  canCheckVariables: (templateName: string) => boolean;
  canEditGeneralVariables: () => boolean;
  calculateTemplateProgress: (templateName: string, template: DocumentTemplate) => number;
  calculateOverallProgress: () => number;
  calculateCheckedProgress: () => number;
  getVariableType: (templateName: string, variableName: string) => string;
  getStatusColor: (status: DocumentStatus) => string;
  
  // Actions
  actions: {
    // Data actions
    fetchProject: () => Promise<void>;
    fetchUsers: () => Promise<void>;
    fetchCurrentUser: () => Promise<void>;
    fetchTemplatesForCategory: (category: DocumentCategory) => Promise<void>;
    setActiveCategory: (category: DocumentCategory) => void;
    refreshProject: (silent?: boolean) => Promise<void>;
    
    // Variable actions
    handleVariableChange: (templateName: string, variable: string, value: any, category: DocumentCategory, isGlobal: boolean, isCategory: boolean) => Promise<void>;
    handlePropagationChange: (templateCategory: DocumentCategory, templateName: string, variableName: string, useCategory: boolean, useLocal: boolean) => Promise<void>;
    updateGeneralVariables: () => Promise<void>;
    cleanupCrossCategoryVariables: () => Promise<void>;
    toggleTemplateCollapse: (templateName: string) => void;
    toggleGlobalSectionCollapse: () => void;
    toggleCategorySectionCollapse: (category: DocumentCategory) => void;
    setTemplateVariables: (variables: {
      [category in DocumentCategory]: {
        [templateName: string]: {
          variables: DocumentVariable[];
        };
      };
    }) => void;
    updateProjectProgress: () => Promise<void>;
    
    // Action handlers
    handleDownloadProject: () => Promise<void>;
    handleGenerateDocument: (templateName: string, category: DocumentCategory) => Promise<void>;
    handleTemplateSelected: (template: DocumentTemplate) => void;
    handleTemplateRemove: (template: string, category: DocumentCategory) => Promise<void>;
    handleSupervisorCheck: (templateName: string, checked: boolean) => Promise<void>;
    handleAssignmentUpdate: (templateName: string, assignments: {
      assignee_id?: string;
      assignee_name?: string;
      supervisor_id?: string;
      supervisor_name?: string;
    }) => Promise<void>;
    handleArchiveProject: () => Promise<void>;
    handleProjectDeleted: () => void;
    handleBackToDashboard: () => void;
    handleCleanupVariables: () => Promise<void>;
    handlePropagateGeneralValues: () => Promise<void>;
  };
}


// TODO: Investigate everything below this line

// AI & Semantic Search Types
export interface DocumentRecord {
  id: string;
  company_id: string;
  name: string;
  source_type: 'br18' | 'upload' | 'template';
  file_path?: string;
  file_size?: number;
  content_type?: string;
  metadata: Record<string, any>;
  qdrant_points?: string[];
  embedding_status: 'pending' | 'processing' | 'completed' | 'failed';
  embedding_error?: string;
  is_temporary: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  company_id: string;
  user_id: string;
  title?: string;
  last_message_at: string;
  temporary_document_ids?: string[];
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceAttribution[];
  metadata: Record<string, any>;
  created_at: string;
}

export interface SourceAttribution {
  document_id: string;
  document_name: string;
  document_type: 'br18' | 'upload' | 'template';
  text_snippet: string;
  page_number?: number;
  confidence_score: number;
  qdrant_point_id: string;
}

export interface DocumentFeedback {
  id: string;
  company_id: string;
  user_id: string;
  message_id: string;
  document_id: string;
  query: string;
  document_text: string;
  is_relevant: boolean;
  feedback_text?: string;
  created_at: string;
}

// API Request/Response Types
export interface ChatRequest {
  message: string;
  session_id?: string; // if continuing conversation
}

export interface ChatResponse {
  message_id: string;
  session_id: string;
  content: string;
  sources: SourceAttribution[];
  metadata: {
    tokens_used: number;
    response_time_ms: number;
    model_used: string;
  };
}

export interface DocumentUploadRequest {
  file: File;
  is_temporary: boolean;
  session_id?: string;
}

export interface DocumentProcessingStatus {
  document_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_percentage: number;
  error?: string;
  estimated_completion?: string;
}

export enum DocumentStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  REVIEW = 'REVIEW',
  COMPLETED = 'COMPLETED'
}

export interface Document {
  id: string;
  project_id: number;
  name: string;
  category: DocumentCategory;
  description?: string;
  is_required: boolean;
  status: DocumentStatus;
  supervisor_id?: string;
  assignee_id?: string;
  content?: any;
  created_at?: string;
  updated_at?: string;
}